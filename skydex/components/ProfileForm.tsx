"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/app/profile/actions";
import { AIRPORTS_LIST } from "@/lib/airports";

export default function ProfileForm({
  initialHandle,
  initialHome,
}: {
  initialHandle: string;
  initialHome: string;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    {},
  );

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Username
        </span>
        <span className="flex items-center rounded-md border border-paper-edge bg-paper-deep focus-within:border-sky">
          <span className="pl-3 font-mono text-ink-faint">@</span>
          <input
            name="handle"
            defaultValue={initialHandle}
            required
            placeholder="spotter"
            className="w-full bg-transparent px-1.5 py-2.5 font-mono text-sm text-ink outline-none"
          />
        </span>
        <span className="text-xs text-ink-faint">
          3–20 characters: letters, numbers, underscores. This is how you appear on the feed.
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Home airport <span className="text-ink-faint">(optional)</span>
        </span>
        <input
          name="home_airport"
          defaultValue={initialHome}
          placeholder="LHR"
          maxLength={4}
          list="airport-options"
          autoComplete="off"
          className="rounded-md border border-paper-edge bg-paper-deep px-3 py-2.5 font-mono text-sm uppercase text-ink outline-none focus:border-sky"
        />
        <datalist id="airport-options">
          {AIRPORTS_LIST.map((a) => (
            <option key={a.code} value={a.code}>
              {a.name}
            </option>
          ))}
        </datalist>
        <span className="text-xs text-ink-faint">
          Start typing a code or city to pick from the list, e.g. LHR.
        </span>
      </label>

      {state.error && <p className="text-sm text-stamp">{state.error}</p>}
      {state.ok && <p className="text-sm text-sky">Saved.</p>}

      <button type="submit" disabled={pending} className="sd-btn sd-btn--capture self-start">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
