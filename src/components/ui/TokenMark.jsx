import { cn } from '../../lib/cn.js';

/**
 * A coin's own colour, drawn rather than fetched.
 *
 * A list of text rows reads as a terminal dump; the same rows with a coloured
 * mark are scannable at a glance, which is what a person is actually doing
 * when they open this page. Colours are each asset's own and identify only,
 * so they never collide with the two marks that carry meaning.
 *
 * Drawn, not fetched: a logo file is a request to a third party on a page that
 * makes none, and an unreadable asset must not become a broken image.
 */
const COLOURS = {
  USDC: '#2775CA', USDT: '#26A17B', USDbC: '#2775CA', USDT0: '#26A17B',
  WETH: '#627EEA', ETH: '#627EEA', cbETH: '#0052FF', wstETH: '#00A3FF',
  WBTC: '#F7931A', cbBTC: '#F7931A', BTCB: '#F7931A',
  DAI: '#F5AC37', EURC: '#2775CA', AERO: '#0052FF', ARB: '#12AAFF',
  OP: '#FF0420', LINK: '#2A5ADA', UNI: '#FF007A', CRV: '#40649F',
  WAVAX: '#E84142', WBNB: '#F0B90B', CELO: '#FCFF52', GNO: '#3E6957',
};

export function TokenMark({ symbol, size = 30, className }) {
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
        'inline-flex shrink-0 items-center justify-center rounded-full border font-mono font-bold leading-none',
        known ? 'text-white' : 'text-slate',
        className,
      )}
    >
      {label}
    </span>
  );
}
