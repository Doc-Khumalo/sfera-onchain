/**
 * The wallet shows one button. UX Specification §5 — this comparison is the
 * most important relationship on the page.
 */
export default function Demonstration() {
  return (
    <section className="problem reveal" id="problem">
      <h2>Your wallet shows you one button.</h2>
      <p className="lede center">
        Paying an application and handing it reusable authority over everything
        you own look identical at the moment you sign.
      </p>

      <div className="prompt-pair">
        <figure className="prompt">
          <figcaption>What the wallet shows</figcaption>
          <div className="p-body">
            <p className="p-app">app.example.xyz</p>
            <p className="p-ask">Allow access to USDC?</p>
            <div className="p-actions">
              <span className="p-no">Reject</span>
              <span className="p-yes">Approve</span>
            </div>
          </div>
        </figure>

        <figure className="prompt real">
          <figcaption>What it actually grants</figcaption>
          <div className="p-body">
            <dl>
              <div className="row"><dt>Amount</dt><dd>Unlimited</dd></div>
              <div className="row"><dt>Reusable</dt><dd>Yes</dd></div>
              <div className="row"><dt>Future deposits</dt><dd>Reachable</dd></div>
              <div className="row"><dt>Expires</dt><dd>Never</dd></div>
              <div className="row"><dt>Exposure now</dt><dd>8,420 USDC</dd></div>
            </dl>
          </div>
        </figure>
      </div>
    </section>
  );
}
