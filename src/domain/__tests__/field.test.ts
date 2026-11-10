import { describe, expect, it } from "vite-plus/test";
import type { FieldEvent } from "../events";
import {
  fakesOf,
  fieldOutcome,
  initialField,
  isFake,
  keptStars,
  markOf,
  reduceField,
  rounds,
  starCount,
  type Field,
  type StarMark,
} from "../field";

const check = (index: number): FieldEvent => ({ type: "CheckStar", index });
const keep: FieldEvent = { type: "KeepStars" };
const retry: FieldEvent = { type: "RetryField" };
const play = (events: FieldEvent[], from: Field = initialField) => events.reduce(reduceField, from);
const all = [0, 1, 2, 3, 4];
const checkAll = (from: Field = initialField) => play(all.map(check), from);
const kept = (from: Field = initialField) => play([keep], checkAll(from));
/** A field `from` the start of round `n`: the retry after a kept result, n times. */
const roundOf = (n: number): Field => {
  let field: Field = initialField;
  for (let i = 0; i < n; i += 1) field = play([retry], kept(field));
  return field;
};

describe("the rounds (REQ-6.4.1, INV-26)", () => {
  it("has five stars and four rounds, the fake stars written out", () => {
    expect(starCount).toBe(5);
    expect(rounds).toEqual([[3], [0, 2], [4], [1, 3]]);
  });

  it("gives every round 1 or 2 fake stars, all among the five", () => {
    for (const fakes of rounds) {
      expect(fakes.length).toBeGreaterThanOrEqual(1);
      expect(fakes.length).toBeLessThanOrEqual(2);
      expect(new Set(fakes).size).toBe(fakes.length);
      for (const star of fakes) expect(all).toContain(star);
    }
  });

  it("never repeats the set of the round before it, the last and the first included", () => {
    rounds.forEach((fakes, i) => {
      const next = rounds[(i + 1) % rounds.length]!;
      expect(next).not.toEqual(fakes);
    });
  });

  it("starts at round 0 with nothing checked and no star last", () => {
    expect(initialField).toEqual({
      stage: "checking",
      round: 0,
      checked: [false, false, false, false, false],
      last: null,
    });
  });

  it("fakesOf and isFake read the table", () => {
    expect(fakesOf(0)).toEqual([3]);
    expect(fakesOf(1)).toEqual([0, 2]);
    expect(fakesOf(3)).toEqual([1, 3]);
    expect(isFake(0, 3)).toBe(true);
    expect(isFake(0, 2)).toBe(false);
    expect(isFake(1, 0)).toBe(true);
    expect(isFake(1, 1)).toBe(false);
  });
});

describe("markOf (REQ-6.3.2)", () => {
  it("is unchecked for every star until the child checks it", () => {
    for (const i of all) expect(markOf(initialField, i)).toBe("unchecked");
  });

  it("shows a checked star as real or fake, as the round says", () => {
    const field = play([check(0), check(3)]);
    expect(markOf(field, 0)).toBe("real");
    expect(markOf(field, 3)).toBe("fake");
    expect(markOf(field, 1)).toBe("unchecked");
    expect(markOf(field, 4)).toBe("unchecked");
  });

  it("follows the round, not the star number", () => {
    const second = roundOf(1);
    const field = play([check(0), check(3)], second);
    expect(markOf(field, 0)).toBe("fake");
    expect(markOf(field, 3)).toBe("real");
  });

  it("knows every star once the field is kept", () => {
    const done = kept();
    const marks = all.map((i) => markOf(done, i));
    expect(marks).toEqual<StarMark[]>(["real", "real", "real", "fake", "real"]);
  });
});

describe("checking a star (REQ-6.3, INV-25)", () => {
  it("checks exactly that star and records it as the last one checked", () => {
    const field = play([check(2)]);
    expect(field).toEqual({
      stage: "checking",
      round: 0,
      checked: [false, false, true, false, false],
      last: 2,
    });
  });

  it("checks the stars in any order, and the last is the one checked last", () => {
    const field = play([check(4), check(0), check(3)]);
    expect(field).toMatchObject({ checked: [true, false, false, true, true], last: 3 });
    expect(markOf(field, 4)).toBe("real");
    expect(markOf(field, 3)).toBe("fake");
  });

  it("a second tap on a checked star returns the same field", () => {
    const field = play([check(1), check(3)]);
    expect(reduceField(field, check(1))).toBe(field);
    expect(reduceField(field, check(3))).toBe(field);
  });

  it("an index that is not a star returns the same field", () => {
    for (const index of [-1, 5, 6, 1.5, Number.NaN, Infinity, -Infinity]) {
      expect(reduceField(initialField, check(index))).toBe(initialField);
    }
  });

  it("the first and the last star exist", () => {
    expect(reduceField(initialField, check(0))).not.toBe(initialField);
    expect(reduceField(initialField, check(4))).not.toBe(initialField);
  });

  it("never changes the field it was given", () => {
    const before = structuredClone(initialField);
    reduceField(initialField, check(1));
    expect(initialField).toEqual(before);
  });

  it("checking is not keeping: five checks leave the field in checking", () => {
    const field = checkAll();
    expect(field.stage).toBe("checking");
    expect(keptStars(field)).toEqual([]);
  });
});

describe("fieldOutcome (REQ-6.5.1)", () => {
  it("is checking until all five are checked, ready then, and kept after the keep", () => {
    expect(fieldOutcome(initialField)).toBe("checking");
    expect(fieldOutcome(play([0, 1, 2, 3].map(check)))).toBe("checking");
    expect(fieldOutcome(play([1, 2, 3, 4].map(check)))).toBe("checking");
    expect(fieldOutcome(checkAll())).toBe("ready");
    expect(fieldOutcome(kept())).toBe("kept");
  });
});

describe("keeping (REQ-6.5, INV-27, INV-28)", () => {
  it("returns the same field while any star is unchecked", () => {
    expect(reduceField(initialField, keep)).toBe(initialField);
    for (const missing of all) {
      const almost = play(all.filter((i) => i !== missing).map(check));
      expect(reduceField(almost, keep)).toBe(almost);
    }
  });

  it("keeps when all five are checked, and keeps the round", () => {
    expect(kept()).toEqual({ stage: "kept", round: 0 });
    expect(kept(roundOf(2))).toEqual({ stage: "kept", round: 2 });
  });

  it("keeps exactly the real stars, never a fake one, in every round", () => {
    rounds.forEach((fakes, round) => {
      const done = kept(roundOf(round));
      const stars = keptStars(done);
      expect(stars.length).toBe(starCount - fakes.length);
      for (const star of stars) expect(fakes).not.toContain(star);
      expect([...stars, ...fakes].sort((a, b) => a - b)).toEqual(all);
    });
  });

  it("names the kept stars of round 0 and round 1", () => {
    expect(keptStars(kept())).toEqual([0, 1, 2, 4]);
    expect(keptStars(kept(roundOf(1)))).toEqual([1, 3, 4]);
  });

  it("keeps nothing before the keep", () => {
    expect(keptStars(initialField)).toEqual([]);
    expect(keptStars(checkAll())).toEqual([]);
  });

  it("is reached only by the keep: no check sequence gets there", () => {
    expect(rounds.map((_, r) => checkAll(roundOf(r)).stage)).toEqual(rounds.map(() => "checking"));
  });
});

describe("after the keep (REQ-6.5.4, INV-29)", () => {
  it("the result stays: a check, a keep or a second keep return the same field", () => {
    const done = kept();
    for (const event of [...all.map(check), keep, check(-1)]) {
      expect(reduceField(done, event)).toBe(done);
    }
  });
});

describe("the next round (REQ-6.7, INV-30)", () => {
  it("a retry after the keep starts the next round with nothing checked", () => {
    const next = reduceField(kept(), retry);
    expect(next).toEqual({
      stage: "checking",
      round: 1,
      checked: [false, false, false, false, false],
      last: null,
    });
  });

  it("goes round the whole table and starts again at the first round", () => {
    const seen: number[] = [];
    let field: Field = initialField;
    for (let i = 0; i < 2 * rounds.length + 1; i += 1) {
      seen.push(field.round);
      field = reduceField(kept(field), retry);
    }
    expect(seen).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 0]);
  });

  it("a retry before the keep returns the same field, whatever is checked", () => {
    expect(reduceField(initialField, retry)).toBe(initialField);
    const some = play([check(0), check(3)]);
    expect(reduceField(some, retry)).toBe(some);
    const ready = checkAll();
    expect(reduceField(ready, retry)).toBe(ready);
  });

  it("the next round can be played again, with its own fake stars", () => {
    const second = roundOf(1);
    const done = kept(second);
    expect(keptStars(done)).toEqual([1, 3, 4]);
    expect(kept(roundOf(3))).toEqual({ stage: "kept", round: 3 });
  });
});
