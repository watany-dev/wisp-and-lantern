// Scaffold stub: replaced by .kiro/specs/01-core-loop

import type { GameEvent } from "./events";
import { initialLane, outcome, reduceLane } from "./lane";
import { finishRun, restartRun, runDown, scoreSearch } from "./run";
import type { GameState, Lang } from "./state";

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
    case "Ask":
      return state.phase === "trial" ? ask(state, event) : state;
    case "PickCard":
    case "Retry":
      return state.phase === "trial" ? withLane(state, reduceLane(state.lane, event)) : state;
  }
}

/** A run starts from the title or the end screen. During a run `Start` only sets the language. */
function start(state: GameState, lang: Lang | undefined): GameState {
  const next = lang ?? state.lang;
  if (state.phase === "trial") return { ...state, lang: next };
  return {
    ...state,
    phase: "trial",
    trial: 1,
    lang: next,
    lane: initialLane,
    run: restartRun(state.run),
  };
}

/** Time passes only during a run. At zero the run is over and its score is final. */
function tick(state: GameState, ms: number): GameState {
  if (state.phase !== "trial" || !(ms > 0)) return state;
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
