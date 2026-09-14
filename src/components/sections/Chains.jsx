import { CHAINS } from '../../data/site.js';

/**
 * The chains the ledger reads.
 *
 * Each carries its own mark rather than a bullet, because a person scanning
 * for whether their chain is here recognises the shape before they read the
 * word. The marks are inline SVG: no third party request, nothing to block,
 * and no dependency on a CDN staying up. DEPLOYMENT.md forbids third party
 * script on a signing surface and the same reasoning applies to assets.
 *
 * Every entry links to that chain's explorer, so a claim on this page can be
 * checked rather than taken.
 */
export default function Chains() {
  return (
    <section className="chains reveal" id="chains">
      <h2>Fifteen chains, read the same way.</h2>
      <p className="lede">
        The question is identical everywhere, because an ERC-20 allowance is
        identical everywhere. Adding a chain is a registry and an endpoint, not
        a rewrite.
      </p>

      <ul className="chain-grid">
        {CHAINS.map(({ name, mark, colour, explorer }) => (
          <li key={name}>
            <a href={explorer} target="_blank" rel="noopener">
              <span className="c-mark" style={{ '--c': colour }} aria-hidden="true">
                {mark}
              </span>
              {name}
            </a>
          </li>
        ))}
      </ul>

      <p className="chain-note">
        Coverage differs per chain and the ledger states its own limits on every
        read. A chain we cannot establish a verified registry for is not listed
        here at all, because an empty result would read as a clean wallet.
      </p>
    </section>
  );
}
