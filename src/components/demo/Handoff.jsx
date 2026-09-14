import { useEffect, useState } from 'react';
import { createPublicClient, custom } from 'viem';
import { send } from '../../lib/wallet.js';
import { buildRevoke } from '../../lib/remediate.js';
import { readAllowance } from '../../lib/scan.js';
import { grantedText } from '../../lib/assess.js';

/**
 * The wallet handoff, screens L08 to L13 of the UX Specification. Headers and
 * supporting copy are lifted verbatim.
 *
 * UX §51, the wallet handoff principle: TX Guard must never create ambiguity
 * about where authorization happens. The payload is built here, shown here as
 * raw calldata anyone can decode, and signed only in the wallet. There is no
 * second approve button on this screen while the wallet prompt is open.
 *
 * L12 and L13 are a real verification, not a success message. After the
 * receipt lands the allowance is read back, and if the chain disagrees with
 * what was intended the mismatch is shown rather than a tick.
 */
export default function Handoff({ perm, action, chain, owner, provider, onCancel, onSettle }) {
  const [stage, setStage] = useState('ready'); // ready|wallet|pending|verifying|verified|mismatch|rejected|failed
  const [hash, setHash] = useState(null);
  const [after, setAfter] = useState(null);
  const [error, setError] = useState(null);

  const tx = buildRevoke({ token: perm.token.address, spender: perm.spender });

  async function handOver() {
    setStage('wallet');
    setError(null);
    try {
      const h = await send(provider, { ...tx, from: owner });
      setHash(h);
      setStage('pending');
    } catch (e) {
      /* UX §53 — a wallet rejection is not a failed transaction, and must not
         be called one. Nothing was submitted and nothing changed. */
      const rejected = e.code === 4001 || /reject|denied/i.test(e.message || '');
      setError(e.shortMessage || e.message);
      setStage(rejected ? 'rejected' : 'failed');
    }
  }

  useEffect(() => {
    if (stage !== 'pending' || !hash) return undefined;
    let live = true;

    (async () => {
      try {
        const client = createPublicClient({ transport: custom(provider) });
        const receipt = await client.waitForTransactionReceipt({ hash });
        if (!live) return;

        if (receipt.status !== 'success') {
          /* UX §61 — the transaction did not establish the expected
             permission. That is all we know, so that is all we say. */
          setStage('failed');
          setError('The transaction did not complete successfully.');
          return;
        }

        setStage('verifying');
        const value = await readAllowance({
          chainId: chain.id,
          owner,
          spender: perm.spender,
          token: perm.token.address,
          provider,
        });
        if (!live) return;

        setAfter(value);
        setStage(value === 0n ? 'verified' : 'mismatch');
      } catch (e) {
        if (!live) return;
        setError(e.shortMessage || e.message);
        setStage('failed');
      }
    })();

    return () => {
      live = false;
    };
  }, [stage, hash]); // eslint-disable-line react-hooks/exhaustive-deps

  const explorer = chain?.explorer && hash ? `${chain.explorer}/tx/${hash}` : null;

  return (
    <div className="handoff-wrap" role="dialog" aria-modal="true" aria-label="Wallet handoff">
      <article className="handoff">
        {stage === 'ready' && (
          <>
            <p className="rule-label">Ready for your wallet</p>
            <dl className="d-rows">
              <div className="row">
                <dt>Application</dt>
                <dd>{perm.app || perm.spenderShort}</dd>
              </div>
              <div className="row">
                <dt>Access now</dt>
                <dd>{grantedText(perm)}</dd>
              </div>
              <div className="row lead">
                <dt>Access after</dt>
                <dd>None</dd>
              </div>
            </dl>

            <p className="h-body">
              Your wallet will ask you to sign. TX Guard cannot sign for you.
            </p>
            <p className="h-unsigned">This payload is unsigned. We hand it over and stop.</p>

            <details className="evidence">
              <summary>The exact calldata</summary>
              <pre className="calldata">{tx.data}</pre>
              <p className="ev-note">
                approve({perm.spenderShort}, 0) on {perm.token.symbol}. Decode it
                yourself before you sign it.
              </p>
            </details>

            <div className="d-actions">
              <button type="button" className="btn" onClick={handOver}>
                Continue to wallet
              </button>
              <button type="button" className="txt" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </>
        )}

        {stage === 'wallet' && (
          <>
            <p className="rule-label">Confirm in your wallet</p>
            <p className="h-body">
              Review the permission in your wallet and confirm when you are ready.
            </p>
            <p className="h-wait" aria-live="polite"><span className="h-bar" /></p>
            <div className="d-actions">
              <button type="button" className="txt" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </>
        )}

        {(stage === 'pending' || stage === 'verifying') && (
          <>
            <p className="rule-label">
              {stage === 'pending' ? 'Waiting for confirmation' : 'Verifying the permission'}
            </p>
            <p className="h-body">
              {stage === 'pending'
                ? `Waiting for ${chain.name} to confirm the change.`
                : 'Transaction confirmed. Checking current access.'}
            </p>
            <p className="h-wait" aria-live="polite"><span className="h-bar" /></p>
            {explorer && (
              <p className="ev-note">
                <a href={explorer} target="_blank" rel="noopener">View transaction</a>
              </p>
            )}
          </>
        )}

        {stage === 'verified' && (
          <>
            <p className="rule-label seal">Access successfully removed</p>
            <dl className="d-rows">
              <div className="row">
                <dt>Before</dt>
                <dd className="was">{grantedText(perm)}</dd>
              </div>
              <div className="row lead">
                <dt>After</dt>
                <dd className="now">None</dd>
              </div>
            </dl>
            <p className="h-body">
              Read back from {chain.name}. The stated intent and the resulting
              state agree.
            </p>
            {explorer && (
              <p className="ev-note">
                <a href={explorer} target="_blank" rel="noopener">View transaction</a>
              </p>
            )}
            <div className="d-actions">
              <button type="button" className="btn" onClick={onSettle}>
                Back to permissions
              </button>
            </div>
          </>
        )}

        {stage === 'mismatch' && (
          <>
            {/* UX §60 — never call this success. */}
            <p className="rule-label">The result does not match the expected permission</p>
            <p className="h-body">
              The transaction confirmed, but the allowance still reads{' '}
              {after?.toString()}. Read it again before relying on it.
            </p>
            <div className="d-actions">
              <button type="button" className="btn" onClick={onSettle}>
                Back to permissions
              </button>
            </div>
          </>
        )}

        {stage === 'rejected' && (
          <>
            <p className="rule-label">Permission not approved</p>
            <p className="h-body">Nothing was changed.</p>
            <div className="d-actions">
              <button type="button" className="btn" onClick={() => setStage('ready')}>
                Try again
              </button>
              <button type="button" className="txt" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </>
        )}

        {stage === 'failed' && (
          <>
            <p className="rule-label">Permission was not changed</p>
            <p className="h-body">{error || 'The transaction did not complete successfully.'}</p>
            <p className="ev-note">
              We only know this transaction did not establish the expected
              permission. Nothing else is implied.
            </p>
            <div className="d-actions">
              <button type="button" className="btn" onClick={() => setStage('ready')}>
                Try again
              </button>
              <button type="button" className="txt" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
