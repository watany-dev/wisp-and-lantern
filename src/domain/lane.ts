// Trial 1 (The Dark Lane): what the child has picked and whether the helper has searched.
// Rules only: no text, no layout. See .kiro/specs/02-trial-tell/design.md.

import { balance } from "./balance";
import type { LaneEvent } from "./events";

export const colors = ["red", "blue", "yellow"] as const;
export const things = ["pumpkin", "lantern"] as const;

export type ColorId = (typeof colors)[number];
type ThingId = (typeof things)[number];
export type CardId = ColorId | ThingId;

export type Pick = { color: ColorId | null; thing: ThingId | null };
export type Wish = { color: ColorId; thing: ThingId };

/**
 * `asked` is true once the child tapped the wisp with both cards picked. The helper then searched
 * exactly `pick`, so there is no separate "found item" that could differ from what was asked.
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

export function wishAt(index: number): Wish {
  return balance.wishes[index]!;
}

export function outcome(lane: Lane): Outcome {
  if (!lane.asked) return "choosing";
  const wish = wishAt(lane.wish);
  return lane.pick.color === wish.color && lane.pick.thing === wish.thing ? "right" : "wrong";
}

/** Returns `lane` itself when the event changes nothing. */
export function reduceLane(lane: Lane, event: LaneEvent): Lane {
  switch (event.type) {
    case "PickCard":
      return lane.asked ? lane : { ...lane, pick: pickCard(lane.pick, event.card) };
    case "Ask":
      return lane.asked || !isComplete(lane.pick) ? lane : { ...lane, asked: true };
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
