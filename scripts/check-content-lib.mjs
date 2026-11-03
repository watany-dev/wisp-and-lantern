// Shared helpers for the content checks and the font subsetter (protected: scripts/check-*).
import { readFileSync } from "node:fs";

export const CONTENT_DIR = "src/content";
export const FONT_PATH = "public/assets/fonts/zen-maru-gothic-subset.woff2";
export const CONTENT_FILES = [
  "strings.ja.json",
  "strings.en.json",
  "cards.json",
  "parents.ja.json",
  "parents.en.json",
].map((f) => `${CONTENT_DIR}/${f}`);

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Yields [path, value] for every string in a JSON value. Paths look like `a.b[0].c`. */
export function* strings(value, path = "") {
  if (typeof value === "string") yield [path, value];
  else if (Array.isArray(value)) {
    for (const [i, v] of value.entries()) yield* strings(v, `${path}[${i}]`);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) yield* strings(v, path ? `${path}.${k}` : k);
  }
}

/** Every code point used in the content files' string values, without whitespace and controls. */
export function contentCodePoints(files = CONTENT_FILES) {
  const set = new Set();
  for (const file of files) {
    for (const [, s] of strings(readJson(file))) {
      for (const ch of s) if (!/[\s\p{Cc}]/u.test(ch)) set.add(ch.codePointAt(0));
    }
  }
  return set;
}
