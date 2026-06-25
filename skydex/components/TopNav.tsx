import Link from "next/link";
import { getViewer } from "@/lib/auth";
import UserMenu from "@/components/UserMenu";
import NavLinks from "@/components/NavLinks";

export default async function TopNav() {
  const { user, handle, avatarSeed, isAdmin } = await getViewer();

  return (
    <header className="border-b-2 border-ink bg-paper">
      <nav className="mx-auto flex max-w-3xl flex-nowrap items-center justify-between gap-2 px-5 py-3">
        <Link
          href="/"
          className="shrink-0 font-display text-2xl font-bold leading-none tracking-tight text-ink"
        >
          Sky<span className="text-sky">Dex</span>
        </Link>

        <div className="flex items-center gap-1">
          {user ? (
            <>
              <NavLinks />
              <span aria-hidden className="mx-1 h-6 w-px bg-paper-edge" />
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
