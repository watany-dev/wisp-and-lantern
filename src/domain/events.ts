// Scaffold stub: replaced by .kiro/specs/01-core-loop

import type { Lang } from "./state";

export type GameEvent =
  | { type: "Start"; lang?: Lang }
  | { type: "SetLang"; lang: Lang }
  | { type: "MoveHeroTo"; x: number; y: number };
