// Balance constants. Spec: .kiro/specs/04-score-attack/design.md

import type { Wish } from "./lane";

/**
 * The villager's wishes, in play order: all six lane items once. Neighbors differ in both the color
 * and the object, including the last and the first, so a wish never repeats the one before it.
 */
const wishes: readonly Wish[] = [
  { color: "yellow", thing: "lantern" },
  { color: "red", thing: "pumpkin" },
  { color: "blue", thing: "lantern" },
  { color: "yellow", thing: "pumpkin" },
  { color: "red", thing: "lantern" },
  { color: "blue", thing: "pumpkin" },
];

/** Points for the wish found: `find`, plus `streakStep` for each find in a row, up to `streakCap`. */
const score = { find: 100, streakStep: 50, streakCap: 4 } as const;

export const balance = {
  heroSpeed: 240,
  wispSpeed: 520,
  wishes,
  /** The length of one run in milliseconds. */
  runMs: 60_000,
  score,
} as const;
