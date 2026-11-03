"use client";

import { useEffect } from "react";

/**
 * Mobile keyboards: iOS Safari doesn't shrink the layout viewport when the
 * keyboard opens; it shrinks the *visual* viewport and scrolls the page under
 * it, which is what made the screen jump around. The body is fixed (globals.css)
 * and the app shell is sized to the visual viewport, so the composer sits on
 * the keyboard and only the message list scrolls. `kb-open` hides the tab bar
 * while typing.
 */
export function ViewportFix() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    const apply = () => {
      const h = Math.round(vv ? vv.height : window.innerHeight);
      root.style.setProperty("--vvh", `${h}px`);
      root.classList.toggle("kb-open", window.innerHeight - h > 150);
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    apply();
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);
  return null;
}
