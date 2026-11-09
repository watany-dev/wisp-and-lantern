// Scaffold stub: replaced by .kiro/specs/01-core-loop

import type { CardId } from "./lane";
import type { Lang } from "./state";

/** Events of trial 1. `Ask` is the only way the helper searches. */
export type LaneEvent = { type: "PickCard"; card: CardId } | { type: "Ask" } | { type: "Retry" };

export type GameEvent =
  | { type: "Start"; lang?: Lang }
  | { type: "SetLang"; lang: Lang }
  | { type: "MoveHeroTo"; x: number; y: number }
  /** `ms` of play time passed. The only way time reaches the reducer (ADR 0001). */
  | { type: "Tick"; ms: number }
  | LaneEvent;
