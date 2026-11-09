// Scaffold stub: replaced by .kiro/specs/01-core-loop

import fc from "fast-check";
import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../events";
import { colors, isComplete, things } from "../lane";
import { reduce } from "../reducer";
import { initialState } from "../state";
import { checkProperty, deepFreeze } from "./support/pbt";

const lang = fc.constantFrom("ja" as const, "en" as const);
const card = fc.constantFrom(...colors, ...things);
const event: fc.Arbitrary<GameEvent> = fc.oneof(
  fc.record({ type: fc.constant("Start" as const), lang: fc.option(lang, { nil: undefined }) }),
  fc.record({ type: fc.constant("SetLang" as const), lang }),
  fc.record({ type: fc.constant("MoveHeroTo" as const), x: fc.integer(), y: fc.integer() }),
  { weight: 3, arbitrary: fc.record({ type: fc.constant("PickCard" as const), card }) },
  { weight: 2, arbitrary: fc.record({ type: fc.constant("Ask" as const) }) },
  fc.record({ type: fc.constant("Retry" as const) }),
);
// Long enough to pick two cards, ask, retry and go around again.
const events = fc.array(event, { maxLength: 40 });

/** The state before and after each event, so a property can look at every step. */
function steps(list: GameEvent[]) {
  let state = initialState;
  return list.map((e) => {
    const before = state;
    state = reduce(state, e);
    return { before, event: e, after: state };
  });
}

describe("reduce (properties)", () => {
  it("INV-1, INV-2: keeps phase in title|trial and trial a non-negative integer for any event sequence", () => {
    checkProperty(
      "phase-and-trial-bounds",
      fc.property(events, (list) => {
        const end = list.reduce(reduce, initialState);
        expect(["title", "trial"]).toContain(end.phase);
        expect(Number.isInteger(end.trial)).toBe(true);
        expect(end.trial).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it("INV-3: never mutates the state it is given (frozen input does not throw)", () => {
    checkProperty(
      "no-mutation",
      fc.property(events, (list) => {
        list.reduce((s, e) => reduce(deepFreeze(s), e), structuredClone(initialState));
      }),
    );
  });

  it("INV-4: is deterministic: replaying the same events gives the same state", () => {
    checkProperty(
      "deterministic-replay",
      fc.property(events, (list) => {
        expect(list.reduce(reduce, initialState)).toEqual(list.reduce(reduce, initialState));
      }),
    );
  });

  it("INV-5: REQ-2.3: the helper searches only after an Ask, never unprompted", () => {
    checkProperty(
      "no-search-unless-asked",
      fc.property(events, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!before.lane.asked && after.lane.asked) expect(e.type).toBe("Ask");
        }
        const end = list.reduce(reduce, initialState);
        if (!list.some((e) => e.type === "Ask")) expect(end.lane.asked).toBe(false);
      }),
    );
  });

  it("INV-6: REQ-2.4: Ask with a card missing, or after a search, returns the same state", () => {
    checkProperty(
      "missing-card-is-not-a-search",
      fc.property(events, (list) => {
        const end = list.reduce(reduce, initialState);
        if (!isComplete(end.lane.pick) || end.lane.asked) {
          expect(reduce(end, { type: "Ask" })).toBe(end);
        }
      }),
    );
  });

  it("INV-7: REQ-2.5: after a search the pick is complete and only Retry changes the lane", () => {
    checkProperty(
      "asked-request-is-fixed",
      fc.property(events, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!before.lane.asked) continue;
          expect(isComplete(before.lane.pick)).toBe(true);
          if (e.type !== "Retry") expect(after.lane).toEqual(before.lane);
        }
      }),
    );
  });
});
