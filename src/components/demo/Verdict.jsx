import { format } from '../../lib/api.js';
import { Counter } from '../ui/Counter.jsx';

/**
 * The line a person actually came for.
 *
 * Four equal tiles reading 3, 3, 3, 1 make someone do arithmetic to find out
 * whether they should care. This says it once, in a sentence, and then shows
 * the amounts underneath.
 *
 * It states quantities per asset rather than one converted total, because
 * converting to a currency needs a price feed the proof of concept does not
 * have, and a single invented figure on a security product is worse than five
 * honest ones.
 */
export default function Verdict({ perms, readAt, scanning }) {
  if (scanning) {
    return (
      <section className="verdict field">
        <p className="v-kicker">
          <span className="live-dot mr-2 inline-block h-1.5 w-1.5 rounded-full bg-ok align-middle" />
          Reading the chain
        </p>
        <h2 className="v-line">Asking every application we know.</h2>
        {/* The sweep is the work, not a spinner. The engine really is moving
            through pairs, so the page shows that rather than a shape that
            only says something is happening somewhere. */}
        <div className="relative mt-9 h-px overflow-hidden bg-line">
          <span className="scan-line" />
        </div>
      </section>
    );
  }

  const unbounded = perms.filter((p) => p.reading === 'UNBOUNDED');
  const attention = perms.filter((p) => p.attention);
  const apps = new Set(attention.map((p) => (p.label || p.beneficiary).toLowerCase()));

  if (perms.length === 0) {
    return (
      <section className="verdict field">
        <p className="v-kicker">Nothing found</p>
        <h2 className="v-line">
          No standing permission turned up in what we asked about.
        </h2>
        <p className="v-sub">
          That is not the same as this wallet having none. It means the
          applications we know to ask about do not hold one.
        </p>
      </section>
    );
  }

  /* Only permissions with something to take today lead the summary. An
     unbounded allowance against an empty balance still matters and is still
     listed, but it is not the sentence that opens the page. */
  const live = unbounded.filter((p) => {
    try { return BigInt(p.reachableNow ?? '0') > 0n; } catch { return false; }
  });

  const tone = attention.length > 0 ? 'bad' : 'ok';

  return (
    <section className={`verdict field ${tone}`}>
      <p className="v-kicker">{readAt ? `Read ${new Date(readAt).toLocaleTimeString()}` : 'Read from the chain'}</p>

      {attention.length > 0 ? (
        <h2 className="v-line">
          {/* Two counts in one sentence read badly: an application count
              followed by a permission count made "1 application ... none of
              them expires". The expiry clause stands on its own instead. */}
          <b><Counter value={apps.size} /></b> {apps.size === 1 ? 'application can' : 'applications can'} take
          from this wallet.
          {unbounded.length > 0 && <> Nothing expires.</>}
        </h2>
      ) : (
        <h2 className="v-line">Everything found is bounded.</h2>
      )}

      {live.length > 0 && (
        <ul className="v-amounts stagger">
          {live.map((p) => (
            <li key={p.id}>
              <span className="va-n">{format(p.reachableNow, p.decimals, p.symbol)}</span>
              <span className="va-l">reachable by {p.label || 'an unverified spender'}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="v-sub">
        {attention.length > 0
          ? 'Each of these was granted once and has been live ever since. Removing one is a transaction your own wallet signs.'
          : 'Bounded is not safe. It is a smaller blast radius, not none.'}
      </p>
    </section>
  );
}
