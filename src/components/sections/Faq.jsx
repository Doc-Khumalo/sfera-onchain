/**
 * Questions the documents already answer.
 *
 * Every answer here is taken from the specification set, the delivery board or
 * ADR 001 — nothing is drafted to sound reassuring. Two of them exist
 * specifically to say what the product CANNOT do, because a security product
 * that only advertises its strengths is training people to trust the wrong
 * thing:
 *
 *   - approvals cannot be enumerated from chain state, only asked about, so
 *     coverage is a registry and not a guarantee
 *   - the MetaMask Snap is read-only and can never be the control plane
 *
 * <details> gives a real accordion with no JavaScript. The first is open so
 * the section reads as answers rather than a wall of closed rows.
 *
 * Grouped, because nine flat rows is a wall whatever the copy says, and the
 * groups are the honest division of what a reader is actually worried about:
 * what we touch, what we cannot do, how it works, and whether they can have
 * it. "What it cannot do" is deliberately second rather than buried last.
 */
const GROUPS = [
  {
    group: 'What we touch',
    items: [
      {
        q: 'Do you hold my keys, or sign anything for me?',
        a: `No. Every correction is an unsigned transaction handed to your own
            wallet, and your wallet still has to confirm it. We never sign and
            we never hold a key.`,
      },
      {
        q: 'Do you store my wallet history?',
        a: `Only if you sign in. Reading a wallet keeps nothing about it: the
            read is worked out and handed back. Signed in, we keep your reads so
            alerts can compare one with the next, and deleting your account
            deletes them. The demo page may log which address it was asked to
            read, and nothing else.`,
      },
    ],
  },
  {
    group: 'What it cannot do',
    items: [
      {
        q: 'Can you show me everything my wallet has ever approved?',
        a: `No, and neither can anyone else. Approvals cannot be enumerated
            from chain state - they can only be asked about, one asset and one
            spender at a time. We ask about a registry of major assets and
            known applications on each chain, derived from live Approval logs
            and then verified on chain. Anything outside that registry will not
            appear, and we say so rather than rendering an empty result as a
            clean wallet.`,
      },
      {
        q: 'Is the MetaMask Snap the thing doing the work?',
        a: `No. MetaMask transaction insight is read-only: it can show the
            analysis inside the confirmation, but it cannot rewrite the
            request. The Snap is a second display surface, not the mechanism.`,
      },
      {
        q: 'Why not ship a browser extension?',
        a: `Asking a mainstream user to discover, trust and install a new
            security extension is high friction, and wallet-native features
            commoditise standalone ones. So we live in the wallet you already
            use, as a MetaMask Snap, and next to it on the dashboard. The
            engine underneath is built to be integrated, and we talk to wallets
            and apps about that directly.`,
      },
    ],
  },
  {
    group: 'How it works',
    items: [
      {
        q: 'What is the difference between limiting and revoking?',
        a: `Revoking removes authority that nothing needs any more. Limiting
            cuts authority something still needs down to the amount the action
            actually required, and nothing more.
            Most standing permissions want limiting rather than deleting, which
            is why the default is not simply to remove everything.`,
      },
      {
        q: 'Which chains do you read?',
        a: `All available chains on the dashboard, every one read the same way
            at once. On each, we ask about the major tokens and the apps known
            to use them, so a token or app outside that list will not show, and
            we say so. Adding a chain touches the state reader and configuration
            and nothing else.`,
      },
    ],
  },
  {
    group: 'Getting it',
    items: [
      {
        q: 'What will it cost?',
        a: `Basic protection is free and stays free on purpose. Paywalling the
            sentence “this application can take everything” would sell fear and
            starve the integrations a paid layer would depend on. Reading a
            wallet and fixing what you find are free. Nothing is for sale yet.`,
      },
      {
        q: 'Can I use it today?',
        a: `Yes. It runs on mainnet today. Add Sfera Onchain to MetaMask, or
            read any wallet on the dashboard. If you are building something that
            asks users for standing authority, we want to talk.`,
      },
    ],
  },
];

export default function Faq({ contact }) {
  let n = 0;
  return (
    <section className="faq reveal" id="faq">
      {/* Sticky, because the column was three lines of type above a screen and
          a half of nothing while the answers scrolled past beside it. */}
      <div className="faq-head">
        <h2>Questions.</h2>
        <p className="lede">
          Including the two we are asked least and should be asked most: what
          this cannot see, and what it cannot do.
        </p>
        {contact && (
          <p className="faq-ask">
            Not here?{' '}
            <a href={contact} target="_blank" rel="noopener">Ask us directly</a>
          </p>
        )}
      </div>

      <div className="faq-list">
        {GROUPS.map(({ group, items }) => (
          <section className="faq-group" key={group}>
            <h3>{group}</h3>
            {items.map(({ q, a }) => {
              const first = n++ === 0;
              return (
                <details key={q} open={first}>
                  <summary>
                    <span>{q}</span>
                    <span className="faq-mark" aria-hidden="true" />
                  </summary>
                  <p>{a}</p>
                </details>
              );
            })}
          </section>
        ))}
      </div>
    </section>
  );
}
