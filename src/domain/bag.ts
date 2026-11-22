// Trial 4 (The Listening Shadows): five things in front of the child, one or two of them secrets (the house
// key, the address, the password). The child taps a thing to hand it to the wisp; a safe thing is handed over,
// a secret never is. A round is done when every safe thing has been handed over. It is a 60-second time
// attack: the clock and the score are the run's (`run.ts`). Rules only: no text, no layout.
// See .kiro/specs/07-trial-keep-secrets/design.md.

import type { BagEvent } from "./events";

/** Five things every round. */
export const itemCount = 5;

/**
 * Rounds before the table starts again. The number of secrets alternates 1, 2, 1, 2, so this is even and two
 * neighbouring rounds, the wrap included, never have the same things. It also keeps the state space finite.
 */
export const bagRounds = 4;

/** Things that are safe to give. */
export const safeItems = ["candy", "flower", "acorn", "leaf"] as const;
/** Things that are never handed over (L4: keys, addresses, passwords). */
export const secretItems = ["key", "address", "password"] as const;

type SafeItem = (typeof safeItems)[number];
export type SecretItem = (typeof secretItems)[number];
export type ItemId = SafeItem | SecretItem;

/**
 * `giving`: `given[i]` is true once thing `i` was handed to the wisp, which only a safe thing can be. `last` is
 * the last thing tapped while it was still with the child, safe or secret (for the message). `done` is a round
 * where every safe thing has been handed over; the secrets are still with the child. Which things a round has
 * is not stored; `itemsOf` derives it from `seed` and `round`.
 */
export type Bag =
  | { stage: "giving"; seed: number; round: number; given: readonly boolean[]; last: number | null }
  | { stage: "done"; seed: number; round: number };

export const initialBag: Bag = {
  stage: "giving",
  seed: 0,
  round: 0,
  given: [false, false, false, false, false],
  last: null,
};

/** The bag of a new run: round 0 for `seed`. The seed is a whole number, so a stray value still plays the same. */
export function newBag(seed: number): Bag {
  return { ...initialBag, seed: seed >>> 0 };
}

const stepAfter = (state: number): number => (Math.imul(state, 1664525) + 1013904223) >>> 0;

/**
 * The five things of a round, in their places 0 to 4: one secret in the even rounds and two in the odd ones, the
 * rest safe, no thing twice. Which things, and where, come from `seed` and `round` only: the same seed always gives
 * the same four rounds (ADR 0001).
 */
export function itemsOf(seed: number, round: number): readonly ItemId[] {
  const secrets = 1 + (round % 2);
  let state = stepAfter((Math.imul(seed >>> 0, 2654435761) + (round + 1) * 40503) >>> 0);
  const draw = <T>(pool: T[]): T => {
    state = stepAfter(state);
    return pool.splice((state >>> 16) % pool.length, 1)[0]!;
  };
  const secretPool: ItemId[] = [...secretItems];
  const safePool: ItemId[] = [...safeItems];
  const chosen = [
    ...Array.from({ length: secrets }, () => draw(secretPool)),
    ...Array.from({ length: itemCount - secrets }, () => draw(safePool)),
  ];
  return Array.from({ length: itemCount }, () => draw(chosen));
}

export function isSecret(item: ItemId): boolean {
  return (secretItems as readonly ItemId[]).includes(item);
}

/** The thing in place `index` of this round. */
export function itemAt(bag: Bag, index: number): ItemId {
  return itemsOf(bag.seed, bag.round)[index]!;
}

export function isSecretAt(bag: Bag, index: number): boolean {
  return isSecret(itemAt(bag, index));
}

function isItem(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < itemCount;
}

const places = (): number[] => Array.from({ length: itemCount }, (_, i) => i);

/** The places of the things that were handed over: in a done round, every safe thing. */
export function givenItems(bag: Bag): number[] {
  if (bag.stage === "done") return places().filter((i) => !isSecretAt(bag, i));
  return places().filter((i) => bag.given[i]);
}

export function isDone(bag: Bag): boolean {
  return bag.stage === "done";
}

/**
 * What a tap on thing `index` does: `true` hands a safe thing over, `false` holds a secret back, and `null` does
 * nothing (a done round, a thing already handed over, or an index that is not a thing). The reducer scores with it:
 * a hand-over adds points, a secret ends the streak, and `null` changes nothing.
 */
export function handOver(bag: Bag, index: number): boolean | null {
  return give(bag, index) === bag ? null : !isSecretAt(bag, index);
}

/** Returns `bag` itself when the event changes nothing. Starting and leaving the bag are the reducer's. */
export function reduceBag(bag: Bag, event: BagEvent): Bag {
  switch (event.type) {
    case "GiveItem":
      return give(bag, event.index);
    case "RetryBag":
      return bag.stage === "done" ? next(bag) : bag;
  }
}

/**
 * A tap on a thing that is still with the child. A safe thing is handed over, and the round is done once no safe
 * thing is left; a secret is held back and only noted, so a secret is never handed over (INV-47). Anything else
 * (a done round, a thing already handed over, an index that is not a thing) changes nothing.
 */
function give(bag: Bag, index: number): Bag {
  if (bag.stage !== "giving" || !isItem(index) || bag.given[index]) return bag;
  if (isSecretAt(bag, index)) return { ...bag, last: index };
  const given = bag.given.map((done, i) => done || i === index);
  const left = places().some((i) => !given[i] && !isSecretAt(bag, i));
  if (!left) return { stage: "done", seed: bag.seed, round: bag.round };
  return { ...bag, given, last: index };
}

/** A fresh round: nothing handed over, nothing tapped. */
function next(bag: Bag): Bag {
  return { ...initialBag, seed: bag.seed, round: (bag.round + 1) % bagRounds };
}
