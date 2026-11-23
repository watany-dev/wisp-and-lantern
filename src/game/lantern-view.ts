// What trial 5 (The Flickering Lantern) shows for a game state: texts, the wish, the wisp's lantern with a mark on
// each part, whether it is lit, and the buttons. The clock, the bar and the score are the run's (`hudView` in
// `lane-view.ts`) and the way back to the title is the shed's button, so they are not here. Plain data in, plain
// data out, so the scene stays thin (ADR 0003). Child-facing text comes from `src/content` only (REQ-8.13.1).
// Spec: .kiro/specs/08-trial-tell-whats-wrong/design.md

import {
  cardsOf,
  faultAt,
  flickerOf,
  parts,
  shapeOf,
  wishOf,
  type Lantern,
  type LookId,
  type PartId,
  type Shape,
} from "../domain/lantern";
import type { GameState, Lang } from "../domain/state";
import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";
import type { ButtonView } from "./button-view";
import type { ButtonSlot } from "./field-layout";
import { leaveLabel } from "./shed-view";

const strings = { ja, en };

/**
 * The mark on a part of the wisp's lantern: none (a steady part, or a lit lantern), a frame of dots (the part that
 * flickers) or a solid frame (the part pointed at, which holds still while its cards are open).
 */
export type PartMark = "none" | "dots" | "solid";

type PartView = { part: PartId; look: LookId; mark: PartMark };

export type LanternView = {
  guide: string;
  wishLabel: string;
  lanternLabel: string;
  message: string;
  /** The wish: a look for each part, always drawn lit. */
  wish: Shape;
  /** The wisp's lantern, part by part from the top. */
  parts: PartView[];
  /** All three parts are the wish's: the light is bright, the badge is on, nothing flickers. */
  lit: boolean;
  buttons: ButtonView[];
  /** The label of the button back to the title, always shown (the shed's word). */
  leave: string;
  /** What a card just did, for the scene's flourish: `lit`, `said` (a wrong card), or `null`. */
  result: "lit" | "said" | null;
};

/** The label of the title's button into trial 5. */
export function lanternEnterLabel(lang: Lang): string {
  return strings[lang].lantern.enter;
}

/** The caption under it: trial 5 is a 60-second time attack. */
export function lanternCaption(lang: Lang): string {
  return strings[lang].lantern.timeAttack;
}

export function partWord(part: PartId, lang: Lang): string {
  return strings[lang].lantern.parts[part];
}

export function lookWord(look: LookId, lang: Lang): string {
  return strings[lang].lantern.looks[look];
}

/** One message place, one message per stage; the note says which. */
function messageFor(lantern: Lantern, lang: Lang): string {
  const s = strings[lang].lantern;
  if (lantern.stage === "lit") {
    const fixed = wishOf(lantern)[faultAt(lantern.seed, lantern.round)];
    return s.lit.replace("{0}", lookWord(fixed, lang));
  }
  if (lantern.stage === "pointing") return s.point.replace("{0}", partWord(lantern.part, lang));
  const { note } = lantern;
  if (note === null) return s.look;
  if (note.kind === "fine") return s.fine.replace("{0}", partWord(note.part, lang));
  return s.said.replace("{0}", lookWord(note.look, lang));
}

const cardSlots: readonly ButtonSlot[] = ["left", "right"];

/** Two cards while a part is pointed at, "Next" once the lantern is lit, and none while the child looks. */
function buttonsFor(lantern: Lantern, lang: Lang): ButtonView[] {
  if (lantern.stage === "lit") {
    const text = strings[lang].lantern.next;
    return [{ id: "next", text, event: { type: "NextLantern" }, slot: "single", icon: "none" }];
  }
  return cardsOf(lantern).map((look, i) => ({
    id: look,
    text: lookWord(look, lang),
    event: { type: "FixPart", look },
    slot: cardSlots[i]!,
    icon: look,
  }));
}

/** The pointed part holds still with a solid frame; while looking, the part that flickers has its dots. */
function markOf(lantern: Lantern, part: PartId): PartMark {
  switch (lantern.stage) {
    case "pointing":
      return lantern.part === part ? "solid" : "none";
    case "looking":
      return flickerOf(lantern) === part ? "dots" : "none";
    case "lit":
      return "none";
  }
}

function resultOf(lantern: Lantern): LanternView["result"] {
  switch (lantern.stage) {
    case "looking":
      return lantern.note?.kind === "said" ? "said" : null;
    case "pointing":
      return null;
    case "lit":
      return "lit";
  }
}

export function lanternView(state: GameState): LanternView {
  const { lantern, lang } = state;
  const s = strings[lang].lantern;
  const shape = shapeOf(lantern);
  return {
    guide: s.guide,
    wishLabel: s.wish,
    lanternLabel: s.brought,
    message: messageFor(lantern, lang),
    wish: wishOf(lantern),
    parts: parts.map((part) => ({ part, look: shape[part], mark: markOf(lantern, part) })),
    lit: lantern.stage === "lit",
    buttons: buttonsFor(lantern, lang),
    leave: leaveLabel(lang),
    result: resultOf(lantern),
  };
}

/**
 * A card has just been picked: this view has a result and the one before did not. Every card comes after a point,
 * which has no result, so two wrong cards in a row each play their flourish, and a language change plays none.
 */
export function justFixed(before: LanternView | undefined, after: LanternView): boolean {
  return after.result !== null && (before?.result ?? null) === null;
}
