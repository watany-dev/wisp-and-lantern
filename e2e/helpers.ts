import { expect, type Page } from "@playwright/test";

type GameState = { phase: string; lang: string; hero: { x: number; y: number } };
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

export async function dispatch(page: Page, event: unknown): Promise<void> {
  await page.evaluate((e) => (window as unknown as GameWindow).__game.dispatch(e), event);
}

/** REQ-1.11: the bundled subset font is loaded and used, never a system fallback. */
export async function expectBundledFont(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check("16px ZenMaru", "あ"))).toBe(true);
  // check() is also true when no face matches, so require a loaded ZenMaru face as well.
  const loaded = await page.evaluate(() =>
    [...document.fonts].some((f) => f.family.replace(/"/g, "") === "ZenMaru" && f.status === "loaded"),
  );
  expect(loaded).toBe(true);
}
