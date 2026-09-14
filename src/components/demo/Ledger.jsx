import { READINGS, readingFor, grantedText, reachableText } from '../../lib/assess.js';

/**
 * One row per live permission. Retention §30 — not a raw approval table, so
 * the row leads with the application and what it can reach. The spender
 * address, the token address and the standard live under evidence in Detail.
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
        const reading = readingFor(p);
        const r = READINGS[reading];
        return (
          <button
            key={p.id}
            type="button"
            role="row"
            className={`l-row ${openId === p.id ? 'on' : ''}`}
            aria-expanded={openId === p.id}
            onClick={() => onOpen(p.id)}
          >
            <span role="cell" className="c-app">
              {/* An unlabelled spender is shown as its address. We do not name
                  a contract we have not confirmed. */}
              {p.app || p.spenderShort}
              <em>{p.token.symbol || 'Unreadable token'}</em>
            </span>
            <span role="cell" className={`c-granted ${p.unbounded ? 'stamped' : ''}`}>
              {grantedText(p)}
            </span>
            <span role="cell" className="c-exp">{reachableText(p)}</span>
            <span role="cell" className="c-ends stamp">Never</span>
            <span role="cell" className="c-verdict">
              <b className={`v ${r.tone}`}>{r.label}</b>
              {!p.app && <em>unverified spender</em>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
