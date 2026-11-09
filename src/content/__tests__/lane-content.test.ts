import { describe, expect, it } from "vite-plus/test";
import { colors, things } from "../../domain/lane";
import cards from "../cards.json";
import en from "../strings.en.json";
import ja from "../strings.ja.json";

const patterns = ["stripes-v", "dots", "plain"];
const colorCards = cards.filter((c) => c.kind === "color");
const thingCards = cards.filter((c) => c.kind === "thing");
const laneKeys = ["wish", "pickBoth", "pickColor", "pickThing", "ready", "right", "wrong", "again"];

/** Every name the wrong-result message can show: a color label and an object label. */
function itemNames(lang: "ja" | "en"): string[] {
  return colorCards.flatMap((c) => thingCards.map((t) => `${c.label[lang]} ${t.label[lang]}`));
}

/** Mirrors `scripts/check-kid-strings.mjs` (REQ-2.13): no kanji, no Latin letters, 12 x 2. */
function kidProblems(text: string): string[] {
  const problems: string[] = [];
  if (/\p{Script=Han}/u.test(text)) problems.push("kanji");
  if (/[A-Za-z]/.test(text)) problems.push("latin letters");
  const lines = text.split("\n");
  if (lines.length > 2) problems.push(`${lines.length} lines`);
  for (const line of lines) {
    // Hiragana and katakana are single UTF-16 units, so `length` counts characters here.
    const length = line.replace(/\s/gu, "").length;
    if (length > 12) problems.push(`${length} characters in "${line}"`);
  }
  return problems;
}

describe("cards.json (REQ-2.2, REQ-2.10)", () => {
  it("has exactly the domain's color and object cards, each under the right kind", () => {
    expect(colorCards.map((c) => c.id)).toEqual([...colors]);
    expect(thingCards.map((c) => c.id)).toEqual([...things]);
    expect(cards).toHaveLength(colors.length + things.length);
  });

  it("gives every color its own shape and pattern, from the patterns the game can draw", () => {
    const shapes = colorCards.map((c) => c.shape);
    expect(new Set(shapes).size).toBe(colorCards.length);
    expect(new Set(colorCards.map((c) => c.pattern)).size).toBe(colorCards.length);
    for (const c of colorCards) expect(patterns).toContain(c.pattern);
  });

  it("tells the objects apart by silhouette, with a neutral color and no pattern", () => {
    expect(new Set(thingCards.map((c) => c.shape)).size).toBe(thingCards.length);
    expect(new Set(thingCards.map((c) => c.color)).size).toBe(1);
    for (const c of thingCards) expect(c.pattern).toBe("plain");
    for (const c of colorCards) expect(thingCards.map((t) => t.color)).not.toContain(c.color);
  });
});

describe("lane strings (REQ-2.9, REQ-2.13)", () => {
  it("exist in both languages under the same keys", () => {
    expect(Object.keys(ja.lane)).toEqual(laneKeys);
    expect(Object.keys(en.lane)).toEqual(laneKeys);
  });

  it("insert the item name in the wrong-result message exactly once", () => {
    expect(ja.lane.wrong.split("{0}")).toHaveLength(2);
    expect(en.lane.wrong.split("{0}")).toHaveLength(2);
  });

  it("obey the Japanese rules for every item name the message can show", () => {
    for (const name of itemNames("ja")) {
      expect(kidProblems(ja.lane.wrong.replace("{0}", name)), name).toEqual([]);
    }
  });

  it("obey the Japanese rules in every other message and the retry button", () => {
    const { wrong: _wrong, ...rest } = ja.lane;
    for (const text of [...Object.values(rest), ja.retry])
      expect(kidProblems(text), text).toEqual([]);
  });

  it("name the item in the child's language", () => {
    expect(itemNames("ja")).toContain(`${colorCards[0]?.label.ja} ${thingCards[0]?.label.ja}`);
    expect(new Set(itemNames("ja")).size).toBe(colors.length * things.length);
    expect(itemNames("en")).toContain("red pumpkin");
    expect(itemNames("en")).toHaveLength(colors.length * things.length);
  });
});

describe("no blame (REQ-2.4, REQ-2.7)", () => {
  const blameEn = /\b(wrong|bad|no|not|fail\w*|mistake|oops|error)\b/i;
  // Japanese for: chigau, chigai, dame, zannen, machigai, shippai (escaped: the repo is English-only).
  const blameJa =
    /\u3061\u304c\u3046|\u3061\u304c\u3044|\u3060\u3081|\u3056\u3093\u306d\u3093|\u307e\u3061\u304c\u3044|\u3057\u3063\u3071\u3044|\u30c0\u30e1/;

  it("keeps blame words out of every lane message and the retry button", () => {
    for (const text of [...Object.values(en.lane), en.retry]) expect(text).not.toMatch(blameEn);
    for (const text of [...Object.values(ja.lane), ja.retry]) expect(text).not.toMatch(blameJa);
  });

  it("says the wisp did what was asked", () => {
    expect(en.lane.wrong).toContain("just as you asked");
  });
});
