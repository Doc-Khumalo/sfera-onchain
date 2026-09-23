/**
 * The TX Guard engine client.
 *
 * The page used to read the chain itself. It no longer does, and the reason is
 * not tidiness: the engine holds the RPC endpoint, applies the decision rules,
 * enforces rate limits and can be corrected without redeploying this site.
 * ARCHITECTURE.md puts it plainly, Go owns anything that decides, and a
 * browser is not a place to decide anything.
 *
 * What stays here is the wallet. The engine holds no key and neither does this
 * file: corrections are constructed by the engine, unsigned, and handed to the
 * wallet to sign. Marketing Plan §30, we do not sign on your behalf.
 */

/* Read through a binding rather than the member expression, so that the same
   module loads under plain Node — `node --test` imports this file to exercise
   the adapter against saved fixtures, and there is no `import.meta.env` there.
   Vite replaces `import.meta.env` itself, so the site is unaffected. */
const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};

const BASE = ENV.PUBLIC_TXGUARD_API || 'https://txguard-api.fly.dev';

class ApiError extends Error {
  constructor({ code, message, retryable, correlationId, retryAfter }) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.correlationId = correlationId;
    this.retryAfter = retryAfter ?? null;
  }
}

async function get(path) {
  let res;
  try {
    res = await fetch(BASE + path, { headers: { Accept: 'application/json' } });
  } catch {
    /* A network failure is not an empty result. The distinction matters more
       here than almost anywhere: a permission that failed to load and one that
       was never granted look identical on a screen. */
    throw new ApiError({
      code: 'NETWORK',
      message: 'The engine could not be reached.',
      retryable: true,
    });
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    /* The envelope is nested: every non-2xx body is `{ error: { code, ... } }`
       (TECH §70). It used to be flat, and a reader that still expects the flat
       one gets `undefined` for the code and falls through to the generic
       sentence — which is how a rate limit starts reading as "something went
       wrong". The flat form is still accepted so that a proxy or an older
       deployment answering in front of the engine is not mistaken for one. */
    throw new ApiError(
      body?.error || body || { code: 'INTERNAL_ERROR', message: `Request failed (${res.status}).` },
    );
  }
  return body;
}

/* ---- the adapter -------------------------------------------------------
 *
 * THE COMPONENTS ARE NOT TOLD THE WIRE CHANGED. /v1 changed shape in place —
 * capacities instead of bare amounts, `unreadable` instead of `readable`,
 * `chainId` instead of `id`, a plan of steps instead of one transaction — and
 * thirty-odd field reads are spread across six components. Converting them
 * would put the wire's spelling in six places and guarantee that the next
 * change to it is another six-file edit. It is translated once, here.
 *
 * WHAT IT MUST NOT DO. The engine now returns the pairs whose `allowance()`
 * failed, with `unreadable` set and no figure, where it used to drop them
 * silently. Mapping any of that to zero, or filtering those rows back out to
 * keep the old shape tidy, would put a failed read on the screen as a clean
 * wallet — the exact defect the release fixes. NONE is zero. UNKNOWN is not,
 * and never becomes a number on the way through.
 *
 * IT READS BOTH SHAPES, AND DECIDES BY THE FIELDS IN FRONT OF IT. /v1 changed
 * in place, so during the cutover the same path answers in either shape
 * depending on which deployment is in front of it — and a site that reads only
 * one of them is broken for the length of the changeover. Nothing here
 * switches on a host name or a version flag: a host is a deployment detail
 * that a proxy, a preview or a rollback changes without telling anyone, and
 * there is no version to read because the version did not change. The payload
 * says what it is, per response and per row, so a half-rolled-out engine
 * cannot produce a page that is wrong about half its rows.
 *
 * THE OLD SHAPE HAS NO WAY TO SAY "THIS PAIR DID NOT ANSWER". It dropped those
 * pairs, so what the new shape shows as a row with `unreadable` set is, on the
 * old wire, simply absent. Nothing here invents the missing row: a row the
 * engine did not send is a row this file does not have, and manufacturing one
 * would be a fabricated reading. What it does instead is refuse to claim the
 * read was complete — `notAnswered` stays null rather than becoming 0, and
 * `readStated` is false, which is what the page reads to withhold an
 * all-clear. An absent row is silent; a false zero is a statement.
 */

/** A Capacity is the new wire's quantity: `{ kind, amount }`. */
const isCapacity = (v) => !!v && typeof v === 'object' && typeof v.kind === 'string';

/**
 * Which shape one permission row is in.
 *
 * Decided per row on the fields it carries, never on the response around it.
 * The new shape says `granted` as a Capacity and carries `unreadable`; the old
 * one says `granted` as a bare string beside a separate `unbounded` boolean,
 * and says `readable` instead. Any of those is conclusive on its own, so a row
 * is read correctly even where an engine is mid-rollout and inconsistent.
 */
function rowIsNew(p) {
  if (isCapacity(p?.granted)) return true;
  if ('unreadable' in (p ?? {}) || Array.isArray(p?.actions)) return true;
  if ('readable' in (p ?? {}) || 'unbounded' in (p ?? {})) return false;
  /* Neither vocabulary. Nothing is assumed: the row is carried through the new
     path, where an absent Capacity becomes UNKNOWN rather than a figure. */
  return true;
}

/**
 * The old wire's `granted` as the Capacity it was always describing.
 *
 * `unbounded: true` came with the literal string "Unlimited" in `granted` —
 * which is why the boolean existed, and why the engine deleted both in favour
 * of one field that cannot contradict itself. The boolean is believed here,
 * because it is the only thing on the old wire that distinguishes "no ceiling"
 * from a figure, and UNBOUNDED never acquires a number on the way through.
 *
 * Anything that is not a readable decimal string becomes UNKNOWN rather than
 * zero. "Unlimited" arriving without the boolean is the case that matters: it
 * parses as nothing, and reading it as nothing means reading an unlimited
 * allowance as an empty one.
 */
function oldCapacity(granted, unbounded) {
  if (unbounded === true) return { kind: 'UNBOUNDED', amount: null };
  if (granted === null || granted === undefined) return { kind: 'UNKNOWN', amount: null };
  const raw = String(granted).trim();
  if (!/^\d+$/.test(raw)) return { kind: 'UNKNOWN', amount: null };
  return raw === '0' ? { kind: 'NONE', amount: null } : { kind: 'FINITE', amount: raw };
}

/** The old wire's `held` and `reachableNow`: a decimal string, or nothing. */
function oldQuantity(v) {
  if (v === null || v === undefined) return null;
  const raw = String(v).trim();
  return /^\d+$/.test(raw) ? raw : null;
}

/**
 * What an old-shape row offers, in the new shape's `actions[]`.
 *
 * THE ENGINE DECIDES THIS WHEREVER THE ENGINE SAYS SO. The new wire carries
 * `actions[]` and the page renders it; the old wire carries no such decision,
 * so something has to stand in or every row against the old engine offers
 * nothing at all and the correction path is dead for the length of the
 * cutover. What stands in is the derivation the page itself used before
 * `actions[]` existed — `remediable`, plus the fact that nothing can be
 * corrected for a reading that did not answer — and it lives here rather than
 * back in six components.
 *
 * NO LIMIT IS OFFERED. The old engine answers every call with a removal
 * whatever is asked of it, so there is no boundary to prepare: drawing the
 * control would be the product promising what it cannot do, and the handoff
 * would refuse it after the click. So the verb is absent rather than present
 * and disabled — an action that does not exist is not an action that is
 * temporarily unavailable.
 *
 * `primary` follows `attention`. A bounded permission over a live balance is
 * not a task, and marking every row as one is the wall of red this table was
 * rebuilt to stop being.
 */
function oldActions(p, unreadable) {
  const why = unreadable
    ? 'This reading did not answer, so there is nothing to build a correction against. Unknown is not a finding of no issue.'
    : p.remediable === false
      ? 'The engine does not offer a correction for this permission.'
      : null;

  return [{
    kind: 'REMOVE',
    available: !why,
    say: 'Remove',
    unavailable: why,
    primary: !why && !!p.attention,
  }];
}

/**
 * A Capacity as a decimal string, for the two fields that are quantities in
 * every state the wire can put them in.
 *
 * FINITE is its own amount. NONE is "0", because the chain really does hold
 * nothing. UNKNOWN comes back null, which `format` prints as "Not
 * established". NOTHING HERE INVENTS A FIGURE: there is no kind whose value
 * is a number the engine did not send.
 *
 * It is used for `held` and `reachableNow` and NOT for `granted`. A balance
 * has no unbounded form, and the contract says ReachableNow is never an
 * unbounded allowance projected into a figure — so for these two the only
 * non-numeric kind is UNKNOWN, and null is the whole of it. `granted` has
 * UNBOUNDED, which is not a quantity at all, so it stays a Capacity.
 */
function quantity(cap) {
  switch (cap?.kind) {
    case 'FINITE': return cap.amount ?? null;
    case 'NONE': return '0';
    default: return null;
  }
}

/**
 * A Capacity in the words a screen shows it in. The one place that decides
 * how "no ceiling", "nothing" and "we could not tell" are worded, so that six
 * components cannot word them six ways or reduce them to a number.
 *
 * UNBOUNDED is "Unlimited" and never a figure. 2^256-1 is what an unbounded
 * ERC-20 approval usually holds on the chain, and usually is not evidence:
 * the engine says UNBOUNDED precisely so that nobody converts it, and a
 * number we supplied cannot be checked against a block explorer.
 */
export function say(cap, decimals, symbol) {
  switch (cap?.kind) {
    case 'FINITE': return format(cap.amount, decimals, symbol);
    case 'UNBOUNDED': return 'Unlimited';
    case 'NONE': return 'None';
    default: return 'Not established';
  }
}

/**
 * A stable scalar for one question: is this the same allowance we last saw?
 *
 * IT IS A COMPARISON KEY AND NEVER A FIGURE. Nothing formats it, nothing
 * parses it, and it exists because `was.granted !== p.granted` compares
 * object identity once `granted` is a Capacity — which is never equal, so a
 * table would report every row as changed on every render. A string compares
 * by value.
 */
function key(cap) {
  return cap?.kind === 'FINITE' ? `FINITE:${cap.amount}` : (cap?.kind ?? 'UNKNOWN');
}

/**
 * One permission, in the shape the table, the sheet and the receipt expect.
 *
 * `granted` IS PASSED THROUGH AS THE CAPACITY IT IS. The old wire carried a
 * number and a separate `unbounded` boolean beside it, and the engine deleted
 * the boolean because the two could contradict each other. Re-deriving it
 * here would put that contradiction back one layer down, and giving UNBOUNDED
 * a number would hand the detail sheet's "Raw allowance" row — an evidence
 * line, whose whole purpose is to be checkable against an explorer — a figure
 * no read produced. Components read it through `say`, or switch on `kind`.
 *
 * `unreadable` passes through untouched. It is the marker: null when the
 * reading answered, and otherwise why it did not.
 *
 * AN OLD-SHAPE ROW LEAVES HERE IN THE SAME INTERNAL FORM. `readable: false`
 * becomes `unreadable: 'NOT_STATED'` — truthy, so every guard that withholds a
 * figure from an unread row fires, and honest, because the old wire does not
 * say WHICH call failed and a named cause would be one we made up. Expiry has
 * no field on the old wire at all: `ends` and `endsSay` stay absent rather
 * than being mined out of the reasons prose, which is the string-matching that
 * broke the first time the engine reworded a sentence. The screen then reads
 * "Not established", which is what is true.
 */
export function adaptPermission(p) {
  if (!rowIsNew(p)) return oldPermission(p);

  const granted = p.granted ?? { kind: 'UNKNOWN', amount: null };
  return {
    ...p,
    granted,
    grantedKey: key(granted),
    held: quantity(p.held),
    reachableNow: quantity(p.reachableNow),
  };
}

function oldPermission(p) {
  /* The old wire's marker, inverted. `readable` absent is not `readable:
     false`: a row the old engine sent at all is one it read, and only an
     explicit false says otherwise. */
  const unreadable = p.readable === false ? 'NOT_STATED' : null;
  const granted = unreadable ? { kind: 'UNKNOWN', amount: null } : oldCapacity(p.granted, p.unbounded);

  const row = {
    ...p,
    granted,
    grantedKey: key(granted),
    held: oldQuantity(p.held),
    reachableNow: oldQuantity(p.reachableNow),
    unreadable,
    /* The engine said EXPIRED, so this is its reading rather than ours. The
       date it lapsed on is not on this wire, so there is no `ends` and no
       `endsSay`, and the panel says the access end is not established. */
    expired: p.reading === 'EXPIRED' ? true : undefined,
    ends: undefined,
    endsSay: undefined,
    actions: oldActions(p, unreadable),
  };
  /* The old spellings do not travel any further than this file. Two fields
     saying one thing is how they came to contradict each other. */
  delete row.readable;
  delete row.unbounded;
  return row;
}

/* The engine's own vocabulary for a correction, in the two words this site
   has always used for it. The check in demo/Handoff.jsx compares what came
   back against what was asked for, and it compares these. */
const ACTIONS = {
  REVOKE_ERC20_ALLOWANCE: 'REVOKE',
  SET_CUSTOM_ERC20_ALLOWANCE: 'LIMIT',
  SET_EXACT_ERC20_ALLOWANCE: 'LIMIT',
};

/**
 * The chain list. Every caller here reads `id`; the new wire says `chainId`
 * and the old one said `id`, so both are carried and `id` is whichever came.
 */
export function adaptChains(cs) {
  return (cs ?? []).map((c) => ({ ...c, chainId: c.chainId ?? c.id, id: c.chainId ?? c.id }));
}

export async function chains() {
  return adaptChains(await get('/v1/chains'));
}

/**
 * One chain's reading.
 *
 * `readStated` IS THE COMPLETENESS OF THE READ, AND IT IS A THIRD STATE. The
 * new wire says how many pairs did not answer, so the page can say it. The old
 * wire dropped them, so nobody can: the count is not zero, it is unknown, and
 * `notAnswered` therefore stays null rather than being rounded down to a
 * figure that would read as "everything answered". The page must not paint an
 * all-clear over a read whose completeness was never stated — see
 * lib/exposure.js, where the mint tone is withheld.
 */
export function adaptScan(scan) {
  const s = scan ?? {};
  const cov = s.coverage ?? {};
  /* Stated by the presence of the field, not by its value: `notAnswered: 0` is
     an engine saying every pair answered, which is exactly the claim the old
     wire cannot make. */
  const readStated = typeof cov.notAnswered === 'number';

  return {
    ...s,
    id: s.chainId ?? s.id,
    chainId: s.chainId ?? s.id,
    coverage: {
      ...cov,
      notAnswered: readStated ? cov.notAnswered : null,
      partial: typeof cov.partial === 'boolean' ? cov.partial : null,
    },
    readStated,
    /* Every row is kept, including the ones that did not answer. Nothing is
       filtered here and nothing ever should be: a row dropped on the way
       through is a permission the page never knew it failed to read. And
       nothing is added: the old wire's missing rows stay missing, because a
       row this file invented would be a reading nobody took. */
    permissions: (s.permissions ?? []).map((p) => ({ ...adaptPermission(p), readStated })),
  };
}

export async function permissions(chainId, address) {
  return adaptScan(await get(`/v1/permissions/${chainId}/${address}`));
}

/**
 * Returns unsigned calldata. The engine cannot sign and neither can we.
 *
 * `amount` asks for a boundary rather than a removal — approve(spender, n)
 * instead of approve(spender, 0) — in base units, as a decimal string.
 *
 * The engine now honours it, and answers with a SEQUENCE rather than a
 * transaction: a revoke is one step, and narrowing a live allowance is two,
 * because ERC-20 will not let several widely held tokens replace a non-zero
 * allowance in one go. The steps that come back are the ones that REMAIN —
 * the engine reads the chain and works out what is already done — so this
 * hands over the first of them and says how many are left. The caller signs
 * one, asks again, and gets whatever is still outstanding.
 *
 * `status: NOTHING_TO_DO` with no steps is a 200 and a state, not a failure:
 * it is what a finished correction, or one somebody else already made, looks
 * like. The caller must render it rather than treat it as an error.
 *
 * THE OLD SHAPE WAS ONE FLAT TRANSACTION. `to`, `data` and `decodesTo` sat at
 * the top of the body with no plan around them, so it is read as the
 * single-step plan it always was — which is also the truth about it, since the
 * old engine only ever built a removal.
 */
export function adaptPlan(plan) {
  const p = plan ?? {};
  /* A plan is the new shape when it carries the plan: a `steps` array. The old
     body carried the transaction itself at the top level and nothing else. */
  const steps = Array.isArray(p.steps) ? p.steps : flatSteps(p);
  const step = steps[0] ?? null;

  return {
    ...p,
    action: ACTIONS[p.action] ?? p.action,
    stepsTotal: p.stepsTotal ?? steps.length,
    stepsCompleted: p.stepsCompleted ?? 0,
    step,
    stepsRemaining: steps.length,
    /* The one transaction that is ready to be handed over now. Null when
       there is nothing left to sign, which is a state and not a fault. */
    to: step?.transaction?.to ?? null,
    data: step?.transaction?.data ?? null,
    value: step?.transaction?.value ?? '0',
    decodesTo: step?.decodesTo ?? null,
    /* What the chain should read once THIS step lands — the value the step's
       own calldata sets, never a projection towards the final target. It is
       what the read-back is checked against. */
    expectedAfter: step?.expectedAllowanceAfter ?? null,
  };
}

/**
 * The old flat body as the one step it is.
 *
 * `expectedAllowanceAfter` is READ OUT OF THE CALLDATA WE WERE HANDED, not
 * guessed at from the action. approve(spender, n) says n in its last word, so
 * the figure the read-back is checked against is the figure this transaction
 * actually sets — checkable by anyone against the same bytes on screen. An
 * action name is not evidence of what the bytes do, which is the whole reason
 * the handoff decodes them in the first place; and a step with no verifiable
 * expectation gets none, so the read-back withholds its tick rather than
 * granting one against a number nobody produced.
 */
const APPROVE = '0x095ea7b3';

function setBy(data) {
  const hex = typeof data === 'string' ? data.toLowerCase() : '';
  /* selector + spender word + amount word, and nothing after it. */
  if (!hex.startsWith(APPROVE) || hex.length !== 10 + 128) return null;
  let v;
  try { v = BigInt('0x' + hex.slice(10 + 64)); } catch { return null; }
  /* NONE is zero. It is stated as NONE rather than FINITE "0" because the
     read-back has to match a row the old engine drops entirely once the
     allowance is nought, and NONE is the kind that covers both an absent row
     and one reading zero. */
  return v === 0n ? { kind: 'NONE', amount: null } : { kind: 'FINITE', amount: v.toString() };
}

function flatSteps(p) {
  if (!p.to || !p.data) return [];
  return [{
    order: 1,
    action: p.action,
    label: 'Set to zero',
    why: null,
    transaction: { to: p.to, data: p.data, value: p.value ?? '0' },
    decodesTo: p.decodesTo ?? null,
    expectedAllowanceAfter: setBy(p.data),
  }];
}

export async function remediation(chainId, holder, token, spender, amount) {
  const q = amount ? `?amount=${encodeURIComponent(amount)}` : '';
  return adaptPlan(await get(`/v1/remediation/${chainId}/${holder}/${token}/${spender}${q}`));
}

/**
 * Assets denominated in dollars, which are shown to the cent and never fewer.
 *
 * "2,500 USDC" and "2,500.00 USDC" are the same number and do not read as the
 * same kind of thing: the first reads as a count, the second as money. Every
 * ticker carrying USD qualifies, plus the dollar stablecoins that do not spell
 * it — so USDC, USDT, crvUSD, sUSD and DAI all settle on two places and align
 * with one another down the column.
 */
const DOLLARS = /USD/i;
const ALSO_DOLLARS = new Set(['DAI', 'FRAX', 'MIM', 'USDE', 'GHO']);

export function isDollar(symbol) {
  if (!symbol) return false;
  return DOLLARS.test(symbol) || ALSO_DOLLARS.has(symbol.toUpperCase());
}

/**
 * Quantities cross the wire as decimal strings, because JSON numbers are IEEE
 * 754 doubles and cannot hold a uint256. Formatting therefore happens here,
 * against BigInt, and never by parsing into a float.
 *
 * Dollar assets are fixed at two places. Everything else keeps up to four and
 * drops trailing zeros, because 0.0001 WETH is a real amount and 1.0000 WETH
 * is a made-up precision.
 *
 * ROUNDING IS HALF-UP, WHICH ROUNDS TOWARDS THE LARGER EXPOSURE. A figure here
 * is what somebody else can take; understating it by a rounding is the one
 * direction that makes a wallet look safer than it is.
 */
export function format(raw, decimals, symbol, alwaysCents = false) {
  if (raw === null || raw === undefined) return 'Not established';
  let v;
  try {
    v = BigInt(raw);
  } catch {
    return 'Not established';
  }

  const d = decimals || 0;
  const tail = symbol ? ` ${symbol}` : '';

  /* `alwaysCents` is for money with no ticker to recognise it by — a sum of
     stablecoins is denominated in dollars and named by nothing. */
  if (alwaysCents || isDollar(symbol)) {
    const places = 2n;
    const unit = 10n ** places;
    /* Rescale to hundredths, rounding half-up on the way down. */
    let n;
    if (d > 2) {
      const scale = BigInt(10) ** BigInt(d - 2);
      n = (v + scale / 2n) / scale;
    } else {
      n = v * BigInt(10) ** BigInt(2 - d);
    }
    const whole = n / unit;
    const frac = n % unit;
    return `${whole.toLocaleString('en-US')}.${frac.toString().padStart(2, '0')}${tail}`;
  }

  const den = BigInt(10) ** BigInt(d);
  const whole = v / den;
  const frac = v % den;

  let text = whole.toLocaleString('en-US');
  if (frac > 0n && d > 0) {
    const f = frac.toString().padStart(d, '0').replace(/0+$/, '').slice(0, 4);
    if (f) text += '.' + f;
  }
  return text + tail;
}

export { ApiError };
