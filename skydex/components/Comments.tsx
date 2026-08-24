"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { addComment } from "@/app/actions/comments";
import ReportButton from "@/components/ReportButton";
import Avatar from "@/components/Avatar";
import FlyerStar from "@/components/FlyerStar";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: {
    handle: string | null;
    avatar_seed: string | null;
    is_admin: boolean | null;
    frequent_flyer: boolean | null;
  } | null;
};

export default function Comments({
  sightingId,
  currentUserId,
  isAdmin = false,
  count = 0,
}: {
  sightingId: string;
  currentUserId: string | null;
  isAdmin?: boolean;
  count?: number;
}) {
  const supabase = useRef(createClient()).current;
  const [comments, setComments] = useState<Comment[]>([]);
  const [n, setN] = useState(count);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("comments")
      .select("id, body, created_at, user_id, profiles(handle, avatar_seed, is_admin, frequent_flyer)")
      .eq("sighting_id", sightingId)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as unknown as Comment[];
    setComments(list);
    setN(list.length);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) {
      setErr("Could not delete comment.");
      return;
    }
    load();
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function add() {
    const text = body.trim();
    if (!text || !currentUserId || busy) return;
    setBusy(true);
    setErr(null);
    const res = await addComment(sightingId, text);
    setBusy(false);
    if (res.ok) {
      setBody("");
      load();
    } else {
      setErr(res.error ?? "Could not post comment.");
    }
  }

  return (
    <div className="border-t border-paper-edge px-4 py-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 font-mono text-xs lowercase tracking-wide text-sky hover:text-sky-deep"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {open ? "hide comments" : n > 0 ? `${n} comment${n === 1 ? "" : "s"}` : "comment"}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {comments.length === 0 && (
            <p className="text-sm text-ink-faint">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
              <div className="flex items-start gap-2">
                {c.profiles?.handle ? (
                  <Link
                    href={`/u/${c.profiles.handle}`}
                    className="flex shrink-0 items-center gap-2 hover:underline"
                  >
                    <Avatar
                      seed={c.profiles.avatar_seed ?? c.profiles.handle}
                      admin={Boolean(c.profiles.is_admin)}
                      size={20}
                    />
                    <span className="font-mono text-xs text-sky">
                      @{c.profiles.handle}
                      <FlyerStar show={c.profiles.frequent_flyer} />
                    </span>
                  </Link>
                ) : (
                  <span className="flex shrink-0 items-center gap-2">
                    <Avatar seed={c.profiles?.avatar_seed ?? c.profiles?.handle} admin={false} size={20} />
                    <span className="font-mono text-xs text-sky">@spotter</span>
                  </span>
                )}
                <span className="text-ink">{c.body}</span>
              </div>
              <span className="flex shrink-0 items-center gap-2">
                {currentUserId && c.user_id !== currentUserId && (
                  <ReportButton
                    targetType="comment"
                    targetId={c.id}
                    currentUserId={currentUserId}
                    className="font-mono text-[11px] uppercase text-ink-faint hover:text-stamp disabled:opacity-60"
                  />
                )}
                {(isAdmin || c.user_id === currentUserId) && (
                  <button
                    onClick={() => remove(c.id)}
                    aria-label="Delete comment"
                    className="font-mono text-xs text-ink-faint hover:text-stamp"
                  >
                    ✕
                  </button>
                )}
              </span>
            </div>
          ))}

          {currentUserId ? (
            <div className="mt-1 flex flex-col gap-1">
              <div className="flex gap-2">
                <input
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    if (err) setErr(null);
                  }}
                  maxLength={500}
                  placeholder="Add a comment…"
                  onKeyDown={(e) => {
                    // isComposing: Enter confirms an IME composition, not a submit
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) add();
                  }}
                  className="flex-1 rounded-md border border-paper-edge bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sky"
                />
                <button
                  onClick={add}
                  disabled={busy || !body.trim()}
                  className="sd-btn sd-btn--log !px-4 !py-2 !text-sm"
                >
                  Post
                </button>
              </div>
              {err && <p className="text-xs text-stamp">{err}</p>}
            </div>
          ) : (
            <p className="text-xs text-ink-faint">Sign in to comment.</p>
          )}
        </div>
      )}
    </div>
  );
}
