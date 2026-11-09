import { expect, test } from "@playwright/test";
import { wishAt } from "../src/domain/lane";
import { cardCenter } from "../src/game/lane-layout";
import {
  askWisp,
  clicker,
  collectErrors,
  expectBundledFont,
  gameState,
  pickCards,
  pressButton,
  startTrial,
} from "./helpers";

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

test("REQ-2.9, REQ-2.11: plays trial 1 with the mouse only, in English", async ({ page }) => {
  const errors = collectErrors(page);
  const click = clicker(page);
  const wish = wishAt(0);
  await page.goto("./?judge=1&lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await startTrial(page, click);
  expect((await gameState(page)).lang).toBe("en");

  await pickCards(page, click, wish.color, wish.thing);
  await askWisp(page, click);
  expect((await gameState(page)).lane).toMatchObject({ asked: true, pick: wish });
  await page.screenshot({ path: "e2e/screenshots/desktop-lane-right.png" });

  // A different request on the next wish is answered too, and the retry keeps that wish.
  await pressButton(page, click);
  const next = wishAt(1);
  const other = next.color === "blue" ? "yellow" : "blue";
  await pickCards(page, click, other, next.thing);
  await askWisp(page, click);
  await pressButton(page, click);
  expect((await gameState(page)).lane).toEqual({
    wish: 1,
    pick: { color: null, thing: null },
    asked: false,
  });
  expect(errors).toEqual([]);
});

test("REQ-2.11: a press that starts on a card does not walk the hero", async ({ page }) => {
  const click = clicker(page);
  await page.goto("./?judge=1&lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await startTrial(page, click);
  const box = (await page.locator("canvas").boundingBox())!;
  const { x, y } = cardCenter("red");
  const scale = box.width / 390;
  await page.mouse.move(box.x + x * scale, box.y + y * scale);
  const before = (await gameState(page)).hero;
  await page.mouse.down();
  await expect.poll(async () => (await gameState(page)).lane.pick.color).toBe("red");
  await page.waitForTimeout(500);
  expect((await gameState(page)).hero).toEqual(before);
  await page.mouse.up();
});
