// Scaffold stub: replaced by .kiro/specs/01-core-loop

import fc from "fast-check";
import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../events";
import { colors, delivered, hasPick, isComplete, outcome, things, wishAt } from "../lane";
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
// The same, after a Start, so the lane events are not all ignored on the title screen.
const inTrial = events.map((list): GameEvent[] => [{ type: "Start" }, ...list]);

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
});

describe("reduce, requests (properties)", () => {
  it("INV-8: REQ-3.2: Ask with no card picked, or after a search, returns the same state", () => {
    checkProperty(
      "no-card-is-not-a-request",
      fc.property(events, (list) => {
        const end = list.reduce(reduce, initialState);
        if (!hasPick(end.lane.pick) || end.lane.asked) {
          expect(reduce(end, { type: "Ask" })).toBe(end);
        }
      }),
    );
  });

  it("INV-9: REQ-3.1: Ask with at least one card picked and no search yet starts the search", () => {
    checkProperty(
      "one-card-is-a-request",
      fc.property(inTrial, (list) => {
        const end = list.reduce(reduce, initialState);
        if (hasPick(end.lane.pick) && !end.lane.asked) {
          expect(reduce(end, { type: "Ask" }).lane.asked).toBe(true);
        }
      }),
    );
  });

  it("INV-10: REQ-3.3.6: Ask changes only lane.asked and never fills in a card the child did not pick", () => {
    checkProperty(
      "ask-keeps-the-pick",
      fc.property(inTrial, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type === "Ask" && after.lane !== before.lane) {
            expect(after.lane).toEqual({ ...before.lane, asked: true });
          }
        }
      }),
    );
  });
});

describe("reduce, what the wisp brings (properties)", () => {
  it("INV-11: REQ-3.3: what the wisp brings keeps every card the child picked", () => {
    checkProperty(
      "brought-item-keeps-the-picked-cards",
      fc.property(inTrial, (list) => {
        const { lane } = list.reduce(reduce, initialState);
        const item = delivered(lane);
        if (item === null) return;
        if (lane.pick.color !== null) expect(item.color).toBe(lane.pick.color);
        if (lane.pick.thing !== null) expect(item.thing).toBe(lane.pick.thing);
      }),
    );
  });

  it("INV-12: REQ-3.3.5: a request with only one card never brings the wish", () => {
    checkProperty(
      "one-card-never-brings-the-wish",
      fc.property(inTrial, (list) => {
        const { lane } = list.reduce(reduce, initialState);
        if (!lane.asked || isComplete(lane.pick)) return;
        expect(delivered(lane)).not.toEqual(wishAt(lane.wish));
        expect(outcome(lane)).toBe("wrong");
      }),
    );
  });

  it("INV-13: REQ-3.3.2: a request with both cards brings exactly that pair, the wish or not", () => {
    checkProperty(
      "two-cards-bring-the-pair",
      fc.property(inTrial, (list) => {
        const { lane } = list.reduce(reduce, initialState);
        if (lane.asked && isComplete(lane.pick)) expect(delivered(lane)).toEqual(lane.pick);
      }),
    );
  });

  it("INV-14: REQ-3.4: after a search the pick has a card and only Retry changes the lane", () => {
    checkProperty(
      "asked-request-is-fixed",
      fc.property(inTrial, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!before.lane.asked) continue;
          expect(hasPick(before.lane.pick)).toBe(true);
          if (e.type !== "Retry") expect(after.lane).toEqual(before.lane);
        }
      }),
    );
  });

  it("the generator reaches one-card and two-card searches, so INV-9 to INV-14 are not empty", () => {
    const ends = fc
      .sample(inTrial, { numRuns: 400, seed: 7 })
      .map((l) => l.reduce(reduce, initialState));
    const searched = ends.filter((s) => s.lane.asked);
    expect(searched.some((s) => isComplete(s.lane.pick))).toBe(true);
    expect(searched.some((s) => hasPick(s.lane.pick) && !isComplete(s.lane.pick))).toBe(true);
    expect(searched.some((s) => outcome(s.lane) === "right")).toBe(true);
    expect(ends.some((s) => hasPick(s.lane.pick) && !s.lane.asked)).toBe(true);
  });
});
