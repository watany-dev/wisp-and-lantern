import { describe, expect, it } from "vite-plus/test";
import en from "../strings.en.json";
import ja from "../strings.ja.json";

// Trial 4 strings (spec 07-trial-keep-secrets, REQ-7.11) and the title's caption. Japanese words are written as
// \u escapes because this repository is English-only outside the allowlist.

const keys = [
  "enter",
  "timeAttack",
  "guide",
  "start",
  "given",
  "secret",
  "done",
  "lesson",
  "next",
  "items",
];
const itemKeys = ["candy", "flower", "acorn", "leaf", "key", "address", "password"];
const safeKeys = ["candy", "flower", "acorn", "leaf"] as const;
const secretKeys = ["key", "address", "password"] as const;
const bag = { ja: ja.bag, en: en.bag };
/** A done round handed over 3 or 4 safe things (one or two secrets among five). */
const numbers = ["3", "4"];

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

const render = (text: string, value: string) => text.replace("{0}", value);
const lines = (text: string) => text.split("\n");
const longest = (text: string) => Math.max(...lines(text).map((l) => l.length));

/** Every string of the group, with every name or number inserted where it takes one. */
function allRendered(lang: "ja" | "en"): string[] {
  const { items, given, secret, done, ...texts } = bag[lang];
  return [
    ...Object.values(texts),
    ...Object.values(items),
    ...safeKeys.map((k) => render(given, items[k])),
    ...secretKeys.map((k) => render(secret, items[k])),
    ...numbers.map((n) => render(done, n)),
  ];
}

describe("bag strings: keys and placeholders (REQ-7.11.1, REQ-7.11.3)", () => {
  it("exist in both languages under the same keys, in the same order", () => {
    expect(Object.keys(ja.bag)).toEqual(keys);
    expect(Object.keys(en.bag)).toEqual(keys);
    expect(Object.keys(ja.bag.items)).toEqual(itemKeys);
    expect(Object.keys(en.bag.items)).toEqual(itemKeys);
  });

  it("take exactly one name or number in the given, secret and done messages, and nowhere else", () => {
    for (const group of [ja.bag, en.bag]) {
      const { items, ...texts } = group;
      for (const [key, text] of Object.entries(texts)) {
        const takes = ["given", "secret", "done"].includes(key);
        expect(text.split("{0}"), key).toHaveLength(takes ? 2 : 1);
      }
      for (const label of Object.values(items)) expect(label).not.toContain("{");
    }
  });

  it("leave no placeholder behind once the name or the number is inserted", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const text of allRendered(lang)) expect(text, text).not.toMatch(/\{\d\}/);
    }
  });

  it("insert the names and the number where they read naturally", () => {
    expect(render(en.bag.given, en.bag.items.acorn)).toBe("The acorn is safe to give");
    expect(render(en.bag.secret, en.bag.items.key)).toBe(
      "The house key is a secret!\nA shadow may be listening",
    );
    expect(render(en.bag.done, "3")).toBe("You gave 3 safe things");
    // 3 and ko (the counter).
    expect(render(ja.bag.done, "3")).toContain("3\u3053");
  });
});

describe("bag strings: Japanese rules and English lengths (REQ-7.11.2)", () => {
  it("obey hard rule 2 for every string, with every name and number inserted", () => {
    for (const text of allRendered("ja")) expect(kidProblems(text), text).toEqual([]);
  });

  it("keep every English message to two lines of at most 28 characters, with every name inserted", () => {
    for (const text of allRendered("en")) {
      expect(lines(text).length, text).toBeLessThanOrEqual(2);
      expect(longest(text), text).toBeLessThanOrEqual(28);
    }
  });

  it("keep the closing line to two lines in both languages", () => {
    expect(lines(en.bag.lesson)).toHaveLength(2);
    expect(lines(ja.bag.lesson)).toHaveLength(2);
  });

  it("keep the names short enough for a 104 px card in 16 px letters, on one line", () => {
    for (const name of Object.values(ja.bag.items)) {
      expect(lines(name)).toHaveLength(1);
      expect(name.replace(/\s/gu, "").length, name).toBeLessThanOrEqual(6);
    }
    for (const name of Object.values(en.bag.items))
      expect(name.length, name).toBeLessThanOrEqual(10);
  });

  it("keep the button labels on one line, short enough for the 300 px buttons", () => {
    for (const key of ["enter", "next"] as const) {
      expect(lines(ja.bag[key]), key).toHaveLength(1);
      expect(ja.bag[key].replace(/\s/gu, "").length, key).toBeLessThanOrEqual(12);
      expect(lines(en.bag[key]), key).toHaveLength(1);
      expect(en.bag[key].length, key).toBeLessThanOrEqual(20);
    }
  });
});

describe("bag strings: the words say what the rules do (REQ-7.2 to REQ-7.6)", () => {
  // Japanese for: secret (naisho), shadow (kage), listening (kiite), maybe (kamo), to anyone (darenimo),
  // do not hand over (watasanai), key (kagi), address (juusho), password (aikotoba), it is fine (daijoubu),
  // hand over (watashite, wataseta), kept (mamotte), the wisp, tap, house (ouchi).
  const secretJa = /\u306a\u3044\u3057\u3087/;
  const shadowJa = /\u304b\u3052/;
  const listeningJa = /\u304d\u3044\u3066/;
  const maybeJa = /\u304b\u3082/;
  const anyoneJa = /\u3060\u308c\u306b\u3082/;
  const keepBackJa = /\u308f\u305f\u3055\u306a\u3044/;
  const keyJa = /\u304b\u304e/;
  const addressJa = /\u3058\u3085\u3046\u3057\u3087/;
  const passwordJa = /\u3042\u3044\u3053\u3068\u3070/;
  const fineJa = /\u3060\u3044\u3058\u3087\u3046\u3076/;
  const handJa = /\u308f\u305f\u3057\u3066|\u308f\u305f\u305b\u305f|\u308f\u305f\u3059/;
  const keptJa = /\u307e\u3082\u3063\u3066/;
  const wispJa = /\u30a6\u30a3\u30b9\u30d7/;
  const tapJa = /\u30bf\u30c3\u30d7/;
  const houseJa = /\u304a\u3046\u3061/;

  it("make the guide the lesson itself: the key, the address and the password are given to no one", () => {
    expect(en.bag.guide).toMatch(/\bkeys?\b.*\baddress\b.*\bpassword\b/is);
    expect(en.bag.guide).toMatch(/\bnever give\b.*\banyone\b/is);
    for (const word of [keyJa, addressJa, passwordJa, anyoneJa, keepBackJa]) {
      expect(ja.bag.guide).toMatch(word);
    }
  });

  it("say before any tap to tap what can be given to the wisp", () => {
    expect(en.bag.start).toMatch(/\btap\b.*\bgive\b.*\bwisp\b/is);
    expect(ja.bag.start).toMatch(wispJa);
    expect(ja.bag.start).toMatch(tapJa);
  });

  it("say after a safe hand-over that this thing was fine to give", () => {
    expect(en.bag.given).toMatch(/\bsafe to give\b/);
    expect(ja.bag.given).toMatch(fineJa);
    expect(ja.bag.given).toMatch(handJa);
  });

  it("say after a secret tap that it is a secret and that a shadow may be listening, with a may", () => {
    expect(en.bag.secret).toMatch(/\bis a secret!/);
    expect(en.bag.secret).toMatch(/\bA shadow may be listening\b/);
    expect(ja.bag.secret).toMatch(secretJa);
    expect(ja.bag.secret).toMatch(shadowJa);
    expect(ja.bag.secret).toMatch(listeningJa);
    expect(ja.bag.secret).toMatch(maybeJa);
  });

  it("name the three secrets as the guide does, and the key as the house key so it is not the shed's tool", () => {
    expect(en.bag.items.key).toBe("house key");
    expect(en.bag.items.address).toBe("address");
    expect(en.bag.items.password).toBe("password");
    expect(ja.bag.items.key).toMatch(houseJa);
    expect(ja.bag.items.key).toMatch(keyJa);
    expect(ja.bag.items.address).toMatch(addressJa);
    expect(ja.bag.items.password).toMatch(passwordJa);
    expect(en.bag.items.key).not.toBe(en.shed.tools.key);
    expect(ja.bag.items.key).not.toBe(ja.shed.tools.key);
  });

  it("count what was handed over in the done message, and say in both languages that they were the safe things", () => {
    expect(en.bag.done).toMatch(/\bgave\b.*\{0\}.*\bsafe\b/);
    expect(ja.bag.done).toMatch(handJa);
    // iimono (good things), the closing line's word for the safe things, escaped.
    expect(ja.bag.done).toMatch(/\u3044\u3044\u3082\u306e/);
  });

  it("keep the closing line its own text: the secrets stayed and only safe things went; it shares no line with the done message or the guide", () => {
    expect(en.bag.lesson).toBe("You kept the secrets\nand gave the safe ones");
    expect(ja.bag.lesson).toMatch(secretJa);
    expect(ja.bag.lesson).toMatch(keptJa);
    expect(ja.bag.lesson).toMatch(handJa);
    for (const lang of ["ja", "en"] as const) {
      const b = bag[lang];
      for (const n of numbers) {
        const message = render(b.done, n);
        for (const line of lines(b.lesson)) expect(message).not.toContain(line);
        for (const line of lines(message)) expect(b.lesson).not.toContain(line);
      }
      for (const line of lines(b.lesson)) expect(b.guide).not.toContain(line);
    }
  });

  it("use the lane's words for the next button", () => {
    expect(en.bag.next).toBe(en.lane.again);
    expect(ja.bag.next).toBe(ja.lane.again);
  });
});

describe("the title's label and caption for the bag (REQ-7.1.1)", () => {
  // naisho (secret), escaped.
  const secretJaWord = /\u306a\u3044\u3057\u3087/;

  it("says the bag is a 60-second run, on one short line, and the label has no number", () => {
    expect(en.bag.timeAttack).toMatch(/\b60 seconds\b/);
    // 60 and byou (seconds), escaped.
    expect(ja.bag.timeAttack).toMatch(/60\u3073\u3087\u3046/);
    expect(lines(ja.bag.timeAttack)).toHaveLength(1);
    expect(lines(en.bag.timeAttack)).toHaveLength(1);
    expect(kidProblems(ja.bag.timeAttack)).toEqual([]);
    for (const text of [ja.bag.enter, en.bag.enter]) expect(text).not.toMatch(/\d/);
    expect(en.bag.enter).toMatch(/\bsecrets?\b/i);
    expect(ja.bag.enter).toMatch(secretJaWord);
  });
});

describe("bag strings: no blame, no fear, no claims (REQ-7.4.2, REQ-7.4.5, REQ-7.6.3)", () => {
  // Words that blame or scare: bad, wrong, no!, danger, steal, thief, enemy, scary, lie, oops, sorry, fail,
  // mistake, naughty, stupid, silly, fault, careless, punish, take, grab, monster, evil, mean.
  const blameEn =
    /\b(bad|wrong|no!|danger\w*|steal\w*|stole\w*|thie\w*|enem\w*|scar\w*|lie[sd]?|lying|liars?|oops|sorry|fail\w*|mistake\w*|naughty|stupid|silly|fault|careless|punish\w*|take[sn]?|took|grab\w*|monsters?|evil|mean)\b/i;
  // Japanese for: kowai (scary), abunai (danger), torare (taken), nusu (steal), dorobou (thief), warui (bad),
  // dame, chigau, chigai, shippai, baka, teki (enemy), uso, iken (must not), kiken (danger) (escaped).
  const blameJa =
    /\u3053\u308f\u3044|\u3042\u3076\u306a\u3044|\u3068\u3089\u308c|\u306c\u3059|\u3069\u308d\u307c\u3046|\u308f\u308b\u3044|\u3060\u3081|\u30c0\u30e1|\u3061\u304c\u3046|\u3061\u304c\u3044|\u3057\u3063\u3071\u3044|\u3070\u304b|\u3066\u304d|\u3046\u305d|\u3044\u3051\u306a\u3044|\u304d\u3051\u3093/;
  // always, know, friend, family, AI, robot, computer, smart, clever, everyone, everything, protect you, safe
  // forever.
  const claimEn =
    /\b(always|know\w*|friends?|family|ai|robots?|computers?|smart|clever|everyone|everything|protects?|forever)\b/i;
  // tomodachi, kazoku, itsumo, zettai, nandemo (escaped).
  const claimJa =
    /\u3068\u3082\u3060\u3061|\u304b\u305e\u304f|\u3044\u3064\u3082|\u305c\u3063\u305f\u3044|\u306a\u3093\u3067\u3082/;

  it("keep blame and fear words out of every bag string, with every name inserted", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(blameEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(blameJa);
  });

  it("make no claim that a helper always listens, knows everything, protects the child or is a friend", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(claimEn);
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(claimJa);
  });

  it("say that a shadow may be listening, never that it is bad or will take anything", () => {
    expect(en.bag.secret).not.toMatch(/\bwill\b|\bis listening\b/);
    expect(ja.bag.secret).toMatch(/\u304b\u3082$/m);
  });

  it("never ask for a name, and never name a real person or place", () => {
    for (const text of allRendered("en")) expect(text, text).not.toMatch(/\bname\b/i);
    // onamae, namae (escaped).
    for (const text of allRendered("ja")) expect(text, text).not.toMatch(/\u306a\u307e\u3048/);
  });
});
