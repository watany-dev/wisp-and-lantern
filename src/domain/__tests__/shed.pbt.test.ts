import fc from "fast-check";
import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../events";
import { initialLane, colors, things } from "../lane";
import { reduce } from "../reducer";
import { initialRun } from "../run";
import { initialShed, shedOutcome, tools } from "../shed";
import { initialState, type GameState } from "../state";
import { checkProperty, deepFreeze } from "./support/pbt";

// Trial 2 (spec 05-trial-grant-tools): property tests over the real reducer. The generator mixes
// the shed events with every other event, so the guards between the two trials are exercised too.

const tool = fc.constantFrom(...tools);
const lang = fc.constantFrom("ja" as const, "en" as const);
const card = fc.constantFrom(...colors, ...things);
const shedEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  { weight: 3, arbitrary: fc.record({ type: fc.constant("PickTool" as const), tool }) },
  { weight: 3, arbitrary: fc.record({ type: fc.constant("GiveTool" as const) }) },
  { weight: 2, arbitrary: fc.record({ type: fc.constant("RetryShed" as const) }) },
);
const otherEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  // `lang` is either absent or a language: `{ lang: undefined }` is not a valid event.
  fc.record({ type: fc.constant("Start" as const), lang }, { requiredKeys: ["type"] }),
  fc.record({ type: fc.constant("SetLang" as const), lang }),
  fc.record({ type: fc.constant("MoveHeroTo" as const), x: fc.integer(), y: fc.integer() }),
  fc.record({ type: fc.constant("PickCard" as const), card }),
  fc.record({ type: fc.constant("Ask" as const) }),
  fc.record({ type: fc.constant("Retry" as const) }),
  fc.record({ type: fc.constant("StartShed" as const) }),
  // Short ticks, and a long one that would end a run of trial 1.
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: -100, max: 2_000 }) }),
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: 0, max: 70_000 }) }),
);
const event = fc.oneof({ weight: 5, arbitrary: shedEvent }, { weight: 3, arbitrary: otherEvent });
const events = fc.array(event, { maxLength: 40 });
/** Opens the shed from the title first, so the shed events are not all ignored. */
const inShed = events.map((list): GameEvent[] => [{ type: "StartShed" }, ...list]);
/** Sequences that enter the shed, and sequences that may never reach it or start trial 1 first. */
const anywhere = fc.oneof(events, inShed);

type Step = { before: GameState; event: GameEvent; after: GameState };

function steps(list: GameEvent[]): Step[] {
  let state = initialState;
  return list.map((e) => {
    const before = state;
    state = reduce(state, e);
    return { before, event: e, after: state };
  });
}

const isShed = (s: GameState) => s.phase === "trial" && s.trial === 2;
const isShedEvent = (e: GameEvent) =>
  e.type === "PickTool" || e.type === "GiveTool" || e.type === "RetryShed";
const isTrialOneEvent = (e: GameEvent) =>
  e.type === "Ask" || e.type === "PickCard" || e.type === "Retry" || e.type === "Tick";

describe("the shed events do not break the base guarantees (properties)", () => {
  it("INV-1, INV-2: keeps phase in title|trial|over and trial a non-negative integer with the shed events", () => {
    checkProperty(
      "shed-phase-and-trial-bounds",
      fc.property(anywhere, (list) => {
        for (const { after } of steps(list)) {
          expect(["title", "trial", "over"]).toContain(after.phase);
          expect(Number.isInteger(after.trial)).toBe(true);
          expect(after.trial).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });

  it("INV-3: never mutates the state it is given, with the shed events (frozen input does not throw)", () => {
    checkProperty(
      "shed-no-mutation",
      fc.property(anywhere, (list) => {
        list.reduce((s, e) => reduce(deepFreeze(s), e), structuredClone(initialState));
      }),
    );
  });

  it("INV-4: is deterministic, with the shed events: replaying the same events gives the same state", () => {
    checkProperty(
      "shed-deterministic-replay",
      fc.property(anywhere, (list) => {
        expect(list.reduce(reduce, initialState)).toEqual(list.reduce(reduce, initialState));
      }),
    );
  });
});

describe("the shed, picking, handing over and the result (properties)", () => {
  it("INV-18: REQ-5.3, REQ-5.4: picking only picks, one tool at a time, and a tool is tried only by a hand-over with a pick", () => {
    checkProperty(
      "shed-picking-only-picks",
      fc.property(inShed, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isShed(before)) continue;
          if (e.type === "PickTool" && before.shed.stage === "choosing") {
            expect(after.shed).toEqual({ stage: "choosing", pick: e.tool });
          }
          if (before.shed.stage === "choosing" && after.shed.stage === "tried") {
            expect(e.type).toBe("GiveTool");
            expect(before.shed.pick).not.toBeNull();
          }
          if (e.type === "GiveTool" && before.shed.stage === "choosing" && !before.shed.pick) {
            expect(after).toBe(before);
          }
        }
        const end = list.reduce(reduce, initialState);
        if (!list.some((e) => e.type === "GiveTool")) expect(end.shed.stage).toBe("choosing");
      }),
    );
  });

  it("INV-19: REQ-5.5: the tool tried is the tool picked at the hand-over, never corrected or swapped", () => {
    checkProperty(
      "shed-tries-the-picked-tool",
      fc.property(inShed, (list) => {
        for (const { before, after } of steps(list)) {
          if (before.shed.stage !== "choosing" || after.shed.stage !== "tried") continue;
          expect(after.shed.tool).toBe(before.shed.pick);
        }
      }),
    );
  });

  it("INV-20: REQ-5.5: only the key opens the door", () => {
    checkProperty(
      "shed-only-the-key-opens",
      fc.property(inShed, (list) => {
        for (const { after } of steps(list)) {
          if (after.shed.stage === "choosing") {
            expect(shedOutcome(after.shed)).toBe("choosing");
          } else {
            expect(shedOutcome(after.shed)).toBe(after.shed.tool === "key" ? "open" : "shut");
          }
        }
      }),
    );
  });
});

describe("the shed, retry and isolation (properties)", () => {
  it("INV-21: REQ-5.7: once a tool is tried, only RetryShed changes the shed", () => {
    checkProperty(
      "shed-result-stays-until-retry",
      fc.property(inShed, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (before.shed.stage !== "tried") continue;
          if (e.type === "RetryShed") expect(after.shed).toEqual(initialShed);
          else expect(after.shed).toBe(before.shed);
        }
      }),
    );
  });

  it("INV-22: REQ-5.6, REQ-5.7: RetryShed returns to a fresh choosing and changes nothing else; before a try it changes nothing", () => {
    checkProperty(
      "shed-retry-starts-over",
      fc.property(inShed, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "RetryShed" || !isShed(before)) continue;
          if (before.shed.stage === "tried")
            expect(after).toEqual({ ...before, shed: initialShed });
          else expect(after).toBe(before);
        }
      }),
    );
  });

  it("INV-23: REQ-5.9: the shed events act only in trial 2 and change only shed; shed is initial outside trial 2", () => {
    checkProperty(
      "shed-events-stay-in-the-shed",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isShedEvent(e) && !isShed(before)) expect(after).toBe(before);
          if (isShedEvent(e) && isShed(before))
            expect(after).toEqual({ ...before, shed: after.shed });
          if (after.trial !== 2) expect(after.shed).toEqual(initialShed);
        }
      }),
    );
  });

  it("INV-24: REQ-5.7, REQ-5.9: in trial 2 the trial 1 events and the clock do nothing, so there is no clock or score", () => {
    checkProperty(
      "shed-has-no-lane-and-no-run",
      fc.property(inShed, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isShed(before) && isTrialOneEvent(e)) expect(after).toBe(before);
          if (isShed(after)) {
            expect(after.lane).toEqual(initialLane);
            expect(after.run).toEqual(initialRun);
          }
        }
      }),
    );
  });
});

describe("the generator for the shed is not empty", () => {
  const sampled = fc
    .sample(inShed, { numRuns: 300, seed: 5 })
    .map((list) => steps(list).filter((s) => isShed(s.before)));
  const all = sampled.flat();
  const gave = (t: string) =>
    all.filter(
      (s) =>
        s.before.shed.stage === "choosing" &&
        s.after.shed.stage === "tried" &&
        s.after.shed.tool === t,
    );

  const retried = (outcome: "open" | "shut") =>
    all.some(
      (s) =>
        s.event.type === "RetryShed" &&
        s.before.shed.stage === "tried" &&
        shedOutcome(s.before.shed) === outcome,
    );

  it("hands over every tool, so INV-18 to INV-21 have real hand-overs to check", () => {
    for (const t of tools) expect(gave(t).length, t).toBeGreaterThan(0);
  });

  it("replaces a pick, and hands over with nothing picked", () => {
    expect(
      all.some(
        (s) =>
          s.event.type === "PickTool" &&
          s.before.shed.stage === "choosing" &&
          s.before.shed.pick !== null &&
          s.after.shed !== s.before.shed,
      ),
    ).toBe(true);
    expect(
      all.some(
        (s) =>
          s.event.type === "GiveTool" &&
          s.before.shed.stage === "choosing" &&
          s.before.shed.pick === null,
      ),
    ).toBe(true);
  });

  it("retries after a shut result and after an open result, and replays after a success", () => {
    expect(retried("shut")).toBe(true);
    expect(retried("open")).toBe(true);
    const replayed = sampled.some((list) => {
      const opens = list.filter(
        (s) => shedOutcome(s.after.shed) === "open" && s.event.type === "GiveTool",
      );
      return opens.length >= 2;
    });
    expect(replayed).toBe(true);
  });

  it("meets trial 1 events, ticks and a language change inside the shed", () => {
    const kinds = new Set<string>(all.map((s) => s.event.type));
    for (const k of ["Ask", "PickCard", "Retry", "Tick", "Start", "SetLang", "MoveHeroTo"]) {
      expect(kinds.has(k), k).toBe(true);
    }
  });
});
