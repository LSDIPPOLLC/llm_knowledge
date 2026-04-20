// Editorial micro-flourishes. Quiet, deterministic, skippable.

export const DEKS: string[] = [
  "read, write, and let the machine compile your raw sources into a structured reference.",
  "a commonplace book for the era of language models. pick a vault, begin the record.",
  "set down what you read. the wiki remembers what you do not.",
  "an archive that composts — sources in, interpretations out.",
  "slow scholarship, at a keystroke's pace.",
  "every note a pull-quote for some future self.",
];

export const CMDK_EMPTIES: string[] = [
  "the archive yields nothing. try another spelling.",
  "silence from the stacks.",
  "no such entry — perhaps ingest one?",
  "not indexed. yet.",
];

export const PALETTE_TYPO_QUIPS: string[] = [
  "Hmm — nothing catalogued under that title.",
  "The shelves are quiet on this one.",
  "A gap in the record.",
];

// Pick by hour-of-day → stable within ~60 min, varied across day.
export function pickByHour<T>(arr: T[]): T {
  const h = new Date().getHours();
  return arr[h % arr.length];
}

// Random but stable per session.
let _rand: number | null = null;
export function sessionPick<T>(arr: T[]): T {
  if (_rand === null) _rand = Math.random();
  return arr[Math.floor(_rand * arr.length) % arr.length];
}

// Cheap string → int hash for deterministic per-node jitter.
export function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// Hand-typeset tilt: ±1.5° deterministic from id.
export function jitterAngle(id: string): number {
  return ((hash32(id) % 300) / 100 - 1.5);
}

// Pad volume number.
export function roman(n: number): string {
  return String(n).padStart(3, "0");
}

// Console colophon — logged once on boot. Only developers notice.
export function printColophon(pages: number | null) {
  const c1 = "color: #b23a2a; font: italic 600 18px/1 Fraunces, serif;";
  const c2 = "color: #8a6f4a; font: italic 400 11px/1.6 Fraunces, serif; letter-spacing: 0.2em;";
  const c3 = "color: #7a6e5d; font: 400 11px/1.6 ui-monospace, monospace;";
  const date = new Date().toISOString().slice(0, 10);
  console.log(
    `%cideallm%c — vol. ${roman(pages ?? 1)} — a personal llm wiki\n%ccompiled ${date} · keep a slow record.`,
    c1, c2, c3
  );
}
