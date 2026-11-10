// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { initialField, type Field } from "./field";
import { initialLane, type Lane } from "./lane";
import { initialRun, type Run } from "./run";
import { initialShed, type Shed } from "./shed";

export type Lang = "ja" | "en";

/** `over` is the end screen of a run: the clock reached zero. */
type Phase = "title" | "trial" | "over";

/**
 * The trial numbers: `trial` is 1 in the lane (The Dark Lane), 2 in the shed (The Locked Shed) and 3 in
 * the field (The Wisp Field).
 */
export const trials = { lane: 1, shed: 2, field: 3 } as const;

export type GameState = {
  phase: Phase;
  lang: Lang;
  trial: number;
  hero: { x: number; y: number };
  charms: string[];
  lane: Lane;
  run: Run;
  /** Trial 2. It is `initialShed` whenever `trial` is not 2. */
  shed: Shed;
  /** Trial 3. It is `initialField` whenever `trial` is not 3. */
  field: Field;
};

export const initialState: GameState = {
  phase: "title",
  lang: "en",
  trial: 0,
  hero: { x: 195, y: 612 },
  charms: [],
  lane: initialLane,
  run: initialRun,
  shed: initialShed,
  field: initialField,
};
