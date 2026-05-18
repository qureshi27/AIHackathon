import { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';
import { useHandLandmarker } from '../hooks/useHandLandmarker';
import { useOnnxModel } from '../hooks/useOnnxModel';
import { normalizeLandmarks, softmax, argmax } from '../lib/preprocessing';
import { CLASSES, prettyLabel } from '../lib/classes';
import { HAND_CONNECTIONS } from '../lib/connections';
import { PredictionSmoother } from '../lib/smoother';
import './LiveDemo.css';

const MODEL_URL = '/landmark_model.onnx';

type Status = 'idle' | 'requesting' | 'loading' | 'live' | 'error';

export function LiveDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const smootherRef = useRef(new PredictionSmoother(8, 800));
  const lastInferRef = useRef(0);
  const fpsRef = useRef({ frames: 0, since: performance.now(), value: 0 });

  const { ready: hlReady, error: hlError, landmarker } = useHandLandmarker();
  const { ready: ortReady, error: ortError, session, inputName } = useOnnxModel(MODEL_URL);

  const [status, setStatus] = useState<Status>('idle');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [label, setLabel] = useState<string>('—');
  const [confidence, setConfidence] = useState(0);
  const [hold, setHold] = useState(0);
  const [sentence, setSentence] = useState('');
  const [fps, setFps] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);

  const errorMsg = permissionError ?? hlError ?? ortError;

  async function start() {
    if (status === 'live' || status === 'requesting') return;
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      setStatus('live');
    } catch (e) {
      setPermissionError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  function stop() {
    const v = videoRef.current;
    if (v?.srcObject instanceof MediaStream) {
      v.srcObject.getTracks().forEach(t => t.stop());
      v.srcObject = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setStatus('idle');
    setLabel('—');
    setConfidence(0);
    setHold(0);
    smootherRef.current.reset();
  }

  useEffect(() => {
    if (status !== 'live' || !hlReady || !ortReady) return;
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let cancelled = false;

    const loop = async () => {
      if (cancelled) return;
      rafRef.current = requestAnimationFrame(loop);

      if (video.readyState < 2) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      const now = performance.now();
      const lm = landmarker.current;
      if (!lm) return;
      const t0 = performance.now();
      const res = lm.detectForVideo(video, now);
      const detectMs = performance.now() - t0;

      let predictedLabel = 'nothing';
      let predictedConf = 0;

      if (res.landmarks && res.landmarks.length > 0) {
        const pts = res.landmarks[0];
        drawSkeleton(ctx, pts, canvas.width, canvas.height);

        if (session.current && now - lastInferRef.current > 33) {
          lastInferRef.current = now;
          const norm = normalizeLandmarks(pts);
          const tensor = new ort.Tensor('float32', norm, [1, 21, 3]);
          const ti = performance.now();
          const out = await session.current.run({ [inputName]: tensor });
          const inferMs = performance.now() - ti;
          const firstOut = Object.values(out)[0];
          const logits = firstOut.data as Float32Array;
          const probs = softmax(logits);
          const idx = argmax(probs);
          predictedLabel = CLASSES[idx];
          predictedConf = probs[idx];
          setLatencyMs(Math.round(detectMs + inferMs));
        }
      } else {
        setLatencyMs(Math.round(detectMs));
      }

      const smoothed = smootherRef.current.push(predictedLabel);
      const committed = smootherRef.current.tryCommit(smoothed, now);
      const holdPct = smootherRef.current.holdProgress(smoothed, now);

      setLabel(smoothed || '—');
      setConfidence(predictedConf);
      setHold(holdPct);

      if (committed) {
        setSentence(prev => {
          if (committed === 'space') return prev + ' ';
          if (committed === 'del') return prev.slice(0, -1);
          return prev + committed;
        });
      }

      const f = fpsRef.current;
      f.frames++;
      const elapsed = now - f.since;
      if (elapsed > 500) {
        f.value = (f.frames * 1000) / elapsed;
        f.frames = 0;
        f.since = now;
        setFps(Math.round(f.value));
      }
    };

    loop();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [status, hlReady, ortReady, landmarker, session, inputName]);

  useEffect(() => () => stop(), []);

  const modelsLoading = !hlReady || !ortReady;

  return (
    <section className="section demo" id="demo">
      <div className="container">
        <div className="demo-head">
          <div className="eyebrow">Live</div>
          <h2 className="title-h1">Try it with your webcam.</h2>
          <p className="text-secondary demo-sub">
            Hold a letter steady for about a second to commit it to the sentence below.
            Use <span className="kbd">space</span> to add a space and <span className="kbd">del</span> to backspace.
          </p>
        </div>

        <div className="demo-grid">
          <div className="card demo-stage">
            <div className="demo-viewport">
              <video ref={videoRef} playsInline muted className="demo-video" />
              <canvas ref={canvasRef} className="demo-canvas" />
              {status !== 'live' && (
                <div className="demo-overlay">
                  {status === 'requesting' && <div className="demo-msg">Requesting camera…</div>}
                  {status === 'error' && (
                    <div className="demo-msg demo-msg-error">
                      <strong>Camera blocked.</strong>
                      <span>{errorMsg}</span>
                      <button className="btn btn-outline" onClick={start}>Retry</button>
                    </div>
                  )}
                  {(status === 'idle' || status === 'loading') && (
                    <div className="demo-msg">
                      {modelsLoading ? (
                        <>
                          <div className="demo-spinner" aria-hidden />
                          <span>Loading models…</span>
                        </>
                      ) : errorMsg ? (
                        <div className="demo-msg-error">
                          <strong>Model load failed.</strong>
                          <span>{errorMsg}</span>
                          <span className="demo-tip">
                            Make sure <code>landmark_model.onnx</code> and <code>hand_landmarker.task</code> are in the{' '}
                            <code>public/</code> folder.
                          </span>
                        </div>
                      ) : (
                        <button className="btn btn-primary demo-start" onClick={start}>
                          Start camera
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {status === 'live' && (
                <div className="demo-hud">
                  <div className="hud-pill">
                    <span className="hud-dot" />
                    <span className="text-mono">{fps} FPS</span>
                  </div>
                  <div className="hud-pill">
                    <span className="text-mono">{latencyMs} ms</span>
                  </div>
                </div>
              )}
            </div>
            {status === 'live' && (
              <div className="demo-actions">
                <button className="btn btn-outline" onClick={stop}>Stop</button>
                <button className="btn btn-outline" onClick={() => setSentence('')}>Clear sentence</button>
              </div>
            )}
          </div>

          <div className="demo-side">
            <div className="card prediction">
              <div className="prediction-label-row">
                <span className="text-tertiary text-mono">CURRENT</span>
                <span className="text-tertiary text-mono">{Math.round(confidence * 100)}%</span>
              </div>
              <div className="prediction-letter text-mono">{prettyLabel(label)}</div>
              <div className="prediction-bar"><span style={{ width: `${confidence * 100}%` }} /></div>

              <div className="hold-row">
                <span className="text-tertiary text-mono">HOLD TO COMMIT</span>
                <span className="text-tertiary text-mono">{Math.round(hold * 100)}%</span>
              </div>
              <div className="prediction-bar prediction-bar-hold"><span style={{ width: `${hold * 100}%` }} /></div>
            </div>

            <div className="card sentence">
              <div className="text-tertiary text-mono sentence-label">SENTENCE</div>
              <div className="sentence-text">{sentence || <span className="text-tertiary">…start signing</span>}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  w: number,
  h: number,
) {
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);

  ctx.strokeStyle = '#FFD600';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(pts[a].x * w, pts[a].y * h);
    ctx.lineTo(pts[b].x * w, pts[b].y * h);
    ctx.stroke();
  }

  for (let i = 0; i < pts.length; i++) {
    ctx.beginPath();
    ctx.fillStyle = i === 0 ? '#00D4FF' : '#4D9BFF';
    ctx.arc(pts[i].x * w, pts[i].y * h, i === 0 ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
