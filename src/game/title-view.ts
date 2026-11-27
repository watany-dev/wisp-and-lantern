// The title's words for a language. Plain data in, plain data out (ADR 0003). `intro` is trial 1's rule
// (the 60 seconds) and belongs to its card only; the shed's and the field's buttons say in their own captions
// that they are 60-second runs too (REQ-5.1.1, REQ-6.1.6, REQ-7.1.6), so every sentence on the title matches
// the trial it sits with. Trial 5's button does the same (REQ-8.1.6). Trial 6's caption says that it is three lamps,
// with no clock (REQ-9.1.6).

import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";
import type { Lang } from "../domain/state";
import { crownCaption, crownEnterLabel } from "./crown-view";
import { fieldCaption, fieldEnterLabel } from "./field-view";
import { lanternCaption, lanternEnterLabel } from "./lantern-view";
import { shadowsCaption, shadowsEnterLabel } from "./shadows-view";
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
  shadows: string;
  /** The caption under the shadows' label: the 60-second time attack. */
  shadowsCaption: string;
  lantern: string;
  /** The caption under the lantern's label: the 60-second time attack. */
  lanternCaption: string;
  crown: string;
  /** The caption under the crown's label: three lamps, no clock. */
  crownCaption: string;
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
    shadows: shadowsEnterLabel(lang),
    shadowsCaption: shadowsCaption(lang),
    lantern: lanternEnterLabel(lang),
    lanternCaption: lanternCaption(lang),
    crown: crownEnterLabel(lang),
    crownCaption: crownCaption(lang),
  };
}
