// Scaffold stub: replaced by .kiro/specs/01-core-loop

import type { Wish } from "./lane";

/** The villager's wishes for trial 1, in play order. Each is one of the six lane items. */
const wishes: readonly Wish[] = [
  { color: "yellow", thing: "lantern" },
  { color: "red", thing: "pumpkin" },
  { color: "blue", thing: "lantern" },
];

export const balance = { heroSpeed: 240, wispSpeed: 520, wishes } as const;
