"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Message { role: "user" | "assistant"; content: string; }

interface Props {
  initialMessages: Message[];
  finalPlan: string | null;
  date: string;
}

export default function ChatClient({ initialMessages, finalPlan: initialFinalPlan, date }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [finalPlan, setFinalPlan] = useState(initialFinalPlan);
  const [locking, setLocking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(content: string) {
    if (!content.trim() || streaming) return;
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages, date }),
    });

    if (!res.body) { setStreaming(false); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      // Parse SSE data lines
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const event = JSON.parse(data);
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            assistantText += event.delta.text;
            setMessages((prev) => [
              ...prev.slice(0, -1),
              { role: "assistant", content: assistantText },
            ]);
          }
        } catch {}
      }
    }
    setStreaming(false);
  }

  async function lockPlan() {
    if (!messages.length) return;
    setLocking(true);
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    const plan = lastAssistant?.content ?? "";
    const supabase = createClient();
    await supabase
      .from("daily_plans")
      .upsert({ user_id: (await supabase.auth.getUser()).data.user!.id, date, final_plan: plan }, { onConflict: "user_id,date" });
    setFinalPlan(plan);
    setLocking(false);
    router.push("/app/dashboard");
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col h-screen pb-20">
      <div className="px-4 py-6 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-semibold">Morning plan</h1>
        {finalPlan && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-accent)]">
            Locked: {finalPlan}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-[var(--color-accent)] text-white rounded-br-sm"
                : "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-bl-sm"
            }`}>
              {msg.content || <span className="opacity-40">…</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!finalPlan && (
        <div className="px-4 py-3 border-t border-[var(--color-border)] space-y-2">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
              placeholder="Ask or push back…"
              disabled={streaming}
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] transition-colors disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={streaming || !input.trim()}
              className="rounded-xl bg-[var(--color-accent)] px-4 text-white text-sm font-medium disabled:opacity-40"
            >
              Send
            </button>
          </div>
          <button
            onClick={lockPlan}
            disabled={locking || streaming}
            className="w-full rounded-xl border border-[var(--color-accent)] text-[var(--color-accent)] py-2.5 text-sm font-medium hover:bg-[var(--color-accent)] hover:text-white transition-colors disabled:opacity-40"
          >
            {locking ? "Locking…" : "Lock this plan"}
          </button>
        </div>
      )}
    </div>
  );
}
