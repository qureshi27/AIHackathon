import './Footer.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <strong>ASL Live</strong>
          <span className="text-tertiary">Forman Computer Science Club · AI Hackathon 2026</span>
        </div>
        <div className="footer-meta text-tertiary">
          Runs on-device · No video leaves your browser
        </div>
      </div>
    </footer>
  );
}
