import { useEffect, useState } from 'react';
import { createPublicClient, custom } from 'viem';
import { send } from '../../lib/wallet.js';
import { remediation, permissions, format, say } from '../../lib/api.js';
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
  const [stage, setStage] = useState('loading'); // loading|ready|settled|unbuildable|wallet|pending|verifying|verified|mismatch|rejected|failed
  const [hash, setHash] = useState(null);
  const [after, setAfter] = useState(null);
  const [error, setError] = useState(null);
  const [tx, setTx] = useState(null);
  /* Bumped when a step lands and another remains, which sends the effect
     below back to the engine. Resumption is a re-read: the engine reads the
     allowance again and answers with whatever is still outstanding, so
     nothing about a half-done correction is held here. */
  const [round, setRound] = useState(0);

  const granted = perm.unreadable ? 'Did not answer'
    : say(perm.granted, perm.decimals, perm.symbol);

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
        /* THE BYTES ARE CHECKED AGAINST THE ASK. The engine now builds a
           boundary as well as a removal, so this ordinarily passes — but it
           stays, because it is the check and not the capability. A plan that
           answers a request for a limit with a removal would set the allowance
           to zero while the screen said otherwise, which is the exact failure
           this whole product exists to prevent. A plan that does not do what
           was asked is not offered for signature; it is shown and stopped. */
        if (wants === 'limit' && plan.action !== 'LIMIT') {
          setTx(plan);
          setStage('unbuildable');
          return;
        }
        setTx(plan);
        /* NOTHING_TO_DO is a 200 and a state, not a failure: the chain is
           already where the correction was aiming. It is what a finished
           correction looks like, and what one somebody else already made
           looks like, so it is shown rather than raised. */
        setStage(plan.status === 'NOTHING_TO_DO' ? 'settled' : 'ready');
      })
      .catch((e) => { if (live) { setError(e); setStage('failed'); } });
    return () => { live = false; };
  }, [chainId, owner, perm.asset, perm.beneficiary, wants, intent?.amount, round]);

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

        /* Matched on the pair, not on the id. The id on `perm` is the one
           the dashboard built by prefixing the chain to the engine's, so
           comparing the two never matched a row: a revoke read back as
           verified because nothing was found, and a limit read back as a
           mismatch for the same reason. The asset and the beneficiary are
           what a permission is, and they come from the chain unchanged. */
        const still = (fresh.permissions || []).find(
          (p) => p.asset.toLowerCase() === perm.asset.toLowerCase()
            && p.beneficiary.toLowerCase() === perm.beneficiary.toLowerCase(),
        );
        setAfter(still);

        /* CHECKED AGAINST WHAT THIS STEP SAID THE CHAIN WOULD READ, and only
           where the read-back is a figure.
         *
           It used to be `BigInt(still.granted ?? '0') <= BigInt(intent.amount)`,
           which turned three different absences into the same zero: a row
           that is not there, an allowance with no ceiling, and a reading that
           did not answer. Zero passes every "no larger than what was asked
           for" test there is, so an unreadable read-back would have printed
           "Access successfully limited" over an allowance nobody had seen.
         *
           So the kind decides, and only FINITE is compared. Anything else
           settles as a mismatch — the direction that withholds the tick,
           because the tick is the one thing a person cannot take back. */
        const kind = still ? still.granted?.kind : 'NONE';
        const want = tx?.expectedAfter;
        let ok = false;
        if (want?.kind === 'NONE') {
          ok = !still || kind === 'NONE';
        } else if (want?.kind === 'FINITE' && kind === 'FINITE') {
          try { ok = BigInt(still.granted.amount) <= BigInt(want.amount); } catch { ok = false; }
        }

        if (!ok) { setStage('mismatch'); return; }
        /* Narrowing a live allowance is zero-then-set on the tokens that
           revert otherwise, and the zeroing has just landed. Ask again rather
           than assume: the engine reads the chain and hands back the one step
           that remains. */
        if ((tx?.stepsRemaining ?? 1) > 1) { setStage('loading'); setRound((n) => n + 1); return; }
        setStage('verified');
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
                {/* The allowance the plan was derived from, at the block it
                    was read at — not the figure the row carried when this
                    screen opened. On the second step of a narrowing those are
                    different, and the one the plan acts on is this one. */}
                <dd>{tx.basis ? say(tx.basis.allowance, perm.decimals, perm.symbol) : granted}</dd>
              </div>
              <div className="row lead">
                <dt>Access after</dt>
                {/* After THIS transaction, which on a two-step narrowing is
                    not yet the boundary that was asked for. Printing the
                    final target on the zeroing step would be the screen
                    describing a state the chain will not be in. */}
                <dd>{say(tx.expectedAfter, perm.decimals, perm.symbol)}</dd>
              </div>
            </dl>

            {tx.stepsTotal > 1 && (
              <p className="ev-note">
                Step {(tx.stepsCompleted ?? 0) + 1} of {tx.stepsTotal} · {tx.step?.label}.
                {' '}{tx.step?.why} The correction ends at {leaves}.
              </p>
            )}
            {tx.caveat && <p className="h-body">{tx.caveat}</p>}

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

        {/* Already where the correction was aiming. Nothing to sign, and
            nothing went wrong. */}
        {stage === 'settled' && (
          <>
            <p className="rule-label seal">There is nothing left to do</p>
            <p className="h-body">
              {chain?.name || 'The chain'} already reads {leaves.toLowerCase() === 'none' ? 'no allowance' : leaves}{' '}
              for {perm.label || 'this spender'}, so the engine has no transaction to build.
              That is either a correction that has already landed or one somebody else made.
            </p>
            <p className="ev-note">
              Read back from the chain at block {tx?.basis?.blockNumber}. Nothing was signed.
            </p>
            <div className="d-actions">
              <Button onClick={onSettle}>Back to permissions</Button>
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
              A limit was asked for. The engine returned something else,
              <code> {tx?.decodesTo}</code>, so nothing is offered for signature
              here. Handing it over would have changed the allowance to a figure
              other than the one on the button.
            </p>
            <p className="h-unsigned">
              This is the check refusing rather than the correction failing, and
              it is the reason the control can exist at all. The honest options
              are to remove the permission or to leave it.
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
              The transaction confirmed, and the chain does not read back what
              this step said it would. {after
                ? `It now reads ${say(after.granted, after.decimals, after.symbol)}.`
                : 'The permission was not found on the read-back.'}
              {' '}Read it again before relying on it.
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
