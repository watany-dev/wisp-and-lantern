// Trial 3 (The Wisp Field, spec 06-trial-verify-stars, revision 3): every state the real reducer reaches
// from the title through the field button, and everything after it: the 60-second run, the rounds, the
// verdicts and the score, the end screen and the way back to the title.
//
// Scope (REQ-6.12.4): the entrance from the title by `StartField` (two seeds), the field after it and the
// leave. A `Start` or a `StartShed` from the title is another trial's entrance and has its own model check,
// so the title's alphabet leaves them out; inside a run both are part of the alphabet (`Start` must only set
// the language, `StartShed` must do nothing). On the field's end screen `Start` would begin trial 1, which
// has no way back to the title; the unit tests cover it, the alphabet does not. This check does not ask that
// every state of trial 1 or 2 can reach the field, and it drops no state of the field to pass.

import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import type { GameEvent } from "../events";
import { initialField, keptStars } from "../field";
import { initialLane } from "../lane";
import { reduce } from "../reducer";
import { pointsFor } from "../run";
import { initialShed } from "../shed";
import { initialState, type GameState } from "../state";
import { modelChecker } from "./support/model-check";

/**
 * This test's own copy of the fake stars of the two seeds the alphabet uses, written from the spec and not
 * read from the source, so a change to the way the stars are chosen fails here. Four rounds per seed.
 */
const fakeStars: Record<number, readonly (readonly number[])[]> = {
  0: [[4], [1, 4], [4], [0, 3]],
  1: [[2], [1, 3], [4], [1, 4]],
};
const seeds = [0, 1];
const stars = [0, 1, 2, 3, 4];

/**
 * What the child did, as an independent record written from the spec and not from the reducer: the round,
 * the stars sorted, the star in the lens and the last verdict. `null` is the title.
 */
type Done = {
  stage: "sorting" | "kept";
  seed: number;
  round: number;
  sorted: boolean[];
  looking: number | null;
  note: { star: number; said: "real" | "fake" } | null;
};

/**
 * The real game state plus three things the game has no use for, an independent record of what happened:
 * `record` is what the child did in the field, `left` the milliseconds left on the clock (the alphabet's
 * ticks make it 60 000, 30 000 or 0), and `scoreOk` is false from the first step on that moved the score
 * or the streak when it should not have (a right verdict adds the points for the streak and extends it, a
 * wrong one ends the streak, nothing else moves them but a new run or the way back to the title).
 */
type Wrapped = { game: GameState; record: Done | null; left: number; scoreOk: boolean };
type Step = (state: GameState, event: GameEvent) => GameState;

const isStar = (i: number) => Number.isInteger(i) && i >= 0 && i <= 4;
const fakeIn = (d: Done, star: number) => fakeStars[d.seed]![d.round]!.includes(star);
const fresh = (seed: number, round: number): Done => ({
  stage: "sorting",
  seed,
  round,
  sorted: [false, false, false, false, false],
  looking: null,
  note: null,
});

function sorting(d: Done, event: GameEvent): Done {
  if (event.type === "InspectStar") {
    const ok = isStar(event.index) && !d.sorted[event.index] && d.looking !== event.index;
    return ok ? { ...d, looking: event.index, note: null } : d;
  }
  if (event.type === "SortStar" && d.looking !== null) {
    const star = d.looking;
    const right = (event.verdict === "fake") === fakeIn(d, star);
    const sorted = d.sorted.map((done, i) => done || (right && i === star));
    return { ...d, sorted, looking: null, note: { star, said: event.verdict } };
  }
  if (event.type === "KeepStars" && d.sorted.every(Boolean)) {
    return { ...d, stage: "kept", looking: null, note: null };
  }
  return d;
}

/** The record's own bookkeeping, written from the spec and not from the reducer. */
function bookkeep(w: Wrapped, event: GameEvent): Pick<Wrapped, "record" | "left"> {
  const { record, left } = w;
  const full = balance.runMs;
  if (event.type === "StartField") {
    return record === null || left === 0 ? { record: fresh(event.seed, 0), left: full } : w;
  }
  if (record === null) return w;
  if (event.type === "LeaveField") return { record: null, left: full };
  // The end screen takes nothing else.
  if (left === 0) return w;
  if (event.type === "Tick") return { record, left: Math.max(0, left - Math.max(0, event.ms)) };
  if (record.stage === "sorting") return { record: sorting(record, event), left };
  if (event.type === "RetryField")
    return { record: fresh(record.seed, (record.round + 1) % 4), left };
  return w;
}

/** Whether a step began a new run (the entrance, play again) or left the field: the run starts over. */
function restartsRun(before: Wrapped, event: GameEvent): boolean {
  const { record, left } = before;
  if (event.type === "StartField") return record === null || left === 0;
  return event.type === "LeaveField" && record !== null;
}

/** The right verdict of the star in the lens while the clock runs: `true`, `false`, or `null` for nothing to judge. */
function judgedRight(before: Wrapped, event: GameEvent): boolean | null {
  const { record, left } = before;
  if (event.type !== "SortStar" || record === null || left === 0) return null;
  const star = record.stage === "sorting" ? record.looking : null;
  return star === null ? null : (event.verdict === "fake") === fakeIn(record, star);
}

/** Whether the score and the streak moved as the spec says, from the record before the step. */
function scoreMovedRightly(before: Wrapped, game: GameState, event: GameEvent): boolean {
  const was = before.game.run;
  const now = game.run;
  if (restartsRun(before, event)) return now.score === 0 && now.streak === 0;
  const right = judgedRight(before, event);
  if (right === null) return now.score === was.score && now.streak === was.streak;
  return right
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

// A finite alphabet. Two hero positions stand for "anywhere"; a half-run tick and a run-ending one; one
// card of trial 1 and the events of trials 1 and 2 that must do nothing here; every star, and two indexes
// that are not stars; both verdicts.
const common: readonly GameEvent[] = [
  ...seeds.map((seed): GameEvent => ({ type: "StartField", seed })),
  { type: "SetLang", lang: "ja" },
  { type: "SetLang", lang: "en" },
  { type: "MoveHeroTo", x: 0, y: 0 },
  { type: "MoveHeroTo", x: 195, y: 612 },
  ...stars.map((index): GameEvent => ({ type: "InspectStar", index })),
  { type: "InspectStar", index: 5 },
  { type: "InspectStar", index: -1 },
  { type: "SortStar", verdict: "real" },
  { type: "SortStar", verdict: "fake" },
  { type: "KeepStars" },
  { type: "RetryField" },
  { type: "LeaveField" },
  { type: "PickCard", card: "red" },
  { type: "Ask" },
  { type: "Retry" },
  { type: "PickTool", tool: "key" },
  { type: "GiveTool" },
  { type: "RetryShed" },
  { type: "LeaveShed" },
];
const ticks: readonly GameEvent[] = [
  { type: "Tick", ms: balance.runMs / 2 },
  { type: "Tick", ms: balance.runMs },
];
const inARun: readonly GameEvent[] = [
  { type: "Start" },
  { type: "Start", lang: "ja" },
  { type: "StartShed" },
];

/** The alphabet with the clock: a run can end, so the end screen is reachable. */
const withClock = (w: Wrapped) =>
  w.game.phase === "trial" ? [...common, ...ticks, ...inARun] : [...common, ...ticks];
/**
 * The alphabet with neither the clock nor the way back to the title: the run never ends and the child
 * never leaves, so the field's own buttons must always give a way on.
 */
const staying = (w: Wrapped) => {
  const events = common.filter((e) => e.type !== "LeaveField" && e.type !== "LeaveShed");
  return w.game.phase === "trial" ? [...events, ...inARun] : events;
};

const inField = (s: GameState) => s.phase === "trial" && s.trial === 3;
const sameStars = (a: readonly number[], b: readonly number[]) =>
  [...a].sort((x, y) => x - y).join() === [...b].sort((x, y) => x - y).join();

const names = {
  place:
    "the title is trial 0 and the record is empty; a run or the end screen is trial 3 and the record is not",
  clock: "the clock agrees with the record, and the run is over exactly when it is at zero",
  initial: "field is the initial field whenever trial is not 3",
  untouched: "the lane and the shed stay untouched",
  same: "the field holds exactly what the child did: the seed, the round, the stars sorted, the star in the lens and the last verdict",
  sortedRight:
    "a star is sorted only when the child gave the right verdict, so every sorted star has its true mark",
  finished: "a round is finished only after all five stars were sorted",
  kept: "the stars kept are the real stars of the round, and none is fake",
  score:
    "the score moves only on a right verdict, by the points for the streak, and a wrong verdict ends the streak",
} as const;

const invariants: Record<string, (w: Wrapped) => boolean> = {
  [names.place]: ({ game, record }) =>
    game.phase === "title"
      ? game.trial === 0 && record === null
      : game.trial === 3 && record !== null,
  [names.clock]: ({ game, record, left }) =>
    game.run.remainingMs === left && (game.phase === "over") === (record !== null && left === 0),
  [names.initial]: ({ game }) => game.trial === 3 || game.field === initialField,
  [names.untouched]: ({ game }) => game.lane === initialLane && game.shed === initialShed,
  [names.same]: ({ game, record }) => {
    if (game.trial !== 3 || record === null) return true;
    const { field } = game;
    if (record.stage !== "sorting") {
      return (
        field.stage === record.stage && field.seed === record.seed && field.round === record.round
      );
    }
    return (
      field.stage === "sorting" &&
      field.seed === record.seed &&
      field.round === record.round &&
      field.sorted.join() === record.sorted.join() &&
      field.looking === record.looking &&
      JSON.stringify(field.note) === JSON.stringify(record.note)
    );
  },
  [names.sortedRight]: ({ game, record }) => {
    const { field } = game;
    if (game.trial !== 3 || record === null || field.stage !== "sorting") return true;
    // A sorted star is true to the round: the game sorts one only on the right verdict, which is the only
    // way the record sorts one, so the game never has a sorted star the record does not.
    return stars.every((i) => !field.sorted[i] || record.sorted[i]);
  },
  [names.finished]: ({ game, record }) =>
    !(game.trial === 3 && game.field.stage !== "sorting") || record?.stage === game.field.stage,
  [names.kept]: ({ game, record }) => {
    if (game.trial !== 3 || record === null || game.field.stage === "sorting") return true;
    const real = stars.filter((i) => !fakeIn(record, i));
    const kept = keptStars(game.field);
    return sameStars(kept, real) && kept.every((i) => !fakeIn(record, i));
  },
  [names.score]: ({ scoreOk }) => scoreOk,
};

/**
 * The score and the best grow without end, so they are not part of a state's identity: each is kept only
 * as "some" or "none", and the streak is left out (`scoreOk` has already checked every step's use of it).
 * The language and the hero are left out too: neither changes anything else, and a step that let them
 * corrupt the field would show up as a different field. The clock is exact (60 000, 30 000 or 0).
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
 * For a broken game's invariant check only: every state that already breaks an invariant counts as one
 * state, because the game and the record together would otherwise have far more states than the real game.
 * The shortest trace to the first bad state is still reported.
 */
const collapsedKey = (w: Wrapped) =>
  Object.values(invariants).some((holds) => !holds(w)) ? "broken" : identity(w);

const keptRound = (w: Wrapped) => inField(w.game) && w.game.field.stage === "kept";
const secondKept = (w: Wrapped) => keptRound(w) && w.game.field.round >= 1;
const title = (w: Wrapped) => w.game.phase === "title";
const endScreen = (w: Wrapped) => w.game.phase === "over";
const scored = (w: Wrapped) => w.game.run.score > 0;
const freshRound = (w: Wrapped) =>
  inField(w.game) &&
  w.game.field.stage === "sorting" &&
  w.record !== null &&
  w.record.sorted.every((done) => !done) &&
  w.record.looking === null &&
  w.record.note === null;
/** The child gave a wrong verdict: the last verdict is on the field and its star is still unsorted. */
const missed = (w: Wrapped) =>
  inField(w.game) &&
  w.game.field.stage === "sorting" &&
  w.game.field.note !== null &&
  !w.game.field.sorted[w.game.field.note.star];

/** The shortest trace to a state, from an invariant that says "never this state". */
function shortestTrace(goal: (w: Wrapped) => boolean, from: Wrapped = start): GameEvent[] | null {
  const report = model(undefined, { initial: from, invariants: { never: (w) => !goal(w) } });
  return report.violations[0]?.trace ?? null;
}

const play = (...events: GameEvent[]) => events.reduce(advance(reduce), start);
const enter: GameEvent = { type: "StartField", seed: 0 };
const look = (index: number): GameEvent => ({ type: "InspectStar", index });
const sortAs = (verdict: "real" | "fake"): GameEvent => ({ type: "SortStar", verdict });
const keep: GameEvent = { type: "KeepStars" };
const retry: GameEvent = { type: "RetryField" };
const leave: GameEvent = { type: "LeaveField" };
const timeUp: GameEvent = { type: "Tick", ms: balance.runMs };
/** Seed 0, round 0: star 4 is the only fake. The right way through the round, in order. */
const round0 = stars.flatMap((i): GameEvent[] => [look(i), sortAs(i === 4 ? "fake" : "real")]);

describe("trial 3, the field (exhaustive model check)", () => {
  it("REQ-6.12: keeps every invariant in every reachable state", () => {
    const report = model(undefined);
    expect(report.violations).toEqual([]);
    // Recorded so that a change to the rules shows up as a different number. Per seed and round a round in
    // progress has 241 states (80 with a star in the lens, 160 with the last verdict and none in the lens,
    // 1 untouched) and a finished round 1; the clock (full, half, zero), the score (none or some) and the
    // best (none or some) are part of a state's identity where they can be reached together.
    expect(report.states).toBe(recordedStates);
  });

  it("REQ-6.7.7: from every state a kept round is reachable (no soft-lock)", () => {
    expect(model(keptRound).violations).toEqual([]);
  });

  it("REQ-6.7.5: from every state, the title is reachable again", () => {
    expect(model(title).violations).toEqual([]);
  });

  it("REQ-6.7.4: from every state, the end screen is reachable", () => {
    expect(model(endScreen).violations).toEqual([]);
  });

  it("REQ-6.3.4: from every state a fresh round in the field is reachable", () => {
    expect(model(freshRound).violations).toEqual([]);
  });

  it("REQ-6.7.3: from every state a score is reachable", () => {
    expect(model(scored).violations).toEqual([]);
  });

  it("REQ-6.7.2: from every state, including after the end screen and the leave, a second kept round is reachable", () => {
    expect(model(secondKept).violations).toEqual([]);
  });

  it("REQ-6.7.7: with neither the clock nor the way back, the field's own buttons always give a way on", () => {
    expect(model(keptRound, { events: staying }).violations).toEqual([]);
    expect(model(secondKept, { events: staying }).violations).toEqual([]);
  });
});

const recordedStates = 9904;

describe("trial 3: each result is reachable, and the shortest way to it", () => {
  it("a wrong verdict is reached in three events, and leaves the star unsorted", () => {
    const trace = shortestTrace(missed)!;
    expect(trace).toHaveLength(3);
    expect(trace[0]).toEqual(enter);
  });

  it("a score needs the entrance, a look and a right verdict", () => {
    expect(shortestTrace(scored)).toEqual([enter, look(0), sortAs("real")]);
  });

  it("a kept round needs the entrance, ten looks and verdicts and the keep", () => {
    expect(shortestTrace(keptRound)).toEqual([enter, ...round0, keep]);
  });

  it("the end screen needs the entrance and a run-ending tick", () => {
    expect(shortestTrace(endScreen)).toEqual([enter, timeUp]);
  });

  it("REQ-6.7.5: the way back to the title is one event from a run and one from the end screen", () => {
    const running = play(enter, look(0));
    expect(shortestTrace(title, running)).toEqual([leave]);
    const over = play(enter, look(0), sortAs("real"), timeUp);
    expect(endScreen(over)).toBe(true);
    expect(shortestTrace(title, over)).toEqual([leave]);
  });

  it("REQ-6.7.4: from the end screen, play again is one event and begins a run with the best kept", () => {
    const over = play(enter, look(0), sortAs("real"), timeUp);
    const again = advance(reduce)(over, { type: "StartField", seed: 1 });
    expect(again.game.phase).toBe("trial");
    expect(again.game.field).toEqual({ ...initialField, seed: 1 });
    expect(again.game.run).toMatchObject({ remainingMs: balance.runMs, score: 0, best: 100 });
    expect(again.record).toEqual(fresh(1, 0));
  });

  it("from the title after the leave the field opens again", () => {
    const home = play(enter, ...round0, keep, leave);
    expect(home.game.phase).toBe("title");
    expect(home.game.field).toEqual(initialField);
    expect(model(keptRound, { initial: home }).violations).toEqual([]);
  });
});

// The check must fail when the rules are broken, or a passing check proves nothing. Each break is a step
// around the real `reduce`; no source is edited.
const sortingField = (s: GameState) => (s.field.stage === "sorting" ? s.field : null);
const breaks: Record<string, Step> = {
  "a wrong verdict sorts the star anyway": (s, e) => {
    const before = sortingField(s);
    const after = reduce(s, e);
    const now = sortingField(after);
    if (e.type !== "SortStar" || !inField(s) || !before || before.looking === null || !now)
      return after;
    const star = before.looking;
    return { ...after, field: { ...now, sorted: now.sorted.map((d, i) => d || i === star) } };
  },
  "a verdict works with no star in the lens": (s, e) => {
    const field = sortingField(s);
    if (e.type !== "SortStar" || !inField(s) || !field || field.looking !== null)
      return reduce(s, e);
    return { ...s, field: { ...field, sorted: field.sorted.map((d, i) => d || i === 0) } };
  },
  "a wrong verdict leaves the star in the lens": (s, e) => {
    const after = reduce(s, e);
    const field = sortingField(after);
    const before = sortingField(s);
    if (e.type !== "SortStar" || !field || !before || before.looking === null) return after;
    return field.sorted === before.sorted
      ? { ...after, field: { ...field, looking: before.looking } }
      : after;
  },
  "KeepStars works with a star unsorted": (s, e) =>
    e.type === "KeepStars" && inField(s) && s.field.stage === "sorting"
      ? { ...s, field: { stage: "kept", seed: s.field.seed, round: s.field.round } }
      : reduce(s, e),
  "a wrong verdict scores": (s, e) => {
    const after = reduce(s, e);
    const field = sortingField(s);
    const wrong =
      e.type === "SortStar" && inField(s) && field?.looking != null && after.field !== s.field;
    return wrong && after.field.stage === "sorting" && after.field.sorted === field.sorted
      ? { ...after, run: { ...after.run, score: after.run.score + 100 } }
      : after;
  },
  "a wrong verdict keeps the streak": (s, e) => {
    const after = reduce(s, e);
    const wrong =
      e.type === "SortStar" &&
      after.field.stage === "sorting" &&
      sortingField(s)?.sorted === after.field.sorted &&
      after.field !== s.field;
    return wrong ? { ...after, run: { ...after.run, streak: s.run.streak } } : after;
  },
  "a right verdict scores nothing": (s, e) => {
    const after = reduce(s, e);
    return e.type === "SortStar" && inField(s) ? { ...after, run: s.run } : after;
  },
  "RetryField is ignored": (s, e) => (e.type === "RetryField" ? s : reduce(s, e)),
  "KeepStars is ignored": (s, e) => (e.type === "KeepStars" ? s : reduce(s, e)),
  "LeaveField is ignored": (s, e) => (e.type === "LeaveField" ? s : reduce(s, e)),
  "Tick is ignored in the field": (s, e) => (e.type === "Tick" && inField(s) ? s : reduce(s, e)),
  "the end screen takes nothing": (s, e) => (s.phase === "over" ? s : reduce(s, e)),
};

/**
 * A broken game drifts away from the record, and the two together would have far more states than the real
 * game. The broken checks therefore use one seed and no language, hero or events of the other trials.
 */
const small: readonly GameEvent[] = [
  enter,
  ...stars.map(look),
  sortAs("real"),
  sortAs("fake"),
  keep,
  retry,
  leave,
  timeUp,
];

/**
 * A goal break is checked without the invariants and an invariant break without a goal, so each report
 * shows the one check that is meant to notice the break.
 */
const brokenReport = (name: string, goal?: (w: Wrapped) => boolean, key = identity) =>
  model(goal, {
    step: breaks[name]!,
    invariants: goal ? {} : invariants,
    key: goal ? key : collapsedKey,
    events: () => small,
  });

describe("trial 3: the checks fail on rules broken on purpose (REQ-6.12.4)", () => {
  it("when a wrong verdict sorts the star anyway, the sorted-stars invariant fails (the game corrected the child)", () => {
    const report = brokenReport("a wrong verdict sorts the star anyway");
    const bad = report.violations.find((v) => v.name === names.same);
    expect(bad).toMatchObject({ kind: "invariant" });
    expect(bad!.trace).toHaveLength(3);
    expect(bad!.trace[0]).toEqual(enter);
  });

  it("when a verdict works with no star in the lens, the record differs from the field", () => {
    const [bad] = brokenReport("a verdict works with no star in the lens").violations;
    expect(bad).toMatchObject({ kind: "invariant", name: names.same });
    expect(bad!.trace).toEqual([enter, sortAs("real")]);
  });

  it("when a wrong verdict leaves the star in the lens, the record differs from the field", () => {
    const report = brokenReport("a wrong verdict leaves the star in the lens");
    expect(report.violations[0]).toMatchObject({ kind: "invariant", name: names.same });
    expect(report.violations[0]!.trace).toHaveLength(3);
  });

  it("when KeepStars works with a star unsorted, the finished-too-early invariant fails", () => {
    const report = brokenReport("KeepStars works with a star unsorted");
    const bad = report.violations.find((v) => v.name === names.finished);
    expect(bad).toMatchObject({ kind: "invariant", trace: [enter, keep] });
  });

  it("when a wrong verdict scores, the score invariant fails", () => {
    const [bad] = brokenReport("a wrong verdict scores").violations;
    expect(bad).toMatchObject({ kind: "invariant", name: names.score });
    expect(bad!.trace).toHaveLength(3);
  });

  it("when a wrong verdict keeps the streak, the score invariant fails after a right verdict and a wrong one", () => {
    const [bad] = brokenReport("a wrong verdict keeps the streak").violations;
    expect(bad).toMatchObject({ kind: "invariant", name: names.score });
    expect(bad!.trace).toHaveLength(5);
  });

  it("when a right verdict scores nothing, the score invariant fails at the first right verdict", () => {
    const [bad] = brokenReport("a right verdict scores nothing").violations;
    expect(bad).toMatchObject({ kind: "invariant", name: names.score });
    expect(bad!.trace).toEqual([enter, look(0), sortAs("real")]);
  });

  it("when KeepStars is ignored, a kept round is unreachable from every state", () => {
    const [stuck] = brokenReport("KeepStars is ignored", keptRound).violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
    expect(stuck!.state.game).toEqual(initialState);
  });

  it("when RetryField is ignored, the second round is unreachable (the leave and a new entrance still give a fresh round)", () => {
    const name = "RetryField is ignored";
    const [noSecond] = brokenReport(name, secondKept).violations;
    expect(noSecond).toMatchObject({ kind: "stuck", trace: [] });
    // The way back to the title and in again still gives a fresh round: the leave is a way out.
    expect(brokenReport(name, freshRound).violations).toEqual([]);
  });

  it("when LeaveField is ignored, the title is unreachable once the field is entered", () => {
    const [stuck] = brokenReport("LeaveField is ignored", title, collapsedKey).violations;
    expect(stuck).toMatchObject({ kind: "stuck", trace: [enter] });
  });

  it("when Tick is ignored in the field, the end screen is unreachable: there is no time attack", () => {
    const [stuck] = brokenReport(
      "Tick is ignored in the field",
      endScreen,
      collapsedKey,
    ).violations;
    expect(stuck).toMatchObject({ kind: "stuck", trace: [] });
  });

  it("when the end screen takes nothing, the title is unreachable once the time is up", () => {
    const [stuck] = brokenReport("the end screen takes nothing", title, collapsedKey).violations;
    expect(stuck).toMatchObject({ kind: "stuck", trace: [enter, timeUp] });
  });
});
