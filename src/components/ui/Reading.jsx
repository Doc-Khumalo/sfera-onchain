import { Badge } from './Badge.jsx';
import { cn } from '../../lib/cn.js';

/**
 * A reading, as a badge.
 *
 * shadcn's Badge ships `destructive` as a solid fill, which on a dark ground
 * shouts at a volume this page cannot sustain across three rows. So the
 * component stays shadcn's and the tone is applied over it, which is the
 * intended way to extend a registry component rather than fork it.
 *
 * The four tones map to the two marks and nothing else. There is no
 * decorative variant on purpose.
 */
const TONE = {
  UNBOUNDED: 'bg-destructive/15 text-destructive border-transparent',
  OVER_WIDE: 'bg-destructive/15 text-destructive border-transparent',
  BOUNDED: 'bg-primary/12 text-primary border-transparent',
  REMOVED: 'bg-primary/12 text-primary border-transparent',
  EXPIRED: 'border-border text-muted-foreground',
  UNKNOWN: 'border-border text-muted-foreground',
};

export function Reading({ reading, children, className }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.1em]',
        TONE[reading] ?? TONE.UNKNOWN,
        className,
      )}
    >
      {children}
    </Badge>
  );
}
