import { useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
ort.env.wasm.numThreads = 1;

export function useOnnxModel(modelUrl: string) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputName, setInputName] = useState<string>('landmarks');
  const session = useRef<ort.InferenceSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await ort.InferenceSession.create(modelUrl, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        if (cancelled) return;
        session.current = s;
        if (s.inputNames && s.inputNames.length > 0) setInputName(s.inputNames[0]);
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

  return { ready, error, session, inputName };
}
