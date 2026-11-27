// Trial 6 (The Hollow Crown): the last trial, with no clock and no score. Each of the town's three lamps is one chain
// of five steps: tell the wisp the lamp (a roof and a light), give it the tool for the job at the shed's door (never a
// secret), ask it to go, check the lamp it made against the wish, and fix the one part that is not the same (where,
// then how). A lamp is lit only by a check that says "same" on the wish. Three lit lamps clear the trial.
// Rules only: no text, no layout. See .kiro/specs/09-trial-hollow-crown/design.md.

import type { CrownEvent } from "./events";
import { looksOf, type LookId } from "./lantern";
import type { ItemId } from "./shadows";
import { answerOf, tools, type PuzzleId, type ToolId } from "./shed";

/** The two parts of a lamp, from the top. Their looks are trial 5's. */
export const lampParts = ["roof", "light"] as const;

export type LampPart = (typeof lampParts)[number];

/** A lamp: a look for each part. */
export type Lamp = Readonly<Record<LampPart, LookId>>;

/** What the child has picked in the tell step: a look for each part, or none yet. */
export type Told = Readonly<Record<LampPart, LookId | null>>;

/** What blocks the shed's door in a chain. Each job has one tool that clears it (trial 2's `answerOf`). */
export const jobs = ["leaves", "boards", "rope"] as const satisfies readonly PuzzleId[];

export type JobId = (typeof jobs)[number];

/** The three secrets of trial 4. */
const secrets = ["houseKey", "address", "password"] as const satisfies readonly ItemId[];

/** What the child can give in the give step: a tool or a secret. */
export type Thing = ToolId | ItemId;

/** How many lamps the town has: the trial is clear when all are lit. */
export const lampCount = 3;

type TellNote = { kind: "missing"; part: LampPart } | null;
type GiveNote = { kind: "secret"; thing: ItemId } | { kind: "stuck"; tool: ToolId } | null;
type CheckNote = { kind: "again" } | { kind: "said"; look: LookId } | null;
type FixNote = { kind: "fine"; part: LampPart } | null;

/**
 * The five steps of a chain, then the lit lamp and the clear. `seed` and `chain` say which wish, job, things and slip
 * this is (`wishAt`, `jobAt`, `thingsAt`, `slipAt`); they are never stored. `told` is what the child picked or told;
 * `lamp` is the lamp the wisp has now, which is the made lamp until a fix changes a part.
 */
export type Crown =
  | { stage: "telling"; seed: number; chain: number; told: Told; note: TellNote }
  | { stage: "giving"; seed: number; chain: number; told: Lamp; note: GiveNote }
  | { stage: "going"; seed: number; chain: number; told: Lamp; tool: ToolId }
  | { stage: "checking"; seed: number; chain: number; lamp: Lamp; note: CheckNote }
  | {
      stage: "fixing";
      seed: number;
      chain: number;
      lamp: Lamp;
      part: LampPart | null;
      note: FixNote;
    }
  | { stage: "lit"; seed: number; chain: number }
  | { stage: "clear"; seed: number };

export type CrownStage = Crown["stage"];

const nothingTold: Told = { roof: null, light: null };

export const initialCrown: Crown = {
  stage: "telling",
  seed: 0,
  chain: 0,
  told: nothingTold,
  note: null,
};

/** The `n`-th digit of the seed in base 3. The chains of a seed are built from its digits. */
const digit = (seed: number, n: number) => Math.floor(seed / 3 ** n) % 3;

const lookAt = (part: LampPart, index: number): LookId => looksOf[part][index % 3]!;

/** The wish of a chain: both parts change from one chain to the next. */
export function wishAt(seed: number, chain: number): Lamp {
  return {
    roof: lookAt("roof", digit(seed, 0) + chain),
    light: lookAt("light", digit(seed, 1) + 2 * chain),
  };
}

/** The six orders of the three jobs. The seed picks one, so each job comes once in a visit. */
const jobOrders: readonly (readonly JobId[])[] = [
  ["leaves", "boards", "rope"],
  ["leaves", "rope", "boards"],
  ["boards", "leaves", "rope"],
  ["boards", "rope", "leaves"],
  ["rope", "leaves", "boards"],
  ["rope", "boards", "leaves"],
];

export function jobAt(seed: number, chain: number): JobId {
  return jobOrders[Math.floor(seed / 3 ** 8) % 6]![chain % 3]!;
}

/** The tool that clears the job of a chain. */
export function toolFor(seed: number, chain: number): ToolId {
  return answerOf(jobAt(seed, chain));
}

/**
 * The three things of a chain, in their places: the job's tool, the tool of the next chain's job (a real tool, for
 * another job) and a secret. The places turn by one each chain, so the job's tool is never in the same place twice
 * in a row.
 */
export function thingsAt(seed: number, chain: number): Thing[] {
  const things: Thing[] = [
    toolFor(seed, chain),
    toolFor(seed, chain + 1),
    secrets[(digit(seed, 2) + chain) % 3]!,
  ];
  const turn = (digit(seed, 3) + chain) % 3;
  return [...things.slice(turn), ...things.slice(0, turn)];
}

/** The part the wisp makes differently in a chain. It alternates from chain to chain. */
export function slipAt(seed: number, chain: number): LampPart {
  return lampParts[(digit(seed, 4) + chain) % 2]!;
}

/**
 * The lamp the wisp makes from what it was told: the told lamp, with the slip part in a look that is neither the
 * told look nor the wish's. So the made lamp is never the wish.
 */
export function madeAt(seed: number, chain: number, told: Lamp): Lamp {
  const part = slipAt(seed, chain);
  const wish = wishAt(seed, chain)[part];
  const others = looksOf[part].filter((look) => look !== told[part] && look !== wish);
  return { ...told, [part]: others[(digit(seed, 5) + chain) % others.length]! };
}

/** Trial 6 for a new visit: the tell step of chain 0. The seed is a whole number, so a stray value plays the same. */
export function newCrown(seed: number): Crown {
  return { ...initialCrown, seed: seed >>> 0 };
}

/** The chain the child is in; on the clear, the last one. */
export function chainOf(crown: Crown): number {
  return crown.stage === "clear" ? lampCount - 1 : crown.chain;
}

export function wishOf(crown: Crown): Lamp {
  return wishAt(crown.seed, chainOf(crown));
}

export const sameLamp = (a: Lamp, b: Lamp) => lampParts.every((part) => a[part] === b[part]);

/** The part a look belongs to, or `null` when it is no roof's or light's look (a handle's). */
export function partOfLook(look: LookId): LampPart | null {
  return lampParts.find((part) => looksOf[part].includes(look)) ?? null;
}

/** The looks of `part` other than the one it has now, in the order that follows it round the three: the two cards. */
export function cardsFor(lamp: Lamp, part: LampPart): LookId[] {
  const now = looksOf[part].indexOf(lamp[part]);
  return [lookAt(part, now + 1), lookAt(part, now + 2)];
}

/** The two fix cards while a part is pointed at. None otherwise. */
export function cardsOf(crown: Crown): LookId[] {
  return crown.stage === "fixing" && crown.part !== null ? cardsFor(crown.lamp, crown.part) : [];
}

/** How many lamps of the town are lit: the chains before this one, and this one once it is lit. */
export function litCount(crown: Crown): number {
  if (crown.stage === "clear") return lampCount;
  return crown.stage === "lit" ? crown.chain + 1 : crown.chain;
}

/** A card picks a look for its part. A look that is no roof's or light's does nothing. */
function say(crown: Crown, look: LookId): Crown {
  const part = partOfLook(look);
  if (crown.stage !== "telling" || part === null) return crown;
  if (crown.told[part] === look && crown.note === null) return crown;
  return { ...crown, told: { ...crown.told, [part]: look }, note: null };
}

/** The request: with both parts picked the wisp is told; with one missing it asks for that one and waits. */
function tell(crown: Crown): Crown {
  if (crown.stage !== "telling") return crown;
  const { seed, chain } = crown;
  const { roof, light } = crown.told;
  if (roof !== null && light !== null) {
    return { stage: "giving", seed, chain, told: { roof, light }, note: null };
  }
  const missing: LampPart = roof === null ? "roof" : "light";
  if (crown.note?.part === missing) return crown;
  return { ...crown, note: { kind: "missing", part: missing } };
}

/** A thing is given. A tool goes to the wisp; a secret is not a tool and moves nothing on. */
function give(crown: Crown, thing: Thing): Crown {
  if (crown.stage !== "giving" || !thingsAt(crown.seed, crown.chain).includes(thing)) return crown;
  const { seed, chain, told } = crown;
  if (!isTool(thing)) {
    // A chain has one secret, so a secret note is always about this one.
    if (crown.note?.kind === "secret") return crown;
    return { ...crown, note: { kind: "secret", thing } };
  }
  return { stage: "going", seed, chain, told, tool: thing };
}

const toolThings: readonly Thing[] = tools;
const isTool = (thing: Thing): thing is ToolId => toolThings.includes(thing);

/** The wisp tries exactly the tool it holds. The job's tool opens the shed and the wisp makes the lamp. */
function go(crown: Crown): Crown {
  if (crown.stage !== "going") return crown;
  const { seed, chain, told, tool } = crown;
  if (tool !== toolFor(seed, chain)) {
    return { stage: "giving", seed, chain, told, note: { kind: "stuck", tool } };
  }
  return { stage: "checking", seed, chain, lamp: madeAt(seed, chain, told), note: null };
}

/** "Same" on the wish lights it, "not the same" on a lamp that differs goes to the fix; the rest: look again. */
function check(crown: Crown, same: boolean): Crown {
  if (crown.stage !== "checking") return crown;
  const { seed, chain, lamp } = crown;
  const right = sameLamp(lamp, wishOf(crown));
  if (same && right) return { stage: "lit", seed, chain };
  if (!same && !right) return { stage: "fixing", seed, chain, lamp, part: null, note: null };
  if (crown.note?.kind === "again") return crown;
  return { ...crown, note: { kind: "again" } };
}

/** Where: a part that is not the wish's opens its two cards; a part that is the same is fine. */
function point(crown: Crown, part: LampPart): Crown {
  if (crown.stage !== "fixing") return crown;
  if (crown.lamp[part] !== wishOf(crown)[part]) {
    return crown.part === part ? crown : { ...crown, part, note: null };
  }
  // A note is only there while nothing is pointed at.
  if (crown.note?.part === part) return crown;
  return { ...crown, part: null, note: { kind: "fine", part } };
}

/** How: the pointed part takes exactly the look on the card, nothing else changes, and the child checks again. */
function fixLamp(crown: Crown, look: LookId): Crown {
  if (crown.stage !== "fixing" || crown.part === null) return crown;
  const { seed, chain, lamp, part } = crown;
  if (!cardsFor(lamp, part).includes(look)) return crown;
  const fixed = { ...lamp, [part]: look };
  return { stage: "checking", seed, chain, lamp: fixed, note: { kind: "said", look } };
}

/** After a lit lamp, the next chain; after the last one, the clear. */
function next(crown: Crown): Crown {
  if (crown.stage !== "lit") return crown;
  const { seed, chain } = crown;
  if (chain + 1 >= lampCount) return { stage: "clear", seed };
  return { stage: "telling", seed, chain: chain + 1, told: nothingTold, note: null };
}

/** Returns `crown` itself when the event changes nothing. Starting and leaving the trial are the reducer's. */
export function reduceCrown(crown: Crown, event: CrownEvent): Crown {
  switch (event.type) {
    case "SayLook":
      return say(crown, event.look);
    case "Tell":
      return tell(crown);
    case "GiveItem":
      return give(crown, event.thing);
    case "Go":
      return go(crown);
    case "CheckLamp":
      return check(crown, event.same);
    case "PointLamp":
      return point(crown, event.part);
    case "FixLamp":
      return fixLamp(crown, event.look);
    case "NextLamp":
      return next(crown);
  }
}
