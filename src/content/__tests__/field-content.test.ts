import { describe, expect, it } from "vite-plus/test";
import en from "../strings.en.json";
import ja from "../strings.ja.json";

// Trial 3 strings (spec 06-trial-verify-stars, REQ-6.11). Japanese words are written as \u escapes
// because this repository is English-only outside the allowlist.

const keys = [
  "enter",
  "guide",
  "start",
  "real",
  "fake",
  "kept",
  "lesson",
  "keep",
  "again",
  "marks",
];
const field = { ja: ja.field, en: en.field };
/** The kept message takes the number of real stars kept: 3 or 4 (the round table). */
const numbers = ["3", "4"];

/** Mirrors `scripts/check-kid-strings.mjs` (REQ-6.11.2): no kanji, no Latin letters, 12 x 2. */
function kidProblems(text: string): string[] {
  const problems: string[] = [];
  if (/\p{Script=Han}/u.test(text)) problems.push("kanji");
  if (/[A-Za-z]/.test(text)) problems.push("latin letters");
  const lines = text.split("\n");
  if (lines.length > 2) problems.push(`${lines.length} lines`);
  for (const line of lines) {
    const length = line.replace(/\s/gu, "").length;
    if (length > 12) problems.push(`${length} characters in "${line}"`);
  }
  return problems;
}

const render = (text: string, n: string) => text.replace("{0}", n);
const lines = (text: string) => text.split("\n");
const longest = (text: string) => Math.max(...lines(text).map((l) => l.length));

/** Every string of the group, with the number inserted where it takes one. */
function allRendered(lang: "ja" | "en"): string[] {
  const { marks, kept, ...texts } = field[lang];
  return [...Object.values(texts), ...Object.values(marks), ...numbers.map((n) => render(kept, n))];
}

describe("field strings: keys and placeholders (REQ-6.11.1, REQ-6.11.3)", () => {
  it("exist in both languages under the same keys, in the same order", () => {
    expect(Object.keys(ja.field)).toEqual(keys);
    expect(Object.keys(en.field)).toEqual(keys);
    expect(Object.keys(ja.field.marks)).toEqual(["real", "fake"]);
    expect(Object.keys(en.field.marks)).toEqual(["real", "fake"]);
  });

  it("take exactly one number in the kept message, and nowhere else", () => {
    for (const group of [ja.field, en.field]) {
      const { marks, ...texts } = group;
      for (const [key, text] of Object.entries(texts)) {
        expect(text.split("{0}"), key).toHaveLength(key === "kept" ? 2 : 1);
      }
      for (const label of Object.values(marks)) expect(label).not.toContain("{");
    }
  });

  it("leave no placeholder behind once the number is inserted", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const text of allRendered(lang)) expect(text, text).not.toMatch(/\{\d\}/);
    }
  });

  it("insert the number in front of the counter in Japanese and into the sentence in English", () => {
    expect(render(en.field.kept, "3")).toBe("You kept 3 real stars");
    expect(render(en.field.kept, "4")).toBe("You kept 4 real stars");
    expect(render(ja.field.kept, "3")).toContain("3\u3053");
  });
});

describe("field strings: Japanese rules (REQ-6.11.2)", () => {
  it("obey hard rule 2 for every string, with the number inserted in the kept message", () => {
    for (const text of allRendered("ja")) expect(kidProblems(text), text).toEqual([]);
  });

  it("obey hard rule 2 in the kept message template, where the gate counts {0} as three letters", () => {
    expect(kidProblems(ja.field.kept)).toEqual([]);
  });
});

describe("field strings: English length (REQ-6.11.2)", () => {
  it("keeps every message to two short lines with the number inserted", () => {
    for (const text of allRendered("en")) {
      expect(lines(text).length, text).toBeLessThanOrEqual(2);
      expect(longest(text), text).toBeLessThanOrEqual(24);
    }
  });

  it("keeps the closing line to two lines", () => {
    expect(lines(en.field.lesson)).toHaveLength(2);
    expect(lines(ja.field.lesson)).toHaveLength(2);
  });

  it("keeps the button labels on one line and short enough for the 300 px button", () => {
    for (const key of ["enter", "keep", "again"] as const) {
      expect(lines(ja.field[key]), key).toHaveLength(1);
      expect(ja.field[key].replace(/\s/gu, "").length, key).toBeLessThanOrEqual(12);
      expect(lines(en.field[key]), key).toHaveLength(1);
      expect(en.field[key].length, key).toBeLessThanOrEqual(20);
    }
  });

  it("keeps the star labels short enough for an 88 px slot", () => {
    for (const label of [...Object.values(ja.field.marks), ...Object.values(en.field.marks)]) {
      expect(label.length).toBeLessThanOrEqual(4);
    }
  });
});

describe("field strings: the words say what the rules do (REQ-6.2 to REQ-6.6)", () => {
  // Japanese for: mistake/mix up (machigaeru), check (tashikame), receive (uketoro, uketoru,
  // uketotta), fake (nisemono), real (honmono), the wisp, each (hitotsuzutsu), escaped.
  const mixUpJa = /\u307e\u3061\u304c\u3048\u308b/;
  const checkJa = /\u305f\u3057\u304b\u3081/;
  const keepJa = /\u3046\u3051\u3068/;
  const fakeJa = /\u306b\u305b\u3082\u306e/;
  const realJa = /\u307b\u3093\u3082\u306e/;
  const wispJa = /\u30a6\u30a3\u30b9\u30d7/;
  const eachJa = /\u3072\u3068\u3064\u305a\u3064/;
  // tappu (tap), escaped.
  const tapJa = /\u30bf\u30c3\u30d7/;

  it("make the guide name both steps, check and then keep, in the order the child does them", () => {
    expect(en.field.guide.toLowerCase()).toMatch(/check.*first.*keep.*real/s);
    expect(ja.field.guide).toMatch(checkJa);
    expect(ja.field.guide).toMatch(keepJa);
    expect(ja.field.guide.search(checkJa)).toBeLessThan(ja.field.guide.search(keepJa));
    expect(ja.field.guide).toMatch(eachJa);
    expect(en.field.guide).toMatch(/\beach star\b/);
  });

  it("say that the wisp brought five stars, and to tap one to check it, before any is checked", () => {
    expect(en.field.start).toMatch(/\bwisp\b.*\b5 stars\b/s);
    expect(en.field.start).toMatch(/\btap\b.*\bcheck\b/is);
    expect(ja.field.start).toMatch(wispJa);
    expect(ja.field.start).toMatch(/5/);
    expect(ja.field.start).toMatch(tapJa);
    expect(ja.field.start).toMatch(checkJa);
  });

  it("say in plain words that the star is real, or that it is a fake and the wisp mixed it up", () => {
    expect(en.field.real).toMatch(/\breal\b/);
    expect(ja.field.real).toMatch(realJa);
    expect(en.field.fake).toMatch(/\bfake\b/);
    expect(en.field.fake).toMatch(/\bmixed it up\b/);
    expect(ja.field.fake).toMatch(fakeJa);
    expect(ja.field.fake).toMatch(mixUpJa);
    expect(ja.field.fake).toMatch(wispJa);
  });

  it("name the number kept, and the real stars", () => {
    expect(en.field.kept).toMatch(/\bkept\b.*\{0\}.*\breal\b/);
    expect(ja.field.kept).toMatch(realJa);
    expect(ja.field.kept).toMatch(keepJa);
  });

  it("use the same words for a star on the picture as in the messages", () => {
    expect(en.field.marks).toEqual({ real: "real", fake: "fake" });
    expect(ja.field.marks).toEqual({
      real: expect.stringMatching(realJa),
      fake: expect.stringMatching(fakeJa),
    });
    expect(en.field.real).toContain(en.field.marks.real);
    expect(en.field.fake).toContain(en.field.marks.fake);
    expect(ja.field.real).toContain(ja.field.marks.real);
    expect(ja.field.fake).toContain(ja.field.marks.fake);
  });

  it("make the buttons name the act: keep the real stars, then the next stars", () => {
    expect(en.field.keep).toMatch(/^Keep\b.*\breal\b/);
    expect(ja.field.keep).toMatch(realJa);
    expect(ja.field.keep).toMatch(keepJa);
    expect(en.field.again).toMatch(/\bnext\b/i);
    expect(en.field.again).not.toMatch(/again/i);
  });

  it("keep the closing line its own text: it looks back at checking and keeping, and shares no line with the kept message", () => {
    expect(en.field.lesson).toBe("You checked each star\nand kept the real ones");
    expect(lines(en.field.lesson)[0]).toMatch(/^You checked\b/);
    expect(lines(en.field.lesson)[1]).toMatch(/^and kept\b/);
    expect(ja.field.lesson).toMatch(checkJa);
    expect(ja.field.lesson).toMatch(/\u3046\u3051\u3068\u3063\u305f/);
    for (const lang of ["ja", "en"] as const) {
      const f = field[lang];
      for (const n of numbers) {
        const message = render(f.kept, n);
        for (const line of lines(f.lesson)) expect(message).not.toContain(line);
        for (const line of lines(message)) expect(f.lesson).not.toContain(line);
      }
      for (const line of lines(f.lesson)) expect(f.guide).not.toContain(line);
    }
  });
});

describe("field strings: no blame, no claims (REQ-6.4, REQ-6.6.3)", () => {
  // Words that blame the child or the wisp, or make the wisp a liar, a trickster or an enemy:
  // lie, liar, trick, cheat, fool, bad, naughty, enemy, wrong, fail, oops, sorry, silly, stupid, fault,
  // on purpose.
  const blameEn =
    /\b(lie[sd]?|lying|liars?|trick\w*|cheat\w*|fool\w*|bad|naughty|enemy|enemies|wrong|fail\w*|oops|sorry|silly|stupid|dumb|fault|on purpose|deliberate\w*)\b/i;
  // Japanese for: uso, damasu, warui, itazura, zuru, shippai, dame, zannen, chigau, chigai, waza to,
  // baka, oshioki (escaped).
  const blameJa =
    /\u3046\u305d|\u3060\u307e|\u308f\u308b\u3044|\u3044\u305f\u305a\u3089|\u305a\u308b|\u3057\u3063\u3071\u3044|\u3060\u3081|\u30c0\u30e1|\u3056\u3093\u306d\u3093|\u3061\u304c\u3046|\u3061\u304c\u3044|\u308f\u3056\u3068|\u3070\u304b|\u304a\u3057\u304a\u304d/;
  // always, never, every, all, know, friend, family, AI, robot, computer, anything, smart, clever,
  // password, secret.
  const claimEn =
    /\b(always|never|every\w*|all|know\w*|friends?|family|ai|robots?|computers?|anything|smart|clever|passwords?|secrets?)\b/i;
  // itsumo, kanarazu, zettai, nandemo, tomodachi, kazoku, robotto, konpyuuta, pasuwaado, himitsu,
  // zenbu, sugoi, kashikoi (escaped).
  const claimJa =
    /\u3044\u3064\u3082|\u304b\u306a\u3089\u305a|\u305c\u3063\u305f\u3044|\u306a\u3093\u3067\u3082|\u3068\u3082\u3060\u3061|\u304b\u305e\u304f|\u30ed\u30dc\u30c3\u30c8|\u30b3\u30f3\u30d4\u30e5\u30fc\u30bf\u30fc|\u30d1\u30b9\u30ef\u30fc\u30c9|\u3072\u307f\u3064|\u305c\u3093\u3076|\u3059\u3054\u3044|\u304b\u3057\u3053\u3044/;

  it("keep blame words, and anything that makes the wisp a liar or an enemy, out of every field string", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(blameEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(blameJa);
  });

  it("make no claim that a helper is always right or always wrong, knows everything, or is a friend", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(claimEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(claimJa);
  });

  it("do not ask for anything private (this trial is about checking, not about secrets)", () => {
    // house, key, home, address, name (the secrets of trial 4).
    for (const text of allRendered("en"))
      expect(text, text).not.toMatch(/\b(house|key|home|address|name)\b/i);
  });
});
