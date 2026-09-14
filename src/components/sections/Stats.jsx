/**
 * Market figures, each attributed. Taken from the Business Plan's own
 * sourcing: Chainalysis, Crypto.com and a16z. Stated as estimates because
 * that is what they are — no invented traction, none of it ours.
 */
const STATS = [
  { n: '$17B', l: 'stolen through crypto scams and fraud in 2025', src: 'Chainalysis' },
  { n: '741M', l: 'people own crypto worldwide', src: 'Crypto.com' },
  { n: '40–70M', l: 'of them actively use it onchain', src: 'a16z' },
];

export default function Stats() {
  return (
    <section className="stats">
      <dl>
        {STATS.map(({ n, l, src }) => (
          <div key={n}>
            <dt>{n}</dt>
            <dd>{l}</dd>
            <dd className="src">{src} estimate</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
