// What the end screen of a run shows: the lines and the button. Plain data in, plain data out, so
// the scene stays thin (ADR 0003). Child-facing text comes from `src/content` only.

import { trials, type GameState } from "../domain/state";
import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";
import { leaveLabel } from "./shed-view";

const strings = { ja, en };

/**
 * What a button of the end screen does. The scene turns it into an event (the start of the shed and of the
 * field needs a new seed, which only the scene can draw): `play` begins a new run of trial 1, `playShed` a
 * new run of the shed, `playField` a new run of the field, `leaveShed` and `leaveField` go back to the title.
 */
export type OverAction = "play" | "playShed" | "playField" | "leaveShed" | "leaveField";

export type OverView = {
  title: string;
  /** Shown only when this run beat the best score. */
  record: string | null;
  score: string;
  best: string;
  /** Trial 1's end screen has one button. The shed's and the field's have a second one, back to the title (REQ-5.16, REQ-6.7). */
  buttons: { text: string; action: OverAction }[];
};

const fill = (text: string, value: number) => text.replace("{0}", String(value));

/** The shed's and the field's end screens have a play-again and a leave action each; trial 1 has no entry here. */
const actions: Readonly<Record<number, { again: OverAction; leave: OverAction }>> = {
  [trials.shed]: { again: "playShed", leave: "leaveShed" },
  [trials.field]: { again: "playField", leave: "leaveField" },
};

export function overView(state: GameState): OverView {
  const s = strings[state.lang].run;
  const { run } = state;
  const own = actions[state.trial];
  return {
    title: s.over,
    record: run.record ? s.newBest : null,
    score: fill(s.score, run.score),
    best: fill(s.best, run.best),
    buttons: own
      ? [
          { text: s.again, action: own.again },
          { text: leaveLabel(state.lang), action: own.leave },
        ]
      : [{ text: s.again, action: "play" }],
  };
}
