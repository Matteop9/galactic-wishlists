"use client";

export default function OpenGuideButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("skydex:open-guide"))}
      className="sd-btn sd-btn--log !px-4 !py-2 !text-sm"
    >
      How it works
    </button>
  );
}
