// What trial 1 shows for a game state: texts, which cards are marked, the lit slot, the button.
// Plain data in, plain data out, so the scene stays thin (ADR 0003). Child-facing text comes from
// `src/content` only (REQ-2.13).

import {
  canAsk,
  colors,
  delivered,
  isComplete,
  outcome,
  things,
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
import { messageText as choosingText, resultText, slotCenter, wisp } from "./lane-layout";
import type { Point } from "./steer";

const strings = { ja, en };

type MessageKey = keyof typeof ja.lane;

/** How one picture card looks: its label, whether it is marked, and how faded it is. */
type CardState = { id: CardId; label: string; picked: boolean; alpha: number };

export type LaneView = {
  message: string;
  /** Shown after a search. Both results retry; the right one moves on to the next wish. */
  button: { text: string; event: LaneEvent } | null;
  /** The wisp can be sent now. */
  armed: boolean;
  /** The cards cannot be changed until the retry. */
  locked: boolean;
  cards: CardState[];
  /** The slot the helper lit: the item it brought, which is not always what the wish asked for. */
  lit: Wish | null;
  star: boolean;
  /** The closing line, on the right result only. It is its own text, not part of `message`. */
  lesson: string | null;
  /** The wisp is faded while it cannot be sent. */
  wispAlpha: number;
  wish: Wish;
  wishText: string;
  wispTarget: Point;
  /** Where the message goes: in the wisp's spot after a result, below it while choosing. */
  messageAt: Point;
};

/** The center of a text box as a plain point. */
const spot = ({ x, y }: Point): Point => ({ x, y });

export function cardLabel(card: CardId, lang: Lang): string {
  return cardOf(card).label[lang];
}

/** "red pumpkin" in English: the color label and the object label, joined with a space. */
export function itemName(item: Wish, lang: Lang): string {
  return `${cardLabel(item.color, lang)} ${cardLabel(item.thing, lang)}`;
}

/** A request with one card is `vague`; the wisp chose the rest, so it never says "as you asked". */
function messageKey(state: GameState): MessageKey {
  const { lane } = state;
  const result = outcome(lane);
  if (result === "choosing") return canAsk(lane) ? "ready" : "pickAny";
  if (result === "right") return "right";
  return isComplete(lane.pick) ? "wrong" : "vague";
}

/** The message for the stage; a result message names the item the wisp brought. */
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

/** After the search the cards that were not picked fade, so the asked pair stands out. */
function cardStates(lane: Lane, lang: Lang): CardState[] {
  return [...colors, ...things].map((id) => {
    const picked = lane.pick.color === id || lane.pick.thing === id;
    return { id, label: cardLabel(id, lang), picked, alpha: lane.asked && !picked ? 0.45 : 1 };
  });
}

export function laneView(state: GameState): LaneView {
  const { lane } = state;
  const lit = delivered(lane);
  const right = outcome(lane) === "right";
  return {
    message: messageText(state, lit),
    button: buttonFor(state),
    armed: canAsk(lane),
    locked: lane.asked,
    cards: cardStates(lane, state.lang),
    lit,
    star: right,
    lesson: right ? strings[state.lang].lane.lesson : null,
    wispAlpha: canAsk(lane) || lane.asked ? 1 : 0.55,
    wish: wishAt(lane.wish),
    wishText: strings[state.lang].lane.wish,
    wispTarget: lit ? slotCenter(lit.color, lit.thing) : wisp,
    messageAt: lit ? spot(resultText) : spot(choosingText),
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
