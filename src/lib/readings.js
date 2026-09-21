/**
 * How the engine's readings are described on screen.
 *
 * The engine decides; this file only names what it decided. Keeping the
 * vocabulary here rather than in a component means the page cannot invent a
 * reading the engine never emitted.
 *
 * On why these are readings and not verdicts: DECISION §70-75 defines PROCEED,
 * LIMIT and REVIEW against a trusted intent, and a permission granted weeks
 * ago has no action in flight to compare against. The verdict belongs to the
 * loop, where the intent is known.
 */
export const READINGS = {
  UNBOUNDED: {
    label: 'Unbounded',
    tone: 'stamp',
    means: 'No limit and no expiry. The amount this application may take is not capped.',
    notMeans: 'It does not mean the application has done anything wrong.',
  },
  OVER_WIDE: {
    label: 'Over-wide',
    tone: 'stamp',
    means: 'Finite, but larger than the balance it applies to, so deposits not yet made are covered too.',
    notMeans: 'It does not mean funds are missing.',
  },
  BOUNDED: {
    label: 'Bounded',
    tone: 'seal',
    means: 'A finite permission, no larger than the balance it applies to.',
    notMeans: 'Bounded is not safe. It is a smaller blast radius, not none.',
  },
  REMOVED: {
    label: 'Removed',
    tone: 'seal',
    means: 'This authority grants nothing.',
    notMeans: 'It does not imply other authority was removed.',
  },
  EXPIRED: {
    label: 'Expired',
    tone: 'plain',
    means: 'The authority lapsed on its own terms.',
    notMeans: 'This is a normal outcome and not an incident.',
  },
  UNKNOWN: {
    label: 'Unknown',
    tone: 'plain',
    means: 'This contract did not answer the calls needed to read it.',
    notMeans: 'Unknown is never presented as no issue detected, and carries no correction.',
  },
};

export function reading(key) {
  return READINGS[key] || READINGS.UNKNOWN;
}

/**
 * Errors the engine can return, in words a person can act on.
 *
 * THE CODES ARE THE ENGINE'S CANONICAL SET (TECH §71), not a vocabulary of
 * our own. The engine's earlier spellings are kept underneath because a code
 * that has stopped being emitted costs one line here and a code that is
 * emitted and unlisted costs a reader the sentence they needed.
 *
 * A code with no entry falls through to the engine's own `message`, which is
 * written for a person and carries no stack trace or provider text. That is a
 * sound fallback and not a reason to leave a code unlisted: the fallback is
 * the engine's voice, and these are the site's.
 */
export const ERRORS = {
  INVALID_REQUEST: 'That request is not one the engine can read.',
  UNSUPPORTED_CHAIN: 'This ledger does not read that chain, and will not guess at it.',
  RPC_TIMEOUT: 'The chain did not answer in time. Nothing is shown rather than a partial list.',
  RPC_UNAVAILABLE: 'The chain could not be reached, so nothing was read from it.',
  RPC_BUDGET_EXCEEDED: 'Reading this took more of the chain than one read is allowed.',
  RATE_LIMITED: 'Too many requests. Wait a moment and try again.',
  SERVICE_UNAVAILABLE: 'The engine is at capacity. Try again shortly.',
  ORIGIN_REJECTED: 'The engine did not accept a request from here.',
  /* REMEDIATION_NOT_ALLOWED is deliberately absent. One code covers several
     refusals — an unreadable authority, a token outside the registry, an
     amount above the live allowance — and the engine's own message is the
     only thing that says which. Replacing it with one sentence of ours would
     tell a person asking for too large a limit that no correction exists. */
  REMEDIATION_INVALID: 'That correction is not one the engine will build.',
  INTERNAL_ERROR: 'The engine failed on this. It is a fault on our side, not a finding about this wallet.',

  /* The engine's earlier spellings, and this client's own. */
  CHAIN_UNSUPPORTED: 'This ledger does not read that chain, and will not guess at it.',
  CHAIN_UNREADABLE: 'The chain could not be read. Nothing is shown rather than a partial list.',
  TOO_BUSY: 'The engine is at capacity. Try again shortly.',
  ADDRESS_INVALID: 'That is not a valid address.',
  NETWORK: 'The engine could not be reached.',
  NO_REMEDIATION: 'No correction may be offered for this authority.',
  TWO_STEP_REQUIRED: 'A live allowance must be set to zero before it can be narrowed.',
};

export function explain(err) {
  return ERRORS[err?.code] || err?.message || 'Something went wrong.';
}
