// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { initialCrown, type Crown } from "./crown";
import { initialField, type Field } from "./field";
import { initialLane, type Lane } from "./lane";
import { initialLantern, type Lantern } from "./lantern";
import { initialRun, type Run } from "./run";
import { initialShadows, type Shadows } from "./shadows";
import { initialShed, type Shed } from "./shed";

export type Lang = "ja" | "en";

/** `over` is the end screen of a run: the clock reached zero. */
type Phase = "title" | "trial" | "over";

/**
 * The trial numbers: `trial` is 1 in the lane (The Dark Lane), 2 in the shed (The Locked Shed), 3 in
 * the field (The Wisp Field), 4 in the shadows (The Listening Shadows), 5 in the lantern (The Flickering
 * Lantern) and 6 in the crown (The Hollow Crown).
 */
export const trials = { lane: 1, shed: 2, field: 3, shadows: 4, lantern: 5, crown: 6 } as const;

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
  /** Trial 4. It is `initialShadows` whenever `trial` is not 4. */
  shadows: Shadows;
  /** Trial 5. It is `initialLantern` whenever `trial` is not 5. */
  lantern: Lantern;
  /** Trial 6. It is `initialCrown` whenever `trial` is not 6. */
  crown: Crown;
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
  shadows: initialShadows,
  lantern: initialLantern,
  crown: initialCrown,
};
