import { describe, expect, it } from "vite-plus/test";
import { tools } from "../../domain/shed";
import en from "../strings.en.json";
import ja from "../strings.ja.json";

// Trial 2 strings (spec 05-trial-grant-tools, REQ-5.12). Japanese words are written as \u escapes
// because this repository is English-only outside the allowlist.

const keys = [
  "enter",
  "guide",
  "pick",
  "ready",
  "open",
  "shut",
  "lesson",
  "again",
  "retry",
  "tools",
];
// The messages that name a tool: the picked tool, or the tried tool (REQ-5.4, REQ-5.5, REQ-5.8).
const nameKeys = ["ready", "open", "shut", "lesson"] as const;
const shed = { ja: ja.shed, en: en.shed };
const labels = (lang: "ja" | "en") => tools.map((t) => shed[lang].tools[t]);

/** Mirrors `scripts/check-kid-strings.mjs` (REQ-5.12.2): no kanji, no Latin letters, 12 x 2. */
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

/** Every string of the group, with the tool name inserted where it takes one. */
function allRendered(lang: "ja" | "en"): string[] {
  const { tools: _names, ...texts } = shed[lang];
  return Object.entries(texts).flatMap(([key, text]) =>
    (nameKeys as readonly string[]).includes(key)
      ? labels(lang).map((name) => render(text, name))
      : [text],
  );
}

describe("shed strings: keys and placeholders (REQ-5.12.1, REQ-5.12.3)", () => {
  it("exist in both languages under the same keys, in the same order", () => {
    expect(Object.keys(ja.shed)).toEqual(keys);
    expect(Object.keys(en.shed)).toEqual(keys);
  });

  it("name the three domain tools, in both languages", () => {
    expect(Object.keys(ja.shed.tools)).toEqual([...tools]);
    expect(Object.keys(en.shed.tools)).toEqual([...tools]);
    expect(en.shed.tools).toEqual({ key: "key", broom: "broom", hammer: "hammer" });
    expect(new Set(labels("ja")).size).toBe(tools.length);
  });

  it("take exactly one tool name in ready, open, shut and the closing line, and nowhere else", () => {
    for (const group of [ja.shed, en.shed]) {
      const { tools: _names, ...texts } = group;
      for (const [key, text] of Object.entries(texts)) {
        const expected = (nameKeys as readonly string[]).includes(key) ? 2 : 1;
        expect(text.split("{0}"), key).toHaveLength(expected);
      }
      for (const name of Object.values(group.tools)) expect(name).not.toContain("{");
    }
  });

  it("leave no placeholder behind once a tool name is inserted", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const text of allRendered(lang)) expect(text, text).not.toMatch(/\{\d\}/);
    }
  });
});

describe("shed strings: Japanese rules (REQ-5.12.2)", () => {
  it("obey hard rule 2 for every message with every tool name inserted", () => {
    for (const name of labels("ja")) {
      for (const key of nameKeys) {
        const text = render(ja.shed[key], name);
        expect(kidProblems(text), `${key} / ${name}`).toEqual([]);
      }
    }
  });

  it("obey hard rule 2 in every other string and in the tool names", () => {
    for (const key of ["enter", "guide", "pick", "again", "retry"] as const) {
      expect(kidProblems(ja.shed[key]), key).toEqual([]);
    }
    for (const name of labels("ja")) expect(kidProblems(name), name).toEqual([]);
  });
});

describe("shed strings: English length (REQ-5.12.2)", () => {
  it("keeps every message to two short lines with every tool name inserted", () => {
    for (const name of labels("en")) {
      for (const key of ["ready", "open", "shut"] as const) {
        const text = render(en.shed[key], name);
        expect(lines(text).length, text).toBeLessThanOrEqual(2);
        expect(longest(text), text).toBeLessThanOrEqual(24);
      }
    }
    for (const key of ["guide", "pick", "enter", "again", "retry"] as const) {
      expect(lines(en.shed[key]).length, key).toBeLessThanOrEqual(2);
      expect(longest(en.shed[key]), key).toBeLessThanOrEqual(24);
    }
  });

  it("keeps the closing line to two lines of at most 20 characters, with every tool name", () => {
    for (const name of labels("en")) {
      const text = render(en.shed.lesson, name);
      expect(lines(text)).toHaveLength(2);
      expect(longest(text), text).toBeLessThanOrEqual(20);
    }
  });

  it("keeps the button labels short enough for the 300 px button", () => {
    for (const text of [ja.shed.again, ja.shed.retry, ja.shed.enter]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.replace(/\s/gu, "").length).toBeLessThanOrEqual(12);
    }
    for (const text of [en.shed.again, en.shed.retry, en.shed.enter]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.length).toBeLessThanOrEqual(20);
    }
  });
});

describe("shed strings: the words say what the rules do (REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.8)", () => {
  // Japanese for: "was not opened" (akanakatta), "again/other" (hoka no), escaped.
  const notOpenedJa = /\u3042\u304b\u306a\u304b\u3063\u305f/;
  const otherJa = /\u307b\u304b\u306e/;

  it("name the key in the open message and in the closing line, and any tool in the shut message", () => {
    expect(render(en.shed.open, en.shed.tools.key)).toContain("key");
    expect(render(ja.shed.open, ja.shed.tools.key)).toContain(ja.shed.tools.key);
    expect(render(en.shed.lesson, en.shed.tools.key)).toContain("key");
    expect(render(ja.shed.lesson, ja.shed.tools.key)).toContain(ja.shed.tools.key);
    for (const lang of ["ja", "en"] as const) {
      for (const name of labels(lang)) expect(render(shed[lang].shut, name)).toContain(name);
    }
  });

  it("state in plain words that the door stayed shut, and invite another tool", () => {
    expect(en.shed.shut).toMatch(/shut/);
    expect(ja.shed.shut).toMatch(notOpenedJa);
    expect(en.shed.retry).toMatch(/another tool/i);
    expect(ja.shed.retry).toMatch(otherJa);
  });

  it("keep the closing line its own text: no line of it appears in the open message", () => {
    for (const lang of ["ja", "en"] as const) {
      const name = shed[lang].tools.key;
      const message = render(shed[lang].open, name);
      const lesson = render(shed[lang].lesson, name);
      for (const line of lines(lesson)) expect(message).not.toContain(line);
      for (const line of lines(message)) expect(lesson).not.toContain(line);
    }
  });

  it("make the closing line a look back at the hand-over, in the order the child did it", () => {
    expect(render(en.shed.lesson, "key")).toBe("You gave a key\nIt opened the door");
    expect(lines(en.shed.lesson)[0]).toMatch(/gave/);
  });

  it("offer one tool at a time: the guide, pick and ready never suggest a second tool", () => {
    // Japanese for: both, two, one more, escaped.
    const secondJa =
      /\u308a\u3087\u3046\u307b\u3046|\u3075\u305f\u3064|\u3082\u3046\u3072\u3068\u3064/;
    const secondEn = /\b(both|two|second|another|more|and|tools)\b/i;
    for (const key of ["guide", "pick", "ready"] as const) {
      expect(ja.shed[key], key).not.toMatch(secondJa);
      expect(en.shed[key], key).not.toMatch(secondEn);
    }
    expect(en.shed.guide).toMatch(/\ba tool\b/);
    expect(en.shed.ready).toMatch(/\bgive it the\b/i);
    expect(en.shed.pick).toMatch(/\bone tool\b/);
  });

  it("invite the child to hand the tool over by tapping the wisp once a tool is picked", () => {
    expect(en.shed.ready).toMatch(/tap the wisp/i);
    expect(ja.shed.ready).toMatch(/\u30a6\u30a3\u30b9\u30d7/);
  });
});

describe("shed strings: no blame, no claims (REQ-5.6.1, REQ-5.8.5)", () => {
  const blameEn = /\b(wrong|bad|no|not|fail\w*|mistake|oops|error|sorry|naughty)\b/i;
  // Japanese for: chigau, chigai, dame, zannen, machigai, shippai, ikenai (escaped).
  const blameJa =
    /\u3061\u304c\u3046|\u3061\u304c\u3044|\u3060\u3081|\u3056\u3093\u306d\u3093|\u307e\u3061\u304c\u3044|\u3057\u3063\u3071\u3044|\u30c0\u30e1|\u3044\u3051\u306a\u3044/;
  // always, never, every, all, know, friend, family, real, robot, house, home, password, secret, anything.
  const claimEn =
    /\b(always|never|every\w*|all|know\w*|friends?|family|real|robot|houses?|home|passwords?|secrets?|anything)\b/i;
  // nandemo, kanarazu, zettai, tomodachi, kazoku, pasuwaado, ie, himitsu, zenbu (escaped).
  const claimJa =
    /\u306a\u3093\u3067\u3082|\u304b\u306a\u3089\u305a|\u305c\u3063\u305f\u3044|\u3068\u3082\u3060\u3061|\u304b\u305e\u304f|\u30d1\u30b9\u30ef\u30fc\u30c9|\u3044\u3048|\u3072\u307f\u3064|\u305c\u3093\u3076/;

  it("keep blame words out of every shed string with every tool name inserted", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(blameEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(blameJa);
  });

  it("make no claim about real AI, a tool that always works, a friend, or a real key or password", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(claimEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(claimJa);
  });
});
