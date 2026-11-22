import { describe, expect, it } from "vite-plus/test";
import { looksOf, parts, type LookId, type PartId } from "../../domain/lantern";
import en from "../strings.en.json";
import ja from "../strings.ja.json";

// Trial 5 strings (spec 08-trial-tell-whats-wrong, REQ-8.7, REQ-8.13). Japanese words are written as \u escapes
// because this repository is English-only outside the allowlist.

const keys = [
  "enter",
  "timeAttack",
  "guide",
  "wish",
  "brought",
  "look",
  "point",
  "fine",
  "said",
  "lit",
  "next",
  "parts",
  "looks",
];
type Lang = "ja" | "en";
const lantern = { ja: ja.lantern, en: en.lantern };
const allLooks: LookId[] = parts.flatMap((p) => looksOf[p]);
const partWord = (lang: Lang, part: PartId) => lantern[lang].parts[part];
const lookWord = (lang: Lang, look: LookId) => lantern[lang].looks[look];

/** The messages that take a part's word, and those that take a look's word. */
const partKeys = ["point", "fine"] as const;
const lookKeys = ["said", "lit"] as const;
const plainKeys = ["enter", "timeAttack", "guide", "wish", "brought", "look", "next"] as const;

/** Mirrors `scripts/check-kid-strings.mjs` (REQ-8.13.2): no kanji, no Latin letters, 12 x 2. */
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

const render = (text: string, word: string) => text.replace("{0}", word);
const lines = (text: string) => text.split("\n");
const longest = (text: string) => Math.max(...lines(text).map((l) => l.length));

/** Every string of the group, with each word inserted where it takes one. */
function allRendered(lang: Lang): string[] {
  const out: string[] = plainKeys.map((k) => lantern[lang][k]);
  for (const key of partKeys) {
    for (const part of parts) out.push(render(lantern[lang][key], partWord(lang, part)));
  }
  for (const key of lookKeys) {
    for (const look of allLooks) out.push(render(lantern[lang][key], lookWord(lang, look)));
  }
  for (const part of parts) out.push(partWord(lang, part));
  for (const look of allLooks) out.push(lookWord(lang, look));
  return out;
}

describe("lantern strings: keys and placeholders (REQ-8.13.1, REQ-8.13.3)", () => {
  it("exist in both languages under the same keys, in the same order", () => {
    expect(Object.keys(ja.lantern)).toEqual(keys);
    expect(Object.keys(en.lantern)).toEqual(keys);
  });

  it("name the three domain parts and the nine domain looks, each with its own word, in both languages", () => {
    for (const lang of ["ja", "en"] as const) {
      expect(Object.keys(lantern[lang].parts)).toEqual([...parts]);
      expect(Object.keys(lantern[lang].looks)).toEqual(allLooks);
      expect(new Set(parts.map((p) => partWord(lang, p))).size).toBe(3);
      expect(new Set(allLooks.map((l) => lookWord(lang, l))).size).toBe(9);
    }
    expect(en.lantern.parts).toEqual({ handle: "handle", roof: "roof", light: "light" });
    expect(Object.values(en.lantern.looks)).toEqual([
      "ring",
      "bow",
      "bell",
      "pointy",
      "round",
      "flat",
      "candle",
      "star",
      "moon",
    ]);
  });

  it("take exactly one word in the four messages that name one, and nowhere else", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const key of [...partKeys, ...lookKeys]) {
        expect(lantern[lang][key].split("{0}"), `${lang} ${key}`).toHaveLength(2);
      }
      for (const key of plainKeys) expect(lantern[lang][key], `${lang} ${key}`).not.toContain("{");
      for (const part of parts) expect(partWord(lang, part)).not.toContain("{");
      for (const look of allLooks) expect(lookWord(lang, look)).not.toContain("{");
    }
  });

  it("leave no placeholder behind once a word is inserted", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const text of allRendered(lang)) expect(text, text).not.toMatch(/\{\d\}/);
    }
  });
});

describe("lantern strings: Japanese rules (REQ-8.13.2)", () => {
  it("obey hard rule 2 in every string, with every part's and every look's word inserted", () => {
    for (const text of allRendered("ja")) expect(kidProblems(text), text).toEqual([]);
  });

  it("put the look the child said in corner brackets, so a short word reads as the word that was said", () => {
    for (const key of lookKeys) expect(ja.lantern[key], key).toContain("\u300c{0}\u300d");
  });
});

describe("lantern strings: English length (REQ-8.13.2)", () => {
  // 22 px text in a 340 px column fits about 27 characters.
  const most = 26;

  it("keeps every message to two short lines with every word inserted", () => {
    for (const text of allRendered("en")) {
      expect(lines(text).length, text).toBeLessThanOrEqual(2);
      expect(longest(text), text).toBeLessThanOrEqual(most);
    }
  });

  it("keeps the panel labels short enough for the 170 px panels", () => {
    for (const text of [en.lantern.wish, en.lantern.brought]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.length).toBeLessThanOrEqual(18);
    }
    for (const text of [ja.lantern.wish, ja.lantern.brought]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.replace(/\s/gu, "").length).toBeLessThanOrEqual(9);
    }
  });

  it("keeps the card words short enough for the 146 px cards, and the title's label and caption on one line", () => {
    for (const look of allLooks) {
      expect(lookWord("en", look).length, look).toBeLessThanOrEqual(8);
      expect(lookWord("ja", look).length, look).toBeLessThanOrEqual(5);
    }
    expect(en.lantern.next.length).toBeLessThanOrEqual(8);
    expect(ja.lantern.next.length).toBeLessThanOrEqual(5);
    for (const text of [ja.lantern.enter, ja.lantern.timeAttack]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.replace(/\s/gu, "").length).toBeLessThanOrEqual(12);
    }
    for (const text of [en.lantern.enter, en.lantern.timeAttack]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.length).toBeLessThanOrEqual(24);
    }
  });
});

describe("lantern strings: the words say what the rules do (REQ-8.4 to REQ-8.7)", () => {
  // Japanese for: tap (tappu), which (dono), you said (itta), still (mada), flickering (chikachika), only there
  // (soko dake), fixed (naotta), fine (daijoubu), different (chigau), escaped.
  const tapJa = /\u30bf\u30c3\u30d7/;
  const whichJa = /\u3069\u306e/;
  const saidJa = /\u3044\u3063\u305f/;
  const stillJa = /\u307e\u3060/;
  const flickerJa = /\u30c1\u30ab\u30c1\u30ab/;
  const onlyThereJa = /\u305d\u3053\u3060\u3051/;
  const fixedJa = /\u306a\u304a\u3063\u305f/;
  const fineJa = /\u3060\u3044\u3058\u3087\u3046\u3076/;
  const differentJa = /\u3061\u304c\u3046/;

  it("ask in the guide to tap the part that flickers and to tell the fix", () => {
    expect(en.lantern.guide).toMatch(/flickers/);
    expect(en.lantern.guide).toMatch(/Tap it/);
    expect(ja.lantern.guide).toMatch(flickerJa);
    expect(ja.lantern.guide).toMatch(tapJa);
  });

  it("ask which look the part should be while it is pointed at, and point to the wish", () => {
    expect(en.lantern.point).toMatch(/^Which \{0\}/);
    expect(en.lantern.point).toMatch(/your wish/);
    expect(ja.lantern.point).toMatch(whichJa);
  });

  it("say that a steady part is fine, and to tap the one that flickers", () => {
    expect(en.lantern.fine).toMatch(/is fine\nTap the part that flickers$/);
    expect(ja.lantern.fine).toMatch(fineJa);
    expect(ja.lantern.fine).toMatch(tapJa);
  });

  it("say after a wrong card what the child said and that the part still flickers: the fact is not hidden", () => {
    expect(en.lantern.said).toMatch(/^You said: \{0\}\nIt still flickers$/);
    expect(ja.lantern.said).toMatch(saidJa);
    expect(ja.lantern.said).toMatch(stillJa);
    expect(ja.lantern.said).toMatch(flickerJa);
  });

  it("say when the lantern is lit that only that part was fixed: nothing started over", () => {
    expect(en.lantern.lit).toMatch(/Only that part was fixed$/);
    expect(ja.lantern.lit).toMatch(onlyThereJa);
    expect(ja.lantern.lit).toMatch(fixedJa);
  });

  it("use the lesson word for different only in the question to compare with the wish", () => {
    expect(en.lantern.look).toMatch(/What is different\?$/);
    expect(ja.lantern.look).toMatch(differentJa);
    const others = allRendered("ja").filter((t) => t !== ja.lantern.look);
    for (const text of others) expect(text, text).not.toMatch(differentJa);
  });

  it("say on the title button that trial 5 has a 60-second clock", () => {
    expect(en.lantern.timeAttack).toMatch(/60 seconds/);
    expect(ja.lantern.timeAttack).toMatch(/^60/);
  });
});

describe("lantern strings: no blame, no fear, no starting over, no claims (REQ-8.7)", () => {
  const blameEn =
    /\b(wrong|bad|no|not|fail\w*|mistake\w*|oops|error|sorry|naughty|should|must|broken|silly|liar|lie\w*|fool\w*|dumb)\b/i;
  const fearEn =
    /\b(enemy|scary|scared|afraid|fear\w*|danger\w*|monster|hurt|harm|angry|trick\w*)\b/i;
  const overEn = /\b(again|start over|new one|from the start|redo)\b/i;
  // always, every, all, know, friend, family, robot, real, AI, anyone, anything.
  const claimEn =
    /\b(always|every\w*|all|know\w*|friends?|family|robot|real|ai|anyone|anything|forever)\b/i;
  // machigai, dame, zannen, shippai, ikenai, warui, kowareta (blame); kowai, abunai, bakemono, okoru (fear);
  // mou ichido, yarinaoshi, saisho (again, redo, from the start), escaped. chigau is the lesson word (above).
  const blameJa =
    /\u307e\u3061\u304c\u3044|\u3060\u3081|\u30c0\u30e1|\u3056\u3093\u306d\u3093|\u3057\u3063\u3071\u3044|\u3044\u3051\u306a\u3044|\u308f\u308b\u3044|\u3053\u308f\u308c/;
  const fearJa =
    /\u3053\u308f\u3044|\u3042\u3076\u306a\u3044|\u3070\u3051\u3082\u306e|\u304a\u3053/;
  const overJa = /\u3082\u3046\u3044\u3061\u3069|\u3084\u308a\u306a\u304a|\u3055\u3044\u3057\u3087/;
  // kanarazu, zettai, tomodachi, kazoku, nandemo, zenbu, robotto, shitteru, escaped.
  const claimJa =
    /\u304b\u306a\u3089\u305a|\u305c\u3063\u305f\u3044|\u3068\u3082\u3060\u3061|\u304b\u305e\u304f|\u306a\u3093\u3067\u3082|\u305c\u3093\u3076|\u30ed\u30dc\u30c3\u30c8|\u3057\u3063\u3066\u308b/;

  it("keep blame words out of every lantern string, with every word inserted", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(blameEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(blameJa);
  });

  it("keep fear words out of every lantern string", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(fearEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(fearJa);
  });

  it("never tell the child to ask again from the start", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(overEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(overJa);
  });

  it("make no claim about real AI, a helper that always or never does something, a friend or a family", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(claimEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(claimJa);
  });

  it("never say the wisp or the child did something on purpose", () => {
    for (const text of allRendered("en"))
      expect(text, text).not.toMatch(/\b(on purpose|you did)\b/i);
  });
});
