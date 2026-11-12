// What the end screen of a run shows: the lines and the button. Plain data in, plain data out, so
// the scene stays thin (ADR 0003). Child-facing text comes from `src/content` only.

import { trials, type GameState } from "../domain/state";
import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";
import { leaveLabel } from "./shed-view";

const strings = { ja, en };

/**
 * What a button of the end screen does. The scene turns it into an event (the shed's start needs a new
 * seed, which only the scene can draw): `play` begins a new run of trial 1, `playShed` a new run of the
 * shed, `leave` goes back to the title.
 */
export type OverAction = "play" | "playShed" | "leave";

export type OverView = {
  title: string;
  /** Shown only when this run beat the best score. */
  record: string | null;
  score: string;
  best: string;
  /** Trial 1's end screen has one button. The shed's has a second one, back to the title (REQ-5.16). */
  buttons: { text: string; action: OverAction }[];
};

const fill = (text: string, value: number) => text.replace("{0}", String(value));

export function overView(state: GameState): OverView {
  const s = strings[state.lang].run;
  const { run } = state;
  const shed = state.trial === trials.shed;
  return {
    title: s.over,
    record: run.record ? s.newBest : null,
    score: fill(s.score, run.score),
    best: fill(s.best, run.best),
    buttons: shed
      ? [
          { text: s.again, action: "playShed" },
          { text: leaveLabel(state.lang), action: "leave" },
        ]
      : [{ text: s.again, action: "play" }],
  };
}
