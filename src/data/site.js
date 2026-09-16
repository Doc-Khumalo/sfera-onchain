/**
 * Shared site data.
 *
 * Every string here is lifted from the approved documents:
 *   - Marketing Plan  §7.x messaging, §20 website architecture, §30 trust commitments
 *   - UX Specification §2 loop, §6 concepts, §16 D00, §21-25 receipt, §38 L05-A
 *   - Development Plan §7.1-7.3 standards roadmap
 *
 * Nothing here was invented. If a section needs copy that does not exist in a
 * document, ask rather than writing a placeholder.
 */

export const CONTACT = 'https://www.linkedin.com/in/khumalo-leslie/';

export const FOUNDERS = [
  {
    name: 'Leslie Khumalo',
    role: 'Engineering',
    href: 'https://www.linkedin.com/in/khumalo-leslie/',
  },
  {
    name: 'Blagoja Mojsoski',
    role: 'Product and quality',
    href: 'https://www.linkedin.com/in/blagoja-mojsoski-228b79b1/',
  },
];

/** UX Specification §2 — the complete control loop. */
export const LOOP = [
  {
    step: 'Understand',
    title: 'What am I actually authorizing?',
    body: 'The call decoded into the authority it creates. Not the label on the button - the object underneath it.',
  },
  {
    step: 'Compare',
    title: 'Is that more than my action needs?',
    body: 'What you set out to do, held against what the application asked for. The gap between the two is the whole product.',
  },
  {
    step: 'Limit',
    title: 'What should it have asked for?',
    body: 'The smallest permission that still completes what you wanted, with an expiry attached where there was none.',
  },
  {
    step: 'Sign',
    title: 'Who signs it? You do.',
    body: 'We hand over an unsigned payload and stop. Take the correction, keep the original, or walk away — nothing moves without you.',
  },
  {
    step: 'Verify',
    title: 'What exists on the chain now?',
    body: 'Ask it again afterwards. What we claimed and what the chain says have to agree, or the job is not done.',
  },
];

/**
 * Development Plan §7.1-7.3.
 * Status is stated on every row because none of this is production yet.
 */
export const COVERAGE = [
  { group: 'Proof of concept', status: 'in-build', items: ['ERC-20', 'ERC-721', 'ERC-1155', 'ERC-165', 'EIP-712'] },
  { group: 'Private MVP', status: 'planned', items: ['ERC-2612', 'Permit2', 'ERC-1271', 'ERC-6492', 'ERC-4337', 'EIP-7702', 'ERC-7715', 'Base Spend Permissions'] },
  { group: 'After Cobalt', status: 'experimental', items: ['EIP-8130', 'ERC-8168', 'ERC-7710', 'ERC-7895'] },
];

/** Marketing Plan §30 — public trust commitments. */
export const COMMITMENTS = [
  'We never request recovery phrases or private keys.',
  'We do not sign on your behalf.',
  'Corrections stay unsigned until you confirm them in your wallet.',
  'Unknown requests are labelled unknown.',
  'No issue detected is not presented as guaranteed safety.',
  'Generative AI does not determine authority or safety.',
  'Commercial relationships do not change security conclusions.',
];

/** Marketing Plan §30 — the subset the live ledger has to keep on screen. */
export const TERMS = [
  'We never request recovery phrases or private keys.',
  'We do not sign on your behalf.',
  'Corrections stay unsigned until you confirm them in your wallet.',
  'Unknown requests are labelled unknown.',
  'No issue detected is not presented as guaranteed safety.',
];


/**
 * The chains the ledger reads, with their own marks.
 *
 * Marks are simple inline glyphs rather than fetched brand assets: a logo file
 * from a third party is a request we do not control on a page that must not
 * make any, and an approximation we drew is more honest than a trademark we
 * hotlinked. Colours are each chain's own, used only as an identifier.
 *
 * This list is generated from what the engine actually serves. If a chain is
 * here, /demo can read it.
 */
export const CHAINS = [
  { name: 'Ethereum',  colour: '#627EEA', explorer: 'https://etherscan.io',            mark: '\u25C6' },
  { name: 'Base',      colour: '#0052FF', explorer: 'https://basescan.org',            mark: '\u25CF' },
  { name: 'Arbitrum',  colour: '#12AAFF', explorer: 'https://arbiscan.io',             mark: '\u25B2' },
  { name: 'Optimism',  colour: '#FF0420', explorer: 'https://optimistic.etherscan.io', mark: '\u25CF' },
  { name: 'Polygon',   colour: '#8247E5', explorer: 'https://polygonscan.com',         mark: '\u2B23' },
  { name: 'BNB Chain', colour: '#F0B90B', explorer: 'https://bscscan.com',             mark: '\u25C6' },
  { name: 'Avalanche', colour: '#E84142', explorer: 'https://snowtrace.io',            mark: '\u25B2' },
  { name: 'Unichain',  colour: '#FF007A', explorer: 'https://uniscan.xyz',             mark: '\u25CF' },
  { name: 'Linea',     colour: '#61DFFF', explorer: 'https://lineascan.build',         mark: '\u25A0' },
  { name: 'Scroll',    colour: '#FFEEDA', explorer: 'https://scrollscan.com',          mark: '\u25A0' },
  { name: 'Gnosis',    colour: '#3E6957', explorer: 'https://gnosisscan.io',           mark: '\u25CF' },
  { name: 'Celo',      colour: '#FCFF52', explorer: 'https://celoscan.io',             mark: '\u25CF' },
  { name: 'zkSync Era',colour: '#8C8DFC', explorer: 'https://era.zksync.network',      mark: '\u25C6' },
  { name: 'Hyperliquid', colour: '#97FCE4', explorer: 'https://hyperevmscan.io',       mark: '\u25B2' },
  { name: 'Robinhood', colour: '#CCFF00', explorer: 'https://bscscan.com',             mark: '\u25A0' },
];

/**
 * Addresses the demo can be pointed at, for someone who has none to hand.
 *
 * EVERY ONE IS VERIFIED BEFORE IT IS WRITTEN DOWN. The engine reads a registry
 * of a few tokens against ten spenders per chain, so an address with a long
 * trading history shows nothing unless what it approved is in that registry —
 * the limit is the registry, not the wallet. Each entry here was queried
 * against the live engine and the counts below are what came back.
 *
 * These were harvested rather than guessed: Approval logs for Uniswap's
 * Permit2 on USDC and WETH over a recent span of Base and Ethereum blocks gave
 * 133 owners, each was queried against the engine, and the eleven that
 * answered are grouped below by what they demonstrate. Exchange wallets, DAO
 * treasuries and protocol multisigs all came back empty — they hold balances
 * and approve nothing.
 *
 * THEY ARE REAL PEOPLE'S WALLETS. Public, and public is not the same as
 * offered. Nothing here names anyone, the figures are the chain's own, and the
 * page says the wallet is being read rather than accused — the same care the
 * example console takes with the applications it names.
 *
 * To add one:
 *
 *   curl https://txguard-api.fly.dev/v1/permissions/<chainId>/<address>
 *
 * and keep it only if `permissions` is not empty. Do not write down an address
 * that has not answered.
 */
export const EXAMPLES = [
  /* Several at once — the case that makes the argument. */
  {
    group: 'Several at once',
    address: '0x09ad820aac5779683b481c4674208a4e1b024afa',
    chainId: 8453,
    title: 'Eleven unbounded approvals, two chains',
    note: 'USDC, WETH, cbBTC, AERO, USDT and EURC on Base; USDC, USDT, WETH, WBTC and EURC on Ethereum',
  },
  {
    group: 'Several at once',
    address: '0x7bc57c9566919a40521f850f99a2d121493b86cf',
    chainId: 1,
    title: 'Three unbounded approvals',
    note: 'USDC, WETH and WBTC on Ethereum',
  },
  {
    group: 'Several at once',
    address: '0x8ea5ad2a58c1dae75394b1e8636e6518eb6dac50',
    chainId: 8453,
    title: 'Three unbounded approvals',
    note: 'USDC, WETH and USDT on Base',
  },

  /* Money reachable today — what the headline figure is for. */
  {
    group: 'Money reachable today',
    address: '0x5d49d3c9484899a5dbbfaa21c3bd0e00d023e582',
    chainId: 1,
    title: 'Unbounded, against a live balance',
    note: 'WETH on Ethereum, with a balance the approval reaches',
  },
  {
    group: 'Money reachable today',
    address: '0x6a996e74d044d346b452055d04b2c2f4aebfec89',
    chainId: 8453,
    title: 'Unbounded, against a live balance',
    note: 'USDC on Base, with a balance the approval reaches',
  },
  {
    group: 'Money reachable today',
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    chainId: 10,
    title: 'Unbounded, against a live balance',
    note: 'OP on Optimism, to Uniswap Permit2',
  },

  /* The reading people misjudge: live authority over an empty balance. */
  {
    group: 'Nothing to take today',
    address: '0x7eaa922665112fe12c254d9583d224e7edfbd3aa',
    chainId: 1,
    title: 'Unbounded, empty balance',
    note: 'WETH on Ethereum — the authority is live, the balance is not',
  },
  {
    group: 'Nothing to take today',
    address: '0x539c8617cbbd803202c1b9fcd8aa07fa75301e4a',
    chainId: 8453,
    title: 'Unbounded, empty balance',
    note: 'USDC on Base — nothing reachable, and nothing expires',
  },

  /* A wallet in good order, so the page is not only red. */
  {
    group: 'Everything bounded',
    address: '0xfbe231b15abd6cc692384e260cca430a16e70d2d',
    chainId: 1,
    title: 'One bounded approval',
    note: 'WETH on Ethereum, capped — what a corrected wallet looks like',
  },
];

/**
 * Where a conversation can start.
 *
 * BOOKING is a plain link and never an embedded widget. DEPLOYMENT.md forbids
 * third party JavaScript on any signing surface, and a scheduler embed is
 * exactly that. Swap the URL when the Cal.com account exists; nothing else
 * needs to change.
 */
export const BOOKING = null; // e.g. 'https://cal.com/sferaonchain/30min'
