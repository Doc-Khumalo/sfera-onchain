import { reading } from '../../lib/readings.js';
import { format } from '../../lib/api.js';
import RowActions from './RowActions.jsx';

/**
 * One row per live permission. Retention §30, not a raw approval table, so the
 * row leads with the application and what it can reach. Addresses and the
 * standard live under evidence in Detail.
 *
 * Every figure here came from the engine as a decimal string and is formatted
 * with BigInt. Nothing is parsed into a float, because a float cannot hold a
 * uint256 and a silently rounded balance is a lie.
 */
export default function Ledger({ rows, openId, canAct, explorer, onOpen, onRevoke }) {
  return (
    <div className="ledger" role="table">
      <div className="l-head" role="row">
        <span role="columnheader">Application</span>
        <span role="columnheader">Access granted</span>
        <span role="columnheader">Reachable now</span>
        <span role="columnheader">Access ends</span>
        <span role="columnheader">Reading</span>
        <span role="columnheader">Action</span>
      </div>

      {rows.map((p) => {
        const r = reading(p.reading);
        const granted = p.unbounded
          ? 'Unlimited'
          : format(p.granted, p.decimals, p.symbol);
        return (
          /* A div rather than a button: a row carries its own action
             buttons, and nesting interactive elements inside a button is
             invalid and breaks keyboard navigation. The row keeps button
             behaviour through role, tabIndex and an explicit key handler. */
          <div key={p.id} role="row" tabIndex={0}
            className={`l-row ${openId === p.id ? 'on' : ''}`}
            aria-expanded={openId === p.id}
            onClick={() => onOpen(p.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(p.id); }
            }}>
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
            {/* Stops the row's own click from opening the detail panel when
                someone is reaching for an action inside it. */}
            <span
              role="cell"
              className="c-act"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <RowActions
                perm={p}
                canAct={canAct}
                explorer={explorer}
                onRevoke={() => onRevoke(p)}
                compact
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}
