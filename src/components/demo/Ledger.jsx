import { useEffect, useRef, useState } from 'react';
import { reading } from '../../lib/readings.js';
import { format } from '../../lib/api.js';
import { Reading } from '../ui/Reading.jsx';
import { Button } from '../ui/Button.jsx';
import { TokenMark } from '../ui/TokenMark.jsx';
import { Panel, PanelHead } from '../ui/Panel.jsx';
import { Tooltip, TooltipProvider } from '../ui/Tooltip.jsx';
import { cn } from '../../lib/cn.js';

/**
 * One row per live permission.
 *
 * THE BEFORE AND AFTER IS THE PRODUCT. When a permission is removed the row
 * does not blink from one state to another: the old value is struck through
 * by a line that travels across it, the new value rises underneath, and the
 * row settles from mint back to its ground. A person should watch the change
 * happen rather than find it already done, because the change is the thing
 * they came here to cause.
 *
 * Rows stay in place rather than leaving the list. A revoked permission is
 * still a fact about this wallet, and removing it from view would hide the
 * evidence that the correction worked.
 */
function Row({ p, previous, canAct, explorer, open, onOpen, onRevoke }) {
  const r = reading(p.reading);
  const changed = previous && previous.granted !== p.granted;
  const [settling, setSettling] = useState(false);
  const seen = useRef(p.granted);

  useEffect(() => {
    if (seen.current !== p.granted) {
      seen.current = p.granted;
      setSettling(true);
      const t = setTimeout(() => setSettling(false), 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [p.granted]);

  const granted = p.unbounded ? 'Unlimited' : format(p.granted, p.decimals, p.symbol);
  const unreadable = !p.remediable;
  const why = unreadable
    ? 'No correction is offered for a permission we cannot read.'
    : !canAct
      ? 'Connect this wallet to change its permissions.'
      : null;

  return (
    <div
      role="row"
      tabIndex={0}
      aria-expanded={open}
      onClick={() => onOpen(p.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(p.id); } }}
      className={cn(
        'grid cursor-pointer items-center gap-4 border-t border-line px-6 py-4 transition-colors',
        'grid-cols-[1.7fr_1fr_0.9fr_190px] hover:bg-deck2',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ok',
        open && 'bg-deck2',
        (p.reading === 'UNBOUNDED' || p.reading === 'OVER_WIDE') && 'row-flagged',
        settling && 'row-settled',
      )}
    >
      <span className="flex items-center gap-3.5 min-w-0">
        <TokenMark symbol={p.symbol} />
        <span className="min-w-0">
          <span className="block truncate font-display text-[15px] font-semibold leading-tight">
            {p.label || `${p.beneficiary.slice(0, 6)}…${p.beneficiary.slice(-4)}`}
          </span>
          <span className="mt-0.5 block truncate font-display text-xs text-mist">
            {p.symbol || 'Unreadable contract'} · never expires
          </span>
        </span>
      </span>

      <span className="font-mono text-[13px] tabular-nums">
        {changed ? (
          <>
            <span className="was-value block">{format(previous.granted, p.decimals, p.symbol)}</span>
            <span className="now-value mt-1 block text-ok">{granted}</span>
          </>
        ) : (
          <span className={p.unbounded ? 'text-bad' : undefined}>{granted}</span>
        )}
      </span>

      <span className="flex items-center gap-2.5">
        <Reading reading={p.reading}>{r.label.toUpperCase()}</Reading>
      </span>

      <span
        className="flex flex-wrap items-center justify-end gap-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Tooltip label={why || 'Builds an unsigned transaction. Your wallet signs it.'}>
          {/* A disabled button fires no pointer events, so the trigger wraps
              it. Without this the explanation is unreachable exactly when it
              is needed. */}
          <span className="inline-flex">
            <Button size="sm" disabled={!canAct || unreadable} onClick={() => onRevoke(p)}>
              Revoke
            </Button>
          </span>
        </Tooltip>
        {explorer && (
          <Button asChild size="sm" variant="outline">
            <a href={`${explorer}/address/${p.beneficiary}`} target="_blank" rel="noopener">Inspect</a>
          </Button>
        )}
      </span>
    </div>
  );
}

export default function Ledger({ rows, previous, openId, canAct, explorer, chain, onOpen, onRevoke }) {
  const anyUnreadable = rows.some((p) => !p.remediable);

  return (
    <TooltipProvider>
    <Panel className="lit-strong">
      <PanelHead>
        <span className="font-display text-base font-semibold">Live permissions</span>
        {chain && (
          <span className="inline-flex items-center gap-2 rounded-pill border border-line2 px-3 py-1.5 font-display text-xs text-mist">
            {chain}
          </span>
        )}
      </PanelHead>

      {/* Said once, above the table. Stamped on every row it reads as noise
          and pushes the rows apart; the per-row title attribute still carries
          it for the specific button. */}
      {!canAct && (
        <p className="border-b border-line bg-deck2 px-6 py-3 font-display text-[13px] text-mist">
          Reading a public address, so nothing here can be changed.
          <span className="text-slate"> Connect this wallet to revoke its permissions.</span>
        </p>
      )}
      {canAct && anyUnreadable && (
        <p className="border-b border-line bg-deck2 px-6 py-3 font-display text-[13px] text-mist">
          One permission could not be read, so no correction is offered for it.
          <span className="text-slate"> Unknown is not a finding of no issue.</span>
        </p>
      )}

      <div role="table" className="stagger">
        <div role="row" className="grid grid-cols-[1.7fr_1fr_0.9fr_190px] gap-4 border-b border-line px-6 py-2.5 font-mono text-[9px] tracking-[0.18em] text-slate">
          <span role="columnheader">APPLICATION</span>
          <span role="columnheader">ACCESS GRANTED</span>
          <span role="columnheader">READING</span>
          <span role="columnheader" className="text-right">ACTION</span>
        </div>

        {rows.map((p) => (
          <Row
            key={p.id}
            p={p}
            previous={previous?.[p.id]}
            canAct={canAct}
            explorer={explorer}
            open={openId === p.id}
            onOpen={onOpen}
            onRevoke={onRevoke}
          />
        ))}
      </div>
    </Panel>
    </TooltipProvider>
  );
}
