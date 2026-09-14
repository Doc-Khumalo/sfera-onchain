import { FOUNDERS } from '../../data/site.js';

export default function Footer() {
  return (
    <footer className="foot">
      <ul className="who">
        {FOUNDERS.map(({ name, role, href }) => (
          <li key={name}>
            <a href={href} target="_blank" rel="noopener">
              {name}
            </a>
            <span>{role}</span>
          </li>
        ))}
      </ul>
      <div className="foot-end">
        <span>Sfera Onchain · sferaonchain.xyz</span>
        <a href="/how-it-works.html">See it step by step</a>
      </div>
    </footer>
  );
}
