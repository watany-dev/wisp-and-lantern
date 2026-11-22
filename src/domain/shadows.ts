// Trial 4 (The Listening Shadows): a 60-second time attack. Each round puts one item in front of the wisp
// while a shadow listens. The child decides once: give it, or keep it secret. A house key, an address and a
// password are secrets; a candy, a ball and a flower are fine to give. The clock and the score are the run's
// (`run.ts`), and the rounds go on until the time is up. Rules only: no text, no layout.
// See .kiro/specs/07-trial-keep-secrets/design.md.

import type { ShadowsEvent } from "./events";

export const items = ["houseKey", "address", "password", "candy", "ball", "flower"] as const;

export type ItemId = (typeof items)[number];

/** The three things that are given to nobody. Everything else in `items` is fine to give. */
const secrets: readonly ItemId[] = ["houseKey", "address", "password"];

/** What the child decides about the item: give it to the wisp, or keep it secret. */
export type Choice = "give" | "keep";

/**
 * `deciding`: the item of this round is in front of the wisp and nothing is decided. `decided`: the child
 * pressed `choice`, once, and the result stays until `NextItem`. `seed` and `round` say which item this is
 * (`itemAt`); whether the decision was right is not stored: `shadowsOutcome` derives it, so the state can
 * never disagree with the item.
 */
export type Shadows =
  | { stage: "deciding"; seed: number; round: number }
  | { stage: "decided"; seed: number; round: number; choice: Choice };

/** `right`: a thing that is fine to give was given, or a secret was kept. `wrong`: the other two cases. */
export type ShadowsOutcome = "deciding" | "right" | "wrong";

export const initialShadows: Shadows = { stage: "deciding", seed: 0, round: 0 };

/** The shadows of a new run: round 0 for `seed`. The seed is a whole number, so a stray value still plays the same. */
export function newShadows(seed: number): Shadows {
  return { ...initialShadows, seed: seed >>> 0 };
}

/**
 * Four orders of the six items, as the kinds fall: secret (S) or fine to give (G). Each is a cycle: no item
 * repeats the one before it, the wrap included, and no kind runs three in a row, the wrap included.
 *   0: S G G S S G    1: G S S G S G    2: S G G S G S    3: G G S S G S
 */
const orders: readonly (readonly ItemId[])[] = [
  ["houseKey", "candy", "ball", "address", "password", "flower"],
  ["ball", "address", "password", "candy", "houseKey", "flower"],
  ["password", "ball", "flower", "houseKey", "candy", "address"],
  ["candy", "flower", "address", "houseKey", "ball", "password"],
];

/**
 * The item of a round. The seed picks one of the four orders and where in it the run starts; the round walks
 * through it and wraps, so every six rounds show all six items. The same seed and round always give the same
 * item (ADR 0001).
 */
export function itemAt(seed: number, round: number): ItemId {
  const order = orders[seed % orders.length]!;
  const start = Math.floor(seed / orders.length) % order.length;
  return order[(start + round) % order.length]!;
}

export function itemOf(shadows: Shadows): ItemId {
  return itemAt(shadows.seed, shadows.round);
}

/** A secret is given to nobody. This is the one place that says which items are secrets. */
export function isSecret(item: ItemId): boolean {
  return secrets.includes(item);
}

/** The right decision for an item: keep a secret, give the rest. */
export function choiceRight(item: ItemId, choice: Choice): boolean {
  return isSecret(item) === (choice === "keep");
}

/**
 * Whether `choice` is right for this round's item, or `null` when there is nothing to decide (the round is
 * already decided). The reducer scores with it: a right decision adds points, a wrong one ends the streak,
 * and `null` changes nothing.
 */
export function decisionRight(shadows: Shadows, choice: Choice): boolean | null {
  return shadows.stage === "deciding" ? choiceRight(itemOf(shadows), choice) : null;
}

export function shadowsOutcome(shadows: Shadows): ShadowsOutcome {
  if (shadows.stage === "deciding") return "deciding";
  return choiceRight(itemOf(shadows), shadows.choice) ? "right" : "wrong";
}

/** The choice the child pressed, or `null` while the round is not decided. */
export function choiceOf(shadows: Shadows): Choice | null {
  return shadows.stage === "decided" ? shadows.choice : null;
}

/** What the shadow heard: the item once it was given, and nothing when it was kept or is not decided yet. */
export function heardItem(shadows: Shadows): ItemId | null {
  return choiceOf(shadows) === "give" ? itemOf(shadows) : null;
}

/**
 * Returns `shadows` itself when the event changes nothing. A decision is made once; `NextItem` after it is the
 * next round. Starting and leaving the trial are the reducer's.
 */
export function reduceShadows(shadows: Shadows, event: ShadowsEvent): Shadows {
  switch (event.type) {
    case "DecideItem":
      return shadows.stage === "deciding"
        ? { stage: "decided", seed: shadows.seed, round: shadows.round, choice: event.choice }
        : shadows;
    case "NextItem":
      return shadows.stage === "decided"
        ? { stage: "deciding", seed: shadows.seed, round: shadows.round + 1 }
        : shadows;
  }
}
