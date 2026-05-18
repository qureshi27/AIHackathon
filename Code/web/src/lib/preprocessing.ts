export type Landmark = { x: number; y: number; z: number };

// Output is shape (21, 3) flattened to a Float32Array of length 63.
// Browser reshapes to [1, 21, 3] when feeding the tensor — same memory layout.
export function normalizeLandmarks(pts: Landmark[]): Float32Array {
  const wrist = pts[0];
  const out = new Float32Array(63);
  let maxDist = 1e-6;
  for (let i = 0; i < 21; i++) {
    const dx = pts[i].x - wrist.x;
    const dy = pts[i].y - wrist.y;
    const dz = pts[i].z - wrist.z;
    out[i * 3] = dx;
    out[i * 3 + 1] = dy;
    out[i * 3 + 2] = dz;
    const d = Math.hypot(dx, dy, dz);
    if (d > maxDist) maxDist = d;
  }
  for (let i = 0; i < 63; i++) out[i] /= maxDist;
  return out;
}

export function softmax(logits: Float32Array): Float32Array {
  let max = -Infinity;
  for (const v of logits) if (v > max) max = v;
  const out = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    const e = Math.exp(logits[i] - max);
    out[i] = e;
    sum += e;
  }
  for (let i = 0; i < logits.length; i++) out[i] /= sum;
  return out;
}

export function argmax(arr: Float32Array): number {
  let best = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[best]) best = i;
  return best;
}
