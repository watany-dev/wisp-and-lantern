// Trial 2 (The Locked Shed, spec 05-trial-grant-tools): every state the real reducer reaches from the
// title through the shed button, and everything after it.
//
// Scope (REQ-5.13.4): the entrance from the title by `StartShed` and the shed after it. A `Start` from
// the title is trial 1's entrance and has its own model check, so the title's alphabet leaves it out;
// inside the shed `Start` is part of the alphabet (it must only set the language). This check does not
// ask that every state of trial 1 can reach the shed, and it drops no state of the shed to pass.

import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../events";
import { initialLane } from "../lane";
import { reduce } from "../reducer";
import { initialRun, runDown } from "../run";
import { initialShed, opensDoor, shedOutcome, tools, type ToolId } from "../shed";
import { initialState, type GameState } from "../state";
import { checkModel } from "./support/model-check";

/**
 * The real game state plus two things the game has no use for. They are an independent record of what
 * the child did, so a state invariant can tell a swapped tool or a second tool from the right one:
 * `expected` is the tool the child last picked in this attempt, `plays` the number of successes so
 * far (2 means "at least 2").
 */
type Wrapped = { game: GameState; expected: ToolId | null; plays: number };

type Step = (state: GameState, event: GameEvent) => GameState;

const inShed = (s: GameState) => s.phase === "trial" && s.trial === 2;

/** The wrapper's own bookkeeping, written from the spec and not from the reducer. */
function advance(step: Step) {
  return (w: Wrapped, event: GameEvent): Wrapped => {
    const game = step(w.game, event);
    let { expected } = w;
    if (inShed(w.game) && w.game.shed.stage === "choosing" && event.type === "PickTool") {
      expected = event.tool;
    }
    if (inShed(w.game) && w.game.shed.stage === "tried" && event.type === "RetryShed") {
      expected = null;
    }
    const opened = game.shed.stage === "tried" && opensDoor(game.shed.tool);
    const wasTried = w.game.shed.stage === "tried";
    const plays = opened && !wasTried ? Math.min(2, w.plays + 1) : w.plays;
    return { game, expected, plays };
  };
}

const start: Wrapped = { game: initialState, expected: null, plays: 0 };

// A finite alphabet. Two hero positions stand for "anywhere"; a short and a run-ending tick; one card
// of trial 1 and the events of trial 1 that must do nothing here.
const common: readonly GameEvent[] = [
  { type: "StartShed" },
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
  { type: "Tick", ms: 1_000 },
  { type: "Tick", ms: 60_000 },
];
const insideTheShed: readonly GameEvent[] = [
  ...common,
  { type: "Start" },
  { type: "Start", lang: "ja" },
];
const alphabet = (w: Wrapped) => (w.game.phase === "title" ? common : insideTheShed);

const invariants: Record<string, (w: Wrapped) => boolean> = {
  "phase, trial and shed agree: the title is trial 0, the shed is trial 2 in a trial, never over": (
    w,
  ) =>
    (w.game.phase === "title" && w.game.trial === 0) ||
    (w.game.phase === "trial" && w.game.trial === 2),
  "shed is the initial shed whenever trial is not 2": ({ game }) =>
    game.trial === 2 || game.shed === initialShed,
  "the lane and the run stay untouched: no clock, no score": ({ game }) =>
    game.lane === initialLane && game.run === initialRun,
  "a choosing state holds exactly the tool the child last picked": ({ game, expected }) =>
    game.shed.stage !== "choosing" || game.shed.pick === expected,
  "a tried state holds exactly the tool that was handed over": ({ game, expected }) =>
    game.shed.stage !== "tried" || game.shed.tool === expected,
  "the door is open exactly when the tried tool is the key": ({ game }) =>
    game.shed.stage !== "tried" ||
    (shedOutcome(game.shed) === "open") === (game.shed.tool === "key"),
};

const model = (
  goal: ((w: Wrapped) => boolean) | undefined,
  step: Step = reduce,
  initial: Wrapped = start,
  checks = invariants,
) =>
  checkModel<Wrapped, GameEvent>({
    initial,
    events: alphabet,
    step: advance(step),
    invariants: checks,
    goal,
  });

const open = (w: Wrapped) => shedOutcome(w.game.shed) === "open";
const freshChoosing = (w: Wrapped) =>
  inShed(w.game) && w.game.shed.stage === "choosing" && w.game.shed.pick === null;
const secondSuccess = (w: Wrapped) => w.plays === 2;
const triedWith = (tool: ToolId) => (w: Wrapped) =>
  w.game.shed.stage === "tried" && w.game.shed.tool === tool;

/** The shortest trace to a state, from an invariant that says "never this state". */
function shortestTrace(goal: (w: Wrapped) => boolean, from: Wrapped = start): GameEvent[] | null {
  const report = model(undefined, reduce, from, { never: (w) => !goal(w) });
  return report.violations[0]?.trace ?? null;
}

const play = (...events: GameEvent[]) => events.reduce(advance(reduce), start);
const pick = (tool: ToolId): GameEvent => ({ type: "PickTool", tool });
const give: GameEvent = { type: "GiveTool" };
const retry: GameEvent = { type: "RetryShed" };
const enter: GameEvent = { type: "StartShed" };

describe("trial 2, the shed (exhaustive model check)", () => {
  it("REQ-5.13: keeps every invariant in every reachable state", () => {
    const report = model(undefined);
    expect(report.violations).toEqual([]);
    // The title: 2 languages x 2 hero positions. The shed: 2 x 2 for each of 20 states. Those are
    // choosing with nothing picked (successes so far 0, 1 or 2) and with each of the 3 tools picked
    // (3 each), a tried key (1 or 2 successes), and a tried broom and hammer (3 each).
    expect(report.states).toBe(4 + 2 * 2 * 20);
  });

  it("REQ-5.6.4: from every state the key's open result is reachable (no soft-lock)", () => {
    const report = model(open);
    expect(report.violations).toEqual([]);
    expect(report.states).toBe(84);
  });

  it("REQ-5.6.2, REQ-5.6.3: from every state a fresh choosing in the shed is reachable", () => {
    expect(model(freshChoosing).violations).toEqual([]);
  });

  it("REQ-5.7.3: from every state, including after a success, a second success is reachable", () => {
    expect(model(secondSuccess).violations).toEqual([]);
  });
});

describe("trial 2: each result is reachable, and the shortest way to it", () => {
  it("a key open, a broom shut and a hammer shut are each reached in three events", () => {
    expect(shortestTrace(triedWith("key"))).toEqual([enter, pick("key"), give]);
    expect(shortestTrace(open)).toEqual([enter, pick("key"), give]);
    expect(shortestTrace(triedWith("broom"))).toEqual([enter, pick("broom"), give]);
    expect(shortestTrace(triedWith("hammer"))).toEqual([enter, pick("hammer"), give]);
  });

  it("a second success needs a retry between the two (the replay after a success)", () => {
    expect(shortestTrace(secondSuccess)).toEqual([
      enter,
      pick("key"),
      give,
      retry,
      pick("key"),
      give,
    ]);
  });

  it("REQ-5.6.2: from a shut result one retry returns to the same shed's choosing, nothing else changed", () => {
    for (const tool of ["broom", "hammer"] as const) {
      const shut = play(enter, pick(tool), give);
      expect(shedOutcome(shut.game.shed)).toBe("shut");
      expect(shortestTrace(freshChoosing, shut)).toEqual([retry]);
      expect(model(open, reduce, shut).violations).toEqual([]);
      const back = advance(reduce)(shut, retry);
      expect(back.game).toEqual({ ...shut.game, shed: initialShed });
    }
  });

  it("from a success the replay reaches the open result again", () => {
    const won = play(enter, pick("key"), give);
    expect(open(won)).toBe(true);
    expect(shortestTrace(secondSuccess, won)).toEqual([retry, pick("key"), give]);
    expect(model(secondSuccess, reduce, won).violations).toEqual([]);
  });
});

// The check must fail when the rules are broken, or a passing check proves nothing. Each break is a
// step around the real `reduce`; no source is edited.
const breaks: Record<string, Step> = {
  "the key's hand-over is ignored": (s, e) =>
    e.type === "GiveTool" && s.shed.stage === "choosing" && s.shed.pick === "key"
      ? s
      : reduce(s, e),
  "RetryShed is ignored": (s, e) => (e.type === "RetryShed" ? s : reduce(s, e)),
  "RetryShed is ignored after a success": (s, e) =>
    e.type === "RetryShed" && s.shed.stage === "tried" && s.shed.tool === "key" ? s : reduce(s, e),
  "GiveTool hands over the key whatever was picked": (s, e) => {
    const next = reduce(s, e);
    return e.type === "GiveTool" && next.shed.stage === "tried"
      ? { ...next, shed: { stage: "tried", tool: "key" } }
      : next;
  },
  "PickTool keeps the first pick": (s, e) =>
    e.type === "PickTool" && s.shed.stage === "choosing" && s.shed.pick !== null ? s : reduce(s, e),
  "Tick runs the clock in the shed": (s, e) =>
    e.type === "Tick" && s.trial === 2 ? { ...s, run: runDown(s.run, e.ms) } : reduce(s, e),
};

/**
 * A goal break is checked without the invariants and an invariant break without a goal, so each report
 * shows the one check that is meant to notice the break.
 */
const brokenReport = (name: string, goal?: (w: Wrapped) => boolean) =>
  model(goal, breaks[name], start, goal ? {} : invariants);

describe("trial 2: the checks fail on rules broken on purpose (REQ-5.13.4)", () => {
  it("when the key cannot be handed over, the open result is unreachable from every state", () => {
    const report = brokenReport("the key's hand-over is ignored", open);
    const [stuck] = report.violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
    expect(stuck!.state.game).toEqual(initialState);
    expect(report.violations).toHaveLength(1);
  });

  it("when RetryShed is ignored, a broom or a hammer result is a soft-lock", () => {
    const report = brokenReport("RetryShed is ignored", open);
    const [stuck] = report.violations;
    expect(stuck?.kind).toBe("stuck");
    expect(stuck!.state.game.shed.stage).toBe("tried");
    expect(shedOutcome(stuck!.state.game.shed)).toBe("shut");
    expect(stuck!.trace).toEqual([enter, pick("broom"), give]);
  });

  it("when RetryShed is ignored after a success, the replay is unreachable (the first success still is)", () => {
    const name = "RetryShed is ignored after a success";
    // Not even the start can reach a second success, so the first state reported is the start.
    const [fromStart] = brokenReport(name, secondSuccess).violations;
    expect(fromStart).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
    expect(brokenReport(name, open).violations).toEqual([]);
    // From the success itself: stuck right there, with the key tried.
    const won = play(enter, pick("key"), give);
    const [stuck] = model(secondSuccess, breaks[name], won, {}).violations;
    expect(stuck).toMatchObject({ kind: "stuck", trace: [] });
    expect(stuck!.state.game.shed).toEqual({ stage: "tried", tool: "key" });
  });

  it("when GiveTool hands over the key whatever was picked, the tried-tool invariant fails", () => {
    const report = brokenReport("GiveTool hands over the key whatever was picked");
    const [bad] = report.violations;
    expect(bad).toMatchObject({
      kind: "invariant",
      name: "a tried state holds exactly the tool that was handed over",
    });
    expect(bad!.trace).toEqual([enter, pick("broom"), give]);
  });

  it("when PickTool keeps the first pick, the pick invariant fails", () => {
    const report = brokenReport("PickTool keeps the first pick");
    const [bad] = report.violations;
    expect(bad).toMatchObject({
      kind: "invariant",
      name: "a choosing state holds exactly the tool the child last picked",
    });
    expect(bad!.trace).toEqual([enter, pick("key"), pick("broom")]);
  });

  it("when Tick runs the clock in the shed, the run invariant fails", () => {
    const report = brokenReport("Tick runs the clock in the shed");
    const [bad] = report.violations;
    expect(bad).toMatchObject({
      kind: "invariant",
      name: "the lane and the run stay untouched: no clock, no score",
    });
    expect(bad!.trace).toEqual([enter, { type: "Tick", ms: 1_000 }]);
  });
});
