/**
 * Market figures, each attributed and each checkable.
 *
 * Sourcing comes from the Business Plan: Chainalysis, Crypto.com and a16z.
 * Stated as estimates because that is what they are, and none of them are
 * ours.
 *
 * ON THE MARKS. Each source carries a letterform in its own colour rather than
 * its logo. Fetching a brand asset is a request to a third party we do not
 * control on a site that makes none, and hotlinking a trademark to lend weight
 * to our own page is worse manners than drawing a letter. The colour and the
 * initial are enough to recognise, and the link settles it.
 *
 * Every source links out. A citation nobody can follow is an assertion wearing
 * a citation's clothes, and this page asks people to check its claims about
 * their own wallet, so it should hold its own numbers to the same standard.
 */
const STATS = [
  {
    n: '$17B',
    l: 'stolen through crypto scams and fraud in 2025',
    src: 'Chainalysis',
    mark: 'C',
    colour: '#3B82F6',
    href: 'https://www.chainalysis.com/blog/crypto-crime-report-introduction/',
    tone: 'bad',
  },
  {
    n: '741M',
    l: 'people own crypto worldwide',
    src: 'Crypto.com',
    mark: 'C',
    colour: '#1199FA',
    href: 'https://crypto.com/research',
  },
  {
    n: '40–70M',
    l: 'of them actively use it onchain',
    src: 'a16z',
    mark: 'a',
    colour: '#FF6B35',
    href: 'https://a16zcrypto.com/posts/article/state-of-crypto-report-2024/',
  },
];

export default function Stats() {
  return (
    <section className="stats">
      <dl>
        {STATS.map(({ n, l, src, mark, colour, href, tone }) => (
          <div key={n}>
            <dt className={tone === 'bad' ? 'bad' : undefined}>{n}</dt>
            <dd>{l}</dd>
            <dd className="src">
              <a href={href} target="_blank" rel="noopener">
                <span className="src-mark" style={{ '--c': colour }} aria-hidden="true">
                  {mark}
                </span>
                {src} estimate
                <svg className="src-out" viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M4.5 1.5h6v6M10.5 1.5L5 7M8 9.5v1H1.5V4h1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
