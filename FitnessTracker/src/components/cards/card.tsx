"use client";

export function Card({ children, tone = "default", className = "" }: { children: React.ReactNode; tone?: "default" | "muted" | "accent" | "warn" | "danger" | "pr"; className?: string }) {
  const border = {
    default: "border-line",
    muted: "border-line text-muted",
    accent: "border-accent/50",
    warn: "border-warn/60",
    danger: "border-danger/60",
    pr: "border-pr/70",
  }[tone];
  return <div className={`animate-pop my-1 rounded-2xl border bg-surface px-3.5 py-3 text-sm ${border} ${className}`}>{children}</div>;
}
