import { expect, test } from "@playwright/test";
import { collectErrors, expectBundledFont, gameState } from "./helpers";

test("judge mode works with the mouse only", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("./?judge=1&lang=en");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expectBundledFont(page);
  expect((await gameState(page)).lang).toBe("en");

  const box = (await canvas.boundingBox())!;
  const before = (await gameState(page)).hero.x;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.7, { steps: 10 });
  await expect.poll(async () => (await gameState(page)).hero.x).not.toBe(before);
  await page.mouse.up();
  await page.screenshot({ path: "e2e/screenshots/desktop-judge.png" });
  expect(errors).toEqual([]);
});
