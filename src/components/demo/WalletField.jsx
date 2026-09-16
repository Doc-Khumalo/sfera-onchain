import { useEffect, useMemo, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { isAddress } from 'viem';
import { EXAMPLES } from '../../data/site.js';

/**
 * The address, as a field you can type in.
 *
 * It was a string with a menu behind it: to read another wallet you opened a
 * popover, found "Read a different wallet", clicked it, and were given back the
 * field you had been looking at all along. The address is the most important
 * thing in this bar and the thing most likely to be changed, so it is the
 * control — click it and type.
 *
 * It searches three things at once, because they are three answers to the same
 * question. What you have typed, if it is an address. What you have read
 * before, which this browser remembers and nothing else does. And the example
 * wallets, grouped by what each one shows.
 *
 * RECENTS NEVER LEAVE THE BROWSER. They are in localStorage, not on the list
 * the probe log keeps: one is a convenience for the person at the keyboard and
 * the other is our own bookkeeping, and joining them would make a history of
 * who read what.
 */

const RECENT = 'sfera:recent';
const KEEP = 6;

export function readRecents() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT) || '[]');
    return Array.isArray(raw) ? raw.filter((r) => isAddress(r?.address || '')).slice(0, KEEP) : [];
  } catch { return []; }
}

export function rememberRecent(address, found) {
  try {
    const now = readRecents().filter((r) => r.address.toLowerCase() !== address.toLowerCase());
    now.unshift({ address, found: found ?? null, at: Date.now() });
    localStorage.setItem(RECENT, JSON.stringify(now.slice(0, KEEP)));
  } catch { /* private window */ }
}

const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function WalletField({ address, walletName, connected, busy, held, onRead, recentsKey }) {
  const [open, setOpen] = useState(false);
  /* Blurred, the field shows the short address and takes a name's worth of
     room; focused, it opens to the full 42 characters. The bar was carrying a
     43ch box at all times to hold a string nobody reads character by character
     until they are editing it. */
  const [focused, setFocused] = useState(false);
  const box = useRef(null);
  /* The box holds the address being read, not an empty search. It IS the
     address on the bar — click into it and the address is already there to
     edit, which is the whole point of it being an input and not a label. */
  const [typed, setTyped] = useState(address || '');
  const field = useRef(null);

  const recents = useMemo(() => readRecents(), [recentsKey, open]);

  useEffect(() => { setTyped(address || ''); }, [address]);
  /* Leaving without reading puts the address back, so the bar never shows a
     wallet that is not the one in the table under it. Keyed on focus and not
     on the list being open: clearing the box closes the list, and restoring
     the address at that moment undid the clear a frame after it happened. */
  useEffect(() => { if (!open && !focused) setTyped(address || ''); }, [open, focused, address]);

  const q = typed.trim();
  const valid = isAddress(q);
  /* Untouched, the box is showing the address already being read, so it is not
     a query — filtering the list by it would empty the list. */
  const dirty = !!q && q.toLowerCase() !== (address || '').toLowerCase();
  const needle = dirty ? q.toLowerCase() : '';
  /* Two kinds of typing land in the same box. Something starting 0x is an
     address being pasted, and the length rules apply to it; anything else is
     a search over the names below, where "that is not a valid address" would
     be an odd thing to say to someone who typed "uniswap". */
  const typingAddress = dirty && /^0x/i.test(q);

  const examples = useMemo(() => {
    const list = needle
      ? EXAMPLES.filter((e) => `${e.group} ${e.title} ${e.note} ${e.address}`.toLowerCase().includes(needle))
      : EXAMPLES;
    const by = new Map();
    for (const e of list) {
      if (!by.has(e.group)) by.set(e.group, []);
      by.get(e.group).push(e);
    }
    return [...by.entries()];
  }, [needle]);

  /* The address on screen is in the recents — it was just read — and offering
     it here is offering to go where you already are. */
  const here = (address || '').toLowerCase();
  const pool = recents.filter((r) => r.address.toLowerCase() !== here);
  const seen = needle
    ? pool.filter((r) => r.address.toLowerCase().includes(needle))
    : pool;

  const nothing = seen.length === 0 && examples.length === 0;

  function take(addr, chainId, ev) {
    ev?.preventDefault();
    ev?.stopPropagation();
    setOpen(false);
    field.current?.blur();
    onRead(addr, chainId);
  }

  return (
    /* Not modal: the list is a suggestion under a field that keeps the caret,
       so focus stays where the typing is. */
    <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
      <Popover.Anchor asChild>
        <form
          ref={box}
          className={`wfield${focused ? ' open' : ''}${typingAddress && !valid ? ' bad' : ''}`}
          onSubmit={(e) => { e.preventDefault(); if (valid) take(q, undefined, e); }}
        >
          <span className="a-avatar" aria-hidden="true" />
          <label htmlFor="wf" className="sr-only">Read any public address</label>
          <input
            ref={field}
            id="wf"
            className="wfield-input"
            value={focused ? typed : (address ? short(address) : '')}
            title={address || undefined}
            onChange={(e) => { setTyped(e.target.value); setOpen(true); }}
            onFocus={() => { setFocused(true); setOpen(true); }}
            /* Focus fires once. A second click on a field that is already
               focused fires nothing, so a list dismissed with Escape or by a
               click outside could not be brought back without leaving the
               field first. */
            onClick={() => setOpen(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setOpen(false); field.current?.blur(); }
              if (e.key === 'ArrowDown') setOpen(true);
            }}
            placeholder="Read any public address"
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            role="combobox"
            aria-expanded={open}
            aria-controls="wf-list"
          />
          {connected && walletName && !dirty && (
            <span className="wfield-via">{walletName}</span>
          )}
          {/* Always. It reads whatever the box says — a new address once you
              have typed one, and the one already there if you have not, which
              is the re-read. Showing it only when the text changed meant the
              field had no button at all most of the time. */}
          {/* Emptying the box, not forgetting the wallet: the reading below
              stays where it is until another one replaces it. Leaving without
              typing anything puts the address back, the same as Escape. */}
          {typed && (
            <button
              type="button"
              className="wfield-clear"
              aria-label="Clear the address"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setTyped(''); setFocused(true); setOpen(true); field.current?.focus(); }}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}

          <button type="submit" className="btn ghost wfield-go" disabled={!valid || busy}>
            {busy ? 'Reading…' : 'Read'}
          </button>
        </form>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          id="wf-list"
          className="wdrop dash"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          /* The field is the anchor, not the trigger, so every press on it —
             the clear mark included — counts as a press outside this list and
             closed it. Presses on the box it belongs to are not outside. */
          onInteractOutside={(e) => { if (box.current?.contains(e.target)) e.preventDefault(); }}
        >
          <div className="wdrop-list">
            {typingAddress && !valid && (
              <p className="wdrop-none">
                {q.length < 42
                  ? 'An address is 42 characters and begins 0x.'
                  : 'That is not a valid address.'}
              </p>
            )}

            {!typingAddress && q && nothing && (
              <p className="wdrop-none">
                Nothing here matches “{q}”. Paste an address and it will be read.
              </p>
            )}

            {seen.length > 0 && (
              <>
                <p className="xgroup">Read before, in this browser</p>
                <ul className="xsub">
                  {seen.map((r) => (
                    <li key={r.address}>
                      <button type="button" className="xrow wrow" onClick={(e) => take(r.address, undefined, e)}>
                        <span className="cm-name">
                          <b>{short(r.address)}</b>
                          <em>{r.found == null ? 'read here' : `${r.found} permission${r.found === 1 ? '' : 's'} last time`}</em>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {examples.map(([group, items]) => (
              <div key={group}>
                <p className="xgroup">{group}</p>
                <ul className="xsub">
                  {items.map((e) => (
                    <li key={e.address}>
                      <button type="button" className="xrow" onClick={(ev) => take(e.address, e.chainId, ev)}>
                        <span className="cm-name">
                          <b>{e.title}</b>
                          <em>{e.note}</em>
                          <span className="xaddr">{short(e.address)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {!seen.length && !examples.length && !q && (
              <p className="wdrop-none">Nothing read here yet.</p>
            )}
          </div>

          {address && connected && held != null && (
            <p className="wdrop-foot">{held} in stablecoins, of the tokens we asked about</p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
