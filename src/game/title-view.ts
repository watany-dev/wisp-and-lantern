// The title's words for a language. Plain data in, plain data out (ADR 0003). `intro` is trial 1's rule
// (the 60 seconds) and belongs to its card only; `noClock` is the caption on the two buttons whose trials have
// no timer, so every sentence on the title matches the trial it sits with (REQ-6.1.6).

import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";
import type { Lang } from "../domain/state";
import { fieldEnterLabel } from "./field-view";
import { shedEnterLabel } from "./shed-view";

const strings = { ja, en };

export type TitleView = {
  title: string;
  /** Trial 1's way in: a tap anywhere outside the buttons. */
  prompt: string;
  /** Trial 1's rule: the 60 seconds. */
  intro: string;
  /** The caption under the label of each of the other two buttons: no timer. */
  noClock: string;
  shed: string;
  field: string;
};

export function titleView(lang: Lang): TitleView {
  const s = strings[lang];
  return {
    title: s.title,
    prompt: s.start,
    intro: s.run.intro,
    noClock: s.noClock,
    shed: shedEnterLabel(lang),
    field: fieldEnterLabel(lang),
  };
}
