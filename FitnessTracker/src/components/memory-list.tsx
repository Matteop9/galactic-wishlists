"use client";

import { useState, useTransition } from "react";
import { forgetMemory } from "@/app/settings-actions";

export function MemoryList({ items }: { items: Array<{ id: number; category: string; content: string }> }) {
  const [list, setList] = useState(items);
  const [pending, start] = useTransition();
  if (list.length === 0) return <p className="text-muted">Nothing yet. Tell the coach about injuries, your gym&apos;s kit, or how you like to be coached.</p>;
  return (
    <ul className="divide-y divide-line">
      {list.map((m) => (
        <li key={m.id} className="flex items-start gap-2 py-1.5">
          <span className="mt-0.5 shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">{m.category}</span>
          <span className="flex-1">{m.content}</span>
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                await forgetMemory(m.id);
                setList((l) => l.filter((x) => x.id !== m.id));
              })
            }
            className="text-xs text-muted active:text-danger"
            aria-label="Forget"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
