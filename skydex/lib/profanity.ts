// Lightweight profanity guard for user-visible text (usernames + comments).
// Enforced server-side on the write paths (see app/profile/actions.ts and
// app/actions/comments.ts). Deliberately conservative: a curated list of clear
// profanity/slurs, matched against a "collapsed" form of the text so common
// evasions — spacing ("f u c k"), punctuation ("s.h.i.t") and leetspeak
// ("sh1t", "@ss") — are still caught.
//
// Trade-off: collapsing removes word boundaries, so a substring match can have
// false positives (the classic "Scunthorpe problem"). The list is kept to terms
// long/specific enough that this is rare; expand or adjust as needed.
const BANNED = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "bastard",
  "asshole",
  "dickhead",
  "bollocks",
  "wanker",
  "pussy",
  "slut",
  "whore",
  "nigger",
  "faggot",
  "retard",
  "twat",
  "prick",
  "cock",
  "dildo",
  "jizz",
  "spunk",
];

// Cyrillic/Greek letters that render identically to Latin ones. Without this,
// stripping non-[a-z] *deletes* a homoglyph instead of folding it — one swapped
// letter ("fuсk" with Cyrillic с) used to bypass the entire list.
const HOMOGLYPHS: Record<string, string> = {
  а: "a", е: "e", о: "o", р: "p", с: "c", х: "x", у: "y", і: "i", ѕ: "s",
  ј: "j", ԁ: "d", ɡ: "g", ν: "v", α: "a", β: "b", ε: "e", ι: "i", κ: "k",
  ο: "o", ρ: "p", τ: "t", υ: "u",
};

// Lowercase, decompose accents/fullwidth forms (NFKD), fold homoglyphs and common
// leetspeak to letters, then strip everything that isn't a letter — turning
// "S.h_1 t" (or "ѕhіt") into "shit".
function collapse(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // combining marks left by NFKD
    .replace(/[^\x00-\x7f]/g, (ch) => HOMOGLYPHS[ch] ?? "")
    .replace(/[4@]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z]/g, "");
}

/** True if the text contains a banned word (after evasion-normalisation). */
export function containsProfanity(text?: string | null): boolean {
  if (!text) return false;
  const c = collapse(text);
  return BANNED.some((w) => c.includes(w));
}
