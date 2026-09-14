import { CONTACT } from '../../data/site.js';

/** Marketing Plan §7.4. */
export default function Developers() {
  return (
    <section className="dev reveal" id="developers">
      <div className="col-type">
        <h2>One integration.</h2>
        <p className="lede">
          Explain authority, compare it with user intent and offer a safer
          permission across supported EVM standards — without building every
          decoder and control flow yourself.
        </p>
        <a className="btn ghost" href={CONTACT} target="_blank" rel="noopener">
          Talk to us about an integration
        </a>
      </div>

      <dl className="api">
        <div className="a-row">
          <dt>Access Receipt</dt>
          <dd>Rendered from a structured decision</dd>
        </div>
        <div className="a-row">
          <dt>Exposure</dt>
          <dd>Current balance and future deposits</dd>
        </div>
        <div className="a-row">
          <dt>Comparison</dt>
          <dd>Requested against required, from declared intent</dd>
        </div>
        <div className="a-row">
          <dt>Remediation</dt>
          <dd>Unsigned — your wallet still has to confirm</dd>
        </div>
      </dl>
    </section>
  );
}
