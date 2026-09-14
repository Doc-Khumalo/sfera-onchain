import { CONTACT } from '../../data/site.js';
import Receipt from '../Receipt.jsx';

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-type">
        <p className="filed">TX Guard — transaction control</p>
        <h1>Control what happens before you sign.</h1>
        <p className="lede">
          An application asks for permission to spend your tokens. We show what
          it really wants, and cut it down to what you were doing.
        </p>
        <div className="links">
          <a className="btn" href={CONTACT} target="_blank" rel="noopener">
            Get in touch
          </a>
          <a className="btn ghost" href="#how">How it works</a>
        </div>
      </div>

      <div className="hero-art">
        <Receipt />
      </div>
    </section>
  );
}
