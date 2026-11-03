// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../events";
import { reduce } from "../reducer";
import { initialState, type GameState } from "../state";
import { checkModel } from "./support/model-check";

// A finite alphabet that still reaches every phase and language: two hero positions stand for
// "anywhere", since the reducer treats every position the same way.
const alphabet: readonly GameEvent[] = [
  { type: "Start" },
  { type: "Start", lang: "ja" },
  { type: "SetLang", lang: "ja" },
  { type: "SetLang", lang: "en" },
  { type: "MoveHeroTo", x: 0, y: 0 },
  { type: "MoveHeroTo", x: 195, y: 600 },
];

describe("reduce (exhaustive model check)", () => {
  it("keeps the invariants in every reachable state and can always reach a trial", () => {
    const report = checkModel<GameState, GameEvent>({
      initial: initialState,
      events: () => alphabet,
      step: reduce,
      invariants: {
        "phase is title or trial": (s) => s.phase === "title" || s.phase === "trial",
        "trial is not negative": (s) => s.trial >= 0,
      },
      goal: (s) => s.phase === "trial",
    });
    expect(report.violations).toEqual([]);
    // 2 phases x 2 languages x 2 positions.
    expect(report.states).toBe(8);
  });
});
