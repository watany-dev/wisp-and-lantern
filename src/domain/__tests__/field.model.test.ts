// Trial 3 (The Wisp Field, spec 06-trial-verify-stars): every state the real reducer reaches from the
// title through the field button, everything after it, and the way back to the title.
//
// Scope (REQ-6.12.4): the entrance from the title by `StartField` (two seeds), the field after it and the
// leave from the cleared trial. A `Start` or a `StartShed` from the title is another trial's entrance and
// has its own model check, so the title's alphabet leaves them out; inside the field both are part of the
// alphabet (`Start` must only set the language, `StartShed` must do nothing). This check does not ask that
// every state of trial 1 or 2 can reach the field, and it drops no state of the field to pass.

import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../events";
import { initialField, keptStars } from "../field";
import { initialLane } from "../lane";
import { reduce } from "../reducer";
import { initialRun, runDown } from "../run";
import { initialShed } from "../shed";
import { initialState, type GameState } from "../state";
import { checkModel } from "./support/model-check";

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
 * the stars sorted, the star in the lens and the last verdict. `null` is the title. `clears` counts the
 * cleared trials so far (2 means "at least 2"), counted from what the game did so that a broken game
 * cannot fake a replay.
 */
type Done = {
  stage: "sorting" | "kept" | "cleared";
  seed: number;
  round: number;
  sorted: boolean[];
  looking: number | null;
  note: { star: number; said: "real" | "fake" } | null;
};
type Wrapped = { game: GameState; record: Done | null; clears: number };
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
    // The last round of each run of two rounds clears the trial.
    return { ...d, stage: d.round % 2 === 1 ? "cleared" : "kept", looking: null, note: null };
  }
  return d;
}

/** The record's own bookkeeping, written from the spec and not from the reducer. */
function note(record: Done | null, event: GameEvent): Done | null {
  if (record === null) return event.type === "StartField" ? fresh(event.seed, 0) : null;
  if (record.stage === "sorting") return sorting(record, event);
  if (event.type === "RetryField") return fresh(record.seed, (record.round + 1) % 4);
  if (event.type === "LeaveField" && record.stage === "cleared") return null;
  return record;
}

function advance(step: Step) {
  return (w: Wrapped, event: GameEvent): Wrapped => {
    const game = step(w.game, event);
    const clearedNow = game.field.stage === "cleared" && w.game.field.stage !== "cleared";
    return {
      game,
      record: note(w.record, event),
      clears: clearedNow ? Math.min(2, w.clears + 1) : w.clears,
    };
  };
}

const start: Wrapped = { game: initialState, record: null, clears: 0 };

// A finite alphabet. Two hero positions stand for "anywhere"; a short and a run-ending tick; one card of
// trial 1 and the events of trials 1 and 2 that must do nothing here; every star, and two indexes that
// are not stars; both verdicts.
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
  { type: "Tick", ms: 1_000 },
  { type: "Tick", ms: 60_000 },
  { type: "PickTool", tool: "key" },
  { type: "GiveTool" },
  { type: "RetryShed" },
  { type: "LeaveShed" },
];
const insideTheField: readonly GameEvent[] = [
  ...common,
  { type: "Start" },
  { type: "Start", lang: "ja" },
  { type: "StartShed" },
];
const alphabet = (w: Wrapped) => (w.game.phase === "title" ? common : insideTheField);

const inField = (s: GameState) => s.phase === "trial" && s.trial === 3;
const sameStars = (a: readonly number[], b: readonly number[]) =>
  [...a].sort((x, y) => x - y).join() === [...b].sort((x, y) => x - y).join();

const names = {
  place:
    "the title is trial 0 and the record is empty; the field is trial 3 in a trial and the record is not",
  initial: "field is the initial field whenever trial is not 3",
  untouched: "the lane, the run and the shed stay untouched: no clock, no score, no tool",
  same: "the field holds exactly what the child did: the seed, the round, the stars sorted, the star in the lens and the last verdict",
  sortedRight:
    "a star is sorted only when the child gave the right verdict, so every sorted star has its true mark",
  finished: "a round is finished only after all five stars were sorted",
  kept: "the stars kept are the real stars of the round, and none is fake",
} as const;

const invariants: Record<string, (w: Wrapped) => boolean> = {
  [names.place]: ({ game, record }) =>
    game.phase === "title"
      ? game.trial === 0 && record === null
      : game.phase === "trial" && game.trial === 3 && record !== null,
  [names.initial]: ({ game }) => game.trial === 3 || game.field === initialField,
  [names.untouched]: ({ game }) =>
    game.lane === initialLane && game.run === initialRun && game.shed === initialShed,
  [names.same]: ({ game, record }) => {
    if (!inField(game) || record === null) return true;
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
    if (!inField(game) || record === null || field.stage !== "sorting") return true;
    // A sorted star is true to the round: the game sorts one only on the right verdict, which is the only
    // way the record sorts one, so the game never has a sorted star the record does not.
    return stars.every((i) => !field.sorted[i] || record.sorted[i]);
  },
  [names.finished]: ({ game, record }) =>
    !(inField(game) && game.field.stage !== "sorting") || record?.stage === game.field.stage,
  [names.kept]: ({ game, record }) => {
    if (!inField(game) || record === null || game.field.stage === "sorting") return true;
    const real = stars.filter((i) => !fakeIn(record, i));
    const kept = keptStars(game.field);
    return sameStars(kept, real) && kept.every((i) => !fakeIn(record, i));
  },
};

type Options = {
  step?: Step;
  initial?: Wrapped;
  invariants?: Record<string, (w: Wrapped) => boolean>;
  key?: (w: Wrapped) => string;
  events?: (w: Wrapped) => readonly GameEvent[];
};

const model = (goal: ((w: Wrapped) => boolean) | undefined, options: Options = {}) =>
  checkModel<Wrapped, GameEvent>({
    initial: options.initial ?? start,
    events: options.events ?? alphabet,
    step: advance(options.step ?? reduce),
    invariants: options.invariants ?? invariants,
    goal,
    ...(options.key && { key: options.key }),
  });

/**
 * For a broken game only: the language, the hero and the exact clock are left out of a state's identity.
 * A broken step can drift away from the record in many ways (a clock that runs to zero in 60 steps, for
 * one), and this keeps the search small. The checks of the real game use the whole state.
 */
const looseKey = (w: Wrapped) =>
  JSON.stringify({
    ...w,
    game: { ...w.game, lang: "", hero: null, run: w.game.run === initialRun },
  });

/**
 * For a broken game's invariant check only: every state that already breaks an invariant counts as one
 * state, because the game and the record together would otherwise have far more states than the real game.
 * The shortest trace to the first bad state is still reported.
 */
const collapsedKey = (w: Wrapped) =>
  Object.values(invariants).some((holds) => !holds(w)) ? "broken" : looseKey(w);

const cleared = (w: Wrapped) => inField(w.game) && w.game.field.stage === "cleared";
const title = (w: Wrapped) => w.game.phase === "title";
const freshRound = (w: Wrapped) =>
  inField(w.game) &&
  w.game.field.stage === "sorting" &&
  w.record !== null &&
  w.record.sorted.every((done) => !done) &&
  w.record.looking === null &&
  w.record.note === null;
const secondClear = (w: Wrapped) => w.clears === 2;
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
/** Seed 0, round 0: star 4 is the only fake. The right way through the round, in order. */
const round0 = stars.flatMap((i): GameEvent[] => [look(i), sortAs(i === 4 ? "fake" : "real")]);
/** Seed 0, round 1: stars 1 and 4 are fake. */
const round1 = stars.flatMap((i): GameEvent[] => [
  look(i),
  sortAs(i === 1 || i === 4 ? "fake" : "real"),
]);

describe("trial 3, the field (exhaustive model check)", () => {
  it("REQ-6.12: keeps every invariant in every reachable state", () => {
    const report = model(undefined);
    expect(report.violations).toEqual([]);
    // Recorded so that a change to the rules shows up as a different number. Per seed and round a round in
    // progress has 241 states (80 with a star in the lens, 160 with the last verdict and none in the lens,
    // 1 untouched) and a finished round 1; the language and the hero make four of each, the title adds
    // four, and the number of cleared trials so far (0, 1 or 2) is part of a state's identity.
    expect(report.states).toBe(recordedStates);
  });

  it("REQ-6.7.4: from every state the cleared trial is reachable (no soft-lock)", () => {
    expect(model(cleared).violations).toEqual([]);
  });

  it("REQ-6.7.4: from every state, the title is reachable again", () => {
    expect(model(title).violations).toEqual([]);
  });

  it("REQ-6.3.4: from every state a fresh round in the field is reachable", () => {
    expect(model(freshRound).violations).toEqual([]);
  });

  it("REQ-6.7.2: from every state, including after the clear and the leave, a second clear is reachable", () => {
    expect(model(secondClear).violations).toEqual([]);
  });
});

const recordedStates = 19_356;

describe("trial 3: each result is reachable, and the shortest way to it", () => {
  it("a wrong verdict is reached in three events, and leaves the star unsorted", () => {
    const trace = shortestTrace(missed)!;
    expect(trace).toHaveLength(3);
    expect(trace[0]).toEqual(enter);
  });

  it("the cleared trial needs the entrance, two rounds of ten looks and verdicts, the keep, the retry and the keep", () => {
    const trace = shortestTrace(cleared)!;
    expect(trace).toEqual([enter, ...round0, keep, retry, ...round1, keep]);
  });

  it("the way back needs the clear and the leave", () => {
    const trace = shortestTrace((w) => title(w) && w.clears === 1)!;
    expect(trace).toEqual([enter, ...round0, keep, retry, ...round1, keep, leave]);
  });

  it("REQ-6.7.1: from the cleared trial, a retry reaches a fresh next run, and the way back is one event", () => {
    const done = play(enter, ...round0, keep, retry, ...round1, keep);
    expect(cleared(done)).toBe(true);
    expect(shortestTrace(freshRound, done)).toEqual([retry]);
    expect(shortestTrace(title, done)).toEqual([leave]);
    const back = advance(reduce)(done, retry);
    expect(back.game.field).toEqual({ ...initialField, round: 2 });
    expect(back.game).toEqual({ ...done.game, field: back.game.field });
    expect(model(cleared, { initial: done }).violations).toEqual([]);
  });

  it("from the title after the leave the field opens again", () => {
    const home = play(enter, ...round0, keep, retry, ...round1, keep, leave);
    expect(home.game.phase).toBe("title");
    expect(home.game.field).toEqual(initialField);
    expect(model(cleared, { initial: home }).violations).toEqual([]);
  });
});

// The check must fail when the rules are broken, or a passing check proves nothing. Each break is a step
// around the real `reduce`; no source is edited.
const sortingField = (s: GameState) => (s.field.stage === "sorting" ? s.field : null);
const breaks: Record<string, Step> = {
  "a wrong verdict sorts the star anyway": (s, e) => {
    const field = sortingField(s);
    if (e.type !== "SortStar" || !inField(s) || !field || field.looking === null)
      return reduce(s, e);
    const star = field.looking;
    return {
      ...s,
      field: {
        ...field,
        sorted: field.sorted.map((d, i) => d || i === star),
        looking: null,
        note: { star, said: e.verdict },
      },
    };
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
  "the last round does not clear the trial": (s, e) => {
    const after = reduce(s, e);
    return after.field.stage === "cleared"
      ? { ...after, field: { ...after.field, stage: "kept" } }
      : after;
  },
  "LeaveField works before the clear": (s, e) =>
    e.type === "LeaveField" && inField(s)
      ? { ...s, phase: "title", trial: 0, field: initialField }
      : reduce(s, e),
  "RetryField is ignored": (s, e) => (e.type === "RetryField" ? s : reduce(s, e)),
  "KeepStars is ignored": (s, e) => (e.type === "KeepStars" ? s : reduce(s, e)),
  "LeaveField is ignored": (s, e) => (e.type === "LeaveField" ? s : reduce(s, e)),
  "Tick runs the clock in the field": (s, e) =>
    e.type === "Tick" && s.trial === 3 ? { ...s, run: runDown(s.run, e.ms) } : reduce(s, e),
};

/**
 * A broken game drifts away from the record, and the two together would have far more states than the real
 * game. The broken checks therefore use one seed, no language, no hero and no events of the other trials
 * (the break of the clock adds its own tick).
 */
const small: readonly GameEvent[] = [
  enter,
  ...stars.map(look),
  sortAs("real"),
  sortAs("fake"),
  keep,
  retry,
  leave,
  { type: "Tick", ms: 1_000 },
];

/**
 * A goal break is checked without the invariants and an invariant break without a goal, so each report
 * shows the one check that is meant to notice the break.
 */
const brokenReport = (name: string, goal?: (w: Wrapped) => boolean, key = looseKey) =>
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

  it("when the last round does not clear the trial, the field differs from the record", () => {
    const report = brokenReport("the last round does not clear the trial");
    const bad = report.violations.find((v) => v.name === names.same || v.name === names.finished);
    expect(bad).toMatchObject({ kind: "invariant" });
    expect(bad!.trace.at(-1)).toEqual(keep);
  });

  it("when LeaveField works before the clear, the place invariant fails", () => {
    const [bad] = brokenReport("LeaveField works before the clear").violations;
    expect(bad).toMatchObject({ kind: "invariant", name: names.place });
    expect(bad!.trace).toEqual([enter, leave]);
  });

  it("when KeepStars is ignored, the cleared trial is unreachable from every state", () => {
    const [stuck] = brokenReport("KeepStars is ignored", cleared).violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
    expect(stuck!.state.game).toEqual(initialState);
  });

  it("when RetryField is ignored, the second round is unreachable, so the trial can never be cleared", () => {
    const name = "RetryField is ignored";
    const [noClear] = brokenReport(name, cleared).violations;
    expect(noClear).toMatchObject({ kind: "stuck", trace: [] });
    // A fresh round is lost as soon as one star is looked at: nothing can clear the lens again.
    const [lost] = brokenReport(name, freshRound).violations;
    expect(lost).toMatchObject({ kind: "stuck", trace: [enter, look(0)] });
  });

  it("when LeaveField is ignored, the title is unreachable once the field is entered", () => {
    const [stuck] = brokenReport("LeaveField is ignored", title, collapsedKey).violations;
    expect(stuck).toMatchObject({ kind: "stuck", trace: [enter] });
  });

  it("when Tick runs the clock in the field, the run invariant fails", () => {
    const [bad] = brokenReport("Tick runs the clock in the field").violations;
    expect(bad).toMatchObject({ kind: "invariant", name: names.untouched });
    expect(bad!.trace).toEqual([enter, { type: "Tick", ms: 1_000 }]);
  });
});
