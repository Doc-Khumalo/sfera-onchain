import { useEffect, useMemo, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { parseUnits } from 'viem';
import { spender } from '../../data/spenders.js';
import { reading } from '../../lib/readings.js';
import { format, say } from '../../lib/api.js';
import { AssetMark } from '../ui/AssetMark.jsx';
import { ChainMark } from '../ui/ChainMark.jsx';
import { Tooltip } from '../ui/Tooltip.jsx';
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
   Everything else climbs — see ui/Counter.jsx.

   A READING THAT DID NOT ANSWER IS NEITHER. The engine now returns the pairs
   whose allowance() failed instead of dropping them, and this cell is where
   they would otherwise land as a figure. It says what happened, because a
   blank or a nought in the allowance column is a wallet claiming to have been
   read when it was not. */
const Allowance = ({ p }) =>
  p.unreadable ? <span className="quiet">Did not answer</span>
    : p.granted?.kind === 'FINITE'
      ? <Amount raw={p.granted.amount} decimals={p.decimals} symbol={p.symbol} />
      : <>{say(p.granted, p.decimals, p.symbol)}</>;

const Reach = ({ p }) =>
  p.reachableNow == null ? <>—</> : <Amount raw={p.reachableNow} decimals={p.decimals} symbol={p.symbol} />;

/* What the engine knows about expiry. This used to match the string "no
   expiry" inside the reasons list — a sentence used as an API, which breaks
   the first time anyone rewords it. It is a field now, so it is read. */
function expiry(p) {
  if (p.expired) return 'expired';
  if (p.reading === 'REMOVED') return 'removed';
  if (p.ends?.kind === 'NEVER') return 'never';
  if (p.ends?.kind === 'AT' && p.ends.at) return new Date(p.ends.at).toLocaleDateString();
  return '—';
}

/* ---- what the row offers ------------------------------------------------
 *
 * THE ENGINE DECIDES THIS AND THIS FILE RENDERS IT. Availability used to be
 * worked out here, from `attention` and `remediable`, while the plan route
 * worked it out again from the chain. Two places deciding one thing is two
 * answers, and the one that reaches a person first is the button: an action
 * offered on the row and refused when it is pressed is the product promising
 * something it cannot do. So the row carries `actions[]` — the kind, whether
 * it is available now, its label, and the reason when it is not — and none of
 * that is recomputed here.
 *
 * Only the two this page can carry out are rendered. WATCH wants a rule
 * editor and READ_AGAIN a per-row re-read, and neither exists on this page;
 * drawing a control this page cannot honour is the same fault pointed the
 * other way. */
const CAN_RUN = new Set(['LIMIT', 'REMOVE']);

/* Our own words for what each verb is FOR. Not a claim about availability —
   that is the engine's `say` and `unavailable` — just the line under it. */
const MEANS = {
  LIMIT: 'Keep it working, cap what it can take',
  REMOVE: 'Set the allowance to zero',
};

const offered = (p) => (p.actions ?? []).filter((a) => CAN_RUN.has(a.kind));

/* At most one action on a row is the recommended one. A recommendation the
   engine cannot act on is not a task, and neither is one this page cannot
   carry out. */
const primaryOf = (p) => offered(p).find((a) => a.primary && a.available) ?? null;
const isTask = (p) => !!primaryOf(p);

/* ---- the menu on the row ------------------------------------------------
 *
 * The row's other actions, and the boundary editor. A row carries one verb in
 * the open — the thing to do — and everything else lives one click away, so a
 * table of ten permissions is not a table of forty controls.
 */
function RowMenu({ p, canAct, explorer, open, setOpen, limiting, setLimiting, onRevoke, onLimit, onOpen }) {
  const known = spender(p.beneficiary);
  const [typed, setTyped] = useState('');
  const [bad, setBad] = useState(null);

  const link = p.chain?.explorer || explorer;

  /* Why a control is off. The engine's reason first, because it is the one
     that knows — an unreadable authority, a token outside the registry, an
     allowance nothing can be built against. Ours only covers the one thing
     the engine cannot see, which is whose wallet is connected. */
  const why = (a) => (!a.available
    ? (a.unavailable || 'The engine does not offer this for this permission.')
    : !canAct
      ? 'Reading a public address. Connect this wallet to change what it has granted.'
      : 'Builds an unsigned transaction. Your wallet signs it.');

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
        <Popover.Content
          className="rowmenu dash"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {/* The asset and the chain it is on, and the address underneath as
              something that can be followed — a spender is an address before
              it is a name, and the name is ours rather than the chain's. */}
          <p className="rowmenu-head">
            <AssetMark symbol={p.symbol} chain={p.chain} size={26} />
            <span>
              <b>{known?.name || p.label || 'This permission'}</b>
              <span>{p.chain?.name} · {p.symbol || 'Unreadable contract'}</span>
              {link ? (
                <a className="rowmenu-addr" href={`${link}/address/${p.beneficiary}`}
                  target="_blank" rel="noopener" onClick={shut}>
                  {p.beneficiary.slice(0, 10)}…{p.beneficiary.slice(-8)}
                </a>
              ) : (
                <span className="rowmenu-addr">{p.beneficiary.slice(0, 10)}…{p.beneficiary.slice(-8)}</span>
              )}
            </span>
          </p>

          {/* What the contract is, for a name that is the name of a standard.
              Here rather than only on the row, because the row's line is a
              hover on a wide screen and a phone has no hover. */}
          {known?.what && <p className="rowmenu-what">{known.what}</p>}

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
              {/* A disabled item says why on hover, where the pointer already
                  is. The reason was a note at the foot of the menu, which
                  makes a reader find the greyed row, find the note, and decide
                  the two are about each other. A disabled button fires no
                  pointer events, so the trigger wraps it. */}
              {offered(p).map((a) => (
                <li key={a.kind}>
                  <Tooltip label={why(a)}>
                    <span className="rowmenu-wrap">
                      <button
                        type="button"
                        disabled={!canAct || !a.available}
                        onClick={() => {
                          /* A limit needs an amount, and the amount is asked
                             for below rather than guessed at. */
                          if (a.kind === 'LIMIT') { setLimiting(true); return; }
                          shut(); onRevoke(p);
                        }}
                      >
                        <span>{a.say}</span>
                        <em>{MEANS[a.kind]}</em>
                      </button>
                    </span>
                  </Tooltip>
                </li>
              ))}
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


        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* Where this page and `/` legitimately part: there, the action column
   reports what was done; here it offers what can be done — and, far more
   often, says that nothing needs doing.
 *
   The verb in the open is the engine's recommended action, worded by the
   engine. The menu state lives here rather than inside RowMenu so that
   pressing a primary "Limit" can open the editor that asks for the amount. */
function Actions({ p, canAct, explorer, onRevoke, onLimit, onOpen }) {
  const [open, setOpen] = useState(false);
  const [limiting, setLimiting] = useState(false);

  const primary = primaryOf(p);
  /* Offered and refused. The engine always sends the reason when it refuses,
     so the cell can be as short as the column needs and still explain
     itself — a disabled control with no explanation is not allowed. */
  const refused = primary ? null : offered(p).find((a) => !a.available) ?? null;

  return (
    <>
      {primary ? (
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
              onClick={() => {
                if (primary.kind === 'LIMIT') { setLimiting(true); setOpen(true); return; }
                onRevoke(p);
              }}
            >
              {primary.say}
            </button>
          </span>
        </Tooltip>
      ) : refused ? (
        <Tooltip label={refused.unavailable}>
          <span className="a-none">Cannot correct</span>
        </Tooltip>
      ) : (
        <span className="a-none done">Nothing needed</span>
      )}

      <RowMenu p={p} canAct={canAct} explorer={explorer}
        open={open} setOpen={setOpen} limiting={limiting} setLimiting={setLimiting}
        onRevoke={onRevoke} onLimit={onLimit} onOpen={onOpen} />
    </>
  );
}

/**
 * Whether the rows are stacked cards rather than a table. The breakpoint is the
 * one in global.css that does the stacking, and it is read rather than assumed
 * because the two layouts want different things from a tap: on a table the row
 * opens the evidence, on a card it opens the card.
 */
function useStacked() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(max-width: 760px)');
    const sync = () => setOn(q.matches);
    sync();
    q.addEventListener('change', sync);
    return () => q.removeEventListener('change', sync);
  }, []);
  return on;
}

function Row({ p, was, open, canAct, explorer, sayWhat, onOpen, onRevoke, onLimit }) {
  /* Compared by key, not by value. `granted` is a Capacity now, so `!==`
     would compare object identity and report every row as changed on every
     render; the key is a string and compares by value. */
  const changed = was && was.grantedKey !== p.grantedKey;

  /* A card carries a name, a figure and a reading, and everything else waits
     for a tap. Four permissions at full height is a screen and a half of
     scrolling before the reader has seen what they are scrolling through.
     On a wide screen there is room for the whole row, so this is never used. */
  const stacked = useStacked();
  const [shown, setShown] = useState(false);

  /* "Permit2" is the contract's real name and it tells a reader nothing. */
  const known = spender(p.beneficiary);

  /* Settling is a fact about this render, not about the data: the row glows
     once, when the figure it is showing is not the figure it was showing a
     moment ago. */
  const [settling, setSettling] = useState(false);
  const seen = useRef(p.grantedKey);

  useEffect(() => {
    if (seen.current === p.grantedKey) return undefined;
    seen.current = p.grantedKey;
    setSettling(true);
    const t = setTimeout(() => setSettling(false), 1500);
    return () => clearTimeout(t);
  }, [p.grantedKey]);

  return (
    <PermissionRow
      tone={tone(p)}
      className={isTask(p) ? 'is-task' : undefined}
      open={stacked ? shown : open}
      settling={settling}
      onOpen={() => (stacked ? setShown((v) => !v) : onOpen(p.id))}

      app={
        <AppCell
          mark={<AssetMark symbol={p.symbol} chain={p.chain} size={24} />}
          name={known?.name || p.label || `${p.beneficiary.slice(0, 6)}…${p.beneficiary.slice(-4)}`}
          meta={`${p.symbol || 'Unreadable contract'} · ${p.chain?.name ?? '—'}`}
          note={sayWhat ? known?.short : undefined}
        />
      }

      allowance={
        changed ? (
          <span className="a-sw-live">
            <span className="was-value">{say(was.granted, p.decimals, p.symbol)}</span>
            <span className="now-value"><Allowance p={p} /></span>
          </span>
        ) : (
          <span className={p.granted?.kind === 'UNBOUNDED' ? 'bad' : undefined}><Allowance p={p} /></span>
        )
      }

      reachable={<span className={p.attention ? 'bad' : undefined}><Reach p={p} /></span>}
      expires={expiry(p)}
      /* The fourth fact on a phone card: whether money that has not arrived
         yet is already covered. It is the reason an empty balance is not
         safety, and it was only ever said in the evidence panel. */
      future={p.futureExposed == null
        ? <span className="a-future-off">not established</span>
        : p.futureExposed
          ? <span className="a-future-on">covered</span>
          : <span className="a-future-off">not covered</span>}
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
            {empty?.action && (
              <button type="button" className="a-pill a-pill-go" onClick={empty.action.run}>
                {empty.action.label}
              </button>
            )}
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

/* How many rows stand before the reader is asked whether they want the rest.
   Twelve fills a laptop screen and leaves the figures above the table in
   sight; a wallet with fewer than that never sees the control at all. */
const PAGE = 12;

/**
 * The order rows are cut in.
 *
 * A wallet that has been used for years comes back with more rows than anyone
 * reads in one sitting, and they arrive in the order the chains were asked —
 * which is alphabetical accident. Showing the first twelve of THAT and hiding
 * the rest would put an unbounded approval behind a button, which is the one
 * thing this page exists not to do.
 *
 * So the reading decides who is above the fold. Unbounded and over-wide first,
 * because they are the reason to be here; unknown next, because a permission
 * we could not read is not a permission we cleared; then the bounded ones, and
 * last the expired and removed, which are history rather than exposure.
 * Within a rank the engine's own order survives, so a chain's rows stay
 * together.
 */
const RANK = {
  UNBOUNDED: 0, OVER_WIDE: 0,
  UNKNOWN: 1,
  BOUNDED: 2,
  EXPIRED: 3, REMOVED: 3,
};
const rank = (p) => RANK[p.reading] ?? 2;

export default function Ledger({
  rows, resetKey, previous, openId, canAct, explorer, empty, onOpen, onRevoke, onLimit,
}) {
  /* Counted rather than guessed at. `remediable` is false for more reasons
     than one, so it cannot stand in for "did not answer" now that the engine
     names that separately. */
  const unread = rows.filter((p) => p.unreadable).length;

  /* Ranked, then cut. Both halves of that have to happen in this order or the
     cut means something different. */
  const ordered = useMemo(
    () => rows.map((p, i) => [p, i])
      .sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1])
      .map(([p]) => p),
    [rows],
  );

  const [limit, setLimit] = useState(PAGE);
  /* A filter, a chain or a different wallet makes this a different list, and a
     reader who expanded the last one did not ask for this one to be long.
     Derived during render rather than in an effect: an effect would paint the
     new list at the old length for one frame first. */
  const [listKey, setListKey] = useState(resetKey);
  if (resetKey !== listKey) { setListKey(resetKey); setLimit(PAGE); }

  const visible = ordered.slice(0, limit);
  const hidden = ordered.length - visible.length;

  /* One spender usually holds several permissions — a wallet that has swapped
     a few times has five Permit2 rows — so the line saying what that contract
     is goes on the first of them and not on all five. Said once it is an
     explanation; said on every row it is wallpaper, and it costs each row a
     line of height to be ignored.

     Computed over what is ON SCREEN, in the order it is shown. Taken from the
     full list instead, the sentence would land on a row below the fold and the
     five visible Permit2 rows would all go unexplained. */
  const saysWhat = useMemo(() => {
    const seen = new Set();
    const first = new Set();
    for (const p of visible) {
      const who = String(p.beneficiary || '').toLowerCase();
      if (!seen.has(who)) { seen.add(who); first.add(p.id); }
    }
    return first;
  }, [visible]);

  return (
    <div className="lpanel">
        <PermissionTable future>
          {rows.length === 0 ? (
            <NothingRow empty={empty} />
          ) : (
            /* No entrance. The rows lifted in one after another, which made the
               table itself look like the event — and the table is not the
               event, the figures in it are. It is simply there, and the numbers
               climb inside it until they settle. */
            <PermissionRows>
              {visible.map((p) => (
                <Row
                  key={p.id}
                  p={p}
                  was={previous?.[p.id]}
                  open={openId === p.id}
                  canAct={canAct}
                  explorer={explorer}
                  sayWhat={saysWhat.has(p.id)}
                  onOpen={onOpen}
                  onRevoke={onRevoke}
                  onLimit={onLimit}
                />
              ))}
            </PermissionRows>
          )}
        </PermissionTable>

        {/* What is not on screen, and what it is.
            The count is the point: "Show 12 more" alone leaves a reader
            guessing whether the rest is five rows or five hundred, and the
            second line says why the ones held back are the ones held back. */}
        {hidden > 0 && (
          <div className="lmore">
            <button type="button" className="lmore-btn" onClick={() => setLimit((l) => l + PAGE)}>
              Show {Math.min(PAGE, hidden)} more
            </button>
            <p className="lmore-note">
              {hidden} of {ordered.length} not shown.
              {/* True whatever the filter says. "Nothing unbounded is below
                  this line" was not: under the Unbounded filter every row is,
                  and the sentence read as a contradiction of the table. */}
              <span> Ordered by reading, so what is held back is the quiet end of the list.</span>
            </p>
          </div>
        )}
        {hidden === 0 && limit > PAGE && (
          <div className="lmore">
            <button type="button" className="lmore-btn lmore-less" onClick={() => setLimit(PAGE)}>
              Show fewer
            </button>
            <p className="lmore-note">All {ordered.length} shown.</p>
          </div>
        )}

        {empty?.note && rows.length === 0 && <p className="lnote">{empty.note}</p>}

        {rows.length > 0 && !canAct && (
          <p className="lnote">
            Reading a public address, so nothing here can be changed.
            <span> Connect this wallet to revoke its permissions.</span>
          </p>
        )}
        {rows.length > 0 && unread > 0 && (
          <p className="lnote">
            {unread === 1
              ? 'One permission did not answer, so no correction is offered for it.'
              : `${unread} permissions did not answer, so no correction is offered for them.`}
            <span> Unknown is not a finding of no issue.</span>
          </p>
        )}
    </div>
  );
}
