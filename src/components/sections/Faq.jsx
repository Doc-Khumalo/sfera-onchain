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
        a: `The analysis path has no database at all. ADR 001 keeps it
            stateless: signed, short-lived envelopes carry all the context a
            decision needs, which removes backups, migrations and recovery from
            the picture. Persistence arrives with the permission dashboard, not
            before.`,
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
            commoditise standalone ones. Distribution is integrations - an SDK,
            a decision API and a widget - rather than installs. The extension
            stays in the deferred register until integrations alone stop
            providing reach.`,
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
            actually required, and attaches an expiry where there was none.
            Most standing permissions want limiting rather than deleting, which
            is why the default is not simply to remove everything.`,
      },
      {
        q: 'Which chains do you read?',
        a: `Fifteen EVM chains. The domain model is chain-independent by
            design - Base is the first implementation environment, not the
            product definition - so adding a chain touches the state reader and
            configuration and nothing else.`,
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
            starve the integrations the paid layer depends on. Pro is $6.99 a
            month and Family $12.99; the revenue is in the developer tiers.`,
      },
      {
        q: 'Can I use it today?',
        a: `Not yet - we are pre-release. The MVP ships on 14 January 2027 and
            runs on Base Sepolia first. If you are building something that asks
            users for standing authority, that is exactly when we want to
            talk.`,
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
