import { describe, expect, it } from "vite-plus/test";
import { isSecret, items, type ItemId } from "../../domain/shadows";
import en from "../strings.en.json";
import ja from "../strings.ja.json";

// Trial 4 strings (spec 07-trial-keep-secrets, REQ-7.4, REQ-7.6, REQ-7.11). Japanese words are written as \u
// escapes because this repository is English-only outside the allowlist.

const keys = [
  "enter",
  "timeAttack",
  "guide",
  "ask",
  "givenSafe",
  "keptSecret",
  "givenSecret",
  "keptSafe",
  "give",
  "secret",
  "next",
  "items",
  "why",
];
type Lang = "ja" | "en";
const shadows = { ja: ja.shadows, en: en.shadows };
const secrets = items.filter(isSecret);
const rest = items.filter((i) => !isSecret(i));
const label = (lang: Lang, item: ItemId) => shadows[lang].items[item];

/**
 * The messages that name the item, and which items each can be about: the question is about any item, a given
 * thing that is fine to give and a kept thing that is fine to give are about the rest, a kept and a given secret
 * about the secrets.
 */
const namedKeys = ["ask", "givenSafe", "keptSecret", "givenSecret", "keptSafe"] as const;
const named: Record<(typeof namedKeys)[number], readonly ItemId[]> = {
  ask: items,
  givenSafe: rest,
  keptSecret: secrets,
  givenSecret: secrets,
  keptSafe: rest,
};
const plainKeys = ["enter", "timeAttack", "guide", "give", "secret", "next"] as const;

/** Mirrors `scripts/check-kid-strings.mjs` (REQ-7.11.2): no kanji, no Latin letters, 12 x 2. */
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

const render = (text: string, name: string) => text.replace("{0}", name);
const lines = (text: string) => text.split("\n");
const longest = (text: string) => Math.max(...lines(text).map((l) => l.length));

/** Every string of the group, with the item's name inserted where it takes one. */
function allRendered(lang: Lang): string[] {
  const out: string[] = plainKeys.map((k) => shadows[lang][k]);
  for (const key of namedKeys) {
    for (const item of named[key]) out.push(render(shadows[lang][key], label(lang, item)));
  }
  for (const item of items) out.push(shadows[lang].why[item]);
  return out;
}

describe("shadows strings: keys and placeholders (REQ-7.11.1, REQ-7.11.3)", () => {
  it("exist in both languages under the same keys, in the same order", () => {
    expect(Object.keys(ja.shadows)).toEqual(keys);
    expect(Object.keys(en.shadows)).toEqual(keys);
  });

  it("name the six domain items and give each its own closing line, in both languages", () => {
    for (const lang of ["ja", "en"] as const) {
      expect(Object.keys(shadows[lang].items)).toEqual([...items]);
      expect(Object.keys(shadows[lang].why)).toEqual([...items]);
      expect(new Set(items.map((i) => label(lang, i))).size).toBe(items.length);
      expect(new Set(items.map((i) => shadows[lang].why[i])).size).toBe(items.length);
    }
    expect(en.shadows.items).toEqual({
      houseKey: "house key",
      address: "address",
      password: "password",
      candy: "candy",
      ball: "ball",
      flower: "flower",
    });
  });

  it("take exactly one item name in the five messages that name it, and nowhere else", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const key of namedKeys) {
        expect(shadows[lang][key].split("{0}"), `${lang} ${key}`).toHaveLength(2);
      }
      for (const key of plainKeys) expect(shadows[lang][key], `${lang} ${key}`).not.toContain("{");
      for (const item of items) {
        expect(shadows[lang].why[item], `${lang} why ${item}`).not.toContain("{");
        expect(label(lang, item)).not.toContain("{");
      }
    }
  });

  it("leave no placeholder behind once an item's name is inserted", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const text of allRendered(lang)) expect(text, text).not.toMatch(/\{\d\}/);
    }
  });
});

describe("shadows strings: Japanese rules (REQ-7.11.2)", () => {
  it("obey hard rule 2 for every message with every applicable item's name inserted", () => {
    for (const key of namedKeys) {
      for (const item of named[key]) {
        const text = render(ja.shadows[key], label("ja", item));
        expect(kidProblems(text), `${key} / ${item}`).toEqual([]);
      }
    }
  });

  it("obey hard rule 2 in every other string, in the item names and in the closing lines", () => {
    for (const key of plainKeys) expect(kidProblems(ja.shadows[key]), key).toEqual([]);
    for (const item of items) {
      expect(kidProblems(label("ja", item)), item).toEqual([]);
      expect(kidProblems(ja.shadows.why[item]), `why ${item}`).toEqual([]);
    }
  });
});

describe("shadows strings: English length (REQ-7.11.2)", () => {
  // 22 px text in a 340 px column (a 320 px column for the closing line) fits about 27 characters.
  const most = 26;

  it("keeps every message to two short lines with every applicable item's name inserted", () => {
    for (const key of namedKeys) {
      for (const item of named[key]) {
        const text = render(en.shadows[key], label("en", item));
        expect(lines(text).length, text).toBeLessThanOrEqual(2);
        expect(longest(text), text).toBeLessThanOrEqual(most);
      }
    }
    for (const key of ["guide", "enter", "timeAttack", "give", "secret", "next"] as const) {
      expect(lines(en.shadows[key]).length, key).toBeLessThanOrEqual(2);
      expect(longest(en.shadows[key]), key).toBeLessThanOrEqual(most);
    }
  });

  it("keeps each closing line to two lines of at most 26 characters", () => {
    for (const item of items) {
      const text = en.shadows.why[item];
      expect(lines(text), text).toHaveLength(2);
      expect(longest(text), text).toBeLessThanOrEqual(most);
    }
  });

  it("keeps the button labels short enough for the 146 px decision buttons, the 300 px buttons and the title's button", () => {
    for (const text of [ja.shadows.give, ja.shadows.secret, ja.shadows.next]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.replace(/\s/gu, "").length).toBeLessThanOrEqual(5);
    }
    for (const text of [en.shadows.give, en.shadows.secret, en.shadows.next]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.length).toBeLessThanOrEqual(8);
    }
    for (const text of [ja.shadows.enter, ja.shadows.timeAttack]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.replace(/\s/gu, "").length).toBeLessThanOrEqual(12);
    }
    for (const text of [en.shadows.enter, en.shadows.timeAttack]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.length).toBeLessThanOrEqual(24);
    }
  });
});

describe("shadows strings: the words say what the rules do (REQ-7.3, REQ-7.4, REQ-7.6)", () => {
  // Japanese for: heard (kiita, kiichatta), nothing (nanimo), secret (himitsu), to anyone (dare ni mo), fine
  // (ii yo, daijoubu, yokatta) and kept (mamotta), escaped.
  const heardJa = /\u304d\u3044/;
  const nothingJa = /\u306a\u306b\u3082/;
  const secretJa = /\u3072\u307f\u3064/;
  const nobodyJa = /\u3060\u308c\u306b\u3082/;
  const fineJa = /\u3044\u3044\u3088/;
  const keptJa = /\u307e\u3082\u3063\u305f/;
  const fineMessageJa = /\u3060\u3044\u3058\u3087\u3046\u3076|\u3088\u304b\u3063\u305f/;

  it("say the shadow heard the item when it was given, whether it is a secret or not", () => {
    expect(en.shadows.givenSafe).toMatch(/shadow heard/);
    expect(en.shadows.givenSecret).toMatch(/shadow heard/);
    expect(ja.shadows.givenSafe).toMatch(heardJa);
    expect(ja.shadows.givenSecret).toMatch(heardJa);
  });

  it("say the shadow heard nothing when a secret was kept, and that the item was kept", () => {
    expect(en.shadows.keptSecret).toMatch(/heard nothing/);
    expect(en.shadows.keptSecret).toMatch(/You kept the/);
    expect(ja.shadows.keptSecret).toMatch(nothingJa);
    expect(ja.shadows.keptSecret).toMatch(keptJa);
  });

  it("say it was fine to give or to share when a thing that is fine to give was given or kept, and never that it is a secret", () => {
    expect(en.shadows.givenSafe).toMatch(/fine/);
    expect(en.shadows.keptSafe).toMatch(/fine to give/);
    expect(ja.shadows.givenSafe).toMatch(fineMessageJa);
    expect(ja.shadows.keptSafe).toMatch(fineMessageJa);
    for (const text of [en.shadows.givenSafe, en.shadows.keptSafe])
      expect(text).not.toMatch(/secret/);
    for (const text of [ja.shadows.givenSafe, ja.shadows.keptSafe])
      expect(text).not.toMatch(secretJa);
  });

  it("say of each secret that it is a secret that is given to nobody", () => {
    for (const item of secrets) {
      expect(en.shadows.why[item], item).toMatch(/is a secret\nWe give it to nobody$/);
      expect(ja.shadows.why[item], item).toMatch(secretJa);
      expect(ja.shadows.why[item], item).toMatch(nobodyJa);
    }
  });

  it("say of each other item that it is just that item and fine to give, with no word of secret", () => {
    for (const item of rest) {
      expect(en.shadows.why[item], item).toMatch(/^An? \w+ is just an? \w+\nIt is fine to give$/);
      expect(en.shadows.why[item], item).not.toMatch(/secret/);
      expect(ja.shadows.why[item], item).toMatch(fineJa);
      expect(ja.shadows.why[item], item).not.toMatch(secretJa);
    }
  });

  it("keep the closing line its own text: no line of it appears in any message", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const item of items) {
        const why = shadows[lang].why[item];
        for (const key of namedKeys) {
          const message = render(shadows[lang][key], label(lang, item));
          for (const line of lines(why)) expect(message, `${lang} ${key}`).not.toContain(line);
        }
      }
    }
  });

  it("ask to give or keep it secret in the guide, and say in the question what the child has", () => {
    expect(en.shadows.guide).toMatch(/A shadow is listening/);
    expect(en.shadows.guide).toMatch(/Give it or keep it secret/);
    expect(en.shadows.give).toBe("Give");
    expect(en.shadows.secret).toBe("Secret");
    expect(en.shadows.ask).toMatch(/^You have the \{0\}/);
    expect(ja.shadows.guide).toMatch(secretJa);
    expect(ja.shadows.secret).toMatch(secretJa);
  });

  it("say on the title button that trial 4 has a 60-second clock", () => {
    expect(en.shadows.timeAttack).toMatch(/60 seconds/);
    expect(ja.shadows.timeAttack).toMatch(/^60/);
  });
});

describe("shadows strings: no blame, no fear, no claims (REQ-7.4)", () => {
  const blameEn = /\b(wrong|bad|no|not|fail\w*|mistake|oops|error|sorry|naughty|should|must)\b/i;
  const fearEn =
    /\b(enemy|enemies|thief|thieves|steal\w*|stole|stranger|scary|scared|afraid|fear\w*|danger\w*|monster|spy|spies|villain|trick\w*|hurt|harm|angry|hungry|take|takes|wants?)\b/i;
  // always, every, all, know, friend, family, robot, real, AI, anyone, anything.
  const claimEn =
    /\b(always|every\w*|all|know\w*|friends?|family|robot|real|ai|anyone|anything|forever)\b/i;
  // chigau, chigai, machigai, dame, zannen, shippai, ikenai, warui (blame); kowai, abunai, teki, dorobou,
  // nusu, bakemono, okoru (fear), escaped.
  const blameJa =
    /\u3061\u304c\u3046|\u3061\u304c\u3044|\u307e\u3061\u304c\u3044|\u3060\u3081|\u30c0\u30e1|\u3056\u3093\u306d\u3093|\u3057\u3063\u3071\u3044|\u3044\u3051\u306a\u3044|\u308f\u308b\u3044/;
  const fearJa =
    /\u3053\u308f\u3044|\u3042\u3076\u306a\u3044|\u3066\u304d|\u3069\u308d\u307c\u3046|\u306c\u3059|\u3070\u3051\u3082\u306e|\u304a\u3053/;
  // kanarazu, zettai, tomodachi, kazoku, nandemo, zenbu, robotto, shitteru, escaped.
  const claimJa =
    /\u304b\u306a\u3089\u305a|\u305c\u3063\u305f\u3044|\u3068\u3082\u3060\u3061|\u304b\u305e\u304f|\u306a\u3093\u3067\u3082|\u305c\u3093\u3076|\u30ed\u30dc\u30c3\u30c8|\u3057\u3063\u3066\u308b/;

  it("keep blame words out of every shadows string with every applicable item's name inserted", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(blameEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(blameJa);
  });

  it("keep fear words out of every shadows string: the shadow only listens, it is never an enemy", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(fearEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(fearJa);
  });

  it("make no claim about real AI, a helper that always or never does something, a friend or a family", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(claimEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(claimJa);
  });

  it("never say the wisp or the child did something wrong or on purpose", () => {
    for (const text of allRendered("en"))
      expect(text, text).not.toMatch(/\b(on purpose|you did)\b/i);
    for (const text of allRendered("en")) expect(text, text).not.toMatch(/\bwisp\b/i);
  });
});
