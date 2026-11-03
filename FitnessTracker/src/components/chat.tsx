"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { quickLogSet } from "@/app/actions";
import { quickParse } from "@/lib/quickparse";
import type { PadData } from "@/lib/pad";
import type { ChatMessage } from "@/lib/chat-store";
import { Header, type HeaderData } from "./header";
import { ToolCard } from "./cards";
import { RestTimer, type RestState } from "./rest-timer";
import { SetPad } from "./set-pad";
import { CheckinSheet } from "./checkin-sheet";
import { useVoice } from "./use-voice";
import { RichText } from "./rich-text";

const QUEUE_KEY = "coach_outbox";

function readQueue(): string[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeQueue(q: string[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {}
}
function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function dayOf(m: UIMessage): string {
  const iso = (m.metadata as { createdAt?: string } | undefined)?.createdAt;
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });
}

function lastAssistantText(messages: UIMessage[]): string {
  const m = [...messages].reverse().find((x) => x.role === "assistant");
  return m ? m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim() : "";
}

export function Chat({ initialMessages, header }: { initialMessages: ChatMessage[]; header: HeaderData }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [rest, setRest] = useState<RestState>(null);
  const [pad, setPad] = useState<PadData | null>(header.pad);
  const [checkin, setCheckin] = useState(false);
  const offline = useSyncExternalStore(subscribeOnline, () => !navigator.onLine, () => false);
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  // Cards from messages loaded at mount never restart the rest timer.
  const initialIds = useMemo(() => new Set(initialMessages.map((m) => m.id)), [initialMessages]);

  // Server refresh wins over the pad's optimistic state (derived-state pattern, no effect).
  const [seenPad, setSeenPad] = useState(header.pad);
  if (header.pad !== seenPad) {
    setSeenPad(header.pad);
    setPad(header.pad);
  }

  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: "coach",
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // History lives server-side; only ship the newest message.
      prepareSendMessagesRequest: ({ messages }) => ({ body: { message: messages.at(-1) } }),
    }),
    onFinish: () => router.refresh(),
  });

  // Follow the bottom only while the user is already there; never move the page itself.
  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };
  useEffect(() => {
    if (stick.current) scrollToBottom();
  }, [messages, status, rest, pad, scrollToBottom]);
  // Content grows after mount (fonts, cards, streaming tokens): keep the bottom pinned while we're there.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => stick.current && scrollToBottom());
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollToBottom]);
  useEffect(() => {
    const vv = window.visualViewport;
    const f = () => stick.current && requestAnimationFrame(() => scrollToBottom());
    vv?.addEventListener("resize", f);
    return () => vv?.removeEventListener("resize", f);
  }, [scrollToBottom]);

  const onRestTimer = useCallback((seconds: number, label: string) => {
    setRest({ endsAt: Date.now() + seconds * 1000, total: seconds, label });
  }, []);

  const submit = useCallback(
    async (raw: string, fromQueue = false) => {
      const text = raw.trim();
      if (!text) return;
      stick.current = true;
      if (!navigator.onLine) {
        writeQueue([...readQueue(), text]);
        return;
      }
      // Fast path: terse set shorthand during a workout is logged with no model call —
      // unless the coach just asked a question, in which case a bare number is an answer.
      if (header.activeWorkout && quickParse(text) && !lastAssistantText(messages).endsWith("?")) {
        try {
          const r = await quickLogSet(text);
          if (r.handled) {
            setMessages((prev) => [...prev, r.userMessage as ChatMessage, r.assistantMessage as ChatMessage]);
            setPad(r.pad);
            router.refresh();
            return;
          }
        } catch {
          // fall through to the model
        }
      }
      try {
        await sendMessage({ text });
      } catch {
        if (!fromQueue) writeQueue([...readQueue(), text]);
      }
    },
    [header.activeWorkout, messages, router, sendMessage, setMessages],
  );

  // offline outbox: replay queued messages whenever we come back online
  useEffect(() => {
    if (offline) return;
    const q = readQueue();
    if (q.length === 0) return;
    writeQueue([]);
    (async () => {
      for (const text of q) await submit(text, true);
    })();
  }, [offline, submit]);

  const voice = useVoice((transcript) => submit(transcript));

  const busy = status === "submitted" || status === "streaming";

  // first-run nudge: empty thread → coach introduces itself
  useEffect(() => {
    if (initialMessages.length === 0 && status === "ready" && messages.length === 0) {
      sendMessage({ text: "Hi — I'm new here. Set me up." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastId = messages.at(-1)?.id;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header data={header} onStart={header.nextWorkout && !header.activeWorkout ? () => setCheckin(true) : undefined} />
      <main ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-2">
        <div ref={contentRef} className="mx-auto w-full max-w-xl">
          {messages.map((m, i) => {
            const day = dayOf(m);
            const prevDay = i > 0 ? dayOf(messages[i - 1]) : null;
            return (
              <div key={m.id}>
                {day !== prevDay && (
                  <div className="my-3 flex items-center gap-3 text-[11px] text-muted">
                    <div className="h-px flex-1 bg-line" />
                    {day}
                    <div className="h-px flex-1 bg-line" />
                  </div>
                )}
                <Message m={m} onRestTimer={initialIds.has(m.id) ? undefined : onRestTimer} interactive={m.id === lastId && !busy} onAnswer={(t) => submit(t)} />
              </div>
            );
          })}
          {status === "submitted" && <div className="my-2 text-sm text-muted">…</div>}
          {error && <div className="my-2 rounded-xl border border-danger/60 bg-surface px-3 py-2 text-sm text-danger">Something went wrong. Try again.</div>}
        </div>
      </main>

      <div className="shrink-0 border-t border-line bg-bg px-3 pb-2 pt-1.5">
        <RestTimer rest={rest} onDone={() => setRest(null)} onDismiss={() => setRest(null)} />
        {pad && header.activeWorkout && (
          <SetPad
            key={pad.current?.exerciseId ?? "none"}
            pad={pad}
            busy={busy}
            onLogged={(r) => {
              stick.current = true;
              setMessages((prev) => [...prev, r.userMessage as ChatMessage, r.assistantMessage as ChatMessage]);
              setPad(r.pad);
              router.refresh();
            }}
            onSwitched={(r) => {
              stick.current = true;
              setMessages((prev) => [...prev, r.assistantMessage as ChatMessage]);
              setPad(r.pad);
            }}
            onAllDone={() => submit("That's every planned exercise done.")}
            onFinish={() => submit("Workout done.")}
            onOther={() => inputRef.current?.focus()}
          />
        )}
        {offline && <div className="mx-auto mb-1 max-w-xl text-center text-[11px] text-warn">Offline — messages will send when you&apos;re back.</div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = input;
            setInput("");
            submit(t);
          }}
          className="mx-auto flex max-w-xl items-end gap-2"
        >
          <button
            type="button"
            onClick={voice.toggle}
            disabled={!voice.supported}
            className={`h-11 w-11 shrink-0 rounded-full border text-lg ${voice.listening ? "border-danger bg-danger/20" : "border-line bg-surface"} disabled:opacity-40`}
            aria-label={voice.listening ? "Stop listening" : "Speak"}
          >
            {voice.listening ? "●" : "🎙"}
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setTimeout(() => stick.current && scrollToBottom(), 250)}
            placeholder={header.activeWorkout ? "60x10 @1 · same · +2.5 · next…" : "Talk to Coach…"}
            enterKeyHint="send"
            autoCapitalize="off"
            autoCorrect="off"
            className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-[16px] outline-none focus:border-accent"
          />
          <button type="submit" disabled={busy || !input.trim()} className="h-11 shrink-0 rounded-full bg-accent px-4 font-medium text-black disabled:opacity-40">
            Send
          </button>
        </form>
      </div>

      {checkin && header.nextWorkout && (
        <CheckinSheet
          workoutName={header.nextWorkout}
          onClose={() => setCheckin(false)}
          onSubmit={(text) => {
            setCheckin(false);
            submit(text);
          }}
        />
      )}
    </div>
  );
}

function Message({ m, onRestTimer, interactive, onAnswer }: { m: UIMessage; onRestTimer?: (s: number, l: string) => void; interactive: boolean; onAnswer: (t: string) => void }) {
  if (m.role === "user") {
    const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <div className="my-1.5 flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-surface-2 px-3.5 py-2 text-sm">{text}</div>
      </div>
    );
  }
  return (
    <div className="my-1.5">
      {m.parts.map((p, i) => {
        if (p.type === "text") return p.text.trim() ? <RichText key={i} text={p.text} /> : null;
        if (p.type.startsWith("tool-")) {
          const tp = p as Parameters<typeof ToolCard>[0]["part"];
          return <ToolCard key={tp.toolCallId} part={tp} onRestTimer={onRestTimer} interactive={interactive} onAnswer={onAnswer} />;
        }
        return null;
      })}
    </div>
  );
}
