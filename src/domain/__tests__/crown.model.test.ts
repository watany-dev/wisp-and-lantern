// Trial 6 (The Hollow Crown, spec 09-trial-hollow-crown): every state the real reducer reaches from the title through
// trial 6's button, and everything after it: the five steps of each of the three chains, the lit lamps, the clear,
// play again and the way back to the title.
//
// Scope (REQ-9.15.4): the entrance from the title by `StartCrown` and trial 6 after it. A `Start` from the title is
// trial 1's entrance and the entrances of trials 2 to 5 open other trials, which have their own model checks, so this
// alphabet leaves them out; the events of trials 1 to 5 that must do nothing here are in it, and so is `Start` inside
// trial 6 (it must only set the language). This check drops no state of trial 6 to pass. Trial 6 has no clock and no
// score, so its state space is finite as it is and nothing is abstracted.

import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import {
  initialCrown,
  lampCount,
  lampParts,
  madeAt,
  sameLamp,
  slipAt,
  thingsAt,
  toolFor,
  wishAt,
  wishOf,
  type Crown,
  type Lamp,
  type LampPart,
  type Thing,
} from "../crown";
import type { GameEvent } from "../events";
import { initialField } from "../field";
import { initialLane } from "../lane";
import { initialLantern, looksOf, type LookId } from "../lantern";
import { reduce } from "../reducer";
import { initialShadows } from "../shadows";
import { initialShed } from "../shed";
import { initialState, type GameState } from "../state";
import { modelChecker } from "./support/model-check";

/**
 * The real game state plus an independent record of what the child did, written from the spec and not from the
 * reducer: `picked` is the last card of each part the child pressed in this chain's tell step, `told` the lamp the
 * wisp was told (set by a `Tell` that moved on), `lits` the lamps lit in this visit, and `ok` holds one flag per rule,
 * false from the first step that broke it.
 */
type Rules = {
  order: boolean;
  told: boolean;
  tool: boolean;
  made: boolean;
  fix: boolean;
  lit: boolean;
  noRestart: boolean;
  run: boolean;
};
type Picked = Readonly<Record<LampPart, LookId | null>>;
type Wrapped = { game: GameState; picked: Picked; told: Lamp | null; lits: number; ok: Rules };

type Step = (state: GameState, event: GameEvent) => GameState;

const inCrown = (s: GameState) => s.phase === "trial" && s.trial === 6;
const lampOf = (c: Crown): Lamp | null =>
  c.stage === "checking" || c.stage === "fixing" ? c.lamp : null;
const chainOf = (c: Crown) => (c.stage === "clear" ? lampCount : c.chain);

/** The made lamp, from the spec: the told lamp, with the slip part neither the told look nor the wish's. */
function madeRightly(before: GameState, game: GameState, told: Lamp | null): boolean {
  if (before.crown.stage !== "going" || game.crown.stage !== "checking" || told === null)
    return true;
  const { seed, chain } = game.crown;
  const slip = slipAt(seed, chain);
  const made = game.crown.lamp;
  return lampParts.every((part) =>
    part === slip
      ? made[part] !== told[part] && made[part] !== wishAt(seed, chain)[part]
      : made[part] === told[part],
  );
}

/** A fix changed only the pointed part, to the look on the card, and nothing else in the lamp. */
function fixedRightly(before: GameState, game: GameState, event: GameEvent): boolean {
  const was = before.crown;
  if (was.stage !== "fixing" || game.crown.stage !== "checking" || event.type !== "FixLamp") {
    return true;
  }
  const part = was.part;
  if (part === null) return false;
  const lamp = game.crown.lamp;
  return lamp[part] === event.look && lampParts.every((p) => p === part || lamp[p] === was.lamp[p]);
}

/** A lamp is lit only by "same" on a lamp that is the wish. */
function litRightly(before: GameState, game: GameState, event: GameEvent): boolean {
  if (game.crown.stage !== "lit" || before.crown.stage === "lit" || !inCrown(game)) return true;
  const lamp = lampOf(before.crown);
  return (
    event.type === "CheckLamp" &&
    event.same &&
    lamp !== null &&
    sameLamp(lamp, wishOf(before.crown))
  );
}

/** Nothing goes back to the tell step inside a chain: the tell comes only with a new chain or a new visit. */
function noRestart(before: GameState, game: GameState): boolean {
  if (!inCrown(before) || !inCrown(game) || game.crown.stage !== "telling") return true;
  return before.crown.stage === "telling" || chainOf(game.crown) !== chainOf(before.crown);
}

/** Which stage each stage may move to, from the spec (REQ-9.3). */
const moves: Record<Crown["stage"], readonly Crown["stage"][]> = {
  telling: ["giving"],
  giving: ["going"],
  going: ["giving", "checking"],
  checking: ["fixing", "lit"],
  fixing: ["checking"],
  lit: ["telling", "clear"],
  clear: [],
};

/** Inside a visit the stage moves only along the chain. */
function inOrder(before: GameState, game: GameState, event: GameEvent): boolean {
  if (!inCrown(before) || !inCrown(game) || event.type === "StartCrown") return true;
  const from = before.crown.stage;
  const to = game.crown.stage;
  return from === to || moves[from].includes(to);
}

/** The wisp is told exactly the two cards the child picked last, and only when both are picked. */
function toldRightly(w: Wrapped, before: GameState, game: GameState): boolean {
  if (before.crown.stage !== "telling" || game.crown.stage !== "giving") return true;
  const { roof, light } = w.picked;
  return roof !== null && light !== null && sameLamp(game.crown.told, { roof, light });
}

/** The job is cleared only by its own tool, held by the wisp. */
function toolRightly(before: GameState, game: GameState): boolean {
  if (game.crown.stage !== "checking" || before.crown.stage === "checking") return true;
  if (before.crown.stage === "fixing") return true;
  const c = before.crown;
  return c.stage === "going" && c.tool === toolFor(c.seed, c.chain);
}

/** The cards the child pressed in the tell step: the last one of each part, cleared with a new chain or visit. */
function pickedNow(w: Wrapped, before: GameState, game: GameState, event: GameEvent): Picked {
  if (fresh(before, game)) return { roof: null, light: null };
  if (event.type !== "SayLook" || before.crown.stage !== "telling") return w.picked;
  const part = lampParts.find((p) => looksOf[p].includes(event.look));
  return part ? { ...w.picked, [part]: event.look } : w.picked;
}

const fresh = (before: GameState, game: GameState) =>
  !inCrown(game) || game.crown.stage === "clear" || chainOf(game.crown) !== chainOf(before.crown);

const advanced = new Map<Step, (w: Wrapped, event: GameEvent) => Wrapped>();
function advance(step: Step) {
  let wrapped = advanced.get(step);
  if (!wrapped) {
    wrapped = wrapStep(step);
    advanced.set(step, wrapped);
  }
  return wrapped;
}

function toldNow(w: Wrapped, before: GameState, game: GameState): Lamp | null {
  if (before.crown.stage === "telling" && game.crown.stage === "giving") return game.crown.told;
  return fresh(before, game) ? null : w.told;
}

function wrapStep(step: Step) {
  return (w: Wrapped, event: GameEvent): Wrapped => {
    const before = w.game;
    const game = step(before, event);
    const lit = before.crown.stage !== "lit" && game.crown.stage === "lit" && inCrown(game);
    const restart = game.phase === "title" || event.type === "StartCrown";
    return {
      game,
      picked: pickedNow(w, before, game, event),
      told: toldNow(w, before, game),
      lits: restart && game !== before ? 0 : w.lits + Number(lit),
      ok: {
        order: w.ok.order && inOrder(before, game, event),
        told: w.ok.told && toldRightly(w, before, game),
        tool: w.ok.tool && toolRightly(before, game),
        made: w.ok.made && madeRightly(before, game, w.told),
        fix: w.ok.fix && fixedRightly(before, game, event),
        lit: w.ok.lit && litRightly(before, game, event),
        noRestart: w.ok.noRestart && noRestart(before, game),
        run: w.ok.run && game.run === initialState.run,
      },
    };
  };
}

const allOk: Rules = {
  order: true,
  told: true,
  tool: true,
  made: true,
  fix: true,
  lit: true,
  noRestart: true,
  run: true,
};
const start: Wrapped = {
  game: initialState,
  picked: { roof: null, light: null },
  told: null,
  lits: 0,
  ok: allOk,
};

/** Checks each state space once for this file; see `modelChecker`. */
const checkModel = modelChecker<Wrapped, GameEvent>();

// A finite alphabet. Two seeds start two different visits (seed 0 has the leaves first and the house key as its
// secret; seed 1 the same jobs with another wish); every card, a handle's look; the five things of seed 0 and seed 1
// and one that is never on screen; both checks, both points, every fix card; two hero positions for "anywhere"; a
// short and a long tick; and the events of the other trials that must do nothing here.
const seeds = [0, 1];
const enterWith = (seed: number): GameEvent => ({ type: "StartCrown", seed });
const roofAndLight: readonly LookId[] = [...looksOf.roof, ...looksOf.light];
const shown: readonly Thing[] = ["broom", "hammer", "scissors", "houseKey", "address", "password"];
const common: readonly GameEvent[] = [
  ...seeds.map(enterWith),
  { type: "LeaveCrown" },
  { type: "SetLang", lang: "ja" },
  { type: "SetLang", lang: "en" },
  { type: "MoveHeroTo", x: 0, y: 0 },
  { type: "MoveHeroTo", x: 195, y: 612 },
  ...roofAndLight.map((look): GameEvent => ({ type: "SayLook", look })),
  { type: "SayLook", look: "bell" },
  { type: "Tell" },
  ...shown.map((thing): GameEvent => ({ type: "GiveItem", thing })),
  { type: "GiveItem", thing: "ladder" },
  { type: "Go" },
  { type: "CheckLamp", same: true },
  { type: "CheckLamp", same: false },
  ...lampParts.map((part): GameEvent => ({ type: "PointLamp", part })),
  ...roofAndLight.map((look): GameEvent => ({ type: "FixLamp", look })),
  { type: "NextLamp" },
  { type: "Tick", ms: 1_000 },
  { type: "Tick", ms: balance.runMs },
  { type: "PickCard", card: "red" },
  { type: "Ask" },
  { type: "GiveTool" },
  { type: "LeaveShed" },
  { type: "SortStar", verdict: "real" },
  { type: "LeaveField" },
  { type: "DecideItem", choice: "give" },
  { type: "LeaveShadows" },
  { type: "TapPart", part: "roof" },
  { type: "FixPart", look: "flat" },
  { type: "NextLantern" },
  { type: "LeaveLantern" },
];
const inATrial: readonly GameEvent[] = [{ type: "Start" }, { type: "Start", lang: "ja" }];

const withAll = (w: Wrapped) => (w.game.phase === "trial" ? [...common, ...inATrial] : common);
/** The alphabet without the way back to the title: trial 6's own buttons and parts must always give a way on. */
const staying = (w: Wrapped) => withAll(w).filter((e) => e.type !== "LeaveCrown");
/**
 * Only trial 6's own events, and fewer looks and things: for a broken game whose states would not fit the full
 * alphabet.
 */
const leanEvents = common.filter(
  (e) =>
    (e.type === "StartCrown" && e.seed === 0) ||
    ["Tell", "Go", "CheckLamp", "PointLamp", "NextLamp", "FixLamp", "SayLook", "GiveItem"].includes(
      e.type,
    ),
);
const lean = () => leanEvents;
const leanWithLeave = () => [...leanEvents, leave];
const leanWithTick = () => [...leanEvents, { type: "Tick", ms: 1_000 } as const];

const enter = enterWith(0);

/**
 * The title (2 languages x 2 hero positions) and trial 6 for two seeds: every stage of every chain with its picks,
 * notes and lamps, the clear, and the record.
 */
const EXPECTED_STATES = 10_284;

const invariants: Record<string, (w: Wrapped) => boolean> = {
  "phase, trial and crown agree: the title is trial 0, trial 6 is a trial": ({ game }) =>
    (game.phase === "title" && game.trial === 0) || inCrown(game),
  "crown is the initial value whenever trial is not 6": ({ game }) =>
    game.trial === 6 || game.crown === initialCrown,
  "the lane, the shed, the field, the shadows and the lantern stay untouched": ({ game }) =>
    game.lane === initialLane &&
    game.shed === initialShed &&
    game.field === initialField &&
    game.shadows === initialShadows &&
    game.lantern === initialLantern,
  "the run never moves: no clock and no score": ({ ok }) => ok.run,
  "the stage moves only along the chain": ({ ok }) => ok.order,
  "the wisp is told exactly the two cards picked": ({ ok }) => ok.told,
  "the job is cleared only by its own tool": ({ ok }) => ok.tool,
  "the made lamp keeps the told looks but the slip part": ({ ok }) => ok.made,
  "a fix changes only the pointed part, to the look on the card": ({ ok }) => ok.fix,
  "a lamp is lit only by 'same' on the wish": ({ ok }) => ok.lit,
  "the clear comes only after three lit lamps": ({ game, lits }) =>
    game.crown.stage !== "clear" || !inCrown(game) || lits === lampCount,
  "nothing goes back to the tell step inside a chain": ({ ok }) => ok.noRestart,
};

const identity = (w: Wrapped) => JSON.stringify(w);

const model = (
  goal: ((w: Wrapped) => boolean) | undefined,
  step: Step = reduce,
  initial: Wrapped = start,
  checks = invariants,
  events: (w: Wrapped) => readonly GameEvent[] = withAll,
) =>
  checkModel({
    initial,
    events,
    step: advance(step),
    invariants: checks,
    goal,
    key: identity,
  });

const stageIs = (stage: Crown["stage"]) => (w: Wrapped) =>
  inCrown(w.game) && w.game.crown.stage === stage;
const fixing = stageIs("fixing");
const isLit = stageIs("lit");
const cleared = stageIs("clear");
const onTheTitle = (w: Wrapped) => w.game.phase === "title";

/** The shortest trace to a state, from an invariant that says "never this state". */
function shortestTrace(goal: (w: Wrapped) => boolean, from: Wrapped = start): GameEvent[] | null {
  const report = model(undefined, reduce, from, { never: (w) => !goal(w) });
  return report.violations[0]?.trace ?? null;
}

const play = (...events: GameEvent[]) => events.reduce(advance(reduce), start);
const say = (look: LookId): GameEvent => ({ type: "SayLook", look });
const tell: GameEvent = { type: "Tell" };
const give = (thing: Thing): GameEvent => ({ type: "GiveItem", thing });
const go: GameEvent = { type: "Go" };
const same: GameEvent = { type: "CheckLamp", same: true };
const notSame: GameEvent = { type: "CheckLamp", same: false };
const point = (part: LampPart): GameEvent => ({ type: "PointLamp", part });
const fix = (look: LookId): GameEvent => ({ type: "FixLamp", look });
const leave: GameEvent = { type: "LeaveCrown" };

/** Seed 0, chain 0: the wish is a pointy roof and a candle, the job is the leaves, the wisp makes a round roof. */
const chain0 = [
  say("pointy"),
  say("candle"),
  tell,
  give("broom"),
  go,
  notSame,
  point("roof"),
  fix("pointy"),
  same,
];

describe("trial 6, the crown (exhaustive model check)", () => {
  it("REQ-9.15.4: keeps every invariant in every reachable state", () => {
    const report = model(undefined);
    expect(report.violations).toEqual([]);
    expect(report.states).toBe(EXPECTED_STATES);
  });

  it("REQ-9.10.6: from every state the fix step, a lit lamp, the clear and the title are reachable (no soft-lock)", () => {
    for (const goal of [fixing, isLit, cleared, onTheTitle]) {
      expect(model(goal).violations).toEqual([]);
    }
  });

  it("REQ-9.10.6: without the way back to the title, the clear is still reachable from every state", () => {
    expect(model(cleared, reduce, start, invariants, staying).violations).toEqual([]);
  });
});

describe("trial 6: each result is reachable, and the shortest way to it", () => {
  it("seed 0: the wish is a pointy roof and a candle, the leaves need the broom, the wisp slips in the roof", () => {
    expect(wishAt(0, 0)).toEqual({ roof: "pointy", light: "candle" });
    expect(toolFor(0, 0)).toBe("broom");
    expect(thingsAt(0, 0)).toEqual(["broom", "hammer", "houseKey"]);
    expect(madeAt(0, 0, wishAt(0, 0))).toEqual({ roof: "round", light: "candle" });
  });

  it("the fix takes seven events and a lit lamp ten: the seed, two cards, tell, give, go, not the same, point, card, same", () => {
    expect(shortestTrace(fixing)).toEqual([enter, ...chain0.slice(0, 6)]);
    expect(shortestTrace(isLit)).toEqual([enter, ...chain0]);
  });

  it("the clear needs all three chains, each ended by Next", () => {
    const trace = shortestTrace(cleared)!;
    expect(trace.filter((e) => e.type === "NextLamp")).toHaveLength(3);
    expect(trace.filter((e) => e.type === "CheckLamp" && e.same)).toHaveLength(3);
    expect(trace).toHaveLength(1 + 3 * (chain0.length + 1));
  });

  it("REQ-9.10.4: the title is one event away from any state of trial 6, the clear included", () => {
    const trace = shortestTrace(cleared)!;
    for (let n = 1; n <= trace.length; n += 1) {
      const at = play(...trace.slice(0, n));
      expect(inCrown(at.game)).toBe(true);
      expect(advance(reduce)(at, leave).game.phase).toBe("title");
    }
  });

  it("REQ-9.10.2: from the clear a new visit is one event away", () => {
    const trace = shortestTrace(cleared)!;
    const clear = play(...trace);
    expect(clear.game.crown).toEqual({ stage: "clear", seed: 0 });
    const again = advance(reduce)(clear, enterWith(1));
    expect(again.game.crown).toEqual({ ...initialCrown, seed: 1 });
    expect(again.lits).toBe(0);
  });
});

// The check must fail when the rules are broken, or a passing check proves nothing. Each break is a step around the
// real `reduce`; no source is edited.
const crownOf = (s: GameState, crown: Crown): GameState => ({ ...s, crown });
const isSecretThing = (thing: Thing) => ["houseKey", "address", "password"].includes(thing);
const breaks: Record<string, Step> = {
  "Tell with one card moves on": (s, e) => {
    const c = s.crown;
    if (e.type !== "Tell" || c.stage !== "telling" || !inCrown(s)) return reduce(s, e);
    const roof = c.told.roof ?? "pointy";
    const light = c.told.light ?? "candle";
    if (c.told.roof !== null && c.told.light !== null) return reduce(s, e);
    return crownOf(s, {
      stage: "giving",
      seed: c.seed,
      chain: c.chain,
      told: { roof, light },
      note: null,
    });
  },
  "any tool clears the job": (s, e) => {
    const c = s.crown;
    if (e.type !== "Go" || c.stage !== "going" || !inCrown(s)) return reduce(s, e);
    const lamp = madeAt(c.seed, c.chain, c.told);
    return crownOf(s, { stage: "checking", seed: c.seed, chain: c.chain, lamp, note: null });
  },
  "a secret clears the job": (s, e) => {
    const c = s.crown;
    if (e.type !== "GiveItem" || c.stage !== "giving" || !inCrown(s) || !isSecretThing(e.thing))
      return reduce(s, e);
    const lamp = madeAt(c.seed, c.chain, c.told);
    return crownOf(s, { stage: "checking", seed: c.seed, chain: c.chain, lamp, note: null });
  },
  "the wisp makes exactly the told lamp": (s, e) => {
    const after = reduce(s, e);
    const c = s.crown;
    if (e.type !== "Go" || c.stage !== "going" || after.crown.stage !== "checking") return after;
    return crownOf(after, { ...after.crown, lamp: c.told });
  },
  "'same' is accepted on a lamp that differs": (s, e) => {
    const c = s.crown;
    if (e.type !== "CheckLamp" || !e.same || c.stage !== "checking" || !inCrown(s))
      return reduce(s, e);
    return crownOf(s, { stage: "lit", seed: c.seed, chain: c.chain });
  },
  "a fix also changes the other part": (s, e) => {
    const after = reduce(s, e);
    const c = s.crown;
    if (e.type !== "FixLamp" || c.stage !== "fixing" || after.crown.stage !== "checking")
      return after;
    const checking = after.crown;
    const other = lampParts.find((p) => p !== c.part)!;
    const look = looksOf[other].find((l) => l !== checking.lamp[other])!;
    return crownOf(after, { ...checking, lamp: { ...checking.lamp, [other]: look } });
  },
  "a card starts the chain over": (s, e) => {
    const after = reduce(s, e);
    if (e.type !== "FixLamp" || s.crown.stage !== "fixing" || after.crown.stage !== "checking")
      return after;
    const { seed, chain } = after.crown;
    return crownOf(after, {
      stage: "telling",
      seed,
      chain,
      told: { roof: null, light: null },
      note: null,
    });
  },
  "NextLamp is ignored": (s, e) => (e.type === "NextLamp" ? s : reduce(s, e)),
  "LeaveCrown is ignored": (s, e) => (e.type === "LeaveCrown" ? s : reduce(s, e)),
  "Tick runs a clock in trial 6": (s, e) =>
    e.type === "Tick" && inCrown(s)
      ? { ...s, run: { ...s.run, remainingMs: balance.runMs / 2 } }
      : reduce(s, e),
};

/**
 * A goal break is checked without the invariants and an invariant break without a goal, so each report shows the one
 * check that is meant to notice the break. They run on trial 6's own events: a broken game can reach more states than
 * the full alphabet should explore.
 */
const brokenReport = (
  name: string,
  goal?: (w: Wrapped) => boolean,
  events: (w: Wrapped) => readonly GameEvent[] = lean,
) => model(goal, breaks[name], start, goal ? {} : invariants, events);

const violationNames = (name: string) => brokenReport(name).violations.map((v) => v.name);

describe("trial 6: the checks fail on rules broken on purpose (REQ-9.15.4)", () => {
  it("when Tell with one card moves on, the told invariant fails: the wisp was told a look nobody picked", () => {
    const bad = brokenReport("Tell with one card moves on").violations.find(
      (v) => v.name === "the wisp is told exactly the two cards picked",
    );
    expect(bad?.trace).toEqual([enter, tell]);
  });

  it("when any tool clears the job, the tool invariant fails", () => {
    const bad = brokenReport("any tool clears the job").violations.find(
      (v) => v.name === "the job is cleared only by its own tool",
    );
    expect(bad?.trace).toEqual([enter, say("pointy"), say("candle"), tell, give("hammer"), go]);
  });

  it("when a secret clears the job, the order invariant and the tool invariant fail", () => {
    const names = violationNames("a secret clears the job");
    expect(names).toContain("the stage moves only along the chain");
    expect(names).toContain("the job is cleared only by its own tool");
  });

  it("when the wisp makes exactly the told lamp, the made-lamp invariant fails", () => {
    expect(violationNames("the wisp makes exactly the told lamp")).toContain(
      "the made lamp keeps the told looks but the slip part",
    );
  });

  it("when 'same' is accepted on a lamp that differs, the lit invariant fails", () => {
    const bad = brokenReport("'same' is accepted on a lamp that differs").violations.find(
      (v) => v.name === "a lamp is lit only by 'same' on the wish",
    );
    expect(bad?.trace).toEqual([
      enter,
      say("pointy"),
      say("candle"),
      tell,
      give("broom"),
      go,
      same,
    ]);
  });

  it("when a fix also changes the other part, the fix invariant fails", () => {
    expect(violationNames("a fix also changes the other part")).toContain(
      "a fix changes only the pointed part, to the look on the card",
    );
  });

  it("when a card starts the chain over, the no-restart invariant fails", () => {
    expect(violationNames("a card starts the chain over")).toContain(
      "nothing goes back to the tell step inside a chain",
    );
  });

  it("when NextLamp is ignored, the clear is unreachable from every state", () => {
    const [stuck] = brokenReport("NextLamp is ignored", cleared).violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [] });
  });

  it("when LeaveCrown is ignored, the title is unreachable from trial 6", () => {
    const [stuck] = brokenReport("LeaveCrown is ignored", onTheTitle, leanWithLeave).violations;
    expect(stuck).toMatchObject({ kind: "stuck", name: "goal", trace: [enter] });
  });

  it("when Tick runs a clock in trial 6, the run invariant fails", () => {
    const bad = model(
      undefined,
      breaks["Tick runs a clock in trial 6"],
      start,
      invariants,
      leanWithTick,
    ).violations.find((v) => v.name === "the run never moves: no clock and no score");
    expect(bad?.trace).toEqual([enter, { type: "Tick", ms: 1_000 }]);
  });
});
