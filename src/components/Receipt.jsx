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
 */
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
