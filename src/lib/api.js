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

// BRANCH ONLY, NEVER MERGE TO MAIN. This branch builds the verification
// preview at txguard.sferaonchain.pages.dev, which reads the new engine on
// txguard-api-next while the live demo keeps reading txguard-api.
const BASE = import.meta.env.PUBLIC_TXGUARD_API || 'https://txguard-api-next.fly.dev';

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
 */

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
 */
function permission(p) {
  const granted = p.granted ?? { kind: 'UNKNOWN', amount: null };
  return {
    ...p,
    granted,
    grantedKey: key(granted),
    held: quantity(p.held),
    reachableNow: quantity(p.reachableNow),
  };
}

/* The engine's own vocabulary for a correction, in the two words this site
   has always used for it. The check in demo/Handoff.jsx compares what came
   back against what was asked for, and it compares these. */
const ACTIONS = {
  REVOKE_ERC20_ALLOWANCE: 'REVOKE',
  SET_CUSTOM_ERC20_ALLOWANCE: 'LIMIT',
  SET_EXACT_ERC20_ALLOWANCE: 'LIMIT',
};

/** The chain list. Every caller here reads `id`; the wire says `chainId`. */
export async function chains() {
  const cs = await get('/v1/chains');
  return (cs ?? []).map((c) => ({ ...c, id: c.chainId }));
}

export async function permissions(chainId, address) {
  const scan = await get(`/v1/permissions/${chainId}/${address}`);
  /* Every row is kept, including the ones that did not answer. Nothing is
     filtered here and nothing ever should be: a row dropped on the way
     through is a permission the page never knew it failed to read. */
  return { ...scan, id: scan.chainId, permissions: (scan.permissions ?? []).map(permission) };
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
 */
export async function remediation(chainId, holder, token, spender, amount) {
  const q = amount ? `?amount=${encodeURIComponent(amount)}` : '';
  const plan = await get(`/v1/remediation/${chainId}/${holder}/${token}/${spender}${q}`);

  const steps = plan.steps ?? [];
  const step = steps[0] ?? null;

  return {
    ...plan,
    action: ACTIONS[plan.action] ?? plan.action,
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
