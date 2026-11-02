// Scaffold stub: replaced by .kiro/specs/01-core-loop

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { GameEvent } from "../events";
import { reduce } from "../reducer";
import { initialState } from "../state";

const lang = fc.constantFrom("ja" as const, "en" as const);
const event: fc.Arbitrary<GameEvent> = fc.oneof(
  fc.record({ type: fc.constant("Start" as const), lang: fc.option(lang, { nil: undefined }) }),
  fc.record({ type: fc.constant("SetLang" as const), lang }),
  fc.record({ type: fc.constant("MoveHeroTo" as const), x: fc.integer(), y: fc.integer() }),
);

describe("reduce (properties)", () => {
  it("keeps phase in title|trial and trial >= 0 for any event sequence", () => {
    fc.assert(
      fc.property(fc.array(event), (events) => {
        const end = events.reduce(reduce, initialState);
        expect(["title", "trial"]).toContain(end.phase);
        expect(end.trial).toBeGreaterThanOrEqual(0);
      }),
    );
  });
});
