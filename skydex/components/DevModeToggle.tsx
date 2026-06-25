"use client";

export default function DevModeToggle({ enabled }: { enabled: boolean }) {
  function toggle() {
    const next = enabled ? "" : "1";
    // 30-day cookie; clearing sets an expired date.
    document.cookie = `skydex_dev=${next}; path=/; max-age=${next ? 60 * 60 * 24 * 30 : 0}`;
    window.location.reload();
  }

  return (
    <button
      onClick={toggle}
      className={`rounded-full border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wide ${
        enabled
          ? "border-stamp bg-stamp text-paper"
          : "border-paper-edge text-ink-soft hover:border-ink"
      }`}
    >
      Dev mode {enabled ? "on" : "off"}
    </button>
  );
}
