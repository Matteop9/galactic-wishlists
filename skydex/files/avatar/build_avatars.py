#!/usr/bin/env python3
"""SkyDex avatar system: 12 motifs x 8 colours x 3 backgrounds = 288 unique icons."""

# ---- 12 monoline plane-spotter motifs, each drawn in a 100x100 box, centred ~ (50,50) ----
# Stroke-based so they recolour cleanly. {C} = stroke colour placeholder.
GLYPHS = {
  # --- aircraft ---
  "airliner": '''
    <path d="M50 18 L54 44 L84 58 L84 64 L54 56 L52 74 L62 82 L62 86 L50 82 L38 86 L38 82 L48 74 L46 56 L16 64 L16 58 L46 44 Z" fill="{C}"/>''',
  "jet": '''
    <g fill="{C}">
      <path d="M18 54 Q14 52 16 49 L40 47 L58 30 L64 30 L54 47 L74 46 L82 38 L86 38 L82 48 Q83 50 82 52 L86 52 L82 62 L78 62 L74 54 L54 53 L64 70 L58 70 L40 53 L16 51 Q14 56 18 54 Z"/>
    </g>''',
  "prop": '''
    <g fill="none" stroke="{C}" stroke-width="4.5" stroke-linecap="round">
      <path d="M50 24 L50 76"/><path d="M26 50 L74 50"/>
      <path d="M38 30 Q50 22 62 30"/><path d="M38 70 Q50 78 62 70"/>
    </g><circle cx="50" cy="50" r="5" fill="{C}"/>''',
  "helicopter": '''
    <g fill="none" stroke="{C}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M24 36 L76 36"/>
      <path d="M50 36 L50 44"/>
      <path d="M34 58 Q34 44 50 44 Q60 44 64 52 L82 56 L82 60 L66 62 Q62 64 50 64 Q34 64 34 58 Z"/>
      <path d="M28 64 L44 64"/>
      <path d="M78 50 L78 64"/>
    </g>''',
  # --- the kit ---
  "control_tower": '''
    <g fill="none" stroke="{C}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M43 82 L45 52 L55 52 L57 82"/>
      <path d="M36 52 L64 52 L58 40 L42 40 Z"/>
      <path d="M50 40 L50 28"/>
      <path d="M45 28 L55 28"/>
      <path d="M34 82 L66 82"/>
    </g>''',
  "radio_tower": '''
    <g fill="none" stroke="{C}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M50 22 L34 84"/><path d="M50 22 L66 84"/>
      <path d="M44 46 L56 46"/><path d="M40 62 L60 62"/><path d="M36 78 L64 78"/>
    </g>
    <g fill="none" stroke="{C}" stroke-width="3" stroke-linecap="round">
      <path d="M50 22 Q40 16 36 22"/><path d="M50 22 Q60 16 64 22"/>
    </g><circle cx="50" cy="22" r="3.5" fill="{C}"/>''',
  "suitcase": '''
    <g fill="none" stroke="{C}" stroke-width="4" stroke-linejoin="round">
      <rect x="26" y="38" width="48" height="42" rx="5"/>
      <path d="M40 38 L40 30 Q40 26 44 26 L56 26 Q60 26 60 30 L60 38"/>
      <path d="M50 38 L50 80"/>
    </g>''',
  "binoculars": '''
    <g fill="none" stroke="{C}" stroke-width="4" stroke-linejoin="round">
      <rect x="22" y="40" width="22" height="34" rx="9"/>
      <rect x="56" y="40" width="22" height="34" rx="9"/>
      <path d="M44 50 L56 50"/>
      <path d="M28 40 L34 30 L38 30"/><path d="M72 40 L66 30 L62 30"/>
    </g>''',
  "windsock": '''
    <g fill="none" stroke="{C}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M30 22 L30 82"/>
      <path d="M30 32 L70 38 L66 50 L30 52 Z"/>
      <path d="M70 38 L74 40"/>
    </g>''',
  "compass": '''
    <circle cx="50" cy="50" r="28" fill="none" stroke="{C}" stroke-width="4"/>
    <path d="M50 30 L57 50 L50 70 L43 50 Z" fill="{C}"/>
    <circle cx="50" cy="50" r="3.5" fill="none" stroke="{C}" stroke-width="3"/>''',
  "ticket": '''
    <g fill="none" stroke="{C}" stroke-width="4" stroke-linejoin="round">
      <path d="M24 38 L76 38 Q76 46 80 48 Q76 50 76 58 L76 72 L24 72 L24 58 Q28 50 24 48 Q28 46 24 38 Z"/>
      <path d="M58 38 L58 72" stroke-dasharray="3 5"/>
    </g>''',
  "globe": '''
    <circle cx="50" cy="50" r="28" fill="none" stroke="{C}" stroke-width="4"/>
    <g fill="none" stroke="{C}" stroke-width="3">
      <path d="M22 50 L78 50"/>
      <ellipse cx="50" cy="50" rx="13" ry="28"/>
      <path d="M28 36 Q50 44 72 36"/><path d="M28 64 Q50 56 72 64"/>
    </g>''',
}

# ---- 8 brand background colours (name -> (bg, glyph)) ----
# glyph colour chosen for contrast on the bg
PALETTES = {
  "paper":     ("#F2EBDC", "#20262B"),
  "ink":       ("#20262B", "#F2EBDC"),
  "sky":       ("#0E7C86", "#F2EBDC"),
  "sky_tint":  ("#CDE5E6", "#0A5D64"),
  "stamp":     ("#B5402E", "#F8E9E3"),
  "brass":     ("#B98A2E", "#2A2010"),
  "field":     ("#3E7A5A", "#EAF3E9"),
  "altitude":  ("#2E5E86", "#E2EEF7"),
}

# ---- 3 background treatments ----
def bg_solid(bg, glyph):
    return f'<rect width="100" height="100" rx="22" fill="{bg}"/>'

def bg_roundel(bg, glyph):
    # RAF-style concentric rings behind the glyph
    return (f'<rect width="100" height="100" rx="22" fill="{bg}"/>'
            f'<circle cx="50" cy="50" r="40" fill="none" stroke="{glyph}" stroke-width="2" opacity="0.22"/>'
            f'<circle cx="50" cy="50" r="32" fill="none" stroke="{glyph}" stroke-width="1.2" opacity="0.16"/>')

def bg_stamp(bg, glyph):
    # dashed verification-style ring
    return (f'<rect width="100" height="100" rx="22" fill="{bg}"/>'
            f'<circle cx="50" cy="50" r="41" fill="none" stroke="{glyph}" stroke-width="2.4" opacity="0.30"/>'
            f'<circle cx="50" cy="50" r="35" fill="none" stroke="{glyph}" stroke-width="1" stroke-dasharray="2 4" opacity="0.25"/>')

BACKGROUNDS = {"solid": bg_solid, "roundel": bg_roundel, "stamp": bg_stamp}

def make_avatar(motif, palette, treatment):
    bg, glyph = PALETTES[palette]
    body = BACKGROUNDS[treatment](bg, glyph)
    g = GLYPHS[motif].format(C=glyph)
    return (f'<svg width="100" height="100" viewBox="0 0 100 100" '
            f'xmlns="http://www.w3.org/2000/svg" role="img" '
            f'aria-label="SkyDex avatar {motif} {palette} {treatment}">'
            f'{body}{g}</svg>')

if __name__ == "__main__":
    import os, itertools
    os.makedirs("avatars/all", exist_ok=True)
    n = 0
    for motif, pal, trt in itertools.product(GLYPHS, PALETTES, BACKGROUNDS):
        svg = make_avatar(motif, pal, trt)
        open(f"avatars/all/{motif}__{pal}__{trt}.svg", "w").write(svg)
        n += 1
    print(f"motifs={len(GLYPHS)} palettes={len(PALETTES)} treatments={len(BACKGROUNDS)}")
    print(f"total unique avatars = {n}")
