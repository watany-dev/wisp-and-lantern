import { createHash } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { colors, things, type CardId, type ColorId, type ThingId } from "../src/domain/lane";
import {
  buttonRect,
  canvas,
  cardCenter,
  lessonBox,
  resultText,
  slotCenter,
  wisp,
  type Rect,
} from "../src/game/lane-layout";
import type { Point } from "../src/game/steer";
import { textStyle } from "../src/game/ui/text";
import { countMatching, decodePng, hexToRgb, near, pixelAt, type Image, type Rgb } from "./pixels";

type Pick = { color: string | null; thing: string | null };
export type GameState = {
  phase: string;
  lang: string;
  trial: number;
  hero: { x: number; y: number };
  lane: { wish: number; pick: Pick; asked: boolean };
  run: { remainingMs: number; score: number; streak: number; best: number; record: boolean };
  shed: { stage: "choosing"; pick: string | null } | { stage: "tried"; tool: string };
};
type GameWindow = Window & { __game: { state: () => GameState; dispatch: (e: unknown) => void } };

/** Collects page errors and console errors; assert on the returned list at the end of a test. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

export async function gameState(page: Page): Promise<GameState> {
  return page.evaluate(() => (window as unknown as GameWindow).__game.state());
}

/**
 * Sets up state that has no UI yet. Drive anything a player can reach with real taps and drags
 * instead (see `.kiro/steering/structure.md`).
 *
 * @public Kept for future trial smokes, so knip does not report it as unused.
 */
export async function dispatch(page: Page, event: unknown): Promise<void> {
  await page.evaluate((e) => (window as unknown as GameWindow).__game.dispatch(e), event);
}

/** REQ-1.11: the bundled subset font is loaded and used, never a system fallback. */
export async function expectBundledFont(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check("16px ZenMaru", "あ"))).toBe(true);
  // check() is also true when no face matches, so require a loaded ZenMaru face as well.
  const loaded = await page.evaluate(() =>
    [...document.fonts].some(
      (f) => f.family.replace(/"/g, "") === "ZenMaru" && f.status === "loaded",
    ),
  );
  expect(loaded).toBe(true);
}

/** Presses a point given in game pixels (390 x 844): a touch tap or a mouse click. */
export type Press = (point: Point) => Promise<void>;

/** Where a game point is on the page: the canvas is scaled to fit the window. */
async function pagePoint(page: Page, point: Point): Promise<Point> {
  const box = (await page.locator("canvas").boundingBox())!;
  const scale = box.width / canvas.width;
  return { x: box.x + point.x * scale, y: box.y + point.y * scale };
}

/** A real touch tap (`locator.tap`), never a dispatched event. */
export const tapper =
  (page: Page): Press =>
  async (point) => {
    const box = (await page.locator("canvas").boundingBox())!;
    const scale = box.width / canvas.width;
    const position = { x: point.x * scale, y: point.y * scale };
    await page.locator("canvas").tap({ position, timeout: 2_000 });
  };

/** A real mouse click at the point. */
export const clicker =
  (page: Page): Press =>
  async (point) => {
    const { x, y } = await pagePoint(page, point);
    await page.mouse.click(x, y);
  };

/**
 * Presses `point` until `done` holds. A scene registers its input after its assets load, so an
 * early press is lost; presses here are repeatable, and a broken handler never gets there and fails.
 */
export async function pressUntil(
  page: Page,
  press: Press,
  point: Point,
  done: (state: GameState) => boolean,
): Promise<void> {
  await expect(async () => {
    await press(point);
    expect(done(await gameState(page))).toBe(true);
  }).toPass({ timeout: 15_000 });
}

/** Taps the middle of the title until the trial starts. */
export const startTrial = (page: Page, press: Press) =>
  pressUntil(
    page,
    press,
    { x: canvas.width / 2, y: canvas.height / 2 },
    (s) => s.phase === "trial",
  );

/** Picks the two cards, and checks that picking alone does not send the helper (REQ-2.3). */
export async function pickCards(page: Page, press: Press, color: ColorId, thing: ThingId) {
  await pressUntil(page, press, cardCenter(color), (s) => s.lane.pick.color === color);
  await pressUntil(page, press, cardCenter(thing), (s) => s.lane.pick.thing === thing);
  expect((await gameState(page)).lane.asked).toBe(false);
}

/** Taps the wisp: the explicit request. */
export const askWisp = (page: Page, press: Press) =>
  pressUntil(page, press, wisp, (s) => s.lane.asked);

/** Taps the button that appears after a result (retry, or play again). */
export const pressButton = (page: Page, press: Press) =>
  pressUntil(page, press, { x: buttonRect.x, y: buttonRect.y }, (s) => !s.lane.asked);

/** Picks one card and checks that picking alone has not asked (REQ-3.1.3). */
export async function pickOne(page: Page, press: Press, card: CardId) {
  const key = card === "red" || card === "blue" || card === "yellow" ? "color" : "thing";
  await pressUntil(page, press, cardCenter(card), (s) => s.lane.pick[key] === card);
  expect((await gameState(page)).lane.asked).toBe(false);
}

// What is on the screen. The text is drawn on the canvas, so it is read from a screenshot.

/** The message color from `ui/text.ts`, which imports Phaser only as a type. */
const textColor: Rgb = hexToRgb(textStyle.color as string);
/** The lit slot's panel color (`palette.lit` in `ui/art.ts`, which cannot be imported here). */
const litPanel: Rgb = [0x2a, 0x2a, 0x4a];
/**
 * Light text pixels, in CSS pixels, that count as "there is text in this box". A single line of the
 * smallest message leaves about 40 of them on WebKit; an empty box leaves none, so the threshold
 * only has to be above noise.
 */
export const minTextPixels = 10;
/**
 * The wisp's square (235, 240, 255) is bluer than the text (244, 239, 225) and flies through the
 * message area just after the ask. Pixels at least this blue are not counted as text.
 */
const wispBlue = 245;
const isText = (pixel: Rgb) => near(pixel, textColor, 70) && pixel[2] < wispBlue;

/** A page area in CSS pixels, top-left corner and size. */
type Clip = { x: number; y: number; width: number; height: number };

export async function look(page: Page, clip?: Clip): Promise<Image> {
  return decodePng(await page.screenshot(clip ? { clip } : {}));
}

/** Where the canvas is on the page, and how much it is scaled. */
export async function canvasFrame(page: Page) {
  const box = (await page.locator("canvas").boundingBox())!;
  return { box, scale: box.width / canvas.width };
}

/** The page area (CSS pixels) where a game rectangle (center x, y and size) is drawn. */
async function pageClip(page: Page, rect: Rect): Promise<Clip> {
  const { box, scale } = await canvasFrame(page);
  return {
    x: box.x + (rect.x - rect.width / 2) * scale,
    y: box.y + (rect.y - rect.height / 2) * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

/** Screenshot pixels per CSS pixel: 3 on the phone profile, 1 on the desktop. */
const density = (image: Image, page: Page) => image.width / page.viewportSize()!.width;

/** Light text pixels in a game rectangle, counted in CSS pixels so phone and desktop compare. */
export async function textPixels(page: Page, rect: Rect): Promise<number> {
  const clip = await pageClip(page, rect);
  const image = await look(page, clip);
  const ratio = image.width / clip.width;
  return countMatching(image, isText) / (ratio * ratio);
}

/** A fingerprint of what is drawn in a game rectangle: different words, different fingerprint. */
export async function fingerprint(page: Page, rect: Rect): Promise<string> {
  const image = await look(page, await pageClip(page, rect));
  return createHash("sha1").update(image.data).digest("hex");
}

const resultMessageBox: Rect = {
  x: resultText.x,
  y: resultText.y,
  width: resultText.wrap,
  height: resultText.height,
};
export const lessonArea: Rect = lessonBox;

/** The lane slots whose panel is lit, as "red pumpkin". Samples a corner that no art covers. */
async function litSlots(page: Page): Promise<string[]> {
  const image = await look(page);
  const ratio = density(image, page);
  const { box, scale } = await canvasFrame(page);
  const corner = 34;
  return colors
    .flatMap((color) => things.map((thing) => ({ color, thing })))
    .filter(({ color, thing }) => {
      const c = slotCenter(color, thing);
      const x = (box.x + (c.x - corner) * scale) * ratio;
      const y = (box.y + (c.y - corner) * scale) * ratio;
      return near(pixelAt(image, x, y), litPanel, 6);
    })
    .map(({ color, thing }) => `${color} ${thing}`);
}

/**
 * The result is on the screen: the result message has been drawn where the wisp used to be, and
 * exactly the expected slot is lit (REQ-3.3.6). The lit slot shows what the wisp brought.
 */
export async function expectBrought(page: Page, item: string) {
  await expect
    .poll(() => textPixels(page, resultMessageBox), { timeout: 5_000 })
    .toBeGreaterThan(minTextPixels);
  await expect.poll(() => litSlots(page), { timeout: 5_000 }).toEqual([item]);
}

/** The closing line is on the screen (right result) or is not (REQ-3.5.2). Call after `expectBrought`. */
export async function expectClosingLine(page: Page, shown: boolean) {
  if (shown) {
    await expect
      .poll(() => textPixels(page, lessonArea), { timeout: 5_000 })
      .toBeGreaterThan(minTextPixels);
  } else {
    await expect.poll(() => textPixels(page, lessonArea), { timeout: 2_000 }).toBe(0);
  }
}

/** Taps the end screen's button until a new run has begun. The screen ignores early taps on purpose. */
export const playAgain = (page: Page, press: Press) =>
  pressUntil(page, press, { x: buttonRect.x, y: buttonRect.y }, (s) => s.phase === "trial");
