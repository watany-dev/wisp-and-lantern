// Trial 3 (The Wisp Field): five stars the wisp collected, some of them fake. The child checks them one at
// a time and keeps only the real ones they checked. Rules only: no text, no layout.
// See .kiro/specs/06-trial-verify-stars/design.md.

import type { FieldEvent } from "./events";

/** The wisp brings five stars every round. */
export const starCount = 5;

/**
 * The fake stars of each round, by star number (0, 1, 2 are the top row from the left, 3 and 4 the
 * bottom row). Every round has 1 or 2 fakes and no two neighbors are alike, the last and the first
 * included. A fixed table: the same rounds in the same order, no randomness (ADR 0001).
 */
export const rounds: readonly (readonly number[])[] = [[3], [0, 2], [4], [1, 3]];

/**
 * `checking` holds which stars the child checked and which one last. `kept` holds only the round: it is
 * reached with all five checked, so every mark is known. Which stars are fake is not stored; `fakesOf`
 * derives it from `round`, so a mark can never disagree with the round.
 */
export type Field =
  | { stage: "checking"; round: number; checked: readonly boolean[]; last: number | null }
  | { stage: "kept"; round: number };

/** What the child knows about a star. */
export type StarMark = "unchecked" | "real" | "fake";

export type FieldOutcome = "checking" | "ready" | "kept";

export const initialField: Field = {
  stage: "checking",
  round: 0,
  checked: [false, false, false, false, false],
  last: null,
};

export function fakesOf(round: number): readonly number[] {
  return rounds[round]!;
}

export function isFake(round: number, index: number): boolean {
  return fakesOf(round).includes(index);
}

function isStar(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < starCount;
}

/** Unchecked until the child checks the star; then what it is. After the keep every star is known. */
export function markOf(field: Field, index: number): StarMark {
  if (field.stage === "checking" && !field.checked[index]) return "unchecked";
  return isFake(field.round, index) ? "fake" : "real";
}

/** `ready`: all five are checked and not kept yet, so the child may keep the real ones. */
export function fieldOutcome(field: Field): FieldOutcome {
  if (field.stage === "kept") return "kept";
  return field.checked.every(Boolean) ? "ready" : "checking";
}

/** The stars the keep accepted: the real stars of the round. None before the keep. */
export function keptStars(field: Field): number[] {
  if (field.stage !== "kept") return [];
  return Array.from({ length: starCount }, (_, i) => i).filter((i) => !isFake(field.round, i));
}

/** Returns `field` itself when the event changes nothing. */
export function reduceField(field: Field, event: FieldEvent): Field {
  switch (event.type) {
    case "CheckStar":
      return checkStar(field, event.index);
    case "KeepStars":
      return fieldOutcome(field) === "ready" ? { stage: "kept", round: field.round } : field;
    case "RetryField":
      return field.stage === "kept"
        ? { ...initialField, round: (field.round + 1) % rounds.length }
        : field;
  }
}

/** Checks one star that exists and is not checked yet; anything else changes nothing. */
function checkStar(field: Field, index: number): Field {
  if (field.stage !== "checking" || !isStar(index) || field.checked[index]) return field;
  return {
    ...field,
    checked: field.checked.map((done, i) => done || i === index),
    last: index,
  };
}
