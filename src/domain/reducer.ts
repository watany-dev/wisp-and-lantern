// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { initialCrown, newCrown, reduceCrown } from "./crown";
import type {
  CrownEvent,
  FieldEvent,
  GameEvent,
  LaneEvent,
  LanternEvent,
  ShadowsEvent,
  ShedEvent,
} from "./events";
import { initialField, reduceField, verdictRight } from "./field";
import { initialLane, outcome, reduceLane } from "./lane";
import { fixRight, initialLantern, newLantern, reduceLantern } from "./lantern";
import { finishRun, restartRun, runDown, scoreSearch } from "./run";
import { decisionRight, initialShadows, newShadows, reduceShadows } from "./shadows";
import { initialShed, newShed, reduceShed, shedOutcome } from "./shed";
import { trials, type GameState, type Lang } from "./state";

/** The way into and out of trial 6. */
type CrownEntrance = Extract<GameEvent, { type: "StartCrown" | "LeaveCrown" }>;

export function reduce(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case "Start":
      return start(state, event.lang);
    case "SetLang":
      return { ...state, lang: event.lang };
    case "MoveHeroTo":
      return { ...state, hero: { x: event.x, y: event.y } };
    case "Tick":
      return tick(state, event.ms);
    case "StartShed":
      return startShed(state, event.seed ?? 0);
    case "LeaveShed":
      return leaveShed(state);
    case "StartField":
      return startField(state, event.seed);
    case "LeaveField":
      return leaveField(state);
    case "StartShadows":
      return startShadows(state, event.seed);
    case "LeaveShadows":
      return leaveShadows(state);
    case "StartLantern":
      return startLantern(state, event.seed);
    case "LeaveLantern":
      return leaveLantern(state);
    default:
      return reduceTrial(state, event);
  }
}

/** The events of one trial each: they act only in their own trial and return the state otherwise. */
function reduceTrial(
  state: GameState,
  event:
    | LaneEvent
    | ShedEvent
    | FieldEvent
    | ShadowsEvent
    | LanternEvent
    | CrownEvent
    | CrownEntrance,
): GameState {
  switch (event.type) {
    case "Ask":
      return inTrial(state, trials.lane) ? ask(state, event) : state;
    case "PickCard":
    case "Retry":
      return inTrial(state, trials.lane) ? withLane(state, reduceLane(state.lane, event)) : state;
    case "PickTool":
    case "RetryShed":
      return inTrial(state, trials.shed) ? withShed(state, reduceShed(state.shed, event)) : state;
    case "GiveTool":
      return inTrial(state, trials.shed) ? give(state) : state;
    default:
      return reduceLaterTrial(state, event);
  }
}

/** Trial 3's to trial 6's events, each acting only in its own trial. */
function reduceLaterTrial(
  state: GameState,
  event: FieldEvent | ShadowsEvent | LanternEvent | CrownEvent | CrownEntrance,
): GameState {
  switch (event.type) {
    case "FixPart":
      return fix(state, event);
    case "TapPart":
    case "NextLantern":
      return inTrial(state, trials.lantern)
        ? withLantern(state, reduceLantern(state.lantern, event))
        : state;
    case "DecideItem":
      return decide(state, event);
    case "NextItem":
      return inTrial(state, trials.shadows)
        ? withShadows(state, reduceShadows(state.shadows, event))
        : state;
    default:
      return reduceLastTrial(state, event);
  }
}

/** Trial 3's and trial 6's events, each acting only in its own trial, and the way into and out of trial 6. */
function reduceLastTrial(
  state: GameState,
  event: FieldEvent | CrownEvent | CrownEntrance,
): GameState {
  switch (event.type) {
    case "StartCrown":
      return startCrown(state, event.seed);
    case "LeaveCrown":
      return leaveCrown(state);
    case "SayLook":
    case "Tell":
    case "GiveItem":
    case "Go":
    case "CheckLamp":
    case "PointLamp":
    case "FixLamp":
    case "NextLamp":
      return inTrial(state, trials.crown)
        ? withCrown(state, reduceCrown(state.crown, event))
        : state;
    default:
      return reduceFieldTrial(state, event);
  }
}

/** The field's events act only in a run of trial 3. A verdict also scores. */
function reduceFieldTrial(state: GameState, event: FieldEvent): GameState {
  if (!inTrial(state, trials.field)) return state;
  if (event.type === "SortStar") return sortStar(state, event);
  return withField(state, reduceField(state.field, event));
}

/** Each trial's events act only inside their own trial (REQ-5.9, REQ-6.8). */
function inTrial(state: GameState, trial: number): boolean {
  return state.phase === "trial" && state.trial === trial;
}

/** A run starts from the title or the end screen. During a run `Start` only sets the language. */
function start(state: GameState, lang: Lang | undefined): GameState {
  const next = lang ?? state.lang;
  if (state.phase === "trial") return { ...state, lang: next };
  return {
    ...state,
    phase: "trial",
    trial: trials.lane,
    lang: next,
    lane: initialLane,
    run: restartRun(state.run),
    shed: initialShed,
    field: initialField,
    shadows: initialShadows,
    lantern: initialLantern,
    crown: initialCrown,
  };
}

/**
 * The shed's 60-second run starts from the title, or from the shed's own end screen to play again. Like
 * trial 1's `Start`, it gives a full clock and a score of 0 and keeps only the best; the lane is untouched.
 */
function startShed(state: GameState, seed: number): GameState {
  const again = state.phase === "over" && state.trial === trials.shed;
  if (state.phase !== "title" && !again) return state;
  return {
    ...state,
    phase: "trial",
    trial: trials.shed,
    shed: newShed(seed),
    run: restartRun(state.run),
  };
}

/**
 * The way back to the title, from a run of the shed or from its end screen (`trial` is 2 in both, and 0 on
 * the title). It keeps the language, the hero and the best score of the session, and drops the shed and the
 * run in progress.
 */
function leaveShed(state: GameState): GameState {
  if (state.trial !== trials.shed) return state;
  return { ...state, phase: "title", trial: 0, shed: initialShed, run: restartRun(state.run) };
}

/**
 * The field's 60-second run starts from the title, or from the field's own end screen to play again. Like
 * `startShed`, it gives a full clock and a score of 0 and keeps only the best; the lane and the shed are
 * untouched. The seed is a whole number, so a stray value still gives the same rounds every time.
 */
function startField(state: GameState, seed: number): GameState {
  const again = state.phase === "over" && state.trial === trials.field;
  if (state.phase !== "title" && !again) return state;
  return {
    ...state,
    phase: "trial",
    trial: trials.field,
    field: { ...initialField, seed: seed >>> 0 },
    run: restartRun(state.run),
  };
}

/**
 * The way back to the title, from a run of the field or from its end screen (`trial` is 3 in both, and 0
 * on the title). It keeps the language, the hero and the best score of the session, and drops the field
 * and the run in progress.
 */
function leaveField(state: GameState): GameState {
  if (state.trial !== trials.field) return state;
  return { ...state, phase: "title", trial: 0, field: initialField, run: restartRun(state.run) };
}

/**
 * Trial 4's 60-second run starts from the title, or from its own end screen to play again. Like `startField`, it
 * gives a full clock and a score of 0 and keeps only the best; the other trials are untouched.
 */
function startShadows(state: GameState, seed: number): GameState {
  const again = state.phase === "over" && state.trial === trials.shadows;
  if (state.phase !== "title" && !again) return state;
  return {
    ...state,
    phase: "trial",
    trial: trials.shadows,
    shadows: newShadows(seed),
    run: restartRun(state.run),
  };
}

/**
 * The way back to the title, from a run of trial 4 or from its end screen (`trial` is 4 in both, and 0 on the
 * title). It keeps the language, the hero and the best score of the session, and drops trial 4 and the run in
 * progress.
 */
function leaveShadows(state: GameState): GameState {
  if (state.trial !== trials.shadows) return state;
  return {
    ...state,
    phase: "title",
    trial: 0,
    shadows: initialShadows,
    run: restartRun(state.run),
  };
}

/**
 * Trial 5's 60-second run starts from the title, or from its own end screen to play again. Like `startShadows`, it
 * gives a full clock and a score of 0 and keeps only the best; the other trials are untouched.
 */
function startLantern(state: GameState, seed: number): GameState {
  const again = state.phase === "over" && state.trial === trials.lantern;
  if (state.phase !== "title" && !again) return state;
  return {
    ...state,
    phase: "trial",
    trial: trials.lantern,
    lantern: newLantern(seed),
    run: restartRun(state.run),
  };
}

/**
 * The way back to the title, from a run of trial 5 or from its end screen (`trial` is 5 in both, and 0 on the
 * title). It keeps the language, the hero and the best score of the session, and drops trial 5 and the run in
 * progress.
 */
function leaveLantern(state: GameState): GameState {
  if (state.trial !== trials.lantern) return state;
  return {
    ...state,
    phase: "title",
    trial: 0,
    lantern: initialLantern,
    run: restartRun(state.run),
  };
}

/**
 * Trial 6 starts from the title, or from its own clear to play again. It has no clock and no score, so the run is
 * not touched: on the title it is already a fresh one. The other trials are untouched.
 */
function startCrown(state: GameState, seed: number): GameState {
  const again = inTrial(state, trials.crown) && state.crown.stage === "clear";
  if (state.phase !== "title" && !again) return state;
  return { ...state, phase: "trial", trial: trials.crown, crown: newCrown(seed) };
}

/** The way back to the title from trial 6, in any stage. It keeps the language, the hero and the run. */
function leaveCrown(state: GameState): GameState {
  if (state.trial !== trials.crown) return state;
  return { ...state, phase: "title", trial: 0, crown: initialCrown };
}

/** The trials that are 60-second runs. Trial 6 has no clock (REQ-9.9.1). */
const timed: readonly number[] = [
  trials.lane,
  trials.shed,
  trials.field,
  trials.shadows,
  trials.lantern,
];

/** Time passes only during a run of trial 1, 2, 3, 4 or 5. At zero the run is over and its score is final. */
function tick(state: GameState, ms: number): GameState {
  const running = timed.some((trial) => inTrial(state, trial));
  if (!running || !(ms > 0)) return state;
  const run = runDown(state.run, ms);
  if (run.remainingMs > 0) return { ...state, run };
  return { ...state, phase: "over", run: finishRun(run) };
}

/** The search scores once, when it starts: a find adds points, any other result ends the streak. */
function ask(state: GameState, event: GameEvent & { type: "Ask" }): GameState {
  const lane = reduceLane(state.lane, event);
  if (lane === state.lane) return state;
  return { ...state, lane, run: scoreSearch(state.run, outcome(lane) === "right") };
}

/** The hand-over scores once, like the search of trial 1: a tool that frees the cat adds points, any other ends the streak. */
function give(state: GameState): GameState {
  const shed = reduceShed(state.shed, { type: "GiveTool" });
  if (shed === state.shed) return state;
  return { ...state, shed, run: scoreSearch(state.run, shedOutcome(shed) === "freed") };
}

/** A verdict scores once, like the search of trial 1: a right one adds points, a wrong one ends the streak. */
function sortStar(state: GameState, event: FieldEvent & { type: "SortStar" }): GameState {
  const right = verdictRight(state.field, event.verdict);
  if (right === null) return state;
  const field = reduceField(state.field, event);
  return { ...state, field, run: scoreSearch(state.run, right) };
}

/** A decision scores once, like the search of trial 1: a right one adds points, a wrong one ends the streak. */
function decide(state: GameState, event: ShadowsEvent & { type: "DecideItem" }): GameState {
  if (!inTrial(state, trials.shadows)) return state;
  const right = decisionRight(state.shadows, event.choice);
  if (right === null) return state;
  const shadows = reduceShadows(state.shadows, event);
  return { ...state, shadows, run: scoreSearch(state.run, right) };
}

/** A card scores once, like the search of trial 1: a right one adds points, a wrong one ends the streak. */
function fix(state: GameState, event: LanternEvent & { type: "FixPart" }): GameState {
  if (!inTrial(state, trials.lantern)) return state;
  const right = fixRight(state.lantern, event.look);
  if (right === null) return state;
  const lantern = reduceLantern(state.lantern, event);
  return { ...state, lantern, run: scoreSearch(state.run, right) };
}

function withLane(state: GameState, lane: GameState["lane"]): GameState {
  return lane === state.lane ? state : { ...state, lane };
}

function withShed(state: GameState, shed: GameState["shed"]): GameState {
  return shed === state.shed ? state : { ...state, shed };
}

function withField(state: GameState, field: GameState["field"]): GameState {
  return field === state.field ? state : { ...state, field };
}

function withShadows(state: GameState, shadows: GameState["shadows"]): GameState {
  return shadows === state.shadows ? state : { ...state, shadows };
}

function withLantern(state: GameState, lantern: GameState["lantern"]): GameState {
  return lantern === state.lantern ? state : { ...state, lantern };
}

function withCrown(state: GameState, crown: GameState["crown"]): GameState {
  return crown === state.crown ? state : { ...state, crown };
}
