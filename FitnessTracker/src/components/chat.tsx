"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { quickLogSet } from "@/app/actions";
import { quickParse } from "@/lib/quickparse";
import { Header, type HeaderData } from "./header";
import { ToolCard } from "./cards";
import { RestTimer, type RestState } from "./rest-timer";
import { useVoice } from "./use-voice";

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

export function Chat({ initialMessages, header }: { initialMessages: UIMessage[]; header: HeaderData }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [rest, setRest] = useState<RestState>(null);
  const offline = useSyncExternalStore(subscribeOnline, () => !navigator.onLine, () => false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Cards from messages loaded at mount never restart the rest timer.
  const initialIds = useMemo(() => new Set(initialMessages.map((m) => m.id)), [initialMessages]);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status, rest]);

  const onRestTimer = useCallback((seconds: number, label: string) => {
    setRest({ endsAt: Date.now() + seconds * 1000, total: seconds, label });
  }, []);

  const submit = useCallback(
    async (raw: string, fromQueue = false) => {
      const text = raw.trim();
      if (!text) return;
      if (!navigator.onLine) {
        writeQueue([...readQueue(), text]);
        return;
      }
      // Fast path: terse set shorthand during a workout is logged with no model call.
      if (header.activeWorkout && quickParse(text)) {
        try {
          const r = await quickLogSet(text);
          if (r.handled) {
            setMessages((prev) => [...prev, r.userMessage, r.assistantMessage]);
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
    [header.activeWorkout, router, sendMessage, setMessages],
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

  return (
    <div className="flex min-h-dvh flex-col">
      <Header data={header} />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-4 pt-3">
        {messages.map((m) => (
          <Message key={m.id} m={m} onRestTimer={initialIds.has(m.id) ? undefined : onRestTimer} />
        ))}
        {status === "submitted" && <div className="my-2 text-sm text-muted">…</div>}
        {error && <div className="my-2 rounded-xl border border-danger/60 bg-surface px-3 py-2 text-sm text-danger">Something went wrong. Try again.</div>}
        <div ref={bottomRef} className="h-2" />
      </main>
      <div className="pb-safe sticky bottom-14 z-10 bg-bg/95 px-3 pt-1 backdrop-blur">
        <RestTimer rest={rest} onDone={() => setRest(null)} onDismiss={() => setRest(null)} />
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
    </div>
  );
}

function Message({ m, onRestTimer }: { m: UIMessage; onRestTimer?: (s: number, l: string) => void }) {
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
        if (p.type === "text") return p.text.trim() ? <p key={i} className="my-1 whitespace-pre-wrap text-[15px] leading-relaxed">{p.text}</p> : null;
        if (p.type.startsWith("tool-")) {
          const tp = p as Parameters<typeof ToolCard>[0]["part"];
          return <ToolCard key={tp.toolCallId} part={tp} onRestTimer={onRestTimer} />;
        }
        return null;
      })}
    </div>
  );
}
