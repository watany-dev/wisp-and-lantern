// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { initialLane, type Lane } from "./lane";
import { initialRun, type Run } from "./run";

export type Lang = "ja" | "en";

/** `over` is the end screen of a run: the clock reached zero. */
type Phase = "title" | "trial" | "over";

export type GameState = {
  phase: Phase;
  lang: Lang;
  trial: number;
  hero: { x: number; y: number };
  charms: string[];
  lane: Lane;
  run: Run;
};

export const initialState: GameState = {
  phase: "title",
  lang: "en",
  trial: 0,
  hero: { x: 195, y: 612 },
  charms: [],
  lane: initialLane,
  run: initialRun,
};
