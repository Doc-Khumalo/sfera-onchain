/**
 * The Access Receipt, printed on paper.
 *
 * Lifted from the nine-step deck in public/how-it-works.html, which is where
 * this object was first drawn: cream stock on a dark ground, torn top and
 * bottom, leader dots between term and figure, a stamp colour that turns from
 * the problem to the correction. It is the one thing on this site that is not
 * another dark card, and it is what makes a page about calldata read as a
 * document rather than a dashboard.
 *
 * It rewrites itself on a loop. The requested value is struck by a line that
 * travels across it, the corrected value rises underneath, and the exposure
 * rows follow the headline rather than arriving with it, because the
 * consequences follow the cause.
 *
 * Copy is UX Specification §21-25 and §38.
 *
 * Pure CSS. The homepage ships no JavaScript.
 *
 * TWO MODES, ONE OBJECT.
 *
 * With no props it is the depiction above: example figures on a 9s loop, the
 * request struck and the correction rising under it, shipping no JavaScript.
 *
 * Given a permission it prints that permission, and the loop stops — there is
 * nothing to animate towards, because nothing has been corrected yet. It also
 * drops the "Your action" row, and that omission is the point: the ledger
 * reads standing authority with no intent to compare it against, so a line
 * claiming to know what you set out to do would be invented. The receipt says
 * what the chain says and stops there.
 *
 * When a correction does settle, `was` carries the previous reading and the
 * swap runs for real, once, on values that actually changed.
 */

/* The reading, in the receipt's own two-colour vocabulary: the stamp for
   authority that is unbounded or wider than its balance, the seal for
   authority that is bounded, spent or gone. */
const SEALED = new Set(['BOUNDED', 'REMOVED', 'EXPIRED']);

/**
 * `perm` may be absent. It is absent before anything has been read, when a
 * read failed, and when a read found nothing — three different facts that
 * share one shape, and the receipt prints all three rather than handing the
 * screen to a card with a bare zero on it. Every figure reads 0 or "Not
 * established", because that is what is known.
 */
export function PermissionReceipt({ perm, was, allowance, reachable, expires, action, state }) {
  const sealed = perm ? SEALED.has(perm.reading) : false;
  /* Compared by key. `granted` is a Capacity, so `!==` on it would compare
     object identity — never equal, so every render would claim a change. */
  const changed = perm && was && was.grantedKey !== perm.grantedKey;

  return (
    <article className={`perm perm-live${perm ? (sealed ? ' perm-sealed' : ' perm-stamped') : ' perm-blank'}`}>
      <header className="rhead">
        <span className="rt">Access receipt</span>
        <span className="rs">
          <span className={`rs-live ${perm ? (sealed ? 'rs-sealed' : 'rs-stamped') : 'rs-none'}`}>
            {perm ? perm.readingLabel : state}
          </span>
        </span>
      </header>

      <div className="rbody">
        <dl>
          {/* No "Your action". Nothing was asked for here, so there is
              nothing to hold the request against — see the note above.
              A plain row, not a lead one: the lead treatment sets its value at
              19px over a label built for a short figure, and an application's
              name is not short. */}
          <div className="prow">
            <dt>Application</dt>
            <dd>{perm ? (perm.label || 'Unverified spender') : '—'}</dd>
          </div>

          <div className="prow lead">
            <dt>App request</dt>
            <dd>
              {changed ? (
                <>
                  <span className="was-value">{was.shown}</span>
                  <span className="now-value">{allowance}</span>
                </>
              ) : allowance}
            </dd>
          </div>

          <p className="rrule">What this exposes</p>

          <div className="prow"><dt>Reachable now</dt><dd>{reachable}</dd></div>
          <div className="prow">
            <dt>Future deposits</dt>
            {/* Three values, not two. `futureExposed` is nullable on the
                wire so that "no future exposure" and "we could not tell" are
                not the same answer, and printing the second as the first is
                the receipt saying something the chain did not. */}
            <dd>{perm?.futureExposed == null ? 'Not established' : perm.futureExposed ? 'Exposed' : 'Not exposed'}</dd>
          </div>
          <div className="prow"><dt>Access ends</dt><dd>{expires}</dd></div>
        </dl>
      </div>

      <footer className="rfoot">
        <span>Read from the chain · nothing signed</span>
        {action && <span>{action}</span>}
      </footer>
    </article>
  );
}

export default function Receipt() {
  return (
    <article className="perm" aria-hidden="true">
      <header className="rhead">
        <span className="rt">Access receipt</span>
        <span className="rs">
          <span className="rs-a">Unbounded</span>
          <span className="rs-b">Corrected</span>
        </span>
      </header>

      <div className="rbody">
        <dl>
          <div className="prow lead">
            <dt>Your action</dt>
            <dd className="fixed">100 USDC</dd>
          </div>

          <div className="prow lead swap">
            <dt>App request</dt>
            <dd>
              <span className="was">Unlimited</span>
              <span className="now">100 USDC</span>
            </dd>
          </div>

          <p className="rrule">What this exposes</p>

          <div className="prow exp exp-1">
            <dt>Reachable now</dt>
            <dd><span className="was">8,420 USDC</span><span className="now">100 USDC</span></dd>
          </div>
          <div className="prow exp exp-2">
            <dt>Future deposits</dt>
            <dd><span className="was">Exposed</span><span className="now">Not exposed</span></dd>
          </div>
          <div className="prow exp exp-3">
            <dt>Access ends</dt>
            <dd><span className="was">Never</span><span className="now">On use</span></dd>
          </div>
        </dl>
      </div>

      <footer className="rfoot">
        <span>Unsigned · your wallet signs it</span>
        <span>
          <span className="was">Limit access to 100 USDC</span>
          <span className="now">Limited to 100 USDC</span>
        </span>
      </footer>
    </article>
  );
}
