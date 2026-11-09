// Trial 2 (The Locked Shed): which tool the child picked, and what the wisp did with the one it was
// given. Rules only: no text, no layout. See .kiro/specs/05-trial-grant-tools/design.md.

import type { ShedEvent } from "./events";

export const tools = ["key", "broom", "hammer"] as const;

export type ToolId = (typeof tools)[number];

/**
 * `choosing` holds the pick: none or one tool. `tried` holds the tool that was handed over. The tried
 * tool is the pick, locked at the hand-over, so the selection and the result are one value and cannot
 * drift. The outcome is not stored: `shedOutcome` derives it from the tried tool.
 */
export type Shed = { stage: "choosing"; pick: ToolId | null } | { stage: "tried"; tool: ToolId };

export type ShedOutcome = "choosing" | "open" | "shut";

export const initialShed: Shed = { stage: "choosing", pick: null };

/**
 * The fixed rule of the shed (REQ-5.5): only the key fits the lock. It is a staging device for one
 * lesson, not a claim about real AI; see the design, "Why only the key opens".
 */
export function opensDoor(tool: ToolId): boolean {
  return tool === "key";
}

/** The tool the wisp tried, or null while the child is still choosing. */
export function triedTool(shed: Shed): ToolId | null {
  return shed.stage === "tried" ? shed.tool : null;
}

export function shedOutcome(shed: Shed): ShedOutcome {
  const tool = triedTool(shed);
  if (tool === null) return "choosing";
  return opensDoor(tool) ? "open" : "shut";
}

/** A tool is picked and has not been handed over yet. */
export function canGive(shed: Shed): boolean {
  return shed.stage === "choosing" && shed.pick !== null;
}

/** Returns `shed` itself when the event changes nothing. */
export function reduceShed(shed: Shed, event: ShedEvent): Shed {
  switch (event.type) {
    case "PickTool":
      return shed.stage === "choosing" && shed.pick !== event.tool
        ? { stage: "choosing", pick: event.tool }
        : shed;
    case "GiveTool":
      return shed.stage === "choosing" && shed.pick !== null
        ? { stage: "tried", tool: shed.pick }
        : shed;
    case "RetryShed":
      return shed.stage === "tried" ? initialShed : shed;
  }
}
