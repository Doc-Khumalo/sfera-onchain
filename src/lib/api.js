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

const BASE = import.meta.env.PUBLIC_TXGUARD_API || 'https://txguard-api.fly.dev';

class ApiError extends Error {
  constructor({ code, message, retryable, correlationId }) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.correlationId = correlationId;
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
    throw new ApiError(body || { code: 'UNKNOWN', message: `Request failed (${res.status}).` });
  }
  return body;
}

export function chains() {
  return get('/v1/chains');
}

export function permissions(chainId, address) {
  return get(`/v1/permissions/${chainId}/${address}`);
}

/**
 * Returns unsigned calldata. The engine cannot sign and neither can we.
 *
 * `amount` asks for a boundary rather than a removal — approve(spender, n)
 * instead of approve(spender, 0) — in base units, as a decimal string.
 *
 * THE ENGINE DOES NOT HONOUR IT YET. Today it answers every call with
 * action: "REVOKE" whatever is asked of it. The parameter is sent anyway
 * because the alternative is a control that quietly means something else, and
 * the caller checks the action it got back against the one it asked for
 * (see demo/Handoff.jsx). When the engine learns to build a limit, the page
 * starts offering one without another line changing here.
 */
export function remediation(chainId, holder, token, spender, amount) {
  const q = amount ? `?amount=${encodeURIComponent(amount)}` : '';
  return get(`/v1/remediation/${chainId}/${holder}/${token}/${spender}${q}`);
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
export function format(raw, decimals, symbol) {
  if (raw === null || raw === undefined) return 'Not established';
  let v;
  try {
    v = BigInt(raw);
  } catch {
    return 'Not established';
  }

  const d = decimals || 0;
  const tail = symbol ? ` ${symbol}` : '';

  if (isDollar(symbol)) {
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
