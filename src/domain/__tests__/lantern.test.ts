import { describe, expect, it } from "vite-plus/test";
import type { LanternEvent } from "../events";
import {
  broughtAt,
  cardsOf,
  faultAt,
  fixRight,
  flickerOf,
  initialLantern,
  looksOf,
  newLantern,
  parts,
  reduceLantern,
  shapeOf,
  wishAt,
  wishOf,
  type Lantern,
  type LookId,
  type PartId,
  type Shape,
} from "../lantern";

const tap = (part: PartId): LanternEvent => ({ type: "TapPart", part });
const fix = (look: LookId): LanternEvent => ({ type: "FixPart", look });
const next: LanternEvent = { type: "NextLantern" };
const looking = (seed = 0, round = 0, shape: Shape = broughtAt(seed, round)): Lantern => ({
  stage: "looking",
  seed,
  round,
  shape,
  note: null,
});
const pointing = (seed = 0, round = 0): Lantern => ({
  stage: "pointing",
  seed,
  round,
  shape: broughtAt(seed, round),
  part: faultAt(seed, round),
});
const lit = (seed = 0, round = 0): Lantern => ({ stage: "lit", seed, round });
const wishes = (seed: number, rounds = 6) =>
  Array.from({ length: rounds }, (_, round) => {
    const w = wishAt(seed, round);
    return `${w.handle} ${w.roof} ${w.light}`;
  });
/** What the wisp brings for the fault part, round by round, as "part=look". */
const faults = (seed: number, rounds = 6) =>
  Array.from({ length: rounds }, (_, round) => {
    const part = faultAt(seed, round);
    return `${part}=${broughtAt(seed, round)[part]}`;
  });
/** Which side the right card is on, round by round: L or R. */
const sides = (seed: number, rounds = 6) =>
  Array.from({ length: rounds }, (_, round) => {
    const [first] = cardsOf(pointing(seed, round));
    return first === wishAt(seed, round)[faultAt(seed, round)] ? "L" : "R";
  }).join("");
const differing = (a: Shape, b: Shape) => parts.filter((p) => a[p] !== b[p]);

describe("the parts and their looks (REQ-8.8.1)", () => {
  it("has three parts from the top, the handle, the roof and the light, with three looks each", () => {
    expect([...parts]).toEqual(["handle", "roof", "light"]);
    expect(looksOf).toEqual({
      handle: ["ring", "bow", "bell"],
      roof: ["pointy", "round", "flat"],
      light: ["candle", "star", "moon"],
    });
  });

  it("gives every look its own id, so a look always names its part", () => {
    const all = parts.flatMap((p) => looksOf[p]);
    expect(new Set(all).size).toBe(9);
  });
});

describe("wishAt, faultAt and broughtAt: the rounds of a seed (REQ-8.8, INV-54)", () => {
  it("pins the wishes of seeds 0, 1, 2, 3, 27, 242 and 2^32 - 1 from their base-3 digits", () => {
    expect(wishes(0)).toEqual([
      "ring pointy candle",
      "bow flat star",
      "bell round moon",
      "ring pointy candle",
      "bow flat star",
      "bell round moon",
    ]);
    expect(wishes(1, 3)).toEqual(["bow pointy candle", "bell flat star", "ring round moon"]);
    expect(wishes(2, 2)).toEqual(["bell pointy candle", "ring flat star"]);
    expect(wishes(3, 2)).toEqual(["ring round candle", "bow pointy star"]);
    expect(wishes(27, 2)).toEqual(["ring pointy candle", "bow flat star"]);
    expect(wishes(242, 2)).toEqual(["bell flat moon", "ring round candle"]);
    expect(wishes(2 ** 32 - 1, 3)).toEqual([
      "ring round moon",
      "bow pointy candle",
      "bell flat star",
    ]);
  });

  it("pins the part the wisp brings differently, and how, for seeds 0, 27, 81, 242, 243 and 2^32 - 1", () => {
    expect(faults(0)).toEqual([
      "handle=bell",
      "roof=pointy",
      "light=candle",
      "handle=bell",
      "roof=round",
      "light=candle",
    ]);
    expect(faults(27, 3)).toEqual(["roof=flat", "light=moon", "handle=ring"]);
    expect(faults(81, 3)).toEqual(["handle=bow", "roof=round", "light=star"]);
    expect(faults(242, 3)).toEqual(["light=star", "handle=bow", "roof=round"]);
    expect(faults(243, 3)).toEqual(["handle=bow", "roof=pointy", "light=star"]);
    expect(faults(2 ** 32 - 1, 3)).toEqual(["roof=pointy", "light=star", "handle=ring"]);
  });
});

describe("the right card's side, and the rules for many seeds (REQ-8.8, INV-54)", () => {
  it("puts the right card on the sides of one of two cycles, LRRLLR and RLLRLR, from a start the seed picks", () => {
    expect(sides(0)).toBe("LRRLLR");
    expect(sides(81)).toBe("RLLRLR");
    expect(sides(242)).toBe("LRRLLR");
    expect(sides(243)).toBe("RRLLRL");
    expect(sides(2 ** 32 - 1)).toBe("LRRLLR");
    expect(sides(0, 12)).toBe("LRRLLRLRRLLR");
  });

  it("brings a lantern that differs from the wish in exactly the fault part, for 100 seeds and 12 rounds", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      for (let round = 0; round < 12; round += 1) {
        const wish = wishAt(seed, round);
        const brought = broughtAt(seed, round);
        expect(differing(wish, brought), `${seed} ${round}`).toEqual([faultAt(seed, round)]);
        for (const part of parts) expect(looksOf[part]).toContain(brought[part]);
      }
    }
  });

  it("changes every part of the wish and moves the fault part every round, through all three in three rounds", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      for (let round = 0; round < 12; round += 1) {
        const [a, b] = [wishAt(seed, round), wishAt(seed, round + 1)];
        expect(differing(a, b), `${seed} ${round}`).toEqual([...parts]);
        const three = [0, 1, 2].map((i) => faultAt(seed, round + i));
        expect(new Set(three).size, `${seed} ${round}`).toBe(3);
      }
    }
  });

  it("puts the right card on both sides in every six rounds, never three in a row and not simply alternating", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const row = sides(seed, 24);
      expect(row, `${seed}`).not.toMatch(/LLL|RRR/);
      expect(row.slice(0, 6), `${seed}`).not.toMatch(/^(LR)+$|^(RL)+$/);
      for (let from = 0; from < 18; from += 1) {
        const six = row.slice(from, from + 6);
        expect(six, `${seed} ${from}`).toMatch(/L/);
        expect(six, `${seed} ${from}`).toMatch(/R/);
      }
    }
  });

  it("goes round every six rounds, and the same seed and round always give the same lantern", () => {
    for (const seed of [0, 5, 27, 242, 2 ** 32 - 1]) {
      for (let round = 0; round < 6; round += 1) {
        expect(broughtAt(seed, round + 6)).toEqual(broughtAt(seed, round));
        expect(wishAt(seed, round + 6)).toEqual(wishAt(seed, round));
        expect(broughtAt(seed, round)).toEqual(broughtAt(seed, round));
      }
    }
  });
});

describe("the state of trial 5 (REQ-8.3)", () => {
  it("starts looking at round 0 of seed 0, with nothing said", () => {
    expect(initialLantern).toEqual(looking(0, 0));
    expect(initialLantern).toEqual({
      stage: "looking",
      seed: 0,
      round: 0,
      shape: { handle: "bell", roof: "pointy", light: "candle" },
      note: null,
    });
  });

  it("opens round 0 of a seed that is a whole number", () => {
    expect(newLantern(5)).toEqual(looking(5, 0));
    expect(newLantern(-1)).toEqual(looking(2 ** 32 - 1, 0));
    expect(newLantern(2.9)).toEqual(looking(2, 0));
  });

  it("reads the wish and the lantern of a state: a lit lantern is the wish", () => {
    expect(wishOf(looking(3, 1))).toEqual(wishAt(3, 1));
    expect(shapeOf(looking(3, 1))).toEqual(broughtAt(3, 1));
    expect(shapeOf(pointing(3, 1))).toEqual(broughtAt(3, 1));
    expect(shapeOf(lit(3, 1))).toEqual(wishAt(3, 1));
  });

  it("flickers in the part that is not the wish's, and nowhere once lit", () => {
    expect(flickerOf(looking(0, 0))).toBe("handle");
    expect(flickerOf(looking(0, 1))).toBe("roof");
    expect(flickerOf(pointing(0, 2))).toBe("light");
    expect(flickerOf(lit(0, 0))).toBeNull();
  });
});

describe("pointing at a part (REQ-8.4, INV-56)", () => {
  it("a tap on the flickering part opens its cards and changes no look", () => {
    expect(reduceLantern(looking(0, 0), tap("handle"))).toEqual(pointing(0, 0));
    expect(reduceLantern(looking(0, 1), tap("roof"))).toEqual(pointing(0, 1));
  });

  it("a tap on a steady part notes that it is fine, and closes any cards", () => {
    for (const from of [looking(0, 0), pointing(0, 0)]) {
      for (const part of ["roof", "light"] as const) {
        expect(reduceLantern(from, tap(part))).toEqual({
          ...looking(0, 0),
          note: { kind: "fine", part },
        });
      }
    }
  });

  it("a second tap on the pointed part keeps it pointed", () => {
    expect(reduceLantern(pointing(0, 0), tap("handle"))).toEqual(pointing(0, 0));
  });

  it("a tap after a wrong card points at the part again, with the look the child said", () => {
    const said = reduceLantern(pointing(0, 0), fix("bow"));
    expect(reduceLantern(said, tap("handle"))).toEqual({
      ...pointing(0, 0),
      shape: { ...broughtAt(0, 0), handle: "bow" },
    });
  });

  it("does nothing once the lantern is lit", () => {
    for (const part of parts) {
      const state = lit(0, 0);
      expect(reduceLantern(state, tap(part))).toBe(state);
    }
  });
});

describe("the cards (REQ-8.5.1)", () => {
  it("are the two looks of the pointed part that it does not have, in the order that follows it", () => {
    // Round 0 of seed 0 brings a bell for the handle: the cards are the ring, then the bow.
    expect(cardsOf(pointing(0, 0))).toEqual(["ring", "bow"]);
    // Round 4 brings a round roof: flat, then pointy.
    expect(cardsOf(pointing(0, 4))).toEqual(["flat", "pointy"]);
    expect(cardsOf(pointing(0, 2))).toEqual(["star", "moon"]);
  });

  it("are none while looking or lit", () => {
    expect(cardsOf(looking(0, 0))).toEqual([]);
    expect(cardsOf(lit(0, 0))).toEqual([]);
  });
});

describe("fixing the part (REQ-8.5, REQ-8.6, INV-57)", () => {
  it("a right card lights the lantern", () => {
    expect(reduceLantern(pointing(0, 0), fix("ring"))).toEqual(lit(0, 0));
    expect(reduceLantern(pointing(0, 1), fix("flat"))).toEqual(lit(0, 1));
  });

  it("a wrong card changes exactly the pointed part to the look sent, and the part still flickers", () => {
    const after = reduceLantern(pointing(0, 0), fix("bow"));
    expect(after).toEqual({
      stage: "looking",
      seed: 0,
      round: 0,
      shape: { handle: "bow", roof: "pointy", light: "candle" },
      note: { kind: "said", look: "bow" },
    });
    expect(flickerOf(after)).toBe("handle");
  });

  it("after a wrong card, the right card is still there and still lights the lantern", () => {
    const after = [fix("bow"), tap("handle")].reduce(reduceLantern, pointing(0, 0));
    expect(cardsOf(after)).toEqual(["bell", "ring"]);
    expect(reduceLantern(after, fix("ring"))).toEqual(lit(0, 0));
  });

  it("a look that is not one of the two cards changes nothing: the look it has, or another part's look", () => {
    const state = pointing(0, 0);
    for (const look of ["bell", "pointy", "round", "moon"] as const) {
      expect(reduceLantern(state, fix(look)), look).toBe(state);
    }
  });

  it("a card while looking or lit changes nothing", () => {
    for (const state of [looking(0, 0), lit(0, 0)]) {
      for (const look of ["ring", "bow"] as const)
        expect(reduceLantern(state, fix(look))).toBe(state);
    }
  });

  it("grades a card before it is picked, and gives nothing when it is no card", () => {
    expect(fixRight(pointing(0, 0), "ring")).toBe(true);
    expect(fixRight(pointing(0, 0), "bow")).toBe(false);
    expect(fixRight(pointing(0, 0), "bell")).toBeNull();
    expect(fixRight(pointing(0, 0), "moon")).toBeNull();
    expect(fixRight(looking(0, 0), "ring")).toBeNull();
    expect(fixRight(lit(0, 0), "ring")).toBeNull();
  });

  it("the right card lights every round of four seeds, and the other card never does", () => {
    for (const seed of [0, 1, 81, 243]) {
      for (let round = 0; round < 6; round += 1) {
        const state = pointing(seed, round);
        const right = wishAt(seed, round)[faultAt(seed, round)];
        const [other] = cardsOf(state).filter((look) => look !== right);
        expect(reduceLantern(state, fix(right)), `${seed} ${round}`).toEqual(lit(seed, round));
        expect(reduceLantern(state, fix(other!)).stage, `${seed} ${round}`).toBe("looking");
      }
    }
  });
});

describe("the next lantern (REQ-8.6.3, INV-59)", () => {
  it("NextLantern before the lantern is lit changes nothing", () => {
    for (const state of [looking(0, 0), pointing(0, 0)])
      expect(reduceLantern(state, next)).toBe(state);
  });

  it("NextLantern once lit brings the next round: its brought lantern, nothing said, the same seed", () => {
    expect(reduceLantern(lit(9, 2), next)).toEqual(looking(9, 3));
    expect(reduceLantern(lit(9, 5), next)).toEqual(looking(9, 6));
  });
});
