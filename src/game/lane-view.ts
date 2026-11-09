// What trial 1 shows for a game state: texts, which cards are marked, the lit slot, the button.
// Plain data in, plain data out, so the scene stays thin (ADR 0003). Child-facing text comes from
// `src/content` only (REQ-2.13).

import {
  canAsk,
  isComplete,
  outcome,
  wishAt,
  type CardId,
  type Lane,
  type Wish,
} from "../domain/lane";
import type { LaneEvent } from "../domain/events";
import type { GameState, Lang } from "../domain/state";
import cards from "../content/cards.json";
import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";
import { slotCenter, wisp } from "./lane-layout";
import type { Point } from "./steer";

const strings = { ja, en };

type MessageKey = keyof typeof ja.lane;

export type LaneView = {
  message: string;
  /** Shown after a search. Both results retry; the right one moves on to the next wish. */
  button: { text: string; event: LaneEvent } | null;
  /** The wisp can be sent now. */
  armed: boolean;
  /** The cards cannot be changed until the retry. */
  locked: boolean;
  picked: Lane["pick"];
  /** The slot the helper lit: exactly what was asked. */
  lit: Wish | null;
  star: boolean;
  wish: Wish;
  wishText: string;
  wispTarget: Point;
};

export function cardLabel(card: CardId, lang: Lang): string {
  return cardOf(card).label[lang];
}

/** "red pumpkin" in English: the color label and the object label, joined with a space. */
export function itemName(item: Wish, lang: Lang): string {
  return `${cardLabel(item.color, lang)} ${cardLabel(item.thing, lang)}`;
}

function messageKey(state: GameState): MessageKey {
  const { pick } = state.lane;
  const result = outcome(state.lane);
  if (result !== "choosing") return result;
  if (canAsk(state.lane)) return "ready";
  if (pick.color === null && pick.thing === null) return "pickBoth";
  return pick.color === null ? "pickColor" : "pickThing";
}

/** The message for the stage; the wrong-result message names the item the wisp brought. */
function messageText(state: GameState, lit: Wish | null): string {
  const text = strings[state.lang].lane[messageKey(state)];
  return lit ? text.replace("{0}", itemName(lit, state.lang)) : text;
}

function buttonFor(state: GameState): LaneView["button"] {
  const result = outcome(state.lane);
  if (result === "choosing") return null;
  const s = strings[state.lang];
  return { text: result === "right" ? s.lane.again : s.retry, event: { type: "Retry" } };
}

export function laneView(state: GameState): LaneView {
  const { lane } = state;
  const lit = lane.asked && isComplete(lane.pick) ? lane.pick : null;
  return {
    message: messageText(state, lit),
    button: buttonFor(state),
    armed: canAsk(lane),
    locked: lane.asked,
    picked: lane.pick,
    lit,
    star: outcome(lane) === "right",
    wish: wishAt(lane.wish),
    wishText: strings[state.lang].lane.wish,
    wispTarget: lit ? slotCenter(lit.color, lit.thing) : wisp,
  };
}

const cardOf = (id: CardId) => cards.find((c) => c.id === id)!;

/** The art of one color card: its hex, shape and pattern. */
export function colorArt(color: Wish["color"]) {
  const { color: fill, shape, pattern } = cardOf(color);
  return { fill, shape, pattern };
}

/** The silhouette of one object card, drawn in a neutral color. */
export function thingArt(thing: Wish["thing"]) {
  const { color: fill, shape: silhouette } = cardOf(thing);
  return { fill, silhouette };
}

/** An item in the lane or in the wish: the color's fill, pattern and shape badge on the object's silhouette. */
export function itemArt(item: Wish) {
  const { fill, shape, pattern } = colorArt(item.color);
  return { fill, pattern, badge: shape, silhouette: thingArt(item.thing).silhouette };
}
