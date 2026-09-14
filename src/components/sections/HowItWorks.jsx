import { LOOP } from '../../data/site.js';

/** UX Specification §2 — Understand, Compare, Limit, Sign, Verify. */
export default function HowItWorks() {
  return (
    <section className="how reveal" id="how">
      <h2>The method</h2>

      <dl className="method">
        {LOOP.map(({ step, title, body }) => (
          <div className="m-row" key={step}>
            <dt>
              <span className="m-step">{step}</span>
              <span className="m-q">{title}</span>
            </dt>
            <dd>{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
