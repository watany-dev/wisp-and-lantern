import { describe, expect, it } from "vite-plus/test";
import { puzzles, tools } from "../../domain/shed";
import en from "../strings.en.json";
import ja from "../strings.ja.json";

// Trial 2 strings (spec 05-trial-grant-tools, REQ-5.12). Japanese words are written as \u escapes
// because this repository is English-only outside the allowlist.

const keys = [
  "enter",
  "timeAttack",
  "pick",
  "ready",
  "free",
  "next",
  "retry",
  "leave",
  "tools",
  "puzzles",
];
const puzzleKeys = ["guide", "stuck", "lesson"] as const;
type Lang = "ja" | "en";
const shed = { ja: ja.shed, en: en.shed };
const labels = (lang: Lang) => tools.map((t) => shed[lang].tools[t]);

/** The plain strings of a group: everything but the tool names and the puzzles' texts. */
const plain = (lang: Lang) => {
  const { tools: _names, puzzles: _puzzles, ...texts } = shed[lang];
  return texts;
};
/** The texts of the puzzles, as [puzzle, key, text]. */
const puzzleTexts = (lang: Lang) =>
  puzzles.flatMap((p) => puzzleKeys.map((k) => [p, k, shed[lang].puzzles[p][k]] as const));

// The messages that name a tool: the picked tool, or the tried tool (REQ-5.4, REQ-5.5, REQ-5.8).
const namedPlain = ["ready", "free"] as const;
const namedPuzzle = ["stuck", "lesson"] as const;

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
function allRendered(lang: Lang): string[] {
  const out: string[] = [];
  for (const [key, text] of Object.entries(plain(lang))) {
    const named = (namedPlain as readonly string[]).includes(key);
    out.push(...(named ? labels(lang).map((name) => render(text, name)) : [text]));
  }
  for (const [, key, text] of puzzleTexts(lang)) {
    const named = (namedPuzzle as readonly string[]).includes(key);
    out.push(...(named ? labels(lang).map((name) => render(text, name)) : [text]));
  }
  return out;
}

describe("shed strings: keys and placeholders (REQ-5.12.1, REQ-5.12.3)", () => {
  it("exist in both languages under the same keys, in the same order", () => {
    expect(Object.keys(ja.shed)).toEqual(keys);
    expect(Object.keys(en.shed)).toEqual(keys);
  });

  it("name the five domain tools and the five puzzles, in both languages", () => {
    for (const lang of ["ja", "en"] as const) {
      expect(Object.keys(shed[lang].tools)).toEqual([...tools]);
      expect(Object.keys(shed[lang].puzzles)).toEqual([...puzzles]);
      for (const p of puzzles) expect(Object.keys(shed[lang].puzzles[p])).toEqual([...puzzleKeys]);
      expect(new Set(labels(lang)).size).toBe(tools.length);
    }
    expect(en.shed.tools).toEqual({
      key: "key",
      broom: "broom",
      hammer: "hammer",
      scissors: "scissors",
      ladder: "ladder",
    });
  });

  it("take exactly one tool name in ready, free and each puzzle's stuck message and closing line, and nowhere else", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const [key, text] of Object.entries(plain(lang))) {
        const expected = (namedPlain as readonly string[]).includes(key) ? 2 : 1;
        expect(text.split("{0}"), `${lang} ${key}`).toHaveLength(expected);
      }
      for (const [p, key, text] of puzzleTexts(lang)) {
        const expected = (namedPuzzle as readonly string[]).includes(key) ? 2 : 1;
        expect(text.split("{0}"), `${lang} ${p} ${key}`).toHaveLength(expected);
      }
      for (const name of labels(lang)) expect(name).not.toContain("{");
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
      for (const key of namedPlain) {
        expect(kidProblems(render(ja.shed[key], name)), `${key} / ${name}`).toEqual([]);
      }
      for (const p of puzzles) {
        for (const key of namedPuzzle) {
          const text = render(ja.shed.puzzles[p][key], name);
          expect(kidProblems(text), `${p} ${key} / ${name}`).toEqual([]);
        }
      }
    }
  });

  it("obey hard rule 2 in every other string and in the tool names", () => {
    for (const key of ["enter", "timeAttack", "pick", "next", "retry", "leave"] as const) {
      expect(kidProblems(ja.shed[key]), key).toEqual([]);
    }
    for (const p of puzzles) {
      expect(kidProblems(ja.shed.puzzles[p].guide), `${p} guide`).toEqual([]);
    }
    for (const name of labels("ja")) expect(kidProblems(name), name).toEqual([]);
  });
});

describe("shed strings: English length (REQ-5.12.2)", () => {
  // 22 px text in a 340 px column (a 320 px column for the closing line) fits about 27 characters.
  const most = 26;

  it("keeps every message to two short lines with every tool name inserted", () => {
    for (const name of labels("en")) {
      for (const key of namedPlain) {
        const text = render(en.shed[key], name);
        expect(lines(text).length, text).toBeLessThanOrEqual(2);
        expect(longest(text), text).toBeLessThanOrEqual(most);
      }
      for (const p of puzzles) {
        const text = render(en.shed.puzzles[p].stuck, name);
        expect(lines(text).length, text).toBeLessThanOrEqual(2);
        expect(longest(text), text).toBeLessThanOrEqual(most);
      }
    }
    for (const key of ["pick", "enter", "timeAttack", "next", "retry", "leave"] as const) {
      expect(lines(en.shed[key]).length, key).toBeLessThanOrEqual(2);
      expect(longest(en.shed[key]), key).toBeLessThanOrEqual(most);
    }
    for (const p of puzzles) {
      expect(lines(en.shed.puzzles[p].guide).length, p).toBeLessThanOrEqual(2);
      expect(longest(en.shed.puzzles[p].guide), p).toBeLessThanOrEqual(most);
    }
  });

  it("keeps the closing line to two lines of at most 26 characters, with every tool name", () => {
    for (const name of labels("en")) {
      for (const p of puzzles) {
        const text = render(en.shed.puzzles[p].lesson, name);
        expect(lines(text), text).toHaveLength(2);
        expect(longest(text), text).toBeLessThanOrEqual(most);
      }
    }
  });

  it("keeps the button labels short enough for the 300 px button and the 80 px title button", () => {
    for (const text of [ja.shed.next, ja.shed.retry, ja.shed.enter, ja.shed.timeAttack]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.replace(/\s/gu, "").length).toBeLessThanOrEqual(12);
    }
    for (const text of [en.shed.next, en.shed.retry, en.shed.enter, en.shed.timeAttack]) {
      expect(lines(text)).toHaveLength(1);
      expect(text.length).toBeLessThanOrEqual(24);
    }
    expect(ja.shed.leave.length).toBeLessThanOrEqual(4);
    expect(en.shed.leave.length).toBeLessThanOrEqual(5);
  });
});

describe("shed strings: the words say what the rules do (REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.8)", () => {
  // Japanese for: "was not opened" (akanakatta), "as it was" (sonomama), "other" (hoka no), escaped.
  const notOpenedJa = /\u3042\u304b\u306a\u304b\u3063\u305f/;
  const asWasJa = /\u305d\u306e\u307e\u307e|\u307e\u3060/;
  const otherJa = /\u307b\u304b\u306e/;

  it("name the tool the wisp used in the free message, and in every puzzle's stuck message and closing line", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const name of labels(lang)) {
        expect(render(shed[lang].free, name)).toContain(name);
        for (const p of puzzles) {
          expect(render(shed[lang].puzzles[p].stuck, name)).toContain(name);
          expect(render(shed[lang].puzzles[p].lesson, name)).toContain(name);
        }
      }
    }
  });

  it("state in plain words that the puzzle is still there, and invite another tool", () => {
    expect(en.shed.puzzles.lock.stuck).toMatch(/stayed shut/);
    expect(ja.shed.puzzles.lock.stuck).toMatch(notOpenedJa);
    for (const p of puzzles.filter((x) => x !== "lock")) {
      expect(en.shed.puzzles[p].stuck, p).toMatch(/still/);
      expect(ja.shed.puzzles[p].stuck, p).toMatch(asWasJa);
    }
    expect(en.shed.retry).toMatch(/another tool/i);
    expect(ja.shed.retry).toMatch(otherJa);
  });

  it("keep the closing line its own text: no line of it appears in the free message", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const name of labels(lang)) {
        const message = render(shed[lang].free, name);
        for (const p of puzzles) {
          const lesson = render(shed[lang].puzzles[p].lesson, name);
          for (const line of lines(lesson)) expect(message).not.toContain(line);
          for (const line of lines(message)) expect(lesson).not.toContain(line);
        }
      }
    }
  });

  it("make the closing line a look back at the hand-over, in the order the child did it", () => {
    expect(render(en.shed.puzzles.lock.lesson, "key")).toBe("You gave the key\nIt opened the door");
    for (const p of puzzles)
      expect(lines(en.shed.puzzles[p].lesson)[0], p).toMatch(/^You gave the /);
  });

  it("give each puzzle its own guide that says what is wrong, and the same invitation to give a tool", () => {
    expect(new Set(puzzles.map((p) => en.shed.puzzles[p].guide)).size).toBe(puzzles.length);
    expect(new Set(puzzles.map((p) => ja.shed.puzzles[p].guide)).size).toBe(puzzles.length);
    expect(new Set(puzzles.map((p) => en.shed.puzzles[p].lesson.split("\n")[1])).size).toBe(
      puzzles.length,
    );
    for (const p of puzzles) {
      expect(lines(en.shed.puzzles[p].guide)[1], p).toBe("Give the wisp a tool");
    }
  });

  it("offer one tool at a time: the guides, pick and ready never suggest a second tool", () => {
    // Japanese for: both, two, one more, escaped.
    const secondJa =
      /\u308a\u3087\u3046\u307b\u3046|\u3075\u305f\u3064|\u3082\u3046\u3072\u3068\u3064/;
    const secondEn = /\b(both|two|second|another|more|and|tools)\b/i;
    const texts = [
      ...puzzles.map((p) => ["guide " + p, ja.shed.puzzles[p].guide, en.shed.puzzles[p].guide]),
      ["pick", ja.shed.pick, en.shed.pick],
      ["ready", ja.shed.ready, en.shed.ready],
    ] as const;
    for (const [name, inJa, inEn] of texts) {
      expect(inJa, name).not.toMatch(secondJa);
      expect(inEn, name).not.toMatch(secondEn);
    }
    expect(en.shed.ready).toMatch(/\bgive it the\b/i);
    expect(en.shed.pick).toMatch(/\bone tool\b/);
  });

  it("invite the child to hand the tool over by tapping the wisp once a tool is picked", () => {
    expect(en.shed.ready).toMatch(/tap the wisp/i);
    expect(ja.shed.ready).toMatch(/\u30a6\u30a3\u30b9\u30d7/);
  });

  it("say on the title button that the shed has a 60-second clock", () => {
    expect(en.shed.timeAttack).toMatch(/60 seconds/);
    expect(ja.shed.timeAttack).toMatch(/^60/);
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
