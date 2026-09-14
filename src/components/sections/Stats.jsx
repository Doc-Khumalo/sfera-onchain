/**
 * Market figures, each attributed and each checkable.
 *
 * Sourcing comes from the Business Plan: Chainalysis, Crypto.com and a16z.
 * Stated as estimates because that is what they are, and none of them are
 * ours.
 *
 * THE MARKS ARE REAL AND THEY ARE OURS TO SERVE. An earlier version drew a
 * letterform in each source's colour as a stand-in, which identified nobody: a
 * blue box containing "C" is not Chainalysis. These are the actual brand marks,
 * fetched once and stored in public/sources, so the page makes no third party
 * request at runtime and cannot break when someone else reorganises their CDN.
 *
 * Using a company's mark to attribute a figure to that company is ordinary
 * editorial attribution. They are shown at a consistent height and never
 * recoloured, stretched or placed on a background that implies endorsement.
 *
 * Shapes differ, and that is fine: two are square marks and a16z publishes a
 * horizontal wordmark. Height is matched, width is left alone.
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
    href: 'https://www.chainalysis.com/blog/crypto-crime-report-introduction/',
    logo: '/sources/chainalysis.png',
    logoH: 20,
    tone: 'bad',
  },
  {
    n: '741M',
    l: 'people own crypto worldwide',
    src: 'Crypto.com',
    href: 'https://crypto.com/research',
    logo: '/sources/cryptocom.png',
    logoH: 20,
  },
  {
    n: '40–70M',
    l: 'of them actively use it onchain',
    src: 'a16z',
    href: 'https://a16zcrypto.com/posts/article/state-of-crypto-report-2024/',
    logo: '/sources/a16z.svg',
    logoH: 13,
  },
];

export default function Stats() {
  return (
    <section className="stats">
      <dl>
        {STATS.map(({ n, l, src, href, tone, logo, logoH }) => (
          <div key={n}>
            <dt className={tone === 'bad' ? 'bad' : undefined}>{n}</dt>
            <dd>{l}</dd>
            <dd className="src">
              <a href={href} target="_blank" rel="noopener">
                <img
                  className="src-logo"
                  src={logo}
                  alt={src}
                  height={logoH}
                  style={{ height: logoH }}
                  loading="lazy"
                  decoding="async"
                />
                <span className="src-name">{src} estimate</span>
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
