import { reading } from '../../lib/readings.js';
import { format, say } from '../../lib/api.js';
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
  /* A reading that did not answer has no figure and must not be given one.
     `unreadable` is the engine's own marker and says which call failed. */
  const granted = perm.unreadable ? 'Did not answer'
    : say(perm.granted, perm.decimals, perm.symbol);
  const WHY_UNREADABLE = {
    CALL_REVERTED: 'The allowance call reverted. That is a property of this contract, so asking again will not change it.',
    NO_ANSWER: 'The allowance call came back without a value we can read. It is worth asking again.',
    ASSET_UNREADABLE: 'The contract did not answer the calls needed to interpret a quantity of it, so no amount here can be stated.',
    /* The engine said the reading did not answer and did not say which call
       failed — the older /v1 shape carries no reason. Naming one would be
       ours rather than the engine's, so the sheet says what is known and
       stops. */
    NOT_STATED: 'The reading did not answer. This engine does not say which call failed, so the reason is not established either.',
  };

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

      {perm.unreadable ? (
        /* No sentence about what can be moved, because the amount was not
           established. What IS known is that the permission was asked about
           and the chain did not answer, and that is what is said. */
        <p className="d-consequence">
          This permission was asked about and the reading did not answer, so
          how much {perm.label || 'this spender'} can move from{' '}
          {canAct ? 'your account' : 'this account'} is not established here.
          It stands whatever we could see of it.
        </p>
      ) : (
        <p className="d-consequence">
          {perm.label || 'This spender'} can move{' '}
          {perm.granted?.kind === 'UNBOUNDED' ? `any amount of the ${perm.symbol}` : `up to ${granted}`}
          {' '}in {canAct ? 'your account' : 'this account'} without asking again,
          until the allowance is used or removed.
        </p>
      )}

      {perm.unreadable && (
        <p className="d-unknown">{WHY_UNREADABLE[perm.unreadable] || r.means}</p>
      )}

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
        <div className="row"><dt>Future deposits</dt><dd>{perm.futureExposed == null ? 'Not established' : perm.futureExposed ? 'Also exposed' : 'Not exposed'}</dd></div>
        <div className="row"><dt>Access ends</dt><dd>{perm.endsSay || 'Not established'}</dd></div>
      </dl>

      {perm.because?.length > 0 && (
        <>
          <p className="rule-label">Why the engine says so</p>
          <ul className="because">{perm.because.map((b) => <li key={b}>{b}</li>)}</ul>
        </>
      )}

      <details className="evidence">
        <summary>Evidence</summary>
        {/* The addresses are the evidence, so they are the things that can be
            followed. They were printed as text with the links to them in a
            line underneath, which asked a reader to match "Spender" to a
            truncated string above it. */}
        <dl className="d-rows">
          <div className="row">
            <dt>Beneficiary</dt>
            <dd>
              {explorer ? (
                <a className="ev-link" href={`${explorer}/address/${perm.beneficiary}`} target="_blank" rel="noopener">
                  {perm.beneficiary.slice(0, 10)}…{perm.beneficiary.slice(-6)}
                </a>
              ) : `${perm.beneficiary.slice(0, 10)}…${perm.beneficiary.slice(-6)}`}
            </dd>
          </div>
          <div className="row">
            <dt>Asset</dt>
            <dd>
              {explorer && perm.asset ? (
                <a className="ev-link" href={`${explorer}/address/${perm.asset}`} target="_blank" rel="noopener">
                  {perm.symbol || 'Unreadable'}
                </a>
              ) : (perm.symbol || 'Unreadable')}
            </dd>
          </div>
          <div className="row"><dt>Standard</dt><dd>{perm.standard}</dd></div>
          <div className="row">
            <dt>Raw allowance</dt>
            {/* EVIDENCE, SO ONLY WHAT WAS READ. This row exists to be checked
                against a block explorer, which means it may only carry a
                figure the engine returned. An unbounded allowance has no
                figure on the wire — the contract says so deliberately — and
                2^256-1 is what one usually holds on the chain, which is not
                the same as what this read produced. Usually is not evidence,
                so the row says what it has and stops. */}
            <dd>{perm.granted?.kind === 'FINITE'
              ? `${String(perm.granted.amount).slice(0, 20)}${String(perm.granted.amount).length > 20 ? '…' : ''}`
              : perm.granted?.kind === 'UNBOUNDED' ? 'No ceiling. The engine returns no figure for one, and this row will not supply one.'
                : perm.granted?.kind === 'NONE' ? '0'
                  : 'No value came back'}</dd>
          </div>
        </dl>
        <p className="ev-note">
          Read from the chain by the Sfera Onchain engine. No index, no third party.
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
