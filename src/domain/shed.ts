// Trial 2 (The Locked Shed): a 60-second time attack. Each round shows one puzzle, the child hands the
// wisp one of five tools, and the wisp tries exactly that tool. Every puzzle has its own answer. Rules
// only: no text, no layout. See .kiro/specs/05-trial-grant-tools/design.md.

import type { ShedEvent } from "./events";

export const tools = ["key", "broom", "hammer", "scissors", "ladder"] as const;

export type ToolId = (typeof tools)[number];

/** What keeps the cat from coming out. Each puzzle has one tool that solves it (`answerOf`). */
export const puzzles = ["lock", "leaves", "boards", "rope", "roof"] as const;

export type PuzzleId = (typeof puzzles)[number];

const answers: Record<PuzzleId, ToolId> = {
  lock: "key",
  leaves: "broom",
  boards: "hammer",
  rope: "scissors",
  roof: "ladder",
};

/**
 * `choosing` holds the pick: none or one tool. `tried` holds the tool that was handed over. The tried
 * tool is the pick, locked at the hand-over, so the selection and the result are one value and cannot
 * drift. `seed` and `round` say which puzzle this is (`puzzleAt`); the outcome is not stored:
 * `shedOutcome` derives it from the puzzle and the tried tool.
 */
export type Shed =
  | { stage: "choosing"; seed: number; round: number; pick: ToolId | null }
  | { stage: "tried"; seed: number; round: number; tool: ToolId };

/** `freed`: the tool solved the puzzle and the cat is out. `stuck`: it did not, and the cat is still in. */
export type ShedOutcome = "choosing" | "freed" | "stuck";

export const initialShed: Shed = { stage: "choosing", seed: 0, round: 0, pick: null };

/** The shed of a new run: round 0 for `seed`. The seed is a whole number, so a stray value still plays the same. */
export function newShed(seed: number): Shed {
  return { ...initialShed, seed: seed >>> 0 };
}

/**
 * The puzzle of a round. The seed picks where the order starts and how it steps through the five
 * puzzles; the step is never 0 modulo 5, so a puzzle never repeats the one before it, and every five
 * rounds show all five. The same seed and round always give the same puzzle (ADR 0001).
 */
export function puzzleAt(seed: number, round: number): PuzzleId {
  const count = puzzles.length;
  const start = seed % count;
  const step = 1 + (Math.floor(seed / count) % (count - 1));
  return puzzles[(start + step * round) % count]!;
}

export function puzzleOf(shed: Shed): PuzzleId {
  return puzzleAt(shed.seed, shed.round);
}

/** The one tool that solves the puzzle. It is a staging device, not a claim about real AI (see the design). */
export function answerOf(puzzle: PuzzleId): ToolId {
  return answers[puzzle];
}

export function solves(puzzle: PuzzleId, tool: ToolId): boolean {
  return answerOf(puzzle) === tool;
}

/** The tool the wisp tried, or null while the child is still choosing. */
export function triedTool(shed: Shed): ToolId | null {
  return shed.stage === "tried" ? shed.tool : null;
}

export function shedOutcome(shed: Shed): ShedOutcome {
  const tool = triedTool(shed);
  if (tool === null) return "choosing";
  return solves(puzzleOf(shed), tool) ? "freed" : "stuck";
}

/** A tool is picked and has not been handed over yet. */
export function canGive(shed: Shed): boolean {
  return shed.stage === "choosing" && shed.pick !== null;
}

/**
 * Returns `shed` itself when the event changes nothing. The retry after a freed cat is the next round
 * (the next puzzle); the retry after a stuck one is the same puzzle with nothing picked.
 */
export function reduceShed(shed: Shed, event: ShedEvent): Shed {
  switch (event.type) {
    case "PickTool":
      return shed.stage === "choosing" && shed.pick !== event.tool
        ? { ...shed, pick: event.tool }
        : shed;
    case "GiveTool":
      return shed.stage === "choosing" && shed.pick !== null
        ? { stage: "tried", seed: shed.seed, round: shed.round, tool: shed.pick }
        : shed;
    case "RetryShed":
      return shed.stage === "tried" ? retry(shed) : shed;
  }
}

function retry(shed: Shed): Shed {
  const next = shedOutcome(shed) === "freed" ? shed.round + 1 : shed.round;
  return { stage: "choosing", seed: shed.seed, round: next, pick: null };
}
