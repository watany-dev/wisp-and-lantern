import { expect, test } from "@playwright/test";
import { collectErrors, dispatch, expectBundledFont, gameState } from "./helpers";

test("boots on a phone and starts the game", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("./");
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);
  await page.screenshot({ path: "e2e/screenshots/mobile-title.png" });

  await dispatch(page, { type: "Start" });
  await expect.poll(async () => (await gameState(page)).phase).toBe("trial");
  expect(errors).toEqual([]);
});
