import fc from "fast-check";
import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../events";
import { fakesOf, initialField, isFake, keptStars, markOf, rounds, starCount } from "../field";
import { colors, initialLane, things } from "../lane";
import { reduce } from "../reducer";
import { initialRun } from "../run";
import { initialShed, tools } from "../shed";
import { initialState, type GameState } from "../state";
import { checkProperty, deepFreeze } from "./support/pbt";

// Trial 3 (spec 06-trial-verify-stars): property tests over the real reducer. The generator mixes the
// field events with every other event, so the guards between the trials are exercised too.

const stars = [0, 1, 2, 3, 4];
const lang = fc.constantFrom("ja" as const, "en" as const);
const card = fc.constantFrom(...colors, ...things);
const tool = fc.constantFrom(...tools);
// Mostly stars that exist, and sometimes an index that does not (and a fraction, and NaN).
const index = fc.oneof(
  { weight: 8, arbitrary: fc.constantFrom(...stars) },
  { weight: 2, arbitrary: fc.integer({ min: -3, max: 8 }) },
  { weight: 1, arbitrary: fc.constantFrom(0.5, Number.NaN, Infinity) },
);
const fieldEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  { weight: 6, arbitrary: fc.record({ type: fc.constant("CheckStar" as const), index }) },
  { weight: 3, arbitrary: fc.record({ type: fc.constant("KeepStars" as const) }) },
  { weight: 2, arbitrary: fc.record({ type: fc.constant("RetryField" as const) }) },
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
  fc.record({ type: fc.constant("StartField" as const) }),
  // Short ticks, and a long one that would end a run of trial 1.
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: -100, max: 2_000 }) }),
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: 0, max: 70_000 }) }),
);
const event = fc.oneof({ weight: 5, arbitrary: fieldEvent }, { weight: 3, arbitrary: otherEvent });
const events = fc.array(event, { maxLength: 40 });
/** Opens the field from the title first, so the field events are not all ignored. */
const inField = events.map((list): GameEvent[] => [{ type: "StartField" }, ...list]);
/**
 * Whole rounds: some noise, then all five stars in any order, the keep and the retry, several times
 * over, so the sequences go round the table (random events alone almost never get through one round).
 */
const aRound = fc
  .tuple(fc.array(event, { maxLength: 3 }), fc.shuffledSubarray(stars, { minLength: 5 }))
  .map(([noise, order]): GameEvent[] => [
    ...noise,
    ...order.map((i): GameEvent => ({ type: "CheckStar", index: i })),
    { type: "KeepStars" },
    { type: "RetryField" },
  ]);
const rounded = fc
  .array(aRound, { minLength: 1, maxLength: 9 })
  .map((list): GameEvent[] => [{ type: "StartField" }, ...list.flat()]);
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
const isFieldEvent = (e: GameEvent) =>
  e.type === "CheckStar" || e.type === "KeepStars" || e.type === "RetryField";
const isOtherTrialEvent = (e: GameEvent) =>
  e.type === "Ask" ||
  e.type === "PickCard" ||
  e.type === "Retry" ||
  e.type === "Tick" ||
  e.type === "PickTool" ||
  e.type === "GiveTool" ||
  e.type === "RetryShed";
const isStar = (i: number) => Number.isInteger(i) && i >= 0 && i < starCount;

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

  it("INV-4: is deterministic, with the field events: replaying the same events gives the same state", () => {
    checkProperty(
      "field-deterministic-replay",
      fc.property(anywhere, (list) => {
        expect(list.reduce(reduce, initialState)).toEqual(list.reduce(reduce, initialState));
      }),
    );
  });
});

describe("the field, checking and the round (properties)", () => {
  it("INV-25: REQ-6.3: a check marks exactly that star; a star checked twice or an index that is not a star changes nothing", () => {
    checkProperty(
      "field-check-one-star",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "CheckStar" || !isField(before)) continue;
          const field = before.field;
          if (field.stage === "checking" && isStar(e.index) && !field.checked[e.index]) {
            expect(after.field).toEqual({
              ...field,
              checked: field.checked.map((done, i) => done || i === e.index),
              last: e.index,
            });
            expect(after).toEqual({ ...before, field: after.field });
          } else {
            expect(after).toBe(before);
          }
        }
      }),
    );
  });

  it("INV-26: REQ-6.4: a round has 1 or 2 fake stars, a check shows the truth, and the round stays until RetryField", () => {
    checkProperty(
      "field-round-and-truth",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isField(after)) continue;
          const fakes = fakesOf(after.field.round);
          expect(fakes.length).toBeGreaterThanOrEqual(1);
          expect(fakes.length).toBeLessThanOrEqual(2);
          for (const i of stars) {
            const mark = markOf(after.field, i);
            if (mark !== "unchecked")
              expect(mark).toBe(isFake(after.field.round, i) ? "fake" : "real");
          }
          if (!isField(before)) continue;
          const nextRound = before.field.stage === "kept" && e.type === "RetryField";
          if (!nextRound) expect(after.field.round).toBe(before.field.round);
          for (const i of stars) {
            // A star that was checked stays what it was; a kept field knows every star.
            if (markOf(before.field, i) !== "unchecked" && !nextRound) {
              expect(markOf(after.field, i)).toBe(markOf(before.field, i));
            }
          }
        }
      }),
    );
  });

  it("the table has 1 or 2 fakes in each of its rounds, all among the five", () => {
    for (const fakes of rounds) {
      expect(fakes.length).toBeGreaterThanOrEqual(1);
      expect(fakes.length).toBeLessThanOrEqual(2);
      for (const i of fakes) expect(stars).toContain(i);
    }
  });
});

describe("the field, keeping and the result (properties)", () => {
  it("INV-27: REQ-6.5.1: the field is kept only by KeepStars with all five checked; an early keep changes nothing", () => {
    checkProperty(
      "field-keep-needs-five-checks",
      fc.property(inField, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isField(before)) continue;
          const field = before.field;
          if (field.stage === "checking" && after.field.stage === "kept") {
            expect(e.type).toBe("KeepStars");
            expect(field.checked.every(Boolean)).toBe(true);
          }
          if (e.type !== "KeepStars" || field.stage !== "checking") continue;
          if (field.checked.every(Boolean))
            expect(after.field).toEqual({ stage: "kept", round: field.round });
          else expect(after).toBe(before);
        }
      }),
    );
  });

  it("INV-28: REQ-6.5.2: the keep accepts exactly the real stars, each checked before, and no fake", () => {
    checkProperty(
      "field-keeps-the-real-stars",
      fc.property(rounded, (list) => {
        for (const { before, after } of steps(list)) {
          if (before.field.stage !== "checking" || after.field.stage !== "kept") continue;
          const fakes = fakesOf(before.field.round);
          const kept = keptStars(after.field);
          expect(kept.length).toBe(starCount - fakes.length);
          for (const i of kept) {
            expect(before.field.checked[i]).toBe(true);
            expect(fakes).not.toContain(i);
          }
          for (const i of stars) expect(kept.includes(i)).toBe(!fakes.includes(i));
        }
      }),
    );
  });

  it("INV-29: REQ-6.5.4: once kept, only RetryField changes the field", () => {
    checkProperty(
      "field-result-stays-until-retry",
      fc.property(rounded, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isField(before) || before.field.stage !== "kept") continue;
          if (e.type === "RetryField") expect(after.field.stage).toBe("checking");
          else expect(after.field).toBe(before.field);
        }
      }),
    );
  });

  it("INV-30: REQ-6.7: RetryField after the keep starts the next round and changes nothing else; before the keep it changes nothing", () => {
    checkProperty(
      "field-retry-starts-the-next-round",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "RetryField" || !isField(before)) continue;
          if (before.field.stage === "kept") {
            expect(after).toEqual({
              ...before,
              field: { ...initialField, round: (before.field.round + 1) % rounds.length },
            });
          } else {
            expect(after).toBe(before);
          }
        }
      }),
    );
  });
});

describe("the field and the other trials (properties)", () => {
  it("INV-31: REQ-6.8: the field events act only in trial 3 and change only field; field is initial outside trial 3", () => {
    checkProperty(
      "field-events-stay-in-the-field",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isFieldEvent(e) && !isField(before)) expect(after).toBe(before);
          if (isFieldEvent(e) && isField(before)) {
            expect(after).toEqual({ ...before, field: after.field });
          }
          if (after.trial !== 3) expect(after.field).toEqual(initialField);
        }
      }),
    );
  });

  it("INV-32: REQ-6.7, REQ-6.8: in trial 3 the other trials' events and the clock do nothing, so there is no clock, score, lane or shed", () => {
    checkProperty(
      "field-has-no-lane-run-or-shed",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isField(before) && isOtherTrialEvent(e)) expect(after).toBe(before);
          if (isField(after)) {
            expect(after.lane).toEqual(initialLane);
            expect(after.run).toEqual(initialRun);
            expect(after.shed).toEqual(initialShed);
          }
        }
      }),
    );
  });
});

describe("the generator for the field is not empty", () => {
  const sampled = fc
    .sample(anywhere, { numRuns: 400, seed: 6 })
    .map((list) => steps(list).filter((s) => isField(s.before)));
  const all = sampled.flat();

  it("checks every star, so INV-25 and INV-26 have real checks to look at", () => {
    for (const i of stars) {
      const hit = all.some(
        (s) =>
          s.event.type === "CheckStar" &&
          s.event.index === i &&
          s.after.field.stage === "checking" &&
          s.after.field.last === i &&
          s.before !== s.after,
      );
      expect(hit, `star ${i}`).toBe(true);
    }
  });

  it("checks a star twice, and uses an index that is not a star", () => {
    expect(
      all.some(
        (s) =>
          s.event.type === "CheckStar" &&
          s.before.field.stage === "checking" &&
          s.before.field.checked[s.event.index] === true,
      ),
    ).toBe(true);
    expect(all.some((s) => s.event.type === "CheckStar" && !isStar(s.event.index))).toBe(true);
  });

  it("keeps too early and keeps when complete, so INV-27 and INV-28 have both cases", () => {
    const keeps = all.filter(
      (s) => s.event.type === "KeepStars" && s.before.field.stage === "checking",
    );
    expect(
      keeps.some(
        (s) => s.before.field.stage === "checking" && !s.before.field.checked.every(Boolean),
      ),
    ).toBe(true);
    expect(keeps.some((s) => s.after.field.stage === "kept")).toBe(true);
  });

  it("retries before the keep and after it, and goes round the whole table", () => {
    const retries = all.filter((s) => s.event.type === "RetryField");
    expect(retries.some((s) => s.before.field.stage === "checking")).toBe(true);
    expect(retries.some((s) => s.before.field.stage === "kept")).toBe(true);
    const reached = new Set(all.map((s) => s.after.field.round));
    expect([...reached].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    // The table starts again: a retry from the last round gives the first.
    expect(retries.some((s) => s.before.field.round === 3 && s.after.field.round === 0)).toBe(true);
  });

  it("meets the other trials' events, ticks and a language change inside the field", () => {
    const kinds = new Set<string>(all.map((s) => s.event.type));
    for (const k of ["Ask", "PickCard", "Retry", "Tick", "PickTool", "GiveTool", "RetryShed"]) {
      expect(kinds.has(k), k).toBe(true);
    }
    for (const k of ["Start", "SetLang", "MoveHeroTo", "StartShed", "StartField"]) {
      expect(kinds.has(k), k).toBe(true);
    }
  });
});
