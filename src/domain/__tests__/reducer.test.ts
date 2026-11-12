// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import type { GameEvent } from "../events";
import { fakesOf } from "../field";
import { reduce } from "../reducer";
import { initialState, type GameState } from "../state";
import type { ToolId } from "../shed";

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

// Trial 2 (spec 05-trial-grant-tools, revision 2): the shed is a 60-second time attack. It opens from the
// title, has its own events, its own clock and score (the `Run` of trial 1), and a way back to the title.
const enterShed: GameEvent = { type: "StartShed" };
const pickTool = (tool: ToolId): GameEvent => ({ type: "PickTool", tool });
const giveTool: GameEvent = { type: "GiveTool" };
const retryShed: GameEvent = { type: "RetryShed" };
const leaveShed: GameEvent = { type: "LeaveShed" };
const inShed = play([enterShed]);
// With no seed the order is the fixed one: the lock (key), leaves (broom), boards (hammer), rope
// (scissors), roof (ladder). `solve` hands the answer of the current round over, then moves on.
const answers: ToolId[] = ["key", "broom", "hammer", "scissors", "ladder"];
const solve = (round: number): GameEvent[] => [pickTool(answers[round % 5]!), giveTool];
const shedOver = reduce(inShed, tick(balance.runMs));

describe("reduce: opening the shed (REQ-5.1, REQ-5.9)", () => {
  it("StartShed on the title opens trial 2 and starts a 60-second run", () => {
    expect(inShed.phase).toBe("trial");
    expect(inShed.trial).toBe(2);
    expect(inShed.shed).toEqual({ stage: "choosing", seed: 0, round: 0, pick: null });
    expect(inShed.run).toEqual({
      remainingMs: 60_000,
      score: 0,
      streak: 0,
      best: 0,
      record: false,
    });
    expect(inShed.lane).toBe(initialState.lane);
    expect(inShed.lang).toBe(initialState.lang);
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
      run: inShed.run,
    });
  });

  it("StartShed is ignored in trial 1, in the shed and on trial 1's end screen", () => {
    expect(reduce(started, enterShed)).toBe(started);
    expect(reduce(inShed, enterShed)).toBe(inShed);
    const over = reduce(started, tick(balance.runMs));
    expect(over.phase).toBe("over");
    expect(reduce(over, enterShed)).toBe(over);
  });

  it("StartShed on the shed's end screen plays again: a full clock, a score of 0, round 0, the best kept", () => {
    const scored = play([...solve(0), tick(balance.runMs)], inShed);
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
    const midway = play([pickTool("broom"), giveTool], inShed);
    expect(reduce(midway, { type: "Start" })).toEqual(midway);
    expect(reduce(midway, { type: "Start", lang: "ja" })).toEqual({ ...midway, lang: "ja" });
  });

  it("Start on the shed's end screen begins trial 1, and the shed is initial again", () => {
    const next = reduce(shedOver, { type: "Start" });
    expect(next).toMatchObject({ phase: "trial", trial: 1 });
    expect(next.shed).toBe(initialState.shed);
    expect(next.run.remainingMs).toBe(balance.runMs);
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
    const next = play([pickTool("key"), pickTool("ladder")], inShed);
    expect(next.shed).toEqual({ stage: "choosing", seed: 0, round: 0, pick: "ladder" });
    expect(next.run).toBe(inShed.run);
  });

  it("hands over exactly the picked tool and only then tries it", () => {
    expect(play([pickTool("hammer")], inShed).shed.stage).toBe("choosing");
    expect(play([pickTool("hammer"), giveTool], inShed).shed).toEqual({
      stage: "tried",
      seed: 0,
      round: 0,
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

  it("the retry after a stuck result is the same puzzle with nothing picked", () => {
    const done = play([pickTool("broom"), giveTool], inShed);
    expect(reduce(done, retryShed)).toEqual({ ...done, shed: inShed.shed, run: done.run });
    expect(reduce(inShed, retryShed)).toBe(inShed);
  });

  it("the retry after a freed cat is the next round", () => {
    const done = play(solve(0), inShed);
    expect(reduce(done, retryShed).shed).toEqual({
      stage: "choosing",
      seed: 0,
      round: 1,
      pick: null,
    });
  });

  it("does nothing outside the shed: on the title, in trial 1 and on trial 1's end screen", () => {
    const over = reduce(started, tick(balance.runMs));
    for (const state of [initialState, started, over]) {
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
      expect(reduce(shedOver, event)).toBe(shedOver);
    }
  });
});

describe("reduce: the shed's clock and score (REQ-5.7)", () => {
  it("Tick takes the time off the clock and changes nothing else", () => {
    const next = reduce(inShed, tick(1_500));
    expect(next).toEqual({ ...inShed, run: { ...inShed.run, remainingMs: 58_500 } });
  });

  it.each([0, -5, Number.NaN])("Tick with %s milliseconds changes nothing", (ms) => {
    expect(reduce(inShed, tick(ms))).toBe(inShed);
  });

  it("the clock runs while a tool is picked and while a result shows", () => {
    const picked = play([pickTool("key")], inShed);
    const shown = play([pickTool("broom"), giveTool], inShed);
    expect(reduce(picked, tick(1_000)).run.remainingMs).toBe(59_000);
    expect(reduce(shown, tick(1_000)).run.remainingMs).toBe(59_000);
    expect(reduce(shown, tick(1_000)).shed).toBe(shown.shed);
  });

  it("the run is over at zero, exactly or past it, in the state the child left the shed", () => {
    const almost = reduce(inShed, tick(59_999));
    expect(almost.phase).toBe("trial");
    const midway = play([pickTool("broom"), giveTool], inShed);
    const over = reduce(midway, runOut);
    expect(over).toMatchObject({ phase: "over", trial: 2, shed: midway.shed });
    expect(over.run.remainingMs).toBe(0);
    expect(reduce(almost, tick(1)).phase).toBe("over");
  });

  it("a tool that frees the cat scores 100, and the streak adds 50 for each find in a row up to 4", () => {
    let state = inShed;
    const scores: number[] = [];
    for (let round = 0; round < 7; round += 1) {
      state = play([...solve(round), retryShed], state);
      scores.push(state.run.score);
    }
    expect(scores).toEqual([100, 250, 450, 700, 1000, 1300, 1600]);
    expect(state.run.streak).toBe(7);
  });

  it("any other tool scores nothing and ends the streak; it takes nothing away", () => {
    const one = play([...solve(0), retryShed], inShed);
    expect(one.run).toMatchObject({ score: 100, streak: 1 });
    const missed = play([pickTool("hammer"), giveTool], one);
    expect(missed.run).toMatchObject({ score: 100, streak: 0 });
    const back = play([retryShed, ...solve(1)], missed);
    expect(back.run).toMatchObject({ score: 200, streak: 1 });
  });

  it("scores once, when the tool is handed over: picking, retrying and a second hand-over do not", () => {
    const picked = play([pickTool("key")], inShed);
    expect(picked.run.score).toBe(0);
    const freed = reduce(picked, giveTool);
    expect(freed.run.score).toBe(100);
    expect(reduce(freed, giveTool).run.score).toBe(100);
    expect(reduce(freed, retryShed).run.score).toBe(100);
    expect(reduce(freed, pickTool("broom")).run.score).toBe(100);
  });

  it("keeps the best score and says a better run is a record", () => {
    const first = reduce(play(solve(0), inShed), runOut);
    expect(first.run).toMatchObject({ score: 100, best: 100, record: true });
    const second = reduce(reduce(first, { type: "StartShed" }), runOut);
    expect(second.run).toMatchObject({ score: 0, best: 100, record: false });
  });
});

describe("reduce: the way back to the title (REQ-5.16)", () => {
  it("LeaveShed in a run goes to the title and drops the shed and the run in progress", () => {
    const midway = play([...solve(0), retryShed, pickTool("key"), tick(1_000)], inShed);
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
    const scored = reduce(play(solve(0), inShed), runOut);
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
      inShed,
      play([pickTool("key")], inShed),
      play([pickTool("key"), giveTool], inShed),
      play([pickTool("broom"), giveTool], inShed),
    ];
    for (const state of states) {
      for (const event of trialOneEvents) expect(reduce(state, event)).toBe(state);
    }
  });
});

// Trial 3 (spec 06-trial-verify-stars): the field opens from the title and has its own events.
const enterField: GameEvent = { type: "StartField", seed: 0 };
const inspectStar = (index: number): GameEvent => ({ type: "InspectStar", index });
const sortAs = (verdict: "real" | "fake"): GameEvent => ({ type: "SortStar", verdict });
const keepStars: GameEvent = { type: "KeepStars" };
const retryField: GameEvent = { type: "RetryField" };
const leaveField: GameEvent = { type: "LeaveField" };
const inField = play([enterField]);

/** The events that sort every unsorted star of the round the right way: look, then the true verdict. */
function sortAll(state: GameState): GameEvent[] {
  return [0, 1, 2, 3, 4].flatMap((i): GameEvent[] => [
    inspectStar(i),
    sortAs(fakesOf(state.field.seed, state.field.round).includes(i) ? "fake" : "real"),
  ]);
}
const sorted = play(sortAll(inField), inField);
const kept = play([keepStars], sorted);
const secondRound = play([retryField], kept);
const cleared = play([...sortAll(secondRound), keepStars], secondRound);

describe("reduce: opening the field (REQ-6.1, REQ-6.8)", () => {
  it("StartField on the title opens trial 3 with round 0 for the seed and starts no run", () => {
    expect(inField.phase).toBe("trial");
    expect(inField.trial).toBe(3);
    expect(inField.field).toEqual({ ...initialState.field, seed: 0 });
    expect(reduce(initialState, { type: "StartField", seed: 7 }).field).toEqual({
      ...initialState.field,
      seed: 7,
    });
    // The clock stays full, nothing is scored, and the lane and the shed are untouched.
    expect(inField.run).toBe(initialState.run);
    expect(inField.lane).toBe(initialState.lane);
    expect(inField.shed).toBe(initialState.shed);
    expect(inField.lang).toBe(initialState.lang);
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
    expect(reduce(before, enterField)).toEqual({ ...before, phase: "trial", trial: 3 });
  });

  it("StartField is ignored in trial 1, in the shed, in the field and on the end screen", () => {
    expect(reduce(started, enterField)).toBe(started);
    expect(reduce(inShed, enterField)).toBe(inShed);
    expect(reduce(inField, enterField)).toBe(inField);
    const over = reduce(started, tick(balance.runMs));
    expect(over.phase).toBe("over");
    expect(reduce(over, enterField)).toBe(over);
  });

  it("StartShed is ignored in the field, so one entrance never opens the other", () => {
    expect(reduce(inField, enterShed)).toBe(inField);
    expect(reduce(inShed, enterField)).toBe(inShed);
  });

  it("Start in the field sets the language only: it never leaves the field or starts a run", () => {
    const midway = play([inspectStar(0)], inField);
    expect(reduce(midway, { type: "Start" })).toEqual(midway);
    expect(reduce(midway, { type: "Start", lang: "ja" })).toEqual({ ...midway, lang: "ja" });
  });

  it("SetLang and MoveHeroTo keep what the child sorted and the result", () => {
    for (const before of [play([inspectStar(0)], inField), kept, cleared]) {
      const next = play(
        [
          { type: "SetLang", lang: "ja" },
          { type: "MoveHeroTo", x: 1, y: 2 },
        ],
        before,
      );
      expect(next.field).toBe(before.field);
    }
  });
});

describe("reduce: the field events (REQ-6.3 to REQ-6.7)", () => {
  it("InspectStar only looks: no star is sorted until the child gives a verdict", () => {
    const next = play([inspectStar(3)], inField);
    expect(next.field).toMatchObject({ stage: "sorting", looking: 3, note: null });
    expect(play([0, 1, 2, 3, 4].map(inspectStar), inField).field).toMatchObject({
      sorted: [false, false, false, false, false],
    });
  });

  it("SortStar with a star in the lens sorts it only with the right verdict", () => {
    // Seed 0, round 0: star 4 is the fake one.
    const looking = play([inspectStar(4)], inField);
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
    expect(reduce(inField, sortAs("real"))).toBe(inField);
    expect(reduce(inField, inspectStar(5))).toBe(inField);
    const looking = play([inspectStar(1)], inField);
    expect(reduce(looking, inspectStar(1))).toBe(looking);
    const one = play([inspectStar(1), sortAs("real")], inField);
    expect(reduce(one, inspectStar(1))).toBe(one);
  });

  it("keeps only when all five are sorted, and only the real stars", () => {
    expect(reduce(inField, keepStars)).toBe(inField);
    const almost = play(sortAll(inField).slice(2), inField);
    expect(reduce(almost, keepStars)).toBe(almost);
    expect(kept.field).toEqual({ stage: "kept", seed: 0, round: 0 });
  });

  it("the first round of a run is kept, the second clears the trial", () => {
    expect(kept.field.stage).toBe("kept");
    expect(secondRound.field).toMatchObject({ stage: "sorting", round: 1 });
    expect(cleared.field).toEqual({ stage: "cleared", seed: 0, round: 1 });
  });

  it("locks the field after the keep, and the retry starts the next round", () => {
    for (const event of [inspectStar(0), sortAs("real"), keepStars]) {
      expect(reduce(kept, event)).toBe(kept);
    }
    expect(secondRound).toEqual({ ...inField, field: { ...inField.field, round: 1 } });
    expect(reduce(inField, retryField)).toBe(inField);
  });

  it("the retry after a cleared trial starts the next run, and the table wraps", () => {
    const third = reduce(cleared, retryField);
    expect(third.field).toEqual({ ...inField.field, round: 2 });
    const fourth = play([...sortAll(third), keepStars, retryField], third);
    expect(fourth.field).toEqual({ ...inField.field, round: 3 });
    const wrapped = play([...sortAll(fourth), keepStars, retryField], fourth);
    expect(wrapped.field).toEqual(inField.field);
  });

  it("does nothing outside the field: on the title, in trial 1, in the shed and on the end screen", () => {
    const over = reduce(started, tick(balance.runMs));
    for (const state of [initialState, started, inShed, over]) {
      for (const event of [inspectStar(0), sortAs("real"), keepStars, retryField, leaveField]) {
        expect(reduce(state, event)).toBe(state);
      }
    }
  });
});

describe("reduce: leaving the field (REQ-6.7)", () => {
  it("LeaveField from the cleared trial returns to the title with the field initial", () => {
    const back = reduce(cleared, leaveField);
    expect(back).toEqual({ ...cleared, phase: "title", trial: 0, field: initialState.field });
    expect(back.run).toBe(initialState.run);
    expect(back.lane).toBe(initialState.lane);
    expect(back.shed).toBe(initialState.shed);
  });

  it("LeaveField anywhere else in the field changes nothing", () => {
    for (const state of [inField, play([inspectStar(0)], inField), sorted, kept]) {
      expect(reduce(state, leaveField)).toBe(state);
    }
  });

  it("the title after leaving opens the field again from round 0, and the lane too", () => {
    const back = reduce(cleared, leaveField);
    expect(reduce(back, { type: "StartField", seed: 3 }).field).toEqual({
      ...initialState.field,
      seed: 3,
    });
    expect(reduce(back, { type: "Start" }).trial).toBe(1);
  });
});

describe("reduce: the other trials' events and the clock leave the field alone (REQ-6.7, REQ-6.8)", () => {
  const otherEvents: GameEvent[] = [
    ...pick("red", "lantern"),
    ask,
    retry,
    tick(1_000),
    tick(balance.runMs),
    pickTool("key"),
    giveTool,
    retryShed,
  ];

  it("changes nothing in the field, whatever is sorted or kept", () => {
    const states = [inField, play([inspectStar(0)], inField), sorted, kept, cleared];
    for (const state of states) {
      for (const event of otherEvents) expect(reduce(state, event)).toBe(state);
    }
  });

  it("the clock never runs in the field: no time up, no score", () => {
    const later = play(otherEvents, inField);
    expect(later.phase).toBe("trial");
    expect(later.run).toBe(initialState.run);
    expect(later.run.remainingMs).toBe(balance.runMs);
    expect(later.run.score).toBe(0);
    expect(later.lane).toBe(initialState.lane);
    expect(later.shed).toBe(initialState.shed);
  });
});
