import { useEffect, useState } from 'react';
import { createPublicClient, custom } from 'viem';
import { send } from '../../lib/wallet.js';
import { remediation, permissions, format } from '../../lib/api.js';
import { explain } from '../../lib/readings.js';
import { Dialog, DialogContent } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';

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
export default function Handoff({ perm, intent, chain, chainId, owner, provider, explorer, onCancel, onSettle }) {
  const [stage, setStage] = useState('loading'); // loading|ready|wallet|pending|verifying|verified|mismatch|rejected|failed
  const [hash, setHash] = useState(null);
  const [after, setAfter] = useState(null);
  const [error, setError] = useState(null);
  const [tx, setTx] = useState(null);

  const granted = perm.unbounded ? 'Unlimited' : format(perm.granted, perm.decimals, perm.symbol);

  /* What was asked for, in the words the row used. A limit keeps the
     permission and caps it; a revoke removes it. Every screen below says which
     one this is, because "the correction" is two different transactions. */
  const wants = intent?.kind === 'limit' ? 'limit' : 'revoke';
  const leaves = wants === 'limit' ? intent.shown : 'None';

  /* The correction is constructed by the engine, not here. This page cannot
     build authority-changing calldata and should not be trusted to: one
     implementation, tested, with the bytes pinned against the other. */
  useEffect(() => {
    let live = true;
    remediation(chainId, owner, perm.asset, perm.beneficiary, wants === 'limit' ? intent.amount : undefined)
      .then((plan) => {
        if (!live) return;
        /* THE BYTES ARE CHECKED AGAINST THE ASK. The engine builds one
           correction today — approve(spender, 0) — and answers a request for a
           boundary with it regardless. Handing that over under a button that
           said "limit" would set the allowance to zero while the screen
           claimed otherwise, which is the exact failure this whole product
           exists to prevent. So a plan that does not do what was asked is not
           offered for signature; it is shown, named, and stopped. */
        if (wants === 'limit' && plan.action !== 'LIMIT') {
          setTx(plan);
          setStage('unbuildable');
          return;
        }
        setTx(plan);
        setStage('ready');
      })
      .catch((e) => { if (live) { setError(e); setStage('failed'); } });
    return () => { live = false; };
  }, [chainId, owner, perm.asset, perm.beneficiary, wants, intent?.amount]);

  async function handOver() {
    setStage('wallet');
    setError(null);
    try {
      const h = await send(provider, { to: tx.to, data: tx.data, value: tx.value, from: owner });
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
        /* Verified by re-reading through the engine, which reads the chain
           again rather than trusting the receipt. L12 and L13 are a real
           verification, not a success message. */
        const fresh = await permissions(chainId, owner);
        if (!live) return;

        const still = (fresh.permissions || []).find(
          (p) => p.id.toLowerCase() === perm.id.toLowerCase(),
        );
        setAfter(still);

        /* A revoke is verified by the permission being gone. A limit is
           verified by it still being there and no larger than what was asked
           for — the opposite test, on the same data. One check for both would
           report every successful limit as a failure. */
        if (wants === 'limit') {
          let ok = false;
          try { ok = !!still && BigInt(still.granted ?? '0') <= BigInt(intent.amount); } catch { ok = false; }
          setStage(ok ? 'verified' : 'mismatch');
        } else {
          setStage(still ? 'mismatch' : 'verified');
        }
      } catch (e) {
        if (!live) return;
        setError(e);
        setStage('failed');
      }
    })();

    return () => {
      live = false;
    };
  }, [stage, hash]); // eslint-disable-line react-hooks/exhaustive-deps

  const txUrl = explorer && hash ? `${explorer}/tx/${hash}` : null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent
        title="Wallet handoff"
        description="An unsigned transaction is prepared here and signed in your own wallet."
      >
      <div className="handoff-body">
        {stage === 'loading' && (
          <>
            <p className="rule-label">Preparing the correction</p>
            <p className="h-body">Asking the engine to construct an unsigned payload.</p>
            <p className="h-wait" aria-live="polite"><span className="h-bar" /></p>
          </>
        )}

        {stage === 'ready' && tx && (
          <>
            <p className="rule-label">Ready for your wallet</p>
            <dl className="d-rows">
              <div className="row">
                <dt>Application</dt>
                <dd>{perm.label || `${perm.beneficiary.slice(0, 6)}…${perm.beneficiary.slice(-4)}`}</dd>
              </div>
              <div className="row">
                <dt>Access now</dt>
                <dd>{granted}</dd>
              </div>
              <div className="row lead">
                <dt>Access after</dt>
                <dd>{leaves}</dd>
              </div>
            </dl>

            <p className="h-body">
              Your wallet will ask you to sign. TX Guard cannot sign for you.
            </p>
            <p className="h-unsigned">This payload is unsigned. We hand it over and stop.</p>

            <details className="evidence">
              <summary>The exact calldata</summary>
              <pre className="calldata">{tx?.data}</pre>
              <p className="ev-note">
                {tx?.decodesTo || `approve(${perm.beneficiary}, 0)`}. Decode it
                yourself before you sign it.
              </p>
            </details>

            <div className="d-actions">
              <Button onClick={handOver}>Continue to wallet</Button>
              <Button variant="link" onClick={onCancel}>Cancel</Button>
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
              <Button variant="link" onClick={onCancel}>Cancel</Button>
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
                ? `Waiting for ${chain?.name || 'the chain'} to confirm the change.`
                : 'Transaction confirmed. Checking current access.'}
            </p>
            <p className="h-wait" aria-live="polite"><span className="h-bar" /></p>
            {txUrl && (
              <p className="ev-note">
                <a href={txUrl} target="_blank" rel="noopener">View transaction</a>
              </p>
            )}
          </>
        )}

        {/* Asked for one thing, handed another. Nothing is signed from here. */}
        {stage === 'unbuildable' && (
          <>
            <p className="rule-label">This cannot be built yet</p>
            <p className="h-body">
              A limit was asked for. The engine returned a removal instead,
              <code> {tx?.decodesTo}</code>, so nothing is offered for signature
              here. It would have set the allowance to zero under a button that
              said otherwise.
            </p>
            <p className="h-unsigned">
              Setting a boundary needs one change in the engine, and this screen
              starts working the day it lands. Until then the honest options are
              to remove the permission or to leave it.
            </p>
            <div className="d-actions">
              <Button onClick={() => { setStage('loading'); onCancel(); }}>Leave it as it is</Button>
              <Button variant="link" onClick={onCancel}>Cancel</Button>
            </div>
          </>
        )}

        {stage === 'verified' && (
          <>
            <p className="rule-label seal">
              {wants === 'limit' ? 'Access successfully limited' : 'Access successfully removed'}
            </p>
            <dl className="d-rows">
              <div className="row">
                <dt>Before</dt>
                <dd className="was">{granted}</dd>
              </div>
              <div className="row lead">
                <dt>After</dt>
                <dd className="now">{leaves}</dd>
              </div>
            </dl>
            <p className="h-body">
              Read back from {chain?.name || 'the chain'}. The stated intent and the resulting
              state agree.
            </p>
            {txUrl && (
              <p className="ev-note">
                <a href={txUrl} target="_blank" rel="noopener">View transaction</a>
              </p>
            )}
            <div className="d-actions">
              <Button onClick={onSettle}>Back to permissions</Button>
            </div>
          </>
        )}

        {stage === 'mismatch' && (
          <>
            {/* UX §60 — never call this success. */}
            <p className="rule-label">The result does not match the expected permission</p>
            <p className="h-body">
              The transaction confirmed, but the permission is still present.
              Read it again before relying on it.
            </p>
            <div className="d-actions">
              <Button onClick={onSettle}>Back to permissions</Button>
            </div>
          </>
        )}

        {stage === 'rejected' && (
          <>
            <p className="rule-label">Permission not approved</p>
            <p className="h-body">Nothing was changed.</p>
            <div className="d-actions">
              <Button onClick={() => setStage('ready')}>Try again</Button>
              <Button variant="link" onClick={onCancel}>Cancel</Button>
            </div>
          </>
        )}

        {stage === 'failed' && (
          <>
            <p className="rule-label">Permission was not changed</p>
            <p className="h-body">{error ? explain(error) : 'The transaction did not complete successfully.'}</p>
            <p className="ev-note">
              We only know this transaction did not establish the expected
              permission. Nothing else is implied.
            </p>
            <div className="d-actions">
              <Button onClick={() => setStage('ready')}>Try again</Button>
              <Button variant="link" onClick={onCancel}>Cancel</Button>
            </div>
          </>
        )}
      </div>
      </DialogContent>
    </Dialog>
  );
}
