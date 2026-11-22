import fc from "fast-check";
import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import {
  bagRounds,
  givenItems,
  initialBag,
  isSecret,
  isSecretAt,
  itemCount,
  itemsOf,
  type Bag,
} from "../bag";
import type { GameEvent } from "../events";
import { colors, things } from "../lane";
import { reduce } from "../reducer";
import { pointsFor } from "../run";
import { tools } from "../shed";
import { initialState, type GameState } from "../state";
import { checkProperty, deepFreeze } from "./support/pbt";

// Trial 4 (spec 07-trial-keep-secrets): property tests over the real reducer. The generator mixes the bag events
// with every other event, so the guards between the trials are exercised too.

const places = [0, 1, 2, 3, 4];
const lang = fc.constantFrom("ja" as const, "en" as const);
const card = fc.constantFrom(...colors, ...things);
const tool = fc.constantFrom(...tools);
const verdict = fc.constantFrom("real" as const, "fake" as const);
const seed = fc.oneof(fc.integer({ min: 0, max: 20 }), fc.integer({ min: -5, max: 2 ** 32 + 5 }));
// Mostly things that exist, and sometimes an index that does not (and a fraction, and NaN).
const index = fc.oneof(
  { weight: 8, arbitrary: fc.constantFrom(...places) },
  { weight: 2, arbitrary: fc.integer({ min: -3, max: 8 }) },
  { weight: 1, arbitrary: fc.constantFrom(0.5, Number.NaN, Infinity) },
);
const bagEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  { weight: 8, arbitrary: fc.record({ type: fc.constant("GiveItem" as const), index }) },
  { weight: 2, arbitrary: fc.record({ type: fc.constant("RetryBag" as const) }) },
);
const otherEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  // `lang` is either absent or a language: `{ lang: undefined }` is not a valid event.
  fc.record({ type: fc.constant("Start" as const), lang }, { requiredKeys: ["type"] }),
  fc.record({ type: fc.constant("SetLang" as const), lang }),
  fc.record({ type: fc.constant("MoveHeroTo" as const), x: fc.integer(), y: fc.integer() }),
  fc.record({ type: fc.constant("PickCard" as const), card }),
  fc.record({ type: fc.constant("Ask" as const) }),
  fc.record({ type: fc.constant("Retry" as const) }),
  fc.record({ type: fc.constant("PickTool" as const), tool }),
  fc.record({ type: fc.constant("GiveTool" as const) }),
  fc.record({ type: fc.constant("RetryShed" as const) }),
  fc.record({ type: fc.constant("StartShed" as const) }),
  fc.record({ type: fc.constant("LeaveShed" as const) }),
  fc.record({ type: fc.constant("InspectStar" as const), index }),
  fc.record({ type: fc.constant("SortStar" as const), verdict }),
  fc.record({ type: fc.constant("KeepStars" as const) }),
  fc.record({ type: fc.constant("RetryField" as const) }),
  fc.record({ type: fc.constant("StartField" as const), seed }),
  fc.record({ type: fc.constant("LeaveField" as const) }),
  fc.record({ type: fc.constant("StartBag" as const), seed }),
  fc.record({ type: fc.constant("LeaveBag" as const) }),
  // Short ticks, and a long one that ends a run.
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: -100, max: 2_000 }) }),
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: 0, max: 70_000 }) }),
);
const event = fc.oneof({ weight: 5, arbitrary: bagEvent }, { weight: 3, arbitrary: otherEvent });
const events = fc.array(event, { maxLength: 40 });
const enter = (s: number): GameEvent => ({ type: "StartBag", seed: s });
/** Opens the bag from the title first, so the bag events are not all ignored. */
const inBag = fc.tuple(seed, events).map(([s, list]): GameEvent[] => [enter(s), ...list]);
const ending = {
  next: () => [{ type: "RetryBag" }],
  leave: (again: number) => [{ type: "LeaveBag" }, enter(again)],
  end: (again: number) => [{ type: "Tick", ms: balance.runMs }, enter(again)],
  // Trial 1 from the bag's end screen: the bag must be dropped. The rounds after it are ignored.
  trial1: () => [{ type: "Tick", ms: balance.runMs }, { type: "Start" }],
} satisfies Record<string, (again: number) => GameEvent[]>;
/**
 * Whole rounds: some noise, then every place tapped once or twice in a random order (so every secret is tapped
 * and every safe thing is handed over, and some are tapped again), then the next round, or the way back to the
 * title and in again, or the time up and play again, or the time up and trial 1, several times over (random
 * events alone rarely finish a round).
 */
const aRound = fc
  .tuple(
    fc.array(event, { maxLength: 3 }),
    fc.shuffledSubarray(places, { minLength: 5 }),
    fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
    fc.constantFrom(
      "next" as const,
      "next" as const,
      "next" as const,
      "next" as const,
      "leave" as const,
      "end" as const,
      "trial1" as const,
    ),
    seed,
  )
  .map(([noise, order, twice, after, again]): GameEvent[] => [
    ...noise,
    ...order.flatMap((i, k): GameEvent[] =>
      twice[k]
        ? [
            { type: "GiveItem", index: i },
            { type: "GiveItem", index: i },
          ]
        : [{ type: "GiveItem", index: i }],
    ),
    ...ending[after](again),
  ]);
const rounded = fc
  .tuple(seed, fc.array(aRound, { minLength: 1, maxLength: 9 }))
  .map(([s, list]): GameEvent[] => [enter(s), ...list.flat()]);
/** Sequences that enter the bag, go round it, or may never reach it or start another trial first. */
const anywhere = fc.oneof(events, inBag, rounded);

type Step = { before: GameState; event: GameEvent; after: GameState };

function steps(list: GameEvent[]): Step[] {
  let state = initialState;
  return list.map((e) => {
    const before = state;
    state = reduce(state, e);
    return { before, event: e, after: state };
  });
}

/** A run of the bag is on: the clock is going. */
const isBag = (s: GameState) => s.phase === "trial" && s.trial === 4;
/** A run of the bag, or its end screen. */
const isBagOrEnd = (s: GameState) => s.phase !== "title" && s.trial === 4;
const done = (b: Bag) => b.stage === "done";
const isBagEvent = (e: GameEvent) => e.type === "GiveItem" || e.type === "RetryBag";
const isOtherTrialEvent = (e: GameEvent) =>
  [
    "Ask",
    "PickCard",
    "Retry",
    "PickTool",
    "GiveTool",
    "RetryShed",
    "LeaveShed",
    "InspectStar",
    "SortStar",
    "KeepStars",
    "RetryField",
    "LeaveField",
  ].includes(e.type);
const fullRun = { remainingMs: balance.runMs, score: 0, streak: 0 };
const isPlace = (i: number) => Number.isInteger(i) && i >= 0 && i < itemCount;
/** The tap would do something: the bag is giving, the place exists and its thing is still with the child. */
const live = (b: Bag, i: number) => b.stage === "giving" && isPlace(i) && !b.given[i];

/** The step began a new run (of any trial), or went back to the title. */
function resetsRun(s: Step): boolean {
  const { before, event: e, after } = s;
  if (["LeaveBag", "LeaveField", "LeaveShed"].includes(e.type)) {
    return after.phase === "title" && before.phase !== "title";
  }
  if (["StartBag", "StartField", "StartShed"].includes(e.type)) {
    return before.phase !== "trial" && after.phase === "trial";
  }
  return e.type === "Start" && before.phase !== "trial";
}

describe("the bag events do not break the base guarantees (properties)", () => {
  it("INV-1, INV-2: keeps phase in title|trial|over and trial a non-negative integer with the bag events", () => {
    checkProperty(
      "bag-phase-and-trial-bounds",
      fc.property(anywhere, (list) => {
        for (const { after } of steps(list)) {
          expect(["title", "trial", "over"]).toContain(after.phase);
          expect(Number.isInteger(after.trial)).toBe(true);
          expect(after.trial).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });

  it("INV-3: never mutates the state it is given, with the bag events (frozen input does not throw)", () => {
    checkProperty(
      "bag-no-mutation",
      fc.property(anywhere, (list) => {
        list.reduce((s, e) => reduce(deepFreeze(s), e), structuredClone(initialState));
      }),
    );
  });

  it("INV-4: is deterministic, with the bag events: the same seed and events give the same state", () => {
    checkProperty(
      "bag-deterministic-replay",
      fc.property(anywhere, (list) => {
        expect(list.reduce(reduce, initialState)).toEqual(list.reduce(reduce, initialState));
      }),
    );
  });
});

describe("the bag, the round (properties)", () => {
  it("INV-46: REQ-7.5.1: a round has five things, 1 or 2 secrets, no thing twice, from the seed and the round, and neither changes until the next round", () => {
    checkProperty(
      "bag-round-and-seed",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isBag(after)) continue;
          const items = itemsOf(after.bag.seed, after.bag.round);
          expect(items).toHaveLength(itemCount);
          expect(new Set(items).size).toBe(itemCount);
          expect([1, 2]).toContain(items.filter(isSecret).length);
          if (!isBag(before)) continue;
          expect(after.bag.seed).toBe(before.bag.seed);
          const advanced = e.type === "RetryBag" && done(before.bag);
          const round = advanced ? (before.bag.round + 1) % bagRounds : before.bag.round;
          expect(after.bag.round).toBe(round);
        }
      }),
    );
  });
});

describe("the bag, handing over and holding back (properties)", () => {
  it("INV-47: REQ-7.4.1: a secret is never handed over, in any state, and a done round handed over exactly the safe things", () => {
    checkProperty(
      "bag-secret-never-given",
      fc.property(anywhere, (list) => {
        for (const { after } of steps(list)) {
          const { bag } = after;
          const given = givenItems(bag);
          expect(given.some((i) => isSecretAt(bag, i))).toBe(false);
          if (bag.stage === "giving") {
            expect(places.filter((i) => bag.given[i] && isSecretAt(bag, i))).toEqual([]);
          } else {
            expect(given).toEqual(places.filter((i) => !isSecretAt(bag, i)));
          }
        }
      }),
    );
  });

  it("INV-48: REQ-7.3.1: GiveItem on a safe thing still with the child hands over exactly that thing; the last one finishes the round", () => {
    checkProperty(
      "bag-safe-hand-over",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "GiveItem" || !isBag(before)) continue;
          const b = before.bag;
          if (b.stage !== "giving" || !live(b, e.index) || isSecretAt(b, e.index)) continue;
          const given = b.given.map((g, i) => g || i === e.index);
          const left = places.some((i) => !given[i] && !isSecretAt(b, i));
          const expected: Bag = left
            ? { ...b, given, last: e.index }
            : { stage: "done", seed: b.seed, round: b.round };
          expect(after.bag).toEqual(expected);
        }
      }),
    );
  });

  it("INV-49: REQ-7.4.4: GiveItem on a secret hands nothing over and never finishes the round; it only notes the tap, and can be tapped again", () => {
    checkProperty(
      "bag-secret-held-back",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "GiveItem" || !isBag(before)) continue;
          const b = before.bag;
          if (!live(b, e.index) || !isSecretAt(b, e.index)) continue;
          expect(after.bag).toEqual({ ...b, last: e.index });
          const again = reduce(after, e);
          expect(again.bag).toEqual(after.bag);
          expect(again.phase).toBe("trial");
        }
      }),
    );
  });

  it("INV-50: REQ-7.3.2: GiveItem on a thing already given, on an index that is not a thing, or in a done round returns the same state", () => {
    checkProperty(
      "bag-stray-tap-changes-nothing",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "GiveItem" || !isBag(before)) continue;
          if (!live(before.bag, e.index)) expect(after).toBe(before);
        }
      }),
    );
  });
});

describe("the bag, a done round and the next (properties)", () => {
  it("INV-51: REQ-7.5.3: a round is done only by GiveItem on its last safe thing, and once done only RetryBag (or the end of the run) changes the bag", () => {
    checkProperty(
      "bag-done-stays",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isBag(before) || !isBagOrEnd(after)) continue;
          if (!done(before.bag) && done(after.bag)) {
            const b = before.bag;
            const left =
              b.stage === "giving" ? places.filter((i) => !b.given[i] && !isSecretAt(b, i)) : [];
            // The tap that finished the round was on the one safe thing that was left.
            expect([e.type === "GiveItem" ? e.index : null]).toEqual(left);
          }
          if (done(before.bag) && e.type !== "RetryBag" && after.phase !== "title") {
            if (e.type === "StartBag") continue;
            expect(after.bag).toBe(before.bag);
          }
        }
      }),
    );
  });

  it("INV-52: REQ-7.5.4: RetryBag after a done round starts the next round (the first after the last) with nothing given; before that it changes nothing", () => {
    checkProperty(
      "bag-retry-next-round",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "RetryBag" || !isBag(before)) continue;
          if (done(before.bag)) {
            expect(after.bag).toEqual({
              ...initialBag,
              seed: before.bag.seed,
              round: (before.bag.round + 1) % bagRounds,
            });
            expect(after).toEqual({ ...before, bag: after.bag });
          } else {
            expect(after).toBe(before);
          }
        }
      }),
    );
  });
});

describe("the bag and the other trials stay apart (properties)", () => {
  it("INV-53: REQ-7.8.3: bag events return the same state outside a run of trial 4, and in it change only `bag` (a tap also scores); `bag` is initial whenever trial is not 4", () => {
    checkProperty(
      "bag-events-stay-in-the-bag",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isBagEvent(e) && !isBag(before)) expect(after).toBe(before);
          if (isBagEvent(e) && isBag(before)) {
            const scores = e.type === "GiveItem";
            expect({ ...after, bag: before.bag, run: scores ? before.run : after.run }).toEqual(
              before,
            );
            if (!scores) expect(after.run).toBe(before.run);
          }
          if (after.trial !== 4) expect(after.bag).toEqual(initialBag);
        }
      }),
    );
  });

  it("INV-54: REQ-7.8.3: in trial 4 the events of the lane, the shed and the field return the same state, so they stay initial", () => {
    checkProperty(
      "bag-ignores-other-trials",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isBagOrEnd(before) && isOtherTrialEvent(e)) expect(after).toBe(before);
          if (isBagOrEnd(after)) {
            expect(after.lane).toEqual(initialState.lane);
            expect(after.shed).toEqual(initialState.shed);
            expect(after.field).toEqual(initialState.field);
          }
        }
      }),
    );
  });
});

describe("the bag's 60-second run (properties)", () => {
  it("INV-15: REQ-7.7.1: the clock only runs down inside a run, between 0 and 60 seconds, and a new run or the way back to the title sets it to 60", () => {
    checkProperty(
      "bag-clock-only-runs-down",
      fc.property(anywhere, (list) => {
        for (const s of steps(list)) {
          const { before, after } = s;
          expect(after.run.remainingMs).toBeGreaterThanOrEqual(0);
          expect(after.run.remainingMs).toBeLessThanOrEqual(balance.runMs);
          if (resetsRun(s)) expect(after.run.remainingMs).toBe(balance.runMs);
          else expect(after.run.remainingMs).toBeLessThanOrEqual(before.run.remainingMs);
        }
      }),
    );
  });

  it("INV-16: REQ-7.7.3: in the bag the score never goes down inside a run, and goes up only when a safe thing is handed over", () => {
    checkProperty(
      "bag-score-only-goes-up-on-a-hand-over",
      fc.property(anywhere, (list) => {
        for (const s of steps(list)) {
          const { before, event: e, after } = s;
          if (resetsRun(s)) {
            expect(after.run.score).toBe(0);
            continue;
          }
          expect(after.run.score).toBeGreaterThanOrEqual(before.run.score);
          if (after.run.score > before.run.score && isBagOrEnd(before)) {
            expect(e.type).toBe("GiveItem");
            expect(e.type === "GiveItem" && isSecretAt(before.bag, e.index)).toBe(false);
          }
        }
      }),
    );
  });

  it("INV-17: REQ-7.7.4: the bag's run is over exactly when the clock is at zero, and its end screen takes only Start, StartBag, LeaveBag, SetLang and MoveHeroTo", () => {
    checkProperty(
      "bag-over-means-zero",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isBag(after)) expect(after.run.remainingMs).toBeGreaterThan(0);
          if (isBagOrEnd(after) && after.phase === "over") expect(after.run.remainingMs).toBe(0);
          if (before.phase !== "over" || before.trial !== 4) continue;
          if (["Start", "StartBag", "LeaveBag"].includes(e.type)) continue;
          if (e.type === "SetLang" || e.type === "MoveHeroTo") {
            expect(after.run).toBe(before.run);
            expect(after.bag).toBe(before.bag);
          } else {
            expect(after).toBe(before);
          }
        }
      }),
    );
  });
});

describe("the bag's score, its start and its way back (properties)", () => {
  it("INV-55: REQ-7.7.3: a tap scores once: a safe hand-over adds the points for the streak and extends it, a secret ends the streak and adds nothing; nothing else in the bag moves them", () => {
    checkProperty(
      "bag-scores-once-on-a-tap",
      fc.property(anywhere, (list) => {
        for (const s of steps(list)) {
          const { before, event: e, after } = s;
          if (resetsRun(s) || !isBagOrEnd(before)) continue;
          const tapped = e.type === "GiveItem" && isBag(before) && live(before.bag, e.index);
          if (!tapped) {
            expect(after.run.score).toBe(before.run.score);
            expect(after.run.streak).toBe(before.run.streak);
          } else if (isSecretAt(before.bag, e.index)) {
            expect(after.run.score).toBe(before.run.score);
            expect(after.run.streak).toBe(0);
          } else {
            expect(after.run.score).toBe(before.run.score + pointsFor(before.run.streak));
            expect(after.run.streak).toBe(before.run.streak + 1);
          }
        }
      }),
    );
  });

  it("INV-56: REQ-7.1.2, REQ-7.7.4: StartBag from the title or the bag's end screen begins a run: a full clock, a score of 0, round 0 of the seed, the best kept; anywhere else it returns the same state", () => {
    checkProperty(
      "bag-start-begins-a-run",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "StartBag") continue;
          if (before.phase !== "title" && !(before.phase === "over" && before.trial === 4)) {
            expect(after).toBe(before);
            continue;
          }
          expect(after).toEqual({
            ...before,
            phase: "trial",
            trial: 4,
            bag: { ...initialBag, seed: e.seed >>> 0 },
            run: { ...fullRun, best: before.run.best, record: false },
          });
        }
      }),
    );
  });

  it("INV-57: REQ-7.7.5: LeaveBag from a run or the end screen of trial 4 goes to the title and drops the bag and the run, keeping the best, the language and the hero; elsewhere it returns the same state", () => {
    checkProperty(
      "bag-leave-goes-to-the-title",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "LeaveBag") continue;
          if (!isBagOrEnd(before)) {
            expect(after).toBe(before);
            continue;
          }
          expect(after).toEqual({
            ...before,
            phase: "title",
            trial: 0,
            bag: initialBag,
            run: { ...fullRun, best: before.run.best, record: false },
          });
        }
      }),
    );
  });
});

/** What a tap in a run of the bag is an example of: a bad index, a hand-over, a secret, a thing given again. */
function reachedByTap(b: Bag, at: number): string[] {
  if (!isPlace(at)) return ["bad index"];
  if (b.stage !== "giving") return [];
  if (b.given[at]) return ["given again"];
  return [isSecretAt(b, at) ? "secret" : "hand-over"];
}

/** What a step that leaves a run or an end screen of the bag is an example of. */
function reachedByLeaving({ before, event: e, after }: Step): string[] {
  const names: [boolean, string][] = [
    [before.phase === "over" && e.type === "StartBag" && after.phase === "trial", "play again"],
    [
      before.phase === "over" && before.trial === 4 && e.type === "Start",
      "trial 1 from the end screen",
    ],
    [isBag(before) && after.phase === "over", "time up"],
    [isBagOrEnd(before) && e.type === "LeaveBag" && after.phase === "title", "leave"],
  ];
  return names.filter(([hit]) => hit).map(([, name]) => name);
}

/** What one step shows about the generators' reach: the names of the situations it is an example of. */
function reached(step: Step): string[] {
  const { before, event: e, after } = step;
  const b = before.bag;
  const taps = e.type === "GiveItem" && isBag(before) ? reachedByTap(b, e.index) : [];
  const names: [boolean, string][] = [
    [isBag(before) && !done(b) && done(after.bag), "done"],
    [isBag(before) && e.type === "RetryBag" && done(b), "next round"],
    [isBag(after) && isBag(before) && after.bag.round === 0 && b.round === bagRounds - 1, "wrap"],
  ];
  const inRun = names.filter(([hit]) => hit).map(([, name]) => name);
  return [...taps, ...inRun, ...reachedByLeaving(step)];
}

describe("the generators reach what the properties are about", () => {
  it("covers a hand-over, a secret, a thing given again, a bad index, a done round, the next round, the wrap, the time up, play again, trial 1 from the end screen and the leave", () => {
    const seen = new Set<string>();
    for (const list of fc.sample(anywhere, 400)) {
      for (const step of steps(list)) reached(step).forEach((name) => seen.add(name));
    }
    expect([...seen].sort()).toEqual(
      [
        "bad index",
        "done",
        "given again",
        "hand-over",
        "leave",
        "next round",
        "play again",
        "secret",
        "time up",
        "trial 1 from the end screen",
        "wrap",
      ].sort(),
    );
  });
});
