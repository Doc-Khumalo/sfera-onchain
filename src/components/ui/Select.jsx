import * as RadixSelect from '@radix-ui/react-select';
import { cn } from '../../lib/cn.js';

/**
 * The chain picker.
 *
 * A native select cannot be styled to match anything and opens as an OS menu,
 * which on a dark page is a jarring flash of system chrome. Radix renders a
 * real menu we control, keeps full keyboard behaviour, and lets the open and
 * close be animated.
 */
export function Select({ value, onValueChange, items, placeholder = 'Select' }) {
  return (
    <RadixSelect.Root value={String(value ?? '')} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        className={cn(
          'inline-flex items-center gap-2 rounded-pill border border-line2 bg-transparent px-3.5 py-2',
          'font-display text-[12.5px] text-ice transition-colors hover:border-ok',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ok',
          'data-[state=open]:border-ok',
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'z-50 overflow-hidden rounded-panel border border-line2 bg-deck',
            'shadow-[0_28px_60px_-24px_rgba(0,0,0,0.9)]',
            'data-[state=open]:animate-[panelIn_180ms_var(--ease-settle)]',
          )}
        >
          <RadixSelect.Viewport className="p-1.5">
            {items.map((it) => (
              <RadixSelect.Item
                key={it.value}
                value={String(it.value)}
                className={cn(
                  'relative flex cursor-pointer select-none items-center gap-2.5 rounded-row px-3 py-2',
                  'font-display text-[13px] text-mist outline-none',
                  'data-[highlighted]:bg-deck2 data-[highlighted]:text-ice',
                  'data-[state=checked]:text-ice',
                )}
              >
                <RadixSelect.ItemText>{it.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="ml-auto text-ok">
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden="true">
                    <path d="M1 4.5L4.5 8L11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
