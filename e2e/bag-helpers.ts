// Helpers for the smoke of trial 4, The Listening Shadows (.kiro/specs/07-trial-keep-secrets). Every press is a
// real tap or click; the state is only read. What is on the screen is read from the pixels: the tick of a thing
// handed over, the padlock badges of the secrets kept, the rule card, the "Next" button and the closing line.

import { expect, type Page } from "@playwright/test";
import { isSecretAt } from "../src/domain/bag";
import {
  givenProbe,
  itemCenter,
  keptProbe,
  ruleProbes,
  rulePinProbe,
  rulesRect,
  bagLesson,
  titleBagButton,
} from "../src/game/bag-layout";
import { buttonRects } from "../src/game/field-layout";
import { buttonRect, canvas, type Rect } from "../src/game/lane-layout";
import { leaveButton, overLeave } from "../src/game/shed-layout";
import {
  canvasFrame,
  gameState,
  look,
  minTextPixels,
  pressUntil,
  textPixels,
  type Press,
} from "./helpers";
import { countMatching, near, type Rgb } from "./pixels";
import { colorsAt } from "./shed-helpers";

const places = [0, 1, 2, 3, 4];

export const freshBag = (seed: number, round: number) =>
  ({
    stage: "giving",
    seed,
    round,
    given: [false, false, false, false, false],
    last: null,
  }) as const;

/** The places of the secrets in the round on the screen, from the same pure rule the game uses. */
export async function secretsNow(page: Page): Promise<number[]> {
  const { bag } = await gameState(page);
  return places.filter((i) => isSecretAt(bag, i));
}

export async function safeNow(page: Page): Promise<number[]> {
  const secrets = await secretsNow(page);
  return places.filter((i) => !secrets.includes(i));
}

/** Taps the title's bag button until the bag is open (the scene registers its input after loading). */
export const enterBag = (page: Page, press: Press) =>
  pressUntil(page, press, { x: titleBagButton.x, y: titleBagButton.y }, (s) => s.trial === 4);

/** Hands a safe thing over: taps it until it is given (or the round is done by it). */
export const handOver = (page: Page, press: Press, index: number) =>
  pressUntil(
    page,
    press,
    itemCenter(index),
    (s) => s.bag.stage === "done" || s.bag.given[index] === true,
  );

/** Taps a secret once the scene takes taps: the tap is noted, and nothing is handed over. */
export const tapSecret = (page: Page, press: Press, index: number) =>
  pressUntil(
    page,
    press,
    itemCenter(index),
    (s) => s.bag.stage === "giving" && s.bag.last === index,
  );

/** Hands over every safe thing of the round, in place order; the round is done after the last one. */
export async function giveAllSafe(page: Page, press: Press) {
  for (const i of await safeNow(page)) await handOver(page, press, i);
  await expect.poll(async () => (await gameState(page)).bag.stage).toBe("done");
}

/** "Next", after a done round: the next round of the same seed. */
export async function nextBag(page: Page, press: Press) {
  const before = (await gameState(page)).bag.round;
  await pressUntil(
    page,
    press,
    { x: buttonRects.single.x, y: buttonRects.single.y },
    (s) => s.bag.stage === "giving" && s.bag.round !== before,
  );
}

/** The way back to the title, on the bag's screen: the shed's button, always there. */
export const leaveToTitle = (page: Page, press: Press) =>
  pressUntil(page, press, { x: leaveButton.x, y: leaveButton.y }, (s) => s.phase === "title");

/** The end screen's play-again button: taps until a new run of the bag has begun. */
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

const gold = (c: Rgb) => c[0] > 200 && c[1] > 170 && c[2] < 130;
const dark = (c: Rgb) => c[0] < 90 && c[1] < 90 && c[2] < 110;
const white = (c: Rgb) => c[0] > 200 && c[1] > 200 && c[2] > 200;
/** The area of the two rows of cards, big enough for every badge probe. */
const itemArea = { x: canvas.width / 2, y: 214, width: canvas.width, height: 216 };

const indexesWhere = (colors: Rgb[], test: (c: Rgb) => boolean) =>
  colors.map((c, i) => (test(c) ? i : -1)).filter((i) => i >= 0);

/** The things handed over have the tick on the screen (the badge is gold) and nothing else does. */
export async function expectTicks(page: Page, ticked: number[]) {
  await expect
    .poll(async () => indexesWhere(await colorsAt(page, itemArea, places.map(givenProbe)), gold), {
      timeout: 5_000,
    })
    .toEqual(ticked);
}

/** The secrets kept have the padlock badge on the screen (its disc is dark on the cream card) and nothing else does. */
export async function expectPadlocks(page: Page, locked: number[]) {
  await expect
    .poll(async () => indexesWhere(await colorsAt(page, itemArea, places.map(keptProbe)), dark), {
      timeout: 5_000,
    })
    .toEqual(locked);
}

/** The red of the address picture's pin (`pinRed` in `src/game/ui/bag-items.ts`, which imports Phaser). */
const pinRed: Rgb = [0xd9, 0x53, 0x4f];

/** Red pixels around the rule card's pin head, in CSS pixels. */
async function pinPixels(page: Page): Promise<number> {
  const area = { ...rulePinProbe, width: 12, height: 12 };
  const { box, scale } = await canvasFrame(page);
  const clip = {
    x: box.x + (area.x - area.width / 2) * scale,
    y: box.y + (area.y - area.height / 2) * scale,
    width: area.width * scale,
    height: area.height * scale,
  };
  const image = await look(page, clip);
  const ratio = image.width / clip.width;
  return countMatching(image, (pixel) => near(pixel, pinRed, 50)) / (ratio * ratio);
}

/**
 * The rule card is on the screen, or it is not. Its pictures are read by the red of the address pin, which the
 * closing line's letters never are: the closing line lies over the same place, so a picture left under it still
 * shows a little red, and "gone" means almost none. While the card is shown, its three padlocks are also read on
 * their white bodies.
 */
export async function expectRuleCard(page: Page, shown: boolean) {
  // Measured on Chromium (iPhone 13 profile): about 55 red pixels while the card is shown, 0 once the closing
  // line has taken its place, and about 5 when a picture is left under the closing line's letters.
  await expect
    .poll(async () => (shown ? (await pinPixels(page)) > 20 : (await pinPixels(page)) < 1), {
      timeout: 5_000,
    })
    .toBe(true);
  if (shown) {
    const padlocks = await colorsAt(page, rulesRect, [...ruleProbes]);
    expect(padlocks.every(white)).toBe(true);
  }
}

/** The "Next" button's gold face is on the screen, or it is not. */
export async function expectNext(page: Page, shown: boolean) {
  const area = { ...buttonRects.single };
  const spot = { x: buttonRects.single.x, y: buttonRects.single.y + 12 };
  await expect
    .poll(async () => gold((await colorsAt(page, area, [spot]))[0]!), { timeout: 5_000 })
    .toBe(shown);
}

/** Gold pixels in a game rectangle, in CSS pixels. */
async function goldPixels(page: Page, rect: Rect): Promise<number> {
  const { box, scale } = await canvasFrame(page);
  const clip = {
    x: box.x + (rect.x - rect.width / 2) * scale,
    y: box.y + (rect.y - rect.height / 2) * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
  const image = await look(page, clip);
  const ratio = image.width / clip.width;
  return countMatching(image, (pixel) => near(pixel, [0xff, 0xd5, 0x4a], 40)) / (ratio * ratio);
}

/** The closing line's lines, in the rule card's place. */
const lessonArea: Rect = { x: bagLesson.x, y: bagLesson.y, width: bagLesson.wrap, height: 58 };

/**
 * The closing line is on the screen or is not: once a round is done the rule card's place has a gold edge (read
 * along its top) and light text in it.
 */
export async function expectLesson(page: Page, shown: boolean) {
  const edge = { x: rulesRect.x, y: rulesRect.y - rulesRect.height / 2, width: 200, height: 3 };
  await expect
    .poll(async () => (await goldPixels(page, edge)) > 100, { timeout: 5_000 })
    .toBe(shown);
  if (shown) {
    await expect.poll(() => textPixels(page, lessonArea)).toBeGreaterThan(minTextPixels);
  }
}
