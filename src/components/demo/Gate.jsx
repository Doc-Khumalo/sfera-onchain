import { EXAMPLES } from '../../data/site.js';
import { ChainMark } from '../ui/ChainMark.jsx';

/**
 * The first thing, and for a moment the only thing.
 *
 * THERE USED TO BE NO GATE, AND THE REASON IS IN THE HISTORY: a screen that
 * asked for an address before showing what it would do with one made a reader
 * commit on faith, and it was a second layout to keep in step with the first.
 * Both objections stand, and this answers them rather than ignoring them.
 *
 * It is not a second layout. The address field is ONE element that lives in
 * `.b-top` in both states and changes size, so nothing here is a copy of the
 * bar it becomes: this component renders only what sits around that field
 * before a read, and collapses to nothing after one.
 *
 * And it does not ask for faith. What the ledger will show is named in the
 * sentence, and two of the three cards are wallets already read against the
 * live engine, so a reader who has no address to hand can see the whole thing
 * before deciding whether to give us theirs.
 */
export default function Gate({ supported, wallets, busy, onRead, onConnect, hidden }) {
  const chains = supported ?? [];

  return (
    <div className="gate-offers" aria-hidden={hidden || undefined}>
      <p className="gate-chainline">
        {chains.length > 0 && (
          <span className="gate-marks" aria-hidden="true">
            {chains.slice(0, 6).map((c) => (
              <ChainMark key={c.id} chain={c} size={16} />
            ))}
          </span>
        )}
        or read one of these
      </p>

      <div className="gate-picks">
        {EXAMPLES.map((e) => (
          <button
            key={e.address}
            type="button"
            className="gate-pick"
            disabled={busy}
            onClick={() => onRead(e.address, e.chainId)}
          >
            <span className="gate-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 7h10v10" /><path d="M7 17 17 7" />
              </svg>
            </span>
            <span className="gate-tag">{e.group}</span>
            <span className="gate-ttl">{e.title}</span>
            <span className="gate-sub">{e.note}</span>
          </button>
        ))}

        {/* The third card is a fact about this browser, not a claim. Offering
            to connect a wallet that is not installed is the one thing a
            prospect will try first and find broken. */}
        {wallets?.length > 0 ? (
          <button type="button" className="gate-pick" disabled={busy} onClick={onConnect}>
            <span className="gate-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 7h10v10" /><path d="M7 17 17 7" />
              </svg>
            </span>
            <span className="gate-tag">Your own wallet</span>
            <span className="gate-ttl">Connect {wallets[0].info.name} and read it in place</span>
            <span className="gate-sub">
              Read only. A correction comes back unsigned for you to approve.
              {wallets.length > 1 && ` ${wallets.length - 1} other wallet${wallets.length > 2 ? 's are' : ' is'} installed here too.`}
            </span>
          </button>
        ) : (
          <div className="gate-pick is-note">
            <span className="gate-tag">Your own wallet</span>
            <span className="gate-ttl">No wallet was found in this browser</span>
            <span className="gate-sub">
              Paste an address above instead. Reading one needs no wallet at all.
            </span>
          </div>
        )}
      </div>

      <p className="gate-vow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        We never ask for a recovery phrase, we never sign on your behalf, and an address
        you type here is not kept.
      </p>
    </div>
  );
}
