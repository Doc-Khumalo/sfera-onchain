import { CONTACT } from '../../data/site.js';

export default function Header() {
  return (
    <header className="bar">
      <p className="logo">Sfera <em>Onchain</em></p>
      <nav className="bar-nav">
        <a href="#problem">The problem</a>
        <a href="#how">Method</a>
        <a href="#lifecycle">Lifecycle</a>
        <a href="#chains">Chains</a>
        <a href="#trust">Terms</a>
        <a href="/demo">Read a wallet</a>
      </nav>
      <a className="btn" href={CONTACT} target="_blank" rel="noopener">
        Get in touch
      </a>
    </header>
  );
}
