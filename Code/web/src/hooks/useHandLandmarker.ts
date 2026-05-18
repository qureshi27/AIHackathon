import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export function useHandLandmarker() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
        );
        const lm = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: '/hand_landmarker.task' },
          numHands: 1,
          runningMode: 'VIDEO',
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
        });
        if (!cancelled) {
          ref.current = lm;
          setReady(true);
        }
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

  return { ready, error, landmarker: ref };
}
