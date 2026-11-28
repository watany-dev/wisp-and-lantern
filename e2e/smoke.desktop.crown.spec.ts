import { expect, test } from "@playwright/test";
import { lampRow } from "../src/game/crown-layout";
import { clicker, collectErrors, expectBundledFont, gameState } from "./helpers";
import { rigSeed } from "./shed-helpers";
import {
  enterCrown,
  expectLampBadge,
  expectSteps,
  expectTown,
  giveThing,
  leaveToTitle,
  playChain,
  pressCheck,
  pressGo,
  pressTell,
  pressWide,
  sayLook,
} from "./crown-helpers";

test("REQ-9.12, REQ-9.16: plays a chain of trial 6 with the mouse only, then Next and back to the title, in English", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  const click = clicker(page);
  await rigSeed(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);

  await enterCrown(page, click);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 6 });
  await expectSteps(page, ["now", "later", "later", "later", "later"]);
  await playChain(page, click);
  await expectLampBadge(page, true);
  await expectTown(page, [true, false, false]);
  await page.screenshot({ path: "e2e/screenshots/desktop-crown-lit.png" });
  await pressWide(page, click, (s) => s.crown.stage === "telling");
  expect((await gameState(page)).crown).toMatchObject({ stage: "telling", chain: 1 });
  await leaveToTitle(page, click);
  expect(await gameState(page)).toMatchObject({ phase: "title", trial: 0 });
  expect(errors).toEqual([]);
});

test("REQ-9.12.3: a press that starts on a part of the wisp's lamp does not walk the hero, and a press on the floor does", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const click = clicker(page);
  await rigSeed(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await enterCrown(page, click);
  const box = (await page.locator("canvas").boundingBox())!;
  const scale = box.width / 390;
  const at = (x: number, y: number) => ({ x: box.x + x * scale, y: box.y + y * scale });

  // Get to the fix step, where the parts are tap targets. Seed 0 makes a round roof; its light is the wish's.
  await sayLook(page, click, "pointy");
  await sayLook(page, click, "candle");
  await pressTell(page, click, (s) => s.crown.stage === "giving");
  await giveThing(page, click, "broom", (s) => s.crown.stage === "going");
  await pressGo(page, click);
  await pressCheck(page, click, false, (s) => s.crown.stage === "fixing");

  // A held press on the light: the game says it is the same, and the hero stays.
  const light = lampRow("light");
  const onPart = at(light.x, light.y);
  await page.mouse.move(onPart.x, onPart.y);
  const before = (await gameState(page)).hero;
  await page.mouse.down();
  await expect
    .poll(async () => (await gameState(page)).crown)
    .toMatchObject({ note: { kind: "fine", part: "light" } });
  await page.waitForTimeout(500);
  expect((await gameState(page)).hero).toEqual(before);
  await page.mouse.up();

  // The floor between the controls and the wisp: a held press there walks the hero.
  const floor = at(60, 620);
  await page.mouse.move(floor.x, floor.y);
  await page.mouse.down();
  await expect.poll(async () => (await gameState(page)).hero.x).toBeLessThan(before.x - 20);
  await page.mouse.up();
});
