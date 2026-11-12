import { trials, type GameState } from "../domain/state";

export type SceneKey = "title" | "lane" | "shed" | "field" | "over";

/**
 * The scene that shows a state: the title, the end screen, or the trial's own scene (`trial` 1 is the
 * lane, 2 is the shed, 3 is the field). A state with `trial` 2 or 3 never shows the lane (REQ-5.9.2,
 * REQ-6.8.2).
 */
export function sceneFor(state: Pick<GameState, "phase" | "trial">): SceneKey {
  if (state.phase === "title") return "title";
  if (state.phase === "over") return "over";
  if (state.trial === trials.shed) return "shed";
  return state.trial === trials.field ? "field" : "lane";
}
