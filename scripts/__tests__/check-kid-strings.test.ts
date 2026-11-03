import { describe, expect, it } from "vite-plus/test";
import { fixture, runScript } from "./run";

// Japanese text is built from code points so this file stays English (AGENTS.md hard rule 1);
// the formatter would turn \u escapes back into the characters.
const A = String.fromCodePoint(0x3042); // one hiragana
const AKAI = String.fromCodePoint(0x3042, 0x304b, 0x3044); // three hiragana
const AKA_KANJI = String.fromCodePoint(0x8d64); // one kanji

type Card = { id: string; color: string; shape: string; pattern: string; label: object };
const card = (over: Partial<Card> = {}): Card => ({
  id: "red",
  color: "#d33",
  shape: "circle",
  pattern: "stripes-v",
  label: { ja: AKAI, en: "red" },
  ...over,
});

function content(over: { ja?: object; en?: object; cards?: unknown; parentsEn?: object } = {}) {
  return {
    "src/content/strings.ja.json": JSON.stringify(over.ja ?? { start: AKAI }),
    "src/content/strings.en.json": JSON.stringify(over.en ?? { start: "Tap" }),
    "src/content/parents.ja.json": JSON.stringify({ lessons: [] }),
    "src/content/parents.en.json": JSON.stringify(over.parentsEn ?? { lessons: [] }),
    "src/content/cards.json": JSON.stringify(over.cards ?? [card()]),
  };
}

const check = (files: Record<string, string>) => runScript(fixture(files), "check-kid-strings.mjs");

describe("check-kid-strings", () => {
  it("passes valid content", () => {
    expect(check(content())).toMatchObject({ status: 0 });
  });

  it("rejects kanji and romaji in child-facing text", () => {
    const r = check(content({ ja: { start: AKA_KANJI }, en: { start: "x" } }));
    expect(r.status).toBe(1);
    expect(r.out).toContain("kanji is not allowed");
    expect(check(content({ ja: { start: "abc" } })).out).toContain("romaji is not allowed");
  });

  it("allows 12 characters per line and 2 lines, not more", () => {
    const twelve = AKAI.repeat(4);
    expect(check(content({ ja: { start: `${twelve}\n${twelve}` } })).status).toBe(0);
    expect(check(content({ ja: { start: `${twelve}${A}` } })).out).toContain("13 characters");
    expect(check(content({ ja: { start: `${AKAI}\n${AKAI}\n${AKAI}` } })).out).toContain("3 lines");
  });

  it("skips parent-facing keys", () => {
    expect(check(content({ ja: { parentNote: AKA_KANJI }, en: { parentNote: "x" } })).status).toBe(
      0,
    );
  });

  it("requires the same keys in the ja and en files", () => {
    const r = check(content({ en: { start: "Tap", extra: "x" } }));
    expect(r.status).toBe(1);
    expect(r.out).toContain("missing key");
    expect(check(content({ parentsEn: { lessons: [1] } })).out).toContain("does not match");
  });

  it("rejects incomplete cards and two cards that look the same", () => {
    expect(check(content({ cards: [card({ shape: " " })] })).out).toContain("shape");
    expect(check(content({ cards: [card({ label: { ja: AKAI } })] })).out).toContain("label.en");
    expect(check(content({ cards: [card(), card({ id: "b" })] })).out).toContain(
      "same color, shape and pattern",
    );
    expect(check(content({ cards: {} })).out).toContain("must be an array");
  });
});
