"use client";

import { Fragment } from "react";

/** The coach writes light markdown (bold, bullets, numbered lists). Render just that, no dependency. */
export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    out.push(
      <Tag key={out.length} className={`my-1 space-y-0.5 pl-5 ${list.ordered ? "list-decimal" : "list-disc"}`}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-•*]\s+(.*)$/);
    const number = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || number) {
      const ordered = !!number;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? number)![1]);
      continue;
    }
    flush();
    if (line.trim() === "") {
      out.push(<div key={out.length} className="h-2" />);
      continue;
    }
    const heading = line.match(/^#{1,3}\s+(.*)$/);
    out.push(
      heading ? (
        <div key={out.length} className="mt-1 font-semibold">
          {inline(heading[1])}
        </div>
      ) : (
        <p key={out.length}>{inline(line)}</p>
      ),
    );
  }
  flush();
  return <div className="my-1 text-[15px] leading-relaxed">{out}</div>;
}

/** **bold** and `code` only. */
function inline(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="rounded bg-surface-2 px-1 text-[13px]">{p.slice(1, -1)}</code>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}
