import { useEffect, useRef, useState } from 'react';

/**
 * A number that arrives at its value rather than starting there.
 *
 * Used only on the figure the page is actually about. A count-up on every
 * number would be a tic; on the one that says how many applications can take
 * from this wallet, the climb is the point, because a reader watches it stop
 * somewhere they did not expect.
 *
 * Honest about its own limits: it animates only when the value is small
 * enough that every step is legible, and otherwise renders the figure
 * directly rather than blurring through hundreds of frames.
 */
export function Counter({ value, duration = 700 }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(target > 40 ? target : 0);
  const frame = useRef();

  useEffect(() => {
    if (target > 40) { setShown(target); return undefined; }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(target);
      return undefined;
    }

    const started = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - started) / duration);
      // Settles rather than stops dead, matching --ease-settle.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(eased * target));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return <>{shown}</>;
}
