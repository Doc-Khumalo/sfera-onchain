/**
 * What the product does, each claim shown rather than asserted.
 *
 * Alternating rows, a panel on one side and the claim on the other. Every
 * panel is the real interface in a real state, not an illustration of one,
 * and each animates through the state change its claim is about — because a
 * static picture of a dashboard proves nothing that a sentence could not.
 *
 * Pure CSS on a loop. The homepage ships no JavaScript and that is worth
 * more than any of this.
 */
export default function Capabilities() {
  return (
    <section className="caps reveal field" id="capabilities">
      <h2>What it actually does.</h2>

      <div className="cap-row">
        <div className="cap-panel lit-strong">
          <div className="cp-head">
            <span>Live permissions</span>
            <span className="cp-chip">Base</span>
          </div>
          {[
            { t: 'USDC', c: '#2775CA', app: 'Permit2', d: 0 },
            { t: 'WETH', c: '#627EEA', app: 'Permit2', d: 1.4 },
            { t: 'USDT', c: '#26A17B', app: 'Uniswap', d: 2.8 },
          ].map(({ t, c, app, d }) => (
            <div className="cp-row" key={t} style={{ '--d': `${d}s` }}>
              <span className="cp-tok" style={{ background: c }}>{t}</span>
              <span className="cp-app">{app}</span>
              <span className="cp-state">
                <span className="cp-was">Unlimited</span>
                <span className="cp-now">Removed</span>
              </span>
            </div>
          ))}
        </div>

        <div className="cap-copy">
          <h3>Read every standing permission</h3>
          <p>
            Fifteen chains, asked directly and batched into one request. What we
            did not ask about is named on the page rather than implied away.
          </p>
        </div>
      </div>

      <div className="cap-row reverse">
        <div className="cap-copy">
          <h3>Correct it without holding a key</h3>
          <p>
            The engine builds an unsigned transaction and stops. Your wallet
            asks you to sign it, and we never see anything that could sign for
            you.
          </p>
        </div>

        <div className="cap-panel lit-strong">
          <div className="cp-head">
            <span>Ready for your wallet</span>
            <span className="cp-chip cp-chip-ok">Unsigned</span>
          </div>
          <div className="cp-body">
            <div className="cp-line"><span>Access now</span><b className="cp-bad">Unlimited</b></div>
            <div className="cp-line"><span>Access after</span><b className="cp-ok">None</b></div>
            <pre className="cp-data">0x095ea7b3…0000</pre>
            <p className="cp-note">approve(0x0000…8ba3, 0) · decode it before you sign</p>
          </div>
        </div>
      </div>

      <div className="cap-row">
        <div className="cap-panel lit-strong">
          <div className="cp-head">
            <span>Verifying</span>
            <span className="cp-chip">Base</span>
          </div>
          <div className="cp-body">
            <div className="cp-verify">
              <span className="cp-check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"><path d="M4 13l5 5L20 7" /></svg>
              </span>
              <span>
                <b>Read back from the chain</b>
                <em>The stated intent and the resulting state agree.</em>
              </span>
            </div>
          </div>
        </div>

        <div className="cap-copy">
          <h3>Check the chain, not the receipt</h3>
          <p>
            A transaction confirming is not the same as a permission changing.
            The allowance is read again afterwards, and a mismatch is shown as a
            mismatch rather than a tick.
          </p>
        </div>
      </div>
    </section>
  );
}
