// What trial 3 (The Wisp Field) shows for a game state: texts, how each star looks, the lens, the buttons.
// The clock, the bar and the score are the run's (`hudView` in `lane-view.ts`) and the way back to the
// title is the shed's button, so they are not here. Plain data in, plain data out, so the scene stays thin
// (ADR 0003). Child-facing text comes from `src/content` only (REQ-6.11.1).
// Spec: .kiro/specs/06-trial-verify-stars/design.md

import type { GameEvent } from "../domain/events";
import {
  isReady,
  keptStars,
  markOf,
  noteWasRight,
  shineOf,
  starCount,
  type Field,
  type Shine,
  type StarMark,
} from "../domain/field";
import type { GameState, Lang } from "../domain/state";
import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";
import type { ButtonSlot } from "./field-layout";
import { leaveLabel } from "./shed-view";

const strings = { ja, en };

/** How a star looks: how it shines (the clue), its word, the tick, the frame of the lens, how faded it is. */
type StarView = {
  index: number;
  shine: Shine;
  mark: StarMark;
  /** The word under the star: `real` or `fake`. Empty until the star is sorted. */
  label: string;
  /** A sorted real star has the tick badge and the frame. */
  ticked: boolean;
  /** The star in the lens has a white frame. */
  looking: boolean;
  /** A fake star fades once it is sorted. */
  alpha: number;
};

type ButtonId = "real" | "fake" | "keep" | "next";

type ButtonView = {
  id: ButtonId;
  text: string;
  event: GameEvent;
  slot: ButtonSlot;
  /** The picture on the button, so it is told apart without reading or color: a tick or a ring of dots. */
  icon: "tick" | "dots" | "none";
};

export type FieldView = {
  guide: string;
  message: string;
  stars: StarView[];
  /** The star in the lens, shown larger. The same clue as in its slot. */
  lens: { shine: Shine } | null;
  /** The closing line, once a round is kept. It is its own text, not part of `message`. */
  lesson: string | null;
  buttons: ButtonView[];
  /** The label of the button back to the title, always shown (the shed's word). */
  leave: string;
  /** The last verdict, for the scene's flourish: which star, and whether the verdict was right. */
  verdict: { star: number; right: boolean } | null;
  /** A round has just been kept (for the flourish). */
  finished: boolean;
};

/** The label of the title's button into the field. */
export function fieldEnterLabel(lang: Lang): string {
  return strings[lang].field.enter;
}

/** The caption under it: the field is a 60-second time attack. */
export function fieldCaption(lang: Lang): string {
  return strings[lang].field.timeAttack;
}

/**
 * One message place, one message per situation; nothing is stacked. When the last star is sorted the message is
 * still about that star (a fake one keeps the wisp's "mixed it up"); the keep button says what to do next.
 */
function messageFor(state: GameState): string {
  const s = strings[state.lang].field;
  const { field } = state;
  if (field.stage !== "sorting") return s.kept.replace("{0}", String(keptStars(field).length));
  if (field.looking !== null) return s.look;
  if (field.note === null) return s.start;
  if (noteWasRight(field, field.note))
    return field.note.said === "fake" ? s.sortedFake : s.sortedReal;
  return field.note.said === "real" ? s.missFake : s.missReal;
}

type Strings = (typeof strings)["en"]["field"];

/** While sorting: the two verdicts for the star in the lens, or the keep once all five are sorted. */
function sortingButtons(field: Extract<Field, { stage: "sorting" }>, s: Strings): ButtonView[] {
  if (isReady(field)) {
    return [
      { id: "keep", text: s.keep, event: { type: "KeepStars" }, slot: "single", icon: "none" },
    ];
  }
  if (field.looking === null) return [];
  return [
    {
      id: "real",
      text: s.marks.real,
      event: { type: "SortStar", verdict: "real" },
      slot: "left",
      icon: "tick",
    },
    {
      id: "fake",
      text: s.marks.fake,
      event: { type: "SortStar", verdict: "fake" },
      slot: "right",
      icon: "dots",
    },
  ];
}

function buttonsFor(state: GameState): ButtonView[] {
  const { field } = state;
  const s = strings[state.lang].field;
  if (field.stage === "kept") {
    return [
      { id: "next", text: s.next, event: { type: "RetryField" }, slot: "single", icon: "none" },
    ];
  }
  return sortingButtons(field, s);
}

function starViews(state: GameState): StarView[] {
  const { field, lang } = state;
  const marks = strings[lang].field.marks;
  return Array.from({ length: starCount }, (_, index) => {
    const mark = markOf(field, index);
    return {
      index,
      shine: shineOf(field, index),
      mark,
      label: mark === "unsorted" ? "" : marks[mark],
      ticked: mark === "real",
      // Stryker disable next-line ConditionalExpression: a finished round has no `looking` (undefined), which never equals a star number, so dropping the stage test changes nothing a test can see.
      looking: field.stage === "sorting" && field.looking === index,
      alpha: mark === "fake" ? 0.5 : 1,
    };
  });
}

const lensOf = (field: Field): FieldView["lens"] =>
  field.stage === "sorting" && field.looking !== null
    ? { shine: shineOf(field, field.looking) }
    : null;

const verdictOf = (field: Field): FieldView["verdict"] =>
  field.stage === "sorting" && field.note !== null
    ? { star: field.note.star, right: noteWasRight(field, field.note) }
    : null;

export function fieldView(state: GameState): FieldView {
  const { field } = state;
  const s = strings[state.lang].field;
  return {
    guide: s.guide,
    message: messageFor(state),
    stars: starViews(state),
    lens: lensOf(field),
    lesson: field.stage === "kept" ? s.lesson : null,
    buttons: buttonsFor(state),
    leave: leaveLabel(state.lang),
    verdict: verdictOf(field),
    finished: field.stage !== "sorting",
  };
}

/** The verdict that was given since `before`, if any: a verdict now that was not there, or a different one. */
export function justSorted(before: FieldView | undefined, after: FieldView): FieldView["verdict"] {
  const old = before?.verdict ?? null;
  const now = after.verdict;
  if (now === null) return null;
  return old !== null && old.star === now.star && old.right === now.right ? null : now;
}

/** A round has just been kept: this view is finished and the one before was not. */
export function justFinished(before: FieldView | undefined, after: FieldView): boolean {
  return after.finished && !(before?.finished ?? false);
}
