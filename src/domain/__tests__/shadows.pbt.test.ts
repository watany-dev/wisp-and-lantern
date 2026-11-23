import fc from "fast-check";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import type { GameEvent } from "../events";
import { initialField } from "../field";
import { colors, initialLane, things } from "../lane";
import { reduce } from "../reducer";
import { pointsFor } from "../run";
import {
  choiceRight,
  initialShadows,
  isSecret,
  itemAt,
  itemOf,
  items,
  shadowsOutcome,
  type Choice,
} from "../shadows";
import { initialShed, tools } from "../shed";
import { initialState, type GameState } from "../state";
import { checkProperty, deepFreeze } from "./support/pbt";

// Trial 4 (spec 07-trial-keep-secrets): property tests over the real reducer. The generator mixes the events
// of trial 4 with every other event, so the guards between the trials are exercised too.

const choice = fc.constantFrom<Choice>("give", "keep");
const lang = fc.constantFrom("ja" as const, "en" as const);
const card = fc.constantFrom(...colors, ...things);
const tool = fc.constantFrom(...tools);
const seed = fc.integer({ min: 0, max: 2 ** 32 - 1 });
const shadowsEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  { weight: 3, arbitrary: fc.record({ type: fc.constant("DecideItem" as const), choice }) },
  { weight: 3, arbitrary: fc.record({ type: fc.constant("NextItem" as const) }) },
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
  fc.record({ type: fc.constant("InspectStar" as const), index: fc.integer({ min: -1, max: 5 }) }),
  fc.record({
    type: fc.constant("SortStar" as const),
    verdict: fc.constantFrom("real" as const, "fake" as const),
  }),
  fc.record({ type: fc.constant("KeepStars" as const) }),
  fc.record({ type: fc.constant("RetryField" as const) }),
  // `seed` is either absent or a number: `{ seed: undefined }` is not a valid event.
  fc.record({ type: fc.constant("StartShed" as const), seed }, { requiredKeys: ["type"] }),
  fc.record({ type: fc.constant("StartField" as const), seed }),
  fc.record({ type: fc.constant("StartShadows" as const), seed }),
  fc.record({ type: fc.constant("LeaveShed" as const) }),
  fc.record({ type: fc.constant("LeaveField" as const) }),
  fc.record({ type: fc.constant("LeaveShadows" as const) }),
  // Short ticks, and a long one that would end a run.
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: -100, max: 2_000 }) }),
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: 0, max: 70_000 }) }),
);
const event = fc.oneof(
  { weight: 5, arbitrary: shadowsEvent },
  { weight: 3, arbitrary: otherEvent },
);
const events = fc.array(event, { maxLength: 40 });
/** Opens trial 4 from the title first, so the events of trial 4 are not all ignored. */
const enter = fc
  .tuple(seed, events)
  .map(([s, list]): GameEvent[] => [{ type: "StartShadows", seed: s }, ...list]);

/**
 * Whole rounds: some noise, then a decision, then the next round, sometimes. A "right" attempt decides what
 * is right for the item of that moment, so the score and the later rounds are reached (random events alone
 * almost never get through six items).
 */
const attempt = fc.record({
  how: fc.constantFrom("right" as const, "right" as const, "wrong" as const),
  next: fc.boolean(),
  noise: fc.option(otherEvent, { nil: null, freq: 4 }),
});
/** After the rounds the clock may run out, and then comes a button of the end screen or any other event. */
const ending = fc.option(
  fc.tuple(
    fc.constantFrom<GameEvent>({ type: "Tick", ms: balance.runMs }, { type: "Tick", ms: 70_000 }),
    fc.oneof(
      fc.constant<GameEvent>({ type: "LeaveShadows" }),
      fc.record({ type: fc.constant("StartShadows" as const), seed }),
      otherEvent,
    ),
  ),
  { nil: null, freq: 2 },
);
const plays = fc
  .tuple(seed, fc.array(attempt, { maxLength: 30 }), ending)
  .map(([s, attempts, end]): GameEvent[] => {
    const list: GameEvent[] = [{ type: "StartShadows", seed: s }];
    let state = list.reduce(reduce, initialState);
    const add = (e: GameEvent) => {
      list.push(e);
      state = reduce(state, e);
    };
    for (const a of attempts) {
      if (a.noise) add(a.noise);
      const right = isSecret(itemOf(state.shadows)) ? "keep" : "give";
      const wrong = right === "keep" ? "give" : "keep";
      add({ type: "DecideItem", choice: a.how === "right" ? right : wrong });
      if (a.next) add({ type: "NextItem" });
    }
    if (end) list.push(...end);
    return list;
  });
const inShadows = fc.oneof(enter, plays);
/** Sequences that enter trial 4, and sequences that may never reach it or start another trial first. */
const anywhere = fc.oneof(events, inShadows);

type Step = { before: GameState; event: GameEvent; after: GameState };

function steps(list: GameEvent[]): Step[] {
  let state = initialState;
  return list.map((e) => {
    const before = state;
    state = reduce(state, e);
    return { before, event: e, after: state };
  });
}

/** A run of trial 4 is on: the clock is going. */
const isRun = (s: GameState) => s.phase === "trial" && s.trial === 4;
/** A run of trial 4, or its end screen. */
const isRunOrEnd = (s: GameState) => s.phase !== "title" && s.trial === 4;
/** The events of trials 1 to 3: in trial 4 they do nothing. */
const otherTrial = (e: GameEvent) =>
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
const isShadowsEvent = (e: GameEvent) => e.type === "DecideItem" || e.type === "NextItem";
const fullRun = { remainingMs: balance.runMs, score: 0, streak: 0 };

/**
 * The step starts or ends in trial 4 (a run or its end screen). The run properties judge only these steps: the
 * generator may open the shed or the field from the title, whose own events score and run the clock by their rules.
 */
const touchesShadows = (s: Step) => s.before.trial === 4 || s.after.trial === 4;

/** The step began a new run (of trial 4, or of trial 1), or went back to the title. */
function resetsRun(s: Step): boolean {
  const { before, event: e, after } = s;
  if (e.type === "LeaveShadows") return after.phase === "title" && before.phase !== "title";
  if (e.type === "StartShadows") return before.phase !== "trial" && after.phase === "trial";
  return e.type === "Start" && before.phase !== "trial";
}

/** The step handed in a decision that counted: a `DecideItem` in a run of trial 4 that was deciding. */
const decidedNow = ({ before, event: e }: Step) =>
  e.type === "DecideItem" && isRun(before) && before.shadows.stage === "deciding";

describe("trial 4's events do not break the base guarantees (properties)", () => {
  it("INV-1, INV-2: keeps phase in title|trial|over and trial a non-negative integer with the events of trial 4", () => {
    checkProperty(
      "shadows-phase-and-trial-bounds",
      fc.property(anywhere, (list) => {
        for (const { after } of steps(list)) {
          expect(["title", "trial", "over"]).toContain(after.phase);
          expect(Number.isInteger(after.trial)).toBe(true);
          expect(after.trial).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });

  it("INV-3: never mutates the state it is given, with the events of trial 4 (frozen input does not throw)", () => {
    checkProperty(
      "shadows-no-mutation",
      fc.property(anywhere, (list) => {
        list.reduce((s, e) => reduce(deepFreeze(s), e), structuredClone(initialState));
      }),
    );
  });

  it("INV-4: is deterministic, with the events of trial 4: replaying the same events gives the same state", () => {
    checkProperty(
      "shadows-deterministic-replay",
      fc.property(anywhere, (list) => {
        expect(list.reduce(reduce, initialState)).toEqual(list.reduce(reduce, initialState));
      }),
    );
  });
});

describe("the items (properties)", () => {
  it("INV-46: REQ-7.5: the item of a round is itemAt(seed, round); the seed holds for the whole run, the round grows only by 1 and only by NextItem after a decision, and no item repeats the one before it", () => {
    checkProperty(
      "shadows-items-follow-the-seed",
      fc.property(inShadows, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isRunOrEnd(before) || !isRunOrEnd(after) || e.type === "StartShadows") continue;
          expect(after.shadows.seed).toBe(before.shadows.seed);
          const grew = after.shadows.round - before.shadows.round;
          expect(grew === 0 || (grew === 1 && e.type === "NextItem")).toBe(true);
          if (grew === 1) {
            expect(before.shadows.stage).toBe("decided");
            expect(itemOf(after.shadows)).not.toBe(itemOf(before.shadows));
          }
          expect(itemOf(after.shadows)).toBe(itemAt(after.shadows.seed, after.shadows.round));
        }
      }),
    );
    checkProperty(
      "shadows-kinds-never-run-three",
      fc.property(seed, fc.integer({ min: 0, max: 100 }), (s, from) => {
        const kinds = [0, 1, 2].map((i) => isSecret(itemAt(s, from + i)));
        expect(kinds.every((k) => k === kinds[0])).toBe(false);
        expect(itemAt(s, from)).not.toBe(itemAt(s, from + 1));
        expect(new Set(items.map((_, i) => itemAt(s, from + i))).size).toBe(items.length);
      }),
    );
  });

  it("INV-47: REQ-7.5.1: exactly the house key, the address and the password are secrets; for a secret keep is right and give is wrong, for the rest the other way round", () => {
    checkProperty(
      "shadows-secrets-are-never-fine-to-give",
      fc.property(inShadows, (list) => {
        for (const { after } of steps(list)) {
          if (!isRunOrEnd(after)) continue;
          const item = itemOf(after.shadows);
          const secret = ["houseKey", "address", "password"].includes(item);
          expect(isSecret(item)).toBe(secret);
          expect(choiceRight(item, "keep")).toBe(secret);
          expect(choiceRight(item, "give")).toBe(!secret);
          if (after.shadows.stage === "decided") {
            const right = secret
              ? after.shadows.choice === "keep"
              : after.shadows.choice === "give";
            expect(shadowsOutcome(after.shadows)).toBe(right ? "right" : "wrong");
          }
        }
      }),
    );
  });
});

describe("the decision (properties)", () => {
  it("INV-48: REQ-7.3.2: a decision is made only by DecideItem while deciding, once: the choice in the state is the choice that was sent, and a second DecideItem returns the same state", () => {
    checkProperty(
      "shadows-decide-once",
      fc.property(inShadows, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isRun(before)) continue;
          if (before.shadows.stage === "deciding" && after.shadows.stage === "decided") {
            expect(e.type).toBe("DecideItem");
            if (e.type === "DecideItem") expect(after.shadows.choice).toBe(e.choice);
            expect(after.shadows.seed).toBe(before.shadows.seed);
            expect(after.shadows.round).toBe(before.shadows.round);
          }
          if (e.type === "DecideItem" && before.shadows.stage === "decided") {
            expect(after).toBe(before);
          }
        }
        const end = list.reduce(reduce, initialState);
        if (!list.some((e) => e.type === "DecideItem")) expect(end.shadows.stage).toBe("deciding");
      }),
    );
  });

  it("INV-49: REQ-7.7.3: a decision scores once: a right one adds the points for the streak and extends it, a wrong one ends the streak and adds nothing; no other event moves the score or the streak", () => {
    checkProperty(
      "shadows-scores-once-on-the-decision",
      fc.property(inShadows, (list) => {
        for (const s of steps(list).filter(touchesShadows)) {
          const { before, after } = s;
          if (resetsRun(s)) continue;
          if (!decidedNow(s)) {
            expect(after.run.score).toBe(before.run.score);
            expect(after.run.streak).toBe(before.run.streak);
          } else if (shadowsOutcome(after.shadows) === "right") {
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
});

describe("the result, the next round and isolation (properties)", () => {
  it("INV-50: REQ-7.3.5: once a decision is made, only NextItem (or leaving or starting trial 4) changes trial 4; NextItem before a decision changes nothing; after one it starts the next round and nothing else", () => {
    checkProperty(
      "shadows-result-stays-until-next",
      fc.property(inShadows, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isRun(before)) continue;
          if (before.shadows.stage === "decided") {
            if (e.type === "NextItem") {
              const { seed: s, round } = before.shadows;
              const shadows = { stage: "deciding", seed: s, round: round + 1 };
              expect(after).toEqual({ ...before, shadows });
            } else if (!["StartShadows", "LeaveShadows"].includes(e.type)) {
              expect(after.shadows).toBe(before.shadows);
            }
          } else if (e.type === "NextItem") {
            expect(after).toBe(before);
          }
        }
      }),
    );
  });

  it("INV-51: REQ-7.8: the events of trial 4 act only in a run of trial 4 and change only shadows (and the run, for a decision); shadows is initial outside trial 4; in trial 4 the events of trials 1 to 3 do nothing", () => {
    checkProperty(
      "shadows-events-stay-in-trial-4",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isShadowsEvent(e) && !isRun(before)) expect(after).toBe(before);
          if (isShadowsEvent(e) && isRun(before) && e.type === "NextItem") {
            expect(after).toEqual({ ...before, shadows: after.shadows });
          }
          if (isShadowsEvent(e) && isRun(before) && e.type === "DecideItem") {
            expect(after).toEqual({ ...before, shadows: after.shadows, run: after.run });
          }
          if (after.trial !== 4) expect(after.shadows).toEqual(initialShadows);
          if (isRunOrEnd(before) && otherTrial(e)) expect(after).toBe(before);
          if (isRunOrEnd(after)) {
            expect(after.lane).toEqual(initialLane);
            expect(after.shed).toEqual(initialShed);
            expect(after.field).toEqual(initialField);
          }
        }
      }),
    );
  });
});

describe("trial 4's way back and its start (properties)", () => {
  it("INV-52: REQ-7.7.5: LeaveShadows from a run or the end screen of trial 4 goes to the title and drops trial 4 and the run, keeping the best, the language and the hero; elsewhere it returns the same state", () => {
    checkProperty(
      "shadows-leave-goes-to-the-title",
      fc.property(inShadows, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "LeaveShadows") continue;
          if (!isRunOrEnd(before)) {
            expect(after).toBe(before);
            continue;
          }
          expect(after).toEqual({
            ...before,
            phase: "title",
            trial: 0,
            shadows: initialShadows,
            run: { ...fullRun, best: before.run.best, record: false },
          });
        }
      }),
    );
  });

  it("INV-53: REQ-7.1.2, REQ-7.7.4: StartShadows from the title or trial 4's end screen begins a run: a full clock, a score of 0, round 0 of the seed, the best kept; anywhere else it returns the same state", () => {
    checkProperty(
      "shadows-start-begins-a-run",
      fc.property(inShadows, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "StartShadows") continue;
          const starts =
            before.phase === "title" || (before.phase === "over" && before.trial === 4);
          if (!starts) {
            expect(after).toBe(before);
            continue;
          }
          expect(after).toEqual({
            ...before,
            phase: "trial",
            trial: 4,
            shadows: { stage: "deciding", seed: e.seed >>> 0, round: 0 },
            run: { ...fullRun, best: before.run.best, record: false },
          });
        }
      }),
    );
  });
});

describe("trial 4's 60-second run (properties)", () => {
  it("INV-15: REQ-7.7: the clock only runs down inside a run, between 0 and 60 seconds, and a new run or the way back to the title sets it to 60", () => {
    checkProperty(
      "shadows-clock-only-runs-down",
      fc.property(inShadows, (list) => {
        for (const s of steps(list).filter(touchesShadows)) {
          const { before, after } = s;
          expect(after.run.remainingMs).toBeGreaterThanOrEqual(0);
          expect(after.run.remainingMs).toBeLessThanOrEqual(balance.runMs);
          if (resetsRun(s)) expect(after.run.remainingMs).toBe(balance.runMs);
          else expect(after.run.remainingMs).toBeLessThanOrEqual(before.run.remainingMs);
        }
      }),
    );
  });

  it("INV-16: REQ-7.7: inside a run the score never goes down, and goes up only when a decision is right", () => {
    checkProperty(
      "shadows-score-only-goes-up-on-a-right-decision",
      fc.property(inShadows, (list) => {
        for (const s of steps(list).filter(touchesShadows)) {
          const { before, event: e, after } = s;
          if (resetsRun(s)) {
            expect(after.run.score).toBe(0);
            continue;
          }
          expect(after.run.score).toBeGreaterThanOrEqual(before.run.score);
          if (after.run.score > before.run.score) {
            expect(e.type).toBe("DecideItem");
            expect(shadowsOutcome(after.shadows)).toBe("right");
          }
        }
      }),
    );
  });

  it("INV-17: REQ-7.7: the run is over exactly when the clock is at zero, and trial 4's end screen takes only Start, StartShadows, LeaveShadows, SetLang and MoveHeroTo", () => {
    checkProperty(
      "shadows-over-means-zero",
      fc.property(inShadows, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isRun(after)) expect(after.run.remainingMs).toBeGreaterThan(0);
          if (isRunOrEnd(after) && after.phase === "over") expect(after.run.remainingMs).toBe(0);
          if (before.phase !== "over" || before.trial !== 4) continue;
          if (["Start", "StartShadows", "LeaveShadows"].includes(e.type)) continue;
          if (e.type === "SetLang" || e.type === "MoveHeroTo") {
            expect(after.run).toBe(before.run);
            expect(after.shadows).toBe(before.shadows);
          } else {
            expect(after).toBe(before);
          }
        }
      }),
    );
  });
});

describe("the generator for trial 4 is not empty", () => {
  // Sampled in each test, not when the file loads, so the reducer paths it takes count as covered by these tests
  // (ADR 0005).
  let all: Step[] = [];
  beforeEach(() => {
    all = fc
      .sample(inShadows, { numRuns: 600, seed: 5 })
      .map((list) => steps(list).filter((s) => isRunOrEnd(s.before)))
      .flat();
  });
  const decided = (item: "secret" | "rest", c: Choice) =>
    all.filter(
      (s) =>
        s.event.type === "DecideItem" &&
        s.before.shadows.stage === "deciding" &&
        s.after.shadows.stage === "decided" &&
        isSecret(itemOf(s.before.shadows)) === (item === "secret") &&
        s.event.choice === c,
    );

  it("makes all four decisions: a secret kept and given, a thing that is fine to give given and kept", () => {
    for (const item of ["secret", "rest"] as const) {
      for (const c of ["give", "keep"] as const) {
        expect(decided(item, c).length, `${item} ${c}`).toBeGreaterThan(0);
      }
    }
  });

  it("decides twice in one round, goes next before a decision, and reaches the later rounds and every item", () => {
    expect(
      all.some((s) => s.event.type === "DecideItem" && s.before.shadows.stage === "decided"),
    ).toBe(true);
    expect(
      all.some((s) => s.event.type === "NextItem" && s.before.shadows.stage === "deciding"),
    ).toBe(true);
    expect(Math.max(...all.map((s) => s.after.shadows.round))).toBeGreaterThanOrEqual(6);
    expect(new Set(all.map((s) => itemOf(s.after.shadows))).size).toBe(items.length);
  });

  it("scores, runs the clock out, plays again from the end screen and leaves for the title", () => {
    expect(all.some((s) => s.after.run.score > 0)).toBe(true);
    expect(all.some((s) => s.after.phase === "over" && s.after.trial === 4)).toBe(true);
    expect(
      all.some(
        (s) =>
          s.event.type === "StartShadows" && s.before.phase === "over" && s.after.phase === "trial",
      ),
    ).toBe(true);
    expect(all.some((s) => s.event.type === "LeaveShadows" && s.before.phase === "trial")).toBe(
      true,
    );
    expect(all.some((s) => s.event.type === "LeaveShadows" && s.before.phase === "over")).toBe(
      true,
    );
  });

  it("meets the events of the other trials, ticks and a language change inside trial 4", () => {
    const kinds = new Set<string>(all.map((s) => s.event.type));
    for (const k of [
      "Ask",
      "PickCard",
      "PickTool",
      "GiveTool",
      "InspectStar",
      "SortStar",
      "KeepStars",
      "Tick",
      "Start",
      "SetLang",
      "MoveHeroTo",
    ]) {
      expect(kinds.has(k), k).toBe(true);
    }
  });
});
