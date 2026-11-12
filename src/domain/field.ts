// Trial 3 (The Wisp Field): five stars the wisp collected, one or two of them fake. The fakes shine
// brighter from the start. The child looks at one star at a time, decides "real" or "fake", and keeps
// only the real stars they sorted themselves. Rules only: no text, no layout.
// See .kiro/specs/06-trial-verify-stars/design.md.

import type { FieldEvent } from "./events";

/** The wisp brings five stars every round. */
export const starCount = 5;

/** A run (the whole trial) is this many rounds. Keeping the last one clears the trial. */
export const roundsPerRun = 2;

/** Rounds before the sets start again. A whole number of runs, so a run never straddles the wrap. */
export const roundCount = 4;

/** What the child decides about a star. */
export type Verdict = "real" | "fake";

/**
 * The verdict the child gave to the star they were looking at, and the star. Whether it was right is
 * not stored: `noteWasRight` derives it from the round, so a note can never disagree with the stars.
 */
export type Note = { star: number; said: Verdict };

/**
 * `sorting`: `sorted[i]` is true once the child gave star `i` the right verdict (a wrong verdict
 * sorts nothing). `looking` is the star in the lens, `note` the last verdict. `kept` is a round that
 * is finished with more to come; `cleared` is the last round of the run, kept: the trial is done.
 * Which stars are fake is not stored; `fakesOf` derives it from `seed` and `round`.
 */
export type Field =
  | {
      stage: "sorting";
      seed: number;
      round: number;
      sorted: readonly boolean[];
      looking: number | null;
      note: Note | null;
    }
  | { stage: "kept"; seed: number; round: number }
  | { stage: "cleared"; seed: number; round: number };

/** What the child's sorting has settled about a star. */
export type StarMark = "unsorted" | "real" | "fake";

/** How a star shines. A fake star always shines brighter, in every stage (the clue is never hidden). */
export type Shine = "normal" | "bright";

export const initialField: Field = {
  stage: "sorting",
  seed: 0,
  round: 0,
  sorted: [false, false, false, false, false],
  looking: null,
  note: null,
};

const pickAfter = (state: number): number => (Math.imul(state, 1664525) + 1013904223) >>> 0;

/**
 * The fake stars of a round, ascending: one in the first round of a run and two in the second, so
 * the sets of neighbouring rounds always differ in size (the wrap included). Which stars they are
 * comes from `seed` and `round` only: the same seed always gives the same four rounds (ADR 0001).
 */
export function fakesOf(seed: number, round: number): readonly number[] {
  const count = 1 + (round % roundsPerRun);
  let state = pickAfter(pickAfter((Math.imul(seed >>> 0, 2654435761) + (round + 1) * 40503) >>> 0));
  const pool = Array.from({ length: starCount }, (_, i) => i);
  const fakes: number[] = [];
  for (let k = 0; k < count; k += 1) {
    state = pickAfter(state);
    fakes.push(pool.splice((state >>> 16) % pool.length, 1)[0]!);
  }
  return fakes.sort((a, b) => a - b);
}

export function isFake(field: Field, index: number): boolean {
  return fakesOf(field.seed, field.round).includes(index);
}

/** The clue. It depends on the round only: it is the same before a tap, while looking and after sorting. */
export function shineOf(field: Field, index: number): Shine {
  return isFake(field, index) ? "bright" : "normal";
}

function isStar(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < starCount;
}

/** Unsorted until the child sorts the star rightly; then what it is. A finished round has no unsorted star. */
export function markOf(field: Field, index: number): StarMark {
  if (field.stage === "sorting" && !field.sorted[index]) return "unsorted";
  return isFake(field, index) ? "fake" : "real";
}

/** The last verdict was right: it is the verdict the star's truth gives. */
export function noteWasRight(field: Field, note: Note): boolean {
  return (note.said === "fake") === isFake(field, note.star);
}

/** All five are sorted and not kept yet, so the child may keep the real ones. */
export function isReady(field: Field): boolean {
  return field.stage === "sorting" && field.sorted.every(Boolean);
}

/** The stars the keep accepted: the real stars of the round. None before the keep. */
export function keptStars(field: Field): number[] {
  if (field.stage === "sorting") return [];
  return Array.from({ length: starCount }, (_, i) => i).filter((i) => !isFake(field, i));
}

/** Keeping the last round of a run clears the trial. */
export function isLastRound(round: number): boolean {
  return round % roundsPerRun === roundsPerRun - 1;
}

/** Returns `field` itself when the event changes nothing. Leaving the field is the reducer's. */
export function reduceField(field: Field, event: FieldEvent): Field {
  switch (event.type) {
    case "InspectStar":
      return inspect(field, event.index);
    case "SortStar":
      return sort(field, event.verdict);
    case "KeepStars":
      return isReady(field) ? keep(field) : field;
    case "RetryField":
      return field.stage === "sorting" ? field : next(field);
  }
}

/** The keep: the round is finished, and the trial is cleared when it was the last round of the run. */
function keep(field: Field): Field {
  const { seed, round } = field;
  return { stage: isLastRound(round) ? "cleared" : "kept", seed, round };
}

/** A fresh round: nothing sorted, nothing looked at. */
function next(field: Field): Field {
  return { ...initialField, seed: field.seed, round: (field.round + 1) % roundCount };
}

/** Puts one unsorted star in the lens. Anything else changes nothing. */
function inspect(field: Field, index: number): Field {
  if (field.stage !== "sorting" || !isStar(index) || field.sorted[index]) return field;
  if (field.looking === index) return field;
  return { ...field, looking: index, note: null };
}

/**
 * The child's verdict on the star in the lens. A right verdict sorts exactly that star; a wrong one
 * sorts nothing, closes the lens and leaves a note, so the child looks again. Nothing is corrected
 * for the child. With no star in the lens there is nothing to decide.
 */
function sort(field: Field, verdict: Verdict): Field {
  if (field.stage !== "sorting" || field.looking === null) return field;
  const star = field.looking;
  const right = (verdict === "fake") === isFake(field, star);
  return {
    ...field,
    sorted: right ? field.sorted.map((done, i) => done || i === star) : field.sorted,
    looking: null,
    note: { star, said: verdict },
  };
}
