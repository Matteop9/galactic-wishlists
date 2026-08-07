// OG card (1200×630) ported from the Claude Design share-card template
// (ClaudeDesign/Spot On - Share Cards.dc.html). Rendered with next/og (Satori).

const fontCache = new Map<string, Promise<ArrayBuffer>>();

// Google Fonts serves TTF (Satori-compatible) to non-browser user agents
export function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const key = `${family}:${weight}`;
  const cached = fontCache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&display=swap`;
    const css = await (await fetch(cssUrl)).text();
    const m = css.match(/src:\s*url\((https:[^)]+)\)\s*format\('(?:truetype|opentype)'\)/);
    if (!m) throw new Error(`No TTF url for ${key}`);
    return (await fetch(m[1])).arrayBuffer();
  })();
  fontCache.set(key, promise);
  return promise;
}

export async function ogFonts() {
  const [archivo, plexSans, plexSansSemi, plexMono] = await Promise.all([
    loadGoogleFont('Archivo', 900),
    loadGoogleFont('IBM Plex Sans', 400),
    loadGoogleFont('IBM Plex Sans', 600),
    loadGoogleFont('IBM Plex Mono', 500),
  ]);
  return [
    { name: 'Archivo', data: archivo, weight: 900 as const },
    { name: 'PlexSans', data: plexSans, weight: 400 as const },
    { name: 'PlexSans', data: plexSansSemi, weight: 600 as const },
    { name: 'PlexMono', data: plexMono, weight: 500 as const },
  ];
}

export type OgCardProps = {
  leagueName: string;
  kicker: string;
  competitionLabel: string;
  subline: string;
  initials: string[]; // max 5
  overflow: number; // players beyond the shown initials
  playingLine: string;
  domain: string;
};

const ink = '#F2F5F7';
const bg = '#0B0F12';
const lime = '#C6FA3F';
const muted = '#8A99A6';
const hairline = 'rgba(242,245,247,0.09)';

export function OgCard(p: OgCardProps) {
  // share-card wiring notes: step the title down past 18 characters
  const titleSize = p.leagueName.length > 28 ? 56 : p.leagueName.length > 18 ? 70 : 88;
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '66px 76px',
        backgroundColor: bg,
        backgroundImage:
          'radial-gradient(circle at 15% -10%, rgba(198,250,63,0.20), rgba(11,15,18,0) 58%), radial-gradient(circle at 100% 110%, rgba(61,219,217,0.12), rgba(11,15,18,0) 60%)',
        fontFamily: 'PlexSans',
        position: 'relative',
      }}
    >
      {/* target geometry, right edge */}
      <div style={{ position: 'absolute', right: -140, top: 35, width: 560, height: 560, border: `1px solid ${hairline}`, borderRadius: 280 }} />
      <div style={{ position: 'absolute', right: 80, top: 175, width: 280, height: 280, border: `1px solid ${hairline}`, borderRadius: 140 }} />
      <div style={{ position: 'absolute', right: 198, top: 293, width: 44, height: 44, borderRadius: 22, backgroundColor: lime, opacity: 0.9 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 315, height: 1, backgroundColor: 'rgba(242,245,247,0.07)' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <svg viewBox="0 0 24 24" width="42" height="42" fill="none">
            <circle cx="12" cy="12" r="9" stroke={lime} strokeWidth="3" />
            <circle cx="12" cy="12" r="3.2" fill={lime} />
          </svg>
          <span style={{ fontFamily: 'Archivo', fontWeight: 900, fontSize: 30, letterSpacing: '-0.03em', textTransform: 'uppercase', color: ink }}>
            Spot On
          </span>
        </div>
        <span
          style={{
            padding: '10px 18px',
            borderRadius: 999,
            border: '1px solid rgba(242,245,247,0.16)',
            fontFamily: 'PlexMono',
            fontSize: 17,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: muted,
          }}
        >
          {p.competitionLabel}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 820 }}>
        <div style={{ fontFamily: 'PlexMono', fontSize: 19, letterSpacing: '0.22em', textTransform: 'uppercase', color: lime, marginBottom: 20 }}>
          {p.kicker}
        </div>
        <div
          style={{
            fontFamily: 'Archivo',
            fontWeight: 900,
            fontSize: titleSize,
            lineHeight: 0.94,
            letterSpacing: '-0.045em',
            textTransform: 'uppercase',
            color: ink,
          }}
        >
          {p.leagueName}
        </div>
        <div style={{ marginTop: 24, fontSize: 25, lineHeight: 1.4, color: muted, maxWidth: 560 }}>{p.subline}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {p.initials.length > 0 && (
            <div style={{ display: 'flex', marginLeft: 16 }}>
              {p.initials.map((a, i) => (
                <div
                  key={i}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#1D252C',
                    border: `3px solid ${bg}`,
                    marginLeft: -16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 19,
                    fontWeight: 600,
                    color: ink,
                  }}
                >
                  {a}
                </div>
              ))}
              {p.overflow > 0 && (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: lime,
                    border: `3px solid ${bg}`,
                    marginLeft: -16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 600,
                    color: bg,
                  }}
                >
                  +{p.overflow}
                </div>
              )}
            </div>
          )}
          <span style={{ fontSize: 21, color: muted }}>{p.playingLine}</span>
        </div>
        <span style={{ fontFamily: 'PlexMono', fontSize: 21, color: muted }}>{p.domain}</span>
      </div>
    </div>
  );
}

export function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
