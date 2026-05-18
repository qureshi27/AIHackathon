import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const TASK_URL = '/hand_landmarker.task';

export function useHandLandmarker() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const ref = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(TASK_URL);
        if (!resp.ok) throw new Error(`fetch ${TASK_URL}: ${resp.status}`);
        const total = Number(resp.headers.get('Content-Length')) || 0;
        const reader = resp.body?.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.byteLength;
            if (total > 0 && !cancelled) setProgress((received / total) * 0.85);
          }
        }
        if (cancelled) return;
        const buf = new Uint8Array(received);
        let offset = 0;
        for (const c of chunks) { buf.set(c, offset); offset += c.byteLength; }

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
        );
        if (cancelled) return;
        setProgress(0.95);

        const lm = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetBuffer: buf },
          numHands: 1,
          runningMode: 'VIDEO',
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
        });
        if (cancelled) return;
        ref.current = lm;
        setProgress(1);
        setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
      ref.current?.close();
      ref.current = null;
    };
  }, []);

  return { ready, error, progress, landmarker: ref };
}
