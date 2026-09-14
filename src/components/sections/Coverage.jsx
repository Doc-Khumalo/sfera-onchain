import { COVERAGE } from '../../data/site.js';

const STATUS = { 'in-build': 'In build', planned: 'Planned', experimental: 'Experimental' };

/** Standards roadmap from Development Plan §7.1-7.3. Status stated on every row. */
export default function Coverage() {
  return (
    <section className="coverage reveal" id="coverage">
      <h2>Permissions decode deterministically.</h2>
      <p className="lede">
        We can be right rather than probabilistic — and say unknown rather than
        safe when we cannot tell.
      </p>

      <dl className="schedule">
        {COVERAGE.map(({ group, status, items }) => (
          <div className="s-row" key={group}>
            <dt>
              {group}
              <span className={`s-status ${status}`}>{STATUS[status]}</span>
            </dt>
            <dd>{items.join('  ·  ')}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
