# Deploying sferaonchain.xyz

GitHub for the repo, Cloudflare Pages for the hosting, Cloudflare for the DNS.
Roughly forty minutes, most of it waiting for nameservers.

## What the domain looks like before you start

Checked 2026-08-28.

| | |
|---|---|
| Registrar | GoDaddy, registered 2026-08-27 |
| Nameservers | ns09 and ns10.domaincontrol.com |
| Serving | GoDaddy parking page |
| A records | 76.223.105.230 and 13.248.243.5, both parking |
| MX | none, no email on this domain |
| TXT at apex | none, no SPF and no verification records |
| CAA | none |
| www | CNAME to the apex |
| \_dmarc | GoDaddy's auto-added default |

Nothing here needs preserving except the DMARC record, and even that is a
default. There is no email to break. This is why the nameserver move is low risk.

The transfer locks you will see in whois are GoDaddy defaults. They block
registrar transfers, not nameserver changes made from your own dashboard.

## 1. The repo

`gh` is not installed on this machine, so the web path is written first. It needs
no install and takes about the same time.

**Check git knows who you are.** If either prints nothing, set it.

```
git config --global user.name
git config --global user.email
```

```
git config --global user.name "Leslie Khumalo"
git config --global user.email "you@example.com"
```

**Make the local repo.**

```
cd ~/sfera-onchain
git init -b main
git add .
git commit -m "Sfera Onchain homepage"
```

**Make the empty GitHub repo.** Go to github.com/new. Name it `sfera-onchain`.
Private, unless you would rather Batches reviewers can read the source, which makes
no difference to hosting. **Do not tick** add a README, a .gitignore or a licence.
The repo must be empty or the first push is rejected.

**Connect and push.** Copy your username into both lines.

```
git remote add origin https://github.com/YOUR_GH_USER/sfera-onchain.git
git push -u origin main
```

If it asks for a password, GitHub does not accept your account password here. Use a
personal access token from github.com/settings/tokens as the password, or install
`gh` below, which handles auth for you.

**Optional, the gh path instead.** If you would rather have the CLI, it is worth
having for the pull request flow later.

```
brew install gh
gh auth login
cd ~/sfera-onchain
git init -b main && git add . && git commit -m "Sfera Onchain homepage"
gh repo create sfera-onchain --private --source=. --remote=origin --push
```

## 2. The tester

On github.com, the repo, Settings, Collaborators, Add people, their username.
Choose **Write**, which lets them branch and open pull requests, and that is what
earns them a preview URL. Read is enough if you only want them looking.

With `gh` installed, the same thing:

```
gh api -X PUT repos/YOUR_GH_USER/sfera-onchain/collaborators/THEIR_GH_USER \
  -f permission=push
```

## 3. Cloudflare, the zone

Sign up at dash.cloudflare.com. Free plan, no card needed.

Use an address you and Blagoja can both reach. That account holds the DNS for the
company domain and you do not want it behind one personal inbox. There is no
email on sferaonchain.xyz yet, so it will have to be an outside address for now.

Add a site, `sferaonchain.xyz`, Free plan. Cloudflare scans the existing records
and imports them.

- **Delete** both A records. They point at the GoDaddy parking page.
- **Keep** the \_dmarc TXT record.

Cloudflare then shows you two nameservers, something like
`xxx.ns.cloudflare.com`. Copy them.

## 4. GoDaddy, the nameservers

GoDaddy, My Products, the domain, Nameservers, Change, "I'll use my own
nameservers". Paste the two Cloudflare ones. Save.

`.xyz` propagates quickly, usually minutes rather than hours. Cloudflare emails
you when the zone goes Active. Do not start step 5 before that.

## 5. Cloudflare Pages

Workers and Pages, Create, Pages, Connect to Git. Authorise GitHub, pick
`sfera-onchain`.

- Framework preset **Astro**
- Build command **`npm run build`**
- Build output directory **`dist`**

Cloudflare installs the dependencies and runs the build itself. Nothing is
committed from `node_modules/` or `dist/` — both are gitignored.

Save and Deploy. About twenty seconds. You get `sfera-onchain.pages.dev`.

From here every push to `main` goes live, and every branch and pull request gets
its own URL. That is the tester's environment and it needs no further setup.

**Working on it locally.**

```
npm install
npm run dev      # http://localhost:4321, live reload
npm run build    # writes dist/
npm run preview  # serve dist/ exactly as Cloudflare will
```

## 6. The domain on the site

In the Pages project, Custom domains, Set up a domain. Add both.

```
sferaonchain.xyz
www.sferaonchain.xyz
```

Because DNS is now at Cloudflare, it writes the records itself and CNAME
flattening makes the apex work. The certificate is issued automatically. Nothing
to buy and nothing to renew.

## 7. Two settings

In the zone, not the Pages project.

- SSL/TLS, **Always Use HTTPS**, on
- SSL/TLS, encryption mode, **Full (strict)**

Neither matters while Pages is the origin, because the origin is Cloudflare. Both
matter the moment you ever point this domain somewhere else, and setting them now
costs nothing.

Optional while you are in the DNS panel. The domain sends no mail, so these two
records stop anyone spoofing it.

```
TXT   @   v=spf1 -all
MX    @   .        priority 0
```

## 8. Check it worked

```
dig NS sferaonchain.xyz +short          # expect the Cloudflare pair
dig A  sferaonchain.xyz +short          # expect Cloudflare IPs, not 76.223.105.230
curl -sI https://sferaonchain.xyz | head -5
curl -s https://sferaonchain.xyz | grep -c 'og:url'
```

Then open it on a phone, not a narrow desktop window. A desktop window at 390px
wide is not a phone, because a phone is short before it is narrow, and the
short-phone tier is a container query on the visible height.

Paste the URL into X or into cards-dev.twitter.com/validator to see the link
preview.

## Making a change after launch

```
git switch -c some-change
# edit index.html
git commit -am "what changed"
git push -u origin some-change
```

Then open the pull request. Without `gh`, push prints a link that opens the PR form
for you, or go to the repo on github.com and use the Compare and pull request banner.
With `gh` installed it is `gh pr create --fill`.

The pull request gets its own preview URL. Test it there, on a real phone, then
merge. Merging to `main` publishes.

## Rolling back

Cloudflare Pages keeps every deployment. In the project, Deployments, find a good
one, Rollback. It is instant and does not need a git revert.

## Still outstanding

- No favicon. The tab shows a default globe.
- No `og:image`. The link preview is text only, using `twitter:card` set to
  `summary`, which renders a small card rather than a broken grey box.
- The homepage is the deck's closing frame standing alone. The rest of the deck's
  content belongs to the real design pass.
- The deck is linked as `/how-it-works.html`, with the extension. Cloudflare would
  also serve it at `/how-it-works`, but the Astro dev server will not, and a link
  that works in production and 404s locally is worse than a slightly longer URL.
- The checks panel in `how-it-works.html` opens on `pointerenter` only, so twenty
  six claims are unreachable on touch there. Unchanged, and it still matters for
  anyone who follows the link from the placeholder.
- `how-it-works.html` renders blank with JavaScript disabled. The homepage does not.
- No analytics. Cloudflare Web Analytics is free, needs no cookie banner, and is
  one script tag.
