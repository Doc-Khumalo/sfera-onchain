import { cn } from '../../lib/cn.js';

/**
 * The asset a permission is over.
 *
 * A list of text rows reads as a terminal dump; the same rows with a mark are
 * scannable at a glance, which is what a person is actually doing when they
 * open this page.
 *
 * The common assets have their real logo, fetched once and served from our own
 * origin — the same arrangement as public/chains, and for the same reason it
 * was made there: a logo file loaded from someone else's server is a request
 * to a third party on a page that makes none. Drawing them instead was the
 * earlier answer and it went wrong in the one place it matters: beside a real
 * chain badge, a lettered circle reads as a missing icon rather than a
 * deliberate one, and WBTC came out as an orange disc saying BTC.
 *
 * Everything else still gets the drawn mark, in the asset's own colour, and so
 * does an asset whose logo we do not have — including one whose contract could
 * not be read at all. That is the part that must never become a broken image:
 * the drawn mark is the host element, and the logo sits on top of it, so a
 * file that fails to load leaves a circle rather than a gap.
 *
 * Only tickers whose issuer is certain get a logo. USDT0 and BTCB are not
 * Tether's and not Bitcoin's, whatever they are named, and wearing those marks
 * would be the interface telling a lie about who is holding the asset.
 */
const FILES = {
  USDC: 'usdc', USDbC: 'usdc', USDT: 'usdt',
  WETH: 'weth', ETH: 'weth', cbETH: 'cbeth', wstETH: 'wsteth',
  WBTC: 'wbtc', DAI: 'dai', EURC: 'eurc',
  AERO: 'aero', ARB: 'arb', OP: 'op',
  LINK: 'link', UNI: 'uni', CRV: 'crv',
};

const COLOURS = {
  USDC: '#2775CA', USDT: '#26A17B', USDbC: '#2775CA', USDT0: '#26A17B',
  WETH: '#627EEA', ETH: '#627EEA', cbETH: '#0052FF', wstETH: '#00A3FF',
  WBTC: '#F7931A', cbBTC: '#F7931A', BTCB: '#F7931A',
  DAI: '#F5AC37', EURC: '#2775CA', AERO: '#0052FF', ARB: '#12AAFF',
  OP: '#FF0420', LINK: '#2A5ADA', UNI: '#FF007A', CRV: '#40649F',
  WAVAX: '#E84142', WBNB: '#F0B90B', CELO: '#FCFF52', GNO: '#3E6957',
};

export function TokenMark({ symbol, size = 30, className }) {
  const file = symbol && FILES[symbol];
  const known = symbol && COLOURS[symbol];
  const label = symbol ? symbol.replace(/^W/, '').slice(0, 4) : '?';

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: known || 'transparent',
        borderColor: known ? 'transparent' : '#263543',
        fontSize: label.length > 3 ? size * 0.28 : size * 0.32,
      }}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-mono font-bold leading-none',
        known ? 'text-white' : 'text-slate',
        className,
      )}
    >
      {label}
      {file && (
        <img
          src={`/tokens/${file}.png`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full rounded-full object-cover"
        />
      )}
    </span>
  );
}
