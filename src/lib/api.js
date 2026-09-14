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

/** Returns unsigned calldata. The engine cannot sign and neither can we. */
export function remediation(chainId, holder, token, spender) {
  return get(`/v1/remediation/${chainId}/${holder}/${token}/${spender}`);
}

/**
 * Quantities cross the wire as decimal strings, because JSON numbers are IEEE
 * 754 doubles and cannot hold a uint256. Formatting therefore happens here,
 * against BigInt, and never by parsing into a float.
 */
export function format(raw, decimals, symbol) {
  if (raw === null || raw === undefined) return 'Not established';
  let v;
  try {
    v = BigInt(raw);
  } catch {
    return 'Not established';
  }

  const d = BigInt(10) ** BigInt(decimals || 0);
  const whole = v / d;
  const frac = v % d;

  let text = whole.toLocaleString('en-US');
  if (frac > 0n && decimals > 0) {
    const f = frac.toString().padStart(decimals, '0').replace(/0+$/, '').slice(0, 4);
    if (f) text += '.' + f;
  }
  return symbol ? `${text} ${symbol}` : text;
}

export { ApiError };
