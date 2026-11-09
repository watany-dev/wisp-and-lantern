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

// The first wish as a pick: the yellow lantern.
const wish0 = pick("yellow", "lantern");
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
    expect(initialState.hero).toEqual({ x: 195, y: 612 });
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

describe("reduce: asking (REQ-2.3, REQ-3.1, REQ-3.2)", () => {
  it("searches once both cards are picked, keeping the pick as it is", () => {
    const next = play([...wrong, ask], started);
    expect(next.lane).toEqual({ wish: 0, pick: { color: "red", thing: "lantern" }, asked: true });
  });

  it.each([
    ["only a color", pick("red"), { color: "red", thing: null }],
    ["only an object", pick("pumpkin"), { color: null, thing: "pumpkin" }],
  ])(
    "with %s is a request: it searches, and does not fill in the other card",
    (_name, cards, kept) => {
      const next = reduce(play(cards, started), ask);
      expect(next.lane).toEqual({ wish: 0, pick: kept, asked: true });
    },
  );

  it("with no card is not a search and returns the same state", () => {
    expect(reduce(started, ask)).toBe(started);
  });

  it("with no card left after a retry is not a search either", () => {
    const cleared = play([...wrong, ask, retry], started);
    expect(reduce(cleared, ask)).toBe(cleared);
  });

  it("asking again changes nothing, with two cards or with one", () => {
    const twice = play([...wish0, ask], started);
    expect(reduce(twice, ask)).toBe(twice);
    const once = play([...pick("red"), ask], started);
    expect(reduce(once, ask)).toBe(once);
  });

  it("does nothing on the title screen", () => {
    expect(reduce(initialState, ask)).toBe(initialState);
  });

  it("ignores a card picked after a one-card search, until the retry", () => {
    const asked = play([...pick("red"), ask], started);
    expect(play(pick("pumpkin", "blue"), asked)).toBe(asked);
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

  it("cycles through all six wishes and wraps to the first", () => {
    let state = started;
    const seen: number[] = [];
    for (const wish of balance.wishes) {
      state = play([...pick(wish.color, wish.thing), ask, retry], state);
      seen.push(state.lane.wish);
    }
    expect(seen).toEqual([1, 2, 3, 4, 5, 0]);
  });

  it("the new wish can be solved, however many different requests came before", () => {
    const tries = [...wrong, ask, retry, ...pick("blue", "pumpkin"), ask, retry];
    const next = play([...tries, ...wish0, ask], started);
    expect(next.lane.asked).toBe(true);
    expect(next.lane.wish).toBe(0);
    expect(next.lane.pick).toEqual(balance.wishes[0]);
  });

  it("after a request with one card keeps the wish, clears the pick, and the wish can then be found (REQ-3.4)", () => {
    for (const cards of [pick("red"), pick("lantern"), pick("yellow"), pick("pumpkin")]) {
      const vague = play([...cards, ask], started);
      expect(vague.lane.asked).toBe(true);
      const again = reduce(vague, retry);
      expect(again.lane).toEqual({ wish: 0, pick: { color: null, thing: null }, asked: false });
      const found = play([...wish0, ask], again);
      expect(found.lane).toEqual({ wish: 0, pick: balance.wishes[0], asked: true });
    }
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

// A run of 60 seconds (spec 04-score-attack). `runOut` is the whole clock in one tick.
const tick = (ms: number): GameEvent => ({ type: "Tick", ms });
const runOut = tick(balance.runMs);
const find = (index: number): GameEvent[] => {
  const wish = balance.wishes[index]!;
  return [...pick(wish.color, wish.thing), ask];
};

describe("reduce: the clock (REQ-4.2)", () => {
  it("Start begins a run with a full clock, no score and no streak", () => {
    expect(started.run).toEqual({
      remainingMs: 60_000,
      score: 0,
      streak: 0,
      best: 0,
      record: false,
    });
  });

  it("Tick takes the time off the clock and changes nothing else", () => {
    const next = reduce(started, tick(1_500));
    expect(next).toEqual({ ...started, run: { ...started.run, remainingMs: 58_500 } });
    expect(next.phase).toBe("trial");
  });

  it("Tick counts while the helper is searching and after a different request", () => {
    const searching = play(find(0), started);
    expect(reduce(searching, tick(1_000)).run.remainingMs).toBe(59_000);
    expect(reduce(searching, tick(1_000)).lane).toBe(searching.lane);
  });

  it("Tick does nothing on the title screen", () => {
    expect(reduce(initialState, tick(1_000))).toBe(initialState);
  });

  it.each([0, -5, Number.NaN])("Tick with %s milliseconds changes nothing", (ms) => {
    expect(reduce(started, tick(ms))).toBe(started);
  });

  it("the run is over when the clock reaches zero, exactly or past it", () => {
    const almost = reduce(started, tick(59_999));
    expect(almost.phase).toBe("trial");
    expect(almost.run.remainingMs).toBe(1);
    const exact = reduce(almost, tick(1));
    expect(exact.phase).toBe("over");
    expect(exact.run.remainingMs).toBe(0);
    expect(reduce(started, tick(90_000)).phase).toBe("over");
  });

  it("an over run does not search, even when a card was picked as the time ran out", () => {
    const over = play([...pick("yellow", "lantern"), runOut], started);
    expect(over.phase).toBe("over");
    expect(reduce(over, ask)).toBe(over);
    expect(over.run.score).toBe(0);
  });

  it("an over run ignores time, cards, asks and retries, but still takes a language and a hero move", () => {
    const over = reduce(started, runOut);
    for (const event of [tick(1_000), ...pick("red"), ask, retry]) {
      expect(reduce(over, event)).toBe(over);
    }
    expect(reduce(over, { type: "SetLang", lang: "ja" })).toEqual({ ...over, lang: "ja" });
    expect(reduce(over, { type: "MoveHeroTo", x: 1, y: 2 }).hero).toEqual({ x: 1, y: 2 });
  });
});

describe("reduce: the score (REQ-4.3)", () => {
  it("a find scores 100 when the wisp is sent, not when the next wish comes", () => {
    const found = play(find(0), started);
    expect(found.run).toMatchObject({ score: 100, streak: 1 });
    expect(reduce(found, retry).run).toEqual(found.run);
  });

  it("finds in a row score more each time, up to 300", () => {
    let state = started;
    const scores: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      state = play([...find(i % balance.wishes.length), retry], state);
      scores.push(state.run.score);
    }
    expect(scores).toEqual([100, 250, 450, 700, 1_000, 1_300, 1_600]);
    expect(state.run.streak).toBe(7);
  });

  it("a different request scores nothing and ends the streak", () => {
    const after = play([...find(0), retry, ...wrong, ask], started);
    expect(after.run).toMatchObject({ score: 100, streak: 0 });
  });

  it("a request with one card scores nothing and ends the streak", () => {
    const after = play([...find(0), retry, ...pick("red"), ask], started);
    expect(after.run).toMatchObject({ score: 100, streak: 0 });
  });

  it("the streak starts again from 100 after a miss", () => {
    const after = play([...find(0), retry, ...wrong, ask, retry, ...find(1)], started);
    expect(after.run).toMatchObject({ score: 200, streak: 1 });
  });

  it("asking with no card, or twice, scores nothing", () => {
    expect(reduce(started, ask).run).toBe(started.run);
    const found = play(find(0), started);
    expect(reduce(found, ask)).toBe(found);
  });

  it("picking a card or retrying never scores", () => {
    const picked = play(pick("yellow", "lantern"), started);
    expect(picked.run).toBe(started.run);
    const missed = play([...wrong, ask], started);
    expect(reduce(missed, retry).run).toBe(missed.run);
  });
});

describe("reduce: the end of a run (REQ-4.5, REQ-4.6)", () => {
  it("keeps the score, the lane and the language, and records the best", () => {
    const playing = play([...find(0), retry, ...find(1)], started);
    const over = reduce(playing, runOut);
    expect(over.run).toMatchObject({ score: 250, best: 250, record: true, remainingMs: 0 });
    expect(over.lane).toBe(playing.lane);
    expect(over.lang).toBe(playing.lang);
  });

  it("Start on the end screen begins a fresh run: full clock, no score, the first wish", () => {
    const over = play([...find(0), retry, ...find(1), runOut], started);
    const again = reduce({ ...over, lang: "ja" }, { type: "Start" });
    expect(again.phase).toBe("trial");
    expect(again.trial).toBe(1);
    expect(again.lang).toBe("ja");
    expect(again.lane).toEqual(initialState.lane);
    expect(again.run).toEqual({
      remainingMs: 60_000,
      score: 0,
      streak: 0,
      best: 250,
      record: false,
    });
  });

  it("Start on the end screen can set the language", () => {
    const over = reduce(started, runOut);
    expect(reduce(over, { type: "Start", lang: "ja" }).lang).toBe("ja");
  });

  it("the best is the highest of the runs, and only a higher score is a record", () => {
    const first = play([...find(0), retry, ...find(1), runOut], started);
    const second = play([{ type: "Start" }, ...find(0), runOut], first);
    expect(second.run).toMatchObject({ score: 100, best: 250, record: false });
    const third = play(
      [{ type: "Start" }, ...find(0), retry, ...find(1), retry, ...find(2), runOut],
      second,
    );
    expect(third.run).toMatchObject({ score: 450, best: 450, record: true });
  });

  it("a run that scored nothing is not a record", () => {
    expect(reduce(started, runOut).run).toMatchObject({ score: 0, best: 0, record: false });
  });
});

// Trial 2 (spec 05-trial-grant-tools): the shed opens from the title and has its own events.
const enterShed: GameEvent = { type: "StartShed" };
const pickTool = (tool: "key" | "broom" | "hammer"): GameEvent => ({ type: "PickTool", tool });
const giveTool: GameEvent = { type: "GiveTool" };
const retryShed: GameEvent = { type: "RetryShed" };
const inShed = play([enterShed]);

describe("reduce: opening the shed (REQ-5.1, REQ-5.9)", () => {
  it("StartShed on the title opens trial 2 and starts no run", () => {
    expect(inShed.phase).toBe("trial");
    expect(inShed.trial).toBe(2);
    expect(inShed.shed).toEqual({ stage: "choosing", pick: null });
    // The clock stays full, nothing is scored, and the lane is untouched.
    expect(inShed.run).toBe(initialState.run);
    expect(inShed.lane).toBe(initialState.lane);
    expect(inShed.lang).toBe(initialState.lang);
  });

  it("StartShed keeps the language and the hero where they were", () => {
    const before = play([
      { type: "SetLang", lang: "ja" },
      { type: "MoveHeroTo", x: 5, y: 6 },
    ]);
    expect(reduce(before, enterShed)).toEqual({ ...before, phase: "trial", trial: 2 });
  });

  it("StartShed is ignored in trial 1, in the shed and on the end screen", () => {
    expect(reduce(started, enterShed)).toBe(started);
    expect(reduce(inShed, enterShed)).toBe(inShed);
    const over = reduce(started, tick(balance.runMs));
    expect(over.phase).toBe("over");
    expect(reduce(over, enterShed)).toBe(over);
  });

  it("Start in the shed sets the language only: it never leaves the shed or starts a run", () => {
    const midway = play([pickTool("broom"), giveTool], inShed);
    expect(reduce(midway, { type: "Start" })).toEqual(midway);
    expect(reduce(midway, { type: "Start", lang: "ja" })).toEqual({ ...midway, lang: "ja" });
  });

  it("SetLang and MoveHeroTo keep the pick and the result", () => {
    const midway = play([pickTool("hammer"), giveTool], inShed);
    const next = play(
      [
        { type: "SetLang", lang: "ja" },
        { type: "MoveHeroTo", x: 1, y: 2 },
      ],
      midway,
    );
    expect(next.shed).toBe(midway.shed);
  });
});

describe("reduce: the shed events (REQ-5.3 to REQ-5.7)", () => {
  it("picks a tool, replaces it, and does not hand it over", () => {
    const next = play([pickTool("key"), pickTool("broom")], inShed);
    expect(next.shed).toEqual({ stage: "choosing", pick: "broom" });
  });

  it("hands over exactly the picked tool and only then tries it", () => {
    expect(play([pickTool("hammer")], inShed).shed.stage).toBe("choosing");
    expect(play([pickTool("hammer"), giveTool], inShed).shed).toEqual({
      stage: "tried",
      tool: "hammer",
    });
  });

  it("a hand-over with nothing picked returns the same state", () => {
    expect(reduce(inShed, giveTool)).toBe(inShed);
  });

  it("locks the pick and the hand-over while a result shows", () => {
    const done = play([pickTool("broom"), giveTool], inShed);
    expect(reduce(done, pickTool("key"))).toBe(done);
    expect(reduce(done, giveTool)).toBe(done);
  });

  it("the retry returns to a fresh choosing and changes nothing else", () => {
    const done = play([pickTool("broom"), giveTool], inShed);
    expect(reduce(done, retryShed)).toEqual(inShed);
    expect(reduce(inShed, retryShed)).toBe(inShed);
  });

  it("the key opens the door after any number of other tools, and again after a success", () => {
    let state = inShed;
    for (const tool of ["broom", "hammer", "broom", "hammer"] as const) {
      state = play([pickTool(tool), giveTool, retryShed], state);
    }
    const open = play([pickTool("key"), giveTool], state);
    expect(open.shed).toEqual({ stage: "tried", tool: "key" });
    const again = play([retryShed, pickTool("key"), giveTool], open);
    expect(again.shed).toEqual(open.shed);
  });

  it("does nothing outside the shed: on the title, in trial 1 and on the end screen", () => {
    const over = reduce(started, tick(balance.runMs));
    for (const state of [initialState, started, over]) {
      for (const event of [pickTool("key"), giveTool, retryShed]) {
        expect(reduce(state, event)).toBe(state);
      }
    }
  });
});

describe("reduce: trial 1 events and the clock leave the shed alone (REQ-5.7, REQ-5.9)", () => {
  const trialOneEvents: GameEvent[] = [
    ...pick("red", "lantern"),
    ask,
    retry,
    tick(1_000),
    tick(balance.runMs),
  ];

  it("changes nothing in the shed, whatever is picked or tried", () => {
    const states = [
      inShed,
      play([pickTool("key")], inShed),
      play([pickTool("key"), giveTool], inShed),
      play([pickTool("broom"), giveTool], inShed),
    ];
    for (const state of states) {
      for (const event of trialOneEvents) expect(reduce(state, event)).toBe(state);
    }
  });

  it("the clock never runs in the shed: no time up, no score", () => {
    const later = play(trialOneEvents, inShed);
    expect(later.phase).toBe("trial");
    expect(later.run).toBe(initialState.run);
    expect(later.run.remainingMs).toBe(balance.runMs);
    expect(later.run.score).toBe(0);
  });
});
