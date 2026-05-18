import './Hero.css';

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-glow" aria-hidden />
      <div className="container hero-inner">
        <div className="hero-copy fade-up">
          <div className="eyebrow">AI Hackathon 2026 · Forman CS Club</div>
          <h1 className="title-hero">
            Sign language,<br />
            <span className="hero-accent">recognised in real time.</span>
          </h1>
          <p className="hero-sub text-secondary">
            Point your webcam, sign a letter, watch a sentence appear. Powered by MediaPipe hand
            landmarks and a Landmark Transformer trained on 87,000 ASL images — running entirely
            in your browser.
          </p>
          <div className="hero-cta">
            <a href="#demo" className="btn btn-primary">Try the live demo →</a>
            <a href="#how" className="btn btn-outline">How it works</a>
          </div>
          <div className="hero-stats">
            <div>
              <div className="hero-stat-num text-mono">29</div>
              <div className="hero-stat-label">classes (A–Z + space, del, nothing)</div>
            </div>
            <div>
              <div className="hero-stat-num text-mono">&lt;1 MB</div>
              <div className="hero-stat-label">model, runs on-device</div>
            </div>
            <div>
              <div className="hero-stat-num text-mono">~30 FPS</div>
              <div className="hero-stat-label">target on a modern laptop</div>
            </div>
          </div>
        </div>

        <div className="hero-showcase" aria-hidden>
          <div className="show-card show-card-back">
            <div className="show-card-chrome"><span /><span /><span /></div>
            <div className="show-card-body">
              <div className="show-letter text-mono">H</div>
              <div className="show-meta">stable · 92%</div>
            </div>
          </div>
          <div className="show-card show-card-front">
            <div className="show-card-chrome"><span /><span /><span /></div>
            <div className="show-card-body show-card-cam">
              <svg viewBox="0 0 200 200" className="show-skeleton">
                <g stroke="var(--field-border)" strokeWidth="2" fill="none" strokeLinecap="round">
                  <path d="M100 170 L100 110" />
                  <path d="M100 110 L70 70 M70 70 L60 50" />
                  <path d="M100 110 L100 60 M100 60 L100 30" />
                  <path d="M100 110 L130 70 M130 70 L140 50" />
                  <path d="M100 110 L150 90 M150 90 L165 90" />
                </g>
                <g fill="var(--accent-glow)">
                  <circle cx="100" cy="170" r="4" />
                  <circle cx="100" cy="110" r="4" />
                  <circle cx="70" cy="70" r="3.5" />
                  <circle cx="60" cy="50" r="3.5" />
                  <circle cx="100" cy="60" r="3.5" />
                  <circle cx="100" cy="30" r="3.5" />
                  <circle cx="130" cy="70" r="3.5" />
                  <circle cx="140" cy="50" r="3.5" />
                  <circle cx="150" cy="90" r="3.5" />
                  <circle cx="165" cy="90" r="3.5" />
                </g>
              </svg>
              <div className="show-overlay">
                <div className="show-letter-lg text-mono">B</div>
                <div className="show-bar"><span style={{ width: '78%' }} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
