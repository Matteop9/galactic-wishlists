import { useEffect, useState } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';

/**
 * A numeral that counts up once on first render (DESIGN.md motion: "score
 * counts up once"). 600ms on the base curve; under reduced motion it just
 * shows the value. Non-numeric values render as they are.
 */
export default function CountUp({
  value,
  duration = 600,
  className = '',
}: {
  value: number | string | null | undefined;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const target = typeof value === 'number' ? value : Number(value);
  const numeric = value !== null && value !== undefined && value !== '' && Number.isFinite(target);
  const [shown, setShown] = useState<number>(numeric && !reduced ? 0 : target);

  useEffect(() => {
    if (!numeric) return;
    if (reduced) {
      setShown(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out: fast start, settles gently
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // run once per value
  }, [numeric, target, duration, reduced]);

  if (!numeric) return <span className={className}>{value ?? ''}</span>;
  const decimals = Number.isInteger(target) ? 0 : 1;
  return <span className={className}>{shown.toFixed(decimals)}</span>;
}
