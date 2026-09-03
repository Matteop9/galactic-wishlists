/** First letter of up to the first two words of a name, upper-cased. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * A stable fill per person so the same name always gets the same disc: ink,
 * red, blue or faded ink, as on the design's group cards. Red and blue here
 * are identity, not meaning, and stay confined to the disc.
 */
const FILLS = ['bg-ink', 'bg-red', 'bg-blue', 'bg-ink-faded'] as const;

export function avatarFill(name: string): (typeof FILLS)[number] {
  let hash = 0;
  for (const ch of name.trim().toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FILLS[hash % FILLS.length];
}

/**
 * A round avatar (r4): the photo when `url` is set, else initials in Oswald on
 * a solid disc. `size` is a pixel diameter (default 32). `ring` adds a 2px
 * sheet ring for stacking avatars over one another.
 */
export default function Avatar({
  name,
  url,
  size = 32,
  className = '',
  ring = false,
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const ringClass = ring ? 'border-2 border-sheet' : '';
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`shrink-0 rounded-full object-cover ${ringClass} ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const fontSize = Math.round(size * 0.4);
  return (
    <span
      className={`num flex shrink-0 items-center justify-center rounded-full font-medium text-paper ${avatarFill(
        name,
      )} ${ringClass} ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {initials(name)}
    </span>
  );
}

/** Up to `max` avatars overlapped, then a "+n" disc. */
export function AvatarStack({
  people,
  size = 34,
  max = 3,
}: {
  people: { name: string; url?: string | null }[];
  size?: number;
  max?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex">
      {shown.map((p, i) => (
        <Avatar
          key={`${p.name}-${i}`}
          name={p.name}
          url={p.url}
          size={size}
          ring
          className={i > 0 ? '-ml-2.5' : ''}
        />
      ))}
      {rest > 0 && (
        <span
          className="num -ml-2.5 flex shrink-0 items-center justify-center rounded-full border-2 border-sheet bg-ink-faded font-medium text-paper"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
