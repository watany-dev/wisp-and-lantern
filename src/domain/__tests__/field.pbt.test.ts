import fc from "fast-check";
import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../events";
import {
  fakesOf,
  initialField,
  isFake,
  isLastRound,
  isReady,
  keptStars,
  roundCount,
  shineOf,
  starCount,
  type Field,
  type Verdict,
} from "../field";
import { colors, things } from "../lane";
import { reduce } from "../reducer";
import { tools } from "../shed";
import { initialState, type GameState } from "../state";
import { checkProperty, deepFreeze } from "./support/pbt";

// Trial 3 (spec 06-trial-verify-stars): property tests over the real reducer. The generator mixes the
// field events with every other event, so the guards between the trials are exercised too.

const stars = [0, 1, 2, 3, 4];
const lang = fc.constantFrom("ja" as const, "en" as const);
const card = fc.constantFrom(...colors, ...things);
const tool = fc.constantFrom(...tools);
const verdict = fc.constantFrom("real" as const, "fake" as const);
const seed = fc.oneof(fc.integer({ min: 0, max: 20 }), fc.integer({ min: -5, max: 2 ** 32 + 5 }));
// Mostly stars that exist, and sometimes an index that does not (and a fraction, and NaN).
const index = fc.oneof(
  { weight: 8, arbitrary: fc.constantFrom(...stars) },
  { weight: 2, arbitrary: fc.integer({ min: -3, max: 8 }) },
  { weight: 1, arbitrary: fc.constantFrom(0.5, Number.NaN, Infinity) },
);
const fieldEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  { weight: 6, arbitrary: fc.record({ type: fc.constant("InspectStar" as const), index }) },
  { weight: 6, arbitrary: fc.record({ type: fc.constant("SortStar" as const), verdict }) },
  { weight: 3, arbitrary: fc.record({ type: fc.constant("KeepStars" as const) }) },
  { weight: 2, arbitrary: fc.record({ type: fc.constant("RetryField" as const) }) },
  { weight: 2, arbitrary: fc.record({ type: fc.constant("LeaveField" as const) }) },
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
  fc.record({ type: fc.constant("StartField" as const), seed }),
  // Short ticks, and a long one that would end a run of trial 1.
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: -100, max: 2_000 }) }),
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: 0, max: 70_000 }) }),
);
const event = fc.oneof({ weight: 5, arbitrary: fieldEvent }, { weight: 3, arbitrary: otherEvent });
const events = fc.array(event, { maxLength: 40 });
const enter = (s: number): GameEvent => ({ type: "StartField", seed: s });
/** Opens the field from the title first, so the field events are not all ignored. */
const inField = fc.tuple(seed, events).map(([s, list]): GameEvent[] => [enter(s), ...list]);
const other = (v: Verdict): Verdict => (v === "real" ? "fake" : "real");
/**
 * Whole rounds: some noise, then every star looked at and given a verdict (a wrong one first half the
 * time, then the other, so the star is sorted in the end), the keep, the retry, and sometimes the way
 * back to the title and in again, several times over (random events alone almost never get through a
 * round).
 */
const aRound = fc
  .tuple(
    fc.array(event, { maxLength: 3 }),
    fc.shuffledSubarray(stars, { minLength: 5 }),
    fc.array(verdict, { minLength: 5, maxLength: 5 }),
    fc.boolean(),
    seed,
  )
  .map(([noise, order, said, leaves, again]): GameEvent[] => [
    ...noise,
    ...order.flatMap((i, k): GameEvent[] => [
      { type: "InspectStar", index: i },
      { type: "SortStar", verdict: said[k]! },
      { type: "InspectStar", index: i },
      { type: "SortStar", verdict: other(said[k]!) },
    ]),
    { type: "KeepStars" },
    ...(leaves
      ? [{ type: "LeaveField" } as const, enter(again)]
      : [{ type: "RetryField" } as const]),
  ]);
const rounded = fc
  .tuple(seed, fc.array(aRound, { minLength: 1, maxLength: 9 }))
  .map(([s, list]): GameEvent[] => [enter(s), ...list.flat()]);
/** Sequences that enter the field, go round it, or may never reach it or start another trial first. */
const anywhere = fc.oneof(events, inField, rounded);

type Step = { before: GameState; event: GameEvent; after: GameState };

function steps(list: GameEvent[]): Step[] {
  let state = initialState;
  return list.map((e) => {
    const before = state;
    state = reduce(state, e);
    return { before, event: e, after: state };
  });
}

const isField = (s: GameState) => s.phase === "trial" && s.trial === 3;
const finished = (f: Field) => f.stage !== "sorting";
const isFieldEvent = (e: GameEvent) =>
  e.type === "InspectStar" ||
  e.type === "SortStar" ||
  e.type === "KeepStars" ||
  e.type === "RetryField" ||
  e.type === "LeaveField";
const isOtherTrialEvent = (e: GameEvent) =>
  e.type === "Ask" ||
  e.type === "PickCard" ||
  e.type === "Retry" ||
  e.type === "Tick" ||
  e.type === "PickTool" ||
  e.type === "GiveTool" ||
  e.type === "RetryShed";
const isStar = (i: number) => Number.isInteger(i) && i >= 0 && i < starCount;
const truth = (f: Field, i: number): Verdict => (isFake(f, i) ? "fake" : "real");

describe("the field events do not break the base guarantees (properties)", () => {
  it("INV-1, INV-2: keeps phase in title|trial|over and trial a non-negative integer with the field events", () => {
    checkProperty(
      "field-phase-and-trial-bounds",
      fc.property(anywhere, (list) => {
        for (const { after } of steps(list)) {
          expect(["title", "trial", "over"]).toContain(after.phase);
          expect(Number.isInteger(after.trial)).toBe(true);
          expect(after.trial).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });

  it("INV-3: never mutates the state it is given, with the field events (frozen input does not throw)", () => {
    checkProperty(
      "field-no-mutation",
      fc.property(anywhere, (list) => {
        list.reduce((s, e) => reduce(deepFreeze(s), e), structuredClone(initialState));
      }),
    );
  });

  it("INV-4: is deterministic, with the field events: the same seed and events give the same state", () => {
    checkProperty(
      "field-deterministic-replay",
      fc.property(anywhere, (list) => {
        expect(list.reduce(reduce, initialState)).toEqual(list.reduce(reduce, initialState));
      }),
    );
  });
});

describe("the field, the round and the clue (properties)", () => {
  it("INV-26: REQ-6.4: a round has 1 or 2 fake stars, they come from the seed and the round, and neither changes until the retry", () => {
    checkProperty(
      "field-round-and-seed",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isField(after)) continue;
          const fakes = fakesOf(after.field.seed, after.field.round);
          expect([1, 2]).toContain(fakes.length);
          expect(new Set(fakes).size).toBe(fakes.length);
          expect(fakes.every(isStar)).toBe(true);
          if (!isField(before)) continue;
          expect(after.field.seed).toBe(before.field.seed);
          const advanced = e.type === "RetryField" && finished(before.field);
          const round = advanced ? (before.field.round + 1) % roundCount : before.field.round;
          expect(after.field.round).toBe(round);
        }
      }),
    );
  });

  it("INV-36: REQ-6.2.3: the clue is there from the start and never hidden: a star shines bright exactly when it is fake, in every stage", () => {
    checkProperty(
      "field-clue-always-visible",
      fc.property(anywhere, (list) => {
        for (const { before, after } of steps(list)) {
          if (!isField(after)) continue;
          for (const i of stars) {
            expect(shineOf(after.field, i)).toBe(isFake(after.field, i) ? "bright" : "normal");
          }
          const sameRound =
            isField(before) &&
            before.field.round === after.field.round &&
            before.field.seed === after.field.seed;
          if (sameRound) {
            expect(stars.map((i) => shineOf(after.field, i))).toEqual(
              stars.map((i) => shineOf(before.field, i)),
            );
          }
        }
      }),
    );
  });
});

describe("the field, looking and sorting (properties)", () => {
  it("INV-39: REQ-6.3.1: InspectStar only looks: it changes `looking` and clears the note, and a sorted star or a bad index changes nothing", () => {
    checkProperty(
      "field-inspect-only-looks",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "InspectStar" || !isField(before)) continue;
          const f = before.field;
          if (
            f.stage === "sorting" &&
            isStar(e.index) &&
            !f.sorted[e.index] &&
            f.looking !== e.index
          ) {
            expect(after.field).toEqual({ ...f, looking: e.index, note: null });
            expect(after).toEqual({ ...before, field: after.field });
          } else {
            expect(after).toBe(before);
          }
        }
      }),
    );
  });

  it("INV-33: REQ-6.3.2: a star is sorted only by a verdict on the star in the lens: no star in the lens, nothing sorted", () => {
    checkProperty(
      "field-sort-needs-looking",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isField(before)) continue;
          const f = before.field;
          if (e.type === "SortStar" && (f.stage !== "sorting" || f.looking === null)) {
            expect(after).toBe(before);
          }
          if (f.stage !== "sorting" || !isField(after) || after.field.stage !== "sorting") continue;
          const now = after.field;
          const changed = stars.filter((i) => f.sorted[i] !== now.sorted[i]);
          if (changed.length === 0) continue;
          expect(e.type).toBe("SortStar");
          expect(changed).toEqual([f.looking]);
          expect(after.field.sorted[f.looking!]).toBe(true);
        }
      }),
    );
  });
});

describe("the field, the verdict (properties)", () => {
  it("INV-34: REQ-6.3.3: the right verdict sorts exactly the star in the lens, closes the lens and notes it; no other star changes", () => {
    checkProperty(
      "field-right-verdict-sorts",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "SortStar" || !isField(before)) continue;
          const f = before.field;
          if (f.stage !== "sorting" || f.looking === null || e.verdict !== truth(f, f.looking)) {
            continue;
          }
          expect(after.field).toEqual({
            ...f,
            sorted: f.sorted.map((done, i) => done || i === f.looking),
            looking: null,
            note: { star: f.looking, said: e.verdict },
          });
          expect(after).toEqual({ ...before, field: after.field });
        }
      }),
    );
  });

  it("INV-35: REQ-6.3.4: a wrong verdict sorts nothing, never corrects the star for the child, and costs nothing: the star can be looked at and sorted again", () => {
    checkProperty(
      "field-wrong-verdict-retry",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "SortStar" || !isField(before)) continue;
          const f = before.field;
          if (f.stage !== "sorting" || f.looking === null || e.verdict === truth(f, f.looking)) {
            continue;
          }
          expect(after.field).toEqual({
            ...f,
            looking: null,
            note: { star: f.looking, said: e.verdict },
          });
          const again = reduce(after, { type: "InspectStar", index: f.looking });
          expect(again.field).toEqual({ ...after.field, looking: f.looking, note: null });
          const fixed = reduce(again, { type: "SortStar", verdict: truth(f, f.looking) });
          expect(fixed.field).toMatchObject({
            sorted: f.sorted.map((d, i) => d || i === f.looking),
          });
        }
      }),
    );
  });
});

describe("the field, the keep and the clear (properties)", () => {
  it("INV-27: REQ-6.5.1: a round is finished only by KeepStars, and only when all five are sorted", () => {
    checkProperty(
      "field-keep-needs-all-sorted",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isField(before)) continue;
          const f = before.field;
          if (e.type === "KeepStars" && f.stage === "sorting" && !isReady(f)) {
            expect(after).toBe(before);
          }
          if (isField(after) && finished(after.field) && !finished(f)) {
            expect(e.type).toBe("KeepStars");
            expect(isReady(f)).toBe(true);
          }
        }
      }),
    );
  });

  it("INV-28: REQ-6.5.2: the keep accepts exactly the real stars of the round: none is fake, none is missing, each sorted real by the child", () => {
    checkProperty(
      "field-keep-only-real",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "KeepStars" || !isField(before) || !isField(after)) continue;
          if (!finished(after.field) || finished(before.field)) continue;
          const real = stars.filter((i) => !isFake(after.field, i));
          expect(keptStars(after.field)).toEqual(real);
          expect(keptStars(after.field).some((i) => isFake(after.field, i))).toBe(false);
          expect(before.field.stage === "sorting" && before.field.sorted.every(Boolean)).toBe(true);
        }
      }),
    );
  });

  it("INV-37: REQ-6.7.1: the trial is cleared only by keeping the last round of a run; keeping any other round gives a round still to come", () => {
    checkProperty(
      "field-clear-at-last-round",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isField(before) || !isField(after) || finished(before.field)) continue;
          if (after.field.stage === "cleared") {
            expect(e.type).toBe("KeepStars");
            expect(isLastRound(before.field.round)).toBe(true);
          }
          if (e.type === "KeepStars" && isReady(before.field)) {
            expect(after.field.stage).toBe(isLastRound(before.field.round) ? "cleared" : "kept");
          }
        }
      }),
    );
  });
});

describe("the field, the next round and the way back (properties)", () => {
  it("INV-29: REQ-6.5.4: once a round is finished, every event except RetryField and the leave from a cleared trial leaves the field equal", () => {
    checkProperty(
      "field-finished-stays",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isField(before) || !finished(before.field) || !isField(after)) continue;
          if (e.type === "RetryField") continue;
          expect(after.field).toBe(before.field);
        }
      }),
    );
  });

  it("INV-30: REQ-6.7.2: RetryField after a finished round starts the next round (the first after the last) with nothing sorted; before that it changes nothing", () => {
    checkProperty(
      "field-retry-next-round",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "RetryField" || !isField(before)) continue;
          if (finished(before.field)) {
            expect(after.field).toEqual({
              ...initialField,
              seed: before.field.seed,
              round: (before.field.round + 1) % roundCount,
            });
            expect(after).toEqual({ ...before, field: after.field });
          } else {
            expect(after).toBe(before);
          }
        }
      }),
    );
  });

  it("INV-38: REQ-6.7.4: LeaveField returns to the title only from the cleared trial, with the field initial and nothing else changed; anywhere else it changes nothing", () => {
    checkProperty(
      "field-leave-from-cleared",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "LeaveField") continue;
          if (isField(before) && before.field.stage === "cleared") {
            expect(after).toEqual({ ...before, phase: "title", trial: 0, field: initialField });
          } else {
            expect(after).toBe(before);
          }
        }
      }),
    );
  });
});

describe("the field and the other trials stay apart (properties)", () => {
  it("INV-31: REQ-6.8: field events return the same state outside trial 3, and in trial 3 (but for the leave) change only `field`; `field` is initial whenever trial is not 3", () => {
    checkProperty(
      "field-events-stay-in-the-field",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isFieldEvent(e) && !isField(before)) expect(after).toBe(before);
          if (isFieldEvent(e) && e.type !== "LeaveField" && isField(before)) {
            expect({ ...after, field: before.field }).toEqual(before);
          }
          if (after.trial !== 3) expect(after.field).toEqual(initialField);
        }
      }),
    );
  });

  it("INV-32: REQ-6.7.3, REQ-6.8: in trial 3 the other trials' events return the same state, so the lane, the run and the shed stay initial: no clock, no score", () => {
    checkProperty(
      "field-ignores-other-trials",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isField(before) && isOtherTrialEvent(e)) expect(after).toBe(before);
          if (isField(after)) {
            expect(after.lane).toEqual(initialState.lane);
            expect(after.run).toEqual(initialState.run);
            expect(after.shed).toEqual(initialState.shed);
          }
        }
      }),
    );
  });
});

/** Whether a verdict event was given to a star in the lens, and whether it was the right one. */
function verdictKind(f: Field, e: GameEvent): string[] {
  if (e.type !== "SortStar" || f.stage !== "sorting" || f.looking === null) return [];
  return [e.verdict === truth(f, f.looking) ? "right verdict" : "wrong verdict"];
}

/** What one step shows about the generators' reach: the names of the situations it is an example of. */
function reached(step: Step): string[] {
  const { before, event: e, after } = step;
  if (!isField(before)) return [];
  const f = before.field;
  const names: [boolean, string][] = [
    [e.type === "InspectStar" && !isStar(e.index), "bad index"],
    [e.type === "InspectStar" && after !== before, "look"],
    [e.type === "KeepStars" && f.stage === "sorting" && !isReady(f), "early keep"],
    [e.type === "KeepStars" && isReady(f), "keep"],
    [isField(after) && after.field.stage === "cleared", "clear"],
    [e.type === "LeaveField" && after !== before, "leave"],
    [e.type === "RetryField" && finished(f), "next round"],
    [isField(after) && after.field.round !== f.round && after.field.round === 0, "wrap"],
  ];
  return [...verdictKind(f, e), ...names.filter(([hit]) => hit).map(([, name]) => name)];
}

describe("the generators reach what the properties are about", () => {
  it("covers a look, a right and a wrong verdict, an early keep, a keep, a clear, a leave and a bad index", () => {
    const seen = new Set<string>();
    for (const list of fc.sample(anywhere, 400)) {
      for (const step of steps(list)) reached(step).forEach((name) => seen.add(name));
    }
    expect([...seen].sort()).toEqual(
      [
        "bad index",
        "clear",
        "early keep",
        "keep",
        "leave",
        "look",
        "next round",
        "right verdict",
        "wrap",
        "wrong verdict",
      ].sort(),
    );
  });
});
