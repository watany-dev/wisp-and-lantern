// What trial 4 (The Listening Shadows) shows for a game state: texts, each thing and its marks, the rule card or
// the closing line, the "Next" button. The clock, the bar and the score are the run's (`hudView` in
// `lane-view.ts`) and the way back to the title is the shed's button, so they are not here. Plain data in, plain
// data out, so the scene stays thin (ADR 0003). Child-facing text comes from `src/content` only (REQ-7.11.1).
// Spec: .kiro/specs/07-trial-keep-secrets/design.md

import {
  givenItems,
  isSecretAt,
  itemAt,
  itemCount,
  secretItems,
  type Bag,
  type ItemId,
  type SecretItem,
} from "../domain/bag";
import type { GameState, Lang } from "../domain/state";
import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";
import type { FieldView } from "./field-view";
import { leaveLabel } from "./shed-view";

const strings = { ja, en };

/** How a thing looks: its picture, its name, the tick once handed over, the padlock once a round is done. */
type ItemView = {
  index: number;
  item: ItemId;
  label: string;
  /** Handed to the wisp: the frame and the tick. Only a safe thing can be. */
  given: boolean;
  /** A secret of a done round: it stayed with the child, and has the padlock badge. */
  kept: boolean;
};

/** The field's wide button: the same widget, place and lock (`ui/field-buttons.ts`). */
type ButtonView = FieldView["buttons"][number];

export type BagView = {
  guide: string;
  message: string;
  items: ItemView[];
  /** The rule card's secrets, while a round is played; `null` once it is done (the closing line takes its place). */
  rules: readonly SecretItem[] | null;
  /** The closing line, once a round is done. It is its own text, not part of `message`. */
  lesson: string | null;
  buttons: ButtonView[];
  /** The label of the button back to the title, always shown (the shed's word). */
  leave: string;
  /** The last tap on a thing that was still with the child, for the flourish: which, and whether it was a secret. */
  last: { index: number; secret: boolean } | null;
  /** The round is done (for the flourish). */
  finished: boolean;
};

/** The label of the title's button into the bag. */
export function bagEnterLabel(lang: Lang): string {
  return strings[lang].bag.enter;
}

/** The caption under it: the bag is a 60-second time attack. */
export function bagCaption(lang: Lang): string {
  return strings[lang].bag.timeAttack;
}

const nameOf = (lang: Lang, item: ItemId): string => strings[lang].bag.items[item];
const fill = (text: string, value: string) => text.replace("{0}", value);

/** One message place, one message per situation: the start, the last tap (safe or secret), or the done round. */
function messageFor(state: GameState): string {
  const s = strings[state.lang].bag;
  const { bag } = state;
  if (bag.stage === "done") return fill(s.done, String(givenItems(bag).length));
  if (bag.last === null) return s.start;
  const name = nameOf(state.lang, itemAt(bag, bag.last));
  return fill(isSecretAt(bag, bag.last) ? s.secret : s.given, name);
}

function itemViews(state: GameState): ItemView[] {
  const { bag, lang } = state;
  const given = givenItems(bag);
  return Array.from({ length: itemCount }, (_, index) => {
    const item = itemAt(bag, index);
    return {
      index,
      item,
      label: nameOf(lang, item),
      given: given.includes(index),
      kept: bag.stage === "done" && isSecretAt(bag, index),
    };
  });
}

const lastOf = (bag: Bag): BagView["last"] =>
  bag.stage === "giving" && bag.last !== null
    ? { index: bag.last, secret: isSecretAt(bag, bag.last) }
    : null;

export function bagView(state: GameState): BagView {
  const { bag } = state;
  const s = strings[state.lang].bag;
  const done = bag.stage === "done";
  return {
    guide: s.guide,
    message: messageFor(state),
    items: itemViews(state),
    rules: done ? null : secretItems,
    lesson: done ? s.lesson : null,
    buttons: done
      ? [{ id: "next", text: s.next, event: { type: "RetryBag" }, slot: "single", icon: "none" }]
      : [],
    leave: leaveLabel(state.lang),
    last: lastOf(bag),
    finished: done,
  };
}

/** The thing handed over since `before`, if any: a tick now that was not there. A done round counts its last one. */
export function justGiven(before: BagView | undefined, after: BagView): number | null {
  if (!before) return null;
  const now = after.items.find((item) => item.given && !before.items[item.index]!.given);
  return now?.index ?? null;
}

/** The secret tapped since `before`, if any: a secret is now the last tap, and it was not the last tap before. */
export function justHeld(before: BagView | undefined, after: BagView): number | null {
  const now = after.last;
  if (now === null || !now.secret) return null;
  const old = before?.last ?? null;
  return old !== null && old.index === now.index ? null : now.index;
}

/** A round has just been done: this view is finished and the one before was not. */
export function justFinished(before: BagView | undefined, after: BagView): boolean {
  return after.finished && !(before?.finished ?? false);
}
