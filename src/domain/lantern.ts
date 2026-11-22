// Trial 5 (The Flickering Lantern): a 60-second time attack. Each round the child has a wish, a lantern of three
// parts, and the wisp brings one that matches it in every part but one. That part flickers. The child points at it
// (where) and picks a card for it (how); the wisp changes exactly that part to exactly that look. A right card lights
// the lantern; a wrong one changes the part, which still flickers. The clock and the score are the run's (`run.ts`).
// Rules only: no text, no layout. See .kiro/specs/08-trial-tell-whats-wrong/design.md.

import type { LanternEvent } from "./events";

/** The three parts of a lantern, from the top. */
export const parts = ["handle", "roof", "light"] as const;

export type PartId = (typeof parts)[number];

const table = {
  handle: ["ring", "bow", "bell"],
  roof: ["pointy", "round", "flat"],
  light: ["candle", "star", "moon"],
} as const;

/** What a part is like. The nine ids are all different, so a look always names its part too. */
export type LookId = (typeof table)[PartId][number];

/** The three looks of each part, in a fixed order: the order of the cards. */
export const looksOf: Readonly<Record<PartId, readonly LookId[]>> = table;

/** A lantern: a look for each part. */
export type Shape = Readonly<Record<PartId, LookId>>;

/**
 * What the game says while the child looks: nothing, that a steady part the child tapped is fine, or the look
 * the child said with a card that was not the wish's.
 */
type Note = { kind: "fine"; part: PartId } | { kind: "said"; look: LookId } | null;

/**
 * `looking`: the lantern as it is now (`shape`) is in front of the child, with one part flickering. `pointing`: the
 * child tapped the flickering part, and its two cards are open. `lit`: the lantern is the wish. `seed` and `round`
 * say which wish and which brought lantern this is (`wishAt`, `broughtAt`); they are never stored.
 */
export type Lantern =
  | { stage: "looking"; seed: number; round: number; shape: Shape; note: Note }
  | { stage: "pointing"; seed: number; round: number; shape: Shape; part: PartId }
  | { stage: "lit"; seed: number; round: number };

/** The `n`-th digit of the seed in base 3. The rounds of a seed are built from its digits. */
const digit = (seed: number, n: number) => Math.floor(seed / 3 ** n) % 3;

/** How far each part's look moves from one round to the next: every part changes every round. */
const steps: Readonly<Record<PartId, number>> = { handle: 1, roof: 2, light: 1 };

const lookAt = (part: PartId, index: number): LookId => looksOf[part][index % 3]!;

/** The wish of a round. The same seed and round always give the same wish (ADR 0001). */
export function wishAt(seed: number, round: number): Shape {
  const look = (part: PartId, n: number) => lookAt(part, digit(seed, n) + steps[part] * round);
  return { handle: look("handle", 0), roof: look("roof", 1), light: look("light", 2) };
}

/** The part the wisp brings differently in a round. It moves every round, through all three. */
export function faultAt(seed: number, round: number): PartId {
  return parts[(digit(seed, 3) + round) % 3]!;
}

/**
 * How many looks on from the wish's look the wisp brings the fault part, round by round. The cards follow the look
 * the part has (`cardsOf`), so 2 puts the right card on the left and 1 on the right. Two cycles of six, by kind
 * (L left, R right): `LRRLLR` and `RLLRLR`. Neither simply alternates, and neither runs a side three times in a
 * row, the wrap included.
 */
const slips: readonly (readonly number[])[] = [
  [2, 1, 1, 2, 2, 1],
  [1, 2, 2, 1, 2, 1],
];

/**
 * The lantern the wisp brings: the wish, with the fault part one or two looks further on. The seed picks one of the
 * two cycles and where in it the run starts.
 */
export function broughtAt(seed: number, round: number): Shape {
  const wish = wishAt(seed, round);
  const part = faultAt(seed, round);
  const cycle = slips[digit(seed, 4) % 2]!;
  const slip = cycle[(Math.floor(seed / 3 ** 5) + round) % 6]!;
  return { ...wish, [part]: lookAt(part, looksOf[part].indexOf(wish[part]) + slip) };
}

/** Round `round` of `seed`: the brought lantern, nothing pointed at, nothing said. */
function roundOf(seed: number, round: number): Lantern {
  return { stage: "looking", seed, round, shape: broughtAt(seed, round), note: null };
}

export const initialLantern: Lantern = roundOf(0, 0);

/** The lantern of a new run: round 0 for `seed`. The seed is a whole number, so a stray value still plays the same. */
export function newLantern(seed: number): Lantern {
  return roundOf(seed >>> 0, 0);
}

export function wishOf(lantern: Lantern): Shape {
  return wishAt(lantern.seed, lantern.round);
}

/** The lantern as it is now. A lit lantern is the wish. */
export function shapeOf(lantern: Lantern): Shape {
  return lantern.stage === "lit" ? wishOf(lantern) : lantern.shape;
}

/** The part that is not the wish's, which flickers, or `null` once the lantern is lit. */
export function flickerOf(lantern: Lantern): PartId | null {
  const wish = wishOf(lantern);
  const shape = shapeOf(lantern);
  return parts.find((part) => shape[part] !== wish[part]) ?? null;
}

type Pointing = Extract<Lantern, { stage: "pointing" }>;

/** The looks of `part` other than the one it has now, in the order that follows it round the three: the two cards. */
function cardsFor({ shape, part }: Pointing): LookId[] {
  const now = looksOf[part].indexOf(shape[part]);
  return [lookAt(part, now + 1), lookAt(part, now + 2)];
}

/** The two cards while a part is pointed at. None otherwise. */
export function cardsOf(lantern: Lantern): LookId[] {
  return lantern.stage === "pointing" ? cardsFor(lantern) : [];
}

/** Whether `look` is the wish's look for the pointed part, or `null` when it is not one of the two cards. */
function rightCard(lantern: Pointing, look: LookId): boolean | null {
  if (!cardsFor(lantern).includes(look)) return null;
  return wishOf(lantern)[lantern.part] === look;
}

/**
 * Whether `look` is the right card, or `null` when it is no card at all (nothing is pointed at, or it is not one of
 * the two cards). The reducer scores with it: a right card adds points, a wrong one ends the streak, `null` changes
 * nothing.
 */
export function fixRight(lantern: Lantern, look: LookId): boolean | null {
  return lantern.stage === "pointing" ? rightCard(lantern, look) : null;
}

/** A tap on a part: the flickering part opens its cards; a steady part is fine. Nothing changes a look. */
function point(lantern: Lantern, part: PartId): Lantern {
  if (lantern.stage === "lit") return lantern;
  const { seed, round, shape } = lantern;
  if (part === flickerOf(lantern)) return { stage: "pointing", seed, round, shape, part };
  return { stage: "looking", seed, round, shape, note: { kind: "fine", part } };
}

/** A card: the pointed part takes exactly that look. The wish's look lights the lantern. */
function fix(lantern: Lantern, look: LookId): Lantern {
  if (lantern.stage !== "pointing") return lantern;
  const right = rightCard(lantern, look);
  if (right === null) return lantern;
  const { seed, round, shape, part } = lantern;
  if (right) return { stage: "lit", seed, round };
  return {
    stage: "looking",
    seed,
    round,
    shape: { ...shape, [part]: look },
    note: { kind: "said", look },
  };
}

/**
 * Returns `lantern` itself when the event changes nothing. Starting and leaving the trial are the reducer's, and so
 * is the score.
 */
export function reduceLantern(lantern: Lantern, event: LanternEvent): Lantern {
  switch (event.type) {
    case "TapPart":
      return point(lantern, event.part);
    case "FixPart":
      return fix(lantern, event.look);
    case "NextLantern":
      return lantern.stage === "lit" ? roundOf(lantern.seed, lantern.round + 1) : lantern;
  }
}
