// Helpers for the trial 6 (The Hollow Crown) smoke. Presses are real taps or clicks; the picture is read from a
// screenshot, because it is drawn on the canvas and a state that says "lit" would pass even if the town stayed dark.
// Every reading is by brightness, not by color, so the same readings hold on a grayscale screen.
// Spec: .kiro/specs/09-trial-hollow-crown/design.md, "How the smoke sees the picture".

import { expect, type Page } from "@playwright/test";
import {
  cardsOf,
  lampParts,
  sameLamp,
  slipAt,
  thingsAt,
  toolFor,
  wishOf,
  type Crown,
  type LampPart,
  type Thing,
} from "../src/domain/crown";
import { looksOf, type LookId } from "../src/domain/lantern";
import {
  crownMessage,
  lampPanel,
  lampRow,
  oneButton,
  probes,
  tellButton,
  tellCard,
  thingTile,
  titleCrownButton,
  twoButtons,
} from "../src/game/crown-layout";
import type { Rect } from "../src/game/lane-layout";
import { leaveButton } from "../src/game/shed-layout";
import type { Point } from "../src/game/steer";
import { gameState, pressUntil, type GameState, type Press } from "./helpers";
import type { Rgb } from "./pixels";
import { colorsAt, nextSeed } from "./shed-helpers";

const centerOf = (r: Rect): Point => ({ x: r.x, y: r.y });
const crownOf = async (page: Page): Promise<Crown> => (await gameState(page)).crown;
const stageIs = (stage: Crown["stage"]) => (s: GameState) => s.crown.stage === stage;

/** Taps the title's trial 6 button until trial 6 is open (the scene registers its input after loading). */
export async function enterCrown(page: Page, press: Press, seed = 0) {
  await nextSeed(page, seed);
  await pressUntil(page, press, centerOf(titleCrownButton), (s) => s.trial === 6);
}

/** Presses a tell card until its part has that look. */
export async function sayLook(page: Page, press: Press, look: LookId) {
  const part = lampParts.find((p) => looksOf[p].includes(look))!;
  const at = centerOf(tellCard(part, looksOf[part].indexOf(look)));
  await pressUntil(
    page,
    press,
    at,
    (s) => s.crown.stage === "telling" && s.crown.told[part] === look,
  );
}

/** Presses "Tell" until `done`: the give step, or the wisp asking for the missing part. */
export const pressTell = (page: Page, press: Press, done: (s: GameState) => boolean) =>
  pressUntil(page, press, centerOf(tellButton), done);

/** Presses the tile of `thing` until `done`. The tiles' places come from the seed and the chain. */
export async function giveThing(
  page: Page,
  press: Press,
  thing: Thing,
  done: (s: GameState) => boolean,
) {
  const c = await crownOf(page);
  const index = c.stage === "giving" ? thingsAt(c.seed, c.chain).indexOf(thing) : -1;
  expect(index, `${thing} is on screen`).toBeGreaterThanOrEqual(0);
  await pressUntil(page, press, centerOf(thingTile(index)), done);
}

/** Presses "Go!" until the wisp has tried the tool. */
export const pressGo = (page: Page, press: Press) =>
  pressUntil(page, press, centerOf(oneButton), (s) => s.crown.stage !== "going");

/** Presses "Same" (the left button) or "Different" (the right one) until `done`. */
export const pressCheck = (
  page: Page,
  press: Press,
  same: boolean,
  done: (s: GameState) => boolean,
) => pressUntil(page, press, centerOf(twoButtons[same ? 0 : 1]), done);

/** Taps a part of the wisp's lamp until `done`. */
export const tapPart = (
  page: Page,
  press: Press,
  part: LampPart,
  done: (s: GameState) => boolean,
) => pressUntil(page, press, centerOf(lampRow(part)), done);

/** Presses the fix card for `look` until the child is back at the check. */
export async function pressFix(page: Page, press: Press, look: LookId) {
  const index = cardsOf(await crownOf(page)).indexOf(look);
  expect(index, `${look} is a card`).toBeGreaterThanOrEqual(0);
  await pressUntil(page, press, centerOf(twoButtons[index]!), stageIs("checking"));
}

/** Presses the wide button ("Next", "Play again") until `done`. */
export const pressWide = (page: Page, press: Press, done: (s: GameState) => boolean) =>
  pressUntil(page, press, centerOf(oneButton), done);

/** The way back to the title: the shed's button, always there. */
export const leaveToTitle = (page: Page, press: Press) =>
  pressUntil(page, press, centerOf(leaveButton), (s) => s.phase === "title");

/** One chain straight through with taps: tell the wish, give the tool, go, different, fix the slip, same. */
export async function playChain(page: Page, press: Press) {
  const c = await crownOf(page);
  const wish = wishOf(c);
  await sayLook(page, press, wish.roof);
  await sayLook(page, press, wish.light);
  await pressTell(page, press, stageIs("giving"));
  await giveThing(page, press, toolFor(c.seed, chainNo(c)), stageIs("going"));
  await pressGo(page, press);
  await pressCheck(page, press, false, stageIs("fixing"));
  const slip = slipAt(c.seed, chainNo(c));
  await tapPart(page, press, slip, (s) => s.crown.stage === "fixing" && s.crown.part === slip);
  await pressFix(page, press, wish[slip]);
  const now = await crownOf(page);
  expect(now.stage === "checking" && sameLamp(now.lamp, wish)).toBe(true);
  await pressCheck(page, press, true, stageIs("lit"));
}

const chainNo = (c: Crown) => (c.stage === "clear" ? 2 : c.chain);

// What is on the screen.

/** Brightness 0 to 255 by the weights a grayscale screen uses. */
const luma = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Gold (a frame, a tick, a badge, a ray) reads about 200; the panels about 45 and the sky darker. */
const bright = 130;

const stepRow: Rect = { x: 195, y: 26, width: 390, height: 52 };

/** The marks of the row of steps, from what is drawn: a solid frame (now), a tick (done) or neither. */
async function stepsNow(page: Page): Promise<string[]> {
  const points = [0, 1, 2, 3, 4].flatMap((i) => [probes.stepFrame(i), probes.stepTick(i)]);
  const values = (await colorsAt(page, stepRow, points)).map((c) => luma(c) > bright);
  return [0, 1, 2, 3, 4].map((i) => {
    if (values[2 * i]) return "now";
    return values[2 * i + 1] ? "done" : "later";
  });
}

export async function expectSteps(page: Page, marks: string[]) {
  await expect.poll(() => stepsNow(page), { timeout: 5_000 }).toEqual(marks);
}

const controlsArea: Rect = { x: 195, y: 455, width: 390, height: 200 };

/** The tell cards whose picked badge is drawn, as looks. */
async function pickedNow(page: Page): Promise<LookId[]> {
  const cards = lampParts.flatMap((part) =>
    looksOf[part].map((look, i) => ({ look, rect: tellCard(part, i) })),
  );
  const values = await colorsAt(
    page,
    controlsArea,
    cards.map((c) => probes.badge(c.rect)),
  );
  return cards.filter((_, i) => luma(values[i]!) > bright).map((c) => c.look);
}

export async function expectPicked(page: Page, looks: LookId[]) {
  await expect.poll(() => pickedNow(page), { timeout: 5_000 }).toEqual(looks);
}

const panelArea: Rect = { x: lampPanel.x, y: lampPanel.y - 10, width: 190, height: 210 };

/** The tick badge of the wisp's panel: bright exactly when the lamp is lit. */
export async function expectLampBadge(page: Page, lit: boolean) {
  const read = async () =>
    luma((await colorsAt(page, panelArea, [probes.badge(lampPanel)]))[0]!) > bright;
  await expect.poll(read, { timeout: 5_000 }).toBe(lit);
}

const townArea: Rect = { x: 120, y: 796, width: 220, height: 70 };

/** The town's lamps, from the left: lit exactly when the top ray is drawn. */
export async function expectTown(page: Page, lit: boolean[]) {
  const read = async () =>
    (
      await colorsAt(
        page,
        townArea,
        [0, 1, 2].map((i) => probes.townRay(i)),
      )
    ).map((c) => luma(c) > bright);
  await expect.poll(read, { timeout: 5_000 }).toEqual(lit);
}

/** The message place, for counting text and for fingerprints. */
export const messageBox: Rect = {
  x: crownMessage.x,
  y: crownMessage.y,
  width: crownMessage.wrap,
  height: crownMessage.height,
};

/** The area of the step's controls, for a fingerprint that changes with the step. */
export const controlsBox: Rect = controlsArea;

/** The inside of a part's row on the wisp's panel, clear of its frame: for a fingerprint of its picture. */
export const partArt = (part: LampPart): Rect => ({ ...lampRow(part), width: 136, height: 56 });
