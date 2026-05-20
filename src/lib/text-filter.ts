export const BASE_BLOCKED_WORDS = [
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "bitches",
  "asshole",
  "dick",
  "cock",
  "pussy",
  "cunt",
  "slut",
  "whore",
  "bastard",
  "damn",
  "crap",
  "nigger",
  "nigga",
  "niggah",
  "niggas",
  "niggaz",
  "n1gger",
  "n1gga",
  "ni99er",
  "ni99a",
  "fag",
  "faggot",
  "retard",
  "kike",
  "spic",
  "chink",
  "gook",
  "wetback",
  "tranny",
];

export function maskBlockedWords(text: string, words: string[]) {
  let out = text;
  for (const w of words) {
    if (!w) continue;
    const escaped = w.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    if (!escaped) continue;
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    out = out.replace(re, "#".repeat(w.length));
  }
  return out;
}