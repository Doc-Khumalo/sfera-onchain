import { formatUnits } from 'viem';

/**
 * What the ledger is allowed to say about a standing permission.
 *
 * A DELIBERATE DEPARTURE, AND THE REASON FOR IT.
 *
 * Decision Specification §70 to §75 defines PROCEED, LIMIT, REVIEW, DECLINE
 * and UNKNOWN, and every one of them except UNKNOWN is defined against a
 * trusted intent — PROCEED means the authority matches what the action
 * required, LIMIT means it is broader than what the action required. A ledger
 * of permissions you granted weeks ago has no action in flight, so there is no
 * required authority to compare against, and emitting LIMIT or PROCEED here
 * would mean inventing the comparison those verdicts are made of.
 *
 * So this screen reports observations, not decisions, and says so on the page.
 * A decision needs an intent, and the intent arrives with the loop. That is
 * not a limitation to apologise for, it is the argument: a product that judges
 * authority without knowing what you were trying to do is guessing.
 *
 * The observations below are all directly readable from chain state.
 */
export const READINGS = {
  UNBOUNDED: {
    label: 'Unbounded',
    tone: 'stamp',
    means: 'No limit and no expiry. The amount this application may take is not capped.',
    notMeans: 'It does not mean the application has done anything wrong.',
  },
  EXCEEDS: {
    label: 'Over-wide',
    tone: 'stamp',
    means: 'Finite, but larger than the balance it applies to, so deposits you have not made yet are covered too.',
    notMeans: 'It does not mean funds are missing.',
  },
  BOUNDED: {
    label: 'Bounded',
    tone: 'seal',
    means: 'A finite permission, no larger than the balance it applies to.',
    notMeans: 'Bounded is not safe. It is a smaller blast radius, not none.',
  },
  UNKNOWN: {
    label: 'Unknown',
    tone: 'plain',
    means: 'This contract did not answer the calls needed to read it.',
    notMeans: 'Unknown is never presented as no issue detected, and carries no correction.',
  },
};

export function readingFor(p) {
  if (!p.token.readable) return 'UNKNOWN';
  if (p.unbounded) return 'UNBOUNDED';
  if (p.token.balance !== null && p.allowance > p.token.balance) return 'EXCEEDS';
  return 'BOUNDED';
}

/**
 * Retention §30 — every warning has to be specific, evidence based and
 * actionable, and alert fatigue is called out by name.
 *
 * Unbounded always qualifies, because the exposure is every future deposit
 * whatever the balance is today. Over-wide only qualifies when there is
 * something to take right now: a finite permission against an empty balance is
 * worth listing and not worth alarming anyone about.
 */
export function needsAttention(p) {
  const r = readingFor(p);
  if (r === 'UNBOUNDED' || r === 'UNKNOWN') return true;
  return r === 'EXCEEDS' && p.reachable !== null && p.reachable > 0n;
}

export function amount(value, decimals, symbol) {
  if (typeof value !== 'bigint' || decimals === null) return 'Not established';
  const n = Number(formatUnits(value, decimals));
  const text = n === 0
    ? '0'
    : n < 0.0001
      ? '<0.0001'
      : n.toLocaleString('en-US', { maximumFractionDigits: n < 1 ? 6 : 4 });
  return symbol ? `${text} ${symbol}` : text;
}

export function grantedText(p) {
  return p.unbounded ? 'Unlimited' : amount(p.allowance, p.token.decimals, p.token.symbol);
}

export function reachableText(p) {
  if (p.reachable === null) return 'Not established';
  return amount(p.reachable, p.token.decimals, p.token.symbol);
}

/**
 * Retention §11.1 — the four questions the first screen answers.
 *
 * There is no dollar figure. Converting balances to a currency needs a price
 * feed the proof of concept does not have, and a made up total on a security
 * product is worse than no total. What is counted instead is what was actually
 * read from the chain.
 */
export function summarise(permissions, scanInfo) {
  const attention = permissions.filter(needsAttention).length;
  const unbounded = permissions.filter((p) => readingFor(p) === 'UNBOUNDED').length;
  const apps = new Set(permissions.map((p) => p.spender.toLowerCase())).size;

  return [
    { k: 'Live permissions', v: String(permissions.length), note: 'Read from the chain just now' },
    { k: 'Unbounded', v: String(unbounded), note: 'No limit, no expiry' },
    { k: 'Needs attention', v: String(attention), note: 'Unbounded, over-wide or unreadable' },
    {
      k: 'Applications',
      v: String(apps),
      note: apps === 1 ? 'Able to act again' : 'Able to act again',
    },
  ];
}

/** Retention §11.1 — state the coverage rather than implying it is complete. */
export function coverage(scanInfo) {
  const checked = scanInfo?.checked;
  return [
    {
      state: 'Checked',
      n: checked ? checked.pairs : 0,
      body: checked
        ? `${checked.tokens} tokens against ${checked.spenders} known spenders, read directly from the chain.`
        : 'Nothing has been read yet.',
    },
    {
      state: 'Unreadable',
      n: (scanInfo?.unreadable ?? 0) + (scanInfo?.unread ?? 0),
      body: 'Contracts that did not answer, and pairs whose allowance call failed. Counted as unread, never as absent.',
    },
    {
      state: 'Not covered',
      n: null,
      /* Approving Permit2 is two permissions, not one: the ERC-20 allowance to
         Permit2, which is read above, and whatever Permit2 has since granted
         onward to individual applications, which has its own amounts and
         expiries and is not read here. Saying "Permit2" is not covered while
         listing Permit2 rows would contradict the screen. */
      body: 'What Permit2 has granted onward, signature approvals, spend permissions, NFT operators, and any spender or token not on the list.',
    },
  ];
}
