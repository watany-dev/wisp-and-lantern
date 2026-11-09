// One 60-second run: the clock, the score and the streak. Rules only, no text and no layout.
// Spec: .kiro/specs/04-score-attack/design.md

import { balance } from "./balance";

/**
 * `streak` counts the wishes found in a row. `best` is the highest score of the runs finished so far
 * in this session, and `record` is true on the end screen when the run just finished beat it.
 */
export type Run = {
  remainingMs: number;
  score: number;
  streak: number;
  best: number;
  record: boolean;
};

export const initialRun: Run = {
  remainingMs: balance.runMs,
  score: 0,
  streak: 0,
  best: 0,
  record: false,
};

/** The points for a find that follows `streak` finds in a row. */
export function pointsFor(streak: number): number {
  const { find, streakStep, streakCap } = balance.score;
  return find + streakStep * Math.min(streak, streakCap);
}

/** A search finished: a find scores and extends the streak, anything else ends the streak. */
export function scoreSearch(run: Run, found: boolean): Run {
  return found
    ? { ...run, score: run.score + pointsFor(run.streak), streak: run.streak + 1 }
    : { ...run, streak: 0 };
}

/** The clock runs down by `ms` and stops at zero. */
export function runDown(run: Run, ms: number): Run {
  return { ...run, remainingMs: Math.max(0, run.remainingMs - ms) };
}

/** The clock reached zero: remember the best score and whether this run beat it. */
export function finishRun(run: Run): Run {
  return { ...run, best: Math.max(run.best, run.score), record: run.score > run.best };
}

/** A new run keeps only the best score. */
export function restartRun(run: Run): Run {
  return { ...initialRun, best: run.best };
}
