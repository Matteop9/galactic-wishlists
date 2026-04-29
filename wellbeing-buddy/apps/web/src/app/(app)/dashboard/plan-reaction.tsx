"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Reaction = "good" | "bad" | "push_back";

const OPTIONS: { value: Reaction; label: string }[] = [
  { value: "good", label: "Looks good" },
  { value: "bad", label: "Not for me" },
  { value: "push_back", label: "Push back" },
];

interface Props { planDate: string; currentReaction: string | null; }

export default function PlanReaction({ planDate, currentReaction }: Props) {
  const [reaction, setReaction] = useState<Reaction | null>(currentReaction as Reaction | null);

  async function handleReaction(value: Reaction) {
    setReaction(value);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("daily_plans")
      .upsert({ user_id: user!.id, date: planDate, reaction: value }, { onConflict: "user_id,date" });
  }

  return (
    <div className="flex gap-2">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleReaction(value)}
          className={`flex-1 py-2 rounded-lg text-xs border transition-colors ${
            reaction === value
              ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
              : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
