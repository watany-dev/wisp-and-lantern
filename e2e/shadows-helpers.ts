// Helpers for the trial 4 (The Listening Shadows) smoke. Presses are real taps or clicks; the picture is read
// from a screenshot, because it is drawn on the canvas and a state that says "given" would pass even if the
// bubble stayed empty. Every reading is by brightness, not by color, so the same readings hold on a grayscale
// screen. Spec: .kiro/specs/07-trial-keep-secrets/design.md, "How the smoke sees the picture".

import { expect, type Page } from "@playwright/test";
import { isSecret, itemOf, type Choice, type ItemId } from "../src/domain/shadows";
import { buttonRects, type ButtonSlot } from "../src/game/field-layout";
import { buttonRect, type Rect } from "../src/game/lane-layout";
import {
  bubbleBox,
  itemTile,
  probes,
  shadowsMessage,
  titleShadowsButton,
  whyBox,
} from "../src/game/shadows-layout";
import { leaveButton, overLeave } from "../src/game/shed-layout";
import { gameState, pressUntil, type GameState, type Press } from "./helpers";
import { colorsAt, nextSeed } from "./shed-helpers";
import type { Rgb } from "./pixels";

/** The initial state of trial 4 at a round: nothing decided. */
export const freshShadows = (seed: number, round: number) =>
  ({ stage: "deciding", seed, round }) as const;

/** The item of the round the game is in. The seed is rigged by the test, but the state is the truth. */
export const itemNow = (s: GameState): ItemId => itemOf(s.shadows);

/** The decision that is right for the item of the round the game is in. */
export const rightChoice = (s: GameState): Choice => (isSecret(itemNow(s)) ? "keep" : "give");
export const wrongChoice = (s: GameState): Choice => (rightChoice(s) === "give" ? "keep" : "give");

/** Taps the title's trial 4 button until trial 4 is open (the scene registers its input after loading). */
export async function enterShadows(page: Page, press: Press, seed = 0) {
  await nextSeed(page, seed);
  await pressUntil(
    page,
    press,
    { x: titleShadowsButton.x, y: titleShadowsButton.y },
    (s) => s.trial === 4,
  );
}

const center = (slot: ButtonSlot) => ({ x: buttonRects[slot].x, y: buttonRects[slot].y });
const slotOf: Record<Choice, ButtonSlot> = { give: "left", keep: "right" };

/** Taps a decision button until the round is decided with that choice. */
export const decide = (page: Page, press: Press, choice: Choice) =>
  pressUntil(
    page,
    press,
    center(slotOf[choice]),
    (s) => s.shadows.stage === "decided" && s.shadows.choice === choice,
  );

/** The next item's button (the wide button after a decision): taps until the next round is deciding. */
export async function nextItem(page: Page, press: Press) {
  const before = (await gameState(page)).shadows.round;
  await pressUntil(
    page,
    press,
    center("single"),
    (s) => s.shadows.stage === "deciding" && s.shadows.round === before + 1,
  );
}

/** The way back to the title on trial 4's screen: the shed's button, always there. */
export const leaveToTitle = (page: Page, press: Press) =>
  pressUntil(page, press, { x: leaveButton.x, y: leaveButton.y }, (s) => s.phase === "title");

/** The end screen's play-again button: taps until a new run of trial 4 has begun (the screen ignores early taps). */
export const playAgain = (page: Page, press: Press) =>
  pressUntil(
    page,
    press,
    { x: buttonRect.x, y: buttonRect.y },
    (s) => s.phase === "trial" && s.trial === 4,
  );

/** The end screen's title button. */
export const leaveFromEnd = (page: Page, press: Press) =>
  pressUntil(page, press, { x: overLeave.x, y: overLeave.y }, (s) => s.phase === "title");

// What is on the screen.

/** Brightness 0 to 255 by the weights a grayscale screen uses. */
const luma = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** The tile and the badges that stick out of its corners. */
const tileArea: Rect = {
  x: itemTile.x,
  y: itemTile.y,
  width: itemTile.width + 40,
  height: itemTile.height + 40,
};

/** A badge disc is gold (bright, luma about 210) where the tile and the sky are dark (under 60). */
const badgeLuma = 150;

/** Which badges are on the tile: the tick (a right decision) and the padlock (kept). */
async function badgesNow(page: Page): Promise<{ tick: boolean; lock: boolean }> {
  const [tick, lock] = await colorsAt(page, tileArea, [probes.tick, probes.lock]);
  return { tick: luma(tick!) > badgeLuma, lock: luma(lock!) > badgeLuma };
}

/** Exactly these badges are on the tile. */
export async function expectBadges(page: Page, shown: { tick: boolean; lock: boolean }) {
  await expect.poll(() => badgesNow(page), { timeout: 5_000 }).toEqual(shown);
}

/** What the shadow's bubble shows: nothing, the item it heard, or three quiet dots. */
export type Heard = "none" | "item" | "quiet";

const bubbleArea: Rect = {
  x: bubbleBox.x,
  y: bubbleBox.y,
  width: bubbleBox.width + 20,
  height: bubbleBox.height + 20,
};

async function heardNow(page: Page): Promise<Heard> {
  const corner = {
    x: bubbleBox.x - bubbleBox.width / 2 + 8,
    y: bubbleBox.y - bubbleBox.height / 2 + 8,
  };
  const dots = [-18, 0, 18].map((dx) => ({ x: bubbleBox.x + dx, y: bubbleBox.y }));
  const [face, ...dot] = (await colorsAt(page, bubbleArea, [corner, ...dots])).map(luma);
  // The face is cream (about 240); with no bubble the sky is there instead.
  if (face! < 150) return "none";
  return dot.every((v) => v < 90) ? "quiet" : "item";
}

export async function expectHeard(page: Page, heard: Heard) {
  await expect.poll(() => heardNow(page), { timeout: 5_000 }).toBe(heard);
}

/** The message and the closing line places, for counting text and for fingerprints. */
export const messageBox: Rect = {
  x: shadowsMessage.x,
  y: shadowsMessage.y,
  width: shadowsMessage.wrap,
  height: shadowsMessage.height,
};
export const closingBox: Rect = { ...whyBox, height: 58 };
export const tileArt: Rect = { x: itemTile.x, y: itemTile.y - 14, width: 90, height: 90 };
export const bubbleContent: Rect = { x: bubbleBox.x, y: bubbleBox.y, width: 72, height: 44 };
