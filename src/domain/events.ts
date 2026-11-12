// Scaffold stub: replaced by .kiro/specs/01-core-loop

import type { CardId } from "./lane";
import type { Verdict } from "./field";
import type { ToolId } from "./shed";
import type { Lang } from "./state";

/** Events of trial 1. `Ask` is the only way the helper searches. */
export type LaneEvent = { type: "PickCard"; card: CardId } | { type: "Ask" } | { type: "Retry" };

/**
 * Events of trial 2. `GiveTool` is the only way a tool is used. They have their own names so that no
 * trial 1 event can act on the shed, and no shed event on the lane.
 */
export type ShedEvent =
  | { type: "PickTool"; tool: ToolId }
  | { type: "GiveTool" }
  | { type: "RetryShed" };

/**
 * Events of trial 3. `InspectStar` only puts a star in the lens; `SortStar` is the child's verdict on it;
 * `KeepStars` is the only way a star is accepted. They have their own names so that no other trial's
 * event can act on the field, and no field event on another trial.
 */
export type FieldEvent =
  | { type: "InspectStar"; index: number }
  | { type: "SortStar"; verdict: Verdict }
  | { type: "KeepStars" }
  | { type: "RetryField" };

export type GameEvent =
  | { type: "Start"; lang?: Lang }
  | { type: "SetLang"; lang: Lang }
  | { type: "MoveHeroTo"; x: number; y: number }
  /** `ms` of play time passed. The only way time reaches the reducer (ADR 0001). */
  | { type: "Tick"; ms: number }
  /** Opens the shed from the title: the only way into trial 2. */
  | { type: "StartShed" }
  /** Opens the field from the title: the only way into trial 3. `seed` picks which stars are fake. */
  | { type: "StartField"; seed: number }
  /** Back to the title from the cleared field: the only way out of trial 3. */
  | { type: "LeaveField" }
  | LaneEvent
  | ShedEvent
  | FieldEvent;
