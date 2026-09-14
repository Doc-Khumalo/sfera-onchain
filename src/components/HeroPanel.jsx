/**
 * The hero panel: the product performing its whole loop, on a loop.
 *
 * Revoke.cash runs a sequence like this and it is the strongest thing on their
 * page: a counter draining as a list clears. Two things make this one better.
 *
 * FIRST, IT SHOWS THE ASKING. Their panel begins with results. Ours begins with
 * the work, because "it asks, it cannot list" is the fact that distinguishes
 * this product and it is invisible if the answer simply appears. The sweep and
 * the staggered arrival are that mechanic made watchable.
 *
 * SECOND, THE CORRECTION IS AN ACT. Their rows swap a button for a badge. Ours
 * are struck by a line that travels across the old value before the new one
 * rises underneath, which is the same motion the real ledger uses when a real
 * permission is removed. Someone watching the homepage has already seen the
 * gesture they will make later.
 *
 * The counter counts integers, not currency. Converting to dollars needs a
 * price feed the proof of concept does not have, and inventing one on a
 * security product is the thing we sell against.
 *
 * PURE CSS. The homepage ships no JavaScript and that is worth more than this.
 */
import ChainStack from './ChainStack.jsx';

const ROWS = [
  { token: 'USDC', colour: '#2775CA', app: 'Permit2', amount: '21,339.49' },
  { token: 'WETH', colour: '#627EEA', app: 'Permit2', amount: '2.4816' },
  { token: 'USDT', colour: '#26A17B', app: 'Uniswap', amount: '7,204.00' },
];

export default function HeroPanel() {
  return (
    <div className="hp" aria-hidden="true">
      <div className="hp-frame lit-strong">
        <div className="hp-head">
          <span className="hp-title">Live permissions</span>
          {/* Not one chain. A stack says fifteen faster than a number does. */}
          <ChainStack total={15} label="chains" compact />
        </div>

        <div className="hp-stat">
          <span className="hp-stat-label">Unbounded, reachable now</span>
          <span className="hp-count" />
          <span className="hp-scan" />
        </div>

        <div className="hp-rows">
          {ROWS.map(({ token, colour, app, amount }, i) => (
            <div className={`hp-row hp-r${i + 1}`} key={token}>
              <span className="hp-tok" style={{ background: colour }}>{token}</span>

              <span className="hp-who">
                <b>{app}</b>
                <em>{token} · never expires</em>
              </span>

              <span className="hp-val">
                <span className="hp-was">{amount}</span>
                <span className="hp-now">None</span>
              </span>

              <span className="hp-act">
                <span className="hp-badge hp-bad">UNBOUNDED</span>
                <span className="hp-badge hp-ok">REMOVED</span>
              </span>
            </div>
          ))}
        </div>

        <div className="hp-foot">
          <span className="hp-foot-a">Asking 60 pairs across the chain</span>
          <span className="hp-foot-b">Nothing reachable. Each change signed in your wallet.</span>
        </div>
      </div>
    </div>
  );
}
