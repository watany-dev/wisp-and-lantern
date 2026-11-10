// Trial 3 (The Wisp Field, spec 06-trial-verify-stars): every state the real reducer reaches from the
// title through the field button, and everything after it.
//
// Scope (REQ-6.12.4): the entrance from the title by `StartField` and the field after it. A `Start` or a
// `StartShed` from the title is another trial's entrance and has its own model check, so the title's
// alphabet leaves them out; inside the field both are part of the alphabet (`Start` must only set the
// language, `StartShed` must do nothing). This check does not ask that every state of trial 1 or 2 can
// reach the field, and it drops no state of the field to pass.

import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../events";
import { initialField, keptStars, markOf } from "../field";
import { initialLane } from "../lane";
import { reduce } from "../reducer";
import { initialRun, runDown } from "../run";
import { initialShed } from "../shed";
import { initialState, type GameState } from "../state";
import { checkModel } from "./support/model-check";

/**
 * This test's own copy of the round table: the fake stars of each round. It is written from the spec,
 * not read from the source, so a change to the table in the source fails here.
 */
const fakeStars: readonly (readonly number[])[] = [[3], [0, 2], [4], [1, 3]];
const stars = [0, 1, 2, 3, 4];

/**
 * What the child did this round, as an independent record: the stars checked (a set, in order of number), the star
 * checked last, the round expected, and whether the keep happened. `plays` counts the kept results so far
 * (2 means "at least 2"). Neither is part of the game; they let a state invariant tell a wrong mark, a
 * wrong round or a keep that came too early from the right ones.
 */
type Done = { round: number; checked: number[]; last: number | null; kept: boolean };
type Wrapped = { game: GameState; record: Done; plays: number };

type Step = (state: GameState, event: GameEvent) => GameState;

const inField = (s: GameState) => s.phase === "trial" && s.trial === 3;
const freshRecord: Done = { round: 0, checked: [], last: null, kept: false };
const isStar = (i: number) => Number.isInteger(i) && i >= 0 && i <= 4;

/** The record's own bookkeeping, written from the spec and not from the reducer. */
function note(record: Done, event: GameEvent): Done {
  if (event.type === "CheckStar") {
    const fresh = !record.kept && isStar(event.index) && !record.checked.includes(event.index);
    return fresh
      ? {
          ...record,
          checked: [...record.checked, event.index].sort((a, b) => a - b),
          last: event.index,
        }
      : record;
  }
  if (event.type === "KeepStars") {
    // The kept field has no star "checked last" any more, so the record forgets it as well.
    return !record.kept && record.checked.length === 5
      ? { ...record, kept: true, last: null }
      : record;
  }
  if (event.type === "RetryField" && record.kept) {
    return { round: (record.round + 1) % fakeStars.length, checked: [], last: null, kept: false };
  }
  return record;
}

function advance(step: Step) {
  return (w: Wrapped, event: GameEvent): Wrapped => {
    const game = step(w.game, event);
    if (!inField(w.game)) return { game, record: w.record, plays: w.plays };
    const record = note(w.record, event);
    // `plays` counts what the game did, not what the record expects, so a broken game cannot fake a replay.
    const keptNow = game.field.stage === "kept" && w.game.field.stage !== "kept";
    return { game, record, plays: keptNow ? Math.min(2, w.plays + 1) : w.plays };
  };
}

const start: Wrapped = { game: initialState, record: freshRecord, plays: 0 };

// A finite alphabet. Two hero positions stand for "anywhere"; a short and a run-ending tick; one card of
// trial 1 and the events of trials 1 and 2 that must do nothing here; every star, and two indexes that
// are not stars.
const common: readonly GameEvent[] = [
  { type: "StartField" },
  { type: "SetLang", lang: "ja" },
  { type: "SetLang", lang: "en" },
  { type: "MoveHeroTo", x: 0, y: 0 },
  { type: "MoveHeroTo", x: 195, y: 612 },
  ...stars.map((index): GameEvent => ({ type: "CheckStar", index })),
  { type: "CheckStar", index: 5 },
  { type: "CheckStar", index: -1 },
  { type: "KeepStars" },
  { type: "RetryField" },
  { type: "PickCard", card: "red" },
  { type: "Ask" },
  { type: "Retry" },
  { type: "Tick", ms: 1_000 },
  { type: "Tick", ms: 60_000 },
  { type: "PickTool", tool: "key" },
  { type: "GiveTool" },
  { type: "RetryShed" },
];
const insideTheField: readonly GameEvent[] = [
  ...common,
  { type: "Start" },
  { type: "Start", lang: "ja" },
  { type: "StartShed" },
];
const alphabet = (w: Wrapped) => (w.game.phase === "title" ? common : insideTheField);

const fakeIn = (round: number, star: number) => fakeStars[round]!.includes(star);
const sameStars = (a: readonly number[], b: readonly number[]) =>
  [...a].sort((x, y) => x - y).join() === [...b].sort((x, y) => x - y).join();

const invariants: Record<string, (w: Wrapped) => boolean> = {
  "phase, trial and field agree: the title is trial 0, the field is trial 3 in a trial, never over":
    (w) =>
      (w.game.phase === "title" && w.game.trial === 0) ||
      (w.game.phase === "trial" && w.game.trial === 3),
  "field is the initial field whenever trial is not 3": ({ game }) =>
    game.trial === 3 || game.field === initialField,
  "the lane, the run and the shed stay untouched: no clock, no score, no tool": ({ game }) =>
    game.lane === initialLane && game.run === initialRun && game.shed === initialShed,
  "the field holds exactly the stars the child checked, the star checked last and the round": ({
    game,
    record,
  }) => {
    if (!inField(game)) return true;
    const { field } = game;
    if (field.stage === "kept") return record.kept && field.round === record.round;
    const done = stars.filter((i) => field.checked[i]);
    return (
      !record.kept &&
      field.round === record.round &&
      sameStars(done, record.checked) &&
      field.last === record.last
    );
  },
  "a star shows what it is: real or fake as the round says, and unchecked until it is checked": ({
    game,
    record,
  }) =>
    !inField(game) ||
    stars.every((i) => {
      const known = record.kept || record.checked.includes(i);
      const truth = fakeIn(record.round, i) ? "fake" : "real";
      return markOf(game.field, i) === (known ? truth : "unchecked");
    }),
  "the field is kept only after all five stars were checked": ({ game, record }) =>
    !(inField(game) && game.field.stage === "kept") || record.checked.length === 5,
  "the stars kept are the real stars of the round, and none is fake": ({ game, record }) =>
    !(inField(game) && game.field.stage === "kept") ||
    (sameStars(
      keptStars(game.field),
      stars.filter((i) => !fakeIn(record.round, i)),
    ) &&
      keptStars(game.field).every((i) => !fakeIn(record.round, i))),
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

const kept = (w: Wrapped) => inField(w.game) && w.game.field.stage === "kept";
const freshRound = (w: Wrapped) =>
  inField(w.game) && w.game.field.stage === "checking" && w.record.checked.length === 0;
const secondKept = (w: Wrapped) => w.plays === 2;
const foundFake = (w: Wrapped) =>
  inField(w.game) &&
  w.game.field.stage === "checking" &&
  w.record.last !== null &&
  fakeIn(w.record.round, w.record.last);
const foundReal = (w: Wrapped) =>
  inField(w.game) &&
  w.game.field.stage === "checking" &&
  w.record.last !== null &&
  !fakeIn(w.record.round, w.record.last);

/** The shortest trace to a state, from an invariant that says "never this state". */
function shortestTrace(goal: (w: Wrapped) => boolean, from: Wrapped = start): GameEvent[] | null {
  const report = model(undefined, { initial: from, invariants: { never: (w) => !goal(w) } });
  return report.violations[0]?.trace ?? null;
}

const play = (...events: GameEvent[]) => events.reduce(advance(reduce), start);
const check = (index: number): GameEvent => ({ type: "CheckStar", index });
const keep: GameEvent = { type: "KeepStars" };
const retry: GameEvent = { type: "RetryField" };
const enter: GameEvent = { type: "StartField" };
const checkAll = stars.map(check);

describe("trial 3, the field (exhaustive model check)", () => {
  it("REQ-6.12: keeps every invariant in every reachable state", () => {
    const report = model(undefined);
    expect(report.violations).toEqual([]);
    // The title: 2 languages x 2 hero positions. The field: 2 x 2 for each of the 491 states a round can
    // be in. A round in progress has 81 states (k stars checked and any one of them last: 1 + 5 + 20 +
    // 30 + 20 + 5), and the kept result 1. The model also counts the kept results so far (0, 1, or 2
    // or more), which the history decides: the first pass round 0, 1, 2, 3 gives 0, 1, 2, 2; the
    // second pass gives 2 for rounds 0 and 1. That is 6 rounds in progress and 5 kept results.
    expect(report.states).toBe(4 + 2 * 2 * (6 * 81 + 5));
  });

  it("REQ-6.7.4: from every state the kept result is reachable (no soft-lock)", () => {
    const report = model(kept);
    expect(report.violations).toEqual([]);
    expect(report.states).toBe(1968);
  });

  it("REQ-6.7.1: from every state a fresh round in the field is reachable", () => {
    expect(model(freshRound).violations).toEqual([]);
  });

  it("REQ-6.7.2: from every state, including after a keep, a second kept result is reachable", () => {
    expect(model(secondKept).violations).toEqual([]);
  });
});

describe("trial 3: each result is reachable, and the shortest way to it", () => {
  it("a real star found and a fake star found are each reached in two events", () => {
    expect(shortestTrace(foundReal)).toEqual([enter, check(0)]);
    expect(shortestTrace(foundFake)).toEqual([enter, check(3)]);
  });

  it("the kept result needs the entrance, five checks and the keep: seven events", () => {
    expect(shortestTrace(kept)).toEqual([enter, ...checkAll, keep]);
  });

  it("a second kept result needs a retry between the two (the next round)", () => {
    expect(shortestTrace(secondKept)).toEqual([enter, ...checkAll, keep, retry, ...checkAll, keep]);
  });

  it("REQ-6.7.1: from a kept result one retry reaches a fresh next round, nothing else changed", () => {
    const done = play(enter, ...checkAll, keep);
    expect(kept(done)).toBe(true);
    expect(shortestTrace(freshRound, done)).toEqual([retry]);
    const back = advance(reduce)(done, retry);
    expect(back.game.field).toEqual({ ...initialField, round: 1 });
    expect(back.game).toEqual({ ...done.game, field: back.game.field });
    expect(model(kept, { initial: done }).violations).toEqual([]);
  });

  it("from a keep the next round reaches the kept result again", () => {
    const done = play(enter, ...checkAll, keep);
    expect(shortestTrace(secondKept, done)).toEqual([retry, ...checkAll, keep]);
    expect(model(secondKept, { initial: done }).violations).toEqual([]);
  });
});

// The check must fail when the rules are broken, or a passing check proves nothing. Each break is a step
// around the real `reduce`; no source is edited.
const next = (s: GameState): GameState["field"] => s.field;
const breaks: Record<string, Step> = {
  "KeepStars works with a star unchecked": (s, e) =>
    e.type === "KeepStars" && inField(s) && s.field.stage === "checking"
      ? { ...s, field: { stage: "kept", round: s.field.round } }
      : reduce(s, e),
  "CheckStar also checks the next star": (s, e) => {
    const after = reduce(s, e);
    const field = next(after);
    if (e.type !== "CheckStar" || field.stage !== "checking" || after === s) return after;
    return {
      ...after,
      field: { ...field, checked: field.checked.map((c, i) => c || i === e.index + 1) },
    };
  },
  "a second CheckStar on a star unchecks it": (s, e) => {
    const field = next(s);
    if (e.type !== "CheckStar" || !inField(s) || field.stage !== "checking") return reduce(s, e);
    if (!field.checked[e.index]) return reduce(s, e);
    return {
      ...s,
      field: { ...field, checked: field.checked.map((c, i) => c && i !== e.index) },
    };
  },
  "CheckStar moves to the next round": (s, e) => {
    const after = reduce(s, e);
    const field = next(after);
    return e.type === "CheckStar" && field.stage === "checking" && after !== s
      ? { ...after, field: { ...field, round: (field.round + 1) % 4 } }
      : after;
  },
  "RetryField is ignored": (s, e) => (e.type === "RetryField" ? s : reduce(s, e)),
  "KeepStars is ignored": (s, e) => (e.type === "KeepStars" ? s : reduce(s, e)),
  "Tick runs the clock in the field": (s, e) =>
    e.type === "Tick" && s.trial === 3 ? { ...s, run: runDown(s.run, e.ms) } : reduce(s, e),
};

/**
 * A goal break is checked without the invariants and an invariant break without a goal, so each report
 * shows the one check that is meant to notice the break.
 */
const brokenReport = (
  name: string,
  goal?: (w: Wrapped) => boolean,
  events?: (w: Wrapped) => readonly GameEvent[],
) =>
  model(goal, {
    step: breaks[name]!,
    invariants: goal ? {} : invariants,
    key: looseKey,
    ...(events && { events }),
  });

/** Two stars and the entrance are enough to show a break that is about one star. */
const fewEvents = () => [enter, check(0), check(1), check(5), keep, retry];

describe("trial 3: the checks fail on rules broken on purpose (REQ-6.12.4)", () => {
  it("when KeepStars works with a star unchecked, the kept-too-early invariant fails", () => {
    const report = brokenReport("KeepStars works with a star unchecked");
    const bad = report.violations.find(
      (v) => v.name === "the field is kept only after all five stars were checked",
    );
    expect(bad).toMatchObject({ kind: "invariant", trace: [enter, keep] });
    expect(bad!.state.game.field).toEqual({ stage: "kept", round: 0 });
  });

  it("when CheckStar also checks the next star, the checked-stars invariant fails", () => {
    const [bad] = brokenReport("CheckStar also checks the next star").violations;
    expect(bad).toMatchObject({
      kind: "invariant",
      name: "the field holds exactly the stars the child checked, the star checked last and the round",
    });
    expect(bad!.trace).toEqual([enter, check(0)]);
  });

  it("when a second CheckStar unchecks the star, the checked-stars invariant fails", () => {
    const [bad] = brokenReport(
      "a second CheckStar on a star unchecks it",
      undefined,
      fewEvents,
    ).violations;
    expect(bad).toMatchObject({
      kind: "invariant",
      name: "the field holds exactly the stars the child checked, the star checked last and the round",
    });
    expect(bad!.trace).toEqual([enter, check(0), check(0)]);
  });

  it("when CheckStar moves to the next round, a star shows the wrong truth and the round is wrong", () => {
    const report = brokenReport("CheckStar moves to the next round");
    const names = report.violations.map((v) => v.name);
    expect(names).toContain(
      "the field holds exactly the stars the child checked, the star checked last and the round",
    );
    expect(names).toContain(
      "a star shows what it is: real or fake as the round says, and unchecked until it is checked",
    );
    expect(report.violations[0]!.trace).toEqual([enter, check(0)]);
  });

  it("when KeepStars is ignored, the kept result is unreachable from every state", () => {
    const [stuck] = brokenReport("KeepStars is ignored", kept).violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
    expect(stuck!.state.game).toEqual(initialState);
  });

  it("when RetryField is ignored, the next round is unreachable (the first keep still is)", () => {
    const name = "RetryField is ignored";
    expect(brokenReport(name, kept).violations).toEqual([]);
    // A fresh round is lost as soon as one star is checked: nothing can clear the marks again.
    const [lost] = brokenReport(name, freshRound).violations;
    expect(lost).toMatchObject({ kind: "stuck", trace: [enter, check(0)] });
    // And the replay is unreachable from the very start.
    const [noReplay] = brokenReport(name, secondKept).violations;
    expect(noReplay).toMatchObject({ kind: "stuck", trace: [] });
    // From the kept result itself: stuck right there.
    const done = play(enter, ...checkAll, keep);
    const [stuck] = model(secondKept, {
      step: breaks[name]!,
      initial: done,
      invariants: {},
      key: looseKey,
    }).violations;
    expect(stuck).toMatchObject({ kind: "stuck", trace: [] });
    expect(stuck!.state.game.field).toEqual({ stage: "kept", round: 0 });
  });

  it("when Tick runs the clock in the field, the run invariant fails", () => {
    const [bad] = brokenReport("Tick runs the clock in the field").violations;
    expect(bad).toMatchObject({
      kind: "invariant",
      name: "the lane, the run and the shed stay untouched: no clock, no score, no tool",
    });
    expect(bad!.trace).toEqual([enter, { type: "Tick", ms: 1_000 }]);
  });
});
