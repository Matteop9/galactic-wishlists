// Profile cover-band themes (feedback: "personalise our banner?"). Four skies,
// one key each — stored in profiles.cover_theme (DB CHECK mirrors these keys).
// The band's chart-paper art (dot grid, route, plane) stays paper-toned on all
// of them, so every theme keeps the flight-chart identity.
export const COVER_THEMES = {
  day: { label: "Day", from: "#0e7c86", to: "#0a5d64" },
  sunset: { label: "Sunset", from: "#c05c3b", to: "#8e3122" },
  night: { label: "Night", from: "#2b3947", to: "#141c26" },
  gold: { label: "Gold", from: "#b98a2e", to: "#8f6a20" },
} as const;

export type CoverTheme = keyof typeof COVER_THEMES;

export function isCoverTheme(v: unknown): v is CoverTheme {
  return typeof v === "string" && v in COVER_THEMES;
}

export function coverGradient(theme: string | null | undefined): string {
  const t = COVER_THEMES[isCoverTheme(theme) ? theme : "day"];
  return `linear-gradient(to right, ${t.from}, ${t.to})`;
}
