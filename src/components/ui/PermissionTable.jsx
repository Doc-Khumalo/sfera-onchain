/**
 * The permission table. There is one, and this is it.
 *
 * `/` shows it with an example wallet and a loop running across it; the
 * demo shows it with a real one and live controls on the rows. Those are two
 * jobs, and they were two tables — the demo's markup had been extracted from
 * index.astro by hand and, being a copy, was already drifting: the demo had lost
 * the before-and-after swap, and alt had gained a first-two-rows tint the demo
 * inherited on rows that were not faults at all.
 *
 * So the structure lives here and nothing else owns a <table>: the six
 * columns, their order and widths, the row's state marker, the application
 * cell, the state chip and the action cell. What a page puts INTO a cell is
 * still the page's business — alt's cells carry animation, the demo's carry
 * readings from the engine — but neither can quietly grow a seventh column or
 * a different set of row states, because neither writes the shell any more.
 *
 * Styling is `.a-table` and friends in global.css, already shared. This is the
 * markup those rules were always written against.
 */

/* The columns, in this order, on every page that shows a permission. Action is
   last and right-aligned because it is the only column a reader acts on, and
   the only one that is sometimes empty. */
const COLUMNS = ['Application', 'Allowance', 'Reachable', 'Expires', 'State'];

export function PermissionTable({ children }) {
  return (
    /* The table is the only thing that may scroll sideways — see global.css.
       The wrapper is part of the component for that reason: a caller who
       forgot it would put the whole console on a horizontal scrollbar. */
    <div className="a-table-wrap">
      <table className="a-table">
        <thead>
          <tr>
            {COLUMNS.map((c) => <th key={c}>{c}</th>)}
            <th className="a-right">Action</th>
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

/* One body of rows. `/` carries three — one wallet each, cycled by CSS —
   and the demo carries one. */
export function PermissionRows({ className, children }) {
  return <tbody className={className}>{children}</tbody>;
}

/**
 * One permission.
 *
 * `tone` is the reading, and it draws the left marker and the row tint from
 * the shared `rs-*` vocabulary. `className` is for a row that animates its own
 * state instead, which is alt's two corrected rows and nothing else.
 *
 * `onOpen` is what makes a row a control. Given one, the row becomes
 * focusable, says whether it is open, and stops the action cell from opening
 * it — a click on Revoke is a click on Revoke, not on the row behind it.
 */
export function PermissionRow({
  tone, className, open, settling,
  app, allowance, reachable, expires, state, action,
  onOpen,
}) {
  const interactive = typeof onOpen === 'function';
  const cls = [
    tone ? `rs-${tone}` : null,
    interactive ? 'is-live' : null,
    settling ? 'row-settled' : null,
    className,
  ].filter(Boolean).join(' ');

  /* A click that lands on the action cell has already done its work. Letting
     it bubble opens the detail panel underneath the transaction the reader
     just asked for, which is the one moment the page must not change
     underneath them. */
  const stop = (e) => e.stopPropagation();

  return (
    <tr
      className={cls || undefined}
      {...(interactive ? {
        tabIndex: 0,
        'aria-expanded': Boolean(open),
        onClick: onOpen,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(e); }
        },
      } : null)}
    >
      {/* Each cell names its own column. On a phone the table stacks and the
          head goes away with it, so the label has to travel with the value —
          six columns squeezed into a 390px screen shows two of them and cuts
          the third mid-digit, and the two it shows are not the ones a reader
          came for. */}
      <td data-col="Application">{app}</td>
      <td data-col="Allowance">{allowance}</td>
      <td data-col="Reachable">{reachable}</td>
      <td data-col="Expires" className="quiet">{expires}</td>
      <td data-col="State">{state}</td>
      <td data-col="Action">
        <span className="a-do" onClick={interactive ? stop : undefined} onKeyDown={interactive ? stop : undefined}>
          {action}
        </span>
      </td>
    </tr>
  );
}

/* The application, the chain it holds authority on, and what that authority
   reaches. Two lines, because an application name without its chain is not an
   address of anything. */
export function AppCell({ mark, name, meta }) {
  return (
    <span className="a-app">
      {mark}
      <span>
        <b>{name}</b>
        <em>{meta}</em>
      </span>
    </span>
  );
}

/* The reading, as the chip the legend on /demo draws itself from. */
export function StateChip({ tone, children }) {
  return <span className={`state st-${tone}`}>{children}</span>;
}
