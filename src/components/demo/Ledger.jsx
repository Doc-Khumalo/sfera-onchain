import { useEffect, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { parseUnits } from 'viem';
import { reading } from '../../lib/readings.js';
import { format } from '../../lib/api.js';
import { AssetMark } from '../ui/AssetMark.jsx';
import { Tooltip, TooltipProvider } from '../ui/Tooltip.jsx';
import { Amount } from '../ui/Counter.jsx';
import {
  PermissionTable, PermissionRows, PermissionRow, AppCell, StateChip,
} from '../ui/PermissionTable.jsx';

/**
 * One row per live permission, on the same table `/` shows.
 *
 * THE ROWS ARE A LIST OF THINGS TO SEE TO. Every row used to offer Revoke,
 * including the ones already bounded, already expired, already removed — which
 * made a wallet in good order look like five outstanding problems and left a
 * reader to work out, row by row, which ones actually wanted anything from
 * them. Most permissions need nothing. Saying so is what turns a wall of red
 * into a short list with an end to it, and the end is the point: a person
 * should be able to finish.
 *
 * So the action column carries the task and nothing else: the one thing to do
 * where there is one, a tick where it is already settled, and the plain truth
 * where nothing can be offered. The menu beside it holds the rest.
 *
 * THE BEFORE AND AFTER IS THE PRODUCT. When a permission is removed the row
 * does not blink from one state to another: the old value is struck through by
 * a line that travels across it, the new value rises underneath, and the row
 * settles from mint back to its ground. A person should watch the change
 * happen rather than find it already done, because the change is the thing
 * they came here to cause.
 *
 * Rows stay in place rather than leaving the list. A revoked permission is
 * still a fact about this wallet, and removing it from view would hide the
 * evidence that the correction worked.
 */

/* The reading maps to the shared chip and row classes in global.css. UNKNOWN
   is deliberately not quiet: an authority we could not read is a fact. */
const TONES = {
  UNBOUNDED: 'bad', OVER_WIDE: 'wide', BOUNDED: 'ok',
  REMOVED: 'gone', EXPIRED: 'old', UNKNOWN: 'unk',
};
const tone = (p) => TONES[p.reading] || 'unk';

/* Unlimited is a word, not a figure, and there is nothing to count up to.
   Everything else climbs — see ui/Counter.jsx. */
const Allowance = ({ p }) =>
  p.unbounded ? <>Unlimited</> : <Amount raw={p.granted} decimals={p.decimals} symbol={p.symbol} />;

const Reach = ({ p }) =>
  p.reachableNow == null ? <>—</> : <Amount raw={p.reachableNow} decimals={p.decimals} symbol={p.symbol} />;

/* What the engine actually knows about expiry. The payload carries no expiry
   field, so this comes from its own reasoning: decide.go emits "no expiry"
   among the reasons for an unbounded permission, and EXPIRED and REMOVED say
   it outright. Anything else is genuinely unknown and says so. */
function expiry(p) {
  if ((p.because ?? []).some((b) => /no expiry/i.test(b))) return 'never';
  if (p.reading === 'EXPIRED') return 'expired';
  if (p.reading === 'REMOVED') return 'removed';
  return '—';
}

/* Whether this row is asking anything of the reader. UNKNOWN is deliberately
   not a task: DECISION §75 forbids offering a correction for an authority we
   could not read, and a task nobody can complete is worse than none. */
const isTask = (p) => p.attention && p.remediable;

/* ---- the menu on the row ------------------------------------------------
 *
 * The row's other actions, and the boundary editor. A row carries one verb in
 * the open — the thing to do — and everything else lives one click away, so a
 * table of ten permissions is not a table of forty controls.
 */
function RowMenu({ p, canAct, explorer, onRevoke, onLimit, onOpen }) {
  const [open, setOpen] = useState(false);
  const [limiting, setLimiting] = useState(false);
  const [typed, setTyped] = useState('');
  const [bad, setBad] = useState(null);

  const link = p.chain?.explorer || explorer;
  const unreadable = !p.remediable;

  /* The figure that can be taken today is the natural cap: it is what this
     permission is actually reaching, so a limit set there changes nothing a
     person is doing and removes everything they are not. */
  const suggestion = p.reachableNow != null && p.reachableNow !== '0'
    ? format(p.reachableNow, p.decimals, null).replace(/,/g, '')
    : null;

  function shut() { setOpen(false); setLimiting(false); setTyped(''); setBad(null); }

  function prepare(value) {
    const v = String(value).trim().replace(/,/g, '');
    if (!v || !/^\d*\.?\d*$/.test(v) || Number(v) <= 0) {
      setBad('A limit is a positive amount.');
      return;
    }
    let base;
    try { base = parseUnits(v, p.decimals ?? 0).toString(); }
    catch { setBad('That is not an amount this token can hold.'); return; }
    shut();
    onLimit(p, { amount: base, shown: `${v} ${p.symbol || ''}`.trim() });
  }

  return (
    <Popover.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : shut())}>
      <Popover.Trigger asChild>
        <button type="button" className="rowmenu-trigger" aria-label={`More for ${p.label || 'this permission'}`}>
          <svg viewBox="0 0 14 4" aria-hidden="true">
            <circle cx="2" cy="2" r="1.4" /><circle cx="7" cy="2" r="1.4" /><circle cx="12" cy="2" r="1.4" />
          </svg>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        {/* Portalled to <body>, so it carries the ledger's root class or every
            rule scoped to `.dash` stops at its edge. */}
        <Popover.Content className="rowmenu dash" align="end" sideOffset={8} collisionPadding={16}>
          <p className="rowmenu-head">
            <b>{p.label || 'This permission'}</b>
            <span>{p.chain?.name} · {p.symbol || 'Unreadable contract'}</span>
          </p>

          {limiting ? (
            <div className="rowmenu-limit">
              <label htmlFor={`lim-${p.id}`}>Allow no more than</label>
              <div className="rowmenu-field">
                <input
                  id={`lim-${p.id}`}
                  value={typed}
                  onChange={(e) => { setTyped(e.target.value); setBad(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); prepare(typed); } }}
                  placeholder="0.00"
                  inputMode="decimal"
                  spellCheck="false"
                  autoComplete="off"
                  autoFocus
                />
                <span>{p.symbol}</span>
              </div>
              {suggestion && (
                <button type="button" className="rowmenu-suggest" onClick={() => setTyped(suggestion)}>
                  Use what it reaches today · {format(p.reachableNow, p.decimals, p.symbol)}
                </button>
              )}
              {bad && <p className="rowmenu-bad">{bad}</p>}
              <div className="rowmenu-go">
                <button type="button" className="a-pill a-pill-go" onClick={() => prepare(typed)}>
                  Prepare the limit
                </button>
                <button type="button" className="rowmenu-back" onClick={() => setLimiting(false)}>Back</button>
              </div>
              {/* The page states the intent; the engine builds the bytes; the
                  handoff refuses anything that does not decode to what was
                  asked for. That check is the reason this control can exist
                  before the engine can answer it. */}
              <p className="rowmenu-note">
                The engine builds the transaction. Your wallet signs it, and the
                result is read back from the chain.
              </p>
            </div>
          ) : (
            <ul className="rowmenu-list">
              <li>
                <button type="button" disabled={!canAct || unreadable} onClick={() => setLimiting(true)}>
                  <span>Limit to an amount</span>
                  <em>Keep it working, cap what it can take</em>
                </button>
              </li>
              <li>
                <button type="button" disabled={!canAct || unreadable} onClick={() => { shut(); onRevoke(p); }}>
                  <span>Revoke entirely</span>
                  <em>Set the allowance to zero</em>
                </button>
              </li>
              <li>
                <button type="button" onClick={() => { shut(); onOpen(p.id); }}>
                  <span>Why this reading</span>
                  <em>What was asked, and what came back</em>
                </button>
              </li>
              {link && (
                <li>
                  <a href={`${link}/address/${p.beneficiary}`} target="_blank" rel="noopener" onClick={shut}>
                    <span>Inspect the spender</span>
                    <em>{p.beneficiary.slice(0, 10)}…{p.beneficiary.slice(-6)}</em>
                  </a>
                </li>
              )}
            </ul>
          )}

          {!limiting && unreadable && (
            <p className="rowmenu-note">
              No correction is offered for a permission we could not read.
              Narrowing an authority we cannot see is how false confidence starts.
            </p>
          )}
          {!limiting && !unreadable && !canAct && (
            <p className="rowmenu-note">
              Reading a public address. Connect this wallet to change what it
              has granted.
            </p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* Where this page and `/` legitimately part: there, the action column
   reports what was done; here it offers what can be done — and, far more
   often, says that nothing needs doing. */
function Actions({ p, canAct, explorer, onRevoke, onLimit, onOpen }) {
  const task = isTask(p);

  return (
    <>
      {task ? (
        <Tooltip label={canAct
          ? 'Builds an unsigned transaction. Your wallet signs it.'
          : 'Connect this wallet to change its permissions.'}>
          {/* A disabled button fires no pointer events, so the trigger wraps
              it. Without this the explanation is unreachable exactly when it
              is needed. */}
          <span className="inline-flex">
            <button
              type="button"
              className={`a-pill ${canAct ? 'a-pill-go' : 'a-pill-off'}`}
              disabled={!canAct}
              onClick={() => onRevoke(p)}
            >
              Revoke
            </button>
          </span>
        </Tooltip>
      ) : (
        <span className={`a-none${p.reading === 'UNKNOWN' ? '' : ' done'}`}>
          {p.reading === 'UNKNOWN' ? 'Cannot correct' : 'Nothing needed'}
        </span>
      )}

      <RowMenu p={p} canAct={canAct} explorer={explorer}
        onRevoke={onRevoke} onLimit={onLimit} onOpen={onOpen} />
    </>
  );
}

function Row({ p, was, open, canAct, explorer, onOpen, onRevoke, onLimit }) {
  const changed = was && was.granted !== p.granted;

  /* Settling is a fact about this render, not about the data: the row glows
     once, when the figure it is showing is not the figure it was showing a
     moment ago. */
  const [settling, setSettling] = useState(false);
  const seen = useRef(p.granted);

  useEffect(() => {
    if (seen.current === p.granted) return undefined;
    seen.current = p.granted;
    setSettling(true);
    const t = setTimeout(() => setSettling(false), 1500);
    return () => clearTimeout(t);
  }, [p.granted]);

  return (
    <PermissionRow
      tone={tone(p)}
      className={isTask(p) ? 'is-task' : undefined}
      open={open}
      settling={settling}
      onOpen={() => onOpen(p.id)}

      app={
        <AppCell
          mark={<AssetMark symbol={p.symbol} chain={p.chain} size={28} />}
          name={p.label || `${p.beneficiary.slice(0, 6)}…${p.beneficiary.slice(-4)}`}
          meta={`${p.symbol || 'Unreadable contract'} · ${p.chain?.name ?? '—'}`}
        />
      }

      allowance={
        changed ? (
          <span className="a-sw-live">
            <span className="was-value">{format(was.granted, p.decimals, p.symbol)}</span>
            <span className="now-value"><Allowance p={p} /></span>
          </span>
        ) : (
          <span className={p.unbounded ? 'bad' : undefined}><Allowance p={p} /></span>
        )
      }

      reachable={<span className={p.attention ? 'bad' : undefined}><Reach p={p} /></span>}
      expires={expiry(p)}
      state={<StateChip tone={tone(p)}>{reading(p.reading).label}</StateChip>}
      action={
        <Actions p={p} canAct={canAct} explorer={explorer}
          onRevoke={onRevoke} onLimit={onLimit} onOpen={onOpen} />
      }
    />
  );
}

/**
 * Nothing to show, shown properly.
 *
 * A filter that matches nothing used to leave the table with a head and no
 * body, and put its explanation in a paragraph below the console — so the one
 * thing on screen was an empty frame, and a reader who had arrived at that
 * state first learned nothing about what this table is or what it holds. The
 * shape stays. The figures that would be there read zero, because zero is what
 * was found, and the row says where it looked.
 */
function NothingRow({ empty, columns = 6 }) {
  return (
    <tbody>
      <tr className="rs-unk is-nothing">
        <td data-col="Application">
          <AppCell
            mark={<span className="a-chain a-chain-none" aria-hidden="true" />}
            name={empty?.title ?? 'Nothing here'}
            meta={empty?.where ?? '—'}
          />
        </td>
        <td data-col="Allowance"><span className="quiet">0</span></td>
        <td data-col="Reachable"><span className="quiet">0</span></td>
        <td data-col="Expires" className="quiet">—</td>
        <td data-col="State"><StateChip tone="unk">Nothing found</StateChip></td>
        <td data-col="Action">
          <span className="a-do">
            {empty?.onReset && (
              <button type="button" className="a-pill a-pill-gone" onClick={empty.onReset}>
                Show everything read
              </button>
            )}
          </span>
        </td>
      </tr>
    </tbody>
  );
}

export default function Ledger({
  rows, previous, openId, canAct, explorer, empty, onOpen, onRevoke, onLimit,
}) {
  const anyUnreadable = rows.some((p) => !p.remediable);

  return (
    <TooltipProvider>
      <div className="lpanel">
        <PermissionTable>
          {rows.length === 0 ? (
            <NothingRow empty={empty} />
          ) : (
            /* No entrance. The rows lifted in one after another, which made the
               table itself look like the event — and the table is not the
               event, the figures in it are. It is simply there, and the numbers
               climb inside it until they settle. */
            <PermissionRows>
              {rows.map((p) => (
                <Row
                  key={p.id}
                  p={p}
                  was={previous?.[p.id]}
                  open={openId === p.id}
                  canAct={canAct}
                  explorer={explorer}
                  onOpen={onOpen}
                  onRevoke={onRevoke}
                  onLimit={onLimit}
                />
              ))}
            </PermissionRows>
          )}
        </PermissionTable>

        {empty?.note && rows.length === 0 && <p className="lnote">{empty.note}</p>}

        {rows.length > 0 && !canAct && (
          <p className="lnote">
            Reading a public address, so nothing here can be changed.
            <span> Connect this wallet to revoke its permissions.</span>
          </p>
        )}
        {rows.length > 0 && canAct && anyUnreadable && (
          <p className="lnote">
            One permission could not be read, so no correction is offered for it.
            <span> Unknown is not a finding of no issue.</span>
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
