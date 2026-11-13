import fc from "fast-check";
import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import type { GameEvent } from "../events";
import { colors, initialLane, things } from "../lane";
import { reduce } from "../reducer";
import { pointsFor } from "../run";
import {
  answerOf,
  initialShed,
  puzzleAt,
  puzzleOf,
  puzzles,
  shedOutcome,
  tools,
  type ToolId,
} from "../shed";
import { initialState, type GameState } from "../state";
import { checkProperty, deepFreeze } from "./support/pbt";

// Trial 2 (spec 05-trial-grant-tools, revision 2): property tests over the real reducer. The generator
// mixes the shed events with every other event, so the guards between the trials are exercised too.

const tool = fc.constantFrom(...tools);
const lang = fc.constantFrom("ja" as const, "en" as const);
const card = fc.constantFrom(...colors, ...things);
const seed = fc.integer({ min: 0, max: 2 ** 32 - 1 });
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
  // `seed` is either absent or a number: `{ seed: undefined }` is not a valid event.
  fc.record({ type: fc.constant("StartShed" as const), seed }, { requiredKeys: ["type"] }),
  fc.record({ type: fc.constant("LeaveShed" as const) }),
  // Short ticks, and a long one that would end a run.
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: -100, max: 2_000 }) }),
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: 0, max: 70_000 }) }),
);
const event = fc.oneof({ weight: 5, arbitrary: shedEvent }, { weight: 3, arbitrary: otherEvent });
const events = fc.array(event, { maxLength: 40 });
/** Opens the shed from the title first, so the shed events are not all ignored. */
const enter = fc
  .tuple(seed, events)
  .map(([s, list]): GameEvent[] => [{ type: "StartShed", seed: s }, ...list]);

/**
 * Whole attempts: some noise, then a tool picked and handed over, the retry sometimes. A "right" attempt
 * hands over the answer to the puzzle of that moment, so the cat is freed and the next rounds are
 * reached (random events alone almost never get through a round).
 */
const attempt = fc.record({
  how: fc.constantFrom("right" as const, "right" as const, "wrong" as const),
  tool,
  retry: fc.boolean(),
  noise: fc.option(otherEvent, { nil: null, freq: 4 }),
});
const plays = fc
  .tuple(seed, fc.array(attempt, { maxLength: 25 }))
  .map(([s, attempts]): GameEvent[] => {
    const list: GameEvent[] = [{ type: "StartShed", seed: s }];
    let state = list.reduce(reduce, initialState);
    const add = (e: GameEvent) => {
      list.push(e);
      state = reduce(state, e);
    };
    for (const a of attempts) {
      if (a.noise) add(a.noise);
      const chosen: ToolId = a.how === "right" ? answerOf(puzzleOf(state.shed)) : a.tool;
      add({ type: "PickTool", tool: chosen });
      add({ type: "GiveTool" });
      if (a.retry) add({ type: "RetryShed" });
    }
    return list;
  });
const inShed = fc.oneof(enter, plays);
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

/** A run of the shed is on: the clock is going. */
const isShed = (s: GameState) => s.phase === "trial" && s.trial === 2;
/** A run of the shed, or its end screen. */
const isShedOrEnd = (s: GameState) => s.phase !== "title" && s.trial === 2;
const isShedEvent = (e: GameEvent) =>
  e.type === "PickTool" || e.type === "GiveTool" || e.type === "RetryShed";
const isLaneEvent = (e: GameEvent) =>
  e.type === "Ask" || e.type === "PickCard" || e.type === "Retry";
const fullRun = { remainingMs: balance.runMs, score: 0, streak: 0 };

/** The step began a new run of the shed, or a new run of trial 1, or went back to the title. */
function resetsRun(s: Step): boolean {
  const { before, event: e, after } = s;
  if (e.type === "LeaveShed") return after.phase === "title" && before.phase !== "title";
  if (e.type === "StartShed") return before.phase !== "trial" && after.phase === "trial";
  return e.type === "Start" && before.phase !== "trial";
}

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
            expect(after.shed).toEqual({ ...before.shed, pick: e.tool });
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

  it("INV-20: REQ-5.5: a tool frees the cat only when it is the answer to this round's puzzle, and each puzzle has exactly one", () => {
    checkProperty(
      "shed-only-the-answer-frees",
      fc.property(inShed, (list) => {
        for (const { after } of steps(list)) {
          if (after.shed.stage === "choosing") {
            expect(shedOutcome(after.shed)).toBe("choosing");
            continue;
          }
          const answer = answerOf(puzzleAt(after.shed.seed, after.shed.round));
          expect(shedOutcome(after.shed)).toBe(after.shed.tool === answer ? "freed" : "stuck");
        }
      }),
    );
    for (const puzzle of puzzles) {
      expect(tools.filter((t) => answerOf(puzzle) === t)).toHaveLength(1);
    }
  });
});

describe("the shed, retry and isolation (properties)", () => {
  it("INV-21: REQ-5.7: once a tool is tried, only RetryShed (or leaving the shed) changes the shed", () => {
    checkProperty(
      "shed-result-stays-until-retry",
      fc.property(inShed, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isShed(before) || before.shed.stage !== "tried") continue;
          if (e.type === "RetryShed" || e.type === "LeaveShed") continue;
          expect(after.shed).toBe(before.shed);
        }
      }),
    );
  });

  it("INV-22: REQ-5.6, REQ-5.7: RetryShed returns to a fresh choosing, in the same round after a stuck result and the next after a freed one, and changes nothing else; before a try it changes nothing", () => {
    checkProperty(
      "shed-retry-starts-over",
      fc.property(inShed, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "RetryShed" || !isShed(before)) continue;
          if (before.shed.stage === "tried") {
            const round = before.shed.round + (shedOutcome(before.shed) === "freed" ? 1 : 0);
            const shed = { stage: "choosing", seed: before.shed.seed, round, pick: null };
            expect(after).toEqual({ ...before, shed });
          } else {
            expect(after).toBe(before);
          }
        }
      }),
    );
  });

  it("INV-23: REQ-5.9: the shed events act only in a run of trial 2 and change only shed (and the run, for a hand-over); shed is initial outside trial 2", () => {
    checkProperty(
      "shed-events-stay-in-the-shed",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isShedEvent(e) && !isShed(before)) expect(after).toBe(before);
          if (isShedEvent(e) && isShed(before) && e.type !== "GiveTool") {
            expect(after).toEqual({ ...before, shed: after.shed });
          }
          if (isShedEvent(e) && isShed(before) && e.type === "GiveTool") {
            expect(after).toEqual({ ...before, shed: after.shed, run: after.run });
          }
          if (after.trial !== 2) expect(after.shed).toEqual(initialShed);
        }
      }),
    );
  });

  it("INV-24: REQ-5.9: in trial 2 the trial 1 events do nothing, so the lane stays initial", () => {
    checkProperty(
      "shed-has-no-lane",
      fc.property(inShed, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isShedOrEnd(before) && isLaneEvent(e)) expect(after).toBe(before);
          if (isShedOrEnd(after)) expect(after.lane).toEqual(initialLane);
        }
      }),
    );
  });
});

describe("the shed's 60-second run (properties)", () => {
  it("INV-15: REQ-5.7: the clock only runs down inside a run, between 0 and 60 seconds, and a new run or the way back to the title sets it to 60", () => {
    checkProperty(
      "shed-clock-only-runs-down",
      fc.property(inShed, (list) => {
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

  it("INV-16: REQ-5.7: inside a run the score never goes down, and goes up only when a hand-over frees the cat", () => {
    checkProperty(
      "shed-score-only-goes-up-on-a-find",
      fc.property(inShed, (list) => {
        for (const s of steps(list)) {
          const { before, event: e, after } = s;
          if (resetsRun(s)) {
            expect(after.run.score).toBe(0);
            continue;
          }
          expect(after.run.score).toBeGreaterThanOrEqual(before.run.score);
          if (after.run.score > before.run.score) {
            expect(e.type).toBe("GiveTool");
            expect(shedOutcome(after.shed)).toBe("freed");
          }
        }
      }),
    );
  });

  it("INV-17: REQ-5.7: the run is over exactly when the clock is at zero, and the shed's end screen takes only Start, StartShed, LeaveShed, SetLang and MoveHeroTo", () => {
    checkProperty(
      "shed-over-means-zero",
      fc.property(inShed, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isShed(after)) expect(after.run.remainingMs).toBeGreaterThan(0);
          if (isShedOrEnd(after) && after.phase === "over") expect(after.run.remainingMs).toBe(0);
          if (before.phase !== "over" || before.trial !== 2) continue;
          if (["Start", "StartShed", "LeaveShed"].includes(e.type)) continue;
          if (e.type === "SetLang" || e.type === "MoveHeroTo") {
            expect(after.run).toBe(before.run);
            expect(after.shed).toBe(before.shed);
          } else {
            expect(after).toBe(before);
          }
        }
      }),
    );
  });
});

describe("the shed's score and the order of the puzzles (properties)", () => {
  it("INV-40: REQ-5.7.4: a hand-over scores once: a freed cat adds the points for the streak and extends it, any other tool ends the streak and adds nothing; no other event moves the score or the streak", () => {
    checkProperty(
      "shed-scores-once-on-the-hand-over",
      fc.property(inShed, (list) => {
        for (const s of steps(list)) {
          const { before, event: e, after } = s;
          if (resetsRun(s)) continue;
          const handedOver =
            e.type === "GiveTool" &&
            isShed(before) &&
            before.shed.stage === "choosing" &&
            before.shed.pick !== null;
          if (!handedOver) {
            expect(after.run.score).toBe(before.run.score);
            expect(after.run.streak).toBe(before.run.streak);
          } else if (shedOutcome(after.shed) === "freed") {
            expect(after.run.score).toBe(before.run.score + pointsFor(before.run.streak));
            expect(after.run.streak).toBe(before.run.streak + 1);
          } else {
            expect(after.run.score).toBe(before.run.score);
            expect(after.run.streak).toBe(0);
          }
        }
      }),
    );
  });

  it("INV-41: REQ-5.2.3: the puzzle of a round is puzzleAt(seed, round); the seed holds for the whole run, the round grows only by 1 after a freed cat, and no puzzle repeats the one before it", () => {
    checkProperty(
      "shed-puzzles-follow-the-seed",
      fc.property(inShed, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isShedOrEnd(before) || !isShedOrEnd(after) || e.type === "StartShed") continue;
          expect(after.shed.seed).toBe(before.shed.seed);
          const grew = after.shed.round - before.shed.round;
          expect(grew === 0 || (grew === 1 && e.type === "RetryShed")).toBe(true);
          if (grew === 1) {
            expect(shedOutcome(before.shed)).toBe("freed");
            expect(puzzleOf(after.shed)).not.toBe(puzzleOf(before.shed));
          }
          expect(puzzleOf(after.shed)).toBe(puzzleAt(after.shed.seed, after.shed.round));
        }
      }),
    );
  });
});

describe("the shed's way back and its start (properties)", () => {
  it("INV-42: REQ-5.16: LeaveShed from a run or the end screen of trial 2 goes to the title and drops the shed and the run, keeping the best, the language and the hero; elsewhere it returns the same state", () => {
    checkProperty(
      "shed-leave-goes-to-the-title",
      fc.property(inShed, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "LeaveShed") continue;
          if (!isShedOrEnd(before)) {
            expect(after).toBe(before);
            continue;
          }
          expect(after).toEqual({
            ...before,
            phase: "title",
            trial: 0,
            shed: initialShed,
            run: { ...fullRun, best: before.run.best, record: false },
          });
        }
      }),
    );
  });

  it("INV-43: REQ-5.1.2, REQ-5.7.5: StartShed from the title or the shed's end screen begins a run: a full clock, a score of 0, round 0 of the seed, the best kept; anywhere else it returns the same state", () => {
    checkProperty(
      "shed-start-begins-a-run",
      fc.property(inShed, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "StartShed") continue;
          const starts =
            before.phase === "title" || (before.phase === "over" && before.trial === 2);
          if (!starts) {
            expect(after).toBe(before);
            continue;
          }
          const wanted = (e.seed ?? 0) >>> 0;
          expect(after).toEqual({
            ...before,
            phase: "trial",
            trial: 2,
            shed: { stage: "choosing", seed: wanted, round: 0, pick: null },
            run: { ...fullRun, best: before.run.best, record: false },
          });
        }
      }),
    );
  });
});

describe("the generator for the shed is not empty", () => {
  const sampled = fc
    .sample(inShed, { numRuns: 600, seed: 5 })
    .map((list) => steps(list).filter((s) => isShedOrEnd(s.before)));
  const all = sampled.flat();
  const handed = (outcome: "freed" | "stuck", t?: string) =>
    all.filter(
      (s) =>
        s.event.type === "GiveTool" &&
        s.before.shed.stage === "choosing" &&
        s.after.shed.stage === "tried" &&
        shedOutcome(s.after.shed) === outcome &&
        (t === undefined || s.after.shed.tool === t),
    );
  const retried = (outcome: "freed" | "stuck") =>
    all.some(
      (s) =>
        s.event.type === "RetryShed" &&
        s.before.shed.stage === "tried" &&
        shedOutcome(s.before.shed) === outcome,
    );

  it("hands over every tool, and frees the cat with every tool, so INV-18 to INV-21 have real hand-overs to check", () => {
    for (const t of tools) {
      expect(handed("stuck", t).length + handed("freed", t).length, t).toBeGreaterThan(0);
      expect(handed("freed", t).length, `${t} frees`).toBeGreaterThan(0);
    }
    expect(handed("stuck").length).toBeGreaterThan(0);
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

  it("retries after a stuck result and after a freed one, and reaches the later rounds and every puzzle", () => {
    expect(retried("stuck")).toBe(true);
    expect(retried("freed")).toBe(true);
    expect(Math.max(...all.map((s) => s.after.shed.round))).toBeGreaterThanOrEqual(5);
    const seen = new Set(all.map((s) => puzzleOf(s.after.shed)));
    expect(seen.size).toBe(puzzles.length);
  });
});

describe("the generator for the shed reaches the run, the end screen and the title", () => {
  const all = fc
    .sample(inShed, { numRuns: 600, seed: 5 })
    .map((list) => steps(list).filter((s) => isShedOrEnd(s.before)))
    .flat();

  it("scores, runs the clock out, plays again from the end screen and leaves for the title", () => {
    expect(all.some((s) => s.after.run.score > 0)).toBe(true);
    expect(all.some((s) => s.after.phase === "over" && s.after.trial === 2)).toBe(true);
    expect(
      all.some(
        (s) =>
          s.event.type === "StartShed" && s.before.phase === "over" && s.after.phase === "trial",
      ),
    ).toBe(true);
    expect(all.some((s) => s.event.type === "LeaveShed" && s.before.phase === "trial")).toBe(true);
    expect(all.some((s) => s.event.type === "LeaveShed" && s.before.phase === "over")).toBe(true);
  });

  it("meets trial 1 events, ticks and a language change inside the shed", () => {
    const kinds = new Set<string>(all.map((s) => s.event.type));
    for (const k of ["Ask", "PickCard", "Retry", "Tick", "Start", "SetLang", "MoveHeroTo"]) {
      expect(kinds.has(k), k).toBe(true);
    }
  });
});
