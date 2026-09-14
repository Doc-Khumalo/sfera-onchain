/**
 * The three-step explanation of what this page is doing.
 *
 * It exists because the mechanism is genuinely counter-intuitive and the
 * counter-intuitive part is load bearing: an allowance cannot be listed, only
 * asked about. Without that, "checked 60 pairs" is noise and an empty result
 * reads as a clean wallet. With it, a reader understands both what they are
 * seeing and what they are not.
 */
export default function HowItReads({ checked, tokens, spenders, chain }) {
  return (
    <section className="how-reads">
      <p className="rule-label">How this reads a wallet</p>

      <ol className="reads-steps">
        <li>
          <span className="rs-n">01</span>
          <h3>It asks. It cannot list.</h3>
          <p>
            An allowance is a mapping with no index, so no chain can answer
            &ldquo;what has this wallet approved?&rdquo;. The only question
            available is whether one named application holds a permission on one
            named token.
          </p>
        </li>
        <li>
          <span className="rs-n">02</span>
          <h3>So it asks {checked ?? '—'} times, at once.</h3>
          <p>
            {tokens ?? '—'} tokens against {spenders ?? '—'} applications we have
            verified on {chain || 'this chain'}, batched into a single request
            so the answer is one moment in time rather than a smear across
            several.
          </p>
        </li>
        <li>
          <span className="rs-n">03</span>
          <h3>What it did not ask, it does not claim.</h3>
          <p>
            A permission to something outside that list is invisible here, and
            the page says so rather than presenting silence as safety. Finding
            nothing is not the same as there being nothing.
          </p>
        </li>
      </ol>
    </section>
  );
}
