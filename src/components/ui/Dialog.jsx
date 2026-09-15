import * as RadixDialog from '@radix-ui/react-dialog';
import { cn } from '../../lib/cn.js';

/**
 * The modal, on Radix.
 *
 * The hand-rolled version had no focus trap, no focus restore, no scroll lock
 * and no accessible name. That is a real defect anywhere and an indefensible
 * one here, because this is the surface that hands a transaction to a wallet.
 * Radix gives all four, and the styling stays ours.
 *
 * Enter and exit are animated off Radix's data-state, so the panel arrives
 * rather than appears. A modal that pops into existence reads as a browser
 * alert; one that rises reads as part of the page.
 */
export function Dialog({ open, onOpenChange, children }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </RadixDialog.Root>
  );
}

export function DialogContent({ className, title, description, children }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-void/80 backdrop-blur-sm',
          'data-[state=open]:animate-[fade_240ms_var(--ease-settle)]',
          'data-[state=closed]:animate-[fade_160ms_var(--ease-settle)_reverse]',
        )}
      />
      <RadixDialog.Content
        className={cn(
          /* Radix portals this to <body>, which puts it outside the ledger's
             own root — so it carries that root's class, or every rule the
             demo's stylesheet scopes to `.dash` stops at the dialog's edge. */
          'dash',
          'fixed left-1/2 top-1/2 z-50 w-[min(430px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2',
          'rounded-panel border border-line2 bg-deck p-7 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]',
          'data-[state=open]:animate-[panelIn_280ms_var(--ease-settle)]',
          'data-[state=closed]:animate-[panelIn_180ms_var(--ease-settle)_reverse]',
          'focus:outline-none',
          className,
        )}
      >
        {/* Radix requires both for the accessible name and description. The
            title is visually hidden when the panel supplies its own. */}
        <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
        {description && <RadixDialog.Description className="sr-only">{description}</RadixDialog.Description>}
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export const DialogClose = RadixDialog.Close;

/**
 * The same modal, entering from the side.
 *
 * The permission detail was a hand-rolled `position: fixed` aside: no overlay,
 * no focus trap, no focus restore, and — the one a reader actually feels — no
 * scroll lock, so the page went on scrolling behind the panel while they read
 * it. It was the same four defects the handoff had before it moved onto Radix,
 * in a panel that is open far more often.
 *
 * Radix gives all of them, and the styling stays ours. A sheet is a dialog
 * that arrives from an edge; nothing else about it is different, which is why
 * it belongs here rather than in a second component with its own ideas.
 */
export function SheetContent({ className, title, description, children }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-void/70 backdrop-blur-sm',
          'data-[state=open]:animate-[fade_240ms_var(--ease-settle)]',
          'data-[state=closed]:animate-[fade_160ms_var(--ease-settle)_reverse]',
        )}
      />
      <RadixDialog.Content
        className={cn(
          /* Portalled to <body>, so it carries the ledger's root class — see
             DialogContent above. */
          'dash',
          'fixed inset-y-0 right-0 z-50 flex w-[min(460px,100vw)] flex-col overflow-y-auto',
          'border-l border-line2 bg-deck shadow-[-24px_0_56px_rgba(0,0,0,0.7)]',
          'data-[state=open]:animate-[sheetIn_300ms_var(--ease-settle)]',
          'data-[state=closed]:animate-[sheetIn_200ms_var(--ease-settle)_reverse]',
          'focus:outline-none',
          className,
        )}
      >
        <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
        {description && <RadixDialog.Description className="sr-only">{description}</RadixDialog.Description>}
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
