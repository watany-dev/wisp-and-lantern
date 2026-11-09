import { expect, type Page } from "@playwright/test";
import type { ColorId, ThingId } from "../src/domain/lane";
import { buttonRect, canvas, cardCenter, wisp } from "../src/game/lane-layout";
import type { Point } from "../src/game/steer";

type Pick = { color: string | null; thing: string | null };
export type GameState = {
  phase: string;
  lang: string;
  trial: number;
  hero: { x: number; y: number };
  lane: { wish: number; pick: Pick; asked: boolean };
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
