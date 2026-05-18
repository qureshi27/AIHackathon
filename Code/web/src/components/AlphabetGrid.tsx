import { CLASSES } from '../lib/classes';
import './AlphabetGrid.css';

export function AlphabetGrid() {
  return (
    <section className="section alphabet" id="alphabet">
      <div className="container">
        <div className="alphabet-head">
          <div className="eyebrow">Vocabulary</div>
          <h2 className="title-h1">29 classes the model can recognise.</h2>
          <p className="text-secondary alphabet-sub">
            26 letters plus three control tokens that make sentence-building possible.
          </p>
        </div>

        <div className="alphabet-grid">
          {CLASSES.map(c => {
            const isControl = c === 'space' || c === 'del' || c === 'nothing';
            return (
              <div key={c} className={`alphabet-cell ${isControl ? 'alphabet-cell-ctrl' : ''}`}>
                <div className="alphabet-glyph text-mono">{glyphFor(c)}</div>
                <div className="alphabet-name">{labelFor(c)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function glyphFor(c: string): string {
  if (c === 'space') return '␣';
  if (c === 'del') return '⌫';
  if (c === 'nothing') return '∅';
  return c;
}
function labelFor(c: string): string {
  if (c === 'space') return 'space';
  if (c === 'del') return 'delete';
  if (c === 'nothing') return 'no hand';
  return c.toLowerCase();
}
