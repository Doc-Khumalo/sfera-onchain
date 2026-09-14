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
