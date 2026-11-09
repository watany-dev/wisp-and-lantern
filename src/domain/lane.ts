// Trial 1 (The Dark Lane): what the child has picked and whether the helper has searched.
// Rules only: no text, no layout. See .kiro/specs/02-trial-tell/design.md and, for the ask rule and
// the item the wisp brings, .kiro/specs/03-trial-tell-vague-request/design.md.

import { balance } from "./balance";
import type { LaneEvent } from "./events";

export const colors = ["red", "blue", "yellow"] as const;
export const things = ["pumpkin", "lantern"] as const;

export type ColorId = (typeof colors)[number];
export type ThingId = (typeof things)[number];
export type CardId = ColorId | ThingId;

export type Pick = { color: ColorId | null; thing: ThingId | null };
export type Wish = { color: ColorId; thing: ThingId };

/**
 * `asked` is true once the child tapped the wisp with at least one card picked. The item the wisp
 * brought is not stored: `delivered(lane)` derives it from `pick` and the wish, so it cannot drift
 * from what was asked.
 */
export type Lane = { wish: number; pick: Pick; asked: boolean };

export type Outcome = "choosing" | "right" | "wrong";

export const initialLane: Lane = { wish: 0, pick: { color: null, thing: null }, asked: false };

export function isColor(card: CardId): card is ColorId {
  return (colors as readonly string[]).includes(card);
}

export function isComplete(pick: Pick): pick is Wish {
  return pick.color !== null && pick.thing !== null;
}

/** The child picked at least one card. */
export function hasPick(pick: Pick): boolean {
  return pick.color !== null || pick.thing !== null;
}

/** The wisp can be sent: at least one card is picked and it has not searched yet. */
export function canAsk(lane: Lane): boolean {
  return !lane.asked && hasPick(lane.pick);
}

export function wishAt(index: number): Wish {
  return balance.wishes[index]!;
}

/** The entry after `item` in `order`; after the last comes the first. */
function following<T>(order: readonly T[], item: T): T {
  return order[(order.indexOf(item) + 1) % order.length]!;
}

/**
 * What the wisp brings for a request. The cards the child picked are kept as asked. A card left out
 * is filled in from the wish: the next color, or the next object, so the item differs from the wish
 * exactly where the child said nothing. With both cards the item is the pair itself. Rules:
 * .kiro/specs/03-trial-tell-vague-request/design.md.
 */
export function deliver(pick: Pick, wish: Wish): Wish {
  return {
    color: pick.color ?? following(colors, wish.color),
    thing: pick.thing ?? following(things, wish.thing),
  };
}

/** The item the wisp brought, or null before it has searched. Derived, never stored. */
export function delivered(lane: Lane): Wish | null {
  return lane.asked ? deliver(lane.pick, wishAt(lane.wish)) : null;
}

/** Right when the item the wisp brought is the wish; a vague request never brings the wish. */
export function outcome(lane: Lane): Outcome {
  const item = delivered(lane);
  if (item === null) return "choosing";
  const wish = wishAt(lane.wish);
  return item.color === wish.color && item.thing === wish.thing ? "right" : "wrong";
}

/** Returns `lane` itself when the event changes nothing. */
export function reduceLane(lane: Lane, event: LaneEvent): Lane {
  switch (event.type) {
    case "PickCard":
      return lane.asked ? lane : { ...lane, pick: pickCard(lane.pick, event.card) };
    case "Ask":
      return canAsk(lane) ? { ...lane, asked: true } : lane;
    case "Retry":
      return lane.asked ? { wish: nextWish(lane), pick: initialLane.pick, asked: false } : lane;
  }
}

function pickCard(pick: Pick, card: CardId): Pick {
  return isColor(card) ? { ...pick, color: card } : { ...pick, thing: card };
}

/** The same wish after a different request; the next one after the right one. */
function nextWish(lane: Lane): number {
  return outcome(lane) === "right" ? (lane.wish + 1) % balance.wishes.length : lane.wish;
}
