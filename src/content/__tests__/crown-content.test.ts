import { describe, expect, it } from "vite-plus/test";
import { lampParts } from "../../domain/crown";
import { looksOf, type LookId } from "../../domain/lantern";
import en from "../strings.en.json";
import ja from "../strings.ja.json";

// Trial 6 strings (spec 09-trial-hollow-crown, REQ-9.8, REQ-9.14). Japanese words are written as \u escapes because
// this repository is English-only outside the allowlist.

const keys = [
  "enter",
  "caption",
  "steps",
  "wish",
  "panel",
  "guide",
  "tell",
  "missing",
  "give",
  "secret",
  "going",
  "made",
  "again",
  "said",
  "fix",
  "point",
  "fine",
  "lit",
  "clear",
  "tellButton",
  "go",
  "same",
  "different",
];
type Lang = "ja" | "en";
const crown = { ja: ja.crown, en: en.crown };
const strings = { ja, en };
const looks: LookId[] = lampParts.flatMap((p) => looksOf[p]);
const secrets = ["houseKey", "address", "password"] as const;
const tools = ["broom", "hammer", "scissors"] as const;

/** The messages that take a word, and the words they take (from the groups of trials 2, 4 and 5). */
const wordKeys = ["missing", "point", "fine", "secret", "going", "said"] as const;
const words: Record<(typeof wordKeys)[number], (lang: Lang) => string[]> = {
  missing: (lang) => lampParts.map((p) => strings[lang].lantern.parts[p]),
  point: (lang) => lampParts.map((p) => strings[lang].lantern.parts[p]),
  fine: (lang) => lampParts.map((p) => strings[lang].lantern.parts[p]),
  secret: (lang) => secrets.map((s) => strings[lang].shadows.items[s]),
  going: (lang) => tools.map((t) => strings[lang].shed.tools[t]),
  said: (lang) => looks.map((l) => strings[lang].lantern.looks[l]),
};
const plainKeys = [
  "enter",
  "caption",
  "wish",
  "tell",
  "give",
  "made",
  "again",
  "fix",
  "lit",
  "clear",
  "tellButton",
  "go",
  "same",
  "different",
] as const;
const nested = ["steps", "panel", "guide"] as const;

/** Every string of the group, with each word inserted where it takes one. */
function allRendered(lang: Lang): string[] {
  const group = crown[lang];
  const out: string[] = plainKeys.map((k) => group[k]);
  for (const key of nested) out.push(...Object.values(group[key]));
  for (const key of wordKeys) {
    for (const word of words[key](lang)) out.push(group[key].replace("{0}", word));
  }
  return out;
}

/** Mirrors `scripts/check-kid-strings.mjs` (REQ-9.14.2): no kanji, no Latin letters, 12 x 2. */
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

const lines = (text: string) => text.split("\n");
const longest = (text: string) => Math.max(...lines(text).map((l) => l.length));
const jaLength = (text: string) => text.replace(/\s/gu, "").length;

describe("crown strings: keys and placeholders (REQ-9.14.1, REQ-9.14.3)", () => {
  it("exist in both languages under the same keys, in the same order", () => {
    expect(Object.keys(ja.crown)).toEqual(keys);
    expect(Object.keys(en.crown)).toEqual(keys);
    for (const key of nested)
      expect(Object.keys(ja.crown[key])).toEqual(Object.keys(en.crown[key]));
    expect(Object.keys(en.crown.steps)).toEqual(["tell", "give", "go", "check", "fix"]);
    expect(Object.keys(en.crown.panel)).toEqual(["told", "shed", "lamp"]);
    expect(Object.keys(en.crown.guide)).toEqual(["tell", "go", "check", "fix", "lit", "clear"]);
  });

  it("take exactly one word in the messages that name one, and nowhere else", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const key of wordKeys) {
        expect(crown[lang][key].split("{0}"), `${lang} ${key}`).toHaveLength(2);
      }
      for (const key of plainKeys) expect(crown[lang][key], `${lang} ${key}`).not.toContain("{");
      for (const key of nested) {
        for (const text of Object.values(crown[lang][key])) expect(text).not.toContain("{");
      }
    }
  });

  it("leave no placeholder behind once a word is inserted", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const text of allRendered(lang)) expect(text, text).not.toMatch(/\{\d\}/);
    }
  });
});

describe("crown strings: Japanese rules (REQ-9.14.2)", () => {
  it("obey hard rule 2 in every string, with every word inserted", () => {
    for (const text of allRendered("ja")) expect(kidProblems(text), text).toEqual([]);
  });

  it("put the look the child said in corner brackets, so a short word reads as the word that was said", () => {
    expect(ja.crown.said).toContain("\u300c{0}\u300d");
  });

  it("name the button the guide asks for with the button's own word", () => {
    expect(ja.crown.guide.tell).toContain(`\u300c${ja.crown.tellButton}\u300d`);
    expect(ja.crown.guide.go).toContain(`\u300c${ja.crown.go}\u300d`);
    expect(ja.crown.guide.lit).toContain(`\u300c${ja.lantern.next}\u300d`);
    expect(en.crown.guide.tell).toContain(en.crown.tellButton);
    expect(en.crown.guide.go).toContain(en.crown.go);
    expect(en.crown.guide.lit).toContain(en.lantern.next);
  });
});

describe("crown strings: lengths (REQ-9.14.2, REQ-9.12.4)", () => {
  // 22 px text in a 340 px column fits about 27 characters.
  it("keeps every English message to two lines of at most 26 characters with every word inserted", () => {
    for (const text of allRendered("en")) {
      expect(lines(text).length, text).toBeLessThanOrEqual(2);
      expect(longest(text), text).toBeLessThanOrEqual(26);
    }
  });

  it("keeps the panel labels on one line short enough for the 170 px panels", () => {
    for (const text of [en.crown.wish, ...Object.values(en.crown.panel)]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.length, text).toBeLessThanOrEqual(18);
    }
    for (const text of [ja.crown.wish, ...Object.values(ja.crown.panel)]) {
      expect(lines(text)).toHaveLength(1);
      expect(jaLength(text), text).toBeLessThanOrEqual(9);
    }
  });

  it("keeps the step words short enough for the 72 px cells of the row of steps", () => {
    for (const text of Object.values(en.crown.steps))
      expect(text.length, text).toBeLessThanOrEqual(5);
    for (const text of Object.values(ja.crown.steps))
      expect(jaLength(text), text).toBeLessThanOrEqual(4);
  });

  it("keeps the button words short: Tell fits 88 px, the two check buttons 170 px", () => {
    expect(en.crown.tellButton.length).toBeLessThanOrEqual(5);
    expect(jaLength(ja.crown.tellButton)).toBeLessThanOrEqual(3);
    for (const text of [en.crown.same, en.crown.different, en.crown.go])
      expect(text.length, text).toBeLessThanOrEqual(10);
    for (const text of [ja.crown.same, ja.crown.different, ja.crown.go])
      expect(jaLength(text), text).toBeLessThanOrEqual(7);
  });

  it("keeps the title's label and caption on one line", () => {
    for (const text of [ja.crown.enter, ja.crown.caption]) {
      expect(lines(text)).toHaveLength(1);
      expect(jaLength(text)).toBeLessThanOrEqual(12);
    }
    for (const text of [en.crown.enter, en.crown.caption]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.length).toBeLessThanOrEqual(24);
    }
  });
});

describe("crown strings: the words say what the rules do (REQ-9.1.6, REQ-9.3 to REQ-9.7)", () => {
  // Japanese for: secret (himitsu), tool (dougu), same (onaji), which (dono), you said (itta), compare (kurabe),
  // tap (tappu), escaped.
  const secretJa = /\u3072\u307f\u3064/;
  const toolJa = /\u3069\u3046\u3050/;
  const sameJa = /\u304a\u306a\u3058/;
  const whichJa = /\u3069\u306e/;
  const saidJa = /\u3044\u3063\u305f/;
  const compareJa = /\u304f\u3089\u3079/;

  it("says on the title button that it is three lamps, with no number of seconds", () => {
    expect(en.crown.caption).toMatch(/Three lamps/);
    expect(en.crown.caption).not.toMatch(/\d|second/);
    expect(ja.crown.caption).toMatch(/3/);
    expect(ja.crown.caption).not.toMatch(/60/);
    expect(en.crown.enter).not.toMatch(/\d/);
    expect(ja.crown.enter).not.toMatch(/\d/);
  });

  it("asks for the missing part when the tell is not complete: the wisp asks and waits", () => {
    expect(en.crown.missing).toMatch(/^Which \{0\}\?\nThe wisp is asking$/);
    expect(ja.crown.missing).toMatch(whichJa);
  });

  it("says that a secret is a secret and to give a tool, and asks to keep secrets in the give step", () => {
    expect(en.crown.secret).toMatch(/is a secret\nGive a tool instead$/);
    expect(en.crown.give).toMatch(/Keep secrets/);
    expect(ja.crown.secret).toMatch(secretJa);
    expect(ja.crown.secret).toMatch(toolJa);
    expect(ja.crown.give).toMatch(secretJa);
  });

  it("asks whether the lamp is the same, and to compare when the answer was not right", () => {
    expect(en.crown.made).toMatch(/Is it the same\?$/);
    expect(en.crown.guide.check).toMatch(/Is it the lamp you want\?/);
    expect(en.crown.again).toMatch(/Compare row by row$/);
    expect(ja.crown.made).toMatch(sameJa);
    expect(ja.crown.again).toMatch(compareJa);
  });

  it("says after a fix card what the child said and asks to check again", () => {
    expect(en.crown.said).toMatch(/^You said: \{0\}\nIs it the same now\?$/);
    expect(ja.crown.said).toMatch(saidJa);
    expect(ja.crown.said).toMatch(sameJa);
  });

  it("names the two check buttons same and not the same", () => {
    expect(en.crown.same).toBe("Same");
    expect(en.crown.different).toBe("Different");
    expect(ja.crown.same).toMatch(sameJa);
    expect(ja.crown.different).toMatch(sameJa);
    expect(ja.crown.different).not.toBe(ja.crown.same);
  });
});

describe("crown strings: no blame, no fear, no starting over, no claims (REQ-9.8)", () => {
  // Trial 5's lists (`lantern-content.test.ts`), with chigau (different) not allowed in any string of trial 6.
  const blameEn =
    /\b(wrong|bad|no|not|fail\w*|mistake\w*|oops|error|sorry|naughty|should|must|broken|silly|liar|lie\w*|fool\w*|dumb)\b/i;
  const fearEn =
    /\b(enemy|scary|scared|afraid|fear\w*|danger\w*|monster|hurt|harm|angry|trick\w*|dark\w*)\b/i;
  const overEn = /\b(again|start over|new one|from the start|redo)\b/i;
  const claimEn =
    /\b(always|every\w*|all|know\w*|friends?|family|robot|real|ai|anyone|anything|forever|protect\w*|safe\w*)\b/i;
  const blameJa =
    /\u307e\u3061\u304c\u3044|\u3060\u3081|\u30c0\u30e1|\u3056\u3093\u306d\u3093|\u3057\u3063\u3071\u3044|\u3044\u3051\u306a\u3044|\u308f\u308b\u3044|\u3053\u308f\u308c|\u3061\u304c\u3046/;
  const fearJa =
    /\u3053\u308f\u3044|\u3042\u3076\u306a\u3044|\u3070\u3051\u3082\u306e|\u304a\u3053|\u304f\u3089\u3044|\u3066\u304d/;
  const overJa = /\u3082\u3046\u3044\u3061\u3069|\u3084\u308a\u306a\u304a|\u3055\u3044\u3057\u3087/;
  const claimJa =
    /\u304b\u306a\u3089\u305a|\u305c\u3063\u305f\u3044|\u3068\u3082\u3060\u3061|\u304b\u305e\u304f|\u306a\u3093\u3067\u3082|\u305c\u3093\u3076|\u30ed\u30dc\u30c3\u30c8|\u3057\u3063\u3066\u308b|\u307e\u3082\u3063\u3066\u304f\u308c/;

  it("keeps blame words out of every crown string, chigau included", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(blameEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(blameJa);
  });

  it("keeps fear words out of every crown string: the town is waiting to be lit, not dark and scary", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(fearEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(fearJa);
  });

  it("never tells the child to ask again from the start", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(overEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(overJa);
  });

  it("makes no claim about real AI, a helper that always does something, keeps secrets safe, or is a friend", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(claimEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(claimJa);
  });

  it("never says the wisp or the child did something on purpose", () => {
    for (const text of allRendered("en"))
      expect(text, text).not.toMatch(/\b(on purpose|you did|slipped)\b/i);
  });
});
