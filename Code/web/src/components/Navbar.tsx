import './Navbar.css';

export function Navbar() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a href="#top" className="nav-logo">
          <span className="nav-logo-mark" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 64 64">
              <path d="M32 14 L32 50" stroke="var(--field-border)" strokeWidth="3" strokeLinecap="round" />
              <path d="M20 22 L32 14 L44 22" stroke="var(--accent-primary)" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M20 42 L32 50 L44 42" stroke="var(--accent-glow)" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="32" cy="32" r="4" fill="var(--field-border)" />
            </svg>
          </span>
          <span>ASL Live</span>
        </a>
        <nav className="nav-links">
          <a href="#demo">Live Demo</a>
          <a href="#how">How it works</a>
          <a href="#model">Model</a>
          <a href="#alphabet">Alphabet</a>
        </nav>
        <a className="btn btn-primary nav-cta" href="#demo">Try it now</a>
      </div>
    </header>
  );
}
