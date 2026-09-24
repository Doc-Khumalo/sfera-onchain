# Email on sferaonchain.xyz

> **Not yet live.** This is the plan, not a record. Nothing below section 1 has
> been applied. Checked against Microsoft's, Resend's and Cloudflare's docs on
> 16 September 2026.

Microsoft 365 for the mailboxes, Resend for the mail the product sends itself.
Cloudflare keeps the DNS and nothing else.

| | Who does it | Where | Cost |
|---|---|---|---|
| **Mailboxes** — send and receive, both founders | Microsoft 365 | the apex, `sferaonchain.xyz` | ~$13/mo |
| **Transactional** — the list confirmation | Resend, already in the code | `updates.sferaonchain.xyz` | free tier |

**Cloudflare Email Routing is no longer part of this.** It was the free way to
receive mail without a mailbox, and paying for mailboxes removes the reason it
existed. A domain has one set of apex MX records and Microsoft needs them.

### What the money buys that the free path could not

Three problems that had no clean answer an hour ago, all gone:

- **Replying as the domain.** Email Routing could only forward, so every reply
  left as `leslie.khumalo@icloud.com` and handed a stranger your personal
  address. Now `hello@` is a real mailbox that sends.
- **Two of you on one address.** A routing rule maps one address to exactly one
  destination; reaching both inboxes needed an Email Worker. A shared mailbox
  does it natively, and both of you can send *as* it.
- **Mail on a phone.** Routing gave no IMAP, so there was nothing for a mail
  client to attach to. Exchange handles this and works in Apple Mail.

## 1. What the domain looks like before you start

Verified by `dig` on 15 September 2026.

| | |
|---|---|
| Nameservers | `saanvi`/`shane.ns.cloudflare.com` — Cloudflare DNS, unchanged by any of this |
| MX | none |
| TXT at apex | none, so no SPF |
| DKIM | none |
| `_dmarc` | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` |

**There is no mail to migrate and no cutover risk.** The domain has never had an
MX record, so nothing is running that this can break. That will not be true the
second time, so do it properly now.

The DMARC record is GoDaddy's leftover default, carried through the nameserver
move. It still ships aggregate reports to GoDaddy's collector for a domain
GoDaddy no longer serves. Section 5 replaces it.

**Do not apply the two optional records in `DEPLOY.md` §7.** That file suggests
`v=spf1 -all` and a null MX on the reasoning that the domain sends no mail. It is
obsolete twice over: a null MX declares the domain accepts no mail, and the
domain is about to do both. They were never applied. Leave it that way.

## 2. What to buy

**Microsoft 365 Business Basic, two seats** — one for you, one for Blagoja.

| | Per user, annual | Per user, monthly | Two seats, annual |
|---|---|---|---|
| Business Basic | $6.48/mo | $8.40/mo | **~$156/yr** |
| Business Standard | $12.95/mo | $16.80/mo | ~$311/yr |

US list prices, which changed on 1 July 2026; your region and currency will
differ. Annual commitment is roughly a 23% discount and worth taking for
something you are not going to cancel in March.

**Basic, not Standard.** The only difference that matters here is desktop Office
apps. Basic gives you Exchange mailboxes, Outlook on web and mobile, Teams and
1TB of OneDrive per user. Mail works in Apple Mail on the Mac and on the iPhone
regardless of tier. Buy Standard only if you want Word and Excel installed
locally, which is a separate decision from email.

**Do not buy seats for the role addresses.** This is the part people get wrong
and pay for annually. `hello@`, `security@`, `abuse@` and `dmarc@` become
**shared mailboxes**, which cost nothing: up to 50 GB each with no licence
assigned. You also get up to 200 aliases per user at no cost. Two seats is the
correct number no matter how many addresses you end up with.

## 3. The mailbox map

| Address | Type | Who gets it |
|---|---|---|
| `leslie@sferaonchain.xyz` | licensed mailbox | you |
| `blagoja@sferaonchain.xyz` | licensed mailbox | Blagoja |
| `hello@sferaonchain.xyz` | shared, free | both, with **Send As** |
| `security@sferaonchain.xyz` | shared, free | both, with **Send As** |
| `abuse@sferaonchain.xyz` | shared, free | both |
| `dmarc@sferaonchain.xyz` | shared, free | both; it is where section 5's reports land |

Grant **Send As** on `hello@` and `security@` explicitly — membership alone lets
you read, not answer as the address, and a reply that goes out as
`leslie@sferaonchain.xyz` from a thread addressed to `hello@` is the exact
problem this was bought to solve.

`dmarc@` exists so XML reports have somewhere to go that is not a person's inbox.
They are dull. The point is that a sudden volume of them means someone is
spoofing you.

No catch-all. Convenient for a week, a spam magnet forever, because the address
is public on the site and gets scraped. Use aliases for anything specific.

## 4. Creating the account and setting it up

The order matters in one place only: **MX last.** Microsoft's own guidance is to
create the mailboxes before you point MX at the tenant, because mail that arrives
for a user who does not exist yet bounces. Everything else can be done in any
order you like.

### 4a. Sign up

Go to microsoft.com, Microsoft 365 for business, and pick **Business Basic**.
The one-month free trial advertised on Microsoft's site is for Business
*Standard*; Basic is generally bought directly. If you take a trial, note that it
**converts to a paid subscription automatically** when the month is up — that is
the default, not a prompt.

You will need a card, and a business name, address and phone number.

Sign up with a personal address you already control — `leslie.khumalo@icloud.com`
is right — because at this moment there is no mailbox on the domain yet. It
becomes the account's contact address, not an address on the domain.

**The one irreversible decision in the whole process** comes here. Microsoft
assigns your tenant a default domain, `something.onmicrosoft.com`, and you choose
the `something`. It **cannot be renamed or deleted, ever**. It is a fallback
identity that stays in the background for the life of the tenant, SharePoint is
tied to it, and its name turns up inside the MX hostname you will paste into
Cloudflare in 4e.

Type **`sferaonchain`**. Not your name, not a variation, not a test value you
plan to fix later. People live with `contoso-test-2` for a decade because of this
screen.

### 4b. Add the domain

Admin centre, **Settings > Domains > Add domain**, enter `sferaonchain.xyz`.

Microsoft gives you a TXT record like `MS=msXXXXXXXX` to prove you own it. Add it
at the apex in the Cloudflare zone. It usually verifies within minutes on
Cloudflare DNS.

When it offers to add the remaining DNS records for you, **decline and choose to
add them yourself.** Its automated path does not apply to Cloudflare, and you
want MX held back until 4d is done anyway.

### 4c. Create the two users

**Users > Active users > Add a user**, twice. Assign a Business Basic licence to
each.

Accounts are created on `sferaonchain.onmicrosoft.com` first; once 4b has
verified, edit each username so the domain part reads `@sferaonchain.xyz`. You
want `leslie@sferaonchain.xyz` and `blagoja@sferaonchain.xyz`.

**Keep the original `admin@sferaonchain.onmicrosoft.com` account, and write its
password down somewhere that is not this repo.** It is your way back in if the
custom domain's DNS is ever broken or misconfigured — including by you, during
4e. Signing in through `onmicrosoft.com` does not depend on the Cloudflare zone
being correct. This costs nothing and is the difference between a bad afternoon
and a support ticket.

### 4d. Create the shared mailboxes

Admin centre, **Teams & groups > Shared mailboxes > Add a shared mailbox**, once
each for `hello@`, `security@`, `abuse@` and `dmarc@`. Assign **no licence** —
they are free up to 50 GB, and assigning one is how people quietly start paying
for six seats instead of two.

Add both of you as members. Then, on `hello@` and `security@`, grant **Send As**
explicitly. Read and Send As are separate permissions and membership alone gives
only the first. Section 7 has a check for this because it is the one setting that,
if missed, leaves you exactly where the free plan had you.

### 4e. The DNS records

Now the rest, all in the Cloudflare zone. Microsoft generates these **with values
specific to your tenant** — use what the admin centre shows you, not what is
written here. The MX hostname contains your tenant name and is not guessable.

| Type | Name | Points at |
|---|---|---|
| MX | `@` | `<tenant>.mail.protection.outlook.com`, priority 0 |
| TXT | `@` | `v=spf1 include:spf.protection.outlook.com -all` |
| CNAME | `autodiscover` | `autodiscover.outlook.com` |
| CNAME | `selector1._domainkey` | Microsoft's DKIM endpoint for your tenant |
| CNAME | `selector2._domainkey` | the second DKIM endpoint |

Microsoft publishes a Cloudflare-specific walkthrough. Follow that one rather
than a generic guide, because of this:

**Every CNAME above must be DNS-only — grey cloud, not proxied.** Microsoft
states it plainly for the DKIM records: with the proxy on, lookups return
Cloudflare's IP addresses instead of the CNAME target and DKIM verification
fails. It fails silently and looks like Microsoft being slow. Expect to hit this
at least once; section 7's `dig` checks catch it.

Skip the Teams `sip` and `lyncdiscover` CNAMEs and the SRV records unless you
intend to use Teams for calls. They are not needed for mail.

### 4f. Turn DKIM on

Adding the CNAMEs does not enable signing. Once they resolve, enable DKIM for
`sferaonchain.xyz` in the Defender portal. It stays off until you throw that
switch, and mail sent before you do is unsigned.

## 5. Replacing the DMARC record

Edit the existing `_dmarc` TXT record rather than adding a second. Two DMARC
records on one name is a configuration error and receivers treat the domain as
having none at all.

**Start here**, the same day you cut MX over:

```
TXT   _dmarc   v=DMARC1; p=none; rua=mailto:dmarc@sferaonchain.xyz;
```

`p=none` monitors without enforcing. There are now **two** senders to get aligned
— Microsoft on the apex and Resend on the subdomain — and tightening before both
are confirmed means silently rejecting your own mail.

**Then tighten**, once reports at `dmarc@` show both passing for a week or two:

```
TXT   _dmarc   v=DMARC1; p=reject; rua=mailto:dmarc@sferaonchain.xyz;
```

Leave alignment relaxed, which is the default. The Resend mail's From domain and
signing domain differ by a subdomain, and strict alignment is the kind of thing
that breaks mail six months later for reasons nobody remembers.

## 6. Resend, unchanged

This half is unaffected by the Microsoft decision and still needs doing —
`functions/api/subscribe.js` calls the Resend API to confirm list signups, and
fails quietly when unconfigured, which is why nobody has noticed.

Add the domain in Resend as **`updates.sferaonchain.xyz`** — the subdomain, not
the root. Resend's own guidance is to verify a subdomain both for reputation
separation and **to avoid conflicts with existing MX records**, and the apex MX
now belongs to Microsoft. Copy the records it shows exactly; the set varies with
when the domain was added, and newer ones may be CNAMEs where older ones are TXT
and MX. **Grey cloud on any CNAME**, for the same reason as section 4.

Then three Pages environment variables, `RESEND_API_KEY` marked **encrypted**:

```
RESEND_API_KEY   <the key from Resend>
MAIL_FROM        Sfera Onchain <hello@updates.sferaonchain.xyz>
MAIL_REPLY_TO    hello@sferaonchain.xyz
```

`MAIL_FROM` must be on the verified **subdomain**. `MAIL_REPLY_TO` is the apex
shared mailbox, so when a subscriber replies to come off the list — which the
mail body tells them to do — it lands somewhere both of you can see. The code
reads `env.MAIL_REPLY_TO || from`, so leaving it unset sends unsubscribe requests
into the sending subdomain, where nothing is listening.

Redeploy after setting them.

## 7. Check it worked

```
dig MX sferaonchain.xyz +short                        # <tenant>.mail.protection.outlook.com
dig TXT sferaonchain.xyz +short                       # spf.protection.outlook.com
dig CNAME autodiscover.sferaonchain.xyz +short
dig CNAME selector1._domainkey.sferaonchain.xyz +short # a Microsoft host, NOT a Cloudflare IP
dig TXT _dmarc.sferaonchain.xyz +short                # yours, not onsecureserver.net
dig MX updates.sferaonchain.xyz +short                # Resend's
```

A Cloudflare IP where a Microsoft hostname belongs means the record is proxied.
Grey cloud it and re-check.

Then the things `dig` cannot tell you:

- Send to each of the six addresses from outside and confirm delivery.
- **Reply from `hello@` and check the From address on what arrives.** If it says
  `leslie@`, Send As is not granted and the main thing you paid for is not on.
- Send from `hello@` to a Gmail address, then in Gmail use Show original to
  confirm SPF, DKIM and DMARC all pass.
- Subscribe on the live site with a real address, confirm the mail arrives, and
  confirm replying to it reaches `hello@`.

## Gotchas, so they are not hit twice

- **Proxied CNAMEs break both Microsoft DKIM and Resend verification.** Grey
  cloud, always. Expect to hit this at least once.
- **Adding DKIM records does not enable DKIM.** It is a separate switch.
- **Send As is not the same as shared mailbox access.** Grant it explicitly.
- **Only one SPF record per domain.** One TXT at the apex, not two — if you ever
  add a third sender, merge the includes into the single record and mind the
  ten-lookup limit.
- **Shared mailboxes are free up to 50 GB**, and need an Exchange Online Plan 2
  licence beyond that. Not a concern at this scale, but it is the trap that turns
  a free mailbox into a billed one years later.
- **Confirmation failures are swallowed by design.** `subscribe.js` logs and
  moves on, so a Resend outage looks like nothing at all. `wrangler pages
  deployment tail` is where mail problems surface.

## Outstanding

- `src/data/site.js` exports `CONTACT` as a LinkedIn URL, used in six places
  across `Header.jsx`, `Developers.jsx`, `Ask.jsx`, `alt.astro` and `demo.astro`,
  plus `SiteHeader.astro`. Switching it to `mailto:hello@sferaonchain.xyz` also
  means dropping `target="_blank" rel="noopener"` at each call site, which is
  meaningless on a `mailto:`. **Do this only after section 7 passes.** A
  published address that bounces is worse than a LinkedIn link.
- The subscriber KV binding is still unbound, so signups are refused before the
  mail path is reached at all. See `DEPLOY.md`, "The email list". Resend can be
  perfectly configured and still send nothing until this is done.
