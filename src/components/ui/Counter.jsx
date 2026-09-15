import { useEffect, useRef, useState } from 'react';
import { format, isDollar } from '../../lib/api.js';

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

/**
 * A token amount that climbs to its figure, the way `/`'s console does.
 *
 * The marketing table rolls every number it shows, and the demo's table used
 * to simply be there — fully formed, as if the chain had been read before the
 * reader arrived. It had not been. The climb is not decoration: it is the only
 * part of the interface that says these figures were fetched, and a table that
 * spawns complete reads as a screenshot of a product rather than one working.
 *
 * It animates the whole units and lets the decimals land at the end, because
 * rolling four decimal places is noise at sixty frames a second. Figures too
 * large to count through legibly, and anything a reader has asked not to see
 * move, are rendered outright.
 */
export function Amount({ raw, decimals, symbol, duration = 900 }) {
  const final = format(raw, decimals, symbol);

  let whole = 0;
  try {
    whole = raw == null ? 0 : Number(BigInt(raw) / BigInt(10) ** BigInt(decimals || 0));
  } catch { whole = 0; }

  /* Nothing to climb through: no figure at all, a figure under one whole unit,
     or one so large the count would be a blur. */
  const still = !Number.isFinite(whole) || whole <= 0 || whole > 1e12;

  const [shown, setShown] = useState(still ? null : 0);
  const from = useRef(0);
  const frame = useRef();

  useEffect(() => {
    if (still) { setShown(null); return undefined; }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(null); from.current = whole; return undefined;
    }

    const start = from.current;
    const began = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - began) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      if (t < 1) {
        setShown(Math.round(start + (whole - start) * eased));
        frame.current = requestAnimationFrame(tick);
      } else {
        /* The last frame is the formatted figure itself, decimals and all —
           never a rounded stand-in that happens to look finished. */
        setShown(null);
        from.current = whole;
      }
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [whole, duration, still]);

  if (shown === null) return <>{final}</>;
  /* A dollar figure keeps its cents while it climbs, so the column does not
     gain a decimal point at the moment the number stops. */
  const dp = isDollar(symbol) ? 2 : 0;
  return (
    <>
      {shown.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}
      {symbol ? ` ${symbol}` : ''}
    </>
  );
}
