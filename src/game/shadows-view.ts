// What trial 4 (The Listening Shadows) shows for a game state: texts, the item on its tile, what the shadow
// heard, the closing line and the buttons. The clock, the bar and the score are the run's (`hudView` in
// `lane-view.ts`) and the way back to the title is the shed's button, so they are not here. Plain data in,
// plain data out, so the scene stays thin (ADR 0003). Child-facing text comes from `src/content` only
// (REQ-7.11.1). Spec: .kiro/specs/07-trial-keep-secrets/design.md

import { heardItem, itemOf, shadowsOutcome, type ItemId, type Shadows } from "../domain/shadows";
import type { GameState, Lang } from "../domain/state";
import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";
import type { ButtonView } from "./button-view";
import { leaveLabel } from "./shed-view";

const strings = { ja, en };

/** How the item on the tile looks: which item, how faded it is, and its two badges. */
type TileView = {
  id: ItemId;
  label: string;
  /** The item was given away: it is faded on the tile, and the shadow's bubble holds it. */
  alpha: number;
  /** A right decision has the tick badge (and the frame). */
  ticked: boolean;
  /** A kept item has the padlock badge. */
  locked: boolean;
};

/** What is in the speech bubble: nothing yet, the item the shadow heard, or three quiet dots. */
type Bubble = "none" | "item" | "quiet";

export type ShadowsView = {
  guide: string;
  message: string;
  item: TileView;
  bubble: Bubble;
  /** The closing line, after a decision. It is its own text, not part of `message`. */
  why: string | null;
  buttons: ButtonView[];
  /** The label of the button back to the title, always shown (the shed's word). */
  leave: string;
  /** The result of the decision, for the scene's flourish; `null` while deciding. */
  result: "right" | "wrong" | null;
};

/** The label of the title's button into trial 4. */
export function shadowsEnterLabel(lang: Lang): string {
  return strings[lang].shadows.enter;
}

/** The caption under it: trial 4 is a 60-second time attack. */
export function shadowsCaption(lang: Lang): string {
  return strings[lang].shadows.timeAttack;
}

/** The item's name in the child's language. */
export function itemLabelOf(item: ItemId, lang: Lang): string {
  return strings[lang].shadows.items[item];
}

/** One message place, one message per situation; each names the item. */
function messageFor(state: GameState): string {
  const s = strings[state.lang].shadows;
  const { shadows } = state;
  const text = (() => {
    if (shadows.stage === "deciding") return s.ask;
    const right = shadowsOutcome(shadows) === "right";
    if (shadows.choice === "give") return right ? s.givenSafe : s.givenSecret;
    return right ? s.keptSecret : s.keptSafe;
  })();
  return text.replace("{0}", itemLabelOf(itemOf(shadows), state.lang));
}

/** Two decisions while deciding, and "Next" once it is made. They share places (`ButtonSlot`). */
function buttonsFor(shadows: Shadows, lang: Lang): ButtonView[] {
  const s = strings[lang].shadows;
  if (shadows.stage === "decided") {
    return [
      { id: "next", text: s.next, event: { type: "NextItem" }, slot: "single", icon: "none" },
    ];
  }
  return [
    {
      id: "give",
      text: s.give,
      event: { type: "DecideItem", choice: "give" },
      slot: "left",
      icon: "arrow",
    },
    {
      id: "keep",
      text: s.secret,
      event: { type: "DecideItem", choice: "keep" },
      slot: "right",
      icon: "lock",
    },
  ];
}

function tileFor(state: GameState): TileView {
  const { shadows, lang } = state;
  const id = itemOf(shadows);
  const bubble = bubbleFor(shadows);
  return {
    id,
    label: itemLabelOf(id, lang),
    alpha: bubble === "item" ? 0.45 : 1,
    ticked: shadowsOutcome(shadows) === "right",
    locked: bubble === "quiet",
  };
}

function bubbleFor(shadows: Shadows): Bubble {
  if (shadows.stage === "deciding") return "none";
  return heardItem(shadows) === null ? "quiet" : "item";
}

export function shadowsView(state: GameState): ShadowsView {
  const { shadows, lang } = state;
  const outcome = shadowsOutcome(shadows);
  return {
    guide: strings[lang].shadows.guide,
    message: messageFor(state),
    item: tileFor(state),
    bubble: bubbleFor(shadows),
    why: outcome === "deciding" ? null : strings[lang].shadows.why[itemOf(shadows)],
    buttons: buttonsFor(shadows, lang),
    leave: leaveLabel(lang),
    result: outcome === "deciding" ? null : outcome,
  };
}

/** A decision has just been made: this view has a result and the one before did not (or was a different round). */
export function justDecided(before: ShadowsView | undefined, after: ShadowsView): boolean {
  return after.result !== null && (before?.result ?? null) === null;
}
