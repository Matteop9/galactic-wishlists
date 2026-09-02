import type { Roll, ScoredFrame } from '../../engine';

/** Scorecard notation: numerals, X, /, – miss, F foul. */
export function glyph(roll: Roll): string {
  if (roll === 0) return '–';
  return String(roll);
}

/**
 * Fixed-slot glyphs for one frame cell: two slots in frames 1–9 (a strike sits
 * in the second slot, first left empty, per the design fixtures), three in the 10th.
 */
export function frameGlyphs(frame: ScoredFrame | undefined, isTenth: boolean): string[] {
  const slots = isTenth ? 3 : 2;
  const out: string[] = Array(slots).fill('');
  if (!frame) return out;
  if (!isTenth && frame.isStrike) {
    out[1] = 'X';
    return out;
  }
  frame.rolls.forEach((roll, i) => {
    if (i < slots) out[i] = glyph(roll);
  });
  return out;
}

/** One glyph per frame for the compact mini strip: X, /, or the frame’s pin count. */
export function miniGlyph(frame: ScoredFrame | undefined): string {
  if (!frame || frame.rolls.length === 0) return '';
  if (frame.isStrike) return 'X';
  if (frame.isSpare) return '/';
  const pins = frame.pinsPerRoll.reduce((a, b) => a + b, 0);
  return pins === 0 ? '–' : String(pins);
}

/** Colour treatment per glyph: fouls signal, misses faint, marks glass-glow. */
export function glyphColor(g: string): string {
  if (g === 'F') return 'text-signal';
  if (g === '–') return 'text-faint';
  return 'text-mark glow-mark';
}
