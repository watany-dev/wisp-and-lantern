// Trial 2 (The Locked Shed, spec 05-trial-grant-tools, revision 2): every state the real reducer reaches
// from the title through the shed button, and everything after it: the 60-second run, the five puzzles,
// the end screen and the way back to the title.
//
// Scope (REQ-5.13.4): the entrance from the title by `StartShed` and the shed after it. A `Start` from
// the title is trial 1's entrance and has its own model check, so this alphabet leaves it out; inside a
// run `Start` is part of the alphabet (it must only set the language). On the shed's end screen `Start`
// would begin trial 1, which has no way back to the title; the unit tests cover it, the alphabet does
// not. This check does not ask that every state of trial 1 can reach the shed, and it drops no state of
// the shed to pass.

import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import type { GameEvent } from "../events";
import { initialLane } from "../lane";
import { reduce } from "../reducer";
import { pointsFor, type Run } from "../run";
import { answerOf, initialShed, puzzleAt, puzzles, shedOutcome, tools, type ToolId } from "../shed";
import { initialState, type GameState } from "../state";
import { checkModel } from "./support/model-check";

/**
 * The real game state plus three things the game has no use for. They are an independent record of
 * what the child did, so a state invariant can tell a swapped tool, a second tool or a wrong score from
 * the right one: `expected` is the tool the child last picked in this attempt, `plays` the number of
 * freed cats so far (2 means "at least 2"), and `scoreOk` is false from the first step on that moved
 * the score when it should not have (a freed cat moves it by exactly the points for the streak; nothing
 * else moves it, but a new run or the way back to the title setting it to 0).
 */
type Wrapped = { game: GameState; expected: ToolId | null; plays: number; scoreOk: boolean };

type Step = (state: GameState, event: GameEvent) => GameState;

const running = (s: GameState) => s.phase === "trial" && s.trial === 2;

/** The tool the child last picked in this attempt, from the spec and not from the reducer. */
function expectedAfter(before: GameState, game: GameState, event: GameEvent, was: ToolId | null) {
  const choosing = running(before) && before.shed.stage === "choosing";
  const tried = running(before) && before.shed.stage === "tried";
  if (choosing && event.type === "PickTool") return event.tool;
  if (tried && event.type === "RetryShed") return null;
  if (game.phase === "title" || (event.type === "StartShed" && game !== before)) return null;
  return was;
}

/** Whether the score moved as the spec says: a freed cat adds the points for the streak, nothing else moves it. */
function scoreMovedRightly(before: GameState, game: GameState, event: GameEvent): boolean {
  if (event.type === "StartShed" || event.type === "LeaveShed") return true;
  const gained = game.run.score - before.run.score;
  return freedNow(before, game) ? gained === pointsFor(before.run.streak) : gained === 0;
}

/** The step handed a tool over and the cat was freed. */
function freedNow(before: GameState, game: GameState): boolean {
  const handed = running(before) && before.shed.stage === "choosing" && game.shed.stage === "tried";
  return handed && shedOutcome(game.shed) === "freed";
}

/** The wrapper's own bookkeeping, written from the spec and not from the reducer. */
function advance(step: Step) {
  return (w: Wrapped, event: GameEvent): Wrapped => {
    const before = w.game;
    const game = step(before, event);
    return {
      game,
      expected: expectedAfter(before, game, event, w.expected),
      plays: freedNow(before, game) ? Math.min(2, w.plays + 1) : w.plays,
      scoreOk: w.scoreOk && scoreMovedRightly(before, game, event),
    };
  };
}

const start: Wrapped = { game: initialState, expected: null, plays: 0, scoreOk: true };

// A finite alphabet. Two hero positions stand for "anywhere"; five seeds start the order at each of the
// five puzzles; a short and a run-ending tick; one card of trial 1 and the events of trial 1 that must do
// nothing here.
const seeds = [0, 1, 2, 3, 4];
const enterWith = (seed: number): GameEvent => ({ type: "StartShed", seed });
const common: readonly GameEvent[] = [
  ...seeds.map(enterWith),
  { type: "LeaveShed" },
  { type: "SetLang", lang: "ja" },
  { type: "SetLang", lang: "en" },
  { type: "MoveHeroTo", x: 0, y: 0 },
  { type: "MoveHeroTo", x: 195, y: 612 },
  ...tools.map((tool): GameEvent => ({ type: "PickTool", tool })),
  { type: "GiveTool" },
  { type: "RetryShed" },
  { type: "PickCard", card: "red" },
  { type: "Ask" },
  { type: "Retry" },
];
const ticks: readonly GameEvent[] = [
  { type: "Tick", ms: 1_000 },
  { type: "Tick", ms: balance.runMs },
];
const inARun: readonly GameEvent[] = [{ type: "Start" }, { type: "Start", lang: "ja" }];

/** The alphabet with the clock: a run can end, so the end screen is reachable. */
const withClock = (w: Wrapped) =>
  w.game.phase === "trial" ? [...common, ...ticks, ...inARun] : [...common, ...ticks];
/**
 * The alphabet with neither the clock nor the way back to the title: the run never ends and the child
 * never leaves, so the shed's own buttons must always give a way on.
 */
const staying = (w: Wrapped) => {
  const events = common.filter((e) => e.type !== "LeaveShed");
  return w.game.phase === "trial" ? [...events, ...inARun] : events;
};

const enter = enterWith(0);

/**
 * The states the real reducer reaches: the title (2 languages x 2 hero positions), and the shed. The shed
 * is a run in progress or its end screen, with the clock full, running or at zero, the score none or
 * some, the best none or some, the round (modulo 5), the pick or the tried tool, and the record flag.
 */
const EXPECTED_STATES = 9400;

const invariants: Record<string, (w: Wrapped) => boolean> = {
  "phase, trial and shed agree: the title is trial 0, a run or its end screen is trial 2": ({
    game,
  }) =>
    (game.phase === "title" && game.trial === 0) ||
    ((game.phase === "trial" || game.phase === "over") && game.trial === 2),
  "shed is the initial shed whenever trial is not 2": ({ game }) =>
    game.trial === 2 || game.shed === initialShed,
  "the lane stays untouched": ({ game }) => game.lane === initialLane,
  "the clock is between 0 and 60 seconds, and the run is over exactly when it is at zero": ({
    game,
  }) =>
    game.run.remainingMs >= 0 &&
    game.run.remainingMs <= balance.runMs &&
    (game.phase === "over") === (game.run.remainingMs === 0 && game.trial === 2),
  "a choosing state holds exactly the tool the child last picked": ({ game, expected }) =>
    game.shed.stage !== "choosing" || game.shed.pick === expected,
  "a tried state holds exactly the tool that was handed over": ({ game, expected }) =>
    game.shed.stage !== "tried" || game.shed.tool === expected,
  "the cat is freed exactly when the tried tool is the answer to the round's puzzle": ({ game }) =>
    game.shed.stage !== "tried" ||
    (shedOutcome(game.shed) === "freed") ===
      (game.shed.tool === answerOf(puzzleAt(game.shed.seed, game.shed.round))),
  "the score moves only on a hand-over that frees the cat": ({ scoreOk }) => scoreOk,
};

/**
 * The run's score and the round grow without end, so they are not part of a state's identity: the
 * score is kept only as "some" or "none", the clock as full, running or at zero, and the round modulo
 * the five puzzles (the order repeats every five rounds).
 */
function identity(w: Wrapped): string {
  const { run, shed } = w.game;
  const clock =
    run.remainingMs === balance.runMs ? "full" : run.remainingMs > 0 ? "running" : "zero";
  const abstract: Run = {
    remainingMs: 0,
    score: Number(run.score > 0),
    streak: 0,
    best: Number(run.best > 0),
    record: run.record,
  };
  return JSON.stringify({
    ...w,
    game: {
      ...w.game,
      run: { ...abstract, clock },
      shed: { ...shed, round: shed.round % puzzles.length },
    },
  });
}

const model = (
  goal: ((w: Wrapped) => boolean) | undefined,
  step: Step = reduce,
  initial: Wrapped = start,
  checks = invariants,
  events: (w: Wrapped) => readonly GameEvent[] = withClock,
) =>
  checkModel<Wrapped, GameEvent>({
    initial,
    events,
    step: advance(step),
    invariants: checks,
    goal,
    key: identity,
  });

const freedCat = (w: Wrapped) => shedOutcome(w.game.shed) === "freed";
const freedWith = (tool: ToolId) => (w: Wrapped) =>
  freedCat(w) && w.game.shed.stage === "tried" && w.game.shed.tool === tool;
const stuckWith = (tool: ToolId) => (w: Wrapped) =>
  shedOutcome(w.game.shed) === "stuck" &&
  w.game.shed.stage === "tried" &&
  w.game.shed.tool === tool;
const freshChoosing = (w: Wrapped) =>
  running(w.game) && w.game.shed.stage === "choosing" && w.game.shed.pick === null;
const secondFreed = (w: Wrapped) => w.plays === 2;
const nextRound = (w: Wrapped) => running(w.game) && w.game.shed.round >= 1;
const onTheTitle = (w: Wrapped) => w.game.phase === "title";
const onTheEndScreen = (w: Wrapped) => w.game.phase === "over";

/** The shortest trace to a state, from an invariant that says "never this state". */
function shortestTrace(goal: (w: Wrapped) => boolean, from: Wrapped = start): GameEvent[] | null {
  const report = model(undefined, reduce, from, { never: (w) => !goal(w) });
  return report.violations[0]?.trace ?? null;
}

const play = (...events: GameEvent[]) => events.reduce(advance(reduce), start);
const pick = (tool: ToolId): GameEvent => ({ type: "PickTool", tool });
const give: GameEvent = { type: "GiveTool" };
const retry: GameEvent = { type: "RetryShed" };
const leave: GameEvent = { type: "LeaveShed" };
const timeUp: GameEvent = { type: "Tick", ms: balance.runMs };

describe("trial 2, the shed (exhaustive model check)", () => {
  it("REQ-5.13: keeps every invariant in every reachable state", () => {
    const report = model(undefined);
    expect(report.violations).toEqual([]);
    expect(report.states).toBe(EXPECTED_STATES);
  });

  it("REQ-5.6.4: from every state a freed cat is reachable (no soft-lock), with every tool", () => {
    expect(model(freedCat).violations).toEqual([]);
    for (const tool of tools) expect(model(freedWith(tool)).violations, tool).toEqual([]);
  });

  it("REQ-5.16: from every state the title is reachable: the way back is never lost", () => {
    expect(model(onTheTitle).violations).toEqual([]);
  });

  it("REQ-5.7: from every state the run can end, and the end screen can be reached", () => {
    expect(model(onTheEndScreen).violations).toEqual([]);
  });

  it("REQ-5.6, REQ-5.7: with the clock stopped, a fresh choosing, the next round and a second freed cat are reachable from every state", () => {
    for (const goal of [freshChoosing, nextRound, secondFreed]) {
      expect(model(goal, reduce, start, invariants, staying).violations).toEqual([]);
    }
  });
});

describe("trial 2: each result is reachable, and the shortest way to it", () => {
  it("a freed cat with each tool takes three events: the seed that starts with its puzzle, the pick, the hand-over", () => {
    tools.forEach((tool, i) => {
      expect(shortestTrace(freedWith(tool)), tool).toEqual([enterWith(i), pick(tool), give]);
    });
  });

  it("a stuck result with each tool takes three events too, with a seed whose first puzzle is another one", () => {
    for (const tool of tools) {
      const trace = shortestTrace(stuckWith(tool))!;
      expect(trace, tool).toHaveLength(3);
      expect(trace.slice(1), tool).toEqual([pick(tool), give]);
      expect(trace[0]).toMatchObject({ type: "StartShed" });
    }
  });

  it("the puzzle each seed starts with has the tool of the same name as its answer", () => {
    expect(puzzles.map((_, i) => answerOf(puzzleAt(i, 0)))).toEqual([...tools]);
  });

  it("the next round and the second freed cat need a retry between", () => {
    expect(shortestTrace(nextRound)).toEqual([enter, pick("key"), give, retry]);
    expect(shortestTrace(secondFreed)).toEqual([
      enter,
      pick("key"),
      give,
      retry,
      pick("broom"),
      give,
    ]);
  });

  it("REQ-5.6.2: from a stuck result one retry returns to the same puzzle, nothing else changed", () => {
    for (const tool of ["broom", "hammer", "scissors", "ladder"] as const) {
      const stuck = play(enter, pick(tool), give);
      expect(shedOutcome(stuck.game.shed)).toBe("stuck");
      expect(shortestTrace(freshChoosing, stuck)).toEqual([retry]);
      const back = advance(reduce)(stuck, retry);
      expect(back.game).toEqual({ ...stuck.game, shed: initialShed });
    }
  });

  it("REQ-5.16: the title is one event away from any state of a run or the end screen", () => {
    const midway = play(enter, pick("key"), give, retry, pick("broom"));
    expect(shortestTrace(onTheTitle, midway)).toEqual([leave]);
    const over = play(enter, timeUp);
    expect(over.game.phase).toBe("over");
    expect(shortestTrace(onTheTitle, over)).toEqual([leave]);
  });

  it("REQ-5.7.5: from the end screen a new run is one event away, with a full clock", () => {
    const over = play(enter, pick("key"), give, timeUp);
    const again = advance(reduce)(over, enterWith(3));
    expect(again.game.phase).toBe("trial");
    expect(again.game.run).toMatchObject({ remainingMs: 60_000, score: 0, best: 100 });
    expect(again.game.shed).toEqual({ stage: "choosing", seed: 3, round: 0, pick: null });
  });
});

// The check must fail when the rules are broken, or a passing check proves nothing. Each break is a
// step around the real `reduce`; no source is edited.
const breaks: Record<string, Step> = {
  "the answer's hand-over is ignored": (s, e) =>
    e.type === "GiveTool" &&
    s.shed.stage === "choosing" &&
    s.shed.pick !== null &&
    s.shed.pick === answerOf(puzzleAt(s.shed.seed, s.shed.round))
      ? s
      : reduce(s, e),
  "RetryShed is ignored": (s, e) => (e.type === "RetryShed" ? s : reduce(s, e)),
  "RetryShed is ignored after a freed cat": (s, e) =>
    e.type === "RetryShed" && s.shed.stage === "tried" && shedOutcome(s.shed) === "freed"
      ? s
      : reduce(s, e),
  "GiveTool hands over the key whatever was picked": (s, e) => {
    const next = reduce(s, e);
    return e.type === "GiveTool" && next.shed.stage === "tried"
      ? { ...next, shed: { ...next.shed, tool: "key" } }
      : next;
  },
  "PickTool keeps the first pick": (s, e) =>
    e.type === "PickTool" && s.shed.stage === "choosing" && s.shed.pick !== null ? s : reduce(s, e),
  "Tick does not run the clock in the shed": (s, e) =>
    e.type === "Tick" && s.trial === 2 ? s : reduce(s, e),
  "LeaveShed is ignored": (s, e) => (e.type === "LeaveShed" ? s : reduce(s, e)),
  "a hand-over that leaves the cat stuck scores too": (s, e) => {
    const next = reduce(s, e);
    return e.type === "GiveTool" && shedOutcome(next.shed) === "stuck"
      ? { ...next, run: { ...next.run, score: next.run.score + 100 } }
      : next;
  },
};

/**
 * A goal break is checked without the invariants and an invariant break without a goal, so each report
 * shows the one check that is meant to notice the break.
 */
const brokenReport = (
  name: string,
  goal?: (w: Wrapped) => boolean,
  events: (w: Wrapped) => readonly GameEvent[] = withClock,
) => model(goal, breaks[name], start, goal ? {} : invariants, events);

describe("trial 2: the checks fail on rules broken on purpose (REQ-5.13.4)", () => {
  it("when the answer cannot be handed over, a freed cat is unreachable from every state", () => {
    const report = brokenReport("the answer's hand-over is ignored", freedCat);
    const [stuck] = report.violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
    expect(stuck!.state.game).toEqual(initialState);
    expect(report.violations).toHaveLength(1);
  });

  it("when RetryShed is ignored, a stuck result is a dead end, unless the clock or the way back to the title gives a way out", () => {
    const [stuck] = brokenReport("RetryShed is ignored", freedCat, staying).violations;
    expect(stuck).toMatchObject({
      kind: "stuck",
      name: "goal",
      trace: [enter, pick("broom"), give],
    });
    expect(shedOutcome(stuck!.state.game.shed)).toBe("stuck");
    // With the clock running or the leave allowed, there is a way out: that is why both are taken away.
    expect(brokenReport("RetryShed is ignored", freedCat).violations).toEqual([]);
  });

  it("when RetryShed is ignored after a freed cat, the next round is unreachable (the first freed cat still is)", () => {
    const name = "RetryShed is ignored after a freed cat";
    const [fromStart] = brokenReport(name, nextRound, staying).violations;
    expect(fromStart).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
    expect(brokenReport(name, freedCat, staying).violations).toEqual([]);
    const won = play(enter, pick("key"), give);
    const [stuck] = model(nextRound, breaks[name], won, {}, staying).violations;
    expect(stuck).toMatchObject({ kind: "stuck", trace: [] });
    expect(stuck!.state.game.shed.stage).toBe("tried");
  });

  it("when GiveTool hands over the key whatever was picked, the tried-tool invariant fails", () => {
    const report = brokenReport("GiveTool hands over the key whatever was picked");
    const names = report.violations.map((v) => v.name);
    expect(names).toContain("a tried state holds exactly the tool that was handed over");
    const bad = report.violations.find((v) => v.name.startsWith("a tried state"))!;
    expect(bad.kind).toBe("invariant");
    expect(bad.trace).toEqual([enter, pick("broom"), give]);
  });

  it("when PickTool keeps the first pick, the pick invariant fails", () => {
    const [bad] = brokenReport("PickTool keeps the first pick").violations;
    expect(bad).toMatchObject({
      kind: "invariant",
      name: "a choosing state holds exactly the tool the child last picked",
    });
    expect(bad!.trace).toEqual([enter, pick("key"), pick("broom")]);
  });

  it("when Tick does not run the clock in the shed, the end screen is unreachable from every state", () => {
    const [stuck] = brokenReport(
      "Tick does not run the clock in the shed",
      onTheEndScreen,
    ).violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
  });

  it("when LeaveShed is ignored, the title is unreachable from the shed", () => {
    const [stuck] = brokenReport("LeaveShed is ignored", onTheTitle).violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [enter] });
    expect(stuck!.state.game.trial).toBe(2);
  });

  it("when a stuck hand-over also scores, the score invariant fails", () => {
    const [bad] = brokenReport("a hand-over that leaves the cat stuck scores too").violations;
    expect(bad).toMatchObject({
      kind: "invariant",
      name: "the score moves only on a hand-over that frees the cat",
    });
    expect(bad!.trace).toEqual([enter, pick("broom"), give]);
  });
});
