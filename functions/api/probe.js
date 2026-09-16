/**
 * A record that an address was read.
 *
 * WHAT THIS COSTS, STATED PLAINLY. The site said "Nothing is signed, stored,
 * or sent anywhere" above the link to the ledger. Logging a probe makes the
 * middle third of that sentence false, so the sentence changed with this file
 * rather than after someone noticed. A product about knowing who can act on
 * your behalf does not get to be vague about what it keeps.
 *
 * So it keeps as little as will do the job: the address, when, which chains
 * answered, and how many permissions came back. No IP, no user agent, no
 * referrer, no cookie, no fingerprint of any kind — the Function never reads
 * them and Cloudflare is not asked to pass them on. An address that has been
 * read is already public; the joining of it to a person is what would be new,
 * and nothing here does that joining.
 *
 * Storage is KV, as the subscriber list is. Create and bind it as PROBES:
 *   wrangler kv namespace create PROBES
 *
 * It fails quietly, and that is deliberate: this is a log, not a feature. If
 * the binding is missing or KV is down, the reading a person came for still
 * happens. Nothing about their wallet depends on our bookkeeping.
 */

const MAX_BODY = 1024;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export async function onRequestPost({ request, env }) {
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY) {
    return new Response(null, { status: 204 });
  }

  let body;
  try { body = await request.json(); } catch { return new Response(null, { status: 204 }); }

  const address = String(body?.address || '').trim().toLowerCase();
  if (!ADDRESS.test(address)) return new Response(null, { status: 204 });

  const chains = Array.isArray(body?.chains)
    ? body.chains.map(Number).filter(Number.isInteger).slice(0, 32)
    : [];
  const found = Number.isInteger(body?.found) ? Math.max(0, Math.min(9999, body.found)) : null;

  if (!env.PROBES) return new Response(null, { status: 204 });

  try {
    const at = new Date().toISOString();
    /* Keyed by time then address, so the list reads chronologically and a
       wallet read twice is two readings rather than one overwritten. */
    await env.PROBES.put(`probe:${at}:${address}`, JSON.stringify({ address, at, chains, found }));
  } catch {
    /* Swallowed on purpose — see the note above. */
  }

  return new Response(null, { status: 204 });
}

/** A GET here is someone poking at the URL. */
export function onRequestGet() {
  return new Response(null, { status: 405 });
}
