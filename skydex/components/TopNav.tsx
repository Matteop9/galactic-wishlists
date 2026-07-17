import Link from "next/link";
import { getViewer } from "@/lib/auth";
import UserMenu from "@/components/UserMenu";

export default async function TopNav() {
  const { user, handle, avatarSeed, isAdmin } = await getViewer();

  // The safe-area-inset-top padding keeps the paper header under the status bar
  // in standalone/PWA mode (viewportFit: "cover") — it is 0 in a regular browser tab.
  return (
    <header className="border-b-2 border-ink bg-paper pt-[env(safe-area-inset-top)]">
      <nav className="mx-auto flex max-w-3xl flex-nowrap items-center justify-between gap-2 px-5 py-3">
        <Link href="/" aria-label="SkyDex — home" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tag-mark.svg" alt="SkyDex" className="h-9 w-auto" />
        </Link>

        <div className="flex items-center gap-1">
          {user ? (
            <>
              {/* primary nav now lives in the fixed bottom tab bar */}
              <UserMenu handle={handle} avatarSeed={avatarSeed} isAdmin={isAdmin} />
            </>
          ) : (
            <>
              <Link
                href="/feed"
                className="rounded-md p-2 font-display text-sm font-semibold uppercase tracking-wide text-ink-soft hover:text-ink"
              >
                Feed
              </Link>
              <Link href="/login" className="sd-btn sd-btn--capture !px-4 !py-2 !text-sm">
                Sign in
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
