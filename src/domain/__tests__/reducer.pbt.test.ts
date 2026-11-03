// Scaffold stub: replaced by .kiro/specs/01-core-loop

import fc from "fast-check";
import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../events";
import { reduce } from "../reducer";
import { initialState } from "../state";
import { checkProperty, deepFreeze } from "./support/pbt";

const lang = fc.constantFrom("ja" as const, "en" as const);
const event: fc.Arbitrary<GameEvent> = fc.oneof(
  fc.record({ type: fc.constant("Start" as const), lang: fc.option(lang, { nil: undefined }) }),
  fc.record({ type: fc.constant("SetLang" as const), lang }),
  fc.record({ type: fc.constant("MoveHeroTo" as const), x: fc.integer(), y: fc.integer() }),
);

describe("reduce (properties)", () => {
  it("INV-1, INV-2: keeps phase in title|trial and trial a non-negative integer for any event sequence", () => {
    checkProperty(
      "phase-and-trial-bounds",
      fc.property(fc.array(event), (events) => {
        const end = events.reduce(reduce, initialState);
        expect(["title", "trial"]).toContain(end.phase);
        expect(Number.isInteger(end.trial)).toBe(true);
        expect(end.trial).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it("INV-3: never mutates the state it is given (frozen input does not throw)", () => {
    checkProperty(
      "no-mutation",
      fc.property(fc.array(event), (events) => {
        events.reduce((s, e) => reduce(deepFreeze(s), e), structuredClone(initialState));
      }),
    );
  });

  it("INV-4: is deterministic: replaying the same events gives the same state", () => {
    checkProperty(
      "deterministic-replay",
      fc.property(fc.array(event), (events) => {
        expect(events.reduce(reduce, initialState)).toEqual(events.reduce(reduce, initialState));
      }),
    );
  });
});
