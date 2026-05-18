import './ModelInfo.css';

const ROWS = [
  {
    name: 'EfficientNetV2-S',
    track: 'Kaggle leaderboard',
    role: 'Image-based CNN, transfer-learned on 87K ASL frames. Used offline for max accuracy.',
    metrics: ['224×224 input', 'AdamW · cosine LR', 'TTA at inference'],
    accent: 'blue' as const,
  },
  {
    name: 'Landmark Transformer',
    track: 'Live demo · this page',
    role: 'Tiny model over 21 hand keypoints. Background- and lighting-invariant, ships as ONNX.',
    metrics: ['63-dim input', '<1 MB ONNX', 'On-device · WASM'],
    accent: 'yellow' as const,
  },
];

export function ModelInfo() {
  return (
    <section className="section model" id="model">
      <div className="container">
        <div className="model-head">
          <div className="eyebrow">Architecture</div>
          <h2 className="title-h1">Two models, two jobs.</h2>
          <p className="text-secondary model-sub">
            A CNN trained on clean Kaggle images degrades on real webcams. So we trained a second,
            geometry-only model for the live demo — it's the one running above.
          </p>
        </div>

        <div className="model-grid">
          {ROWS.map(r => (
            <div key={r.name} className={`card model-card model-card-${r.accent}`}>
              <div className="model-card-head">
                <span className={`model-pill model-pill-${r.accent}`}>{r.track}</span>
              </div>
              <h3 className="model-title">{r.name}</h3>
              <p className="text-secondary model-role">{r.role}</p>
              <ul className="model-metrics">
                {r.metrics.map(m => (
                  <li key={m} className="text-mono">{m}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
