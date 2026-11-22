// Trial 4 (The Listening Shadows, spec 07-trial-keep-secrets): every state the real reducer reaches from the
// title through the bag button, and everything after it: the 60-second run, the rounds, the hand-overs and the
// secrets held back, the score, the end screen and the way back to the title.
//
// Scope (REQ-7.12.4): the entrance from the title by `StartBag` (two seeds), the bag after it and the leave. A
// `Start`, a `StartShed` or a `StartField` from the title is another trial's entrance and has its own model check,
// so the title's alphabet leaves them out; inside a run they are part of the alphabet (`Start` must only set the
// language, the other two must do nothing). On the bag's end screen `Start` would begin trial 1, which has no way
// back to the title; the unit tests cover it, the alphabet does not. This check does not ask that every state of
// trials 1 to 3 can reach the bag, and it drops no state of the bag to pass.

import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import { givenItems, initialBag } from "../bag";
import type { GameEvent } from "../events";
import { initialField } from "../field";
import { initialLane } from "../lane";
import { reduce } from "../reducer";
import { pointsFor } from "../run";
import { initialShed } from "../shed";
import { initialState, type GameState } from "../state";
import { modelChecker } from "./support/model-check";

/**
 * This test's own copy of where the secrets are in the two seeds the alphabet uses, written from the spec's
 * table and not read from the source, so a change to the way the things are chosen fails here. Four rounds per
 * seed.
 */
const secretPlaces: Record<number, readonly (readonly number[])[]> = {
  0: [[1], [1, 2], [0], [2, 3]],
  1: [[1], [0, 3], [3], [2, 3]],
};
const seeds = [0, 1];
const places = [0, 1, 2, 3, 4];

/**
 * What the child did, as an independent record written from the spec and not from the reducer: the round, the
 * things handed over and the last thing tapped. `null` is the title.
 */
type Done = {
  stage: "giving" | "done";
  seed: number;
  round: number;
  given: boolean[];
  last: number | null;
};

/**
 * The real game state plus three things the game has no use for, an independent record of what happened:
 * `record` is what the child did in the bag, `left` the milliseconds left on the clock (the alphabet's ticks make
 * it 60 000, 30 000 or 0), and `scoreOk` is false from the first step on that moved the score or the streak when
 * it should not have (a safe hand-over adds the points for the streak and extends it, a secret tap ends the
 * streak, nothing else moves them but a new run or the way back to the title).
 */
type Wrapped = { game: GameState; record: Done | null; left: number; scoreOk: boolean };
type Step = (state: GameState, event: GameEvent) => GameState;

const isPlace = (i: number) => Number.isInteger(i) && i >= 0 && i <= 4;
const secretIn = (d: Pick<Done, "seed" | "round">, i: number) =>
  secretPlaces[d.seed]![d.round]!.includes(i);
const fresh = (seed: number, round: number): Done => ({
  stage: "giving",
  seed,
  round,
  given: [false, false, false, false, false],
  last: null,
});

/** A tap on a thing still with the child: a safe thing is handed over, a secret only noted. */
function giving(d: Done, event: GameEvent): Done {
  if (event.type !== "GiveItem" || !isPlace(event.index) || d.given[event.index]) return d;
  const i = event.index;
  if (secretIn(d, i)) return { ...d, last: i };
  const given = d.given.map((g, k) => g || k === i);
  const left = places.some((k) => !given[k] && !secretIn(d, k));
  return left ? { ...d, given, last: i } : { ...d, stage: "done", given, last: null };
}

/** The record's own bookkeeping, written from the spec and not from the reducer. */
function bookkeep(w: Wrapped, event: GameEvent): Pick<Wrapped, "record" | "left"> {
  const { record, left } = w;
  const full = balance.runMs;
  if (event.type === "StartBag") {
    return record === null || left === 0 ? { record: fresh(event.seed, 0), left: full } : w;
  }
  if (record === null) return w;
  if (event.type === "LeaveBag") return { record: null, left: full };
  // The end screen takes nothing else.
  if (left === 0) return w;
  if (event.type === "Tick") return { record, left: Math.max(0, left - Math.max(0, event.ms)) };
  if (record.stage === "giving") return { record: giving(record, event), left };
  if (event.type === "RetryBag")
    return { record: fresh(record.seed, (record.round + 1) % 4), left };
  return w;
}

/** Whether a step began a new run (the entrance, play again) or left the bag: the run starts over. */
function restartsRun(before: Wrapped, event: GameEvent): boolean {
  const { record, left } = before;
  if (event.type === "StartBag") return record === null || left === 0;
  return event.type === "LeaveBag" && record !== null;
}

/** Whether a tap while the clock runs is a safe hand-over (`true`), a secret (`false`) or nothing (`null`). */
function tapKind(before: Wrapped, event: GameEvent): boolean | null {
  const { record, left } = before;
  if (event.type !== "GiveItem" || record === null || left === 0) return null;
  if (record.stage !== "giving" || !isPlace(event.index) || record.given[event.index]) return null;
  return !secretIn(record, event.index);
}

/** Whether the score and the streak moved as the spec says, from the record before the step. */
function scoreMovedRightly(before: Wrapped, game: GameState, event: GameEvent): boolean {
  const was = before.game.run;
  const now = game.run;
  if (restartsRun(before, event)) return now.score === 0 && now.streak === 0;
  const safe = tapKind(before, event);
  if (safe === null) return now.score === was.score && now.streak === was.streak;
  return safe
    ? now.score === was.score + pointsFor(was.streak) && now.streak === was.streak + 1
    : now.score === was.score && now.streak === 0;
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

function wrapStep(step: Step) {
  return (w: Wrapped, event: GameEvent): Wrapped => {
    const game = step(w.game, event);
    return { game, ...bookkeep(w, event), scoreOk: w.scoreOk && scoreMovedRightly(w, game, event) };
  };
}

const start: Wrapped = { game: initialState, record: null, left: balance.runMs, scoreOk: true };

// A finite alphabet. Two hero positions stand for "anywhere"; a half-run tick and a run-ending one; every
// place, and two indexes that are not things; the events of trials 1 to 3 that must do nothing here.
const common: readonly GameEvent[] = [
  ...seeds.map((seed): GameEvent => ({ type: "StartBag", seed })),
  { type: "SetLang", lang: "ja" },
  { type: "SetLang", lang: "en" },
  { type: "MoveHeroTo", x: 0, y: 0 },
  { type: "MoveHeroTo", x: 195, y: 612 },
  ...places.map((index): GameEvent => ({ type: "GiveItem", index })),
  { type: "GiveItem", index: 5 },
  { type: "GiveItem", index: -1 },
  { type: "RetryBag" },
  { type: "LeaveBag" },
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
  { type: "Tick", ms: balance.runMs / 2 },
  { type: "Tick", ms: balance.runMs },
];
const inARun: readonly GameEvent[] = [
  { type: "Start" },
  { type: "Start", lang: "ja" },
  { type: "StartShed" },
  { type: "StartField", seed: 0 },
];

/** The alphabet with the clock: a run can end, so the end screen is reachable. */
const withClock = (w: Wrapped) =>
  w.game.phase === "trial" ? [...common, ...ticks, ...inARun] : [...common, ...ticks];
/**
 * The alphabet with neither the clock nor the way back to the title: the run never ends and the child never
 * leaves, so the bag's own taps must always give a way on.
 */
const staying = (w: Wrapped) => {
  const events = common.filter((e) => !["LeaveBag", "LeaveShed", "LeaveField"].includes(e.type));
  return w.game.phase === "trial" ? [...events, ...inARun] : events;
};

const inBag = (s: GameState) => s.phase === "trial" && s.trial === 4;

const names = {
  place:
    "the title is trial 0 and the record is empty; a run or the end screen is trial 4 and the record is not",
  clock: "the clock agrees with the record, and the run is over exactly when it is at zero",
  initial: "bag is the initial bag whenever trial is not 4",
  untouched: "the lane, the shed and the field stay untouched",
  same: "the bag holds exactly what the child did: the seed, the round, the things handed over and the last tap",
  secret: "no secret is ever handed over",
  done: "a round is done only after every safe thing was handed over",
  score:
    "the score moves only on a safe hand-over, by the points for the streak, and a secret tap ends the streak",
} as const;

const invariants: Record<string, (w: Wrapped) => boolean> = {
  [names.place]: ({ game, record }) =>
    game.phase === "title"
      ? game.trial === 0 && record === null
      : game.trial === 4 && record !== null,
  [names.clock]: ({ game, record, left }) =>
    game.run.remainingMs === left && (game.phase === "over") === (record !== null && left === 0),
  [names.initial]: ({ game }) => game.trial === 4 || game.bag === initialBag,
  [names.untouched]: ({ game }) =>
    game.lane === initialLane && game.shed === initialShed && game.field === initialField,
  [names.same]: ({ game, record }) => {
    if (game.trial !== 4 || record === null) return true;
    const { bag } = game;
    if (bag.seed !== record.seed || bag.round !== record.round || bag.stage !== record.stage) {
      return false;
    }
    return (
      bag.stage === "done" || (bag.given.join() === record.given.join() && bag.last === record.last)
    );
  },
  [names.secret]: ({ game }) => {
    const { bag } = game;
    const marked = bag.stage === "giving" ? places.filter((i) => bag.given[i]) : givenItems(bag);
    return marked.every((i) => !secretIn(bag, i));
  },
  [names.done]: ({ game, record }) =>
    !(game.trial === 4 && game.bag.stage === "done") || record?.stage === "done",
  [names.score]: ({ scoreOk }) => scoreOk,
};

/**
 * The score and the best grow without end, so they are not part of a state's identity: each is kept only as
 * "some" or "none", and the streak is left out (`scoreOk` has already checked every step's use of it). The
 * language and the hero are left out too: neither changes anything else, and a step that let them corrupt the bag
 * would show up as a different bag. The clock is exact (60 000, 30 000 or 0).
 */
function identity(w: Wrapped): string {
  const { run, lang, hero, ...rest } = w.game;
  void lang;
  void hero;
  const abstract = {
    remainingMs: run.remainingMs,
    score: Number(run.score > 0),
    best: Number(run.best > 0),
    record: run.record,
  };
  return JSON.stringify({ ...w, game: { ...rest, run: abstract } });
}

type Options = {
  step?: Step;
  initial?: Wrapped;
  invariants?: Record<string, (w: Wrapped) => boolean>;
  key?: (w: Wrapped) => string;
  events?: (w: Wrapped) => readonly GameEvent[];
};

const model = (goal: ((w: Wrapped) => boolean) | undefined, options: Options = {}) =>
  checkModel({
    initial: options.initial ?? start,
    events: options.events ?? withClock,
    step: advance(options.step ?? reduce),
    invariants: options.invariants ?? invariants,
    goal,
    key: options.key ?? identity,
  });

/**
 * For a broken game's invariant check only: every state that already breaks an invariant counts as one state,
 * because the game and the record together would otherwise have far more states than the real game. The shortest
 * trace to the first bad state is still reported.
 */
const collapsedKey = (w: Wrapped) =>
  Object.values(invariants).some((holds) => !holds(w)) ? "broken" : identity(w);

const doneRound = (w: Wrapped) => inBag(w.game) && w.game.bag.stage === "done";
const secondDone = (w: Wrapped) => doneRound(w) && w.game.bag.round >= 1;
const title = (w: Wrapped) => w.game.phase === "title";
const endScreen = (w: Wrapped) => w.game.phase === "over";
const scored = (w: Wrapped) => w.game.run.score > 0;
const freshRound = (w: Wrapped) =>
  inBag(w.game) &&
  w.record !== null &&
  w.record.stage === "giving" &&
  w.record.given.every((g) => !g) &&
  w.record.last === null;
/** The child tapped a secret: the last tap is on the bag, and it is a secret. */
const heldBack = (w: Wrapped) =>
  inBag(w.game) &&
  w.game.bag.stage === "giving" &&
  w.game.bag.last !== null &&
  secretIn(w.game.bag, w.game.bag.last);

/** The shortest trace to a state, from an invariant that says "never this state". */
function shortestTrace(goal: (w: Wrapped) => boolean, from: Wrapped = start): GameEvent[] | null {
  const report = model(undefined, { initial: from, invariants: { never: (w) => !goal(w) } });
  return report.violations[0]?.trace ?? null;
}

const play = (...events: GameEvent[]) => events.reduce(advance(reduce), start);
const enter: GameEvent = { type: "StartBag", seed: 0 };
const tap = (index: number): GameEvent => ({ type: "GiveItem", index });
const retry: GameEvent = { type: "RetryBag" };
const leave: GameEvent = { type: "LeaveBag" };
const timeUp: GameEvent = { type: "Tick", ms: balance.runMs };
/** Seed 0, round 0: the secret is in place 1. The safe things, in order. */
const round0 = [0, 2, 3, 4].map(tap);

const recordedStates = 1442;

describe("trial 4, the bag (exhaustive model check)", () => {
  it("REQ-7.12: keeps every invariant in every reachable state, and no secret is ever handed over", () => {
    const report = model(undefined);
    expect(report.violations).toEqual([]);
    // Recorded so that a change to the rules shows up as a different number.
    expect(report.states).toBe(recordedStates);
  });

  it("REQ-7.7.7: from every state a done round is reachable (no soft-lock)", () => {
    expect(model(doneRound).violations).toEqual([]);
  });

  it("REQ-7.7.5: from every state, the title is reachable again", () => {
    expect(model(title).violations).toEqual([]);
  });

  it("REQ-7.7.4: from every state, the end screen is reachable", () => {
    expect(model(endScreen).violations).toEqual([]);
  });

  it("REQ-7.5.4: from every state a fresh round is reachable", () => {
    expect(model(freshRound).violations).toEqual([]);
  });

  it("REQ-7.7.3: from every state a score is reachable", () => {
    expect(model(scored).violations).toEqual([]);
  });

  it("REQ-7.5.4: from every state, including after the end screen and the leave, a second done round is reachable", () => {
    expect(model(secondDone).violations).toEqual([]);
  });

  it("REQ-7.7.7: with neither the clock nor the way back, the bag's own taps always give a way on", () => {
    expect(model(doneRound, { events: staying }).violations).toEqual([]);
    expect(model(secondDone, { events: staying }).violations).toEqual([]);
  });
});

describe("trial 4: each result is reachable, and the shortest way to it", () => {
  it("a secret tap is reached in two events, and hands nothing over", () => {
    const trace = shortestTrace(heldBack)!;
    expect(trace).toEqual([enter, tap(1)]);
    const after = play(...trace);
    expect(after.game.bag).toEqual({ ...initialBag, last: 1 });
  });

  it("a score needs the entrance and one safe hand-over", () => {
    expect(shortestTrace(scored)).toEqual([enter, tap(0)]);
  });

  it("a done round needs the entrance and one tap on each safe thing, and no secret", () => {
    expect(shortestTrace(doneRound)).toEqual([enter, ...round0]);
  });

  it("the end screen needs the entrance and a run-ending tick", () => {
    expect(shortestTrace(endScreen)).toEqual([enter, timeUp]);
  });

  it("REQ-7.7.5: the way back to the title is one event from a run and one from the end screen", () => {
    expect(shortestTrace(title, play(enter, tap(1)))).toEqual([leave]);
    const over = play(enter, tap(0), timeUp);
    expect(endScreen(over)).toBe(true);
    expect(shortestTrace(title, over)).toEqual([leave]);
  });

  it("REQ-7.7.4: from the end screen, play again is one event and begins a run with the best kept", () => {
    const over = play(enter, tap(0), timeUp);
    const again = advance(reduce)(over, { type: "StartBag", seed: 1 });
    expect(again.game.phase).toBe("trial");
    expect(again.game.bag).toEqual({ ...initialBag, seed: 1 });
    expect(again.game.run).toMatchObject({ remainingMs: balance.runMs, score: 0, best: 100 });
    expect(again.record).toEqual(fresh(1, 0));
  });

  it("the next round is one event after a done round, and the bag opens again after the leave", () => {
    const done = play(enter, ...round0);
    expect(shortestTrace(freshRound, done)).toEqual([retry]);
    const home = play(enter, ...round0, leave);
    expect(home.game.bag).toEqual(initialBag);
    expect(model(doneRound, { initial: home }).violations).toEqual([]);
  });
});

// The check must fail when the rules are broken, or a passing check proves nothing. Each break is a step around
// the real `reduce`; no source is edited.
const giving0 = (s: GameState) => (s.bag.stage === "giving" ? s.bag : null);
const liveTap = (s: GameState, e: GameEvent): e is GameEvent & { type: "GiveItem" } => {
  const bag = giving0(s);
  return (
    e.type === "GiveItem" && inBag(s) && bag !== null && isPlace(e.index) && !bag.given[e.index]
  );
};
const breaks: Record<string, Step> = {
  "a secret tap hands the secret over": (s, e) => {
    const after = reduce(s, e);
    const bag = giving0(after);
    if (!liveTap(s, e) || !secretIn(s.bag, e.index) || !bag) return after;
    return { ...after, bag: { ...bag, given: bag.given.map((g, i) => g || i === e.index) } };
  },
  "a safe tap hands over nothing": (s, e) =>
    liveTap(s, e) && !secretIn(s.bag, e.index) ? s : reduce(s, e),
  "a tap hands over the thing next to the one tapped": (s, e) =>
    liveTap(s, e) && e.index < 4
      ? reduce(s, { type: "GiveItem", index: e.index + 1 })
      : reduce(s, e),
  "the round is done with a safe thing left": (s, e) => {
    const after = reduce(s, e);
    const bag = giving0(after);
    if (!liveTap(s, e) || !bag || secretIn(s.bag, e.index)) return after;
    return { ...after, bag: { stage: "done", seed: bag.seed, round: bag.round } };
  },
  "a secret tap scores": (s, e) => {
    const after = reduce(s, e);
    return liveTap(s, e) && secretIn(s.bag, e.index)
      ? { ...after, run: { ...after.run, score: after.run.score + 100 } }
      : after;
  },
  "a secret tap keeps the streak": (s, e) => {
    const after = reduce(s, e);
    return liveTap(s, e) && secretIn(s.bag, e.index)
      ? { ...after, run: { ...after.run, streak: s.run.streak } }
      : after;
  },
  "RetryBag is ignored": (s, e) => (e.type === "RetryBag" ? s : reduce(s, e)),
  "LeaveBag is ignored": (s, e) => (e.type === "LeaveBag" ? s : reduce(s, e)),
  "Tick is ignored in the bag": (s, e) => (e.type === "Tick" && inBag(s) ? s : reduce(s, e)),
  "the end screen takes nothing": (s, e) => (s.phase === "over" ? s : reduce(s, e)),
};

/**
 * A broken game drifts away from the record, and the two together would have far more states than the real game.
 * The broken checks therefore use one seed and no language, hero or events of the other trials.
 */
const small: readonly GameEvent[] = [enter, ...places.map(tap), retry, leave, timeUp];

/**
 * A goal break is checked without the invariants and an invariant break without a goal, so each report shows the
 * one check that is meant to notice the break.
 */
const brokenReport = (name: string, goal?: (w: Wrapped) => boolean, key = identity) =>
  model(goal, {
    step: breaks[name]!,
    invariants: goal ? {} : invariants,
    key: goal ? key : collapsedKey,
    events: () => small,
  });

describe("trial 4: the checks fail on rules broken on purpose (REQ-7.12.4)", () => {
  it("when a secret tap hands the secret over, the no-secret invariant fails after two events", () => {
    const report = brokenReport("a secret tap hands the secret over");
    const bad = report.violations.find((v) => v.name === names.secret);
    expect(bad).toMatchObject({ kind: "invariant", trace: [enter, tap(1)] });
  });

  it("when a safe tap hands over nothing, the bag differs from the record", () => {
    const [bad] = brokenReport("a safe tap hands over nothing").violations;
    expect(bad).toMatchObject({ kind: "invariant", name: names.same, trace: [enter, tap(0)] });
  });

  it("when a tap hands over the thing next to the one tapped, the bag differs from the record", () => {
    const report = brokenReport("a tap hands over the thing next to the one tapped");
    const bad = report.violations.find((v) => v.name === names.same);
    expect(bad).toMatchObject({ kind: "invariant", trace: [enter, tap(0)] });
  });

  it("when the round is done with a safe thing left, the done-too-early invariant fails", () => {
    const report = brokenReport("the round is done with a safe thing left");
    const bad = report.violations.find((v) => v.name === names.done);
    expect(bad).toMatchObject({ kind: "invariant", trace: [enter, tap(0)] });
  });

  it("when a secret tap scores, the score invariant fails", () => {
    const [bad] = brokenReport("a secret tap scores").violations;
    expect(bad).toMatchObject({ kind: "invariant", name: names.score, trace: [enter, tap(1)] });
  });

  it("when a secret tap keeps the streak, the score invariant fails after a hand-over and a secret", () => {
    const [bad] = brokenReport("a secret tap keeps the streak").violations;
    expect(bad).toMatchObject({ kind: "invariant", name: names.score });
    expect(bad!.trace).toEqual([enter, tap(0), tap(1)]);
  });

  it("when RetryBag is ignored, the second round is unreachable (the leave and a new entrance still give a fresh round)", () => {
    const [noSecond] = brokenReport("RetryBag is ignored", secondDone).violations;
    expect(noSecond).toMatchObject({ kind: "stuck", trace: [] });
    expect(brokenReport("RetryBag is ignored", freshRound).violations).toEqual([]);
  });

  it("when LeaveBag is ignored, the title is unreachable once the bag is entered", () => {
    const [stuck] = brokenReport("LeaveBag is ignored", title, collapsedKey).violations;
    expect(stuck).toMatchObject({ kind: "stuck", trace: [enter] });
  });

  it("when Tick is ignored in the bag, the end screen is unreachable: there is no time attack", () => {
    const [stuck] = brokenReport("Tick is ignored in the bag", endScreen, collapsedKey).violations;
    expect(stuck).toMatchObject({ kind: "stuck", trace: [] });
  });

  it("when the end screen takes nothing, the title is unreachable once the time is up", () => {
    const [stuck] = brokenReport("the end screen takes nothing", title, collapsedKey).violations;
    expect(stuck).toMatchObject({ kind: "stuck", trace: [enter, timeUp] });
  });
});
