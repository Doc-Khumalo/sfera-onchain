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
 * Each row carries what was found on that chain. A chain with nothing on it
 * still appears, and says zero: absent from a list and empty on the chain look
 * identical otherwise, and the difference is the whole point of this page.
 */
export function ChainPicker({ chains, value, counts = {}, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = useRef(null);

  const picked = chains.find((c) => c.id === value) || null;
  const total = Object.values(counts).reduce((n, c) => n + c, 0);

  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? chains.filter((c) => c.name.toLowerCase().includes(needle)) : chains;
  }, [chains, q]);

  function choose(id) {
    onChange(id);
    setOpen(false);
    setQ('');
  }

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(''); }}>
      <Popover.Trigger asChild>
        <button type="button" className="cpick" aria-label="Choose which chain to show">
          <span className="cstack compact">
            {/* One mark when a chain is chosen, the cluster when none is: the
                trigger shows what it is doing rather than a fixed decoration. */}
            <span className="cs-marks">
              {(picked ? [picked] : chains.slice(0, 6)).map((c) => (
                <ChainMark key={c.id} chain={c} size={20} />
              ))}
            </span>
            <span className="cs-label">
              {picked ? picked.name : `All chains · ${chains.length}`}
            </span>
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
        <Popover.Content className="cmenu dash" sideOffset={8} align="end" collisionPadding={16}>
          <input
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
              if (e.key === 'Enter' && found.length) { e.preventDefault(); choose(found[0].id); }
              if (e.key === 'ArrowDown') { e.preventDefault(); list.current?.querySelector('button')?.focus(); }
            }}
          />

          <ul className="cmenu-list" ref={list}>
            <li>
              <button type="button" onClick={() => choose(0)} aria-current={value === 0 || undefined}>
                <span className="cm-all" aria-hidden="true" />
                <span className="cm-name">All chains</span>
                <em>{total}</em>
              </button>
            </li>
            {found.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => choose(c.id)} aria-current={value === c.id || undefined}>
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
