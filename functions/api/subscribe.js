/**
 * Email signup, first party.
 *
 * A Cloudflare Pages Function rather than a form service, because the
 * alternative is a third party origin receiving addresses from a page whose
 * whole argument is that you should know who can act on your behalf.
 * DEPLOYMENT.md rules out third party JavaScript on a signing surface, and the
 * same reasoning covers where an address is sent.
 *
 * WHY THIS RENDERS ITS OWN PAGE rather than redirecting with a query string.
 * The site is a static build, so query parameters do not exist at render time
 * and a redirect back would land on a page that cannot show the outcome. The
 * first version of this did exactly that and silently swallowed every result.
 * Answering directly means the form works with JavaScript disabled, which is a
 * state a security-minded visitor is quite likely to be in.
 *
 * Storage is KV, bound as SUBSCRIBERS. Until that binding exists this endpoint
 * answers 503 and says so rather than accepting an address into nowhere. See
 * DEPLOY.md, "The email list", for the two minutes of dashboard it takes.
 *
 * A confirmation is sent when RESEND_API_KEY and MAIL_FROM are set, and not
 * otherwise. It is sent after the address is stored and its failure is never
 * the subscriber's problem: a mail provider having a bad afternoon must not
 * turn a saved address into an error message.
 *
 * This is a marketing list. It is not wallet linked, holds no permission state
 * and never touches the analysis path, so ADR 001 is untroubled by it.
 */

const MAX_BODY = 2048;

function page({ title, body, tone = 'ok', status = 200 }) {
  const accent = tone === 'bad' ? '#FF5F4E' : '#2FE0BC';
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Sfera Onchain</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;
       background:#05070A;color:#F2F6F9;
       font:400 17px/1.6 "Archivo",system-ui,-apple-system,sans-serif}
  main{max-width:46ch}
  p.k{margin:0 0 14px;font:700 10px/1 ui-monospace,SFMono-Regular,monospace;
      letter-spacing:.26em;text-transform:uppercase;color:${accent}}
  h1{margin:0 0 14px;font-size:30px;line-height:1.15;letter-spacing:-.03em}
  p.b{margin:0 0 28px;color:#7D93A4}
  a{display:inline-flex;padding:11px 20px;border-radius:999px;
    background:${accent};color:#05070A;text-decoration:none;
    font:700 11px/1 ui-monospace,SFMono-Regular,monospace;letter-spacing:.08em}
</style></head><body><main>
<p class="k">Sfera Onchain</p><h1>${title}</h1><p class="b">${body}</p>
<a href="/">Back to the site</a></main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
}

/* The ledger's modal posts JSON and stays on the page; the marketing form
   posts a form and navigates. One endpoint, one list, two ways in — a second
   endpoint would be a second place for the rules about an address to drift. */
function wantsJson(request) {
  return (request.headers.get('accept') || '').includes('application/json')
    || (request.headers.get('content-type') || '').includes('application/json');
}

const said = (ok, message, status) =>
  new Response(JSON.stringify({ ok, message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequestPost({ request, env }) {
  const json = wantsJson(request);
  const answer = (opts) => (json
    ? said(opts.tone !== 'bad', opts.body, opts.status ?? 200)
    : page(opts));

  if (Number(request.headers.get('content-length') || 0) > MAX_BODY) {
    return answer({ title: 'That was too large', body: 'Nothing was saved.', tone: 'bad', status: 413 });
  }

  let email = '';
  try {
    if (json) {
      const b = await request.json();
      email = String(b?.email || '').trim().toLowerCase();
    } else {
      const form = await request.formData();
      email = String(form.get('email') || '').trim().toLowerCase();
    }
  } catch {
    return answer({ title: 'That did not arrive cleanly', body: 'Nothing was saved. Try again?', tone: 'bad', status: 400 });
  }

  /* Deliberately permissive. Validation stricter than this rejects real
     addresses more often than it catches invented ones, and only a
     confirmation email proves an address exists at all. */
  if (!email || email.length > 254 || !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
    return answer({ title: 'That address did not look right', body: 'Nothing was saved. Have another go.', tone: 'bad', status: 400 });
  }

  if (!env.SUBSCRIBERS) {
    /* Fail visibly. Accepting an address into nowhere and thanking someone for
       it is worse than admitting the list is not wired up yet. */
    return answer({
      title: 'The list is not connected yet',
      body: 'Your address was not saved, and we would rather say so than pretend. Use the contact link instead.',
      tone: 'bad', status: 503,
    });
  }

  try {
    /* Keyed by address so a second signup overwrites rather than duplicates.
       No IP, no user agent, no referrer: we asked for an address, so an
       address is all we keep. */
    await env.SUBSCRIBERS.put(`sub:${email}`, JSON.stringify({ email, at: new Date().toISOString() }));
  } catch {
    return answer({ title: 'Something went wrong at our end', body: 'Your address was not saved.', tone: 'bad', status: 502 });
  }

  /* After the write, never before, and never in a way that can fail the
     request: the address is on the list either way, and the subscriber cannot
     do anything about our mail provider. */
  await confirm(email, env).catch(() => {});

  return answer({
    title: 'Noted.',
    body: 'We will write when there is something real to show, which will not be often.',
  });
}

/**
 * One email, saying what was recorded and how to undo it.
 *
 * Plain text. An HTML mail from a project whose argument is that you should be
 * able to see what you agreed to would be a small joke at its own expense, and
 * plain text is also what survives every client without a tracking pixel in it.
 */
async function confirm(email, env) {
  const key = env.RESEND_API_KEY;
  const from = env.MAIL_FROM;
  if (!key || !from) return;

  const reply = env.MAIL_REPLY_TO || from;
  const body = [
    'Your address is on the Sfera Onchain list.',
    '',
    'That is all it is on. It is not joined to a wallet and it is not sold.',
    'We will write when there is something real to show, which will not be often.',
    '',
    `To come off the list, reply to this message and say so: ${reply}`,
    '',
    'Sfera Onchain',
    'https://sferaonchain.xyz',
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      reply_to: reply,
      subject: 'You are on the list',
      text: body,
    }),
  });

  /* Logged, not surfaced. Someone should be able to find out that mail stopped
     working without a subscriber being the one to report it. */
  if (!res.ok) console.error('confirmation not sent', res.status, await res.text());
}

/** A GET here is someone poking at the URL, not a subscriber. */
export function onRequestGet() {
  return Response.redirect('/', 303);
}
