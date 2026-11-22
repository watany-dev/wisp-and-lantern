import fc from "fast-check";
import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import type { GameEvent } from "../events";
import { initialField } from "../field";
import { colors, initialLane, things } from "../lane";
import {
  broughtAt,
  cardsOf,
  faultAt,
  flickerOf,
  initialLantern,
  looksOf,
  parts,
  shapeOf,
  wishAt,
  wishOf,
  type Lantern,
  type LookId,
  type Shape,
} from "../lantern";
import { reduce } from "../reducer";
import { pointsFor } from "../run";
import { initialShadows } from "../shadows";
import { initialShed, tools } from "../shed";
import { initialState, type GameState } from "../state";
import { checkProperty, deepFreeze } from "./support/pbt";

// Trial 5 (spec 08-trial-tell-whats-wrong): property tests over the real reducer. The generator mixes the events of
// trial 5 with every other event, so the guards between the trials are exercised too.

const allLooks = parts.flatMap((p) => looksOf[p]);
const part = fc.constantFrom(...parts);
const look = fc.constantFrom(...allLooks);
const lang = fc.constantFrom("ja" as const, "en" as const);
const card = fc.constantFrom(...colors, ...things);
const tool = fc.constantFrom(...tools);
const seed = fc.integer({ min: 0, max: 2 ** 32 - 1 });
const lanternEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  { weight: 3, arbitrary: fc.record({ type: fc.constant("TapPart" as const), part }) },
  { weight: 3, arbitrary: fc.record({ type: fc.constant("FixPart" as const), look }) },
  { weight: 2, arbitrary: fc.record({ type: fc.constant("NextLantern" as const) }) },
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
  fc.record({
    type: fc.constant("DecideItem" as const),
    choice: fc.constantFrom("give" as const, "keep" as const),
  }),
  fc.record({ type: fc.constant("NextItem" as const) }),
  // `seed` is either absent or a number: `{ seed: undefined }` is not a valid event.
  fc.record({ type: fc.constant("StartShed" as const), seed }, { requiredKeys: ["type"] }),
  fc.record({ type: fc.constant("StartField" as const), seed }),
  fc.record({ type: fc.constant("StartShadows" as const), seed }),
  fc.record({ type: fc.constant("StartLantern" as const), seed }),
  fc.record({ type: fc.constant("LeaveShed" as const) }),
  fc.record({ type: fc.constant("LeaveField" as const) }),
  fc.record({ type: fc.constant("LeaveShadows" as const) }),
  fc.record({ type: fc.constant("LeaveLantern" as const) }),
  // Short ticks, and a long one that would end a run.
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: -100, max: 2_000 }) }),
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: 0, max: 70_000 }) }),
);
const event = fc.oneof(
  { weight: 5, arbitrary: lanternEvent },
  { weight: 3, arbitrary: otherEvent },
);
const events = fc.array(event, { maxLength: 40 });
/** Opens trial 5 from the title first, so the events of trial 5 are not all ignored. */
const enter = fc
  .tuple(seed, events)
  .map(([s, list]): GameEvent[] => [{ type: "StartLantern", seed: s }, ...list]);

/**
 * Whole rounds: some noise, a point (mostly at the flickering part), a card (right, the other card, or a look that is
 * no card), and the next lantern, sometimes. Random events alone almost never light a lantern.
 */
const attempt = fc.record({
  at: fc.constantFrom(
    "flicker" as const,
    "flicker" as const,
    "flicker" as const,
    "steady" as const,
  ),
  how: fc.constantFrom(
    "right" as const,
    "right" as const,
    "right" as const,
    "wrong" as const,
    "none" as const,
  ),
  next: fc.constantFrom(true, true, true, false),
  noise: fc.option(otherEvent, { nil: null, freq: 4 }),
});
const ending = fc.option(
  fc.tuple(
    fc.constantFrom<GameEvent>({ type: "Tick", ms: balance.runMs }, { type: "Tick", ms: 70_000 }),
    fc.oneof(
      fc.constant<GameEvent>({ type: "LeaveLantern" }),
      fc.record({ type: fc.constant("StartLantern" as const), seed }),
      otherEvent,
    ),
  ),
  { nil: null, freq: 2 },
);

/** The card an attempt picks, for the lantern of that moment. */
function cardFor(lantern: Lantern, how: "right" | "wrong" | "none"): LookId {
  const cards = cardsOf(lantern);
  const fault = faultAt(lantern.seed, lantern.round);
  const right = wishOf(lantern)[fault];
  if (how === "right") return right;
  if (how === "wrong") return cards.find((c) => c !== right) ?? right;
  return shapeOf(lantern)[fault];
}

const plays = fc
  .tuple(seed, fc.array(attempt, { maxLength: 40 }), ending)
  .map(([s, attempts, end]): GameEvent[] => {
    const list: GameEvent[] = [{ type: "StartLantern", seed: s }];
    let state = list.reduce(reduce, initialState);
    const add = (e: GameEvent) => {
      list.push(e);
      state = reduce(state, e);
    };
    for (const a of attempts) {
      if (a.noise) add(a.noise);
      const fault = faultAt(state.lantern.seed, state.lantern.round);
      const steady = parts.find((p) => p !== fault)!;
      add({ type: "TapPart", part: a.at === "flicker" ? fault : steady });
      add({ type: "FixPart", look: cardFor(state.lantern, a.how) });
      if (a.next) add({ type: "NextLantern" });
    }
    if (end) list.push(...end);
    return list;
  });
const inLantern = fc.oneof(enter, plays);
/** Sequences that enter trial 5, and sequences that may never reach it or start another trial first. */
const anywhere = fc.oneof(events, inLantern);

type Step = { before: GameState; event: GameEvent; after: GameState };

function steps(list: GameEvent[]): Step[] {
  let state = initialState;
  return list.map((e) => {
    const before = state;
    state = reduce(state, e);
    return { before, event: e, after: state };
  });
}

/** A run of trial 5 is on: the clock is going. */
const isRun = (s: GameState) => s.phase === "trial" && s.trial === 5;
/** A run of trial 5, or its end screen. */
const isRunOrEnd = (s: GameState) => s.phase !== "title" && s.trial === 5;
/** The events of trials 1 to 4: in trial 5 they do nothing. */
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
    "DecideItem",
    "NextItem",
    "LeaveShadows",
  ].includes(e.type);
const isLanternEvent = (e: GameEvent) =>
  e.type === "TapPart" || e.type === "FixPart" || e.type === "NextLantern";
const fullRun = { remainingMs: balance.runMs, score: 0, streak: 0 };
const differing = (a: Shape, b: Shape) => parts.filter((p) => a[p] !== b[p]);

/** The step began a new run (of trial 5, or of trial 1), or went back to the title. */
function resetsRun(s: Step): boolean {
  const { before, event: e, after } = s;
  if (e.type === "LeaveLantern") return after.phase === "title" && before.phase !== "title";
  if (e.type === "StartLantern") return before.phase !== "trial" && after.phase === "trial";
  return e.type === "Start" && before.phase !== "trial";
}

/**
 * The step starts or ends in trial 5 (a run or its end screen). The run properties judge only these steps: the
 * generator may leave trial 5 and open another trial, whose own events move the score and the clock by its rules.
 */
const touchesTrial5 = (s: Step) => s.before.trial === 5 || s.after.trial === 5;

/** The step was a fix that counted: a `FixPart` with one of the two cards in a run of trial 5. */
const fixedNow = ({ before, event: e }: Step) =>
  e.type === "FixPart" && isRun(before) && cardsOf(before.lantern).includes(e.look);

describe("trial 5's events do not break the base guarantees (properties)", () => {
  it("INV-1, INV-2: keeps phase in title|trial|over and trial a non-negative integer with the events of trial 5", () => {
    checkProperty(
      "lantern-phase-and-trial-bounds",
      fc.property(anywhere, (list) => {
        for (const { after } of steps(list)) {
          expect(["title", "trial", "over"]).toContain(after.phase);
          expect(Number.isInteger(after.trial)).toBe(true);
          expect(after.trial).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });

  it("INV-3: never mutates the state it is given, with the events of trial 5 (frozen input does not throw)", () => {
    checkProperty(
      "lantern-no-mutation",
      fc.property(anywhere, (list) => {
        list.reduce((s, e) => reduce(deepFreeze(s), e), structuredClone(initialState));
      }),
    );
  });

  it("INV-4: is deterministic, with the events of trial 5: replaying the same events gives the same state", () => {
    checkProperty(
      "lantern-deterministic-replay",
      fc.property(anywhere, (list) => {
        expect(list.reduce(reduce, initialState)).toEqual(list.reduce(reduce, initialState));
      }),
    );
  });
});

describe("the lanterns (properties)", () => {
  it("INV-54: REQ-8.8: the round's wish, fault and brought lantern follow the seed; the round grows only by NextLantern after the lantern is lit; no wish repeats the one before it and the fault moves", () => {
    checkProperty(
      "lantern-rounds-follow-the-seed",
      fc.property(inLantern, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isRunOrEnd(before) || !isRunOrEnd(after) || e.type === "StartLantern") continue;
          expect(after.lantern.seed).toBe(before.lantern.seed);
          const grew = after.lantern.round - before.lantern.round;
          expect(grew === 0 || (grew === 1 && e.type === "NextLantern")).toBe(true);
          if (grew === 1) {
            expect(before.lantern.stage).toBe("lit");
            expect(after.lantern).toEqual({
              stage: "looking",
              seed: after.lantern.seed,
              round: after.lantern.round,
              shape: broughtAt(after.lantern.seed, after.lantern.round),
              note: null,
            });
          }
        }
      }),
    );
    checkProperty(
      "lantern-rounds-change-every-time",
      fc.property(seed, fc.integer({ min: 0, max: 100 }), (s, r) => {
        expect(differing(wishAt(s, r), broughtAt(s, r))).toEqual([faultAt(s, r)]);
        expect(differing(wishAt(s, r), wishAt(s, r + 1))).toEqual([...parts]);
        expect(faultAt(s, r + 1)).not.toBe(faultAt(s, r));
      }),
    );
  });

  it("INV-55: REQ-8.3: until the lantern is lit it differs from the wish in exactly the round's fault part, which is the part that flickers", () => {
    checkProperty(
      "lantern-only-the-fault-part-differs",
      fc.property(inLantern, (list) => {
        for (const { after } of steps(list)) {
          if (!isRunOrEnd(after)) continue;
          const { lantern } = after;
          const fault = faultAt(lantern.seed, lantern.round);
          if (lantern.stage === "lit") {
            expect(flickerOf(lantern)).toBeNull();
            continue;
          }
          expect(differing(lantern.shape, wishOf(lantern))).toEqual([fault]);
          expect(flickerOf(lantern)).toBe(fault);
        }
      }),
    );
  });
});

describe("pointing and fixing (properties)", () => {
  it("INV-56: REQ-8.4: TapPart only points: the flickering part opens its cards, a steady part is fine; no look, round, seed or run changes; a lit lantern stays", () => {
    checkProperty(
      "lantern-a-tap-only-points",
      fc.property(inLantern, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "TapPart" || !isRun(before)) continue;
          const was = before.lantern;
          if (was.stage === "lit") {
            expect(after).toBe(before);
            continue;
          }
          expect(after).toEqual({ ...before, lantern: after.lantern });
          const now = after.lantern;
          expect(now.stage === "lit").toBe(false);
          expect(shapeOf(now)).toEqual(was.shape);
          if (e.part === flickerOf(was)) {
            expect(now).toEqual({ ...was, stage: "pointing", part: e.part, note: undefined });
          } else {
            expect(now).toMatchObject({ stage: "looking", note: { kind: "fine", part: e.part } });
          }
        }
      }),
    );
  });

  it("INV-57: REQ-8.5: a fix gives the pointed part exactly the look sent and changes nothing else; a right card lights the lantern, a wrong one leaves it flickering; any other FixPart does nothing", () => {
    checkProperty(
      "lantern-the-wisp-does-what-it-is-told",
      fc.property(inLantern, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "FixPart" || !isRun(before)) continue;
          const was = before.lantern;
          if (was.stage !== "pointing" || !cardsOf(was).includes(e.look)) {
            expect(after).toBe(before);
            continue;
          }
          expect(cardsOf(was)).toHaveLength(2);
          expect(cardsOf(was)).not.toContain(was.shape[was.part]);
          for (const c of cardsOf(was)) expect(looksOf[was.part]).toContain(c);
          const changed = { ...was.shape, [was.part]: e.look };
          expect(shapeOf(after.lantern)).toEqual(changed);
          const right = e.look === wishOf(was)[was.part];
          expect(after.lantern.stage).toBe(right ? "lit" : "looking");
          if (!right) expect(after.lantern).toMatchObject({ note: { kind: "said", look: e.look } });
        }
      }),
    );
  });

  it("INV-58: REQ-8.9.3: a fix scores once: a right card adds the points for the streak and extends it, a wrong card ends the streak and adds nothing; no other event moves the score or the streak", () => {
    checkProperty(
      "lantern-scores-once-on-the-fix",
      fc.property(inLantern, (list) => {
        for (const s of steps(list).filter(touchesTrial5)) {
          const { before, after } = s;
          if (resetsRun(s)) continue;
          if (!fixedNow(s)) {
            expect(after.run.score).toBe(before.run.score);
            expect(after.run.streak).toBe(before.run.streak);
          } else if (after.lantern.stage === "lit") {
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

describe("the lit lantern, the next round and isolation (properties)", () => {
  it("INV-59: REQ-8.6.3: once lit, only NextLantern (or leaving or starting trial 5) changes the lantern; NextLantern before that changes nothing; after, it starts the next round and nothing else", () => {
    checkProperty(
      "lantern-lit-stays-until-next",
      fc.property(inLantern, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isRun(before)) continue;
          if (before.lantern.stage === "lit") {
            if (e.type === "NextLantern") {
              const { seed: s, round } = before.lantern;
              const lantern = {
                stage: "looking",
                seed: s,
                round: round + 1,
                shape: broughtAt(s, round + 1),
                note: null,
              };
              expect(after).toEqual({ ...before, lantern });
            } else if (!["StartLantern", "LeaveLantern"].includes(e.type)) {
              expect(after.lantern).toBe(before.lantern);
            }
          } else if (e.type === "NextLantern") {
            expect(after).toBe(before);
          }
        }
      }),
    );
  });

  it("INV-60: REQ-8.10: the events of trial 5 act only in a run of trial 5 and change only lantern (and the run, for a fix); lantern is initial outside trial 5; in trial 5 the events of trials 1 to 4 do nothing", () => {
    checkProperty(
      "lantern-events-stay-in-trial-5",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isLanternEvent(e) && !isRun(before)) expect(after).toBe(before);
          if (isLanternEvent(e) && isRun(before) && e.type !== "FixPart") {
            expect(after).toEqual({ ...before, lantern: after.lantern });
          }
          if (isLanternEvent(e) && isRun(before) && e.type === "FixPart") {
            expect(after).toEqual({ ...before, lantern: after.lantern, run: after.run });
          }
          if (after.trial !== 5) expect(after.lantern).toEqual(initialLantern);
          if (isRunOrEnd(before) && otherTrial(e)) expect(after).toBe(before);
          if (isRunOrEnd(after)) {
            expect(after.lane).toEqual(initialLane);
            expect(after.shed).toEqual(initialShed);
            expect(after.field).toEqual(initialField);
            expect(after.shadows).toEqual(initialShadows);
          }
        }
      }),
    );
  });
});

describe("trial 5's way back and its start (properties)", () => {
  it("INV-61: REQ-8.9.5: LeaveLantern from a run or the end screen of trial 5 goes to the title and drops trial 5 and the run, keeping the best, the language and the hero; elsewhere it returns the same state", () => {
    checkProperty(
      "lantern-leave-goes-to-the-title",
      fc.property(inLantern, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "LeaveLantern") continue;
          if (!isRunOrEnd(before)) {
            expect(after).toBe(before);
            continue;
          }
          expect(after).toEqual({
            ...before,
            phase: "title",
            trial: 0,
            lantern: initialLantern,
            run: { ...fullRun, best: before.run.best, record: false },
          });
        }
      }),
    );
  });

  it("INV-62: REQ-8.1.2, REQ-8.9.4: StartLantern from the title or trial 5's end screen begins a run: a full clock, a score of 0, round 0 of the seed, the best kept; anywhere else it returns the same state", () => {
    checkProperty(
      "lantern-start-begins-a-run",
      fc.property(inLantern, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "StartLantern") continue;
          const starts =
            before.phase === "title" || (before.phase === "over" && before.trial === 5);
          if (!starts) {
            expect(after).toBe(before);
            continue;
          }
          const s = e.seed >>> 0;
          expect(after).toEqual({
            ...before,
            phase: "trial",
            trial: 5,
            lantern: { stage: "looking", seed: s, round: 0, shape: broughtAt(s, 0), note: null },
            run: { ...fullRun, best: before.run.best, record: false },
          });
        }
      }),
    );
  });
});

describe("trial 5's 60-second run (properties)", () => {
  it("INV-15: REQ-8.9: the clock only runs down inside a run, between 0 and 60 seconds, and a new run or the way back to the title sets it to 60", () => {
    checkProperty(
      "lantern-clock-only-runs-down",
      fc.property(inLantern, (list) => {
        for (const s of steps(list).filter(touchesTrial5)) {
          const { before, after } = s;
          expect(after.run.remainingMs).toBeGreaterThanOrEqual(0);
          expect(after.run.remainingMs).toBeLessThanOrEqual(balance.runMs);
          if (resetsRun(s)) expect(after.run.remainingMs).toBe(balance.runMs);
          else expect(after.run.remainingMs).toBeLessThanOrEqual(before.run.remainingMs);
        }
      }),
    );
  });

  it("INV-16: REQ-8.9: inside a run the score never goes down, and goes up only when a card lights the lantern", () => {
    checkProperty(
      "lantern-score-only-goes-up-on-a-right-card",
      fc.property(inLantern, (list) => {
        for (const s of steps(list).filter(touchesTrial5)) {
          const { before, event: e, after } = s;
          if (resetsRun(s)) {
            expect(after.run.score).toBe(0);
            continue;
          }
          expect(after.run.score).toBeGreaterThanOrEqual(before.run.score);
          if (after.run.score > before.run.score) {
            expect(e.type).toBe("FixPart");
            expect(after.lantern.stage).toBe("lit");
          }
        }
      }),
    );
  });

  it("INV-17: REQ-8.9: the run is over exactly when the clock is at zero, and trial 5's end screen takes only Start, StartLantern, LeaveLantern, SetLang and MoveHeroTo", () => {
    checkProperty(
      "lantern-over-means-zero",
      fc.property(inLantern, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isRun(after)) expect(after.run.remainingMs).toBeGreaterThan(0);
          if (isRunOrEnd(after) && after.phase === "over") expect(after.run.remainingMs).toBe(0);
          if (before.phase !== "over" || before.trial !== 5) continue;
          if (["Start", "StartLantern", "LeaveLantern"].includes(e.type)) continue;
          if (e.type === "SetLang" || e.type === "MoveHeroTo") {
            expect(after.run).toBe(before.run);
            expect(after.lantern).toBe(before.lantern);
          } else {
            expect(after).toBe(before);
          }
        }
      }),
    );
  });
});

/** A point in a run of trial 5. */
const tapNow = (s: Step) => s.event.type === "TapPart" && isRun(s.before);

describe("the generator for trial 5 is not empty", () => {
  const all = fc
    .sample(inLantern, { numRuns: 600, seed: 5 })
    .map((list) => steps(list).filter((s) => isRunOrEnd(s.before)))
    .flat();
  const counted = (pred: (s: Step) => boolean) => all.filter(pred).length;

  it("points at the flickering part and at steady ones, and picks right cards, wrong cards and looks that are no card", () => {
    expect(counted((s) => tapNow(s) && s.after.lantern.stage === "pointing")).toBeGreaterThan(0);
    expect(
      counted(
        (s) => tapNow(s) && s.after.lantern.stage === "looking" && s.before.lantern.stage !== "lit",
      ),
    ).toBeGreaterThan(0);
    expect(counted((s) => fixedNow(s) && s.after.lantern.stage === "lit")).toBeGreaterThan(0);
    expect(counted((s) => fixedNow(s) && s.after.lantern.stage === "looking")).toBeGreaterThan(0);
    expect(
      counted(
        (s) => s.event.type === "FixPart" && s.before.lantern.stage === "pointing" && !fixedNow(s),
      ),
    ).toBeGreaterThan(0);
  });

  it("goes next before and after a lit lantern, reaches the later rounds, and every part is the fault", () => {
    expect(
      counted((s) => s.event.type === "NextLantern" && s.before.lantern.stage !== "lit"),
    ).toBeGreaterThan(0);
    expect(Math.max(...all.map((s) => s.after.lantern.round))).toBeGreaterThanOrEqual(6);
    const faults = new Set(all.map((s) => faultAt(s.after.lantern.seed, s.after.lantern.round)));
    expect(faults.size).toBe(3);
  });

  it("scores, runs the clock out, plays again from the end screen and leaves for the title", () => {
    expect(all.some((s) => s.after.run.score > 0)).toBe(true);
    expect(all.some((s) => s.after.phase === "over" && s.after.trial === 5)).toBe(true);
    expect(
      all.some(
        (s) =>
          s.event.type === "StartLantern" && s.before.phase === "over" && s.after.phase === "trial",
      ),
    ).toBe(true);
    expect(all.some((s) => s.event.type === "LeaveLantern" && s.before.phase === "trial")).toBe(
      true,
    );
    expect(all.some((s) => s.event.type === "LeaveLantern" && s.before.phase === "over")).toBe(
      true,
    );
  });

  it("meets the events of the other trials, ticks and a language change inside trial 5", () => {
    const kinds = new Set<string>(all.map((s) => s.event.type));
    for (const k of [
      "Ask",
      "PickTool",
      "SortStar",
      "DecideItem",
      "Tick",
      "Start",
      "SetLang",
      "MoveHeroTo",
    ]) {
      expect(kinds.has(k), k).toBe(true);
    }
  });
});
