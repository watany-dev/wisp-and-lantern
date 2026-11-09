// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import type { GameEvent } from "../events";
import { colors, initialLane, isComplete, outcome, things } from "../lane";
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
  { type: "MoveHeroTo", x: 195, y: 600 },
];

describe("reduce (exhaustive model check)", () => {
  it("keeps the invariants in every reachable state and can always reach a trial", () => {
    const report = checkModel<GameState, GameEvent>({
      initial: initialState,
      events: () => alphabet,
      step: reduce,
      invariants: {
        "phase is title or trial": (s) => s.phase === "title" || s.phase === "trial",
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

const laneInvariants: Record<string, (s: GameState) => boolean> = {
  "the title has trial 0 and an untouched lane": (s) =>
    s.phase !== "title" || (s.trial === 0 && s.lane === initialLane),
  "a trial is trial 1": (s) => s.phase !== "trial" || s.trial === 1,
  "the wish is an index into the wishes": (s) =>
    Number.isInteger(s.lane.wish) && s.lane.wish >= 0 && s.lane.wish < balance.wishes.length,
  "a search has a complete pick": (s) => !s.lane.asked || isComplete(s.lane.pick),
};

const lane = (events: readonly GameEvent[], goal: (s: GameState) => boolean) =>
  checkModel<GameState, GameEvent>({
    initial: initialState,
    events: () => events,
    step: reduce,
    invariants: laneInvariants,
    goal,
  });

describe("reduce, trial 1 (exhaustive model check)", () => {
  it("REQ-2.8: from every state the right result is still reachable", () => {
    const report = lane(laneAlphabet, (s) => outcome(s.lane) === "right");
    expect(report.violations).toEqual([]);
    // Title (2 languages x 2 hero positions) plus the trial: 3 wishes x (12 picks + 6 searches).
    expect(report.states).toBe(4 + 2 * 2 * 3 * 18);
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
