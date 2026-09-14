/**
 * The Access Receipt. Structure and copy from UX Specification §21-25, §38.
 * The requested value rewrites itself on a loop — pure CSS.
 */
export default function Receipt() {
  return (
    <article className="receipt">
      <header className="r-head">
        <span className="r-title">Access receipt</span>
        <span className="r-sub">Example · illustrative figures</span>
      </header>

      <div className="r-body">
        <dl>
          <div className="row lead">
            <dt>Your action</dt>
            <dd>100 USDC</dd>
          </div>

          <div className="row lead swap">
            <dt>App request</dt>
            <dd>
              <span className="was">Unlimited</span>
              <span className="now">100 USDC</span>
            </dd>
          </div>

          <p className="r-rule">What this exposes</p>

          <div className="row exp">
            <dt>Current USDC accessible</dt>
            <dd><span className="was">8,420 USDC</span><span className="now">100 USDC</span></dd>
          </div>
          <div className="row exp">
            <dt>Future deposits</dt>
            <dd><span className="was">Exposed</span><span className="now">Not exposed</span></dd>
          </div>
          <div className="row exp">
            <dt>Access ends</dt>
            <dd><span className="was">Never</span><span className="now">On use</span></dd>
          </div>
        </dl>
      </div>

      <footer className="r-foot">
        <span>Recommendation</span>
        <span>Limit access to the 100 USDC needed for this action.</span>
      </footer>
    </article>
  );
}
