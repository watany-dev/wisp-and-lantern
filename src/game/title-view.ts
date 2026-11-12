// The title's words for a language. Plain data in, plain data out (ADR 0003). `intro` is trial 1's rule
// (the 60 seconds) and belongs to its card only; the shed's button says in its own caption that it has a
// clock too (REQ-5.1.1), and `noClock` is the caption of the field's button, whose trial has none, so every
// sentence on the title matches the trial it sits with (REQ-6.1.6).

import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";
import type { Lang } from "../domain/state";
import { fieldEnterLabel } from "./field-view";
import { shedCaption, shedEnterLabel } from "./shed-view";

const strings = { ja, en };

export type TitleView = {
  title: string;
  /** Trial 1's way in: a tap anywhere outside the buttons. */
  prompt: string;
  /** Trial 1's rule: the 60 seconds. */
  intro: string;
  /** The caption under the field's label: no timer. */
  noClock: string;
  shed: string;
  /** The caption under the shed's label: the 60-second time attack. */
  shedCaption: string;
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
    shedCaption: shedCaption(lang),
    field: fieldEnterLabel(lang),
  };
}
