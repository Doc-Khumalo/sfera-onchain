import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cn } from '../../lib/cn.js';

/**
 * The reason a control is unavailable, on hover and on focus.
 *
 * Radix handles the part that is easy to get wrong: it opens on keyboard
 * focus as well as pointer, closes on Escape, and is wired to the trigger by
 * aria-describedby, so the explanation reaches a screen reader rather than
 * only an eye.
 */
export function TooltipProvider({ children }) {
  return <RadixTooltip.Provider delayDuration={180} skipDelayDuration={400}>{children}</RadixTooltip.Provider>;
}

export function Tooltip({ label, children, side = 'top' }) {
  if (!label) return children;
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={8}
          className={cn(
            'z-50 max-w-[260px] rounded-row border border-line2 bg-deck2 px-3 py-2',
            'font-display text-[12.5px] leading-snug text-ice shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]',
            'data-[state=delayed-open]:animate-[panelIn_180ms_var(--ease-settle)]',
          )}
        >
          {label}
          <RadixTooltip.Arrow className="fill-line2" width={10} height={5} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
