import { reading } from '../../lib/readings.js';
import { format } from '../../lib/api.js';
import { Dialog, SheetContent } from '../ui/Dialog.jsx';
import { AssetMark } from '../ui/AssetMark.jsx';

/**
 * Permission detail. Field set from Retention §11.2, technical material under
 * evidence per §10, so the top is consequence and the bottom is calldata.
 *
 * The "because" list comes from the engine. It is the engine's own reasoning,
 * shown rather than summarised, so a reader can check the conclusion instead
 * of trusting it.
 *
 * It opens as a sheet on Radix rather than the fixed <aside> it was, which is
 * what stops the page scrolling behind it while it is open, traps focus inside
 * it, returns focus to the row on close, and makes Escape and a click on the
 * ground work without this file knowing about either.
 */
export default function Detail({ perm, explorer, canAct = true, onClose, onAct }) {
  const r = reading(perm.reading);
  const granted = perm.unbounded ? 'Unlimited' : format(perm.granted, perm.decimals, perm.symbol);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        className="detail"
        title={`${perm.label || 'Permission'} detail`}
        description={r.means}
      >
      {/* The asset, the chain it is on, and the address — followable, because
          the evidence for everything below this line is on a block explorer
          and a panel about one permission should not make a reader go looking
          for it. */}
      <header className="d-head">
        <AssetMark symbol={perm.symbol} chain={perm.chain} size={30} />
        <div>
          <p className="rule-label">{perm.chain?.name ?? 'Permission detail'}</p>
          <h3>{perm.label || `${perm.beneficiary.slice(0, 6)}…${perm.beneficiary.slice(-4)}`}</h3>
          {explorer ? (
            <a className="d-addr" href={`${explorer}/address/${perm.beneficiary}`} target="_blank" rel="noopener">
              {perm.beneficiary.slice(0, 12)}…{perm.beneficiary.slice(-10)}
            </a>
          ) : (
            <span className="d-addr">{perm.beneficiary.slice(0, 12)}…{perm.beneficiary.slice(-10)}</span>
          )}
        </div>
        <button type="button" className="d-close" onClick={onClose} aria-label="Close detail">Close</button>
      </header>

      <p className={`d-verdict v ${r.tone}`}>{r.label}</p>
      <p className="d-means">{r.means}</p>
      <p className="d-not">{r.notMeans}</p>

      <p className="d-consequence">
        {perm.label || 'This spender'} can move{' '}
        {perm.unbounded ? `any amount of the ${perm.symbol}` : `up to ${granted}`}
        {' '}in {canAct ? 'your account' : 'this account'} without asking again,
        until the allowance is used or removed.
      </p>

      {!perm.label && (
        <p className="d-unknown">
          We have not confirmed what this contract is. It is shown by address
          rather than given a name we cannot stand behind.
        </p>
      )}

      <p className="rule-label">What this exposes</p>
      <dl className="d-rows">
        <div className="row"><dt>Access granted</dt><dd>{granted}</dd></div>
        <div className="row"><dt>{canAct ? 'You hold' : 'Account holds'}</dt><dd>{format(perm.held, perm.decimals, perm.symbol)}</dd></div>
        <div className="row"><dt>Reachable now</dt><dd>{format(perm.reachableNow, perm.decimals, perm.symbol)}</dd></div>
        <div className="row"><dt>Future deposits</dt><dd>{perm.futureExposed ? 'Also exposed' : 'Not exposed'}</dd></div>
        <div className="row"><dt>Access ends</dt><dd>Never</dd></div>
      </dl>

      {perm.because?.length > 0 && (
        <>
          <p className="rule-label">Why the engine says so</p>
          <ul className="because">{perm.because.map((b) => <li key={b}>{b}</li>)}</ul>
        </>
      )}

      <details className="evidence">
        <summary>Evidence</summary>
        <dl className="d-rows">
          <div className="row"><dt>Beneficiary</dt><dd>{perm.beneficiary.slice(0, 10)}…</dd></div>
          <div className="row"><dt>Asset</dt><dd>{perm.symbol || 'Unreadable'}</dd></div>
          <div className="row"><dt>Standard</dt><dd>{perm.standard}</dd></div>
          <div className="row"><dt>Raw allowance</dt><dd>{String(perm.granted).slice(0, 20)}{String(perm.granted).length > 20 ? '…' : ''}</dd></div>
        </dl>
        {explorer && (
          <p className="ev-note">
            <a href={`${explorer}/address/${perm.beneficiary}`} target="_blank" rel="noopener">Spender</a>
            {' · '}
            <a href={`${explorer}/address/${perm.asset}`} target="_blank" rel="noopener">Asset</a>
          </p>
        )}
        <p className="ev-note">
          Read from the chain by the TX Guard engine. No index, no third party.
        </p>
      </details>

      <div className="d-actions">
        {canAct && perm.remediable && (
          <button type="button" className="btn" onClick={onAct}>Revoke</button>
        )}
        <button type="button" className="txt" onClick={onClose}>Close</button>
      </div>

      {canAct ? (
        perm.remediable ? (
          <p className="d-note">
            Only revoke is offered. Replacing one live allowance with a smaller
            one is two transactions and some tokens revert on the first, so this
            screen does not pretend it is one click.
          </p>
        ) : (
          <p className="d-unknown">
            No correction is offered for a permission we cannot read. Unknown is
            not a finding of no issue.
          </p>
        )
      ) : (
        <p className="d-note">
          This is someone else&rsquo;s permission, so there is nothing to correct
          here. Only the holder of the account can withdraw it.
        </p>
      )}
      </SheetContent>
    </Dialog>
  );
}
