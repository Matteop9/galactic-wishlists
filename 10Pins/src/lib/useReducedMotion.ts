import { useEffect, useState } from 'react';

/**
 * Whether the viewer has asked for reduced motion.
 *
 * CSS handles almost everything (one `prefers-reduced-motion` block in
 * index.css), but the celebration banner needs it in JS too: killing the
 * animation on a full-screen overlay leaves a static black scrim that appears
 * and vanishes, which is worse than the animation. So the banner downgrades to
 * a quiet pill instead — spec §12 asks for celebrations to be *disabled*, not
 * shortened, and this is what that means for a full-screen element.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
