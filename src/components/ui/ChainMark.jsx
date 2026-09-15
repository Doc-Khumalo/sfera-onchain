/**
 * The chain a permission lives on.
 *
 * Nine of the fifteen chains have a real mark in public/chains, fetched once
 * and served from our own origin. The rest are drawn from their own brand
 * colour and initial, the way TokenMark draws an asset.
 *
 * Drawn rather than left blank, because the column has to be scannable for
 * every row: a chain without a logo is still a chain, and a gap where the
 * others have a mark reads as missing data rather than a missing file.
 */
const FILES = {
  1: 'ethereum', 8453: 'base', 42161: 'arbitrum', 10: 'optimism',
  137: 'polygon', 56: 'bnb', 43114: 'avalanche', 59144: 'linea',
  534352: 'scroll',
};

/* Each chain's own colour, used only to identify — never the two that carry
   meaning. */
const COLOURS = {
  130: '#FF007A',      // Unichain
  42220: '#FCFF52',    // Celo
  100: '#3E6957',      // Gnosis
  324: '#1E69FF',      // zkSync Era
  999: '#97FCE4',      // Hyperliquid
  42161: '#12AAFF',
};

export function ChainMark({ chain, size = 20 }) {
  if (!chain) return null;
  const file = FILES[chain.id];

  if (file) {
    return (
      <img
        className="a-chain"
        src={`/chains/${file}.png`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
      />
    );
  }

  const tint = COLOURS[chain.id] || '#7D93A4';
  return (
    <span
      className="a-chain a-chain-drawn"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${tint} 22%, transparent)`,
        borderColor: `color-mix(in srgb, ${tint} 55%, transparent)`,
        color: tint,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {(chain.name || '?').slice(0, 1)}
    </span>
  );
}
