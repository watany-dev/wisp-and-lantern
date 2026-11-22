import { trials, type GameState } from "../domain/state";

export type SceneKey = "title" | "lane" | "shed" | "field" | "shadows" | "over";

/** The scene of each trial but the first, which is the fallback: the lane. */
const trialScenes: Readonly<Record<number, SceneKey>> = {
  [trials.shed]: "shed",
  [trials.field]: "field",
  [trials.shadows]: "shadows",
};

/**
 * The scene that shows a state: the title, the end screen, or the trial's own scene (`trial` 1 is the
 * lane, 2 is the shed, 3 is the field, 4 is the shadows). A state with `trial` 2, 3 or 4 never shows the
 * lane (REQ-5.9.2, REQ-6.8.2, REQ-7.8.2).
 */
export function sceneFor(state: Pick<GameState, "phase" | "trial">): SceneKey {
  if (state.phase === "title") return "title";
  if (state.phase === "over") return "over";
  return trialScenes[state.trial] ?? "lane";
}
