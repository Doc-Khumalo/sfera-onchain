import { reading } from '../../lib/readings.js';
import { format } from '../../lib/api.js';

/**
 * One row per live permission. Retention §30, not a raw approval table, so the
 * row leads with the application and what it can reach. Addresses and the
 * standard live under evidence in Detail.
 *
 * Every figure here came from the engine as a decimal string and is formatted
 * with BigInt. Nothing is parsed into a float, because a float cannot hold a
 * uint256 and a silently rounded balance is a lie.
 */
export default function Ledger({ rows, openId, onOpen }) {
  return (
    <div className="ledger" role="table">
      <div className="l-head" role="row">
        <span role="columnheader">Application</span>
        <span role="columnheader">Access granted</span>
        <span role="columnheader">Reachable now</span>
        <span role="columnheader">Access ends</span>
        <span role="columnheader">Reading</span>
      </div>

      {rows.map((p) => {
        const r = reading(p.reading);
        const granted = p.unbounded
          ? 'Unlimited'
          : format(p.granted, p.decimals, p.symbol);
        return (
          <button key={p.id} type="button" role="row"
            className={`l-row ${openId === p.id ? 'on' : ''}`}
            aria-expanded={openId === p.id} onClick={() => onOpen(p.id)}>
            <span role="cell" className="c-app">
              {/* A spender we have not confirmed shows as its address. We do
                  not name a contract we cannot stand behind. */}
              {p.label || `${p.beneficiary.slice(0, 6)}…${p.beneficiary.slice(-4)}`}
              <em>{p.symbol || 'Unreadable contract'}</em>
            </span>
            <span role="cell" className={`c-granted ${p.unbounded ? 'stamped' : ''}`}>{granted}</span>
            <span role="cell" className="c-exp">{format(p.reachableNow, p.decimals, p.symbol)}</span>
            <span role="cell" className="c-ends stamp">Never</span>
            <span role="cell" className="c-verdict">
              <b className={`v ${r.tone}`}>{r.label}</b>
              {!p.label && <em>unverified spender</em>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
