"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> & { [i: number]: { isFinal: boolean } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

/** Web Speech API wrapper. Final transcript → onFinal. Works in iOS Safari PWAs. */
export function useVoice(onFinal: (text: string) => void) {
  const recRef = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const supported = useSyncExternalStore(
    () => () => {},
    () => {
      const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
      return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition);
    },
    () => false,
  );

  const toggle = useCallback(() => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-GB";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const text = last?.[0]?.transcript?.trim();
      if (text) onFinal(normaliseSpeech(text));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [listening, onFinal]);

  return { listening, supported, toggle };
}

/** "sixty by ten at one" → "60 x 10 @1" so the fast path can catch it. */
export function normaliseSpeech(t: string): string {
  let s = t.toLowerCase();
  const words: Record<string, string> = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", fifteen: "15", twenty: "20" };
  for (const [w, d] of Object.entries(words)) s = s.replace(new RegExp(`\\b${w}\\b`, "g"), d);
  s = s.replace(/\b(\d+)\s*(?:by|times|for)\s*(\d+)\b/g, "$1 x $2");
  s = s.replace(/\bat\s*(\d)\b/g, "@$1");
  s = s.replace(/\b(\d+)\s*(?:kilos?|kilograms?|kgs?)\b/g, "$1kg");
  s = s.replace(/\bplus\s*(\d)/g, "+$1").replace(/\bminus\s*(\d)/g, "-$1");
  return s;
}
