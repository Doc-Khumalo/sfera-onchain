import { useMemo, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { EXAMPLES } from '../../data/site.js';

/**
 * Addresses to point the ledger at, for someone who has none to hand.
 *
 * It was one button wired to one address, which is enough to prove the page
 * works and not enough to show what it is for: a wallet with three unbounded
 * approvals and a wallet with one read very differently, and a reader who sees
 * only the first does not learn that the second is the common case.
 *
 * Searchable, and built like the chain picker beside it, because two lists in
 * one bar that behave differently is two things to learn. The list itself is
 * in data/site.js, where every entry carries what the engine actually returned
 * for it — see the note there before adding one.
 */
export function ExamplePicker({ onPick }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const field = useRef(null);

  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return EXAMPLES;
    /* The group name is searchable too: "bounded" should find the wallet in
       good order as readily as it finds the word in a note. */
    return EXAMPLES.filter((e) =>
      `${e.group} ${e.title} ${e.note} ${e.address}`.toLowerCase().includes(needle));
  }, [q]);

  const groups = useMemo(() => {
    const by = new Map();
    for (const e of found) {
      if (!by.has(e.group)) by.set(e.group, []);
      by.get(e.group).push(e);
    }
    return [...by.entries()];
  }, [found]);

  function pick(e, ev) {
    ev?.preventDefault();
    ev?.stopPropagation();
    setOpen(false);
    setQ('');
    onPick(e.address, e.chainId);
  }

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(''); }}>
      <Popover.Trigger asChild>
        <button type="button" className="txt">Use an example address</button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="cmenu xmenu dash"
          sideOffset={8}
          align="start"
          collisionPadding={16}
          onOpenAutoFocus={(ev) => { ev.preventDefault(); field.current?.focus({ preventScroll: true }); }}
          onCloseAutoFocus={(ev) => ev.preventDefault()}
        >
          <input
            ref={field}
            className="cmenu-find"
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            placeholder="Find an example"
            spellCheck="false"
            autoComplete="off"
            aria-label="Find an example address"
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' && found.length) pick(found[0], ev);
            }}
          />

          {/* Grouped by what each one demonstrates, because that is why a
              reader would pick one over another: a wallet with eleven
              approvals and a wallet with one bounded approval are two
              different lessons, not two entries in a list. */}
          <ul className="cmenu-list">
            {groups.map(([group, items]) => (
              <li key={group}>
                <p className="xgroup">{group}</p>
                <ul className="xsub">
                  {items.map((e) => (
                    <li key={e.address}>
                      <button type="button" className="xrow" onClick={(ev) => pick(e, ev)}>
                        <span className="cm-name">
                          <b>{e.title}</b>
                          <em>{e.note}</em>
                          <span className="xaddr">{e.address.slice(0, 10)}…{e.address.slice(-8)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {found.length === 0 && (
            <p className="cmenu-none">No example here goes by that name.</p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
