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
    body: 'The raw call decoded into the authority it creates. Not the label on the button, the object underneath it.',
  },
  {
    step: 'Compare',
    title: 'Is that more than my action requires?',
    body: 'The action you started, before anyone asked you to approve anything, held against what the application asked for.',
  },
  {
    step: 'Limit',
    title: 'What should I do instead?',
    body: 'The smallest permission that still completes what you wanted, with an expiry attached where none existed.',
  },
  {
    step: 'Sign',
    title: 'Your wallet. Never ours.',
    body: 'We hand over an unsigned payload and stop. Accept the correction, keep the original, or walk away.',
  },
  {
    step: 'Verify',
    title: 'What permission exists now?',
    body: 'Read the chain back. The stated intent and the resulting onchain state have to agree, or it is not done.',
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
