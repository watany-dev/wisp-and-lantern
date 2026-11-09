// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { initialLane, type Lane } from "./lane";
import { initialRun, type Run } from "./run";
import { initialShed, type Shed } from "./shed";

export type Lang = "ja" | "en";

/** `over` is the end screen of a run: the clock reached zero. */
type Phase = "title" | "trial" | "over";

/** The trial numbers: `trial` is 1 in the lane (The Dark Lane) and 2 in the shed (The Locked Shed). */
export const trials = { lane: 1, shed: 2 } as const;

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
};
