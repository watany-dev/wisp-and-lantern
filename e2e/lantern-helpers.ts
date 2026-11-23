// Helpers for the trial 5 (The Flickering Lantern) smoke. Presses are real taps or clicks; the picture is read from a
// screenshot, because it is drawn on the canvas and a state that says "lit" would pass even if the light stayed dim.
// Every reading is by brightness, not by color, so the same readings hold on a grayscale screen.
// Spec: .kiro/specs/08-trial-tell-whats-wrong/design.md, "How the smoke sees the picture".

import { expect, type Page } from "@playwright/test";
import { cardsOf, faultAt, parts, wishOf, type LookId, type PartId } from "../src/domain/lantern";
import { buttonRects } from "../src/game/field-layout";
import { buttonRect, type Rect } from "../src/game/lane-layout";
import {
  lanternMessage,
  lanternPanel,
  partProbes,
  partRect,
  probes,
  titleLanternButton,
  wishPanel,
} from "../src/game/lantern-layout";
import type { PartMark } from "../src/game/lantern-view";
import { leaveButton, overLeave } from "../src/game/shed-layout";
import { gameState, pressUntil, type GameState, type Press } from "./helpers";
import { colorsAt, nextSeed } from "./shed-helpers";
import type { Rgb } from "./pixels";

/** The part that flickers in the round the game is in. The seed is rigged by the test, but the state is the truth. */
export const faultNow = (s: GameState): PartId => faultAt(s.lantern.seed, s.lantern.round);

/** The right card for the round the game is in: the wish's look for the part that flickers. */
export const rightLook = (s: GameState): LookId => wishOf(s.lantern)[faultNow(s)];

/** Taps the title's trial 5 button until trial 5 is open (the scene registers its input after loading). */
export async function enterLantern(page: Page, press: Press, seed = 0) {
  await nextSeed(page, seed);
  await pressUntil(
    page,
    press,
    { x: titleLanternButton.x, y: titleLanternButton.y },
    (s) => s.trial === 5,
  );
}

const centerOf = (r: Rect) => ({ x: r.x, y: r.y });

/** Taps a part until it is pointed at (the flickering part). */
export const pointAt = (page: Page, press: Press, part: PartId) =>
  pressUntil(
    page,
    press,
    centerOf(partRect(part)),
    (s) => s.lantern.stage === "pointing" && s.lantern.part === part,
  );

/** Taps a steady part until the game says it is fine. */
export const tapSteady = (page: Page, press: Press, part: PartId) =>
  pressUntil(
    page,
    press,
    centerOf(partRect(part)),
    (s) =>
      s.lantern.stage === "looking" &&
      s.lantern.note?.kind === "fine" &&
      s.lantern.note.part === part,
  );

/** Where the card for `look` is now: the first card on the left, the second on the right. */
export async function cardAt(page: Page, look: LookId) {
  const cards = cardsOf((await gameState(page)).lantern);
  const index = cards.indexOf(look);
  expect(index, `${look} is a card`).toBeGreaterThanOrEqual(0);
  return centerOf(index === 0 ? buttonRects.left : buttonRects.right);
}

/** Presses the card for `look` until the cards have closed (the lantern is lit, or the part was changed). */
export async function pickCard(page: Page, press: Press, look: LookId) {
  await pressUntil(page, press, await cardAt(page, look), (s) => s.lantern.stage !== "pointing");
}

/** The next lantern's button (the wide button once lit): taps until the next round is there. */
export async function nextLantern(page: Page, press: Press) {
  const before = (await gameState(page)).lantern.round;
  await pressUntil(
    page,
    press,
    centerOf(buttonRects.single),
    (s) => s.lantern.stage === "looking" && s.lantern.round === before + 1,
  );
}

/** Points at the flickering part and picks the right card: the lantern is lit. */
export async function lightIt(page: Page, press: Press) {
  const state = await gameState(page);
  await pointAt(page, press, faultNow(state));
  await pickCard(page, press, rightLook(state));
  expect((await gameState(page)).lantern.stage).toBe("lit");
}

/** The way back to the title on trial 5's screen: the shed's button, always there. */
export const leaveToTitle = (page: Page, press: Press) =>
  pressUntil(page, press, centerOf(leaveButton), (s) => s.phase === "title");

/** The end screen's play-again button: taps until a new run of trial 5 has begun. */
export const playAgain = (page: Page, press: Press) =>
  pressUntil(page, press, centerOf(buttonRect), (s) => s.phase === "trial" && s.trial === 5);

/** The end screen's title button. */
export const leaveFromEnd = (page: Page, press: Press) =>
  pressUntil(page, press, centerOf(overLeave), (s) => s.phase === "title");

// What is on the screen.

/** Brightness 0 to 255 by the weights a grayscale screen uses. */
const luma = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Gold (a dot, a line, the badge) reads about 200; the panel about 45 and the sky darker. */
const bright = 130;

/** The wisp's lantern's panel, with the badge that sticks out of its corner and the labels above. */
const lanternArea: Rect = {
  x: lanternPanel.x,
  y: lanternPanel.y - 10,
  width: lanternPanel.width + 10,
  height: lanternPanel.height + 40,
};

/** The frame on each part, from the top: none, dots or solid. */
async function marksNow(page: Page): Promise<PartMark[]> {
  const points = parts.flatMap((part) => {
    const { dot, gap } = partProbes(part);
    return [dot, gap];
  });
  const values = (await colorsAt(page, lanternArea, points)).map((c) => luma(c) > bright);
  return parts.map((_, i) => {
    const [dot, gap] = [values[2 * i], values[2 * i + 1]];
    if (dot && gap) return "solid";
    return dot ? "dots" : "none";
  });
}

/** Exactly these frames are on the wisp's lantern, from the handle down. */
export async function expectMarks(page: Page, marks: PartMark[]) {
  await expect.poll(() => marksNow(page), { timeout: 5_000 }).toEqual(marks);
}

/** The tick badge and the light: both bright exactly when the lantern is lit. */
async function litNow(page: Page): Promise<{ tick: boolean; light: boolean }> {
  const [tick, light] = await colorsAt(page, lanternArea, [probes.tick, probes.light]);
  return { tick: luma(tick!) > bright, light: luma(light!) > 150 };
}

export async function expectLit(page: Page, lit: boolean) {
  await expect.poll(() => litNow(page), { timeout: 5_000 }).toEqual({ tick: lit, light: lit });
}

/** The message place, for counting text and for fingerprints. */
export const messageBox: Rect = {
  x: lanternMessage.x,
  y: lanternMessage.y,
  width: lanternMessage.wrap,
  height: lanternMessage.height,
};

/** The inside of a part's row, clear of its frame: for a fingerprint of its picture. */
export const partArt = (part: PartId): Rect => ({ ...partRect(part), width: 136, height: 56 });

/** The wish's panel, below its label: for a fingerprint of the wish. */
export const wishArt: Rect = {
  ...wishPanel,
  width: wishPanel.width - 10,
  height: wishPanel.height - 10,
};
