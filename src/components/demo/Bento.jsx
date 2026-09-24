import { Counter, Amount } from '../ui/Counter.jsx';
import { ChainMark } from '../ui/ChainMark.jsx';
import { spender } from '../../data/spenders.js';
import { native } from '../../lib/chains.js';
import { exposure, futureExposed } from '../../lib/exposure.js';
import { reading } from '../../lib/readings.js';

/**
 * The figures, as an instrument rather than a row of equal tiles.
 *
 * Four tiles of identical weight told a reader nothing about what to look at
 * first, so this is an irregular grid with ONE saturated card in it: what this
 * wallet can lose today. Everything else is quiet and small.
 *
 * THE ANCHOR'S COLOUR IS A READING, NOT ARITHMETIC. Red when something is
 * reachable, mint only when the chain was read, counted, and reaches nothing,
 * and neutral whenever the zero has not been established — before a read,
 * during one, and after one that failed. Marketing Plan §30: no issue detected
 * is not presented as guaranteed safety, and an all-clear on an unread wallet
 * is the one lie this page cannot tell.
 */

/* Closed or unreadable is one segment, not three greys. Removed, Expired and
   Unknown are within about five units of one another and nobody can separate
   them in a bar; the table's chips carry the distinction with border style,
   which a bar has no room for. */
const CLOSED = ['REMOVED', 'EXPIRED', 'UNKNOWN'];

/**
 * Every chain, and what it actually said.
 *
 * A chain that refused is not a chain with nothing on it, and that difference
 * is the whole argument of this page, so the list shows all fifteen rather
 * than the handful with findings: a chain missing from a list and a chain
 * holding nothing look identical otherwise.
 *
 * The failed ones carry their own retry. Re-reading the whole wallet to get
 * one chain back costs fifteen requests and throws away fourteen good
 * answers, and the engine caches for thirty seconds anyway, so the retry that
 * belongs here is the narrow one.
 */
function Chains({ supported, perChain, failed, unread, onRetry, retrying }) {
  const failedIds = new Set((failed ?? []).map((c) => c.id));
  const ranked = [...(supported ?? [])].sort((a, b) => {
    /* Refused first: it is the row with something to do on it. Then whatever
       was found, then the empty ones. */
    const fa = failedIds.has(a.id) ? 0 : 1;
    const fb = failedIds.has(b.id) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return (perChain[b.id] ?? 0) - (perChain[a.id] ?? 0);
  });

  return (
    <ul className="b-chains" role="list">
      {ranked.map((c) => {
        const didFail = failedIds.has(c.id);
        const n = perChain[c.id] ?? 0;
        const busy = retrying === c.id;
        return (
          <li
            key={c.id}
            className={`b-chrow${busy ? ' busy' : didFail ? ' fail' : unread ? ' unread' : n ? ' found' : ' zero'}`}
          >
            <ChainMark chain={c} size={22} />
            <span className="b-chname">
              <b>{c.name}</b>
              {native(c.id) && <em>{native(c.id)}</em>}
            </span>
            <span className="b-chstat">
              {busy
                ? 'asking'
                : didFail
                  ? 'refused'
                  : unread
                    ? 'not read'
                    : n === 0
                      ? 'none'
                      : `${n} permission${n === 1 ? '' : 's'}`}
            </span>
            {didFail && onRetry && (
              <button
                type="button"
                className="b-retry"
                disabled={busy}
                onClick={() => onRetry(c)}
              >
                {busy ? 'Asking' : 'Retry'}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Which applications, named.
 *
 * This was a row of coloured squares carrying initials derived from the
 * spender's name, which produced "UP" for Uniswap Permit2 and a hex pair for
 * everything else: a badge that looked like a logo and was not one. A count
 * of applications is only useful if you can see which ones, so it names them.
 */
function TakerNames({ perms }) {
  const by = new Map();
  for (const p of perms) {
    if (!p.attention) continue;
    const key = (p.label || p.beneficiary).toLowerCase();
    if (!by.has(key)) by.set(key, p);
  }
  const takers = [...by.values()];
  if (takers.length === 0) return null;

  return (
    <ul className="b-names">
      {takers.slice(0, 3).map((p) => {
        const known = spender(p.beneficiary);
        return (
          <li key={p.beneficiary} title={p.beneficiary}>
            {known?.name || p.label || `${p.beneficiary.slice(0, 6)}\u2026${p.beneficiary.slice(-4)}`}
          </li>
        );
      })}
      {takers.length > 3 && <li className="b-names-more">and {takers.length - 3} more</li>}
    </ul>
  );
}

/**
 * What the outstanding work is made of.
 *
 * The count says how much is left; this says what kind, in the product's own
 * vocabulary, so the number is a list of things to decide rather than a
 * score.
 */
function WorkSplit({ perms }) {
  const task = (p) => p.attention && p.remediable;
  const unbounded = perms.filter((p) => task(p) && p.reading === 'UNBOUNDED').length;
  const wide = perms.filter((p) => task(p) && p.reading === 'OVER_WIDE').length;
  const parts = [];
  if (unbounded) parts.push(`${unbounded} unbounded`);
  if (wide) parts.push(`${wide} over-wide`);
  if (parts.length === 0) return null;
  return <p className="b-split">{parts.join(' \u00b7 ')}</p>;
}

export default function Bento({
  perms, supported, perChain, result, status,
  takersHere, toSeeToHere, takers, toSeeTo,
  narrowed, unread, uncertain, unreadCap,
  onRetryChain, retryingChain, onRefresh,
  ledgerHead, ledger,
}) {
  const ex = exposure(perms);
  const future = futureExposed(perms);

  const counts = {
    UNBOUNDED: perms.filter((p) => p.reading === 'UNBOUNDED').length,
    OVER_WIDE: perms.filter((p) => p.reading === 'OVER_WIDE').length,
    BOUNDED: perms.filter((p) => p.reading === 'BOUNDED').length,
    closed: perms.filter((p) => CLOSED.includes(p.reading)).length,
  };
  const total = counts.UNBOUNDED + counts.OVER_WIDE + counts.BOUNDED + counts.closed;

  /* THREE STATES, AND THE MIDDLE ONE IS THE POINT.
   *
   * `live`    money someone else can move right now.
   * `waiting` a zero that has not been established, or one that has been and
   *           still sits under authority covering whatever arrives next. A
   *           wallet with an unbounded approval over an empty balance lands
   *           here, and it must never wear mint: that is the reading people
   *           misjudge, and the whole product is an argument against calling
   *           it safe.
   * `clear`   read, counted, reaching nothing, and covering nothing later.
   */
  const reaches = ex.cents > 0n || ex.others.length > 0;
  const anchorTone = unread
    ? 'waiting'
    : reaches
      ? 'live'
      : ex.reachesNothing && ex.attention === 0 && future === 0
        ? 'clear'
        : ex.reachesNothing
          ? 'pending'
          : 'waiting';

  const read = result?.chainsRead?.length ?? 0;
  const failed = result?.chainsFailed ?? [];
  const asked = supported?.length ?? 0;
  const notCovered = result?.coverage?.notCovered ?? [];
  const readTime = result?.readAt
    ? new Date(result.readAt).toLocaleTimeString([], { hour12: false })
    : '—';

  return (
    <div className="bento">
      <div className="bento-grid">

        <section className={`b-card anchor ${anchorTone}`}>
          {/* <p className="b-read-stamp">Read {readTime}</p> */}
          <h3 className="b-reach-copy">
            <span>{takers}</span> application{takers === 1 ? '' : 's'} can take <span>at least </span>
            <strong>{unread ? '—' : <Amount raw={ex.cents.toString()} decimals={2} money prefix="$" />}</strong> from this wallet. <em>Nothing expires.</em>
          </h3>
        </section>

        <section className="b-card tall">
          <div className="b-card-top">
            <h3 className="b-k">Chains read</h3>
            <p className="b-fig sm">
              {unread ? '—' : read}
              <span className="b-of"> of {asked}</span>
            </p>
          </div>
          <Chains
            supported={supported}
            perChain={perChain}
            failed={failed}
            unread={unread}
            onRetry={onRetryChain}
            retrying={retryingChain}
          />
          <p className="b-sub">
            {unread ? 'No chains answered yet.' : `${read} of ${asked} chains answered.`}
          </p>
        </section>

        <section className="b-card is-takers b-summary-card">
          <div className="b-summary-head">
            <span className="b-summary-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="8.5" y="14" width="7" height="7" rx="1" /><path d="M6.5 10v2h11v-2" /></svg>
            </span>
            <h3 className="b-k">Applications that can take</h3>
            <p className={`b-fig${takersHere ? ' bad' : uncertain ? '' : ' ok'}`}><Counter value={takersHere} /></p>
          </div>
          <div className="b-summary-detail">
            <TakerNames perms={perms} />
            <p className="b-sub">{unread ? unreadCap : narrowed ? `in this view · ${takers} in the whole wallet` : 'applications, not permissions'}</p>
          </div>
        </section>

        <section className="b-card b-summary-card is-to-see">
          <div className="b-summary-head">
            <span className="b-summary-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 21 20H3L12 3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
            </span>
            <h3 className="b-k">To see to</h3>
            <p className={`b-fig${toSeeToHere ? ' bad' : uncertain ? '' : ' ok'}`}><Counter value={toSeeToHere} /></p>
          </div>
          <div className="b-summary-detail">
            {perms.length > 0 && (
              <span className="b-meter" aria-hidden="true">
                <i style={{ flex: Math.max(toSeeToHere, 0.001), background: 'var(--bad)' }} />
                <i style={{ flex: Math.max(perms.length - toSeeToHere, 0.001), background: 'var(--line)' }} />
              </span>
            )}
            <p className="b-sub">{unread ? unreadCap : narrowed ? `in this view · ${toSeeTo} in the whole wallet` : toSeeTo === 0 ? 'nothing is waiting on you' : `${toSeeTo} of ${perms.length} found`}</p>
          </div>
        </section>
        {/* The phone artboard's pair is To see to and Coverage. On a wide
            screen the chain card carries coverage, so this is the one card
            that exists for the narrow layout only. */}
        <section className="b-card only-phone">
          <h3 className="b-k">Coverage</h3>
          <p className="b-fig">
            {unread ? '—' : read}
            <span className="b-of">/{asked}</span>
          </p>
          <p className="b-sub">
            {failed.length > 0 ? `${failed.map((c) => c.name).join(', ')} refused` : unread ? 'nothing asked yet' : 'every chain answered'}
          </p>
        </section>


        <section className="b-ledger">
          {status === 'scanning' && <span className="scan-line" aria-hidden="true" />}
          {ledgerHead}
          {ledger}
        </section>
      </div>

      <aside className="bento-rail">
        <section className="b-card">
          <h3 className="b-k">Deposits not yet made</h3>
          <p className={`b-fig lg${future ? ' wide' : uncertain ? '' : ' ok'}`}>
            {unread ? '—' : <><Counter value={future} /> <span className="b-of">of {perms.length}</span></>}
          </p>
          <p className="b-sub">
            This, not the figure above, is what bounding moves. An unbounded approval
            does not lapse when the balance hits zero. It waits.
          </p>
        </section>

        {total > 0 && (
          <section className="b-card">
            <h3 className="b-k">What the readings are</h3>
            <span className="b-meter tall" aria-hidden="true">
              {counts.UNBOUNDED > 0 && <i style={{ flex: counts.UNBOUNDED, background: 'var(--bad)' }} />}
              {counts.OVER_WIDE > 0 && <i style={{ flex: counts.OVER_WIDE, background: '#E8B75B' }} />}
              {counts.BOUNDED > 0 && <i style={{ flex: counts.BOUNDED, background: 'var(--ok)' }} />}
              {counts.closed > 0 && <i className="hatch" style={{ flex: counts.closed }} />}
            </span>
            <dl className="b-legend">
              <div><dt><i style={{ background: 'var(--bad)' }} />{reading('UNBOUNDED').label}</dt><dd>{counts.UNBOUNDED}</dd></div>
              <div><dt><i style={{ background: '#E8B75B' }} />{reading('OVER_WIDE').label}</dt><dd>{counts.OVER_WIDE}</dd></div>
              <div><dt><i style={{ background: 'var(--ok)' }} />{reading('BOUNDED').label}</dt><dd>{counts.BOUNDED}</dd></div>
              <div><dt><i className="hatch" />Closed or unreadable</dt><dd>{counts.closed}</dd></div>
            </dl>
          </section>
        )}

        {notCovered.length > 0 && (
          <section className="b-card">
            <h3 className="b-k">What we did not ask about</h3>
            <ul className="b-not">
              {notCovered.map((n) => (
                <li key={n}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                  </svg>
                  {n}
                </li>
              ))}
            </ul>
            <p className="b-sub">
              Nothing found is not the same as nothing existing.
              {result?.checked ? ` ${result.checked.toLocaleString('en-US')} token and spender pairs were asked.` : ''}
            </p>
          </section>
        )}
      </aside>
    </div>
  );
}
