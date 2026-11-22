import { expect, test } from "@playwright/test";
import { partRect } from "../src/game/lantern-layout";
import {
  clicker,
  collectErrors,
  expectBundledFont,
  gameState,
  minTextPixels,
  textPixels,
} from "./helpers";
import { expectButtons } from "./field-helpers";
import { rigSeed } from "./shed-helpers";
import {
  enterLantern,
  expectLit,
  expectMarks,
  leaveToTitle,
  lightIt,
  messageBox,
  nextLantern,
  pickCard,
  pointAt,
  tapSteady,
} from "./lantern-helpers";

test("REQ-8.11, REQ-8.15: plays trial 5 with the mouse only: a steady part, a wrong card, the right card, the next lantern and back to the title, in English", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  const click = clicker(page);
  await rigSeed(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);

  await enterLantern(page, click);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 5 });
  await expectMarks(page, ["dots", "none", "none"]);
  await expectButtons(page, []);

  await tapSteady(page, click, "light");
  await pointAt(page, click, "handle");
  await expectButtons(page, ["left", "right"]);
  await expectMarks(page, ["solid", "none", "none"]);
  await page.screenshot({ path: "e2e/screenshots/desktop-lantern-point.png" });

  await pickCard(page, click, "bow");
  expect((await gameState(page)).run).toMatchObject({ score: 0, streak: 0 });
  await expectMarks(page, ["dots", "none", "none"]);
  await lightIt(page, click);
  expect((await gameState(page)).run.score).toBe(100);
  await expectLit(page, true);
  await expect.poll(() => textPixels(page, messageBox)).toBeGreaterThan(minTextPixels);
  await page.screenshot({ path: "e2e/screenshots/desktop-lantern-lit.png" });

  await nextLantern(page, click);
  await expectMarks(page, ["none", "dots", "none"]);
  await leaveToTitle(page, click);
  expect(await gameState(page)).toMatchObject({ phase: "title", trial: 0 });
  expect(errors).toEqual([]);
});

test("REQ-8.11.3: a press that starts on a part does not walk the hero, and a press on the floor does", async ({
  page,
}) => {
  const click = clicker(page);
  // Seed 0 flickers in the handle, so the roof is a steady part.
  await rigSeed(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await enterLantern(page, click);
  const box = (await page.locator("canvas").boundingBox())!;
  const scale = box.width / 390;
  const at = (x: number, y: number) => ({ x: box.x + x * scale, y: box.y + y * scale });

  // A held press on a steady part of the wisp's lantern: the game says it is fine, and the hero stays.
  const roof = partRect("roof");
  const onPart = at(roof.x, roof.y);
  await page.mouse.move(onPart.x, onPart.y);
  const before = (await gameState(page)).hero;
  await page.mouse.down();
  await expect
    .poll(async () => (await gameState(page)).lantern)
    .toMatchObject({
      note: { kind: "fine", part: "roof" },
    });
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
