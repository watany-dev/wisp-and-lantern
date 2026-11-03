import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { fixture, runScript } from "./run";

const FONT = "public/assets/fonts/zen-maru-gothic-subset.woff2";
// Built from code points: the formatter would turn \u escapes into Japanese characters.
const A = String.fromCodePoint(0x3042);
const KA = String.fromCodePoint(0x304b);
const RARE_KANJI = String.fromCodePoint(0x9b31); // never in the kana subset
const font = readFileSync(join(import.meta.dirname, "../..", FONT));

function check(jaStart: string) {
  return runScript(
    fixture({
      [FONT]: font,
      "src/content/strings.ja.json": JSON.stringify({ start: jaStart }),
      "src/content/strings.en.json": JSON.stringify({ start: "Tap to start" }),
      "src/content/parents.ja.json": "{}",
      "src/content/parents.en.json": "{}",
      "src/content/cards.json": "[]",
    }),
    "check-font-coverage.mjs",
  );
}

describe("check-font-coverage", () => {
  it("passes when the subset has every character", () => {
    expect(check(`${A}${KA}\n${A}`)).toMatchObject({ status: 0 });
  });

  it("lists characters the subset lacks", () => {
    const r = check(`${A}${RARE_KANJI}`);
    expect(r.status).toBe(1);
    expect(r.out).toContain("U+9B31");
    expect(r.out).not.toContain("U+3042");
  });
});
