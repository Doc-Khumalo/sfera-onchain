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

/** Errors the engine can return, in words a person can act on. */
export const ERRORS = {
  CHAIN_UNSUPPORTED: 'This ledger does not read that chain, and will not guess at it.',
  CHAIN_UNREADABLE: 'The chain could not be read. Nothing is shown rather than a partial list.',
  RATE_LIMITED: 'Too many requests. Wait a moment and try again.',
  TOO_BUSY: 'The engine is at capacity. Try again shortly.',
  ADDRESS_INVALID: 'That is not a valid address.',
  NETWORK: 'The engine could not be reached.',
  NO_REMEDIATION: 'No correction may be offered for this authority.',
  TWO_STEP_REQUIRED: 'A live allowance must be set to zero before it can be narrowed.',
};

export function explain(err) {
  return ERRORS[err?.code] || err?.message || 'Something went wrong.';
}
