import { trials, type GameState } from "../domain/state";

export type SceneKey = "title" | "lane" | "shed" | "over";

/**
 * The scene that shows a state: the title, the end screen, or the trial's own scene (`trial` 1 is the
 * lane, 2 is the shed). A state with `trial` 2 never shows the lane (REQ-5.9.2).
 */
export function sceneFor(state: Pick<GameState, "phase" | "trial">): SceneKey {
  if (state.phase === "title") return "title";
  if (state.phase === "over") return "over";
  return state.trial === trials.shed ? "shed" : "lane";
}
