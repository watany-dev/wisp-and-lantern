import { expect, test } from "@playwright/test";
import { wishAt } from "../src/domain/lane";
import { cardCenter } from "../src/game/lane-layout";
import {
  askWisp,
  clicker,
  collectErrors,
  expectBrought,
  expectBundledFont,
  expectClosingLine,
  gameState,
  pickCards,
  dispatch,
  pickOne,
  playAgain,
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

test("REQ-3.1, REQ-3.3, REQ-3.5, REQ-3.8: plays trial 1 with the mouse only, one card then both, in English", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const click = clicker(page);
  const wish = wishAt(0);
  await page.goto("./?judge=1&lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await startTrial(page, click);
  expect((await gameState(page)).lang).toBe("en");

  // The first wish is the yellow lantern. A color alone is a request; the wisp picks the object.
  await pickOne(page, click, wish.color);
  await askWisp(page, click);
  expect((await gameState(page)).lane).toEqual({
    wish: 0,
    pick: { color: wish.color, thing: null },
    asked: true,
  });
  await expectBrought(page, "yellow pumpkin");
  await expectClosingLine(page, false);
  await page.screenshot({ path: "e2e/screenshots/desktop-lane-vague.png" });
  await pressButton(page, click);

  await pickCards(page, click, wish.color, wish.thing);
  await askWisp(page, click);
  expect((await gameState(page)).lane).toMatchObject({ asked: true, pick: wish });
  await expectBrought(page, "yellow lantern");
  await expectClosingLine(page, true);
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

test("REQ-4.5, REQ-4.6: time up shows the end screen, and a mouse click starts a new run", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const click = clicker(page);
  await page.goto("./?judge=1&lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await startTrial(page, click);
  await dispatch(page, { type: "Tick", ms: 60_000 });
  await expect.poll(async () => (await gameState(page)).phase).toBe("over");
  await page.waitForTimeout(1_000);
  await page.screenshot({ path: "e2e/screenshots/desktop-over.png" });
  await playAgain(page, click);
  expect((await gameState(page)).run.remainingMs).toBeGreaterThan(59_000);
  expect(errors).toEqual([]);
});
