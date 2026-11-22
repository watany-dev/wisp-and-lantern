import { describe, expect, it } from "vite-plus/test";
import { secretItems } from "../../domain/bag";
import type { GameEvent } from "../../domain/events";
import { reduce } from "../../domain/reducer";
import { initialState, type GameState, type Lang } from "../../domain/state";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import { bagCaption, bagEnterLabel, bagView, justFinished, justGiven, justHeld } from "../bag-view";

// Trial 4 (spec 07-trial-keep-secrets): what the bag's screen shows in each stage, in both languages.

const strings = { ja, en };
const play = (events: GameEvent[], from: GameState) => events.reduce(reduce, from);
const give = (index: number): GameEvent => ({ type: "GiveItem", index });
const enter = (lang: Lang, seed = 0) =>
  reduce({ ...initialState, lang }, { type: "StartBag", seed });
// Seed 0, round 0: candy, address, acorn, flower, leaf. The address (place 1) is the one secret.
const safe0 = [0, 2, 3, 4];
const fill = (text: string, value: string) => text.replace("{0}", value);

describe.each(["ja", "en"] as const)("bagView in %s (REQ-7.2 to REQ-7.6)", (lang) => {
  const s = strings[lang].bag;
  const start = enter(lang);

  it("shows the guide, the five things with their names, the rule card and no button before any tap", () => {
    const view = bagView(start);
    expect(view.guide).toBe(s.guide);
    expect(view.message).toBe(s.start);
    expect(view.items.map((i) => i.item)).toEqual(["candy", "address", "acorn", "flower", "leaf"]);
    expect(view.items.map((i) => i.label)).toEqual([
      s.items.candy,
      s.items.address,
      s.items.acorn,
      s.items.flower,
      s.items.leaf,
    ]);
    expect(view.items.map((i) => i.index)).toEqual([0, 1, 2, 3, 4]);
    expect(view.items.every((i) => !i.given && !i.kept)).toBe(true);
    expect(view.rules).toEqual(secretItems);
    expect(view.lesson).toBeNull();
    expect(view.buttons).toEqual([]);
    expect(view.last).toBeNull();
    expect(view.finished).toBe(false);
    expect(view.leave).toBe(strings[lang].shed.leave);
  });

  it("after a safe hand-over: the tick on that thing only, and the message names it as safe to give", () => {
    const view = bagView(play([give(2)], start));
    expect(view.items.map((i) => i.given)).toEqual([false, false, true, false, false]);
    expect(view.message).toBe(fill(s.given, s.items.acorn));
    expect(view.last).toEqual({ index: 2, secret: false });
    expect(view.rules).toEqual(secretItems);
    expect(view.buttons).toEqual([]);
  });

  it("after a secret tap: nothing handed over, and the message names the secret and the shadow", () => {
    const view = bagView(play([give(0), give(1)], start));
    expect(view.items.map((i) => i.given)).toEqual([true, false, false, false, false]);
    expect(view.items.every((i) => !i.kept)).toBe(true);
    expect(view.message).toBe(fill(s.secret, s.items.address));
    expect(view.last).toEqual({ index: 1, secret: true });
    expect(view.lesson).toBeNull();
  });

  it("names each secret when it is tapped", () => {
    // Seed 1, round 0: the house key is in place 1; seed 0, round 1: the password in place 1.
    expect(bagView(play([give(1)], enter(lang, 1))).message).toBe(fill(s.secret, s.items.key));
    const round1 = play([...safe0.map(give), { type: "RetryBag" }, give(1)], start);
    expect(bagView(round1).message).toBe(fill(s.secret, s.items.password));
  });
});

describe.each(["ja", "en"] as const)(
  "bagView in %s, a done round and after (REQ-7.5, REQ-7.6)",
  (lang) => {
    const s = strings[lang].bag;
    const start = enter(lang);

    it("once every safe thing is handed over: the number, the padlocks on the secrets, the closing line and Next", () => {
      const view = bagView(play(safe0.map(give), start));
      expect(view.message).toBe(fill(s.done, "4"));
      expect(view.items.map((i) => i.given)).toEqual([true, false, true, true, true]);
      expect(view.items.map((i) => i.kept)).toEqual([false, true, false, false, false]);
      expect(view.rules).toBeNull();
      expect(view.lesson).toBe(s.lesson);
      expect(view.buttons).toEqual([
        { id: "next", text: s.next, event: { type: "RetryBag" }, slot: "single", icon: "none" },
      ]);
      expect(view.last).toBeNull();
      expect(view.finished).toBe(true);
    });

    it("counts three when the round had two secrets", () => {
      const round1 = play([...safe0.map(give), { type: "RetryBag" }], start);
      // Seed 0, round 1: candy, password, address, flower, acorn.
      const view = bagView(play([0, 3, 4].map(give), round1));
      expect(view.message).toBe(fill(s.done, "3"));
      expect(view.items.map((i) => i.kept)).toEqual([false, true, true, false, false]);
    });

    it("goes back to the start message, the rule card and no button in the next round", () => {
      const next = bagView(play([...safe0.map(give), { type: "RetryBag" }], start));
      expect(next.message).toBe(s.start);
      expect(next.rules).toEqual(secretItems);
      expect(next.lesson).toBeNull();
      expect(next.buttons).toEqual([]);
      expect(next.items.every((i) => !i.given && !i.kept)).toBe(true);
    });

    it("keeps what is shown on the end screen of the run, so a time up does not change the picture", () => {
      const over = play([give(0), { type: "Tick", ms: 60_000 }], start);
      expect(bagView(over).items).toEqual(bagView(play([give(0)], start)).items);
    });
  },
);

describe("the title's words for the bag (REQ-7.1.1)", () => {
  it("are the bag's enter label and caption", () => {
    expect(bagEnterLabel("ja")).toBe(ja.bag.enter);
    expect(bagEnterLabel("en")).toBe(en.bag.enter);
    expect(bagCaption("ja")).toBe(ja.bag.timeAttack);
    expect(bagCaption("en")).toBe(en.bag.timeAttack);
  });
});

describe("the flourish helpers (REQ-7.3.4, REQ-7.4.3)", () => {
  const start = enter("en");
  const views = (...events: GameEvent[]) => {
    let state = start;
    const out = [bagView(state)];
    for (const e of events) {
      state = reduce(state, e);
      out.push(bagView(state));
    }
    return out;
  };

  it("justGiven names the thing handed over since the last view, including the one that finished the round", () => {
    const [a, b, c] = views(give(0), give(1));
    expect(justGiven(a, b!)).toBe(0);
    expect(justGiven(b, c!)).toBeNull();
    expect(justGiven(undefined, a!)).toBeNull();
    // With no view before, even a view with a thing handed over plays nothing (the scene's first paint).
    expect(justGiven(undefined, b!)).toBeNull();
    const all = views(...safe0.map(give));
    expect(justGiven(all[3], all[4]!)).toBe(4);
    expect(justGiven(all[4], all[4]!)).toBeNull();
  });

  it("justGiven does not replay on a change of language, or on the next round", () => {
    const gave = play([give(3)], start);
    const before = bagView(gave);
    expect(justGiven(before, bagView({ ...gave, lang: "ja" }))).toBeNull();
    const done = play(safe0.map(give), start);
    const next = reduce(done, { type: "RetryBag" });
    expect(justGiven(bagView(done), bagView(next))).toBeNull();
  });

  it("justHeld names a secret tapped since the last view, and not a second tap on the same one", () => {
    const [a, b, c, d] = views(give(1), give(1), give(0));
    expect(justHeld(a, b!)).toBe(1);
    expect(justHeld(undefined, b!)).toBe(1);
    // No tap yet: nothing was held back.
    expect(justHeld(undefined, a!)).toBeNull();
    expect(justHeld(b, a!)).toBeNull();
    expect(justHeld(b, c!)).toBeNull();
    expect(justHeld(c, d!)).toBeNull();
    const [, , after] = views(give(0), give(1));
    expect(justHeld(bagView(play([give(0)], start)), after!)).toBe(1);
  });

  it("justHeld sees a secret in place 0, after another secret", () => {
    // Seed 0, round 2: password, flower, leaf, candy, acorn. Round 3: acorn, leaf, password, key, candy.
    const round3 = play(
      [
        ...safe0.map(give),
        { type: "RetryBag" },
        ...[0, 3, 4].map(give),
        { type: "RetryBag" },
        ...[1, 2, 3, 4].map(give),
        { type: "RetryBag" },
      ],
      start,
    );
    expect(round3.bag).toMatchObject({ stage: "giving", round: 3 });
    const first = reduce(round3, give(2));
    const second = reduce(first, give(3));
    expect(justHeld(bagView(first), bagView(second))).toBe(3);
    const round2 = play(
      [...safe0.map(give), { type: "RetryBag" }, ...[0, 3, 4].map(give), { type: "RetryBag" }],
      start,
    );
    expect(justHeld(bagView(round2), bagView(reduce(round2, give(0))))).toBe(0);
  });

  it("justFinished is true only when a round has just been done", () => {
    const all = views(...safe0.map(give), { type: "RetryBag" });
    expect(justFinished(all[3], all[4]!)).toBe(true);
    expect(justFinished(all[4], all[4]!)).toBe(false);
    expect(justFinished(all[2], all[3]!)).toBe(false);
    expect(justFinished(all[4], all[5]!)).toBe(false);
    expect(justFinished(undefined, all[4]!)).toBe(true);
    expect(justFinished(undefined, all[0]!)).toBe(false);
  });
});
