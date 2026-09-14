/**
 * The actions available on one permission.
 *
 * Every row carries the full set, always visible. Hiding an action a person
 * cannot currently take teaches them the product does less than it does; the
 * honest version shows the action, disables it, and says why in one line.
 *
 * DECISION §75 is the exception that is not about connection state: a
 * permission we could not read carries no correction at all, for anyone, and
 * that reason is different from "connect your wallet".
 */
export default function RowActions({ perm, canAct, explorer, onRevoke, compact = false }) {
  const unreadable = !perm.remediable;

  const why = unreadable
    ? 'No correction is offered for a permission we cannot read.'
    : !canAct
      ? 'Connect this wallet to change its permissions.'
      : null;

  return (
    <div className={`row-actions ${compact ? 'compact' : ''}`}>
      <button
        type="button"
        className="btn sm"
        disabled={!canAct || unreadable}
        onClick={onRevoke}
        title={why || 'Build an unsigned transaction removing this permission'}
      >
        Revoke
      </button>

      {explorer && (
        <a
          className="btn ghost sm"
          href={`${explorer}/address/${perm.beneficiary}`}
          target="_blank"
          rel="noopener"
        >
          Inspect
        </a>
      )}

      {why && <span className="ra-why">{why}</span>}
    </div>
  );
}
