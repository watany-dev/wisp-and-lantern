// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import type { GameEvent } from "../events";
import { reduce } from "../reducer";
import { initialState, type GameState } from "../state";

const play = (events: GameEvent[], from: GameState = initialState) => events.reduce(reduce, from);
const started = play([{ type: "Start" }]);
const pick = (...cards: Extract<GameEvent, { type: "PickCard" }>["card"][]): GameEvent[] =>
  cards.map((card) => ({ type: "PickCard", card }));
const ask: GameEvent = { type: "Ask" };
const retry: GameEvent = { type: "Retry" };

// The first three wishes, as picks: yellow lantern, red pumpkin, blue lantern.
const wish0 = pick("yellow", "lantern");
const wish1 = pick("red", "pumpkin");
const wish2 = pick("blue", "lantern");
const wrong = pick("red", "lantern");

describe("initialState", () => {
  it("starts on the title screen in English with no trial progress and no charms", () => {
    expect(initialState.lang).toBe("en");
    expect(initialState.phase).toBe("title");
    expect(initialState.trial).toBe(0);
    expect(initialState.charms).toEqual([]);
  });

  it("REQ-2.1: starts with the first wish, nothing picked and no search", () => {
    expect(initialState.lane).toEqual({
      wish: 0,
      pick: { color: null, thing: null },
      asked: false,
    });
  });
});

describe("reduce", () => {
  it("Start moves the game from the title to trial 1", () => {
    const next = reduce(initialState, { type: "Start" });
    expect(next.phase).toBe("trial");
    expect(next.trial).toBe(1);
    expect(next.lang).toBe(initialState.lang);
    expect(next.lane).toEqual(initialState.lane);
  });

  it("Start can set the language", () => {
    expect(reduce(initialState, { type: "Start", lang: "ja" }).lang).toBe("ja");
  });

  it("a second Start only sets the language: it never resets the trial or the lane", () => {
    const midway = play([...wish0, ask], started);
    expect(reduce(midway, { type: "Start" })).toEqual(midway);
    expect(reduce(midway, { type: "Start", lang: "ja" })).toEqual({ ...midway, lang: "ja" });
  });

  it("SetLang changes the language only", () => {
    const next = reduce(initialState, { type: "SetLang", lang: "ja" });
    expect(next).toEqual({ ...initialState, lang: "ja" });
  });

  it("MoveHeroTo moves the hero and does not mutate the previous state", () => {
    const next = reduce(initialState, { type: "MoveHeroTo", x: 10, y: 20 });
    expect(next.hero).toEqual({ x: 10, y: 20 });
    expect(initialState.hero).toEqual({ x: 195, y: 600 });
  });
});

describe("reduce: picking cards (REQ-2.2)", () => {
  it("sets the color and the object independently", () => {
    expect(play(pick("blue"), started).lane.pick).toEqual({ color: "blue", thing: null });
    expect(play(pick("lantern"), started).lane.pick).toEqual({ color: null, thing: "lantern" });
    expect(play(pick("blue", "lantern"), started).lane.pick).toEqual({
      color: "blue",
      thing: "lantern",
    });
  });

  it("replaces the card in the same row and keeps the other row", () => {
    const next = play(pick("red", "pumpkin", "yellow", "lantern"), started);
    expect(next.lane.pick).toEqual({ color: "yellow", thing: "lantern" });
  });

  it("picking the same card twice keeps it", () => {
    expect(play(pick("red", "red"), started).lane.pick).toEqual({ color: "red", thing: null });
  });

  it("never starts a search", () => {
    expect(play(wish0, started).lane.asked).toBe(false);
  });

  it("is ignored on the title screen", () => {
    expect(reduce(initialState, { type: "PickCard", card: "red" })).toBe(initialState);
  });

  it("is ignored after the helper has searched, until the retry", () => {
    const asked = play([...wrong, ask], started);
    expect(play(pick("blue", "pumpkin"), asked)).toBe(asked);
  });
});

describe("reduce: asking (REQ-2.3, REQ-2.4)", () => {
  it("searches exactly the picked cards once both are picked", () => {
    const next = play([...wrong, ask], started);
    expect(next.lane).toEqual({ wish: 0, pick: { color: "red", thing: "lantern" }, asked: true });
  });

  it.each([
    ["no card", []],
    ["only a color", pick("red")],
    ["only an object", pick("pumpkin")],
  ])("with %s is not a search and returns the same state", (_name, cards) => {
    const before = play(cards, started);
    expect(reduce(before, ask)).toBe(before);
  });

  it("asking again changes nothing", () => {
    const asked = play([...wish0, ask], started);
    expect(reduce(asked, ask)).toBe(asked);
  });

  it("does nothing on the title screen", () => {
    expect(reduce(initialState, ask)).toBe(initialState);
  });
});

describe("outcome through the reducer (REQ-2.5 to REQ-2.7)", () => {
  it("lane.asked with the wished pair is the right result, and any other pair is not", () => {
    // The outcome function has its own tests; this checks the state it reads is what Ask leaves.
    expect(play([...wish0, ask], started).lane.pick).toEqual(balance.wishes[0]);
    expect(play([...wrong, ask], started).lane.pick).not.toEqual(balance.wishes[0]);
  });
});

describe("reduce: retry (REQ-2.7, REQ-2.8)", () => {
  it("after a different request keeps the wish and clears the pick", () => {
    const next = play([...wrong, ask, retry], started);
    expect(next.lane).toEqual({ wish: 0, pick: { color: null, thing: null }, asked: false });
  });

  it("after the right result moves to the next wish and clears the pick", () => {
    const next = play([...wish0, ask, retry], started);
    expect(next.lane).toEqual({ wish: 1, pick: { color: null, thing: null }, asked: false });
  });

  it("cycles through the wishes and wraps to the first", () => {
    const first = play([...wish0, ask, retry], started);
    const second = play([...wish1, ask, retry], first);
    const third = play([...wish2, ask, retry], second);
    expect([first.lane.wish, second.lane.wish, third.lane.wish]).toEqual([1, 2, 0]);
  });

  it("the new wish can be solved, however many different requests came before", () => {
    const tries = [...wrong, ask, retry, ...pick("blue", "pumpkin"), ask, retry];
    const next = play([...tries, ...wish0, ask], started);
    expect(next.lane.asked).toBe(true);
    expect(next.lane.wish).toBe(0);
    expect(next.lane.pick).toEqual(balance.wishes[0]);
  });

  it("while choosing changes nothing", () => {
    const choosing = play(pick("red"), started);
    expect(reduce(choosing, retry)).toBe(choosing);
    expect(reduce(started, retry)).toBe(started);
  });

  it("does nothing on the title screen", () => {
    expect(reduce(initialState, retry)).toBe(initialState);
  });
});

describe("reduce: other events leave the lane alone", () => {
  it("SetLang and MoveHeroTo keep the pick, the wish and the search", () => {
    const asked = play([...wrong, ask], started);
    const next = play(
      [
        { type: "SetLang", lang: "ja" },
        { type: "MoveHeroTo", x: 1, y: 2 },
      ],
      asked,
    );
    expect(next.lane).toBe(asked.lane);
  });
});
