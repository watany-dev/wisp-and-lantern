// Scaffold stub: replaced by .kiro/specs/01-core-loop

import type { GameEvent } from "./events";
import type { GameState } from "./state";

export function reduce(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case "Start":
      return { ...state, phase: "trial", lang: event.lang ?? state.lang };
    case "SetLang":
      return { ...state, lang: event.lang };
    case "MoveHeroTo":
      return { ...state, hero: { x: event.x, y: event.y } };
  }
}
