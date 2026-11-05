import { expect, test } from "@playwright/test";
import { collectErrors, expectBundledFont, gameState } from "./helpers";

test("boots on a phone and starts the game with a tap", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("./");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expectBundledFont(page);
  await page.screenshot({ path: "e2e/screenshots/mobile-title.png" });

  // The scene registers its pointer listener after its assets load, so an early tap is lost.
  // Tap again until the phase changes; a broken tap handler never gets there and still fails.
  await expect(async () => {
    await canvas.tap({ timeout: 2_000 });
    expect((await gameState(page)).phase).toBe("trial");
  }).toPass({ timeout: 15_000 });
  expect(errors).toEqual([]);
});
