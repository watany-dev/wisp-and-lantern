import { expect, test } from "@playwright/test";
import { buttonRects } from "../src/game/field-layout";
import { clicker, collectErrors, expectBundledFont, gameState, textPixels } from "./helpers";
import { expectButtons } from "./field-helpers";
import { rigSeed } from "./shed-helpers";
import {
  closingBox,
  decide,
  enterShadows,
  expectBadges,
  expectHeard,
  leaveToTitle,
  nextItem,
  rightChoice,
} from "./shadows-helpers";

test("REQ-7.9, REQ-7.13: plays trial 4 with the mouse only: a wrong and a right decision, the next item and back to the title, in English", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  const click = clicker(page);
  await rigSeed(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);

  await enterShadows(page, click);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 4 });
  expect((await gameState(page)).run).toMatchObject({ score: 0, streak: 0, best: 0 });
  await expectButtons(page, ["left", "right"]);

  // Seed 0 starts with the house key: giving it is wrong, and nothing is scored.
  await decide(page, click, "give");
  expect((await gameState(page)).run).toMatchObject({ score: 0, streak: 0 });
  await expectHeard(page, "item");
  await expectBadges(page, { tick: false, lock: false });
  await expectButtons(page, ["single"]);
  await page.screenshot({ path: "e2e/screenshots/desktop-shadows-given-secret.png" });
  await nextItem(page, click);

  // The next one is right, whichever it is.
  await decide(page, click, rightChoice(await gameState(page)));
  expect((await gameState(page)).run.score).toBe(100);
  await expectBadges(page, { tick: true, lock: false });
  await expect.poll(() => textPixels(page, closingBox)).toBeGreaterThan(10);
  await page.screenshot({ path: "e2e/screenshots/desktop-shadows-given-safe.png" });

  await leaveToTitle(page, click);
  expect(await gameState(page)).toMatchObject({ phase: "title", trial: 0 });
  expect(errors).toEqual([]);
});

test("REQ-7.9.3: a press that starts on a button does not walk the hero, and a press on the floor does", async ({
  page,
}) => {
  const click = clicker(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await enterShadows(page, click);
  const box = (await page.locator("canvas").boundingBox())!;
  const scale = box.width / 390;
  const at = (x: number, y: number) => ({ x: box.x + x * scale, y: box.y + y * scale });

  // A new set of buttons ignores presses for a moment (REQ-7.9.5), so wait for the first set to be ready.
  await page.waitForTimeout(600);
  const { x, y } = buttonRects.left;
  const onButton = at(x, y);
  await page.mouse.move(onButton.x, onButton.y);
  const before = (await gameState(page)).hero;
  await page.mouse.down();
  await expect.poll(async () => (await gameState(page)).shadows.stage).toBe("decided");
  await page.waitForTimeout(500);
  expect((await gameState(page)).hero).toEqual(before);
  await page.mouse.up();

  // The floor between the buttons and the wisp: a held press there walks the hero.
  const floor = at(60, 620);
  await page.mouse.move(floor.x, floor.y);
  await page.mouse.down();
  await expect.poll(async () => (await gameState(page)).hero.x).toBeLessThan(before.x - 20);
  await page.mouse.up();
});
