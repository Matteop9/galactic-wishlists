"use client";

import { useEffect, useRef } from "react";

/**
 * Shared modal behaviour: Escape closes, body scroll locks while open, and the
 * dialog takes focus on mount so keyboard/screen-reader users land inside it.
 * Attach the returned ref to the dialog container (which should also carry
 * role="dialog" aria-modal="true" and a label).
 */
export function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const focusedOnce = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!focusedOnce.current) {
      focusedOnce.current = true;
      ref.current?.focus();
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return ref;
}
