"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";

export default function UserMenu({
  handle,
  avatarSeed,
  isAdmin,
}: {
  handle: string | null;
  avatarSeed: string | null;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-ink hover:text-sky"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar seed={avatarSeed ?? handle} admin={isAdmin} size={26} />
        {handle && <span className="hidden normal-case sm:inline">@{handle}</span>}
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-lg border border-paper-edge bg-paper shadow-lg"
          >
            {handle && (
              <Link
                href={`/u/${handle}`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-ink hover:bg-paper-deep"
              >
                Profile
              </Link>
            )}
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block border-t border-paper-edge px-4 py-2.5 text-sm text-ink hover:bg-paper-deep"
            >
              Settings
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
