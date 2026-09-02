/**
 * First letter of up to the first two words of a name, upper-cased — the
 * same rule used by the three copies this component will eventually replace
 * (`GroupPage.tsx`'s local `Avatar`, the header block in `Home.tsx`, and
 * `ProfilePage.tsx`'s hero). Not wired in here — that swap belongs to the UI
 * pass touching those files.
 */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * A round avatar: the photo when `url` is set, else initials on the same
 * well/border/glass idiom used across the app. `size` is a pixel diameter
 * (default 32, matching the existing `size-8` copies); font size scales with
 * it the way the three existing implementations do by hand (12px @ 32,
 * 13px @ 36, 20px @ 56).
 */
export default function Avatar({
  name,
  url,
  size = 32,
  className = '',
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const fontSize = Math.round(size * 0.36);
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-line bg-well font-display font-bold text-glass ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {initials(name)}
    </span>
  );
}
