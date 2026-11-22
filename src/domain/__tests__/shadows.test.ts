import { describe, expect, it } from "vite-plus/test";
import type { ShadowsEvent } from "../events";
import {
  choiceOf,
  choiceRight,
  decisionRight,
  heardItem,
  initialShadows,
  isSecret,
  itemAt,
  itemOf,
  items,
  newShadows,
  reduceShadows,
  shadowsOutcome,
  type Choice,
  type ItemId,
  type Shadows,
} from "../shadows";

const deciding = (seed = 0, round = 0): Shadows => ({ stage: "deciding", seed, round });
const decided = (choice: Choice, seed = 0, round = 0): Shadows => ({
  stage: "decided",
  seed,
  round,
  choice,
});
const decide = (choice: Choice): ShadowsEvent => ({ type: "DecideItem", choice });
const next: ShadowsEvent = { type: "NextItem" };
const orderOf = (seed: number, rounds = 6) =>
  Array.from({ length: rounds }, (_, round) => itemAt(seed, round));

const secrets: ItemId[] = ["houseKey", "address", "password"];
const rest: ItemId[] = ["candy", "ball", "flower"];

describe("the items and which are secrets (REQ-7.5.1, INV-47)", () => {
  it("has six items: the house key, the address and the password, then the candy, the ball and the flower", () => {
    expect([...items]).toEqual([...secrets, ...rest]);
  });

  it("makes exactly the house key, the address and the password secrets", () => {
    for (const item of secrets) expect(isSecret(item), item).toBe(true);
    for (const item of rest) expect(isSecret(item), item).toBe(false);
  });

  it("makes keeping the right decision for a secret and giving the right decision for the rest", () => {
    for (const item of secrets) {
      expect(choiceRight(item, "keep"), item).toBe(true);
      expect(choiceRight(item, "give"), item).toBe(false);
    }
    for (const item of rest) {
      expect(choiceRight(item, "give"), item).toBe(true);
      expect(choiceRight(item, "keep"), item).toBe(false);
    }
  });
});

describe("itemAt, the order of the items (REQ-7.5, INV-46)", () => {
  it("seeds 0 to 3 pick the four orders, from their first item", () => {
    expect(orderOf(0)).toEqual(["houseKey", "candy", "ball", "address", "password", "flower"]);
    expect(orderOf(1)).toEqual(["ball", "address", "password", "candy", "houseKey", "flower"]);
    expect(orderOf(2)).toEqual(["password", "ball", "flower", "houseKey", "candy", "address"]);
    expect(orderOf(3)).toEqual(["candy", "flower", "address", "houseKey", "ball", "password"]);
  });

  it("starts at (seed div 4) modulo 6 inside the order of seed modulo 4", () => {
    expect(orderOf(4)).toEqual(["candy", "ball", "address", "password", "flower", "houseKey"]);
    expect(orderOf(9)).toEqual(["password", "candy", "houseKey", "flower", "ball", "address"]);
    expect(orderOf(23)).toEqual(["password", "candy", "flower", "address", "houseKey", "ball"]);
    expect(orderOf(24)).toEqual(orderOf(0));
    expect(orderOf(2 ** 32 - 1)).toEqual([
      "houseKey",
      "ball",
      "password",
      "candy",
      "flower",
      "address",
    ]);
  });

  it("goes round: round 6 is round 0 again, and the same seed always gives the same item", () => {
    for (const seed of [0, 1, 2, 3, 9, 23]) {
      expect(orderOf(seed, 12)).toEqual([...orderOf(seed), ...orderOf(seed)]);
      expect(itemAt(seed, 3)).toBe(itemAt(seed, 3));
    }
  });

  it("shows all six items in every six rounds and never the same one twice in a row", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      for (let from = 0; from < 7; from += 1) {
        const six = Array.from({ length: 6 }, (_, i) => itemAt(seed, from + i));
        expect(new Set(six).size, `seed ${seed} from ${from}`).toBe(6);
        for (let i = 1; i < six.length; i += 1) expect(six[i]).not.toBe(six[i - 1]);
      }
    }
  });

  it("never runs a kind three times in a row, the wrap included, in any seed", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const kinds = Array.from({ length: 24 }, (_, round) => isSecret(itemAt(seed, round)));
      for (let i = 2; i < kinds.length; i += 1) {
        expect(kinds[i] === kinds[i - 1] && kinds[i] === kinds[i - 2], `seed ${seed} ${i}`).toBe(
          false,
        );
      }
    }
  });

  it("does not simply alternate the kinds, and the four orders place them differently", () => {
    const patterns = [0, 1, 2, 3].map((seed) =>
      orderOf(seed).map((i) => (isSecret(i) ? "S" : "G")),
    );
    expect(patterns.map((p) => p.join(""))).toEqual(["SGGSSG", "GSSGSG", "SGGSGS", "GGSSGS"]);
    for (const pattern of patterns) {
      expect(pattern.join("")).not.toMatch(/^(SG)+$|^(GS)+$/);
    }
  });

  it("reads the item of a state from its seed and round", () => {
    expect(itemOf(deciding(1, 2))).toBe("password");
    expect(itemOf(decided("give", 3, 3))).toBe("houseKey");
  });
});

describe("the state of trial 4 (REQ-7.3)", () => {
  it("starts deciding, in round 0 of seed 0", () => {
    expect(initialShadows).toEqual({ stage: "deciding", seed: 0, round: 0 });
  });

  it("opens round 0 of a seed that is a whole number", () => {
    expect(newShadows(5)).toEqual({ stage: "deciding", seed: 5, round: 0 });
    expect(newShadows(-1)).toEqual({ stage: "deciding", seed: 2 ** 32 - 1, round: 0 });
    expect(newShadows(2.9)).toEqual({ stage: "deciding", seed: 2, round: 0 });
  });
});

describe("reduceShadows (REQ-7.3, INV-48, INV-50)", () => {
  it("DecideItem records exactly the choice that was pressed, and nothing else changes", () => {
    const start = deciding(7, 4);
    expect(reduceShadows(start, decide("give"))).toEqual(decided("give", 7, 4));
    expect(reduceShadows(start, decide("keep"))).toEqual(decided("keep", 7, 4));
  });

  it("a second DecideItem returns the same state: a decision is made once and never changed", () => {
    for (const first of ["give", "keep"] as const) {
      for (const second of ["give", "keep"] as const) {
        const state = decided(first);
        expect(reduceShadows(state, decide(second))).toBe(state);
      }
    }
  });

  it("NextItem before a decision returns the same state", () => {
    const state = deciding(3, 2);
    expect(reduceShadows(state, next)).toBe(state);
  });

  it("NextItem after a decision starts the next round: round + 1, deciding, the same seed", () => {
    expect(reduceShadows(decided("keep", 9, 2), next)).toEqual(deciding(9, 3));
    expect(reduceShadows(decided("give", 9, 5), next)).toEqual(deciding(9, 6));
  });

  it("the round keeps growing past the six items; the item goes round", () => {
    const state = [decide("give"), next].reduce(reduceShadows, deciding(0, 5));
    expect(state).toEqual(deciding(0, 6));
    expect(itemOf(state)).toBe(itemAt(0, 0));
  });
});

describe("the result of a decision (REQ-7.3.3, REQ-7.3.7)", () => {
  it("is deciding until a decision is made", () => {
    expect(shadowsOutcome(deciding())).toBe("deciding");
  });

  it("is right when a secret is kept and when a thing that is fine to give is given", () => {
    for (const seed of [0, 1, 2, 3]) {
      for (let round = 0; round < 6; round += 1) {
        const state = deciding(seed, round);
        const choice = isSecret(itemOf(state)) ? "keep" : "give";
        expect(shadowsOutcome(reduceShadows(state, decide(choice))), `${seed} ${round}`).toBe(
          "right",
        );
      }
    }
  });

  it("is wrong when a secret is given and when a thing that is fine to give is kept", () => {
    for (const seed of [0, 1, 2, 3]) {
      for (let round = 0; round < 6; round += 1) {
        const state = deciding(seed, round);
        const choice = isSecret(itemOf(state)) ? "give" : "keep";
        expect(shadowsOutcome(reduceShadows(state, decide(choice))), `${seed} ${round}`).toBe(
          "wrong",
        );
      }
    }
  });

  it("grades a choice before it is made, and gives nothing once decided", () => {
    expect(decisionRight(deciding(0, 0), "keep")).toBe(true);
    expect(decisionRight(deciding(0, 0), "give")).toBe(false);
    expect(decisionRight(deciding(0, 1), "give")).toBe(true);
    expect(decisionRight(deciding(0, 1), "keep")).toBe(false);
    expect(decisionRight(decided("keep"), "keep")).toBeNull();
    expect(decisionRight(decided("give"), "give")).toBeNull();
  });

  it("the choice is the one pressed, and none before a decision", () => {
    expect(choiceOf(deciding(0, 0))).toBeNull();
    expect(choiceOf(decided("give"))).toBe("give");
    expect(choiceOf(decided("keep"))).toBe("keep");
  });

  it("the shadow hears the item only when it was given", () => {
    expect(heardItem(deciding(0, 0))).toBeNull();
    expect(heardItem(decided("keep", 0, 0))).toBeNull();
    expect(heardItem(decided("give", 0, 0))).toBe("houseKey");
    expect(heardItem(decided("give", 0, 1))).toBe("candy");
  });
});
