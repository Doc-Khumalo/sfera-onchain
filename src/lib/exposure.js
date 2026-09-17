/**
 * What a wallet can lose today, as arithmetic rather than conversion.
 *
 * This was computed inside demo/Verdict.jsx and is now shared, because the
 * bento's anchor card states the same figure and two components deriving the
 * same number separately is two chances for them to disagree.
 *
 * NOTHING HERE CONVERTS BETWEEN ASSETS. Dollar stablecoins are summed, which
 * is addition; everything else is totalled in its own units and reported
 * beside the sum. A single invented figure on a security product is worse
 * than five honest ones, and ranking WETH against USDC needs a price feed
 * this page does not have.
 */

import { format, isDollar } from './api.js';

const rawOf = (p) => {
  try { return BigInt(p.reachableNow ?? '0'); } catch { return 0n; }
};

/* Rescaled to hundredths so tokens of different decimals can be added: USDC's
   six and DAI's eighteen both turn up, and they are the same dollar. */
function toCents(p) {
  const d = p.decimals || 0;
  const v = rawOf(p);
  return d > 2 ? v / (10n ** BigInt(d - 2)) : v * (10n ** BigInt(2 - d));
}

/**
 * @param perms every permission read, whatever its reading.
 *
 * A BOUNDED PERMISSION OVER A LIVE BALANCE STILL COUNTS. It can take that
 * balance; leaving it out would understate what is reachable, and understating
 * is the one direction that makes a wallet look safer than it is.
 */
export function exposure(perms) {
  const live = (perms ?? []).filter((p) => rawOf(p) > 0n);

  const dollars = live.filter((p) => isDollar(p.symbol));
  const cents = dollars.reduce((n, p) => n + toCents(p), 0n);

  /* Reachable in something the sum cannot hold. The figure is then a floor,
     and whoever prints it has to say so. */
  const unpriced = live.filter((p) => !isDollar(p.symbol));
  const otherTotals = Object.values(
    unpriced.reduce((acc, p) => {
      const k = p.symbol || 'unreadable';
      acc[k] = acc[k] ?? { total: 0n, decimals: p.decimals, symbol: p.symbol };
      acc[k].total += rawOf(p);
      return acc;
    }, {}),
  );

  return {
    /* Distinct applications with something to take today. */
    takers: new Set(live.map((p) => (p.label || p.beneficiary).toLowerCase())).size,
    cents,
    /* True when the dollar figure is a floor rather than the whole story. */
    atLeast: unpriced.length > 0 && cents > 0n,
    others: otherTotals.map((a) => format(a.total.toString(), a.decimals, a.symbol)),
    otherTotals,
    /* Nothing to take today. ON ITS OWN THIS IS NOT AN ALL CLEAR, and the
       caller must not paint it as one: a wallet can hold live unbounded
       authority over an empty balance, which is the reading people misjudge
       and the second example in data/site.js exists to show. Mint belongs to
       a wallet that reaches nothing AND covers nothing arriving later. */
    reachesNothing: (perms ?? []).length > 0 && live.length === 0,
    /* Authority that is live whatever the balance says. */
    attention: (perms ?? []).filter((p) => p.attention).length,
  };
}

/** Permissions covering money that is not in the wallet yet. */
export function futureExposed(perms) {
  return (perms ?? []).filter((p) => p.futureExposed).length;
}
