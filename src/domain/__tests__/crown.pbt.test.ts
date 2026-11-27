import fc from "fast-check";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import {
  cardsFor,
  initialCrown,
  jobAt,
  lampCount,
  lampParts,
  madeAt,
  newCrown,
  partOfLook,
  sameLamp,
  slipAt,
  thingsAt,
  toolFor,
  wishAt,
  wishOf,
  type Crown,
  type Lamp,
  type LampPart,
  type Thing,
} from "../crown";
import type { GameEvent } from "../events";
import { initialField } from "../field";
import { colors, initialLane, things as laneThings } from "../lane";
import { initialLantern, looksOf, parts as lanternParts } from "../lantern";
import { reduce } from "../reducer";
import { initialShadows, items } from "../shadows";
import { initialShed, tools } from "../shed";
import { initialState, type GameState } from "../state";
import { checkProperty, deepFreeze } from "./support/pbt";

// Trial 6 (spec 09-trial-hollow-crown): property tests over the real reducer. The generator mixes the events of
// trial 6 with every other event, so the guards between the trials are exercised too.

const allLooks = lanternParts.flatMap((p) => looksOf[p]);
const look = fc.constantFrom(...allLooks);
const lampPart = fc.constantFrom(...lampParts);
const allThings: readonly Thing[] = [...tools, ...items];
const thing = fc.constantFrom(...allThings);
const lang = fc.constantFrom("ja" as const, "en" as const);
const seed = fc.integer({ min: 0, max: 2 ** 32 - 1 });
const crownEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  { weight: 3, arbitrary: fc.record({ type: fc.constant("SayLook" as const), look }) },
  { weight: 2, arbitrary: fc.record({ type: fc.constant("Tell" as const) }) },
  { weight: 3, arbitrary: fc.record({ type: fc.constant("GiveItem" as const), thing }) },
  { weight: 2, arbitrary: fc.record({ type: fc.constant("Go" as const) }) },
  {
    weight: 2,
    arbitrary: fc.record({ type: fc.constant("CheckLamp" as const), same: fc.boolean() }),
  },
  { weight: 2, arbitrary: fc.record({ type: fc.constant("PointLamp" as const), part: lampPart }) },
  { weight: 3, arbitrary: fc.record({ type: fc.constant("FixLamp" as const), look }) },
  { weight: 1, arbitrary: fc.record({ type: fc.constant("NextLamp" as const) }) },
);
const otherEvent: fc.Arbitrary<GameEvent> = fc.oneof(
  // `lang` is either absent or a language: `{ lang: undefined }` is not a valid event.
  fc.record({ type: fc.constant("Start" as const), lang }, { requiredKeys: ["type"] }),
  fc.record({ type: fc.constant("SetLang" as const), lang }),
  fc.record({ type: fc.constant("MoveHeroTo" as const), x: fc.integer(), y: fc.integer() }),
  fc.record({
    type: fc.constant("PickCard" as const),
    card: fc.constantFrom(...colors, ...laneThings),
  }),
  fc.record({ type: fc.constant("Ask" as const) }),
  fc.record({ type: fc.constant("Retry" as const) }),
  fc.record({ type: fc.constant("PickTool" as const), tool: fc.constantFrom(...tools) }),
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
  fc.record({ type: fc.constant("TapPart" as const), part: fc.constantFrom(...lanternParts) }),
  fc.record({ type: fc.constant("FixPart" as const), look }),
  fc.record({ type: fc.constant("NextLantern" as const) }),
  // `seed` is either absent or a number: `{ seed: undefined }` is not a valid event.
  fc.record({ type: fc.constant("StartShed" as const), seed }, { requiredKeys: ["type"] }),
  fc.record({ type: fc.constant("StartField" as const), seed }),
  fc.record({ type: fc.constant("StartShadows" as const), seed }),
  fc.record({ type: fc.constant("StartLantern" as const), seed }),
  fc.record({ type: fc.constant("StartCrown" as const), seed }),
  fc.record({ type: fc.constant("LeaveShed" as const) }),
  fc.record({ type: fc.constant("LeaveField" as const) }),
  fc.record({ type: fc.constant("LeaveShadows" as const) }),
  fc.record({ type: fc.constant("LeaveLantern" as const) }),
  fc.record({ type: fc.constant("LeaveCrown" as const) }),
  // Short ticks, and a long one that would end a run.
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: -100, max: 2_000 }) }),
  fc.record({ type: fc.constant("Tick" as const), ms: fc.integer({ min: 0, max: 70_000 }) }),
);
const event = fc.oneof({ weight: 5, arbitrary: crownEvent }, { weight: 3, arbitrary: otherEvent });
const events = fc.array(event, { maxLength: 40 });
/** Opens trial 6 from the title first, so the events of trial 6 are not all ignored. */
const enter = fc
  .tuple(seed, events)
  .map(([s, list]): GameEvent[] => [{ type: "StartCrown", seed: s }, ...list]);

/**
 * A whole chain, with the slips a child makes on the way: a tell with one card first, a told look that is not the
 * wish's, a secret and a tool that does not fit before the right one, a "same" on the made lamp, a point at the part
 * that is the same, a wrong card or a look that is no card. Random events alone almost never light a lamp.
 */
const attempt = fc.record({
  missing: fc.boolean(),
  toldWish: fc.constantFrom(true, true, false),
  secret: fc.boolean(),
  decoy: fc.boolean(),
  sameFirst: fc.boolean(),
  pointOther: fc.boolean(),
  card: fc.constantFrom("right" as const, "right" as const, "wrong" as const, "none" as const),
  next: fc.constantFrom(true, true, true, false),
  noise: fc.option(otherEvent, { nil: null, freq: 4 }),
});

type Attempt = typeof attempt extends fc.Arbitrary<infer A> ? A : never;

const other = (part: LampPart, now: string) => looksOf[part].find((l) => l !== now)!;
const differing = (a: Lamp, b: Lamp) => lampParts.filter((p) => a[p] !== b[p]);

type Add = (e: GameEvent) => GameState;

/** The tell: a card for each part (the roof may not be the wish's), and maybe a Tell with one card before the second. */
function tellPart(add: Add, wish: Lamp, a: Attempt): void {
  add({ type: "SayLook", look: a.toldWish ? wish.roof : other("roof", wish.roof) });
  if (a.missing) add({ type: "Tell" });
  add({ type: "SayLook", look: wish.light });
  add({ type: "Tell" });
}

/** The give and the go: maybe the secret, maybe a tool that does not fit and a go, then the job's tool and a go. */
function givePart(add: Add, s: number, n: number, a: Attempt): void {
  const secret = thingsAt(s, n).find((t) => (items as readonly Thing[]).includes(t))!;
  if (a.secret) add({ type: "GiveItem", thing: secret });
  if (a.decoy) {
    add({ type: "GiveItem", thing: toolFor(s, n + 1) });
    add({ type: "Go" });
  }
  add({ type: "GiveItem", thing: toolFor(s, n) });
  add({ type: "Go" });
}

/** One fix: not the same, maybe a point at the part that is the same, a point at a part that differs, a card. */
function fixOnce(add: Add, lamp: Lamp, wish: Lamp, a: Attempt, first: boolean): void {
  add({ type: "CheckLamp", same: false });
  const part = differing(lamp, wish)[0]!;
  const steady = lampParts.find((p) => p !== part)!;
  if (a.pointOther && lamp[steady] === wish[steady]) add({ type: "PointLamp", part: steady });
  add({ type: "PointLamp", part });
  if (a.card === "none" && first) add({ type: "FixLamp", look: lamp[part] });
  const wrong = cardsFor(lamp, part).find((l) => l !== wish[part])!;
  add({ type: "FixLamp", look: a.card === "wrong" && first ? wrong : wish[part] });
}

/** The events of one chain, chosen against the crown of the moment. */
function chainEvents(start: GameState, a: Attempt): GameEvent[] {
  const list: GameEvent[] = [];
  let state = start;
  const add: Add = (e) => {
    list.push(e);
    state = reduce(state, e);
    return state;
  };
  if (a.noise) add(a.noise);
  const c = state.crown;
  if (c.stage === "clear") return list;
  const wish = wishAt(c.seed, c.chain);
  tellPart(add, wish, a);
  givePart(add, c.seed, c.chain, a);
  if (a.sameFirst) add({ type: "CheckLamp", same: true });
  for (let round = 0; round < 4 && state.crown.stage === "checking"; round += 1) {
    const lamp = state.crown.lamp;
    if (sameLamp(lamp, wish)) add({ type: "CheckLamp", same: true });
    else fixOnce(add, lamp, wish, a, round === 0);
  }
  if (a.next) add({ type: "NextLamp" });
  return list;
}

const ending = fc.option(
  fc.oneof(
    fc.constant<GameEvent>({ type: "LeaveCrown" }),
    fc.record({ type: fc.constant("StartCrown" as const), seed }),
    otherEvent,
  ),
  { nil: null, freq: 2 },
);

const plays = fc
  .tuple(seed, fc.array(attempt, { maxLength: 8 }), ending, fc.array(event, { maxLength: 6 }))
  .map(([s, attempts, end, tail]): GameEvent[] => {
    const list: GameEvent[] = [{ type: "StartCrown", seed: s }];
    let state = reduce(initialState, list[0]!);
    for (const a of attempts) {
      const more = chainEvents(state, a);
      list.push(...more);
      state = more.reduce(reduce, state);
    }
    if (end) list.push(end);
    return [...list, ...tail];
  });
const inCrown = fc.oneof(enter, plays);
/** Sequences that enter trial 6, and sequences that may never reach it or start another trial first. */
const anywhere = fc.oneof(events, inCrown);

type Step = { before: GameState; event: GameEvent; after: GameState };

function steps(list: GameEvent[]): Step[] {
  let state = initialState;
  return list.map((e) => {
    const before = state;
    state = reduce(state, e);
    return { before, event: e, after: state };
  });
}

const isCrown = (s: GameState) => s.phase === "trial" && s.trial === 6;
const isCrownEvent = (e: GameEvent) =>
  ["SayLook", "Tell", "GiveItem", "Go", "CheckLamp", "PointLamp", "FixLamp", "NextLamp"].includes(
    e.type,
  );
/** The events of trials 1 to 5, with their ways in and out: in trial 6 they do nothing. */
const otherTrial = (e: GameEvent) =>
  [
    "Ask",
    "PickCard",
    "Retry",
    "PickTool",
    "GiveTool",
    "RetryShed",
    "InspectStar",
    "SortStar",
    "KeepStars",
    "RetryField",
    "DecideItem",
    "NextItem",
    "TapPart",
    "FixPart",
    "NextLantern",
    "StartShed",
    "StartField",
    "StartShadows",
    "StartLantern",
    "LeaveShed",
    "LeaveField",
    "LeaveShadows",
    "LeaveLantern",
  ].includes(e.type);
/** A step inside one visit of trial 6: it starts and ends there, and is not a new visit. */
const within = ({ before, event: e, after }: Step) =>
  isCrown(before) && isCrown(after) && e.type !== "StartCrown";
/** The step starts or ends in trial 6. The run property judges only these steps (the #81 rule). */
const touchesTrial6 = (s: Step) => s.before.trial === 6 || s.after.trial === 6;

/** Which stage each stage may move to, and the one event that may move it. */
const moves: Record<Crown["stage"], { to: Crown["stage"][]; by: GameEvent["type"] }> = {
  telling: { to: ["giving"], by: "Tell" },
  giving: { to: ["going"], by: "GiveItem" },
  going: { to: ["giving", "checking"], by: "Go" },
  checking: { to: ["fixing", "lit"], by: "CheckLamp" },
  fixing: { to: ["checking"], by: "FixLamp" },
  lit: { to: ["telling", "clear"], by: "NextLamp" },
  clear: { to: [], by: "StartCrown" },
};

/** The chain number, with the clear counted as one past the last chain. */
const chainNo = (c: Crown) => (c.stage === "clear" ? lampCount : c.chain);

const lampOf = (c: Crown): Lamp | null =>
  c.stage === "checking" || c.stage === "fixing" ? c.lamp : null;

describe("trial 6's events do not break the base guarantees (properties)", () => {
  it("INV-1, INV-2: keeps phase in title|trial|over and trial a non-negative integer with the events of trial 6", () => {
    checkProperty(
      "crown-phase-and-trial-bounds",
      fc.property(anywhere, (list) => {
        for (const { after } of steps(list)) {
          expect(["title", "trial", "over"]).toContain(after.phase);
          expect(Number.isInteger(after.trial)).toBe(true);
          expect(after.trial).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });

  it("INV-3: never mutates the state it is given, with the events of trial 6 (frozen input does not throw)", () => {
    checkProperty(
      "crown-no-mutation",
      fc.property(anywhere, (list) => {
        list.reduce((s, e) => reduce(deepFreeze(s), e), structuredClone(initialState));
      }),
    );
  });

  it("INV-4: is deterministic, with the events of trial 6: replaying the same events gives the same state", () => {
    checkProperty(
      "crown-deterministic-replay",
      fc.property(anywhere, (list) => {
        expect(list.reduce(reduce, initialState)).toEqual(list.reduce(reduce, initialState));
      }),
    );
  });
});

describe("the chains (properties)", () => {
  it("INV-63: REQ-9.9.4: a chain follows the seed; the chain grows only by NextLamp after a lit lamp and stays below 3; wishes, jobs and slips change", () => {
    checkProperty(
      "crown-chains-follow-the-seed",
      fc.property(inCrown, (list) => {
        for (const st of steps(list).filter(within)) {
          const { before, event: e, after } = st;
          expect(after.crown.seed).toBe(before.crown.seed);
          const grew = chainNo(after.crown) - chainNo(before.crown);
          expect(grew === 0 || (grew === 1 && e.type === "NextLamp")).toBe(true);
          if (grew === 1) expect(before.crown.stage).toBe("lit");
          if (after.crown.stage !== "clear") expect(after.crown.chain).toBeLessThan(lampCount);
        }
      }),
    );
    checkProperty(
      "crown-chains-change-every-time",
      fc.property(seed, fc.integer({ min: 0, max: 1 }), (s, c) => {
        expect(differing(wishAt(s, c), wishAt(s, c + 1))).toEqual([...lampParts]);
        expect(slipAt(s, c + 1)).not.toBe(slipAt(s, c));
        expect(new Set([0, 1, 2].map((n) => jobAt(s, n))).size).toBe(3);
        expect(thingsAt(s, c + 1).indexOf(toolFor(s, c + 1))).not.toBe(
          thingsAt(s, c).indexOf(toolFor(s, c)),
        );
      }),
    );
  });

  it("INV-64: REQ-9.3: the stage moves only along the chain, each move by its own step's event, and never back to the tell inside a chain", () => {
    checkProperty(
      "crown-steps-go-in-order",
      fc.property(inCrown, (list) => {
        for (const st of steps(list).filter(within)) {
          const { before, event: e, after } = st;
          const from = before.crown.stage;
          const to = after.crown.stage;
          if (from === to) {
            if (e.type === "NextLamp") expect(after).toBe(before);
            continue;
          }
          expect(moves[from].to).toContain(to);
          expect(e.type).toBe(moves[from].by);
          if (to === "telling")
            expect(after.crown).toMatchObject({ chain: chainNo(before.crown) + 1 });
        }
      }),
    );
  });
});

describe("tell (properties)", () => {
  it("INV-65: REQ-9.4: SayLook sets exactly its part's told look; Tell with both tells exactly those looks, with one missing it notes the first missing part", () => {
    checkProperty(
      "crown-the-wisp-is-told-what-was-picked",
      fc.property(inCrown, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          const was = before.crown;
          if (!isCrown(before) || was.stage !== "telling") continue;
          if (e.type === "SayLook") {
            const part = partOfLook(e.look);
            if (part === null) {
              expect(after).toBe(before);
              continue;
            }
            expect(after.crown).toEqual({
              ...was,
              told: { ...was.told, [part]: e.look },
              note: null,
            });
          }
          if (e.type === "Tell") {
            const missing = lampParts.find((p) => was.told[p] === null);
            if (missing === undefined) {
              expect(after.crown).toEqual({
                stage: "giving",
                seed: was.seed,
                chain: was.chain,
                told: was.told,
                note: null,
              });
            } else {
              expect(after.crown).toEqual({ ...was, note: { kind: "missing", part: missing } });
            }
          }
        }
      }),
    );
  });
});

describe("give and go (properties)", () => {
  it("INV-66: REQ-9.5: a tool is held untried, a secret only notes it is a secret, a thing not on screen does nothing; Go tries exactly the tool held", () => {
    checkProperty(
      "crown-the-wisp-tries-the-tool-it-is-given",
      fc.property(inCrown, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          const was = before.crown;
          if (!isCrown(before)) continue;
          if (e.type === "GiveItem" && was.stage === "giving") {
            const { seed: s, chain: n, told } = was;
            if (!thingsAt(s, n).includes(e.thing)) expect(after).toBe(before);
            else if ((items as readonly Thing[]).includes(e.thing))
              expect(after.crown).toEqual({ ...was, note: { kind: "secret", thing: e.thing } });
            else
              expect(after.crown).toEqual({
                stage: "going",
                seed: s,
                chain: n,
                told,
                tool: e.thing,
              });
          }
          if (e.type === "Go" && was.stage === "going") {
            const { seed: s, chain: n, told, tool } = was;
            if (tool === toolFor(s, n)) {
              expect(after.crown).toMatchObject({ stage: "checking", note: null });
            } else {
              expect(after.crown).toEqual({
                stage: "giving",
                seed: s,
                chain: n,
                told,
                note: { kind: "stuck", tool },
              });
            }
          }
        }
      }),
    );
  });

  it("INV-67: REQ-9.6.1: the made lamp keeps the told looks but the slip part, which is neither the told look nor the wish's, so it is never the wish", () => {
    checkProperty(
      "crown-the-made-lamp-slips-in-one-part",
      fc.property(inCrown, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          const was = before.crown;
          if (!isCrown(before) || e.type !== "Go" || was.stage !== "going") continue;
          if (after.crown.stage !== "checking") continue;
          const { seed: s, chain: n, told } = was;
          const made = after.crown.lamp;
          const slip = slipAt(s, n);
          expect(made).toEqual(madeAt(s, n, told));
          for (const part of lampParts) {
            if (part === slip) {
              expect(made[part]).not.toBe(told[part]);
              expect(made[part]).not.toBe(wishAt(s, n)[part]);
            } else {
              expect(made[part]).toBe(told[part]);
            }
          }
          expect(sameLamp(made, wishAt(s, n))).toBe(false);
        }
      }),
    );
  });
});

describe("check and fix (properties)", () => {
  it("INV-68: REQ-9.6: 'same' on the wish lights it, 'not the same' on a lamp that differs goes to the fix, the other two only note; a lamp is lit only that way", () => {
    checkProperty(
      "crown-only-a-checked-lamp-is-lit",
      fc.property(inCrown, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          const was = before.crown;
          if (!isCrown(before)) continue;
          if (after.crown.stage === "lit" && was.stage !== "lit" && isCrown(after)) {
            expect(e).toEqual({ type: "CheckLamp", same: true });
            expect(was.stage === "checking" && sameLamp(was.lamp, wishOf(was))).toBe(true);
          }
          if (e.type !== "CheckLamp" || was.stage !== "checking") continue;
          const right = sameLamp(was.lamp, wishOf(was));
          if (e.same && right)
            expect(after.crown).toEqual({ stage: "lit", seed: was.seed, chain: was.chain });
          else if (!e.same && !right)
            expect(after.crown).toEqual({ ...was, stage: "fixing", part: null, note: null });
          else expect(after.crown).toEqual({ ...was, note: { kind: "again" } });
        }
      }),
    );
  });

  it("INV-69: REQ-9.7: a point opens the cards of a part that differs or notes a part that is the same; a card changes exactly the pointed part to exactly that look", () => {
    checkProperty(
      "crown-the-fix-changes-only-that-part",
      fc.property(inCrown, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          const was = before.crown;
          if (!isCrown(before) || was.stage !== "fixing") continue;
          const wish = wishOf(was);
          if (e.type === "PointLamp") {
            expect(lampOf(after.crown)).toEqual(was.lamp);
            if (was.lamp[e.part] !== wish[e.part])
              expect(after.crown).toEqual({ ...was, part: e.part, note: null });
            else
              expect(after.crown).toEqual({
                ...was,
                part: null,
                note: { kind: "fine", part: e.part },
              });
          }
          if (e.type === "FixLamp") {
            const cards = was.part === null ? [] : cardsFor(was.lamp, was.part);
            if (!cards.includes(e.look)) {
              expect(after).toBe(before);
              continue;
            }
            expect(cards).toHaveLength(2);
            expect(cards).not.toContain(was.lamp[was.part!]);
            expect(after.crown).toEqual({
              stage: "checking",
              seed: was.seed,
              chain: was.chain,
              lamp: { ...was.lamp, [was.part!]: e.look },
              note: { kind: "said", look: e.look },
            });
          }
        }
      }),
    );
  });
});

describe("the clear, the run and isolation (properties)", () => {
  it("INV-70: REQ-9.9.3: the trial is clear only after NextLamp on the third lit lamp, and the clear stays until StartCrown or LeaveCrown", () => {
    checkProperty(
      "crown-clear-after-three-lamps",
      fc.property(inCrown, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (!isCrown(before)) continue;
          if (before.crown.stage === "clear") {
            if (e.type !== "StartCrown" && e.type !== "LeaveCrown")
              expect(after.crown).toBe(before.crown);
            continue;
          }
          if (after.crown.stage === "clear") {
            expect(e.type).toBe("NextLamp");
            expect(before.crown).toMatchObject({ stage: "lit", chain: lampCount - 1 });
          }
        }
      }),
    );
  });

  it("INV-71: REQ-9.9.1: trial 6 has no clock and no score: every step that starts or ends in trial 6, Tick included, leaves the run equal", () => {
    checkProperty(
      "crown-no-clock-no-score",
      fc.property(inCrown, (list) => {
        for (const st of steps(list).filter(touchesTrial6)) {
          expect(st.after.run).toBe(st.before.run);
          if (st.event.type === "Tick" && isCrown(st.before)) expect(st.after).toBe(st.before);
        }
      }),
    );
  });

  it("INV-72: REQ-9.11: the crown's events act only in trial 6 and change only crown; crown is initial outside it; in trial 6 the other trials' events do nothing", () => {
    checkProperty(
      "crown-events-stay-in-trial-6",
      fc.property(anywhere, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (isCrownEvent(e) && !isCrown(before)) expect(after).toBe(before);
          if (isCrownEvent(e) && isCrown(before))
            expect(after).toEqual({ ...before, crown: after.crown });
          if (after.trial !== 6) expect(after.crown).toEqual(initialCrown);
          if (isCrown(before) && otherTrial(e)) expect(after).toBe(before);
          if (isCrown(after)) {
            expect(after.lane).toEqual(initialLane);
            expect(after.shed).toEqual(initialShed);
            expect(after.field).toEqual(initialField);
            expect(after.shadows).toEqual(initialShadows);
            expect(after.lantern).toEqual(initialLantern);
          }
        }
      }),
    );
  });

  it("INV-73: REQ-9.10.4: LeaveCrown in any stage of trial 6 goes to the title and drops the crown, keeping everything else; elsewhere it returns the same state", () => {
    checkProperty(
      "crown-leave-goes-to-the-title",
      fc.property(inCrown, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "LeaveCrown") continue;
          if (!isCrown(before)) expect(after).toBe(before);
          else expect(after).toEqual({ ...before, phase: "title", trial: 0, crown: initialCrown });
        }
      }),
    );
  });

  it("INV-74: REQ-9.1.2, REQ-9.10.2: StartCrown from the title or the clear begins a visit at the tell step of chain 0 and changes nothing else; anywhere else it returns the same state", () => {
    checkProperty(
      "crown-start-begins-a-visit",
      fc.property(inCrown, (list) => {
        for (const { before, event: e, after } of steps(list)) {
          if (e.type !== "StartCrown") continue;
          const starts =
            before.phase === "title" || (isCrown(before) && before.crown.stage === "clear");
          if (!starts) expect(after).toBe(before);
          else
            expect(after).toEqual({ ...before, phase: "trial", trial: 6, crown: newCrown(e.seed) });
        }
      }),
    );
  });
});

describe("the generator for trial 6 is not empty", () => {
  // Sampled in each test, not when the file loads, so the reducer paths it takes count as covered by these tests
  // (ADR 0005).
  let all: Step[] = [];
  beforeEach(() => {
    all = fc
      .sample(inCrown, { numRuns: 400, seed: 6 })
      .map((list) => steps(list).filter((s) => isCrown(s.before)))
      .flat();
  });
  const notes = (kind: string) =>
    all.some(
      (s) => "note" in s.after.crown && s.after.crown.note?.kind === kind && isCrown(s.after),
    );

  it("reaches every stage, every note and the last chain", () => {
    const stages = new Set(all.map((s) => s.after.crown.stage));
    expect([...stages].sort()).toEqual(
      ["checking", "clear", "fixing", "giving", "going", "lit", "telling"].sort(),
    );
    for (const kind of ["missing", "secret", "stuck", "again", "said", "fine"])
      expect(notes(kind), kind).toBe(true);
    expect(all.some((s) => s.after.crown.stage !== "clear" && s.after.crown.chain === 2)).toBe(
      true,
    );
  });

  it("gives things that are not on screen, picks a handle's look, and a card that is no card", () => {
    expect(
      all.some(
        (s) =>
          s.event.type === "GiveItem" &&
          s.before.crown.stage === "giving" &&
          !thingsAt(s.before.crown.seed, s.before.crown.chain).includes(s.event.thing),
      ),
    ).toBe(true);
    expect(all.some((s) => s.event.type === "SayLook" && partOfLook(s.event.look) === null)).toBe(
      true,
    );
    expect(
      all.some(
        (s) =>
          s.event.type === "FixLamp" && s.before.crown.stage === "fixing" && s.after === s.before,
      ),
    ).toBe(true);
  });

  it("plays again from the clear, leaves for the title, and meets the other trials' events, ticks and a language change", () => {
    expect(all.some((s) => s.event.type === "StartCrown" && s.before.crown.stage === "clear")).toBe(
      true,
    );
    expect(all.some((s) => s.event.type === "LeaveCrown")).toBe(true);
    const kinds = new Set<string>(all.map((s) => s.event.type));
    for (const k of [
      "Ask",
      "PickTool",
      "SortStar",
      "DecideItem",
      "TapPart",
      "Tick",
      "Start",
      "SetLang",
    ]) {
      expect(kinds.has(k), k).toBe(true);
    }
  });
});
