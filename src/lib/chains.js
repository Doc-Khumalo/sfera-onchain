/**
 * What a chain is called, beyond its name.
 *
 * The rows said "Base" and nothing else, which on a list of fifteen reads as
 * a menu rather than as a set of ledgers. A name with its native currency
 * under it is how every exchange and explorer lists a chain, and it is a fact
 * rather than an abbreviation we made up: several chains share ETH, and that
 * is true and worth seeing.
 *
 * NATIVE CURRENCY, NOT AN INVENTED TICKER. Chains do not have tickers. Making
 * up "BASE" or "ARB" would be the same mistake data/spenders.js refuses to
 * make with contract names: a label nobody can check.
 */
const NATIVE = {
  1: 'ETH', 8453: 'ETH', 42161: 'ETH', 10: 'ETH', 130: 'ETH',
  59144: 'ETH', 534352: 'ETH', 324: 'ETH',
  137: 'POL', 56: 'BNB', 43114: 'AVAX', 100: 'XDAI', 42220: 'CELO', 999: 'HYPE',
};

/** The chain's native currency, or null where we do not know it. */
export function native(chainId) {
  return NATIVE[Number(chainId)] ?? null;
}
