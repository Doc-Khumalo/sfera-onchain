import { cn } from '../../lib/cn.js';

/**
 * Somewhere for data to sit.
 *
 * The earlier ledger was hairlines on flat black, which reads as unfinished
 * rather than austere. A lifted ground and a soft radius give a table an edge
 * without turning the page into a deck of cards.
 */
export function Panel({ className, children, ...props }) {
  return (
    <div
      className={cn('rounded-panel border border-line2 bg-deck overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelHead({ className, children }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 border-b border-line px-6 py-4', className)}>
      {children}
    </div>
  );
}
