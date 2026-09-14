import { COMMITMENTS } from '../../data/site.js';

/**
 * Marketing Plan §30. Set as terms on the one dark spread — the moment the
 * page hands control back to the wallet.
 */
export default function Trust() {
  return (
    <section className="trust" id="trust">
      <div className="trust-inner">
        <h2>Your wallet. Never ours.</h2>
        <p className="lede">
          We hand over an unsigned payload and stop. Accept the correction, keep
          the original, or walk away.
        </p>

        <ol className="terms">
          {COMMITMENTS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
