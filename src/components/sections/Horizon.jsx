/**
 * Where this goes.
 *
 * Staged as the Stage-Gate Operating Plan §114 requires: never present
 * speculative future products as if already committed. Each line is that
 * family's own core question from Master Strategy §11, §14 and §20.
 */
const STAGES = [
  { when: 'Now', name: 'Control', q: 'Should this authority be authorized, and under what constraints?', state: 'in-build' },
  { when: 'Next', name: 'Authority and lifecycle', q: 'What can still act on this account, and should it?', state: 'planned' },
  { when: 'Earned', name: 'Execute', q: 'What is the best acceptable way to execute an approved intent?', state: 'later' },
  { when: 'Long term', name: 'Explore', q: 'Which opportunities are worth considering under your constraints?', state: 'later' },
];

export default function Horizon() {
  return (
    <section className="horizon reveal">
      <div className="col-type">
        <h2>The transaction control layer for onchain accounts.</h2>
        <p className="lede">
          Permission control is the wedge. Each stage has to be earned by the
          one before it.
        </p>
      </div>

      <ol className="stages">
        {STAGES.map(({ when, name, q, state }) => (
          <li key={name} className={state}>
            <span className="st-when">{when}</span>
            <span className="st-name">{name}</span>
            <span className="st-q">{q}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
