// What trial 3 (The Wisp Field) shows for a game state: texts, how each star looks, the button. Plain data
// in, plain data out, so the scene stays thin (ADR 0003). Child-facing text comes from `src/content` only
// (REQ-6.11.1). Spec: .kiro/specs/06-trial-verify-stars/design.md

import type { FieldEvent } from "../domain/events";
import {
  fieldOutcome,
  isFake,
  keptStars,
  markOf,
  starCount,
  type Field,
  type StarMark,
} from "../domain/field";
import type { GameState, Lang } from "../domain/state";
import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";

const strings = { ja, en };

/** How a star looks: its word, its shape, whether it has the tick, and how faded it is. */
type StarView = {
  index: number;
  mark: StarMark;
  /** The word under the star: `real` or `fake`. Empty until the star is checked. */
  label: string;
  /** A fake star is a hollow outline; every other star, checked or not, is solid. */
  picture: "solid" | "hollow";
  /** A real star has the tick badge and the frame. */
  ticked: boolean;
  /** A fake star fades once the real ones are kept. */
  alpha: number;
};

export type FieldView = {
  guide: string;
  message: string;
  /** The keep when all five are checked, the next round after the keep; none before. */
  button: { text: string; event: FieldEvent } | null;
  stars: StarView[];
  /** The closing line, on the kept result only. It is its own text, not part of `message`. */
  lesson: string | null;
  /** The star the child checked last (for the scene's flourish); null before a check and after the keep. */
  last: number | null;
};

/** The label of the title's button into the field. */
export function fieldEnterLabel(lang: Lang): string {
  return strings[lang].field.enter;
}

/** The message follows the star checked last; after the keep it names how many real stars were kept. */
function messageFor(state: GameState): string {
  const s = strings[state.lang].field;
  const { field } = state;
  if (field.stage === "kept") return s.kept.replace("{0}", String(keptStars(field).length));
  if (field.last === null) return s.start;
  return isFake(field.round, field.last) ? s.fake : s.real;
}

function buttonFor(state: GameState): FieldView["button"] {
  const outcome = fieldOutcome(state.field);
  const s = strings[state.lang].field;
  if (outcome === "ready") return { text: s.keep, event: { type: "KeepStars" } };
  if (outcome === "kept") return { text: s.again, event: { type: "RetryField" } };
  return null;
}

function starViews(state: GameState): StarView[] {
  const { field, lang } = state;
  const marks = strings[lang].field.marks;
  return Array.from({ length: starCount }, (_, index) => {
    const mark = markOf(field, index);
    return {
      index,
      mark,
      label: mark === "unchecked" ? "" : marks[mark],
      picture: mark === "fake" ? "hollow" : "solid",
      ticked: mark === "real",
      alpha: field.stage === "kept" && mark === "fake" ? 0.3 : 1,
    };
  });
}

const lastOf = (field: Field): number | null => (field.stage === "checking" ? field.last : null);

export function fieldView(state: GameState): FieldView {
  const { field } = state;
  const s = strings[state.lang].field;
  return {
    guide: s.guide,
    message: messageFor(state),
    button: buttonFor(state),
    stars: starViews(state),
    lesson: field.stage === "kept" ? s.lesson : null,
    last: lastOf(field),
  };
}

/** The star that was checked since `before`, if any: the star checked last differs from the one before. */
export function justChecked(before: FieldView | undefined, after: FieldView): number | null {
  return after.last !== (before?.last ?? null) ? after.last : null;
}

/** The real stars have just been kept: this view has the closing line and the one before did not. */
export function justKept(before: FieldView | undefined, after: FieldView): boolean {
  return after.lesson !== null && (before?.lesson ?? null) === null;
}
