# Email on sferaonchain.xyz

> **Not yet live.** This is the plan and the reference, not a record. Nothing in
> section 2 onward has been applied. Checked against Cloudflare's docs on
> 15 September 2026.

Cloudflare Email Routing, on the zone that already holds the DNS. Free, no
mailbox to pay for, and set up in the dashboard you already have open for Pages.

## 1. What the domain looks like before you start

Verified by `dig` on 15 September 2026.

| | |
|---|---|
| Nameservers | `saanvi`/`shane.ns.cloudflare.com` — full Cloudflare DNS, which Email Routing requires |
| MX | none |
| TXT at apex | none, so no SPF |
| DKIM | none |
| `_dmarc` | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` |

The DMARC record is GoDaddy's leftover default, carried through the nameserver
move. It still ships your aggregate reports to GoDaddy's collector on a domain
GoDaddy no longer serves. Section 5 replaces it.

**Do not apply the two optional records in `DEPLOY.md` §7.** That file suggests
`v=spf1 -all` and a null MX to stop spoofing, on the reasoning that the domain
sends no mail. That reasoning expires the moment this document is carried out —
a null MX means "this domain accepts no mail", which is the opposite of what
Email Routing needs. They were never applied. Leave it that way.

## 2. The catch, before you spend forty minutes on it

**Email Routing receives. It cannot send.** Cloudflare states it plainly:

> Email Routing does not support sending or replying from your Cloudflare domain.

So `hello@sferaonchain.xyz` on the site collects mail perfectly, and the moment
you hit reply the message leaves as `leslie.khumalo@icloud.com`. The person who
wrote to the company address learns your personal one, and the thread moves
there permanently. For a contact address on a landing page that is often an
acceptable trade. For anything that looks like sales correspondence it is not.

Two ways out, both later and neither blocking:

- **Cloudflare Email Sending**, a separate product on the same zone, gives you
  SMTP at `smtp.mx.cloudflare.net` and its own `cf-bounce` records. Pair it with
  Apple Mail's "send as" and replies go out correctly. Cheapest fix that keeps
  everything in one dashboard.
- **iCloud+ custom domain** replaces Email Routing outright. Apple's MX records,
  send and receive in the Mail app you already use, about a dollar a month.
  Cleaner, but it is a swap, not an addition — a domain has one set of MX records.

## 3. Addresses

Three role addresses at the apex.

| Address | Goes to | Why |
|---|---|---|
| `hello@sferaonchain.xyz` | your iCloud inbox | the public contact address, replacing the LinkedIn link |
| `security@sferaonchain.xyz` | your iCloud inbox | where someone reports a vulnerability instead of tweeting it |
| `abuse@sferaonchain.xyz` | your iCloud inbox | the RFC 2142 role address; registrars and hosts expect it to exist |

No catch-all. A catch-all is convenient for a week and a spam magnet forever,
because the domain is public on the site and gets scraped. If you want
per-signup addresses, turn on **subaddressing** in Email Routing settings and
use `hello+stripe@` — it matches the `hello@` rule with no new rule needed.

### The subdomains, and a question about them

`updates.` and `sales.` work. Cloudflare added subdomain support to Email
Routing, up to 30 domains per zone counting the apex, configured from the apex
domain's Email Routing settings rather than as separate zones.

But it is worth saying what they will and will not do here, because the shape of
the request suggests the other product. Subdomains like `updates.` and `sales.`
are conventionally used to **segregate outbound sending reputation** — so that a
bulk product-update blast that earns spam complaints cannot damage the
deliverability of mail from the apex. That is a sending concern, and Email
Routing does not send. Under Email Routing, `sales@sales.sferaonchain.xyz` is
simply a longer, harder-to-say address that forwards to the same inbox as
`hello@` would.

If the goal is **receiving** departmental mail, you want `sales@sferaonchain.xyz`
at the apex — one rule, no subdomain, shorter on a business card. If the goal is
**sending** newsletters from a reputation-isolated subdomain, that is Cloudflare
Email Sending or a provider like Resend, and it is a different setup that this
document does not cover. Say which and I will write the missing half.

Section 6 sets up the subdomains as asked. Skip it if the above changes your mind.

## 4. Turning it on

Cloudflare dashboard, the `sferaonchain.xyz` zone, **Compute > Email Service >
Email Routing**. The dashboard moved this under Email Service when Routing and
Sending were merged; if you are following an older tutorial that says "Email" in
the sidebar, this is the same thing.

**Verify the destination first.** Add `leslie.khumalo@icloud.com` as a
destination address. Apple sends a confirmation mail; click the link in it.
Rules pointing at an unverified destination silently fail, and this is the step
people skip.

**Enable Email Routing.** Cloudflare writes these records itself:

| Type | Name | Value |
|---|---|---|
| MX | `@` | three hostnames under `*.mx.cloudflare.net`, priorities assigned automatically |
| TXT | `@` | `v=spf1 include:_spf.mx.cloudflare.net ~all` |
| TXT | `cf2024-1._domainkey` | Cloudflare's DKIM public key |

The MX hostnames are randomised per zone — you will get three first names, not
literally `route1/2/3`. These records are **locked** after onboarding and cannot
be edited from DNS > Records until you unlock them. That is a feature. Do not
unlock them to tidy them up.

**Add the three rules**, each a custom address forwarding to the verified
destination. Two warnings from the docs worth carrying: duplicate patterns are
silently hazardous, because only the rule listed first processes mail; and `.`
is a normal character in a pattern, so there is no Gmail-style dot-collapsing.

## 5. Replacing the DMARC record

Edit the existing `_dmarc` TXT record rather than adding a second one. Two DMARC
records on a name is a configuration error and receivers treat the domain as
having none at all.

```
TXT   _dmarc   v=DMARC1; p=reject; rua=mailto:dmarc@sferaonchain.xyz; aspf=s; adkim=s;
```

`p=reject` rather than GoDaddy's `p=quarantine`, because nothing legitimately
sends mail as this domain — forwarding is not sending — so every message
claiming to be from it is forged and should be refused outright rather than
dropped in a junk folder where someone might fish it out. Strict alignment for
the same reason: there is no subdomain or third-party sender to be lenient
toward yet. The reports now come to you, via a fourth routing rule for
`dmarc@`, instead of to GoDaddy. They arrive as XML attachments and are dull;
the point is that a sudden volume of them means someone is spoofing you.

**If you later add Email Sending or iCloud+, revisit this record first.**
`p=reject` with strict alignment will reject your own mail until the new
sender's SPF include and DKIM selector are in place.

## 6. The subdomains, if you still want them

Email Routing, the `sferaonchain.xyz` domain, **Settings**, the **Subdomains**
form. Add `updates.sferaonchain.xyz` and `sales.sferaonchain.xyz`. Cloudflare
adds the required DNS records to each subdomain. Once they propagate, create
routing rules on the subdomain exactly as on the apex.

The docs say nothing about nested subdomains or wildcards. Assume neither works.

## 7. Check it worked

```
dig MX sferaonchain.xyz +short              # three *.mx.cloudflare.net hostnames
dig TXT sferaonchain.xyz +short             # the _spf.mx.cloudflare.net include
dig TXT cf2024-1._domainkey.sferaonchain.xyz +short
dig TXT _dmarc.sferaonchain.xyz +short      # yours, not onsecureserver.net
dig MX updates.sferaonchain.xyz +short      # only if section 6 was done
```

Then send a real message to each address from an account that is not the
destination, and confirm it lands. Mail to an address with no matching rule is
rejected, not delivered, so a typo in a rule looks identical to the feature
being broken.

## Limits worth knowing before you build on it

| | |
|---|---|
| Routing rules per domain | 200 |
| Destination addresses per account | 200, shared across every domain |
| Domains per zone | 30, apex included |
| Inbound message size | 25 MiB, larger is rejected |

## Gotchas, so they are not hit twice

- **A verified destination is not optional.** Rules to an unverified address fail
  without an obvious error.
- **Cloudflare rejects unauthenticated inbound mail.** A message must pass SPF or
  carry a valid DKIM signature, and is rejected if it fails the sender's own
  DMARC policy. Legitimate mail from badly configured small senders will
  occasionally bounce, and that is Cloudflare's decision, not yours to tune.
- **Non-delivery reports are not forwarded to the original sender.** If something
  is rejected, the person who wrote to you may learn nothing about it.
- **A sender's restrictive DMARC policy can still break forwarding**, which
  Cloudflare lists as a known limitation despite SRS and ARC being in use.
- **Internationalised local parts are unsupported.** The domain side may be
  non-ASCII; the part before the `@` may not.
- **Mail sent from a Worker shows as "dropped" in the summary** even when it was
  delivered. Only relevant if you ever add an auto-responder.

## Outstanding

- `src/data/site.js` still exports `CONTACT` as a LinkedIn URL, used in six
  places across `Header.jsx`, `Developers.jsx`, `Ask.jsx`, `alt.astro` and
  `demo.astro`. Switching it to `mailto:hello@sferaonchain.xyz` also means
  dropping `target="_blank" rel="noopener"` at each call site, which is
  meaningless on a `mailto:`. **Do this only after section 7 passes.** A
  published address that bounces is worse than a LinkedIn link.
- Sending as the domain is unsolved by design. See section 2.
