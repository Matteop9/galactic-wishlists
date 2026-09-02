import type { ReactNode, KeyboardEvent, MouseEvent } from 'react';
import { Link } from 'react-router-dom';

/**
 * Wraps a player's name so it navigates to their profile, without also
 * triggering the parent — feed cards (e.g. `Home.tsx`) are `role="link"`
 * divs that navigate on click AND on Enter, so both handlers here stop
 * propagation before it reaches that parent.
 *
 * - No `profileId` (a guest seat) → plain, non-interactive span.
 * - `profileId === myId` → links to my own profile.
 * - Otherwise → links to `/players/:id`.
 */
export default function PlayerLink({
  profileId,
  myId,
  className,
  children,
}: {
  profileId: string | null | undefined;
  myId: string;
  className?: string;
  children: ReactNode;
}) {
  if (!profileId) {
    return <span className={className}>{children}</span>;
  }

  const to = profileId === myId ? '/profile' : `/players/${profileId}`;

  const stop = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <Link
      to={to}
      className={className}
      onClick={stop}
      onKeyDown={stop}
    >
      {children}
    </Link>
  );
}
