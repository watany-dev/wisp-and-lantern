// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { beforeEach, describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import { newCrown, slipAt, toolFor, wishAt, type Thing } from "../crown";
import type { GameEvent } from "../events";
import { fakesOf } from "../field";
import { broughtAt, cardsOf, newLantern, type LookId } from "../lantern";
import { reduce } from "../reducer";
import { initialState, type GameState } from "../state";
import type { ToolId } from "../shed";

const play = (events: GameEvent[], from: GameState = initialState) => events.reduce(reduce, from);

/**
 * A state the tests share, built the first time a test asks for it and again in the next test. It is never built
 * when the file loads, so every reducer path it takes runs inside a test: Stryker can then tell which tests cover a
 * mutant instead of running them all for it (ADR 0005). Inside one test it is the same object, so `toBe` holds.
 */
const built: (() => void)[] = [];
beforeEach(() => {
  for (const reset of built) reset();
});
function fixture(make: () => GameState): () => GameState {
  let value: GameState | undefined;
  built.push(() => (value = undefined));
  return () => (value ??= make());
}
const started = fixture(() => play([{ type: "Start" }]));
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
    const midway = play([...wish0, ask], started());
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
    expect(play(pick("blue"), started()).lane.pick).toEqual({ color: "blue", thing: null });
    expect(play(pick("lantern"), started()).lane.pick).toEqual({ color: null, thing: "lantern" });
    expect(play(pick("blue", "lantern"), started()).lane.pick).toEqual({
      color: "blue",
      thing: "lantern",
    });
  });

  it("replaces the card in the same row and keeps the other row", () => {
    const next = play(pick("red", "pumpkin", "yellow", "lantern"), started());
    expect(next.lane.pick).toEqual({ color: "yellow", thing: "lantern" });
  });

  it("picking the same card twice keeps it", () => {
    expect(play(pick("red", "red"), started()).lane.pick).toEqual({ color: "red", thing: null });
  });

  it("never starts a search", () => {
    expect(play(wish0, started()).lane.asked).toBe(false);
  });

  it("is ignored on the title screen", () => {
    expect(reduce(initialState, { type: "PickCard", card: "red" })).toBe(initialState);
  });

  it("is ignored after the helper has searched, until the retry", () => {
    const asked = play([...wrong, ask], started());
    expect(play(pick("blue", "pumpkin"), asked)).toBe(asked);
  });
});

describe("reduce: asking (REQ-2.3, REQ-3.1, REQ-3.2)", () => {
  it("searches once both cards are picked, keeping the pick as it is", () => {
    const next = play([...wrong, ask], started());
    expect(next.lane).toEqual({ wish: 0, pick: { color: "red", thing: "lantern" }, asked: true });
  });

  it.each([
    ["only a color", pick("red"), { color: "red", thing: null }],
    ["only an object", pick("pumpkin"), { color: null, thing: "pumpkin" }],
  ])(
    "with %s is a request: it searches, and does not fill in the other card",
    (_name, cards, wanted) => {
      const next = reduce(play(cards, started()), ask);
      expect(next.lane).toEqual({ wish: 0, pick: wanted, asked: true });
    },
  );

  it("with no card is not a search and returns the same state", () => {
    expect(reduce(started(), ask)).toBe(started());
  });

  it("with no card left after a retry is not a search either", () => {
    const cleared = play([...wrong, ask, retry], started());
    expect(reduce(cleared, ask)).toBe(cleared);
  });

  it("asking again changes nothing, with two cards or with one", () => {
    const twice = play([...wish0, ask], started());
    expect(reduce(twice, ask)).toBe(twice);
    const once = play([...pick("red"), ask], started());
    expect(reduce(once, ask)).toBe(once);
  });

  it("does nothing on the title screen", () => {
    expect(reduce(initialState, ask)).toBe(initialState);
  });

  it("ignores a card picked after a one-card search, until the retry", () => {
    const asked = play([...pick("red"), ask], started());
    expect(play(pick("pumpkin", "blue"), asked)).toBe(asked);
  });
});

describe("outcome through the reducer (REQ-2.5 to REQ-2.7)", () => {
  it("lane.asked with the wished pair is the right result, and any other pair is not", () => {
    // The outcome function has its own tests; this checks the state it reads is what Ask leaves.
    expect(play([...wish0, ask], started()).lane.pick).toEqual(balance.wishes[0]);
    expect(play([...wrong, ask], started()).lane.pick).not.toEqual(balance.wishes[0]);
  });
});

describe("reduce: retry (REQ-2.7, REQ-2.8)", () => {
  it("after a different request keeps the wish and clears the pick", () => {
    const next = play([...wrong, ask, retry], started());
    expect(next.lane).toEqual({ wish: 0, pick: { color: null, thing: null }, asked: false });
  });

  it("after the right result moves to the next wish and clears the pick", () => {
    const next = play([...wish0, ask, retry], started());
    expect(next.lane).toEqual({ wish: 1, pick: { color: null, thing: null }, asked: false });
  });

  it("cycles through all six wishes and wraps to the first", () => {
    let state = started();
    const seen: number[] = [];
    for (const wish of balance.wishes) {
      state = play([...pick(wish.color, wish.thing), ask, retry], state);
      seen.push(state.lane.wish);
    }
    expect(seen).toEqual([1, 2, 3, 4, 5, 0]);
  });

  it("the new wish can be solved, however many different requests came before", () => {
    const tries = [...wrong, ask, retry, ...pick("blue", "pumpkin"), ask, retry];
    const next = play([...tries, ...wish0, ask], started());
    expect(next.lane.asked).toBe(true);
    expect(next.lane.wish).toBe(0);
    expect(next.lane.pick).toEqual(balance.wishes[0]);
  });

  it("after a request with one card keeps the wish, clears the pick, and the wish can then be found (REQ-3.4)", () => {
    for (const cards of [pick("red"), pick("lantern"), pick("yellow"), pick("pumpkin")]) {
      const vague = play([...cards, ask], started());
      expect(vague.lane.asked).toBe(true);
      const again = reduce(vague, retry);
      expect(again.lane).toEqual({ wish: 0, pick: { color: null, thing: null }, asked: false });
      const found = play([...wish0, ask], again);
      expect(found.lane).toEqual({ wish: 0, pick: balance.wishes[0], asked: true });
    }
  });

  it("while choosing changes nothing", () => {
    const choosing = play(pick("red"), started());
    expect(reduce(choosing, retry)).toBe(choosing);
    expect(reduce(started(), retry)).toBe(started());
  });

  it("does nothing on the title screen", () => {
    expect(reduce(initialState, retry)).toBe(initialState);
  });
});

describe("reduce: other events leave the lane alone", () => {
  it("SetLang and MoveHeroTo keep the pick, the wish and the search", () => {
    const asked = play([...wrong, ask], started());
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
    expect(started().run).toEqual({
      remainingMs: 60_000,
      score: 0,
      streak: 0,
      best: 0,
      record: false,
    });
  });

  it("Tick takes the time off the clock and changes nothing else", () => {
    const next = reduce(started(), tick(1_500));
    expect(next).toEqual({ ...started(), run: { ...started().run, remainingMs: 58_500 } });
    expect(next.phase).toBe("trial");
  });

  it("Tick counts while the helper is searching and after a different request", () => {
    const searching = play(find(0), started());
    expect(reduce(searching, tick(1_000)).run.remainingMs).toBe(59_000);
    expect(reduce(searching, tick(1_000)).lane).toBe(searching.lane);
  });

  it("Tick does nothing on the title screen", () => {
    expect(reduce(initialState, tick(1_000))).toBe(initialState);
  });

  it.each([0, -5, Number.NaN])("Tick with %s milliseconds changes nothing", (ms) => {
    expect(reduce(started(), tick(ms))).toBe(started());
  });

  it("the run is over when the clock reaches zero, exactly or past it", () => {
    const almost = reduce(started(), tick(59_999));
    expect(almost.phase).toBe("trial");
    expect(almost.run.remainingMs).toBe(1);
    const exact = reduce(almost, tick(1));
    expect(exact.phase).toBe("over");
    expect(exact.run.remainingMs).toBe(0);
    expect(reduce(started(), tick(90_000)).phase).toBe("over");
  });

  it("an over run does not search, even when a card was picked as the time ran out", () => {
    const over = play([...pick("yellow", "lantern"), runOut], started());
    expect(over.phase).toBe("over");
    expect(reduce(over, ask)).toBe(over);
    expect(over.run.score).toBe(0);
  });

  it("an over run ignores time, cards, asks and retries, but still takes a language and a hero move", () => {
    const over = reduce(started(), runOut);
    for (const event of [tick(1_000), ...pick("red"), ask, retry]) {
      expect(reduce(over, event)).toBe(over);
    }
    expect(reduce(over, { type: "SetLang", lang: "ja" })).toEqual({ ...over, lang: "ja" });
    expect(reduce(over, { type: "MoveHeroTo", x: 1, y: 2 }).hero).toEqual({ x: 1, y: 2 });
  });
});

describe("reduce: the score (REQ-4.3)", () => {
  it("a find scores 100 when the wisp is sent, not when the next wish comes", () => {
    const found = play(find(0), started());
    expect(found.run).toMatchObject({ score: 100, streak: 1 });
    expect(reduce(found, retry).run).toEqual(found.run);
  });

  it("finds in a row score more each time, up to 300", () => {
    let state = started();
    const scores: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      state = play([...find(i % balance.wishes.length), retry], state);
      scores.push(state.run.score);
    }
    expect(scores).toEqual([100, 250, 450, 700, 1_000, 1_300, 1_600]);
    expect(state.run.streak).toBe(7);
  });

  it("a different request scores nothing and ends the streak", () => {
    const after = play([...find(0), retry, ...wrong, ask], started());
    expect(after.run).toMatchObject({ score: 100, streak: 0 });
  });

  it("a request with one card scores nothing and ends the streak", () => {
    const after = play([...find(0), retry, ...pick("red"), ask], started());
    expect(after.run).toMatchObject({ score: 100, streak: 0 });
  });

  it("the streak starts again from 100 after a miss", () => {
    const after = play([...find(0), retry, ...wrong, ask, retry, ...find(1)], started());
    expect(after.run).toMatchObject({ score: 200, streak: 1 });
  });

  it("asking with no card, or twice, scores nothing", () => {
    expect(reduce(started(), ask).run).toBe(started().run);
    const found = play(find(0), started());
    expect(reduce(found, ask)).toBe(found);
  });

  it("picking a card or retrying never scores", () => {
    const picked = play(pick("yellow", "lantern"), started());
    expect(picked.run).toBe(started().run);
    const missed = play([...wrong, ask], started());
    expect(reduce(missed, retry).run).toBe(missed.run);
  });
});

describe("reduce: the end of a run (REQ-4.5, REQ-4.6)", () => {
  it("keeps the score, the lane and the language, and records the best", () => {
    const playing = play([...find(0), retry, ...find(1)], started());
    const over = reduce(playing, runOut);
    expect(over.run).toMatchObject({ score: 250, best: 250, record: true, remainingMs: 0 });
    expect(over.lane).toBe(playing.lane);
    expect(over.lang).toBe(playing.lang);
  });

  it("Start on the end screen begins a fresh run: full clock, no score, the first wish", () => {
    const over = play([...find(0), retry, ...find(1), runOut], started());
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
    const over = reduce(started(), runOut);
    expect(reduce(over, { type: "Start", lang: "ja" }).lang).toBe("ja");
  });

  it("the best is the highest of the runs, and only a higher score is a record", () => {
    const first = play([...find(0), retry, ...find(1), runOut], started());
    const second = play([{ type: "Start" }, ...find(0), runOut], first);
    expect(second.run).toMatchObject({ score: 100, best: 250, record: false });
    const third = play(
      [{ type: "Start" }, ...find(0), retry, ...find(1), retry, ...find(2), runOut],
      second,
    );
    expect(third.run).toMatchObject({ score: 450, best: 450, record: true });
  });

  it("a run that scored nothing is not a record", () => {
    expect(reduce(started(), runOut).run).toMatchObject({ score: 0, best: 0, record: false });
  });
});

// Trial 2 (spec 05-trial-grant-tools, revision 2): the shed is a 60-second time attack. It opens from the
// title, has its own events, its own clock and score (the `Run` of trial 1), and a way back to the title.
const enterShed: GameEvent = { type: "StartShed" };
const pickTool = (tool: ToolId): GameEvent => ({ type: "PickTool", tool });
const giveTool: GameEvent = { type: "GiveTool" };
const retryShed: GameEvent = { type: "RetryShed" };
const leaveShed: GameEvent = { type: "LeaveShed" };
const inShed = fixture(() => play([enterShed]));
// With no seed the order is the fixed one: the lock (key), leaves (broom), boards (hammer), rope
// (scissors), roof (ladder). `solve` hands the answer of the current round over, then moves on.
const answers: ToolId[] = ["key", "broom", "hammer", "scissors", "ladder"];
const solve = (round: number): GameEvent[] => [pickTool(answers[round % 5]!), giveTool];
const shedOver = fixture(() => reduce(inShed(), tick(balance.runMs)));

describe("reduce: opening the shed (REQ-5.1, REQ-5.9)", () => {
  it("StartShed on the title opens trial 2 and starts a 60-second run", () => {
    expect(inShed().phase).toBe("trial");
    expect(inShed().trial).toBe(2);
    expect(inShed().shed).toEqual({ stage: "choosing", seed: 0, round: 0, pick: null });
    expect(inShed().run).toEqual({
      remainingMs: 60_000,
      score: 0,
      streak: 0,
      best: 0,
      record: false,
    });
    expect(inShed().lane).toBe(initialState.lane);
    expect(inShed().lang).toBe(initialState.lang);
  });

  it("StartShed takes the seed of the order of the puzzles, as a whole number", () => {
    expect(reduce(initialState, { type: "StartShed", seed: 7 }).shed.seed).toBe(7);
    expect(reduce(initialState, { type: "StartShed", seed: 2 ** 32 + 3 }).shed.seed).toBe(3);
  });

  it("StartShed keeps the language and the hero where they were", () => {
    const before = play([
      { type: "SetLang", lang: "ja" },
      { type: "MoveHeroTo", x: 5, y: 6 },
    ]);
    expect(reduce(before, enterShed)).toEqual({
      ...before,
      phase: "trial",
      trial: 2,
      run: inShed().run,
    });
  });

  it("StartShed is ignored in trial 1, in the shed and on trial 1's end screen", () => {
    expect(reduce(started(), enterShed)).toBe(started());
    expect(reduce(inShed(), enterShed)).toBe(inShed());
    const over = reduce(started(), tick(balance.runMs));
    expect(over.phase).toBe("over");
    expect(reduce(over, enterShed)).toBe(over);
  });

  it("StartShed on the shed's end screen plays again: a full clock, a score of 0, round 0, the best kept", () => {
    const scored = play([...solve(0), tick(balance.runMs)], inShed());
    expect(scored.phase).toBe("over");
    expect(scored.run).toMatchObject({ score: 100, best: 100, record: true });
    const again = reduce(scored, { type: "StartShed", seed: 5 });
    expect(again).toEqual({
      ...scored,
      phase: "trial",
      shed: { stage: "choosing", seed: 5, round: 0, pick: null },
      run: { remainingMs: 60_000, score: 0, streak: 0, best: 100, record: false },
    });
  });

  it("Start in the shed sets the language only: it never leaves the shed or starts trial 1", () => {
    const midway = play([pickTool("broom"), giveTool], inShed());
    expect(reduce(midway, { type: "Start" })).toEqual(midway);
    expect(reduce(midway, { type: "Start", lang: "ja" })).toEqual({ ...midway, lang: "ja" });
  });

  it("Start on the shed's end screen begins trial 1, and the shed is initial again", () => {
    const next = reduce(shedOver(), { type: "Start" });
    expect(next).toMatchObject({ phase: "trial", trial: 1 });
    expect(next.shed).toBe(initialState.shed);
    expect(next.run.remainingMs).toBe(balance.runMs);
  });

  it("SetLang and MoveHeroTo keep the pick and the result", () => {
    const midway = play([pickTool("hammer"), giveTool], inShed());
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
    const next = play([pickTool("key"), pickTool("ladder")], inShed());
    expect(next.shed).toEqual({ stage: "choosing", seed: 0, round: 0, pick: "ladder" });
    expect(next.run).toBe(inShed().run);
  });

  it("hands over exactly the picked tool and only then tries it", () => {
    expect(play([pickTool("hammer")], inShed()).shed.stage).toBe("choosing");
    expect(play([pickTool("hammer"), giveTool], inShed()).shed).toEqual({
      stage: "tried",
      seed: 0,
      round: 0,
      tool: "hammer",
    });
  });

  it("a hand-over with nothing picked returns the same state", () => {
    expect(reduce(inShed(), giveTool)).toBe(inShed());
  });

  it("locks the pick and the hand-over while a result shows", () => {
    const done = play([pickTool("broom"), giveTool], inShed());
    expect(reduce(done, pickTool("key"))).toBe(done);
    expect(reduce(done, giveTool)).toBe(done);
  });

  it("the retry after a stuck result is the same puzzle with nothing picked", () => {
    const done = play([pickTool("broom"), giveTool], inShed());
    expect(reduce(done, retryShed)).toEqual({ ...done, shed: inShed().shed, run: done.run });
    expect(reduce(inShed(), retryShed)).toBe(inShed());
  });

  it("the retry after a freed cat is the next round", () => {
    const done = play(solve(0), inShed());
    expect(reduce(done, retryShed).shed).toEqual({
      stage: "choosing",
      seed: 0,
      round: 1,
      pick: null,
    });
  });

  it("does nothing outside the shed: on the title, in trial 1 and on trial 1's end screen", () => {
    const over = reduce(started(), tick(balance.runMs));
    for (const state of [initialState, started(), over]) {
      for (const event of [pickTool("key"), giveTool, retryShed, leaveShed]) {
        expect(reduce(state, event)).toBe(state);
      }
    }
  });

  it("does nothing on the shed's end screen but play again and leave", () => {
    for (const event of [
      pickTool("key"),
      giveTool,
      retryShed,
      ...pick("red"),
      ask,
      retry,
      tick(1_000),
    ]) {
      expect(reduce(shedOver(), event)).toBe(shedOver());
    }
  });
});

describe("reduce: the shed's clock and score (REQ-5.7)", () => {
  it("Tick takes the time off the clock and changes nothing else", () => {
    const next = reduce(inShed(), tick(1_500));
    expect(next).toEqual({ ...inShed(), run: { ...inShed().run, remainingMs: 58_500 } });
  });

  it.each([0, -5, Number.NaN])("Tick with %s milliseconds changes nothing", (ms) => {
    expect(reduce(inShed(), tick(ms))).toBe(inShed());
  });

  it("the clock runs while a tool is picked and while a result shows", () => {
    const picked = play([pickTool("key")], inShed());
    const shown = play([pickTool("broom"), giveTool], inShed());
    expect(reduce(picked, tick(1_000)).run.remainingMs).toBe(59_000);
    expect(reduce(shown, tick(1_000)).run.remainingMs).toBe(59_000);
    expect(reduce(shown, tick(1_000)).shed).toBe(shown.shed);
  });

  it("the run is over at zero, exactly or past it, in the state the child left the shed", () => {
    const almost = reduce(inShed(), tick(59_999));
    expect(almost.phase).toBe("trial");
    const midway = play([pickTool("broom"), giveTool], inShed());
    const over = reduce(midway, runOut);
    expect(over).toMatchObject({ phase: "over", trial: 2, shed: midway.shed });
    expect(over.run.remainingMs).toBe(0);
    expect(reduce(almost, tick(1)).phase).toBe("over");
  });

  it("a tool that frees the cat scores 100, and the streak adds 50 for each find in a row up to 4", () => {
    let state = inShed();
    const scores: number[] = [];
    for (let round = 0; round < 7; round += 1) {
      state = play([...solve(round), retryShed], state);
      scores.push(state.run.score);
    }
    expect(scores).toEqual([100, 250, 450, 700, 1000, 1300, 1600]);
    expect(state.run.streak).toBe(7);
  });

  it("any other tool scores nothing and ends the streak; it takes nothing away", () => {
    const one = play([...solve(0), retryShed], inShed());
    expect(one.run).toMatchObject({ score: 100, streak: 1 });
    const missed = play([pickTool("hammer"), giveTool], one);
    expect(missed.run).toMatchObject({ score: 100, streak: 0 });
    const back = play([retryShed, ...solve(1)], missed);
    expect(back.run).toMatchObject({ score: 200, streak: 1 });
  });

  it("scores once, when the tool is handed over: picking, retrying and a second hand-over do not", () => {
    const picked = play([pickTool("key")], inShed());
    expect(picked.run.score).toBe(0);
    const freed = reduce(picked, giveTool);
    expect(freed.run.score).toBe(100);
    expect(reduce(freed, giveTool).run.score).toBe(100);
    expect(reduce(freed, retryShed).run.score).toBe(100);
    expect(reduce(freed, pickTool("broom")).run.score).toBe(100);
  });

  it("keeps the best score and says a better run is a record", () => {
    const first = reduce(play(solve(0), inShed()), runOut);
    expect(first.run).toMatchObject({ score: 100, best: 100, record: true });
    const second = reduce(reduce(first, { type: "StartShed" }), runOut);
    expect(second.run).toMatchObject({ score: 0, best: 100, record: false });
  });
});

describe("reduce: the way back to the title (REQ-5.16)", () => {
  it("LeaveShed in a run goes to the title and drops the shed and the run in progress", () => {
    const midway = play([...solve(0), retryShed, pickTool("key"), tick(1_000)], inShed());
    const left = reduce(midway, leaveShed);
    expect(left).toEqual({
      ...midway,
      phase: "title",
      trial: 0,
      shed: initialState.shed,
      run: { remainingMs: 60_000, score: 0, streak: 0, best: 0, record: false },
    });
  });

  it("LeaveShed on the end screen goes to the title and keeps the best score of the session", () => {
    const scored = reduce(play(solve(0), inShed()), runOut);
    const away = reduce(scored, leaveShed);
    expect(away).toMatchObject({ phase: "title", trial: 0 });
    expect(away.run).toEqual({
      remainingMs: 60_000,
      score: 0,
      streak: 0,
      best: 100,
      record: false,
    });
    expect(away.shed).toBe(initialState.shed);
  });

  it("keeps the language and the hero, and the title opens the shed or trial 1 again", () => {
    const set = play([
      enterShed,
      { type: "SetLang", lang: "ja" },
      { type: "MoveHeroTo", x: 9, y: 8 },
    ]);
    const left = reduce(set, leaveShed);
    expect(left).toMatchObject({ lang: "ja", hero: { x: 9, y: 8 } });
    expect(reduce(left, enterShed).trial).toBe(2);
    expect(reduce(left, { type: "Start" }).trial).toBe(1);
  });

  it("LeaveShed on the title returns the same state", () => {
    expect(reduce(initialState, leaveShed)).toBe(initialState);
  });
});

describe("reduce: trial 1 events leave the shed alone (REQ-5.9)", () => {
  const trialOneEvents: GameEvent[] = [...pick("red", "lantern"), ask, retry];

  it("changes nothing in the shed, whatever is picked or tried", () => {
    const states = [
      inShed(),
      play([pickTool("key")], inShed()),
      play([pickTool("key"), giveTool], inShed()),
      play([pickTool("broom"), giveTool], inShed()),
    ];
    for (const state of states) {
      for (const event of trialOneEvents) expect(reduce(state, event)).toBe(state);
    }
  });
});

// Trial 3 (spec 06-trial-verify-stars, revision 3): the field opens from the title, is a 60-second run,
// and has its own events.
const enterField: GameEvent = { type: "StartField", seed: 0 };
const inspectStar = (index: number): GameEvent => ({ type: "InspectStar", index });
const sortAs = (verdict: "real" | "fake"): GameEvent => ({ type: "SortStar", verdict });
const keepStars: GameEvent = { type: "KeepStars" };
const retryField: GameEvent = { type: "RetryField" };
const leaveField: GameEvent = { type: "LeaveField" };
const inField = fixture(() => play([enterField]));
const fullRun = { remainingMs: 60_000, score: 0, streak: 0, best: 0, record: false };

/** The events that sort every unsorted star of the round the right way: look, then the true verdict. */
function sortAll(state: GameState): GameEvent[] {
  return [0, 1, 2, 3, 4].flatMap((i): GameEvent[] => [
    inspectStar(i),
    sortAs(fakesOf(state.field.seed, state.field.round).includes(i) ? "fake" : "real"),
  ]);
}
const sorted = fixture(() => play(sortAll(inField()), inField()));
const kept = fixture(() => play([keepStars], sorted()));
const secondRound = fixture(() => play([retryField], kept()));
const fieldOver = fixture(() => reduce(sorted(), runOut));

describe("reduce: opening the field (REQ-6.1, REQ-6.8)", () => {
  it("StartField on the title opens trial 3 with round 0 for the seed and begins a 60-second run", () => {
    expect(inField().phase).toBe("trial");
    expect(inField().trial).toBe(3);
    expect(inField().field).toEqual({ ...initialState.field, seed: 0 });
    expect(reduce(initialState, { type: "StartField", seed: 7 }).field).toEqual({
      ...initialState.field,
      seed: 7,
    });
    // A full clock, a score of 0 and no streak; the lane and the shed are untouched.
    expect(inField().run).toEqual(fullRun);
    expect(inField().lane).toBe(initialState.lane);
    expect(inField().shed).toBe(initialState.shed);
    expect(inField().lang).toBe(initialState.lang);
  });

  it("the seed is a whole number: a negative or fractional seed gives the same rounds every time", () => {
    const odd = reduce(initialState, { type: "StartField", seed: -1 });
    expect(odd.field.seed).toBe(4_294_967_295);
    expect(reduce(initialState, { type: "StartField", seed: 1.9 }).field.seed).toBe(1);
  });

  it("StartField keeps the language and the hero where they were", () => {
    const before = play([
      { type: "SetLang", lang: "ja" },
      { type: "MoveHeroTo", x: 5, y: 6 },
    ]);
    expect(reduce(before, enterField)).toEqual({
      ...before,
      phase: "trial",
      trial: 3,
      run: fullRun,
    });
  });

  it("StartField keeps only the best score of the session", () => {
    const first = reduce(play(sortAll(inField()).slice(0, 2), inField()), runOut);
    expect(first.run).toMatchObject({ score: 100, best: 100, record: true });
    const again = reduce(reduce(first, leaveField), enterField);
    expect(again.run).toEqual({ ...fullRun, best: 100 });
  });

  it("StartField is ignored in trial 1, in the shed and in a run of the field", () => {
    expect(reduce(started(), enterField)).toBe(started());
    expect(reduce(inShed(), enterField)).toBe(inShed());
    expect(reduce(inField(), enterField)).toBe(inField());
  });

  it("StartField on the end screen of trial 1 or of the shed is ignored", () => {
    const over = reduce(started(), runOut);
    expect(over.phase).toBe("over");
    expect(reduce(over, enterField)).toBe(over);
    expect(reduce(shedOver(), enterField)).toBe(shedOver());
  });

  it("StartField on the field's own end screen plays again: round 0 of the new seed, a full clock, a score of 0, the best kept", () => {
    expect(fieldOver().phase).toBe("over");
    const again = reduce(fieldOver(), { type: "StartField", seed: 5 });
    expect(again).toEqual({
      ...fieldOver(),
      phase: "trial",
      trial: 3,
      field: { ...initialState.field, seed: 5 },
      run: { ...fullRun, best: fieldOver().run.best },
    });
    expect(fieldOver().run.best).toBeGreaterThan(0);
  });
});

describe("reduce: the field and the other entrances (REQ-6.1, REQ-6.8)", () => {
  it("StartShed is ignored in the field, so one entrance never opens the other", () => {
    expect(reduce(inField(), enterShed)).toBe(inField());
    expect(reduce(fieldOver(), enterShed)).toBe(fieldOver());
    expect(reduce(inShed(), enterField)).toBe(inShed());
  });

  it("Start in a run of the field sets the language only: it never leaves the field or starts trial 1", () => {
    const midway = play([inspectStar(0)], inField());
    expect(reduce(midway, { type: "Start" })).toEqual(midway);
    expect(reduce(midway, { type: "Start", lang: "ja" })).toEqual({ ...midway, lang: "ja" });
  });

  it("Start on the field's end screen begins trial 1 and drops the field", () => {
    const next = reduce(fieldOver(), { type: "Start" });
    expect(next).toMatchObject({ phase: "trial", trial: 1 });
    expect(next.field).toBe(initialState.field);
    expect(next.run).toEqual({ ...fullRun, best: fieldOver().run.best });
  });

  it("SetLang and MoveHeroTo keep what the child sorted and the result", () => {
    for (const before of [play([inspectStar(0)], inField()), kept(), fieldOver()]) {
      const next = play(
        [
          { type: "SetLang", lang: "ja" },
          { type: "MoveHeroTo", x: 1, y: 2 },
        ],
        before,
      );
      expect(next.field).toBe(before.field);
      expect(next.run).toBe(before.run);
    }
  });
});

describe("reduce: the field events (REQ-6.3 to REQ-6.7)", () => {
  it("InspectStar only looks: no star is sorted until the child gives a verdict", () => {
    const next = play([inspectStar(3)], inField());
    expect(next.field).toMatchObject({ stage: "sorting", looking: 3, note: null });
    expect(next.run).toBe(inField().run);
    expect(play([0, 1, 2, 3, 4].map(inspectStar), inField()).field).toMatchObject({
      sorted: [false, false, false, false, false],
    });
  });

  it("SortStar with a star in the lens sorts it only with the right verdict", () => {
    // Seed 0, round 0: star 4 is the fake one.
    const looking = play([inspectStar(4)], inField());
    const calledReal = reduce(looking, sortAs("real"));
    expect(calledReal.field).toMatchObject({
      sorted: [false, false, false, false, false],
      looking: null,
      note: { star: 4, said: "real" },
    });
    const right = reduce(looking, sortAs("fake"));
    expect(right.field).toMatchObject({
      sorted: [false, false, false, false, true],
      looking: null,
      note: { star: 4, said: "fake" },
    });
  });

  it("SortStar with no star in the lens, and InspectStar on a bad or sorted star, change nothing", () => {
    expect(reduce(inField(), sortAs("real"))).toBe(inField());
    expect(reduce(inField(), inspectStar(5))).toBe(inField());
    const looking = play([inspectStar(1)], inField());
    expect(reduce(looking, inspectStar(1))).toBe(looking);
    const one = play([inspectStar(1), sortAs("real")], inField());
    expect(reduce(one, inspectStar(1))).toBe(one);
  });

  it("keeps only when all five are sorted, and only the real stars", () => {
    expect(reduce(inField(), keepStars)).toBe(inField());
    const almost = play(sortAll(inField()).slice(2), inField());
    expect(reduce(almost, keepStars)).toBe(almost);
    expect(kept().field).toEqual({ stage: "kept", seed: 0, round: 0 });
  });

  it("keeping a round does not end the trial: the next round comes, whatever the round", () => {
    expect(kept().phase).toBe("trial");
    expect(secondRound().field).toMatchObject({ stage: "sorting", round: 1 });
    const secondKept = play([...sortAll(secondRound()), keepStars], secondRound());
    expect(secondKept).toMatchObject({ phase: "trial", trial: 3 });
    expect(secondKept.field).toEqual({ stage: "kept", seed: 0, round: 1 });
  });

  it("locks the field after the keep, and the retry starts the next round", () => {
    for (const event of [inspectStar(0), sortAs("real"), sortAs("fake"), keepStars]) {
      expect(reduce(kept(), event)).toBe(kept());
    }
    expect(secondRound()).toEqual({ ...kept(), field: { ...inField().field, round: 1 } });
    expect(reduce(inField(), retryField)).toBe(inField());
  });

  it("the rounds go on and the table wraps", () => {
    let state = secondRound();
    for (const round of [2, 3]) {
      state = play([...sortAll(state), keepStars, retryField], state);
      expect(state.field).toEqual({ ...inField().field, round });
    }
    const wrapped = play([...sortAll(state), keepStars, retryField], state);
    expect(wrapped.field).toEqual(inField().field);
  });

  it("does nothing outside a run of the field: on the title, in trial 1, in the shed and on any end screen", () => {
    const over = reduce(started(), runOut);
    for (const state of [initialState, started(), inShed(), over, shedOver(), fieldOver()]) {
      for (const event of [inspectStar(0), sortAs("real"), keepStars, retryField]) {
        expect(reduce(state, event)).toBe(state);
      }
    }
  });
});

describe("reduce: the field's clock and score (REQ-6.7)", () => {
  it("Tick runs the clock down in the field, and does nothing for zero or less", () => {
    expect(reduce(inField(), tick(1_000)).run.remainingMs).toBe(59_000);
    expect(reduce(inField(), tick(0))).toBe(inField());
    expect(reduce(inField(), tick(-5))).toBe(inField());
    expect(play([tick(1_500), tick(2_500)], inField()).run.remainingMs).toBe(56_000);
  });

  it("time up ends the run at once, whatever the child was doing, and keeps the field and the best", () => {
    const looking = play([inspectStar(0)], inField());
    for (const state of [inField(), looking, sorted(), kept()]) {
      const over = reduce(state, runOut);
      expect(over).toMatchObject({ phase: "over", trial: 3 });
      expect(over.run.remainingMs).toBe(0);
      expect(over.field).toBe(state.field);
    }
    expect(reduce(inField(), tick(balance.runMs - 1)).phase).toBe("trial");
    expect(reduce(fieldOver(), tick(1_000))).toBe(fieldOver());
  });

  it("a right verdict scores 100, then 50 more for each right verdict in a row up to 4, a wrong one scores nothing and ends the streak", () => {
    // Seed 0, round 0: star 4 is the only fake star.
    const scores = (events: GameEvent[]) => play(events, inField()).run;
    expect(scores([inspectStar(0), sortAs("real")])).toMatchObject({ score: 100, streak: 1 });
    expect(scores(sortAll(inField()).slice(0, 4))).toMatchObject({ score: 250, streak: 2 });
    expect(scores(sortAll(inField()))).toMatchObject({
      score: 100 + 150 + 200 + 250 + 300,
      streak: 5,
    });
    expect(scores([inspectStar(0), sortAs("fake")])).toMatchObject({ score: 0, streak: 0 });
    const broken = scores([...sortAll(inField()).slice(0, 4), inspectStar(2), sortAs("fake")]);
    expect(broken).toMatchObject({ score: 250, streak: 0 });
    expect(
      scores([
        ...sortAll(inField()).slice(0, 4),
        inspectStar(2),
        sortAs("fake"),
        inspectStar(2),
        sortAs("real"),
      ]),
    ).toMatchObject({ score: 100 + 150 + 100, streak: 1 });
  });

  it("looking, the keep and the next round score nothing and keep the streak", () => {
    const run = sorted().run;
    expect(reduce(sorted(), keepStars).run).toBe(run);
    expect(kept().run).toBe(run);
    expect(secondRound().run).toBe(run);
    expect(reduce(inField(), inspectStar(0)).run).toBe(inField().run);
  });

  it("a verdict with nothing to decide scores nothing and changes nothing", () => {
    expect(reduce(inField(), sortAs("real"))).toBe(inField());
    expect(reduce(kept(), sortAs("real"))).toBe(kept());
  });

  it("the run's score and best carry to the end screen, with a record flag", () => {
    expect(fieldOver().run).toMatchObject({ score: 1000, best: 1000, record: true });
    const noScore = reduce(inField(), runOut);
    expect(noScore.run).toMatchObject({ score: 0, best: 0, record: false });
  });
});

describe("reduce: the way back to the title (REQ-6.7)", () => {
  it("LeaveField in a run goes to the title and drops the field and the run in progress", () => {
    const midway = play([inspectStar(0), sortAs("real"), tick(1_000)], inField());
    const left = reduce(midway, leaveField);
    expect(left).toEqual({
      ...midway,
      phase: "title",
      trial: 0,
      field: initialState.field,
      run: fullRun,
    });
  });

  it("LeaveField in every stage of a run goes to the title", () => {
    for (const state of [
      inField(),
      play([inspectStar(0)], inField()),
      sorted(),
      kept(),
      secondRound(),
    ]) {
      expect(reduce(state, leaveField)).toMatchObject({ phase: "title", trial: 0 });
    }
  });

  it("LeaveField on the end screen goes to the title and keeps the best score of the session", () => {
    const away = reduce(fieldOver(), leaveField);
    expect(away).toMatchObject({ phase: "title", trial: 0 });
    expect(away.run).toEqual({ ...fullRun, best: 1000 });
    expect(away.field).toBe(initialState.field);
    expect(away.lane).toBe(initialState.lane);
    expect(away.shed).toBe(initialState.shed);
  });

  it("keeps the language and the hero, and the title opens the field, the shed or trial 1 again", () => {
    const set = play([
      enterField,
      { type: "SetLang", lang: "ja" },
      { type: "MoveHeroTo", x: 9, y: 8 },
    ]);
    const left = reduce(set, leaveField);
    expect(left).toMatchObject({ lang: "ja", hero: { x: 9, y: 8 } });
    expect(reduce(left, { type: "StartField", seed: 3 }).field).toEqual({
      ...initialState.field,
      seed: 3,
    });
    expect(reduce(left, enterShed).trial).toBe(2);
    expect(reduce(left, { type: "Start" }).trial).toBe(1);
  });

  it("LeaveField on the title, in trial 1 and in the shed returns the same state", () => {
    for (const state of [
      initialState,
      started(),
      inShed(),
      shedOver(),
      reduce(started(), runOut),
    ]) {
      expect(reduce(state, leaveField)).toBe(state);
    }
  });

  it("LeaveShed in the field returns the same state, so one way back never closes the other", () => {
    expect(reduce(inField(), leaveShed)).toBe(inField());
    expect(reduce(fieldOver(), leaveShed)).toBe(fieldOver());
    expect(reduce(inShed(), leaveField)).toBe(inShed());
  });
});

describe("reduce: the other trials' events leave the field alone (REQ-6.8)", () => {
  const otherEvents: GameEvent[] = [
    ...pick("red", "lantern"),
    ask,
    retry,
    pickTool("key"),
    giveTool,
    retryShed,
  ];

  it("changes nothing in the field, whatever is sorted or kept", () => {
    const states = [inField(), play([inspectStar(0)], inField()), sorted(), kept(), fieldOver()];
    for (const state of states) {
      for (const event of otherEvents) expect(reduce(state, event)).toBe(state);
    }
  });

  it("keeps the lane and the shed initial through a whole run", () => {
    const later = play([...otherEvents, ...sortAll(inField()), keepStars, runOut], inField());
    expect(later.lane).toBe(initialState.lane);
    expect(later.shed).toBe(initialState.shed);
  });
});

// Trial 4 (spec 07-trial-keep-secrets). `shadowsOver` is two right decisions and a wrong one (250 points). Seed 0 plays houseKey, candy, ball, address, password, flower: the
// right decisions are keep, give, give, keep, keep, give.
const enterShadows: GameEvent = { type: "StartShadows", seed: 0 };
const decide = (choice: "give" | "keep"): GameEvent => ({ type: "DecideItem", choice });
const nextItem: GameEvent = { type: "NextItem" };
const leaveShadows: GameEvent = { type: "LeaveShadows" };
const inShadows = fixture(() => play([enterShadows]));
const rightAnswers = ["keep", "give", "give", "keep", "keep", "give"] as const;
/** The right decision and the next round, for the first `rounds` items of seed 0. */
const rightRounds = (rounds: number): GameEvent[] =>
  rightAnswers.slice(0, rounds).flatMap((choice) => [decide(choice), nextItem]);
const scores = (events: GameEvent[]) => play(events, inShadows()).run;
const shadowsOver = fixture(() =>
  reduce(play([...rightRounds(2), decide("keep")], inShadows()), runOut),
);

describe("reduce: opening trial 4 (REQ-7.1, REQ-7.8)", () => {
  it("StartShadows on the title opens trial 4 with round 0 for the seed and begins a 60-second run", () => {
    expect(inShadows().phase).toBe("trial");
    expect(inShadows().trial).toBe(4);
    expect(inShadows().shadows).toEqual({ ...initialState.shadows, seed: 0 });
    expect(reduce(initialState, { type: "StartShadows", seed: 7 }).shadows).toEqual({
      ...initialState.shadows,
      seed: 7,
    });
    // A full clock, a score of 0 and no streak; the other trials are untouched.
    expect(inShadows().run).toEqual(fullRun);
    expect(inShadows().lane).toBe(initialState.lane);
    expect(inShadows().shed).toBe(initialState.shed);
    expect(inShadows().field).toBe(initialState.field);
    expect(inShadows().lang).toBe(initialState.lang);
  });

  it("the seed is a whole number: a negative or fractional seed gives the same rounds every time", () => {
    expect(reduce(initialState, { type: "StartShadows", seed: -1 }).shadows.seed).toBe(
      4_294_967_295,
    );
    expect(reduce(initialState, { type: "StartShadows", seed: 1.9 }).shadows.seed).toBe(1);
  });

  it("StartShadows keeps the language and the hero where they were", () => {
    const before = play([
      { type: "SetLang", lang: "ja" },
      { type: "MoveHeroTo", x: 5, y: 6 },
    ]);
    expect(reduce(before, enterShadows)).toEqual({
      ...before,
      phase: "trial",
      trial: 4,
      run: fullRun,
    });
  });

  it("StartShadows keeps only the best score of the session", () => {
    const first = reduce(play([decide("keep")], inShadows()), runOut);
    expect(first.run).toMatchObject({ score: 100, best: 100, record: true });
    const again = reduce(reduce(first, leaveShadows), enterShadows);
    expect(again.run).toEqual({ ...fullRun, best: 100 });
  });

  it("StartShadows is ignored in the other trials and in a run of trial 4", () => {
    expect(reduce(started(), enterShadows)).toBe(started());
    expect(reduce(inShed(), enterShadows)).toBe(inShed());
    expect(reduce(inField(), enterShadows)).toBe(inField());
    expect(reduce(inShadows(), enterShadows)).toBe(inShadows());
  });

  it("StartShadows on the end screen of another trial is ignored", () => {
    for (const over of [reduce(started(), runOut), shedOver(), fieldOver()]) {
      expect(over.phase).toBe("over");
      expect(reduce(over, enterShadows)).toBe(over);
    }
  });

  it("StartShadows on trial 4's own end screen plays again: round 0 of the new seed, a full clock, a score of 0, the best kept", () => {
    expect(shadowsOver().phase).toBe("over");
    const again = reduce(shadowsOver(), { type: "StartShadows", seed: 5 });
    expect(again).toEqual({
      ...shadowsOver(),
      phase: "trial",
      trial: 4,
      shadows: { ...initialState.shadows, seed: 5 },
      run: { ...fullRun, best: shadowsOver().run.best },
    });
    expect(shadowsOver().run.best).toBeGreaterThan(0);
  });
});

describe("reduce: trial 4 and the other entrances (REQ-7.1, REQ-7.8)", () => {
  it("the other entrances are ignored in trial 4, so one entrance never opens another", () => {
    for (const state of [inShadows(), shadowsOver()]) {
      for (const event of [enterShed, enterField]) expect(reduce(state, event)).toBe(state);
    }
    expect(reduce(inShed(), enterShadows)).toBe(inShed());
  });

  it("Start in a run of trial 4 sets the language only: it never leaves trial 4 or starts trial 1", () => {
    const midway = play([decide("keep")], inShadows());
    expect(reduce(midway, { type: "Start" })).toEqual(midway);
    expect(reduce(midway, { type: "Start", lang: "ja" })).toEqual({ ...midway, lang: "ja" });
  });

  it("Start on trial 4's end screen begins trial 1 and drops trial 4", () => {
    const next = reduce(shadowsOver(), { type: "Start" });
    expect(next).toMatchObject({ phase: "trial", trial: 1 });
    expect(next.shadows).toBe(initialState.shadows);
    expect(next.run).toEqual({ ...fullRun, best: shadowsOver().run.best });
  });

  it("SetLang and MoveHeroTo keep the decision and the result", () => {
    for (const before of [inShadows(), play([decide("give")], inShadows()), shadowsOver()]) {
      const next = play(
        [
          { type: "SetLang", lang: "ja" },
          { type: "MoveHeroTo", x: 1, y: 2 },
        ],
        before,
      );
      expect(next.shadows).toBe(before.shadows);
      expect(next.run).toBe(before.run);
    }
  });
});

describe("reduce: the events of trial 4 (REQ-7.3, REQ-7.7)", () => {
  it("DecideItem records the choice that was pressed, whether or not it was right", () => {
    expect(reduce(inShadows(), decide("keep")).shadows).toEqual({
      stage: "decided",
      seed: 0,
      round: 0,
      choice: "keep",
    });
    expect(reduce(inShadows(), decide("give")).shadows).toEqual({
      stage: "decided",
      seed: 0,
      round: 0,
      choice: "give",
    });
  });

  it("a second DecideItem in the same round changes nothing, and does not score again", () => {
    const decided = reduce(inShadows(), decide("keep"));
    expect(reduce(decided, decide("keep"))).toBe(decided);
    expect(reduce(decided, decide("give"))).toBe(decided);
  });

  it("NextItem before a decision changes nothing; after one it brings the next item", () => {
    expect(reduce(inShadows(), nextItem)).toBe(inShadows());
    const second = play([decide("keep"), nextItem], inShadows());
    expect(second.shadows).toEqual({ stage: "deciding", seed: 0, round: 1 });
    expect(second.run).toEqual(reduce(inShadows(), decide("keep")).run);
  });

  it("the rounds go on past the six items", () => {
    const state = play([...rightRounds(6), ...rightRounds(1)], inShadows());
    expect(state.shadows).toEqual({ stage: "deciding", seed: 0, round: 7 });
  });

  it("does nothing outside a run of trial 4: on the title, in the other trials and on any end screen", () => {
    const over = reduce(started(), runOut);
    for (const state of [
      initialState,
      started(),
      inShed(),
      inField(),
      over,
      shedOver(),
      fieldOver(),
    ]) {
      for (const event of [decide("keep"), decide("give"), nextItem]) {
        expect(reduce(state, event)).toBe(state);
      }
    }
    for (const event of [decide("keep"), nextItem]) {
      expect(reduce(shadowsOver(), event)).toBe(shadowsOver());
    }
  });
});

describe("reduce: the clock and score of trial 4 (REQ-7.7)", () => {
  it("Tick runs the clock down in trial 4, and does nothing for zero or less", () => {
    expect(reduce(inShadows(), tick(1_000)).run.remainingMs).toBe(59_000);
    expect(reduce(inShadows(), tick(0))).toBe(inShadows());
    expect(reduce(inShadows(), tick(-5))).toBe(inShadows());
    expect(play([tick(1_500), tick(2_500)], inShadows()).run.remainingMs).toBe(56_000);
  });

  it("time up ends the run at once, deciding or decided, and keeps trial 4 and the best", () => {
    for (const state of [inShadows(), play([decide("keep")], inShadows())]) {
      const over = reduce(state, runOut);
      expect(over).toMatchObject({ phase: "over", trial: 4 });
      expect(over.run.remainingMs).toBe(0);
      expect(over.shadows).toBe(state.shadows);
    }
    expect(reduce(inShadows(), tick(balance.runMs - 1)).phase).toBe("trial");
    expect(reduce(shadowsOver(), tick(1_000))).toBe(shadowsOver());
  });

  it("a right decision scores 100, then 50 more for each right decision in a row up to 4", () => {
    expect(scores([decide("keep")])).toMatchObject({ score: 100, streak: 1 });
    expect(scores(rightRounds(2))).toMatchObject({ score: 250, streak: 2 });
    expect(scores(rightRounds(5))).toMatchObject({
      score: 100 + 150 + 200 + 250 + 300,
      streak: 5,
    });
    // Round 5 is the flower: keeping it is wrong, so the score stays and the streak ends.
    expect(scores([...rightRounds(5), decide("keep")])).toMatchObject({ score: 1000, streak: 0 });
    expect(scores([...rightRounds(6)])).toMatchObject({ score: 1300, streak: 6 });
  });

  it("a wrong decision scores nothing and ends the streak, for a secret given and for a safe item kept", () => {
    expect(play([decide("give")], inShadows()).run).toMatchObject({ score: 0, streak: 0 });
    const afterOne = play([...rightRounds(2), decide("keep")], inShadows());
    // Round 2 is the ball, which was fine to give.
    expect(afterOne.run).toMatchObject({ score: 250, streak: 0 });
    // Round 3 is the address: keeping it is right, and the streak starts again at 100.
    expect(play([nextItem, decide("keep")], afterOne).run).toMatchObject({ score: 350, streak: 1 });
  });

  it("the next round scores nothing and keeps the streak", () => {
    const decided = play([decide("keep")], inShadows());
    expect(reduce(decided, nextItem).run).toBe(decided.run);
  });

  it("the run's score and best carry to the end screen, with a record flag", () => {
    expect(shadowsOver().run).toMatchObject({ score: 250, best: 250, record: true });
    expect(reduce(inShadows(), runOut).run).toMatchObject({ score: 0, best: 0, record: false });
  });
});

describe("reduce: the way back to the title from trial 4 (REQ-7.7)", () => {
  it("LeaveShadows in a run goes to the title and drops trial 4 and the run in progress", () => {
    const midway = play([decide("keep"), tick(1_000)], inShadows());
    expect(reduce(midway, leaveShadows)).toEqual({
      ...midway,
      phase: "title",
      trial: 0,
      shadows: initialState.shadows,
      run: fullRun,
    });
  });

  it("LeaveShadows in every stage of a run goes to the title", () => {
    for (const state of [
      inShadows(),
      play([decide("give")], inShadows()),
      play(rightRounds(2), inShadows()),
    ]) {
      expect(reduce(state, leaveShadows)).toMatchObject({ phase: "title", trial: 0 });
    }
  });

  it("LeaveShadows on the end screen goes to the title and keeps the best score of the session", () => {
    const away = reduce(shadowsOver(), leaveShadows);
    expect(away).toMatchObject({ phase: "title", trial: 0 });
    expect(away.run).toEqual({ ...fullRun, best: 250 });
    expect(away.shadows).toBe(initialState.shadows);
    expect(away.lane).toBe(initialState.lane);
    expect(away.shed).toBe(initialState.shed);
    expect(away.field).toBe(initialState.field);
  });

  it("keeps the language and the hero, and the title opens every trial again", () => {
    const set = play([
      enterShadows,
      { type: "SetLang", lang: "ja" },
      { type: "MoveHeroTo", x: 9, y: 8 },
    ]);
    const left = reduce(set, leaveShadows);
    expect(left).toMatchObject({ lang: "ja", hero: { x: 9, y: 8 } });
    expect(reduce(left, { type: "StartShadows", seed: 3 }).shadows).toEqual({
      ...initialState.shadows,
      seed: 3,
    });
    expect(reduce(left, enterField).trial).toBe(3);
    expect(reduce(left, enterShed).trial).toBe(2);
    expect(reduce(left, { type: "Start" }).trial).toBe(1);
  });

  it("LeaveShadows on the title and in the other trials returns the same state", () => {
    for (const state of [initialState, started(), inShed(), inField(), shedOver(), fieldOver()]) {
      expect(reduce(state, leaveShadows)).toBe(state);
    }
  });

  it("the other trials' ways back return the same state in trial 4, so one way back never closes another", () => {
    for (const state of [inShadows(), shadowsOver()]) {
      expect(reduce(state, leaveShed)).toBe(state);
      expect(reduce(state, leaveField)).toBe(state);
    }
    expect(reduce(inShed(), leaveShadows)).toBe(inShed());
    expect(reduce(inField(), leaveShadows)).toBe(inField());
  });
});

describe("reduce: the other trials' events leave trial 4 alone (REQ-7.8)", () => {
  const otherEvents: GameEvent[] = [
    ...pick("red", "lantern"),
    ask,
    retry,
    pickTool("key"),
    giveTool,
    retryShed,
    inspectStar(0),
    sortAs("real"),
    keepStars,
    retryField,
  ];

  it("changes nothing in trial 4, whatever is decided", () => {
    for (const state of [inShadows(), play([decide("keep")], inShadows()), shadowsOver()]) {
      for (const event of otherEvents) expect(reduce(state, event)).toBe(state);
    }
  });

  it("keeps the lane, the shed and the field initial through a whole run", () => {
    const later = play([...otherEvents, ...rightRounds(3), runOut], inShadows());
    expect(later.lane).toBe(initialState.lane);
    expect(later.shed).toBe(initialState.shed);
    expect(later.field).toBe(initialState.field);
  });

  it("trial 4's events change nothing in the other trials", () => {
    for (const state of [started(), inShed(), inField()]) {
      for (const event of [decide("keep"), nextItem]) expect(reduce(state, event)).toBe(state);
    }
  });
});

const eight = (choose: (round: number) => "give" | "keep") =>
  play(
    Array.from({ length: 8 }, (_, round) => [decide(choose(round)), nextItem]).flat(),
    inShadows(),
  ).run.score;

describe("reduce: guessing does not pay in trial 4 (REQ-7.7.8)", () => {
  // Eight rounds of seed 0: the house key, the candy, the ball, the address, the password, the flower, the house
  // key, the candy. Knowing which is which scores 100 + 150 + 200 + 250 + 300 + 300 + 300 + 300.
  it("scores 1,900 for eight right decisions, and 450 for pressing the same button every time", () => {
    expect(eight((round) => rightAnswers[round % 6]!)).toBe(1900);
    expect(eight(() => "keep")).toBe(450);
    expect(eight(() => "give")).toBe(450);
  });

  it("scores less than a quarter as much for the same button every time", () => {
    expect(eight(() => "keep") * 4).toBeLessThan(1900);
    expect(eight(() => "give") * 4).toBeLessThan(1900);
  });
});

// Trial 5 (spec 08-trial-tell-whats-wrong). Seed 0's wishes go round every three rounds, and its fault parts are
// the handle, the roof and the light in turn: the right cards are the ring, the flat roof and the moon, again and
// again. `lanternOver` is two lanterns lit and a wrong card (250 points).
const enterLantern: GameEvent = { type: "StartLantern", seed: 0 };
const tapPart = (part: "handle" | "roof" | "light"): GameEvent => ({ type: "TapPart", part });
const fixPart = (look: LookId): GameEvent => ({ type: "FixPart", look });
const nextLantern: GameEvent = { type: "NextLantern" };
const leaveLantern: GameEvent = { type: "LeaveLantern" };
const inLantern = fixture(() => play([enterLantern]));
const faultParts = ["handle", "roof", "light"] as const;
const rightLooks: LookId[] = ["ring", "flat", "moon"];
/** Point at the fault part of `round` and pick `look` for it. */
const tell = (round: number, look: LookId): GameEvent[] => [
  tapPart(faultParts[round % 3]!),
  fixPart(look),
];
/** The right card and the next lantern, for the first `rounds` rounds of seed 0. */
const lightRounds = (rounds: number): GameEvent[] =>
  Array.from({ length: rounds }, (_, r) => [...tell(r, rightLooks[r % 3]!), nextLantern]).flat();
const lanternScore = (events: GameEvent[]) => play(events, inLantern()).run;
const lanternOver = fixture(() =>
  reduce(play([...lightRounds(2), ...tell(2, "star")], inLantern()), runOut),
);

describe("reduce: opening trial 5 (REQ-8.1, REQ-8.10)", () => {
  it("StartLantern on the title opens trial 5 with round 0 for the seed and begins a 60-second run", () => {
    expect(inLantern().phase).toBe("trial");
    expect(inLantern().trial).toBe(5);
    expect(inLantern().lantern).toEqual(initialState.lantern);
    expect(reduce(initialState, { type: "StartLantern", seed: 7 }).lantern).toEqual(newLantern(7));
    expect(inLantern().run).toEqual(fullRun);
    expect(inLantern().lane).toBe(initialState.lane);
    expect(inLantern().shed).toBe(initialState.shed);
    expect(inLantern().field).toBe(initialState.field);
    expect(inLantern().shadows).toBe(initialState.shadows);
    expect(inLantern().lang).toBe(initialState.lang);
  });

  it("the seed is a whole number: a negative or fractional seed gives the same rounds every time", () => {
    expect(reduce(initialState, { type: "StartLantern", seed: -1 }).lantern.seed).toBe(
      4_294_967_295,
    );
    expect(reduce(initialState, { type: "StartLantern", seed: 1.9 }).lantern.seed).toBe(1);
  });

  it("StartLantern keeps the language and the hero where they were, and only the best score", () => {
    const before = play([
      { type: "SetLang", lang: "ja" },
      { type: "MoveHeroTo", x: 5, y: 6 },
    ]);
    expect(reduce(before, enterLantern)).toEqual({
      ...before,
      phase: "trial",
      trial: 5,
      run: fullRun,
    });
    const first = reduce(play(tell(0, "ring"), inLantern()), runOut);
    expect(first.run).toMatchObject({ score: 100, best: 100, record: true });
    expect(reduce(reduce(first, leaveLantern), enterLantern).run).toEqual({
      ...fullRun,
      best: 100,
    });
  });

  it("StartLantern is ignored in a run of any trial and on the end screen of another trial", () => {
    for (const state of [started(), inShed(), inField(), inShadows(), inLantern()]) {
      expect(reduce(state, enterLantern)).toBe(state);
    }
    for (const over of [reduce(started(), runOut), shedOver(), fieldOver(), shadowsOver()]) {
      expect(reduce(over, enterLantern)).toBe(over);
    }
  });

  it("StartLantern on trial 5's own end screen plays again: round 0 of the new seed, a full clock, the best kept", () => {
    expect(lanternOver().phase).toBe("over");
    expect(reduce(lanternOver(), { type: "StartLantern", seed: 5 })).toEqual({
      ...lanternOver(),
      phase: "trial",
      trial: 5,
      lantern: newLantern(5),
      run: { ...fullRun, best: lanternOver().run.best },
    });
    expect(lanternOver().run.best).toBeGreaterThan(0);
  });
});

describe("reduce: trial 5 and the other entrances (REQ-8.1, REQ-8.10)", () => {
  it("the other entrances are ignored in trial 5, and Start in a run sets the language only", () => {
    for (const state of [inLantern(), lanternOver()]) {
      for (const event of [enterShed, enterField, enterShadows])
        expect(reduce(state, event)).toBe(state);
    }
    const midway = play(tell(0, "bow"), inLantern());
    expect(reduce(midway, { type: "Start" })).toEqual(midway);
    expect(reduce(midway, { type: "Start", lang: "ja" })).toEqual({ ...midway, lang: "ja" });
  });

  it("Start on trial 5's end screen begins trial 1 and drops trial 5", () => {
    const next = reduce(lanternOver(), { type: "Start" });
    expect(next).toMatchObject({ phase: "trial", trial: 1 });
    expect(next.lantern).toBe(initialState.lantern);
    expect(next.run).toEqual({ ...fullRun, best: lanternOver().run.best });
  });

  it("SetLang and MoveHeroTo keep the lantern and the run", () => {
    for (const before of [inLantern(), play([tapPart("handle")], inLantern()), lanternOver()]) {
      const next = play(
        [
          { type: "SetLang", lang: "ja" },
          { type: "MoveHeroTo", x: 1, y: 2 },
        ],
        before,
      );
      expect(next.lantern).toBe(before.lantern);
      expect(next.run).toBe(before.run);
    }
  });
});

describe("reduce: the events of trial 5 (REQ-8.4 to REQ-8.6)", () => {
  it("TapPart points and scores nothing, on the flickering part and on a steady one", () => {
    const pointed = reduce(inLantern(), tapPart("handle"));
    expect(pointed.lantern).toMatchObject({ stage: "pointing", part: "handle" });
    expect(pointed.run).toBe(inLantern().run);
    const fine = reduce(inLantern(), tapPart("roof"));
    expect(fine.lantern).toMatchObject({ stage: "looking", note: { kind: "fine", part: "roof" } });
    expect(fine.run).toBe(inLantern().run);
    expect(fine.lantern.stage === "looking" && fine.lantern.shape).toEqual(broughtAt(0, 0));
  });

  it("FixPart with the right card lights the lantern; with the other card the part changes and still flickers", () => {
    expect(play(tell(0, "ring"), inLantern()).lantern).toEqual({ stage: "lit", seed: 0, round: 0 });
    const said = play(tell(0, "bow"), inLantern()).lantern;
    expect(said).toMatchObject({ stage: "looking", note: { kind: "said", look: "bow" } });
    expect(said.stage === "looking" && said.shape.handle).toBe("bow");
  });

  it("FixPart without pointing, or with a look that is not one of the cards, changes nothing and scores nothing", () => {
    expect(reduce(inLantern(), fixPart("ring"))).toBe(inLantern());
    const pointed = reduce(inLantern(), tapPart("handle"));
    for (const look of ["bell", "flat", "moon"] as const)
      expect(reduce(pointed, fixPart(look))).toBe(pointed);
    const lit = play(tell(0, "ring"), inLantern());
    expect(reduce(lit, fixPart("bow"))).toBe(lit);
    expect(reduce(lit, tapPart("handle"))).toBe(lit);
  });

  it("NextLantern before the lantern is lit changes nothing; after, it brings the next round", () => {
    expect(reduce(inLantern(), nextLantern)).toBe(inLantern());
    const second = play([...tell(0, "ring"), nextLantern], inLantern());
    expect(second.lantern).toEqual({ ...newLantern(0), round: 1, shape: broughtAt(0, 1) });
    expect(second.run).toEqual(play(tell(0, "ring"), inLantern()).run);
    expect(play(lightRounds(7), inLantern()).lantern.round).toBe(7);
  });

  it("does nothing outside a run of trial 5: on the title, in the other trials and on any end screen", () => {
    const over = reduce(started(), runOut);
    const events = [tapPart("handle"), fixPart("ring"), nextLantern];
    for (const state of [
      initialState,
      started(),
      inShed(),
      inField(),
      inShadows(),
      over,
      shedOver(),
      fieldOver(),
    ]) {
      for (const event of events) expect(reduce(state, event)).toBe(state);
    }
    for (const event of events) expect(reduce(lanternOver(), event)).toBe(lanternOver());
  });
});

describe("reduce: the clock and score of trial 5 (REQ-8.9)", () => {
  it("Tick runs the clock down in trial 5, and time up ends the run in every stage", () => {
    expect(reduce(inLantern(), tick(1_000)).run.remainingMs).toBe(59_000);
    expect(reduce(inLantern(), tick(0))).toBe(inLantern());
    const stages = [
      inLantern(),
      play([tapPart("handle")], inLantern()),
      play(tell(0, "ring"), inLantern()),
    ];
    for (const state of stages) {
      const over = reduce(state, runOut);
      expect(over).toMatchObject({ phase: "over", trial: 5 });
      expect(over.lantern).toBe(state.lantern);
    }
    expect(reduce(lanternOver(), tick(1_000))).toBe(lanternOver());
  });

  it("a right card scores 100, then 50 more for each right card in a row up to 4", () => {
    expect(lanternScore(tell(0, "ring"))).toMatchObject({ score: 100, streak: 1 });
    expect(lanternScore(lightRounds(2))).toMatchObject({ score: 250, streak: 2 });
    expect(lanternScore(lightRounds(6))).toMatchObject({ score: 1300, streak: 6 });
  });

  it("a wrong card scores nothing and ends the streak; the right card after it starts again at 100", () => {
    expect(lanternScore(tell(0, "bow")).score).toBe(0);
    const ended = play([...lightRounds(2), ...tell(2, "star")], inLantern());
    expect(ended.run).toMatchObject({ score: 250, streak: 0 });
    expect(play(tell(2, "moon"), ended).run).toMatchObject({ score: 350, streak: 1 });
  });

  it("a point and the next lantern score nothing and keep the streak", () => {
    const lit = play(tell(0, "ring"), inLantern());
    expect(reduce(lit, nextLantern).run).toBe(lit.run);
    const next = reduce(lit, nextLantern);
    expect(play([tapPart("handle"), tapPart("roof")], next).run).toBe(next.run);
  });
});

describe("reduce: the way back to the title from trial 5 (REQ-8.9.5)", () => {
  it("LeaveLantern in every stage of a run and on the end screen goes to the title and keeps the best", () => {
    for (const state of [
      inLantern(),
      play([tapPart("handle")], inLantern()),
      play(tell(0, "ring"), inLantern()),
    ]) {
      expect(reduce(state, leaveLantern)).toEqual({
        ...state,
        phase: "title",
        trial: 0,
        lantern: initialState.lantern,
        run: fullRun,
      });
    }
    const away = reduce(lanternOver(), leaveLantern);
    expect(away).toMatchObject({ phase: "title", trial: 0 });
    expect(away.run).toEqual({ ...fullRun, best: 250 });
  });

  it("from the title every trial opens again", () => {
    const left = reduce(play([{ type: "SetLang", lang: "ja" }], inLantern()), leaveLantern);
    expect(left.lang).toBe("ja");
    for (const [event, trial] of [
      [enterLantern, 5],
      [enterShadows, 4],
      [enterField, 3],
      [enterShed, 2],
      [{ type: "Start" }, 1],
    ] as const) {
      expect(reduce(left, event).trial).toBe(trial);
    }
  });

  it("LeaveLantern elsewhere returns the same state, and the other ways back return the same state in trial 5", () => {
    for (const state of [
      initialState,
      started(),
      inShed(),
      inField(),
      inShadows(),
      shedOver(),
      shadowsOver(),
    ]) {
      expect(reduce(state, leaveLantern)).toBe(state);
    }
    for (const state of [inLantern(), lanternOver()]) {
      for (const event of [leaveShed, leaveField, leaveShadows])
        expect(reduce(state, event)).toBe(state);
    }
  });
});

describe("reduce: the other trials' events leave trial 5 alone (REQ-8.10)", () => {
  const otherEvents: GameEvent[] = [
    ...pick("red", "lantern"),
    ask,
    retry,
    pickTool("key"),
    giveTool,
    retryShed,
    inspectStar(0),
    sortAs("real"),
    keepStars,
    retryField,
    decide("keep"),
    nextItem,
  ];

  it("changes nothing in trial 5, in any stage", () => {
    for (const state of [inLantern(), play([tapPart("handle")], inLantern()), lanternOver()]) {
      for (const event of otherEvents) expect(reduce(state, event)).toBe(state);
    }
  });

  it("keeps the other trials initial through a whole run", () => {
    const later = play([...otherEvents, ...lightRounds(3), runOut], inLantern());
    expect(later.lane).toBe(initialState.lane);
    expect(later.shed).toBe(initialState.shed);
    expect(later.field).toBe(initialState.field);
    expect(later.shadows).toBe(initialState.shadows);
  });
});

/** Eight rounds of seed 0 by a child who picks one card first and, when it was not the wish's, the other one. */
const tryInTurn = (first: 0 | 1) =>
  play(
    Array.from({ length: 8 }, (_, round) => {
      const part = faultParts[round % 3]!;
      const right = rightLooks[round % 3]!;
      const cards = cardsOf({
        stage: "pointing",
        seed: 0,
        round,
        shape: broughtAt(0, round),
        part,
      });
      const tried = cards[first]!;
      return tried === right
        ? [...tell(round, right), nextLantern]
        : [...tell(round, tried), ...tell(round, right), nextLantern];
    }).flat(),
    inLantern(),
  ).run.score;

describe("reduce: trying every card does not pay in trial 5 (REQ-8.9.8)", () => {
  it("scores 1,900 for eight right cards, and about half for trying the left or the right card first", () => {
    expect(lanternScore(lightRounds(8)).score).toBe(1900);
    expect(tryInTurn(0)).toBe(1000);
    expect(tryInTurn(1)).toBe(1050);
  });

  it("lights every lantern either way: the cost is the streak, not the lantern", () => {
    expect(play(lightRounds(8), inLantern()).lantern.round).toBe(8);
    expect(tryInTurn(0) * 1.8).toBeLessThan(1900);
    expect(tryInTurn(1) * 1.8).toBeLessThan(1900);
  });
});

// Trial 6, The Hollow Crown (spec 09-trial-hollow-crown).

const enterCrown: GameEvent = { type: "StartCrown", seed: 0 };
const leaveCrown: GameEvent = { type: "LeaveCrown" };
const inCrown = fixture(() => play([enterCrown]));
const sayLook = (look: LookId): GameEvent => ({ type: "SayLook", look });
const tellWisp: GameEvent = { type: "Tell" };
const giveThing = (thing: Thing): GameEvent => ({ type: "GiveItem", thing });
const goWisp: GameEvent = { type: "Go" };
const checkLamp = (same: boolean): GameEvent => ({ type: "CheckLamp", same });
const pointLamp = (part: "roof" | "light"): GameEvent => ({ type: "PointLamp", part });
const fixLamp = (look: LookId): GameEvent => ({ type: "FixLamp", look });
const nextLamp: GameEvent = { type: "NextLamp" };

/** One chain of seed `seed` played right, from its tell step to its lit lamp. */
function crownChain(seed: number, chain: number): GameEvent[] {
  const wish = wishAt(seed, chain);
  const slip = slipAt(seed, chain);
  return [
    sayLook(wish.roof),
    sayLook(wish.light),
    tellWisp,
    giveThing(toolFor(seed, chain)),
    goWisp,
    checkLamp(false),
    pointLamp(slip),
    fixLamp(wish[slip]),
    checkLamp(true),
  ];
}
const crownSteps = fixture(() => play(crownChain(0, 0).slice(0, 5), inCrown()));
const crownCleared = fixture(() =>
  play(
    [...crownChain(0, 0), nextLamp, ...crownChain(0, 1), nextLamp, ...crownChain(0, 2), nextLamp],
    inCrown(),
  ),
);

describe("reduce: opening trial 6 (REQ-9.1, REQ-9.11)", () => {
  it("StartCrown on the title opens trial 6 at the tell step of chain 0 of the seed and touches nothing else", () => {
    expect(inCrown()).toEqual({ ...initialState, phase: "trial", trial: 6 });
    expect(reduce(initialState, { type: "StartCrown", seed: 7 }).crown).toEqual(newCrown(7));
    expect(reduce(initialState, { type: "StartCrown", seed: -1 }).crown.seed).toBe(4_294_967_295);
    const before = play([
      { type: "SetLang", lang: "ja" },
      { type: "MoveHeroTo", x: 5, y: 6 },
    ]);
    expect(reduce(before, enterCrown)).toEqual({ ...before, phase: "trial", trial: 6 });
  });

  it("keeps the run of the title, with its best score", () => {
    const first = reduce(play(tell(0, "ring"), inLantern()), runOut);
    const back = reduce(first, leaveLantern);
    expect(back.run.best).toBe(100);
    expect(reduce(back, enterCrown).run).toBe(back.run);
  });

  it("StartCrown is ignored in every trial and on every end screen, and in trial 6 before the clear", () => {
    for (const state of [started(), inShed(), inField(), inShadows(), inLantern(), inCrown()]) {
      expect(reduce(state, enterCrown)).toBe(state);
    }
    for (const over of [
      reduce(started(), runOut),
      shedOver(),
      fieldOver(),
      shadowsOver(),
      lanternOver(),
    ]) {
      expect(reduce(over, enterCrown)).toBe(over);
    }
    expect(reduce(crownSteps(), enterCrown)).toBe(crownSteps());
  });

  it("StartCrown on the clear plays again: the tell step of chain 0 of the new seed", () => {
    expect(crownCleared().crown).toEqual({ stage: "clear", seed: 0 });
    expect(reduce(crownCleared(), { type: "StartCrown", seed: 9 })).toEqual({
      ...crownCleared(),
      crown: newCrown(9),
    });
  });

  it("the other entrances are ignored in trial 6, and Start sets the language only", () => {
    for (const state of [inCrown(), crownSteps(), crownCleared()]) {
      for (const event of [enterShed, enterField, enterShadows, enterLantern])
        expect(reduce(state, event)).toBe(state);
      expect(reduce(state, { type: "Start" })).toEqual(state);
      expect(reduce(state, { type: "Start", lang: "ja" })).toEqual({ ...state, lang: "ja" });
    }
  });

  it("Start on an end screen drops trial 6 too", () => {
    const next = reduce(lanternOver(), { type: "Start" });
    expect(next.crown).toBe(initialState.crown);
  });
});

describe("reduce: the steps of trial 6 (REQ-9.3 to REQ-9.7)", () => {
  it("plays a chain through the reducer, each step changing only the crown", () => {
    let state = inCrown();
    const stages: string[] = [];
    for (const event of crownChain(0, 0)) {
      const next = reduce(state, event);
      expect(next).toEqual({ ...state, crown: next.crown });
      stages.push(next.crown.stage);
      state = next;
    }
    expect(stages).toEqual([
      "telling",
      "telling",
      "giving",
      "going",
      "checking",
      "fixing",
      "fixing",
      "checking",
      "lit",
    ]);
    expect(state.run).toBe(inCrown().run);
  });

  it("a step event out of order returns the same state", () => {
    expect(reduce(inCrown(), goWisp)).toBe(inCrown());
    expect(reduce(inCrown(), checkLamp(true))).toBe(inCrown());
    expect(reduce(inCrown(), nextLamp)).toBe(inCrown());
    expect(reduce(crownSteps(), tellWisp)).toBe(crownSteps());
    expect(reduce(crownSteps(), sayLook("flat"))).toBe(crownSteps());
  });
});

describe("reduce: the steps of trial 6 stay in trial 6 (REQ-9.11)", () => {
  it("the crown's events do nothing outside trial 6: on the title, in the other trials and on any end screen", () => {
    const events = [
      sayLook("flat"),
      tellWisp,
      giveThing("broom"),
      goWisp,
      checkLamp(true),
      checkLamp(false),
      pointLamp("roof"),
      fixLamp("flat"),
      nextLamp,
    ];
    for (const state of [
      initialState,
      started(),
      inShed(),
      inField(),
      inShadows(),
      inLantern(),
      reduce(started(), runOut),
      shedOver(),
      fieldOver(),
      shadowsOver(),
      lanternOver(),
    ]) {
      for (const event of events) expect(reduce(state, event)).toBe(state);
    }
  });

  it("the other trials' events and ways back do nothing in trial 6", () => {
    const events: GameEvent[] = [
      ...pick("red"),
      ask,
      retry,
      { type: "PickTool", tool: "broom" },
      { type: "GiveTool" },
      { type: "RetryShed" },
      { type: "LeaveShed" },
      { type: "InspectStar", index: 0 },
      { type: "SortStar", verdict: "real" },
      { type: "KeepStars" },
      { type: "RetryField" },
      { type: "LeaveField" },
      { type: "DecideItem", choice: "give" },
      { type: "NextItem" },
      { type: "LeaveShadows" },
      tapPart("roof"),
      fixPart("flat"),
      nextLantern,
      leaveLantern,
    ];
    for (const state of [inCrown(), crownSteps(), crownCleared()]) {
      for (const event of events) expect(reduce(state, event)).toBe(state);
    }
  });

  it("SetLang and MoveHeroTo keep the crown", () => {
    const next = play(
      [
        { type: "SetLang", lang: "ja" },
        { type: "MoveHeroTo", x: 1, y: 2 },
      ],
      crownSteps(),
    );
    expect(next.crown).toBe(crownSteps().crown);
    expect(next).toMatchObject({ lang: "ja", hero: { x: 1, y: 2 } });
  });
});

describe("reduce: trial 6 has no clock and no score (REQ-9.9.1)", () => {
  it("Tick does nothing in trial 6, short or long, in every stage and on the clear", () => {
    for (const state of [inCrown(), crownSteps(), crownCleared()]) {
      expect(reduce(state, tick(1_000))).toBe(state);
      expect(reduce(state, runOut)).toBe(state);
      expect(reduce(state, tick(70_000))).toBe(state);
    }
  });

  it("a whole visit leaves the run as it was on the title", () => {
    expect(crownCleared().run).toBe(inCrown().run);
    expect(crownCleared()).toMatchObject({ phase: "trial", trial: 6 });
  });
});

describe("reduce: the way back to the title from trial 6 (REQ-9.10.4)", () => {
  it("LeaveCrown in every stage and on the clear goes to the title and keeps the language, the hero and the run", () => {
    for (const state of [inCrown(), crownSteps(), crownCleared()]) {
      expect(reduce(state, leaveCrown)).toEqual({
        ...state,
        phase: "title",
        trial: 0,
        crown: initialState.crown,
      });
    }
  });

  it("LeaveCrown anywhere else returns the same state, and from the title every trial opens again", () => {
    for (const state of [initialState, started(), inShed(), inLantern(), lanternOver()]) {
      expect(reduce(state, leaveCrown)).toBe(state);
    }
    const left = reduce(crownSteps(), leaveCrown);
    for (const [event, trial] of [
      [enterCrown, 6],
      [enterLantern, 5],
      [enterShed, 2],
      [{ type: "Start" }, 1],
    ] as const) {
      expect(reduce(left, event).trial).toBe(trial);
    }
  });
});
