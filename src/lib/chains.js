/**
 * Chain registry for the live permission ledger.
 *
 * WHY THERE IS A CURATED LIST AT ALL.
 *
 * You cannot enumerate ERC-20 approvals from chain state. An allowance is a
 * mapping with no iterator, so the only ways to find one are to replay
 * `Approval` logs or to ask for a pair you already suspect. Base's public RPC
 * caps `eth_getLogs` at a 2,000 block range, which at two second blocks is
 * about 67 minutes of history, so replaying a wallet's whole past needs a paid
 * indexer that the proof of concept does not have.
 *
 * So the ledger probes: for every token and spender below it asks
 * `allowance(owner, spender)` directly, batched through Multicall3 in a single
 * request. What that finds is real and read from the chain. What it does not
 * cover is stated on screen rather than implied away, which is the same rule
 * the Retention plan sets at §11.1 — do not imply complete wallet coverage
 * until it exists.
 *
 * EVERY ADDRESS HERE WAS VERIFIED AGAINST BASE MAINNET before being written
 * down: tokens answer `symbol()` and `decimals()`, spenders carry code, and
 * the two Uniswap routers were additionally observed in live `Approval` logs.
 * Anything unverified is not labelled. An unlabelled spender renders as its
 * address and reads as unknown, which is the honest outcome.
 */

export const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11';

/** Spender labels. Only entries confirmed on chain appear here. */
const BASE_SPENDERS = {
  '0x000000000022d473030f116ddee9f6b43ac78ba3': 'Permit2',
  '0x2626664c2603336e57b271c5c0b26f421741e481': 'Uniswap',
  '0x6ff5693b99212da76ad316178a184ab56d299b43': 'Uniswap',
  '0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43': 'Aerodrome',
  '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae': 'LI.FI',
};

/** Tokens the ledger checks. Symbol and decimals are read from chain, never
    assumed — these are only the addresses worth asking about. */
const BASE_TOKENS = [
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
  '0x4200000000000000000000000000000000000006', // WETH
  '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', // cbBTC
  '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI
  '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // USDbC
  '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42', // EURC
  '0x940181a94A35A4569E4529A3CDfB74e38FD98631', // AERO
  '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', // cbETH
  '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452', // wstETH
];

export const CHAINS = {
  8453: {
    id: 8453,
    name: 'Base',
    short: 'Base',
    explorer: 'https://basescan.org',
    rpc: 'https://mainnet.base.org',
    tokens: BASE_TOKENS,
    spenders: Object.keys(BASE_SPENDERS),
    labels: BASE_SPENDERS,
  },

  /* The proof of concept's own target. Deliberately carries no curated list:
     the demo contracts are not deployed yet, so the honest result here is an
     empty ledger rather than a list of mainnet addresses that mean nothing on
     a testnet. */
  84532: {
    id: 84532,
    name: 'Base Sepolia',
    short: 'Base Sepolia',
    explorer: 'https://sepolia.basescan.org',
    rpc: 'https://sepolia.base.org',
    tokens: [],
    spenders: [],
    labels: {},
  },
};

export const DEFAULT_CHAIN = 8453;

export function chainOf(id) {
  return CHAINS[Number(id)] || null;
}

/** A spender we have not confirmed is shown as itself. It is not guessed at. */
export function labelFor(chain, address) {
  return chain?.labels?.[address.toLowerCase()] || null;
}

export function shorten(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
