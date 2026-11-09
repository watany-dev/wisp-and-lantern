// Scaffold stub: replaced by .kiro/specs/01-core-loop

import type { GameEvent } from "./events";
import { initialLane, outcome, reduceLane } from "./lane";
import { finishRun, restartRun, runDown, scoreSearch } from "./run";
import { reduceShed } from "./shed";
import { trials, type GameState, type Lang } from "./state";

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
      return startShed(state);
    case "Ask":
      return inTrial(state, trials.lane) ? ask(state, event) : state;
    case "PickCard":
    case "Retry":
      return inTrial(state, trials.lane) ? withLane(state, reduceLane(state.lane, event)) : state;
    case "PickTool":
    case "GiveTool":
    case "RetryShed":
      return inTrial(state, trials.shed) ? withShed(state, reduceShed(state.shed, event)) : state;
  }
}

/** Trial 1 and trial 2 events act only inside their own trial (REQ-5.9). */
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
  };
}

/** The shed opens from the title only, with `shed` still initial. It starts no run: `run` and `lane` stay as they were. */
function startShed(state: GameState): GameState {
  return state.phase === "title" ? { ...state, phase: "trial", trial: trials.shed } : state;
}

/** Time passes only during a run of trial 1. At zero the run is over and its score is final. */
function tick(state: GameState, ms: number): GameState {
  if (!inTrial(state, trials.lane) || !(ms > 0)) return state;
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

function withLane(state: GameState, lane: GameState["lane"]): GameState {
  return lane === state.lane ? state : { ...state, lane };
}

function withShed(state: GameState, shed: GameState["shed"]): GameState {
  return shed === state.shed ? state : { ...state, shed };
}
