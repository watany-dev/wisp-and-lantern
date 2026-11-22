// Trial 4 (The Listening Shadows, spec 07-trial-keep-secrets): every state the real reducer reaches from the
// title through trial 4's button, and everything after it: the 60-second run, the six items, the end screen and
// the way back to the title.
//
// Scope (REQ-7.12.4): the entrance from the title by `StartShadows` and trial 4 after it. A `Start` from the
// title is trial 1's entrance and the entrances of trials 2 and 3 open other trials, which have their own model
// checks, so this alphabet leaves them out; the events of trials 1 to 3 that must do nothing here are in it.
// Inside a run `Start` is part of the alphabet (it must only set the language). On trial 4's end screen `Start`
// would begin trial 1, which has no way back to the title; the unit tests cover it, the alphabet does not. This
// check does not ask that every state of trials 1 to 3 can reach trial 4, and it drops no state of trial 4 to
// pass.

import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import type { GameEvent } from "../events";
import { initialField } from "../field";
import { initialLane } from "../lane";
import { reduce } from "../reducer";
import { pointsFor, type Run } from "../run";
import {
  choiceRight,
  initialShadows,
  isSecret,
  itemAt,
  itemOf,
  items,
  shadowsOutcome,
} from "../shadows";
import type { Choice } from "../shadows";
import { initialShed } from "../shed";
import { initialState, type GameState } from "../state";
import { modelChecker } from "./support/model-check";

/**
 * The real game state plus three things the game has no use for. They are an independent record of what the
 * child did, so a state invariant can tell a swapped decision, a second decision or a wrong score from the
 * right one: `expected` is the choice the child pressed in this round, `rights` the number of right decisions
 * so far (2 means "at least 2"), and `scoreOk` is false from the first step on that moved the score when it
 * should not have (a right decision moves it by exactly the points for the streak; nothing else moves it, but a
 * new run or the way back to the title setting it to 0).
 */
type Wrapped = { game: GameState; expected: Choice | null; rights: number; scoreOk: boolean };

type Step = (state: GameState, event: GameEvent) => GameState;

const running = (s: GameState) => s.phase === "trial" && s.trial === 4;

/** The choice the child pressed in this round, from the spec and not from the reducer. */
function expectedAfter(before: GameState, game: GameState, event: GameEvent, was: Choice | null) {
  const deciding = running(before) && before.shadows.stage === "deciding";
  const decided = running(before) && before.shadows.stage === "decided";
  if (deciding && event.type === "DecideItem") return event.choice;
  if (decided && event.type === "NextItem") return null;
  if (game.phase === "title" || (event.type === "StartShadows" && game !== before)) return null;
  return was;
}

/** The step made a decision, and it was right. */
function rightNow(before: GameState, game: GameState): boolean {
  const decided =
    running(before) && before.shadows.stage === "deciding" && game.shadows.stage === "decided";
  return decided && shadowsOutcome(game.shadows) === "right";
}

/** Whether the score moved as the spec says: a right decision adds the points for the streak, nothing else moves it. */
function scoreMovedRightly(before: GameState, game: GameState, event: GameEvent): boolean {
  if (event.type === "StartShadows" || event.type === "LeaveShadows") return true;
  const gained = game.run.score - before.run.score;
  return rightNow(before, game) ? gained === pointsFor(before.run.streak) : gained === 0;
}

/** Explores each state space once for this file; see `modelChecker`. */
const checkModel = modelChecker<Wrapped, GameEvent>();

/**
 * One wrapped step per game step, so that every check of the same game reuses one explored graph
 * (`checkModel` shares a graph between models with the same functions).
 */
const advanced = new Map<Step, (w: Wrapped, event: GameEvent) => Wrapped>();
function advance(step: Step) {
  let wrapped = advanced.get(step);
  if (!wrapped) {
    wrapped = wrapStep(step);
    advanced.set(step, wrapped);
  }
  return wrapped;
}

/** The wrapper's own bookkeeping, written from the spec and not from the reducer. */
function wrapStep(step: Step) {
  return (w: Wrapped, event: GameEvent): Wrapped => {
    const before = w.game;
    const game = step(before, event);
    return {
      game,
      expected: expectedAfter(before, game, event, w.expected),
      rights: rightNow(before, game) ? Math.min(2, w.rights + 1) : w.rights,
      scoreOk: w.scoreOk && scoreMovedRightly(before, game, event),
    };
  };
}

const start: Wrapped = { game: initialState, expected: null, rights: 0, scoreOk: true };

// A finite alphabet. Two hero positions stand for "anywhere"; two seeds start two different orders (the house
// key first, and the ball first); a short and a run-ending tick; and the events of the other trials that must do
// nothing here.
const seeds = [0, 1];
const enterWith = (seed: number): GameEvent => ({ type: "StartShadows", seed });
const common: readonly GameEvent[] = [
  ...seeds.map(enterWith),
  { type: "LeaveShadows" },
  { type: "SetLang", lang: "ja" },
  { type: "SetLang", lang: "en" },
  { type: "MoveHeroTo", x: 0, y: 0 },
  { type: "MoveHeroTo", x: 195, y: 612 },
  { type: "DecideItem", choice: "give" },
  { type: "DecideItem", choice: "keep" },
  { type: "NextItem" },
  { type: "PickCard", card: "red" },
  { type: "Ask" },
  { type: "Retry" },
  { type: "PickTool", tool: "key" },
  { type: "GiveTool" },
  { type: "RetryShed" },
  { type: "LeaveShed" },
  { type: "InspectStar", index: 0 },
  { type: "SortStar", verdict: "real" },
  { type: "KeepStars" },
  { type: "RetryField" },
  { type: "LeaveField" },
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
 * The alphabet with neither the clock nor the way back to the title: the run never ends and the child never
 * leaves, so trial 4's own buttons must always give a way on.
 */
const staying = (w: Wrapped) => {
  const events = common.filter((e) => e.type !== "LeaveShadows");
  return w.game.phase === "trial" ? [...events, ...inARun] : events;
};

const enter = enterWith(0);

/**
 * The states the real reducer reaches: the title (2 languages x 2 hero positions), and trial 4. Trial 4 is a
 * run in progress or its end screen, with the clock full, running or at zero, the score none or some, the
 * best none or some, the round (modulo 6), the decision, and the record flag.
 */
const EXPECTED_STATES = 2664;

const invariants: Record<string, (w: Wrapped) => boolean> = {
  "phase, trial and shadows agree: the title is trial 0, a run or its end screen is trial 4": ({
    game,
  }) =>
    (game.phase === "title" && game.trial === 0) ||
    ((game.phase === "trial" || game.phase === "over") && game.trial === 4),
  "shadows is the initial value whenever trial is not 4": ({ game }) =>
    game.trial === 4 || game.shadows === initialShadows,
  "the lane, the shed and the field stay untouched": ({ game }) =>
    game.lane === initialLane && game.shed === initialShed && game.field === initialField,
  "the clock is between 0 and 60 seconds, and the run is over exactly when it is at zero": ({
    game,
  }) =>
    game.run.remainingMs >= 0 &&
    game.run.remainingMs <= balance.runMs &&
    (game.phase === "over") === (game.run.remainingMs === 0 && game.trial === 4),
  "a decided state holds exactly the choice the child pressed": ({ game, expected }) =>
    game.shadows.stage !== "decided" || game.shadows.choice === expected,
  "the decision is right exactly when a secret was kept or a thing that is fine to give was given":
    ({ game }) =>
      game.shadows.stage !== "decided" ||
      (shadowsOutcome(game.shadows) === "right") ===
        (isSecret(itemOf(game.shadows)) === (game.shadows.choice === "keep")),
  "the score moves only on a right decision": ({ scoreOk }) => scoreOk,
};

/**
 * The run's score and the round grow without end, so they are not part of a state's identity: the score is
 * kept only as "some" or "none", the clock as full, running or at zero, and the round modulo the six items (the
 * order repeats every six rounds).
 */
function identity(w: Wrapped): string {
  const { run, shadows } = w.game;
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
      shadows: { ...shadows, round: shadows.round % items.length },
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
  checkModel({
    initial,
    events,
    step: advance(step),
    invariants: checks,
    goal,
    key: identity,
  });

const decided = (w: Wrapped) => w.game.shadows.stage === "decided";
const rightDecision = (w: Wrapped) => shadowsOutcome(w.game.shadows) === "right";
const wrongDecision = (w: Wrapped) => shadowsOutcome(w.game.shadows) === "wrong";
/** A decision of one of the four kinds: a secret or a thing that is fine to give, kept or given. */
const kindOf = (secret: boolean, choice: Choice) => (w: Wrapped) =>
  w.game.shadows.stage === "decided" &&
  isSecret(itemOf(w.game.shadows)) === secret &&
  w.game.shadows.choice === choice;
const keptSecret = kindOf(true, "keep");
const givenSecret = kindOf(true, "give");
const givenSafe = kindOf(false, "give");
const keptSafe = kindOf(false, "keep");
const freshDeciding = (w: Wrapped) => running(w.game) && w.game.shadows.stage === "deciding";
const secondRight = (w: Wrapped) => w.rights === 2;
const nextRound = (w: Wrapped) => running(w.game) && w.game.shadows.round >= 1;
const onTheTitle = (w: Wrapped) => w.game.phase === "title";
const onTheEndScreen = (w: Wrapped) => w.game.phase === "over";

/** The shortest trace to a state, from an invariant that says "never this state". */
function shortestTrace(goal: (w: Wrapped) => boolean, from: Wrapped = start): GameEvent[] | null {
  const report = model(undefined, reduce, from, { never: (w) => !goal(w) });
  return report.violations[0]?.trace ?? null;
}

const play = (...events: GameEvent[]) => events.reduce(advance(reduce), start);
const decide = (choice: Choice): GameEvent => ({ type: "DecideItem", choice });
const next: GameEvent = { type: "NextItem" };
const leave: GameEvent = { type: "LeaveShadows" };
const timeUp: GameEvent = { type: "Tick", ms: balance.runMs };

describe("trial 4, the shadows (exhaustive model check)", () => {
  it("REQ-7.12: keeps every invariant in every reachable state", () => {
    const report = model(undefined);
    expect(report.violations).toEqual([]);
    expect(report.states).toBe(EXPECTED_STATES);
  });

  it("REQ-7.7.7: from every state a right and a wrong decision are reachable (no soft-lock)", () => {
    expect(model(rightDecision).violations).toEqual([]);
    expect(model(wrongDecision).violations).toEqual([]);
  });

  it("REQ-7.3: from every state each of the four decisions is reachable: a secret kept and given, a thing that is fine to give given and kept", () => {
    for (const goal of [keptSecret, givenSecret, givenSafe, keptSafe]) {
      expect(model(goal).violations).toEqual([]);
    }
  });

  it("REQ-7.7.5: from every state the title is reachable: the way back is never lost", () => {
    expect(model(onTheTitle).violations).toEqual([]);
  });

  it("REQ-7.7.4: from every state the run can end, and the end screen can be reached", () => {
    expect(model(onTheEndScreen).violations).toEqual([]);
  });

  it("REQ-7.7: with the clock stopped, a fresh round, the next round and a second right decision are reachable from every state", () => {
    for (const goal of [freshDeciding, nextRound, secondRight]) {
      expect(model(goal, reduce, start, invariants, staying).violations).toEqual([]);
    }
  });
});

describe("trial 4: each result is reachable, and the shortest way to it", () => {
  it("a secret kept, a thing that is fine to give given and the wrong decisions take two events: the seed that starts with the item, the decision", () => {
    // Seed 0 starts with the house key (a secret), seed 1 with the ball.
    expect(shortestTrace(keptSecret)).toEqual([enter, decide("keep")]);
    expect(shortestTrace(givenSecret)).toEqual([enter, decide("give")]);
    expect(shortestTrace(givenSafe)).toEqual([enterWith(1), decide("give")]);
    expect(shortestTrace(keptSafe)).toEqual([enterWith(1), decide("keep")]);
  });

  it("the first item of each seed is the one the comment above says", () => {
    expect(itemAt(0, 0)).toBe("houseKey");
    expect(itemAt(1, 0)).toBe("ball");
    expect(choiceRight(itemAt(0, 0), "keep")).toBe(true);
    expect(choiceRight(itemAt(1, 0), "give")).toBe(true);
  });

  it("the next round and the second right decision need a next between", () => {
    // Either decision brings the next round, and the search tries "give" first.
    expect(shortestTrace(nextRound)).toEqual([enter, decide("give"), next]);
    expect(shortestTrace(secondRight)).toEqual([enter, decide("keep"), next, decide("give")]);
  });

  it("REQ-7.3.7: after a decision the next round is one event away, whichever the decision was", () => {
    for (const choice of ["give", "keep"] as const) {
      const state = play(enter, decide(choice));
      expect(decided(state)).toBe(true);
      expect(shortestTrace(freshDeciding, state)).toEqual([next]);
      const back = advance(reduce)(state, next);
      expect(back.game).toEqual({
        ...state.game,
        shadows: { stage: "deciding", seed: 0, round: 1 },
      });
    }
  });

  it("REQ-7.7.5: the title is one event away from any state of a run or the end screen", () => {
    const midway = play(enter, decide("keep"), next);
    expect(shortestTrace(onTheTitle, midway)).toEqual([leave]);
    const over = play(enter, timeUp);
    expect(over.game.phase).toBe("over");
    expect(shortestTrace(onTheTitle, over)).toEqual([leave]);
  });

  it("REQ-7.7.4: from the end screen a new run is one event away, with a full clock", () => {
    const over = play(enter, decide("keep"), timeUp);
    const again = advance(reduce)(over, enterWith(1));
    expect(again.game.phase).toBe("trial");
    expect(again.game.run).toMatchObject({ remainingMs: 60_000, score: 0, best: 100 });
    expect(again.game.shadows).toEqual({ stage: "deciding", seed: 1, round: 0 });
  });
});

// The check must fail when the rules are broken, or a passing check proves nothing. Each break is a step around
// the real `reduce`; no source is edited.
const breaks: Record<string, Step> = {
  "a secret cannot be kept": (s, e) =>
    e.type === "DecideItem" &&
    e.choice === "keep" &&
    s.shadows.stage === "deciding" &&
    isSecret(itemOf(s.shadows))
      ? s
      : reduce(s, e),
  "NextItem is ignored": (s, e) => (e.type === "NextItem" ? s : reduce(s, e)),
  "DecideItem records give whatever was pressed": (s, e) => {
    const after = reduce(s, e);
    return e.type === "DecideItem" && after.shadows.stage === "decided"
      ? { ...after, shadows: { ...after.shadows, choice: "give" } }
      : after;
  },
  "a second DecideItem changes the decision": (s, e) =>
    e.type === "DecideItem" && s.shadows.stage === "decided" && running(s)
      ? { ...s, shadows: { ...s.shadows, choice: e.choice } }
      : reduce(s, e),
  "Tick does not run the clock in trial 4": (s, e) =>
    e.type === "Tick" && s.trial === 4 ? s : reduce(s, e),
  "LeaveShadows is ignored": (s, e) => (e.type === "LeaveShadows" ? s : reduce(s, e)),
  "a wrong decision scores too": (s, e) => {
    const after = reduce(s, e);
    return e.type === "DecideItem" && shadowsOutcome(after.shadows) === "wrong"
      ? { ...after, run: { ...after.run, score: after.run.score + 100 } }
      : after;
  },
  "a right decision does not score": (s, e) => {
    const after = reduce(s, e);
    return e.type === "DecideItem" && shadowsOutcome(after.shadows) === "right"
      ? { ...after, run: s.run }
      : after;
  },
};

/**
 * A goal break is checked without the invariants and an invariant break without a goal, so each report shows
 * the one check that is meant to notice the break.
 */
const brokenReport = (
  name: string,
  goal?: (w: Wrapped) => boolean,
  events: (w: Wrapped) => readonly GameEvent[] = withClock,
) => model(goal, breaks[name], start, goal ? {} : invariants, events);

describe("trial 4: the checks fail on rules broken on purpose (REQ-7.12.4)", () => {
  it("when a secret cannot be kept, a kept secret is unreachable from every state", () => {
    const report = brokenReport("a secret cannot be kept", keptSecret);
    const [stuck] = report.violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
    expect(stuck!.state.game).toEqual(initialState);
    expect(report.violations).toHaveLength(1);
    // A thing that is fine to give can still be given, so the other decisions are still there.
    expect(brokenReport("a secret cannot be kept", givenSafe).violations).toEqual([]);
  });

  it("when NextItem is ignored, a decision is a dead end, unless the clock or the way back to the title gives a way out", () => {
    // A right decision is reachable from the title; once one decision is made there is no second one.
    const [stuck] = brokenReport("NextItem is ignored", rightDecision, staying).violations;
    expect(stuck).toMatchObject({
      kind: "stuck",
      name: "goal",
      trace: [enter, decide("give")],
    });
    expect(decided(stuck!.state)).toBe(true);
    // With the clock running or the leave allowed, there is a way out: that is why both are taken away.
    expect(brokenReport("NextItem is ignored", rightDecision).violations).toEqual([]);
  });

  it("when DecideItem records give whatever was pressed, the decided-state invariant fails", () => {
    const report = brokenReport("DecideItem records give whatever was pressed");
    const names = report.violations.map((v) => v.name);
    expect(names).toContain("a decided state holds exactly the choice the child pressed");
    const bad = report.violations.find((v) => v.name.startsWith("a decided state"))!;
    expect(bad.kind).toBe("invariant");
    expect(bad.trace).toEqual([enter, decide("keep")]);
  });

  it("when a second DecideItem changes the decision, the decided-state invariant fails", () => {
    const [bad] = brokenReport("a second DecideItem changes the decision").violations;
    expect(bad).toMatchObject({
      kind: "invariant",
      name: "a decided state holds exactly the choice the child pressed",
    });
    expect(bad!.trace).toEqual([enter, decide("give"), decide("keep")]);
  });

  it("when Tick does not run the clock in trial 4, the end screen is unreachable from every state", () => {
    const [stuck] = brokenReport(
      "Tick does not run the clock in trial 4",
      onTheEndScreen,
    ).violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
  });

  it("when LeaveShadows is ignored, the title is unreachable from trial 4", () => {
    const [stuck] = brokenReport("LeaveShadows is ignored", onTheTitle).violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [enter] });
    expect(stuck!.state.game.trial).toBe(4);
  });

  it("when a wrong decision also scores, the score invariant fails", () => {
    const [bad] = brokenReport("a wrong decision scores too").violations;
    expect(bad).toMatchObject({
      kind: "invariant",
      name: "the score moves only on a right decision",
    });
    expect(bad!.trace).toEqual([enter, decide("give")]);
  });

  it("when a right decision does not score, the score invariant fails", () => {
    const [bad] = brokenReport("a right decision does not score").violations;
    expect(bad).toMatchObject({
      kind: "invariant",
      name: "the score moves only on a right decision",
    });
    expect(bad!.trace).toEqual([enter, decide("keep")]);
  });
});
