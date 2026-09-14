import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class names, letting a caller's utility win over a component's own. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
