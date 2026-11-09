// Scaffold stub: replaced by .kiro/specs/01-core-loop

import type { GameEvent } from "./events";
import { reduceLane } from "./lane";
import type { GameState } from "./state";

export function reduce(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case "Start":
      return { ...state, phase: "trial", trial: 1, lang: event.lang ?? state.lang };
    case "SetLang":
      return { ...state, lang: event.lang };
    case "MoveHeroTo":
      return { ...state, hero: { x: event.x, y: event.y } };
    case "PickCard":
    case "Ask":
    case "Retry":
      return state.phase === "trial" ? withLane(state, reduceLane(state.lane, event)) : state;
  }
}

function withLane(state: GameState, lane: GameState["lane"]): GameState {
  return lane === state.lane ? state : { ...state, lane };
}
