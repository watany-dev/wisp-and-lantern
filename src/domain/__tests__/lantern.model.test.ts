// Trial 5 (The Flickering Lantern, spec 08-trial-tell-whats-wrong): every state the real reducer reaches from the
// title through trial 5's button, and everything after it: the 60-second run, the points and the cards, the lit
// lanterns, the end screen and the way back to the title.
//
// Scope (REQ-8.14.4): the entrance from the title by `StartLantern` and trial 5 after it. A `Start` from the title is
// trial 1's entrance and the entrances of trials 2 to 4 open other trials, which have their own model checks, so this
// alphabet leaves them out; the events of trials 1 to 4 that must do nothing here are in it. Inside a run `Start` is
// part of the alphabet (it must only set the language). On trial 5's end screen `Start` would begin trial 1, which has
// no way back to the title; the unit tests cover it, the alphabet does not. This check does not ask that every state
// of trials 1 to 4 can reach trial 5, and it drops no state of trial 5 to pass.

import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import type { GameEvent } from "../events";
import { initialField } from "../field";
import { initialLane } from "../lane";
import {
  broughtAt,
  faultAt,
  initialLantern,
  looksOf,
  parts,
  wishAt,
  type LookId,
  type PartId,
  type Shape,
} from "../lantern";
import { reduce } from "../reducer";
import { pointsFor, type Run } from "../run";
import { initialShadows } from "../shadows";
import { initialShed } from "../shed";
import { initialState, type GameState } from "../state";
import { modelChecker } from "./support/model-check";

/**
 * The real game state plus four things the game has no use for. They are an independent record of what the child
 * did, so a state invariant can tell a fix that changed the wrong part, a lantern lit by a wrong card or a wrong score
 * from the right one: `said` is the look of the last card that counted in this round, `rightSaid` whether a right card
 * was picked in this round, `lits` the lanterns lit so far (2 means "at least 2"), and `scoreOk` is false from the
 * first step on that moved the score when it should not have.
 */
type Wrapped = {
  game: GameState;
  said: LookId | null;
  rightSaid: boolean;
  lits: number;
  scoreOk: boolean;
};

type Step = (state: GameState, event: GameEvent) => GameState;

const running = (s: GameState) => s.phase === "trial" && s.trial === 5;
const differing = (a: Shape, b: Shape) => parts.filter((p) => a[p] !== b[p]);
const fault = (s: GameState) => faultAt(s.lantern.seed, s.lantern.round);
const wish = (s: GameState) => wishAt(s.lantern.seed, s.lantern.round);

/** The look a card says, when the event is a card that counts: a part is pointed at and the look is one of its two cards. */
function cardNow(before: GameState, event: GameEvent): LookId | null {
  const lantern = before.lantern;
  if (event.type !== "FixPart" || !running(before) || lantern.stage !== "pointing") return null;
  const cards = looksOf[lantern.part].filter((l) => l !== lantern.shape[lantern.part]);
  return cards.includes(event.look) ? event.look : null;
}

/** A new round began, a new run began, or the child is on the title: nothing has been said in it yet. */
function freshRound(before: GameState, game: GameState, event: GameEvent): boolean {
  if (game.phase === "title") return true;
  if (event.type === "StartLantern" && game !== before) return true;
  return event.type === "NextLantern" && game.lantern.round !== before.lantern.round;
}

/** Whether the score moved as the spec says: a right card adds the points for the streak, nothing else moves it. */
function scoreMovedRightly(before: GameState, game: GameState, event: GameEvent): boolean {
  if (event.type === "StartLantern" || event.type === "LeaveLantern") return true;
  const gained = game.run.score - before.run.score;
  const said = cardNow(before, event);
  const right = said !== null && said === wish(before)[fault(before)];
  return right ? gained === pointsFor(before.run.streak) : gained === 0;
}

/** Explores each state space once for this file; see `modelChecker`. */
const checkModel = modelChecker<Wrapped, GameEvent>();

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
    const said = cardNow(before, event);
    const right = said !== null && said === wish(before)[fault(before)];
    const lit = before.lantern.stage !== "lit" && game.lantern.stage === "lit" && running(game);
    const fresh = freshRound(before, game, event);
    return {
      game,
      said: fresh ? null : (said ?? w.said),
      rightSaid: fresh ? false : w.rightSaid || right,
      lits: lit ? Math.min(2, w.lits + 1) : w.lits,
      scoreOk: w.scoreOk && scoreMovedRightly(before, game, event),
    };
  };
}

const start: Wrapped = { game: initialState, said: null, rightSaid: false, lits: 0, scoreOk: true };

// A finite alphabet. Two hero positions stand for "anywhere"; two seeds start two different rounds (seed 0 brings a
// bell for a ring, seed 1 a ring for a bow); a point at every part and a card for every look; a short and a
// run-ending tick; and the events of the other trials that must do nothing here.
const seeds = [0, 1];
const enterWith = (seed: number): GameEvent => ({ type: "StartLantern", seed });
const allLooks = parts.flatMap((p) => looksOf[p]);
const common: readonly GameEvent[] = [
  ...seeds.map(enterWith),
  { type: "LeaveLantern" },
  { type: "SetLang", lang: "ja" },
  { type: "SetLang", lang: "en" },
  { type: "MoveHeroTo", x: 0, y: 0 },
  { type: "MoveHeroTo", x: 195, y: 612 },
  ...parts.map((part): GameEvent => ({ type: "TapPart", part })),
  ...allLooks.map((look): GameEvent => ({ type: "FixPart", look })),
  { type: "NextLantern" },
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
  { type: "DecideItem", choice: "give" },
  { type: "NextItem" },
  { type: "LeaveShadows" },
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
 * The alphabet with neither the clock nor the way back to the title: the run never ends and the child never leaves,
 * so trial 5's own parts and buttons must always give a way on.
 */
const staying = (w: Wrapped) => {
  const events = common.filter((e) => e.type !== "LeaveLantern");
  return w.game.phase === "trial" ? [...events, ...inARun] : events;
};

/** Only trial 5's own events: for a broken game whose states would not fit the full alphabet. */
const leanEvents = common.filter(
  (e) =>
    e.type === "StartLantern" ||
    e.type === "TapPart" ||
    e.type === "FixPart" ||
    e.type === "NextLantern",
);
const lean = () => leanEvents;

const enter = enterWith(0);

/**
 * The states the real reducer reaches: the title (2 languages x 2 hero positions), and trial 5: a run in progress or
 * its end screen, with the clock full, running or at zero, the score none or some, the best none or some, the round
 * (modulo 6), the lantern's stage, look and note, the record flag, and the wrapper's record.
 */
const EXPECTED_STATES = 4996;

const invariants: Record<string, (w: Wrapped) => boolean> = {
  "phase, trial and lantern agree: the title is trial 0, a run or its end screen is trial 5": ({
    game,
  }) =>
    (game.phase === "title" && game.trial === 0) ||
    ((game.phase === "trial" || game.phase === "over") && game.trial === 5),
  "lantern is the initial value whenever trial is not 5": ({ game }) =>
    game.trial === 5 || game.lantern === initialLantern,
  "the lane, the shed, the field and the shadows stay untouched": ({ game }) =>
    game.lane === initialLane &&
    game.shed === initialShed &&
    game.field === initialField &&
    game.shadows === initialShadows,
  "the clock is between 0 and 60 seconds, and the run is over exactly when it is at zero": ({
    game,
  }) =>
    game.run.remainingMs >= 0 &&
    game.run.remainingMs <= balance.runMs &&
    (game.phase === "over") === (game.run.remainingMs === 0 && game.trial === 5),
  "until it is lit the lantern differs from the wish in exactly the round's fault part": ({
    game,
  }) =>
    game.lantern.stage === "lit" ||
    differing(game.lantern.shape, wish(game)).join() === fault(game),
  "after a card the fault part has the look the child said": ({ game, said }) =>
    game.lantern.stage === "lit" || said === null || game.lantern.shape[fault(game)] === said,
  "the lantern is lit only after a right card in this round": ({ game, rightSaid }) =>
    game.lantern.stage !== "lit" || rightSaid,
  "the score moves only on a right card": ({ scoreOk }) => scoreOk,
};

/**
 * The run's score and the round grow without end, so they are not part of a state's identity: the score is kept only
 * as "some" or "none", the clock as full, running or at zero, and the round modulo 6 (the rounds of a seed repeat
 * every six).
 */
function identity(w: Wrapped): string {
  const { run, lantern } = w.game;
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
      lantern: { ...lantern, round: lantern.round % 6 },
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

const pointing = (w: Wrapped) => running(w.game) && w.game.lantern.stage === "pointing";
const wrongCard = (w: Wrapped) =>
  running(w.game) && w.game.lantern.stage === "looking" && w.game.lantern.note?.kind === "said";
const toldFine = (w: Wrapped) =>
  running(w.game) && w.game.lantern.stage === "looking" && w.game.lantern.note?.kind === "fine";
const isLit = (w: Wrapped) => running(w.game) && w.game.lantern.stage === "lit";
const nextRound = (w: Wrapped) => running(w.game) && w.game.lantern.round >= 1;
const secondLit = (w: Wrapped) => w.lits === 2;
const onTheTitle = (w: Wrapped) => w.game.phase === "title";
const onTheEndScreen = (w: Wrapped) => w.game.phase === "over";

/** The shortest trace to a state, from an invariant that says "never this state". */
function shortestTrace(goal: (w: Wrapped) => boolean, from: Wrapped = start): GameEvent[] | null {
  const report = model(undefined, reduce, from, { never: (w) => !goal(w) });
  return report.violations[0]?.trace ?? null;
}

const play = (...events: GameEvent[]) => events.reduce(advance(reduce), start);
const tap = (part: PartId): GameEvent => ({ type: "TapPart", part });
const fix = (look: LookId): GameEvent => ({ type: "FixPart", look });
const next: GameEvent = { type: "NextLantern" };
const leave: GameEvent = { type: "LeaveLantern" };
const timeUp: GameEvent = { type: "Tick", ms: balance.runMs };

describe("trial 5, the lantern (exhaustive model check)", () => {
  it("REQ-8.14.4: keeps every invariant in every reachable state", () => {
    const report = model(undefined);
    expect(report.violations).toEqual([]);
    expect(report.states).toBe(EXPECTED_STATES);
  });

  it("REQ-8.9.7: from every state a point, a wrong card, a steady part told fine and a lit lantern are reachable (no soft-lock)", () => {
    for (const goal of [pointing, wrongCard, toldFine, isLit]) {
      expect(model(goal).violations).toEqual([]);
    }
  });

  it("REQ-8.9.5: from every state the title is reachable: the way back is never lost", () => {
    expect(model(onTheTitle).violations).toEqual([]);
  });

  it("REQ-8.9.4: from every state the run can end, and the end screen can be reached", () => {
    expect(model(onTheEndScreen).violations).toEqual([]);
  });

  it("REQ-8.9.7: with the clock stopped and no way back, a lit lantern, the next round and a second lit lantern are reachable from every state", () => {
    for (const goal of [isLit, nextRound, secondLit]) {
      expect(model(goal, reduce, start, invariants, staying).violations).toEqual([]);
    }
  });
});

describe("trial 5: each result is reachable, and the shortest way to it", () => {
  it("seed 0 brings a bell for the wish's ring: the handle flickers, and its cards are the ring and the bow", () => {
    expect(wishAt(0, 0).handle).toBe("ring");
    expect(broughtAt(0, 0).handle).toBe("bell");
    expect(faultAt(0, 0)).toBe("handle");
  });

  it("a point takes two events, a card three: the seed, the flickering part, the card", () => {
    expect(shortestTrace(pointing)).toEqual([enter, tap("handle")]);
    expect(shortestTrace(toldFine)).toEqual([enter, tap("roof")]);
    expect(shortestTrace(isLit)).toEqual([enter, tap("handle"), fix("ring")]);
    expect(shortestTrace(wrongCard)).toEqual([enter, tap("handle"), fix("bow")]);
  });

  it("the next round and a second lit lantern need a next between", () => {
    const first = [enter, tap("handle"), fix("ring"), next];
    expect(shortestTrace(nextRound)).toEqual(first);
    expect(shortestTrace(secondLit)).toEqual([...first, tap("roof"), fix("flat")]);
  });

  it("REQ-8.5.4: after a wrong card the right card is two events away: point again, pick it", () => {
    const said = play(enter, tap("handle"), fix("bow"));
    expect(wrongCard(said)).toBe(true);
    expect(shortestTrace(isLit, said)).toEqual([tap("handle"), fix("ring")]);
  });

  it("REQ-8.9.5: the title is one event away from any state of a run or the end screen", () => {
    expect(shortestTrace(onTheTitle, play(enter, tap("handle")))).toEqual([leave]);
    const over = play(enter, timeUp);
    expect(over.game.phase).toBe("over");
    expect(shortestTrace(onTheTitle, over)).toEqual([leave]);
  });

  it("REQ-8.9.4: from the end screen a new run is one event away, with a full clock", () => {
    const over = play(enter, tap("handle"), fix("ring"), timeUp);
    const again = advance(reduce)(over, enterWith(1));
    expect(again.game.phase).toBe("trial");
    expect(again.game.run).toMatchObject({ remainingMs: 60_000, score: 0, best: 100 });
    expect(again.game.lantern).toMatchObject({ stage: "looking", seed: 1, round: 0 });
  });
});

// The check must fail when the rules are broken, or a passing check proves nothing. Each break is a step around the
// real `reduce`; no source is edited.
const isCard = (s: GameState, e: GameEvent) => cardNow(s, e) !== null;
const breaks: Record<string, Step> = {
  "a wrong card lights the lantern anyway": (s, e) =>
    isCard(s, e)
      ? { ...s, lantern: { stage: "lit", seed: s.lantern.seed, round: s.lantern.round } }
      : reduce(s, e),
  "a card starts over with the lantern the wisp brought": (s, e) =>
    isCard(s, e)
      ? {
          ...s,
          lantern: {
            stage: "looking",
            seed: s.lantern.seed,
            round: s.lantern.round,
            shape: broughtAt(s.lantern.seed, s.lantern.round),
            note: null,
          },
        }
      : reduce(s, e),
  "a wrong card also changes another part": (s, e) => {
    const after = reduce(s, e);
    const lantern = after.lantern;
    if (!isCard(s, e) || lantern.stage !== "looking") return after;
    const other = parts.find((p) => p !== fault(s))!;
    const look = looksOf[other].find((l) => l !== lantern.shape[other])!;
    return {
      ...after,
      lantern: { ...lantern, shape: { ...lantern.shape, [other]: look } },
    };
  },
  "a point at a steady part opens its cards": (s, e) => {
    const after = reduce(s, e);
    if (
      e.type !== "TapPart" ||
      after.lantern.stage !== "looking" ||
      after.lantern.note?.kind !== "fine"
    )
      return after;
    const { seed, round, shape } = after.lantern;
    return { ...after, lantern: { stage: "pointing", seed, round, shape, part: e.part } };
  },
  "NextLantern is ignored": (s, e) => (e.type === "NextLantern" ? s : reduce(s, e)),
  "Tick does not run the clock in trial 5": (s, e) =>
    e.type === "Tick" && s.trial === 5 ? s : reduce(s, e),
  "LeaveLantern is ignored": (s, e) => (e.type === "LeaveLantern" ? s : reduce(s, e)),
  "a wrong card scores too": (s, e) => {
    const after = reduce(s, e);
    return isCard(s, e) && after.lantern.stage !== "lit"
      ? { ...after, run: { ...after.run, score: after.run.score + 100 } }
      : after;
  },
};

/**
 * A goal break is checked without the invariants and an invariant break without a goal, so each report shows the one
 * check that is meant to notice the break.
 */
const brokenReport = (
  name: string,
  goal?: (w: Wrapped) => boolean,
  events: (w: Wrapped) => readonly GameEvent[] = withClock,
) => model(goal, breaks[name], start, goal ? {} : invariants, events);

const firstViolation = (name: string) => brokenReport(name).violations[0];

describe("trial 5: the checks fail on rules broken on purpose (REQ-8.14.4)", () => {
  it("when a wrong card lights the lantern anyway, the lit-only-after-a-right-card invariant fails", () => {
    expect(firstViolation("a wrong card lights the lantern anyway")).toMatchObject({
      kind: "invariant",
      name: "the lantern is lit only after a right card in this round",
      trace: [enter, tap("handle"), fix("bow")],
    });
  });

  it("when a card starts over with the lantern the wisp brought, a lit lantern is unreachable from every state", () => {
    const [stuck] = brokenReport(
      "a card starts over with the lantern the wisp brought",
      isLit,
    ).violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
  });

  it("when a wrong card also changes another part, the one-part invariant fails", () => {
    const names = brokenReport("a wrong card also changes another part").violations.map(
      (v) => v.name,
    );
    expect(names).toContain(
      "until it is lit the lantern differs from the wish in exactly the round's fault part",
    );
  });

  it("when a point at a steady part opens its cards, a card there makes a second part different", () => {
    // With every part open to cards the broken game has more looks than the full alphabet can explore, so this one
    // runs on the trial's own events only: the seeds, the points, the cards and the next lantern.
    const bad = model(
      undefined,
      breaks["a point at a steady part opens its cards"],
      start,
      invariants,
      lean,
    ).violations.find((v) => v.name.startsWith("until it is lit"));
    expect(bad).toMatchObject({ kind: "invariant", trace: [enter, tap("roof"), fix("round")] });
  });

  it("when NextLantern is ignored, a lit lantern is a dead end, unless the clock or the way back gives a way out", () => {
    // A point is reachable from the title; once a lantern is lit there is no point again.
    const [stuck] = brokenReport("NextLantern is ignored", pointing, staying).violations;
    expect(stuck).toMatchObject({
      kind: "stuck",
      name: "goal",
      trace: [enter, tap("handle"), fix("ring")],
    });
    expect(isLit(stuck!.state)).toBe(true);
    // With the clock running or the leave allowed, there is a way out: that is why both are taken away.
    expect(brokenReport("NextLantern is ignored", pointing).violations).toEqual([]);
  });

  it("when Tick does not run the clock in trial 5, the end screen is unreachable from every state", () => {
    const [stuck] = brokenReport(
      "Tick does not run the clock in trial 5",
      onTheEndScreen,
    ).violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
  });

  it("when LeaveLantern is ignored, the title is unreachable from trial 5", () => {
    const [stuck] = brokenReport("LeaveLantern is ignored", onTheTitle).violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [enter] });
    expect(stuck!.state.game.trial).toBe(5);
  });

  it("when a wrong card also scores, the score invariant fails", () => {
    expect(firstViolation("a wrong card scores too")).toMatchObject({
      kind: "invariant",
      name: "the score moves only on a right card",
      trace: [enter, tap("handle"), fix("bow")],
    });
  });
});
