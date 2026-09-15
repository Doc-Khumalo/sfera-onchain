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
 * Where a conversation can start.
 *
 * BOOKING is a plain link and never an embedded widget. DEPLOYMENT.md forbids
 * third party JavaScript on any signing surface, and a scheduler embed is
 * exactly that. Swap the URL when the Cal.com account exists; nothing else
 * needs to change.
 */
export const BOOKING = null; // e.g. 'https://cal.com/sferaonchain/30min'
