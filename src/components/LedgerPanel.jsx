/**
 * The ledger, working. The section this sits in is the one that has to land.
 *
 * MONEY IS ON THE ROWS, AND IT ROLLS. A permission reading 2.4816 WETH means
 * nothing to a reader who does not hold their balances in their head, so every
 * amount carries its dollar value underneath it and the panel totals what is
 * reachable.
 *
 * Numbers fall rather than blink out. Showing a reader $37,975 and then, a
 * frame later, $350 asks them to believe a claim. Letting the figure drop in
 * front of them shows the claim being made. The roll is CSS — see the rolling
 * numbers block in home.css — because this page ships no JavaScript.
 *
 * Valuations are marked as indicative and are not part of a decision. Engine
 * readings are derived from allowance and expiry only, never from price: a
 * cheap token with unbounded authority is still unbounded. The dollar figure
 * is there to convey scale to a person, not to rank risk.
 *
 * NOT EVERYTHING IS REVOKED, and the two outcomes must look different.
 *
 * UX Specification §2 says Limit: the smallest permission that still completes
 * what you wanted. Revoking is what you do to authority nothing needs any more.
 * Limiting is what you do to authority something still needs, and it is the
 * harder and more valuable half. So the table shows both, and they are read
 * apart at a glance rather than by reading the word: a limited permission
 * settles mint, because it is alive and now fits its job; a revoked one settles
 * slate, because it is switched off. Neither settles red. Red belongs to the
 * state they were both rescued from.
 *
 * ROWS PERSIST. The assets do not disappear when a permission is corrected:
 * the wallet still holds the token and the application still exists. Only the
 * authority changes, so only the state columns move.
 *
 * Pure CSS on an 18s loop. The homepage ships no JavaScript.
 */
const ROWS = [
  {
    token: 'USDC', colour: '#2775CA', app: 'Permit2', via: 'Uniswap',
    was: '21,339.49', wasUsd: '$21,339', now: '100.00', nowUsd: '$100',
    outcome: 'limit', verb: 'Limit', done: 'Limited',
    endsNow: 'On use', readingNow: 'BOUNDED',
  },
  {
    token: 'WETH', colour: '#627EEA', app: 'Permit2', via: 'Uniswap',
    was: '2.4816', wasUsd: '$9,432', now: '0.00', nowUsd: '$0',
    outcome: 'revoke', verb: 'Revoke', done: 'Revoked',
    endsNow: 'Removed', readingNow: 'REMOVED',
  },
  {
    token: 'USDT', colour: '#26A17B', app: 'Uniswap', via: 'Router',
    was: '7,204.00', wasUsd: '$7,204', now: '250.00', nowUsd: '$250',
    outcome: 'limit', verb: 'Limit', done: 'Limited',
    endsNow: 'On use', readingNow: 'BOUNDED',
  },
];

export default function LedgerPanel({ chainStack = null }) {
  return (
    <div className="lp" aria-hidden="true">
      <div className="lp-frame lit-strong">
        <div className="lp-head">
          <span className="lp-title">Live permissions</span>
          {chainStack}
        </div>

        <div className="lp-stat">
          <span className="lp-read">Reachable by others, right now</span>
          <span className="roll usd lp-sum roll-sum">
            <span className="rnum"><i className="m" /><i className="g" /><i className="p" /></span>
          </span>
          <span className="lp-verdict">
            <span className="was">
              across <b className="lp-count" /> permissions that never expire
            </span>
            <span className="now">
              two cut down to what the action needed, one removed
            </span>
          </span>
          <span className="lp-scan" />
        </div>

        <div className="lp-cols">
          <span>Application</span>
          <span>Access granted</span>
          <span>Reachable now</span>
          <span>Access ends</span>
          <span>Reading</span>
          <span className="lp-right">Action</span>
        </div>

        {ROWS.map((r, i) => (
          <div className={`lp-row lp-r${i + 1} lp-o-${r.outcome}`} key={r.token}>
            <span className="lp-who">
              <span className="lp-tok" style={{ background: r.colour }}>{r.token}</span>
              <span>
                <b>{r.app}</b>
                <em>{r.via} · {r.token}</em>
              </span>
            </span>

            <span className="lp-swap">
              <span className="was">Unlimited</span>
              <span className="now">{r.outcome === 'revoke' ? 'None' : `${r.now} ${r.token}`}</span>
            </span>

            <span className="lp-amt">
              <span className={`roll ${r.token === 'WETH' ? 'd4' : 'd2'} roll-a${i + 1}`}>
                <span className="rnum"><i className="m" /><i className="g" /><i className="p" /></span>
              </span>
              <span className={`roll usd roll-u${i + 1}`}>
                <span className="rnum"><i className="m" /><i className="g" /><i className="p" /></span>
              </span>
            </span>

            <span className="lp-swap">
              <span className="was">Never</span>
              <span className="now">{r.endsNow}</span>
            </span>

            <span className="lp-swap lp-badges">
              <span className="was lp-badge lp-bad">UNBOUNDED</span>
              <span className="now lp-badge lp-res">{r.readingNow}</span>
            </span>

            <span className="lp-act">
              <span className="lp-swap">
                <span className="was lp-btn">{r.verb}</span>
                <span className="now lp-btn lp-done">{r.done}</span>
              </span>
              <span className="lp-btn lp-ghost">Inspect</span>
            </span>
          </div>
        ))}

        <div className="lp-foot">
          <span className="lp-foot-a">Asking 60 pairs across the chain</span>
          <span className="lp-foot-b">
            Two cut down to what the action needed, one removed. The assets are
            still yours; only the authority changed. Values indicative and not
            used in any reading.
          </span>
        </div>
      </div>
    </div>
  );
}
