// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import type { GameEvent } from "../events";
import {
  colors,
  delivered,
  hasPick,
  initialLane,
  isComplete,
  outcome,
  things,
  wishAt,
} from "../lane";
import { reduce } from "../reducer";
import { initialState, type GameState } from "../state";
import { checkModel } from "./support/model-check";

// A finite alphabet that still reaches every phase and language: two hero positions stand for
// "anywhere", since the reducer treats every position the same way.
const alphabet: readonly GameEvent[] = [
  { type: "Start" },
  { type: "Start", lang: "ja" },
  { type: "SetLang", lang: "ja" },
  { type: "SetLang", lang: "en" },
  { type: "MoveHeroTo", x: 0, y: 0 },
  { type: "MoveHeroTo", x: 195, y: 612 },
];

describe("reduce (exhaustive model check)", () => {
  it("keeps the invariants in every reachable state and can always reach a trial", () => {
    const report = checkModel<GameState, GameEvent>({
      initial: initialState,
      events: () => alphabet,
      step: reduce,
      invariants: {
        "phase is title, trial or over": (s) => ["title", "trial", "over"].includes(s.phase),
        "trial is not negative": (s) => s.trial >= 0,
      },
      goal: (s) => s.phase === "trial",
    });
    expect(report.violations).toEqual([]);
    // 2 phases x 2 languages x 2 positions.
    expect(report.states).toBe(8);
  });
});

// Trial 1: every state the real reducer reaches through the lane events (REQ-2.8).
// Two hero positions stand for "anywhere"; five cards cover both rows; `Retry` and `Ask` are
// repeated by the search itself, so "tap twice" and "tap too early" are in the alphabet.
const laneAlphabet: readonly GameEvent[] = [
  { type: "Start" },
  { type: "SetLang", lang: "ja" },
  { type: "SetLang", lang: "en" },
  { type: "MoveHeroTo", x: 0, y: 0 },
  ...colors.map((card): GameEvent => ({ type: "PickCard", card })),
  ...things.map((card): GameEvent => ({ type: "PickCard", card })),
  { type: "Ask" },
  { type: "Retry" },
];

/**
 * Trial 1 is checked without the run: the score and the streak grow with every find, so they would
 * make the state space endless. The run has its own model check below.
 */
const laneKey = (s: GameState) => JSON.stringify({ ...s, run: null });

const laneInvariants: Record<string, (s: GameState) => boolean> = {
  "the title has trial 0 and an untouched lane": (s) =>
    s.phase !== "title" || (s.trial === 0 && s.lane === initialLane),
  "a trial is trial 1": (s) => s.phase !== "trial" || s.trial === 1,
  "the wish is an index into the wishes": (s) =>
    Number.isInteger(s.lane.wish) && s.lane.wish >= 0 && s.lane.wish < balance.wishes.length,
  "a search has at least one card": (s) => !s.lane.asked || hasPick(s.lane.pick),
};

const lane = (events: readonly GameEvent[], goal: (s: GameState) => boolean) =>
  checkModel<GameState, GameEvent>({
    initial: initialState,
    events: () => events,
    step: reduce,
    invariants: laneInvariants,
    goal,
    key: laneKey,
  });

/** A search for a request with exactly one card, and the wisp brought what the rule says. */
const oneCardResult = (card: "color" | "thing") => (s: GameState) => {
  const { pick } = s.lane;
  const item = delivered(s.lane);
  const keptOnly =
    card === "color"
      ? pick.color !== null && pick.thing === null
      : pick.color === null && pick.thing !== null;
  return (
    item !== null &&
    keptOnly &&
    item[card] === pick[card] &&
    outcome(s.lane) === "wrong" &&
    item[card === "color" ? "thing" : "color"] !==
      wishAt(s.lane.wish)[card === "color" ? "thing" : "color"]
  );
};

/** The state after these events from the start. */
const play = (...events: GameEvent[]) => events.reduce(reduce, initialState);

/** The rule of 02-trial-tell: Ask is ignored unless both cards are picked. */
const oldStep = (s: GameState, e: GameEvent) =>
  e.type === "Ask" && !isComplete(s.lane.pick) ? s : reduce(s, e);

describe("reduce, trial 1 (exhaustive model check)", () => {
  it("REQ-2.8: from every state the right result is still reachable", () => {
    const report = lane(laneAlphabet, (s) => outcome(s.lane) === "right");
    expect(report.violations).toEqual([]);
    // Title (2 languages x 2 hero positions) plus the trial: 6 wishes x (12 picks + 11 searches).
    // A pick has a color or none (4) and an object or none (3); a search needs at least one card.
    expect(report.states).toBe(4 + 2 * 2 * 6 * (12 + 11));
  });

  it("REQ-2.7, REQ-2.8: from every state, including after a different request, choosing is reachable", () => {
    const report = lane(laneAlphabet, (s) => s.phase === "trial" && !s.lane.asked);
    expect(report.violations).toEqual([]);
  });

  it("the check is load-bearing: without Retry a different request is a soft-lock", () => {
    const withoutRetry = laneAlphabet.filter((e) => e.type !== "Retry");
    const report = lane(withoutRetry, (s) => outcome(s.lane) === "right");
    const [stuck] = report.violations;
    expect(report.violations).toHaveLength(1);
    expect(stuck?.kind).toBe("stuck");
    expect(outcome(stuck!.state.lane)).toBe("wrong");
    expect(stuck!.trace.at(-1)).toEqual({ type: "Ask" });
  });
});

describe("reduce, a request with one card (exhaustive model check)", () => {
  it.each(["color", "thing"] as const)(
    "REQ-3.1, REQ-3.8: from every state a result for a request with only the %s is reachable",
    (card) => {
      const report = lane(laneAlphabet, oneCardResult(card));
      expect(report.violations).toEqual([]);
      expect(report.states).toBe(556);
    },
  );

  it("REQ-3.4.3, REQ-3.4.5: from a color-only result the child can retry and then find the wish", () => {
    const afterVague = play({ type: "Start" }, { type: "PickCard", card: "red" }, { type: "Ask" });
    expect(oneCardResult("color")(afterVague)).toBe(true);
    for (const goal of [
      (s: GameState) => outcome(s.lane) === "right",
      (s: GameState) => !s.lane.asked,
    ]) {
      const report = checkModel<GameState, GameEvent>({
        initial: afterVague,
        events: () => laneAlphabet,
        step: reduce,
        invariants: laneInvariants,
        goal,
        key: laneKey,
      });
      expect(report.violations).toEqual([]);
    }
  });
});

describe("the one-card goals are load-bearing (REQ-3.8.3)", () => {
  it.each(["color", "thing"] as const)(
    "with the old ask rule no result for only the %s is reachable",
    (card) => {
      const report = checkModel<GameState, GameEvent>({
        initial: initialState,
        events: () => laneAlphabet,
        step: oldStep,
        invariants: {},
        goal: oneCardResult(card),
        key: laneKey,
      });
      // Every state is stuck; the first one reported is the start, which no event leads out of.
      expect(report.violations).toHaveLength(1);
      expect(report.violations[0]).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
      expect(report.violations[0]!.state).toEqual(initialState);
    },
  );

  it("the counterexample for the old rule: after a color is picked, no one-card result can follow", () => {
    const redPicked = play({ type: "Start" }, { type: "PickCard", card: "red" });
    const model = {
      initial: redPicked,
      events: () => [{ type: "Ask" } as const],
      invariants: {},
      goal: oneCardResult("color"),
      key: laneKey,
    };
    const old = checkModel<GameState, GameEvent>({ ...model, step: oldStep });
    expect(old.states).toBe(1);
    expect(old.violations).toEqual([{ kind: "stuck", name: "goal", state: redPicked, trace: [] }]);
    // The same start and the same single event under the new rule reach the result.
    const fixed = checkModel<GameState, GameEvent>({ ...model, step: reduce });
    expect(fixed.states).toBe(2);
    expect(fixed.violations).toEqual([]);
  });
});

// A 60-second run (spec 04-score-attack): every state through the lane events, the clock in steps of
// a third of the run, and a restart. The score is left out of the key, as in the trial 1 checks.
const runAlphabet: readonly GameEvent[] = [
  ...laneAlphabet,
  { type: "Start", lang: "ja" },
  { type: "Tick", ms: balance.runMs / 3 },
];
const runKey = (s: GameState) => JSON.stringify({ ...s, run: { remainingMs: s.run.remainingMs } });
const runModel = (goal: (s: GameState) => boolean) =>
  checkModel<GameState, GameEvent>({
    initial: initialState,
    events: () => runAlphabet,
    step: reduce,
    invariants: {
      "a trial has time left": (s) => s.phase !== "trial" || s.run.remainingMs > 0,
      "the end screen has no time left": (s) => s.phase !== "over" || s.run.remainingMs === 0,
      "the clock is within the run": (s) =>
        s.run.remainingMs >= 0 && s.run.remainingMs <= balance.runMs,
    },
    goal,
    key: runKey,
  });

describe("reduce, a 60-second run (exhaustive model check)", () => {
  it("REQ-4.5: from every state the run can end, however the child played", () => {
    const report = runModel((s) => s.phase === "over");
    expect(report.violations).toEqual([]);
    expect(report.states).toBeGreaterThan(1_000);
  });

  it("REQ-4.6: from every state, including the end screen, a new run with a full clock can begin", () => {
    const report = runModel(
      (s) => s.phase === "trial" && s.run.remainingMs === balance.runMs && !s.lane.asked,
    );
    expect(report.violations).toEqual([]);
  });

  it("the check is load-bearing: without Start the end screen is a soft-lock (the child could never play again)", () => {
    const withoutStart = runAlphabet.filter((e) => e.type !== "Start");
    const report = checkModel<GameState, GameEvent>({
      initial: reduce(initialState, { type: "Start" }),
      events: () => withoutStart,
      step: reduce,
      invariants: {},
      goal: (s) => s.phase === "trial" && !s.lane.asked,
      key: runKey,
    });
    const [stuck] = report.violations;
    expect(stuck?.kind).toBe("stuck");
    expect(stuck?.state.phase).toBe("over");
  });
});
