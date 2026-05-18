import './HowItWorks.css';

const STEPS = [
  {
    n: '01',
    title: 'Webcam frame',
    body: 'Browser captures each frame at ~30 FPS, mirrored horizontally so the demo feels natural.',
  },
  {
    n: '02',
    title: 'MediaPipe Hands',
    body: 'Google\'s on-device hand detector extracts 21 3-D keypoints in milliseconds. No images leave your machine.',
  },
  {
    n: '03',
    title: 'Landmark Transformer',
    body: 'A 63-dim landmark vector is wrist-normalised, scaled, and fed to a tiny ONNX classifier that outputs the letter.',
  },
];

export function HowItWorks() {
  return (
    <section className="section how" id="how">
      <div className="container">
        <div className="how-head">
          <div className="eyebrow">Pipeline</div>
          <h2 className="title-h1">From pixels to letters in three steps.</h2>
          <p className="text-secondary how-sub">
            Background, lighting, and skin tone don't matter — the classifier never sees raw pixels.
            It only sees the geometry of your hand.
          </p>
        </div>

        <div className="how-grid">
          {STEPS.map((s, i) => (
            <div key={s.n} className="card how-card" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="how-num text-mono">{s.n}</div>
              <h3 className="how-title">{s.title}</h3>
              <p className="how-body text-secondary">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
