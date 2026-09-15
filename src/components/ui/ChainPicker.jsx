import { useMemo, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { ChainMark } from './ChainMark.jsx';

/**
 * The chains, stacked — and now the control for choosing one.
 *
 * The marks were already the honest way to say "this reads more than one
 * chain": a row of logos says it faster than a number, which is why `/`'s
 * console wears them. On the demo they sat beside a separate dropdown reading
 * "All chains · 15", so the page showed the chains twice and let you act on
 * neither of them by touching the thing that depicted them.
 *
 * So the stack is the control. Clicking it opens the list it was already
 * describing, with a field over it because fifteen names is more than a person
 * should have to scan — and it is fifteen precisely because the answer to
 * "which chain is my permission on" is usually "one I had forgotten about".
 *
 * SEVERAL AT ONCE. `value` is a set. It used to be one id, so the ledger could
 * be narrowed to exactly one chain or to all fifteen and nothing in between,
 * when "the two I actually use" is the ordinary case. Picking does not close
 * the menu — the whole point is to pick more than one — and "All chains"
 * empties the set, because a filter that selects nothing selects everything.
 *
 * Each row carries what was found on that chain. A chain with nothing on it
 * still appears, and says zero: absent from a list and empty on the chain look
 * identical otherwise, and the difference is the whole point of this page.
 */
export function ChainPicker({ chains, value, counts = {}, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = useRef(null);
  const field = useRef(null);
  const trigger = useRef(null);

  const picked = chains.filter((c) => value.has(c.id));
  const total = Object.values(counts).reduce((n, c) => n + c, 0);
  const shownCount = picked.length
    ? picked.reduce((n, c) => n + (counts[c.id] ?? 0), 0)
    : total;

  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? chains.filter((c) => c.name.toLowerCase().includes(needle)) : chains;
  }, [chains, q]);

  function toggle(id, e) {
    /* Picking changes how many rows the table has, which changes the height of
       the page under this menu. Nothing about that belongs to whatever is
       behind it. */
    e?.preventDefault();
    e?.stopPropagation();
    const next = new Set(value);
    if (next.has(id)) next.delete(id); else next.add(id);
    /* Every chain ticked is the same view as none ticked, and the second is
       the one the label can say in three words. */
    onChange(next.size === chains.length ? new Set() : next);
  }

  /* THE PAGE MUST NOT MOVE WHILE CHAINS ARE BEING PICKED.
   *
   * Narrowing to one chain takes rows out of the table, which makes the
   * document shorter, which makes the browser clamp the scroll position — so
   * the whole page slid up under the pointer between one tick and the next.
   * Nothing was propagating; the page was simply shrinking.
   *
   * So the console holds the height it had when the menu opened, for as long
   * as it is open, and lets go when it closes. The rows come and go inside a
   * box that stays put. */
  function hold(on) {
    const console_ = trigger.current?.closest('.a-console');
    if (!console_) return;
    if (on) console_.style.minHeight = `${console_.getBoundingClientRect().height}px`;
    else console_.style.minHeight = '';
  }

  function all(e) {
    e?.preventDefault();
    e?.stopPropagation();
    onChange(new Set());
    setQ('');
  }

  const label = picked.length === 0
    ? `All chains · ${chains.length}`
    : picked.length === 1
      ? picked[0].name
      : `${picked.length} chains · ${shownCount}`;

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); hold(o); if (!o) setQ(''); }}>
      <Popover.Trigger asChild>
        <button ref={trigger} type="button" className="cpick" aria-label="Choose which chains to show">
          <span className="cstack compact">
            {/* The marks of what is picked, or the cluster when everything is. */}
            <span className="cs-marks">
              {(picked.length ? picked : chains).slice(0, 6).map((c) => (
                <ChainMark key={c.id} chain={c} size={20} />
              ))}
            </span>
            <span className="cs-label">{label}</span>
          </span>
          <svg className="cpick-mark" viewBox="0 0 10 6" aria-hidden="true">
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor"
              strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        {/* Portalled to <body>, so it carries the ledger's root class or every
            rule scoped to `.dash` stops at its edge. */}
        {/* Radix focuses the first thing in the content when it opens, and the
            browser scrolls that into view — which on a console halfway down
            the page moves the page under the pointer. The field is focused
            here instead, without the scroll. */}
        <Popover.Content
          className="cmenu dash"
          sideOffset={8}
          align="end"
          collisionPadding={16}
          onOpenAutoFocus={(e) => { e.preventDefault(); field.current?.focus({ preventScroll: true }); }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <input
            ref={field}
            className="cmenu-find"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a chain"
            spellCheck="false"
            autoComplete="off"
            aria-label="Find a chain"
            onKeyDown={(e) => {
              /* Enter takes the first match, because typing three letters and
                 then reaching for the mouse is not a search. */
              if (e.key === 'Enter' && found.length) { e.preventDefault(); toggle(found[0].id, e); }
              if (e.key === 'ArrowDown') { e.preventDefault(); list.current?.querySelector('button')?.focus(); }
            }}
          />

          <ul className="cmenu-list" ref={list}>
            <li>
              <button type="button" onClick={all} aria-pressed={picked.length === 0}>
                <span className="cm-all" aria-hidden="true" />
                <span className="cm-name">All chains</span>
                <em>{total}</em>
              </button>
            </li>
            {found.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={(e) => toggle(c.id, e)} aria-pressed={value.has(c.id)}>
                  <ChainMark chain={c} size={18} />
                  <span className="cm-name">{c.name}</span>
                  <em>{counts[c.id] ?? 0}</em>
                </button>
              </li>
            ))}
          </ul>

          {found.length === 0 && (
            <p className="cmenu-none">No chain read here goes by that name.</p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
