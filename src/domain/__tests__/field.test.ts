import { describe, expect, it } from "vite-plus/test";
import {
  fakesOf,
  initialField,
  isFake,
  isLastRound,
  isReady,
  keptStars,
  markOf,
  noteWasRight,
  reduceField,
  roundCount,
  roundsPerRun,
  shineOf,
  starCount,
  type Field,
} from "../field";
import type { FieldEvent } from "../events";

// Trial 3 (spec 06-trial-verify-stars): the rules of the field, on their own.

const inspect = (index: number): FieldEvent => ({ type: "InspectStar", index });
const sortReal: FieldEvent = { type: "SortStar", verdict: "real" };
const sortFake: FieldEvent = { type: "SortStar", verdict: "fake" };
const keep: FieldEvent = { type: "KeepStars" };
const retry: FieldEvent = { type: "RetryField" };
const stars = [0, 1, 2, 3, 4];

const run = (events: FieldEvent[], from: Field = initialField) => events.reduce(reduceField, from);
const rightVerdict = (field: Field, i: number): FieldEvent =>
  isFake(field, i) ? sortFake : sortReal;
/** Looks at and rightly sorts the stars in `order`. */
const sortRight = (field: Field, order = stars) =>
  order.reduce((f, i) => run([inspect(i), rightVerdict(f, i)], f), field);
const ready = sortRight(initialField);

const sets = (seed: number) => [0, 1, 2, 3].map((r) => fakesOf(seed, r).join(""));

describe("the round table: seed and round give the fake stars (REQ-6.4.1)", () => {
  it("pins the first four rounds of seeds 0 to 3, so the same seed always gives the same stars", () => {
    expect(sets(0)).toEqual(["4", "14", "4", "03"]);
    expect(sets(1)).toEqual(["2", "13", "4", "14"]);
    expect(sets(2)).toEqual(["1", "12", "3", "13"]);
    expect(sets(3)).toEqual(["0", "01", "1", "12"]);
  });

  it("gives one fake star in the first round of a run and two in the second", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      for (let round = 0; round < roundCount; round += 1) {
        const fakes = fakesOf(seed, round);
        expect(fakes).toHaveLength(1 + (round % roundsPerRun));
        expect(new Set(fakes).size).toBe(fakes.length);
        expect(fakes.every((i) => Number.isInteger(i) && i >= 0 && i < starCount)).toBe(true);
        expect([...fakes].sort((a, b) => a - b)).toEqual(fakes);
      }
    }
  });

  it("is the same on every call and differs between seeds", () => {
    expect(fakesOf(12345, 2)).toEqual(fakesOf(12345, 2));
    const firsts = new Set<string>();
    for (let seed = 0; seed < 50; seed += 1) firsts.add(fakesOf(seed, 1).join());
    expect(firsts.size).toBeGreaterThan(3);
  });

  it("reaches every star as a fake over many seeds (no star is always real)", () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 100; seed += 1) fakesOf(seed, 0).forEach((i) => seen.add(i));
    expect([...seen].sort((a, b) => a - b)).toEqual(stars);
  });

  it("treats a negative or fractional seed like its whole-number form", () => {
    expect(fakesOf(-1, 0)).toEqual(fakesOf(4_294_967_295, 0));
    expect(fakesOf(1.9, 1)).toEqual(fakesOf(1, 1));
  });

  it("makes a run of whole rounds: the table is a whole number of runs", () => {
    expect(roundCount % roundsPerRun).toBe(0);
    expect(isLastRound(0)).toBe(false);
    expect(isLastRound(1)).toBe(true);
    expect(isLastRound(2)).toBe(false);
    expect(isLastRound(3)).toBe(true);
  });
});

describe("the clue: a fake star shines brighter, from the start (REQ-6.2.3)", () => {
  it("shineOf is bright for exactly the fake stars, before any tap", () => {
    const fakes = fakesOf(0, 0);
    expect(stars.filter((i) => shineOf(initialField, i) === "bright")).toEqual([...fakes]);
    expect(stars.filter((i) => shineOf(initialField, i) === "normal")).toHaveLength(4);
  });

  it("is the same while looking, after sorting and after the keep", () => {
    const looking = run([inspect(0)]);
    const keptField = run([keep], ready);
    for (const field of [initialField, looking, ready, keptField]) {
      expect(stars.map((i) => shineOf(field, i))).toEqual(
        stars.map((i) => shineOf(initialField, i)),
      );
    }
  });
});

describe("looking (REQ-6.3.1)", () => {
  it("InspectStar puts an unsorted star in the lens and clears the note", () => {
    const missed = run([inspect(0), sortFake]);
    expect(missed).toMatchObject({ looking: null, note: { star: 0, said: "fake" } });
    expect(run([inspect(2)], missed)).toMatchObject({ looking: 2, note: null });
  });

  it("switches the lens to another star and changes no mark", () => {
    const field = run([inspect(1), inspect(3)]);
    expect(field).toMatchObject({ looking: 3, sorted: [false, false, false, false, false] });
  });

  it("returns the same field for the star already in the lens, a sorted star, or a star that does not exist", () => {
    const looking = run([inspect(1)]);
    expect(reduceField(looking, inspect(1))).toBe(looking);
    const done = run([inspect(0), rightVerdict(initialField, 0)]);
    expect(reduceField(done, inspect(0))).toBe(done);
    for (const index of [-1, 5, 0.5, Number.NaN, Infinity]) {
      expect(reduceField(initialField, inspect(index))).toBe(initialField);
    }
  });
});

describe("the child's verdict (REQ-6.3.2 to REQ-6.3.5)", () => {
  it("a right verdict sorts exactly the star in the lens, and shows what it is", () => {
    const real = run([inspect(0), sortReal]);
    expect(real).toMatchObject({ sorted: [true, false, false, false, false], looking: null });
    expect(markOf(real, 0)).toBe("real");
    expect(markOf(real, 1)).toBe("unsorted");
    const fake = run([inspect(4), sortFake]);
    expect(markOf(fake, 4)).toBe("fake");
    expect(fake).toMatchObject({ note: { star: 4, said: "fake" } });
  });

  it("a wrong verdict sorts nothing, closes the lens and leaves a note", () => {
    const calledReal = run([inspect(4), sortReal]);
    expect(calledReal).toEqual({
      ...initialField,
      note: { star: 4, said: "real" },
    });
    expect(markOf(calledReal, 4)).toBe("unsorted");
    const calledFake = run([inspect(0), sortFake]);
    expect(calledFake).toEqual({ ...initialField, note: { star: 0, said: "fake" } });
  });

  it("noteWasRight says whether the verdict matched the star", () => {
    const right = run([inspect(4), sortFake]);
    const wrong = run([inspect(4), sortReal]);
    expect(noteWasRight(right, { star: 4, said: "fake" })).toBe(true);
    expect(noteWasRight(wrong, { star: 4, said: "real" })).toBe(false);
    expect(noteWasRight(right, { star: 0, said: "real" })).toBe(true);
    expect(noteWasRight(right, { star: 0, said: "fake" })).toBe(false);
  });

  it("after a wrong verdict the same star can be looked at and sorted again, without limit", () => {
    let field = initialField;
    for (let i = 0; i < 5; i += 1) field = run([inspect(4), sortReal], field);
    expect(field).toMatchObject({ sorted: [false, false, false, false, false], looking: null });
    const fixed = run([inspect(4), sortFake], field);
    expect(markOf(fixed, 4)).toBe("fake");
  });

  it("a verdict with no star in the lens changes nothing", () => {
    expect(reduceField(initialField, sortReal)).toBe(initialField);
    expect(reduceField(initialField, sortFake)).toBe(initialField);
  });

  it("stars can be sorted in any order with the same result", () => {
    const forward = sortRight(initialField, [0, 1, 2, 3, 4]);
    const backward = sortRight(initialField, [4, 3, 2, 1, 0]);
    expect(forward).toMatchObject({ sorted: [true, true, true, true, true] });
    expect(stars.map((i) => markOf(backward, i))).toEqual(stars.map((i) => markOf(forward, i)));
  });
});

describe("keeping (REQ-6.5)", () => {
  it("is not ready until all five are sorted", () => {
    expect(isReady(initialField)).toBe(false);
    expect(isReady(sortRight(initialField, [0, 1, 2, 3]))).toBe(false);
    expect(isReady(ready)).toBe(true);
  });

  it("KeepStars with any star unsorted returns the same field", () => {
    expect(reduceField(initialField, keep)).toBe(initialField);
    const almost = sortRight(initialField, [0, 1, 2, 3]);
    expect(reduceField(almost, keep)).toBe(almost);
  });

  it("KeepStars when all five are sorted accepts exactly the real stars", () => {
    const done = run([keep], ready);
    expect(done).toEqual({ stage: "kept", seed: 0, round: 0 });
    expect(keptStars(done)).toEqual([0, 1, 2, 3]);
    expect(keptStars(done).every((i) => !isFake(done, i))).toBe(true);
    expect(keptStars(initialField)).toEqual([]);
    expect(keptStars(ready)).toEqual([]);
  });

  it("every star of a finished round is known: real stars are real and fakes are fake", () => {
    const done = run([keep], ready);
    expect(stars.map((i) => markOf(done, i))).toEqual(["real", "real", "real", "real", "fake"]);
  });

  it("keeping the last round of a run clears the trial; keeping the first does not", () => {
    const second = run([keep, retry], ready);
    const secondReady = sortRight(second);
    expect(run([keep], secondReady)).toEqual({ stage: "cleared", seed: 0, round: 1 });
    expect(run([keep], ready).stage).toBe("kept");
    expect(keptStars(run([keep], secondReady))).toEqual([0, 2, 3]);
  });

  it("locks the field after the keep: only the retry changes it", () => {
    const done = run([keep], ready);
    for (const event of [inspect(0), sortReal, sortFake, keep]) {
      expect(reduceField(done, event)).toBe(done);
    }
  });
});

describe("the next round (REQ-6.7)", () => {
  it("RetryField after the keep starts the next round: nothing sorted, nothing looked at, same seed", () => {
    const done = run([keep], ready);
    expect(reduceField(done, retry)).toEqual({ ...initialField, round: 1 });
    const seeded = reduceField({ stage: "kept", seed: 9, round: 0 }, retry);
    expect(seeded).toEqual({ ...initialField, seed: 9, round: 1 });
  });

  it("RetryField after a cleared trial starts the next run, and the rounds wrap", () => {
    expect(reduceField({ stage: "cleared", seed: 0, round: 1 }, retry)).toMatchObject({
      round: 2,
    });
    expect(reduceField({ stage: "cleared", seed: 0, round: 3 }, retry)).toEqual(initialField);
  });

  it("RetryField while sorting returns the same field", () => {
    expect(reduceField(initialField, retry)).toBe(initialField);
    expect(reduceField(ready, retry)).toBe(ready);
  });
});
