// What the end screen of a run shows: the lines and the button. Plain data in, plain data out, so
// the scene stays thin (ADR 0003). Child-facing text comes from `src/content` only.

import type { GameState } from "../domain/state";
import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";

const strings = { ja, en };

export type OverView = {
  title: string;
  /** Shown only when this run beat the best score. */
  record: string | null;
  score: string;
  best: string;
  button: { text: string; event: { type: "Start" } };
};

const fill = (text: string, value: number) => text.replace("{0}", String(value));

export function overView(state: GameState): OverView {
  const s = strings[state.lang].run;
  const { run } = state;
  return {
    title: s.over,
    record: run.record ? s.newBest : null,
    score: fill(s.score, run.score),
    best: fill(s.best, run.best),
    button: { text: s.again, event: { type: "Start" } },
  };
}
