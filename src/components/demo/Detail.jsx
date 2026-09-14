import { READINGS, readingFor, grantedText, reachableText, amount } from '../../lib/assess.js';

/**
 * Permission detail. Field set from Retention §11.2. Technical material stays
 * under evidence, per §10, so the top of the panel is consequence and the
 * bottom is calldata.
 */
export default function Detail({ perm, chain, canAct = true, onClose, onAct }) {
  const reading = readingFor(perm);
  const r = READINGS[reading];
  const explorer = chain?.explorer;

  return (
    <aside className="detail" aria-label={`${perm.app || perm.spenderShort} permission detail`}>
      <header className="d-head">
        <div>
          <p className="rule-label">Permission detail</p>
          <h3>{perm.app || perm.spenderShort}</h3>
        </div>
        <button type="button" className="d-close" onClick={onClose} aria-label="Close detail">
          Close
        </button>
      </header>

      <p className={`d-verdict v ${r.tone}`}>{r.label}</p>
      <p className="d-means">{r.means}</p>
      <p className="d-not">{r.notMeans}</p>

      <p className="d-consequence">
        {perm.app || 'This spender'} can move{' '}
        {perm.unbounded ? `any amount of the ${perm.token.symbol}` : `up to ${grantedText(perm)}`}
        {' '}in {canAct ? 'your account' : 'this account'} without asking again, until the
        allowance is used or removed.
      </p>

      {!perm.app && (
        <p className="d-unknown">
          We have not confirmed what this contract is. It is shown by address
          rather than given a name we cannot stand behind.
        </p>
      )}

      <p className="rule-label">What this exposes</p>
      <dl className="d-rows">
        <div className="row">
          <dt>Access granted</dt>
          <dd>{grantedText(perm)}</dd>
        </div>
        <div className="row">
          <dt>{canAct ? 'You hold' : 'Account holds'}</dt>
          <dd>{amount(perm.token.balance, perm.token.decimals, perm.token.symbol)}</dd>
        </div>
        <div className="row">
          <dt>Reachable now</dt>
          <dd>{reachableText(perm)}</dd>
        </div>
        <div className="row">
          <dt>Future deposits</dt>
          <dd>{perm.unbounded ? 'Also exposed' : 'Exposed up to the limit'}</dd>
        </div>
        <div className="row">
          <dt>Access ends</dt>
          <dd>Never</dd>
        </div>
      </dl>

      <details className="evidence">
        <summary>Evidence</summary>
        <dl className="d-rows">
          <div className="row">
            <dt>Beneficiary</dt>
            <dd>{perm.spenderShort}</dd>
          </div>
          <div className="row">
            <dt>Token</dt>
            <dd>{perm.token.symbol || 'Unreadable'}</dd>
          </div>
          <div className="row">
            <dt>Standard</dt>
            <dd>ERC-20 approve</dd>
          </div>
          <div className="row">
            <dt>Raw allowance</dt>
            <dd>{perm.allowance.toString().slice(0, 22)}{perm.allowance.toString().length > 22 ? '…' : ''}</dd>
          </div>
        </dl>
        {explorer && (
          <p className="ev-note">
            <a href={`${explorer}/address/${perm.spender}`} target="_blank" rel="noopener">
              Spender on the explorer
            </a>
            {' · '}
            <a href={`${explorer}/address/${perm.token.address}`} target="_blank" rel="noopener">
              Token
            </a>
          </p>
        )}
        <p className="ev-note">
          Read directly from the chain with allowance(owner, spender). No index,
          no third party.
        </p>
      </details>

      <div className="d-actions">
        {canAct && (
          <button type="button" className="btn" onClick={() => onAct('revoke')}>
            Revoke
          </button>
        )}
        <button type="button" className="txt" onClick={onClose}>
          Close
        </button>
      </div>

      {canAct ? (
        /* UX §62 and remediate.js — a non-zero allowance is not replaced in one
           step, so the only correction offered here is removal. */
        <p className="d-note">
          Only revoke is offered. Replacing one live allowance with a smaller one
          is two transactions and some tokens revert on the first, so this screen
          does not pretend it is one click.
        </p>
      ) : (
        <p className="d-note">
          This is someone else&rsquo;s permission, so there is nothing to correct
          here. Only the holder of the account can withdraw it.
        </p>
      )}
    </aside>
  );
}
