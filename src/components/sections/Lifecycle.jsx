/**
 * The half of Control that happens after signing.
 *
 * Authority Graph questions from Master Product Strategy §29. Lifecycle
 * events and alert copy from the Retention Plan §12 and §13.1.
 */
export default function Lifecycle() {
  return (
    <section className="life reveal" id="lifecycle">
      <div className="col-type">
        <h2>Signing isn't the end.</h2>
        <p className="lede">
          Disconnecting an application does not remove what it can already do.
        </p>

        <p className="block-label lift">What we tell you, and when</p>
        <ul className="alerts">
          <li>The action completed, but access remains active.</li>
          <li>This application&rsquo;s access expires tomorrow.</li>
          <li>A permission was used. Here is what remains.</li>
          <li className="critical">An unrestricted administrator was added.</li>
          <li className="critical">Account delegation changed.</li>
        </ul>
      </div>

      <div className="graph">
        <p className="graph-title">The authority graph</p>
        <dl>
          <div className="row">
            <dt>Who can act</dt>
            <dd>ExampleSwap</dd>
          </div>
          <div className="row">
            <dt>On what</dt>
            <dd>USDC</dd>
          </div>
          <div className="row">
            <dt>Under what constraints</dt>
            <dd>100 / day</dd>
          </div>
          <div className="row">
            <dt>Until when</dt>
            <dd>Friday</dd>
          </div>
          <div className="row">
            <dt>Through which mechanism</dt>
            <dd>Spend permission</dd>
          </div>
        </dl>
        <p className="graph-note">
          One view of every application, actor and session with authority over
          the account: what it can reach, and how to end it.
        </p>
      </div>
    </section>
  );
}
