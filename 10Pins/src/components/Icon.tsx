/**
 * The icon system (B1, feedback queue triage 2 Sept): every glyph the app uses
 * — tab bar, chrome, status indicators — draws from here instead of a text
 * character or emoji. Same visual weight as the original tab icons: 24
 * viewBox, no fill, round caps/joins, 1.8 stroke by default.
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
  | 'image';

const PATHS: Record<Exclude<IconName, 'image'>, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5',
  groups:
    'M7 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 19c.5-3 2.5-4.5 4.5-4.5S11 16 11.5 19m1-.5c.4-2.4 2-4 4.5-4s4 1.5 4.5 4',
  stats: 'M4 20V10m5.5 10V4m5.5 16v-7m5.5 7V7',
  profile: 'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 9c.8-3.5 3.5-5.5 7-5.5s6.2 2 7 5.5',
  bell: 'M12 3a5 5 0 0 0-5 5v2.3c0 2.1-.9 3.4-1.5 4.2a1 1 0 0 0 .8 1.6h11.4a1 1 0 0 0 .8-1.6c-.6-.8-1.5-2.1-1.5-4.2V8a5 5 0 0 0-5-5ZM10 18.3a2 2 0 0 0 4 0',
  comment: 'M4 5h16v11h-6.5L9 19.5V16H4V5Z',
  'chevron-left': 'M15 5 8 12l7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-up': 'M5 15l7-7 7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  'arrow-down': 'M12 5v14M6 13l6 6 6-6',
  x: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
};

export default function Icon({
  name,
  className = 'size-5',
  strokeWidth = 1.8,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  if (name === 'image') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
        <path d="M3.5 15 9 10 14 15 17 12.5 20.5 15.5" />
        <circle cx="15.5" cy="8" r="1.6" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
