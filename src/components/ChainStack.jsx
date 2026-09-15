/**
 * The chains, stacked.
 *
 * A single chain chip said "Base" and implied the panel read one chain. It
 * reads fifteen, and a row of overlapping marks says that faster than a number
 * does, which is why every multi-chain product uses this shape.
 *
 * The marks are real logos, fetched once from each project and served from our
 * own origin, so the page makes no third party request and cannot break when
 * someone reorganises a CDN. Six are shown because six is what reads as a
 * cluster rather than a queue.
 *
 * NO NUMBER. It used to read "15 chains", which put a precise count on a badge
 * that nobody verifies and that goes stale the moment coverage changes — and a
 * figure stated that casually invites being read as a promise. "+ more" claims
 * only what the marks already show. The exact number is still stated where a
 * reader has actually asked for it, in the questions further down the page.
 *
 * ON BASE. Its mark is the one that is genuinely just a colour: base.org
 * publishes a solid blue favicon and five other sources gave the same or
 * worse. That is their published asset rather than something drawn here, and
 * a flat brand colour is the honest version of a mark that does not exist at
 * this size.
 */
const SHOWN = [
  { name: 'Ethereum', file: 'ethereum.png' },
  { name: 'Base', file: 'base.png' },
  { name: 'Arbitrum', file: 'arbitrum.png' },
  { name: 'Optimism', file: 'optimism.png' },
  { name: 'Polygon', file: 'polygon.png' },
  { name: 'BNB Chain', file: 'bnb.png' },
];

export default function ChainStack({ label = '+ more', compact = false }) {
  return (
    <span className={`cstack ${compact ? 'compact' : ''}`}>
      <span className="cs-marks">
        {SHOWN.map(({ name, file }) => (
          <img
            key={name}
            src={`/chains/${file}`}
            alt={name}
            title={name}
            width={compact ? 20 : 24}
            height={compact ? 20 : 24}
            loading="lazy"
            decoding="async"
          />
        ))}
      </span>
      <span className="cs-label">{label}</span>
    </span>
  );
}
