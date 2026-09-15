import { TokenMark } from './TokenMark.jsx';
import { ChainMark } from './ChainMark.jsx';

/**
 * What the permission is over, and where it lives.
 *
 * The rows carried one mark, the chain's, and named the asset in text
 * underneath — so a column of ten permissions across four chains showed four
 * distinct shapes for ten distinct things. The asset is what is at stake; the
 * chain is which copy of it. Both belong in the mark, and a badge is how every
 * multi-chain interface says exactly that.
 *
 * The asset is drawn rather than fetched, which is TokenMark's rule and a good
 * one: a logo file is a request to a third party on a page that makes none,
 * and an unreadable asset must not become a broken image. The chain marks are
 * real logos, served from our own origin.
 */
export function AssetMark({ symbol, chain, chainFile, chainName, size = 28 }) {
  const badge = Math.round(size * 0.52);

  return (
    <span className="amark" style={{ width: size, height: size }}>
      <TokenMark symbol={symbol} size={size} />
      <span className="amark-chain" style={{ width: badge, height: badge }}>
        {chain ? (
          <ChainMark chain={chain} size={badge} />
        ) : chainFile ? (
          <img
            src={`/chains/${chainFile}.png`}
            alt=""
            title={chainName}
            width={badge}
            height={badge}
            loading="lazy"
            decoding="async"
          />
        ) : null}
      </span>
    </span>
  );
}
