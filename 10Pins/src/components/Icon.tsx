/**
 * The icon set: one stroke family (Lucide-style), 1.75px stroke, 24 viewBox,
 * round caps and joins, no fill. Every glyph the app draws comes from here.
 * No emoji, no text characters standing in for icons.
 *
 * Circles are written as arcs so every icon is a single `<path d>`.
 */
export type IconName =
  | 'home'
  | 'groups'
  | 'stats'
  | 'profile'
  | 'bell'
  | 'comment'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'arrow-up'
  | 'arrow-down'
  | 'x'
  | 'plus'
  | 'minus'
  | 'check'
  | 'image'
  | 'camera'
  | 'pencil'
  | 'calendar'
  | 'bolt'
  | 'share'
  | 'trash'
  | 'undo'
  | 'qr'
  | 'settings'
  | 'link'
  | 'copy'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'log-out'
  | 'user-plus'
  | 'eye'
  | 'flag'
  | 'clock'
  | 'play'
  | 'alert'
  | 'search'
  | 'refresh'
  | 'more'
  | 'flip'
  | 'inbox'
  | 'thumbs-up';

const c = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;

const PATHS: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5',
  groups: `${c(9, 8, 3.25)}M3.5 20c.7-3.2 2.9-5 5.5-5s4.8 1.8 5.5 5${c(17, 9, 2.5)}M16.5 14.5c2.2.2 3.6 1.7 4 4`,
  stats: 'M4 20V10M10 20V4M16 20v-8M21 20H3',
  profile: `${c(12, 8.5, 3.5)}M5 20c1-3.6 3.7-5.5 7-5.5s6 1.9 7 5.5`,
  bell: 'M6 8.5a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4s2-1.5 2-6.5M10 19a2.2 2.2 0 0 0 4 0',
  comment: 'M4 5h16v11h-6.5L9 19.5V16H4V5Z',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-up': 'M5 15l7-7 7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  'arrow-down': 'M12 5v14M6 13l6 6 6-6',
  x: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7',
  image: 'M3.5 4.5h17v15h-17zM3.5 15.5 9 10l5 5 3-2.5 3.5 3',
  camera: `M4 8h3l2-2.5h6L17 8h3v11H4z${c(12, 13, 3.25)}`,
  pencil: 'M17 3l4 4L8 20l-5 1 1-5z',
  calendar: 'M4 5h16v15H4zM4 10h16M8 3v4M16 3v4',
  bolt: 'M13 3l-3 8h4l-3 10 8-12h-5l3-6z',
  share: 'M4 13v7h16v-7M12 3v12M8 7l4-4 4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  undo: 'M3 12a9 9 0 1 0 2.6-6.4L3 8M3 3v5h5',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v3M17 20h3',
  settings: `M4 7h9M17 7h3M4 17h4M12 17h8${c(15, 7, 2)}${c(10, 17, 2)}`,
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2',
  copy: 'M9 9h11v11H9zM5 15V5h10',
  sun: `${c(12, 12, 4)}M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4`,
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  monitor: 'M3 4h18v13H3zM8 21h8M12 17v4',
  'log-out': 'M9 4H5v16h4M14 16l4-4-4-4M18 12H9',
  'user-plus': `${c(10, 8.5, 3.5)}M3 20c1-3.6 3.7-5.5 7-5.5 2 0 3.7.7 5 2M19 8v6M16 11h6`,
  eye: `M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z${c(12, 12, 2.5)}`,
  flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
  clock: `${c(12, 12, 9)}M12 7v5l3 2`,
  play: 'M7 5v14l11-7z',
  alert: 'M12 3l10 18H2zM12 10v4M12 17.5v.5',
  search: `${c(11, 11, 6)}M20 20l-4.5-4.5`,
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  flip: 'M12 3v18M7 8 3 12l4 4M17 8l4 4-4 4',
  inbox: 'M3 13h5l1.5 3h5L16 13h5M3 13l2.5-8h13L21 13v7H3z',
  'thumbs-up': 'M7 11v10H3V11zM7 11l4-8c1.5 0 3 1 3 3v4h5.5a1.5 1.5 0 0 1 1.5 1.7l-1.2 7A1.5 1.5 0 0 1 18.3 21H7',
};

export default function Icon({
  name,
  className = 'size-5',
  strokeWidth = 1.75,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
