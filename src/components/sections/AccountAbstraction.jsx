/** Marketing Plan §7.5. */
export default function AccountAbstraction() {
  return (
    <section className="aa reveal">
      <div className="col-type">
        <h2>Fewer signatures. Same control.</h2>
        <p className="lede">
          We explain who can act, what they can do, what they can spend, how long
          access lasts and how it can be revoked.
        </p>
        <p className="footnote">
          Base plans native account abstraction through the Cobalt upgrade. That
          work is experimental and kept behind a feature flag until the network
          activates it.
        </p>
      </div>

      <dl className="ledger">
        <div className="l-row stamped">
          <dt>Legacy approval</dt>
          <dd>Unlimited</dd>
          <p className="l-note">No expiry. Reusable until revoked.</p>
        </div>
        <div className="l-row sealed">
          <dt>Bounded access</dt>
          <dd>100 USDC / day</dd>
          <p className="l-note">Ends Friday. Scoped to one spender.</p>
        </div>
      </dl>
    </section>
  );
}
