/**
 * The closing frame of the deck, standing on its own as the homepage.
 *
 * Renders to static HTML at build time. No client:* directive is applied in
 * index.astro, so this ships zero JavaScript and cannot render blank.
 */

const FOUNDERS = [
  {
    name: 'Leslie Khumalo',
    role: 'Engineering',
    href: 'https://www.linkedin.com/in/khumalo-leslie/',
  },
  {
    name: 'Blagoja Mojsoski',
    role: 'Product and quality',
    href: 'https://www.linkedin.com/in/blagoja-mojsoski-228b79b1/',
  },
];

const CONTACT = 'https://www.linkedin.com/in/khumalo-leslie/';

export default function Hero() {
  return (
    <>
      {/* Background grid. Decorative, masked to fade at the centre. */}
      <div className="field" aria-hidden="true">
        <div className="grid" />
      </div>

      <header className="bar">
        <p className="logo">
          Sfera<i>Onchain</i>
        </p>
        <a className="btn" href={CONTACT} target="_blank" rel="noopener">
          Get in touch
        </a>
      </header>

      <main className="stage">
        <h1>
          Build it <em>with us.</em>
        </h1>

        <p className="lede">
          If your users are granting standing authority and you would rather they
          understood it, we want to build the first integration with you.
        </p>

        <ul className="who">
          {FOUNDERS.map(({ name, role, href }) => (
            <li key={name}>
              {name} ·{' '}
              <a href={href} target="_blank" rel="noopener">
                {role}
              </a>
            </li>
          ))}
        </ul>
      </main>

      <footer className="foot">
        <span>sferaonchain.xyz</span>
        <a href="/how-it-works.html">See it step by step</a>
      </footer>
    </>
  );
}
