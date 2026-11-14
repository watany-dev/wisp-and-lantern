// The title's words for a language. Plain data in, plain data out (ADR 0003). `intro` is trial 1's rule
// (the 60 seconds) and belongs to its card only; the shed's and the field's buttons say in their own captions
// that they are 60-second runs too (REQ-5.1.1, REQ-6.1.6), so every sentence on the title matches the trial
// it sits with.

import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";
import type { Lang } from "../domain/state";
import { fieldCaption, fieldEnterLabel } from "./field-view";
import { shedCaption, shedEnterLabel } from "./shed-view";

const strings = { ja, en };

export type TitleView = {
  title: string;
  /** Trial 1's way in: a tap anywhere outside the buttons. */
  prompt: string;
  /** Trial 1's rule: the 60 seconds. */
  intro: string;
  shed: string;
  /** The caption under the shed's label: the 60-second time attack. */
  shedCaption: string;
  field: string;
  /** The caption under the field's label: the 60-second time attack. */
  fieldCaption: string;
};

export function titleView(lang: Lang): TitleView {
  const s = strings[lang];
  return {
    title: s.title,
    prompt: s.start,
    intro: s.run.intro,
    shed: shedEnterLabel(lang),
    shedCaption: shedCaption(lang),
    field: fieldEnterLabel(lang),
    fieldCaption: fieldCaption(lang),
  };
}
