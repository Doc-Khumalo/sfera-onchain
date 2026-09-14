import { CONTACT } from '../../data/site.js';

export default function Header() {
  return (
    <header className="bar">
      <p className="logo">Sfera Onchain</p>
      <nav className="bar-nav">
        <a href="#problem">The problem</a>
        <a href="#how">Method</a>
        <a href="#lifecycle">Lifecycle</a>
        <a href="#coverage">Coverage</a>
        <a href="#trust">Terms</a>
        <a href="/demo">Demonstration</a>
      </nav>
      <a className="btn" href={CONTACT} target="_blank" rel="noopener">
        Get in touch
      </a>
    </header>
  );
}
