import { describe, expect, it } from "vite-plus/test";
import {
  bagRounds,
  givenItems,
  handOver,
  initialBag,
  isDone,
  isSecret,
  isSecretAt,
  itemAt,
  itemCount,
  itemsOf,
  newBag,
  reduceBag,
  safeItems,
  secretItems,
  type Bag,
} from "../bag";
import type { BagEvent } from "../events";

// Trial 4 (spec 07-trial-keep-secrets): the rules of the bag, on their own.

const give = (index: number): BagEvent => ({ type: "GiveItem", index });
const retry: BagEvent = { type: "RetryBag" };
const places = [0, 1, 2, 3, 4];

const run = (events: BagEvent[], from: Bag = initialBag) => events.reduce(reduceBag, from);
const safePlaces = (bag: Bag) => places.filter((i) => !isSecretAt(bag, i));
const secretPlaces = (bag: Bag) => places.filter((i) => isSecretAt(bag, i));
/** Hands over every safe thing of the round, in place order. */
const giveAllSafe = (bag: Bag) => run(safePlaces(bag).map(give), bag);
const table = (seed: number) => [0, 1, 2, 3].map((r) => itemsOf(seed, r).join(" "));
const allItems: readonly string[] = [...safeItems, ...secretItems];

describe("the round table: seed and round give the things (REQ-7.5.1)", () => {
  it("pins the first four rounds of seeds 0 to 3, so the same seed always gives the same things", () => {
    expect(table(0)).toEqual([
      "candy address acorn flower leaf",
      "candy password address flower acorn",
      "password flower leaf candy acorn",
      "acorn leaf password key candy",
    ]);
    expect(table(1)).toEqual([
      "leaf key flower candy acorn",
      "key leaf flower password acorn",
      "candy leaf acorn key flower",
      "acorn flower key password leaf",
    ]);
    expect(table(2)).toEqual([
      "address flower acorn candy leaf",
      "flower candy key acorn address",
      "acorn flower address leaf candy",
      "candy flower address leaf password",
    ]);
    expect(table(3)).toEqual([
      "flower candy leaf acorn password",
      "leaf acorn candy key password",
      "flower acorn leaf candy password",
      "address leaf flower acorn password",
    ]);
  });

  it("gives five things, no thing twice, one secret in the even rounds and two in the odd ones", () => {
    for (let seed = 0; seed < 300; seed += 1) {
      for (let round = 0; round < bagRounds; round += 1) {
        const items = itemsOf(seed, round);
        expect(items).toHaveLength(itemCount);
        expect(new Set(items).size).toBe(itemCount);
        expect(items.filter(isSecret)).toHaveLength(1 + (round % 2));
        expect(items.every((i) => allItems.includes(i))).toBe(true);
      }
    }
  });

  it("is the same on every call, differs between seeds, and depends on the round", () => {
    expect(itemsOf(12345, 2)).toEqual(itemsOf(12345, 2));
    const firsts = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) firsts.add(itemsOf(seed, 0).join());
    expect(firsts.size).toBeGreaterThan(20);
    expect(itemsOf(7, 0)).not.toEqual(itemsOf(7, 2));
  });

  it("puts a secret in every place and brings every thing, over many seeds", () => {
    const secretAt = places.map(() => 0);
    const seen = new Map<string, number>();
    for (let seed = 0; seed < 400; seed += 1) {
      for (let round = 0; round < bagRounds; round += 1) {
        itemsOf(seed, round).forEach((item, i) => {
          if (isSecret(item)) secretAt[i]! += 1;
          seen.set(item, (seen.get(item) ?? 0) + 1);
        });
      }
    }
    // 400 seeds x 4 rounds x 1.5 secrets / 5 places is 480 a place; each place is close to it.
    for (const count of secretAt) expect(count).toBeGreaterThan(400);
    for (const item of [...safeItems, ...secretItems]) expect(seen.get(item)).toBeGreaterThan(600);
  });

  it("reads a negative or fractional seed as a whole number, so a stray seed still plays the same", () => {
    expect(itemsOf(-1, 0)).toEqual(itemsOf(2 ** 32 - 1, 0));
    expect(itemsOf(3.7, 1)).toEqual(itemsOf(3, 1));
    expect(newBag(-1)).toEqual({ ...initialBag, seed: 2 ** 32 - 1 });
    expect(newBag(5.5).seed).toBe(5);
  });

  it("names the three secrets and the four safe things", () => {
    expect(secretItems).toEqual(["key", "address", "password"]);
    expect(safeItems).toEqual(["candy", "flower", "acorn", "leaf"]);
    for (const s of secretItems) expect(isSecret(s)).toBe(true);
    for (const s of safeItems) expect(isSecret(s)).toBe(false);
    expect(itemAt(initialBag, 1)).toBe("address");
    expect(isSecretAt(initialBag, 1)).toBe(true);
    expect(isSecretAt(initialBag, 0)).toBe(false);
  });
});

describe("handing things over (REQ-7.3, REQ-7.4)", () => {
  it("starts with nothing handed over and nothing tapped", () => {
    expect(initialBag).toEqual({
      stage: "giving",
      seed: 0,
      round: 0,
      given: [false, false, false, false, false],
      last: null,
    });
    expect(givenItems(initialBag)).toEqual([]);
    expect(isDone(initialBag)).toBe(false);
  });

  it("a safe thing is handed over: only that thing changes, and the tap is noted", () => {
    const after = run([give(0)]);
    expect(after).toEqual({ ...initialBag, given: [true, false, false, false, false], last: 0 });
    expect(givenItems(after)).toEqual([0]);
    expect(handOver(initialBag, 0)).toBe(true);
  });

  it("a secret is held back: nothing is handed over, only the tap is noted, and it can be tapped again", () => {
    expect(handOver(initialBag, 1)).toBe(false);
    const after = run([give(1)]);
    expect(after).toEqual({ ...initialBag, last: 1 });
    expect(givenItems(after)).toEqual([]);
    const again = run([give(1), give(1), give(1)]);
    expect(again).toEqual({ ...initialBag, last: 1 });
    expect(handOver(again, 1)).toBe(false);
  });

  it("holds back every secret of every round, whatever was tapped before", () => {
    for (let round = 0; round < bagRounds; round += 1) {
      const bag: Bag = { ...initialBag, seed: 1, round };
      for (const i of secretPlaces(bag)) {
        const after = run([...safePlaces(bag).slice(0, 2).map(give), give(i)], bag);
        expect(after.stage).toBe("giving");
        expect(after.stage === "giving" && after.given[i]).toBe(false);
        expect(after.stage === "giving" && after.last).toBe(i);
      }
    }
  });

  it("a thing already handed over, or an index that is not a thing, changes nothing", () => {
    const once = run([give(0)]);
    expect(reduceBag(once, give(0))).toBe(once);
    expect(handOver(once, 0)).toBeNull();
    for (const bad of [-1, 5, 0.5, Number.NaN, Infinity]) {
      expect(reduceBag(initialBag, give(bad))).toBe(initialBag);
      expect(handOver(initialBag, bad)).toBeNull();
    }
  });

  it("the order does not matter: any order of the safe things ends the round the same way", () => {
    const bag: Bag = { ...initialBag, seed: 2, round: 1 };
    const order = safePlaces(bag);
    const backwards = order.map((_, k) => order[order.length - 1 - k]!);
    expect(backwards).not.toEqual(order);
    expect(run(order.map(give), bag)).toEqual(run(backwards.map(give), bag));
  });
});

describe("a done round, and the next (REQ-7.5)", () => {
  it("the last safe thing finishes the round at once; the one before it does not", () => {
    const safe = safePlaces(initialBag);
    expect(safe).toEqual([0, 2, 3, 4]);
    const almost = run(safe.slice(0, 3).map(give));
    expect(almost.stage).toBe("giving");
    expect(handOver(almost, 4)).toBe(true);
    const done = reduceBag(almost, give(4));
    expect(done).toEqual({ stage: "done", seed: 0, round: 0 });
    expect(isDone(done)).toBe(true);
    expect(givenItems(done)).toEqual(safe);
  });

  it("a secret is never what finishes a round, even when it is the only thing left", () => {
    const left = run([0, 2, 3].map(give));
    const tapped = reduceBag(left, give(1));
    expect(tapped.stage).toBe("giving");
    expect(givenItems(tapped)).toEqual([0, 2, 3]);
  });

  it("a done round has handed over exactly the safe things, in every round of a seed", () => {
    for (let round = 0; round < bagRounds; round += 1) {
      const bag: Bag = { ...initialBag, seed: 3, round };
      const done = giveAllSafe(bag);
      expect(done.stage).toBe("done");
      expect(givenItems(done)).toEqual(safePlaces(bag));
      expect(givenItems(done).some((i) => isSecretAt(done, i))).toBe(false);
    }
  });

  it("locks a done round: no tap changes it", () => {
    const done = giveAllSafe(initialBag);
    for (const i of [...places, 7]) {
      expect(reduceBag(done, give(i))).toBe(done);
      expect(handOver(done, i)).toBeNull();
    }
  });

  it("RetryBag before a done round changes nothing; after it, the next round starts fresh with the same seed", () => {
    expect(reduceBag(initialBag, retry)).toBe(initialBag);
    const tapped = run([give(0), give(1)]);
    expect(reduceBag(tapped, retry)).toBe(tapped);
    const next = reduceBag(giveAllSafe(newBag(9)), retry);
    expect(next).toEqual({ ...initialBag, seed: 9, round: 1 });
  });

  it("the rounds go on and the table wraps from the last round to the first", () => {
    let bag: Bag = newBag(4);
    const rounds: number[] = [];
    for (let k = 0; k < 6; k += 1) {
      rounds.push(bag.round);
      bag = reduceBag(giveAllSafe(bag), retry);
    }
    expect(rounds).toEqual([0, 1, 2, 3, 0, 1]);
    expect(bag.seed).toBe(4);
  });
});
