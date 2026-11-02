"use client";

import { logout } from "@/app/settings-actions";

export function LogoutButton() {
  return (
    <button onClick={() => logout()} className="rounded-lg border border-line px-3 py-1.5 text-xs">
      Lock
    </button>
  );
}
