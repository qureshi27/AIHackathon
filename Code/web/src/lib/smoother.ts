export class PredictionSmoother {
  private buffer: string[] = [];
  private capacity: number;
  private stableSince: number | null = null;
  private lastCommitted: string | null = null;
  private holdMs: number;

  constructor(capacity = 8, holdMs = 800) {
    this.capacity = capacity;
    this.holdMs = holdMs;
  }

  push(label: string): string {
    this.buffer.push(label);
    if (this.buffer.length > this.capacity) this.buffer.shift();
    return this.majority();
  }

  private majority(): string {
    const counts = new Map<string, number>();
    for (const l of this.buffer) counts.set(l, (counts.get(l) ?? 0) + 1);
    let best = '';
    let bestN = 0;
    for (const [l, n] of counts) {
      if (n > bestN) { best = l; bestN = n; }
    }
    return best;
  }

  tryCommit(smoothed: string, now: number): string | null {
    if (smoothed === 'nothing' || smoothed === '') {
      this.stableSince = null;
      this.lastCommitted = null;
      return null;
    }
    if (smoothed !== this.lastCommitted) {
      if (this.stableSince === null) this.stableSince = now;
      if (now - this.stableSince >= this.holdMs) {
        this.lastCommitted = smoothed;
        this.stableSince = null;
        return smoothed;
      }
    }
    return null;
  }

  holdProgress(smoothed: string, now: number): number {
    if (smoothed === 'nothing' || smoothed === this.lastCommitted || this.stableSince === null) return 0;
    return Math.min(1, (now - this.stableSince) / this.holdMs);
  }

  reset() {
    this.buffer = [];
    this.stableSince = null;
    this.lastCommitted = null;
  }
}
