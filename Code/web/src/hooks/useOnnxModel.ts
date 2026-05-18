import { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web/wasm';

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

export function useOnnxModel(modelUrl: string) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [inputName, setInputName] = useState<string>('landmarks');
  const session = useRef<ort.InferenceSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(modelUrl);
        if (!resp.ok) throw new Error(`fetch ${modelUrl}: ${resp.status}`);
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
            if (total > 0 && !cancelled) setProgress(received / total);
          }
        }
        if (cancelled) return;
        const bytes = new Uint8Array(received);
        let offset = 0;
        for (const c of chunks) { bytes.set(c, offset); offset += c.byteLength; }

        const s = await ort.InferenceSession.create(bytes, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        if (cancelled) return;
        session.current = s;
        if (s.inputNames?.length) setInputName(s.inputNames[0]);
        setProgress(1);
        setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
      session.current?.release?.();
      session.current = null;
    };
  }, [modelUrl]);

  return { ready, error, progress, session, inputName };
}
