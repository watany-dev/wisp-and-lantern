import { describe, expect, it } from "vite-plus/test";
import { colors, things } from "../../domain/lane";
import cards from "../cards.json";
import en from "../strings.en.json";
import ja from "../strings.ja.json";

const patterns = ["stripes-v", "dots", "plain"];
const colorCards = cards.filter((c) => c.kind === "color");
const thingCards = cards.filter((c) => c.kind === "thing");
const laneKeys = [
  "wish",
  "pickBoth",
  "pickColor",
  "pickThing",
  "pickAny",
  "ready",
  "right",
  "wrong",
  "vague",
  "lesson",
  "again",
];
// The messages that name the item the wisp brought (REQ-3.4.1, REQ-3.6.4).
const itemKeys = ["right", "wrong", "vague"] as const;

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

  it("insert the item name in every result message exactly once, and nowhere else (REQ-3.6.4)", () => {
    for (const lane of [ja.lane, en.lane]) {
      for (const [key, text] of Object.entries(lane)) {
        const expected = (itemKeys as readonly string[]).includes(key) ? 2 : 1;
        expect(text.split("{0}"), key).toHaveLength(expected);
      }
    }
    for (const text of [ja.retry, en.retry, ja.start, en.start]) expect(text).not.toContain("{");
  });

  it("obey the Japanese rules for every item name the result messages can show", () => {
    for (const name of itemNames("ja")) {
      for (const key of itemKeys) {
        const message = ja.lane[key].replace("{0}", name);
        expect(kidProblems(message), `${key} / ${name}`).toEqual([]);
        expect(message).not.toContain("{0}");
      }
    }
  });

  it("obey the Japanese rules in every other message and the retry button", () => {
    const { right: _r, wrong: _w, vague: _v, ...rest } = ja.lane;
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

describe("closing line (REQ-3.5, REQ-3.6)", () => {
  it("is two short lines in both languages", () => {
    for (const text of [ja.lane.lesson, en.lane.lesson]) {
      const lines = text.split("\n");
      expect(lines).toHaveLength(2);
      for (const line of lines) expect(line.replace(/\s/gu, "").length).toBeLessThanOrEqual(12);
    }
    // The English lines count their spaces too: they must fit the same 12.
    for (const line of en.lane.lesson.split("\n")) expect(line.length).toBeLessThanOrEqual(12);
  });

  it("names the colour and the object the child told, and takes no item name", () => {
    expect(en.lane.lesson).toMatch(/told/);
    expect(en.lane.lesson).toMatch(/color/);
    expect(en.lane.lesson).toMatch(/item/);
    expect(ja.lane.lesson).not.toContain("{0}");
  });

  it("does not repeat the found message's words, which share the screen with it", () => {
    expect(en.lane.lesson).not.toMatch(/just right/i);
    expect(en.lane.right).toMatch(/just right/i);
  });

  it("makes no claim about real AI (docs/learning-design.md, what we do not teach)", () => {
    const claims = /\b(always|never|every|all|know|knows|friend|family|real|robot)\b/i;
    for (const text of [en.lane.lesson, en.lane.vague, en.lane.right, en.lane.wrong]) {
      expect(text).not.toMatch(claims);
    }
  });
});

describe("choosing messages (REQ-3.1.7, REQ-3.2.2)", () => {
  // Japanese for: both, two (cards), one more; escaped because the repository is English-only.
  const needsSecondJa =
    /\u308a\u3087\u3046\u307b\u3046|\u3075\u305f\u3064|\u306b\u307e\u3044|\u3082\u3046\u3072\u3068\u3064/;
  const needsSecondEn = /\b(both|two|second|another|more|and)\b/i;

  it("never say or suggest that a second card is needed to send the wisp", () => {
    expect(ja.lane.ready).not.toMatch(needsSecondJa);
    expect(en.lane.ready).not.toMatch(needsSecondEn);
    expect(ja.lane.pickAny).not.toMatch(needsSecondJa);
    expect(en.lane.pickAny).not.toMatch(needsSecondEn);
  });

  it("invite the child to pick a card, and to tap the wisp once one is picked", () => {
    expect(en.lane.pickAny).toBe("Pick a card");
    expect(en.lane.ready).toMatch(/tap the wisp/i);
  });
});

describe("no blame (REQ-2.4, REQ-2.7, REQ-3.4.2)", () => {
  const blameEn = /\b(wrong|bad|no|not|fail\w*|mistake|oops|error)\b/i;
  // Japanese for: chigau, chigai, dame, zannen, machigai, shippai (escaped: the repo is English-only).
  const blameJa =
    /\u3061\u304c\u3046|\u3061\u304c\u3044|\u3060\u3081|\u3056\u3093\u306d\u3093|\u307e\u3061\u304c\u3044|\u3057\u3063\u3071\u3044|\u30c0\u30e1/;

  it("keeps blame words out of every lane message and the retry button", () => {
    for (const text of [...Object.values(en.lane), en.retry]) expect(text).not.toMatch(blameEn);
    for (const text of [...Object.values(ja.lane), ja.retry]) expect(text).not.toMatch(blameJa);
  });

  it("says the wisp did what was asked only when the request was complete", () => {
    expect(en.lane.wrong).toContain("just as you asked");
    // With one card the wisp chose the rest itself, so "as you asked" would not be true.
    expect(en.lane.vague).not.toMatch(/as you asked/i);
  });
});
