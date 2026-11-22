import { expect, test } from "@playwright/test";
import { itemCenter } from "../src/game/bag-layout";
import {
  enterBag,
  expectLesson,
  expectPadlocks,
  expectTicks,
  giveAllSafe,
  leaveToTitle,
  nextBag,
  safeNow,
  secretsNow,
  tapSecret,
} from "./bag-helpers";
import { clicker, collectErrors, expectBundledFont, gameState } from "./helpers";

test("REQ-7.9, REQ-7.13: plays the bag with the mouse only: a secret, the hand-overs, a done round, Next and back to the title, in English", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  const click = clicker(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);

  await enterBag(page, click);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 4 });
  const secrets = await secretsNow(page);
  await tapSecret(page, click, secrets[0]!);
  await expectTicks(page, []);
  await giveAllSafe(page, click);
  await expectTicks(page, await safeNow(page));
  await expectPadlocks(page, secrets);
  await expectLesson(page, true);
  await page.screenshot({ path: "e2e/screenshots/desktop-bag-done.png" });
  await nextBag(page, click);
  await expectLesson(page, false);
  await leaveToTitle(page, click);
  expect(await gameState(page)).toMatchObject({ phase: "title", trial: 0 });
  expect(errors).toEqual([]);
});

test("REQ-7.9.3: a press that starts on a thing does not walk the hero, and a press on the floor does", async ({
  page,
}) => {
  const click = clicker(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await enterBag(page, click);
  const box = (await page.locator("canvas").boundingBox())!;
  const scale = box.width / 390;
  const at = (x: number, y: number) => ({ x: box.x + x * scale, y: box.y + y * scale });

  const [safe] = await safeNow(page);
  const { x, y } = itemCenter(safe!);
  const onThing = at(x, y);
  await page.mouse.move(onThing.x, onThing.y);
  const before = (await gameState(page)).hero;
  await page.mouse.down();
  await expect
    .poll(async () => {
      const bag = (await gameState(page)).bag;
      return bag.stage === "giving" && bag.given[safe!] === true;
    })
    .toBe(true);
  await page.waitForTimeout(500);
  expect((await gameState(page)).hero).toEqual(before);
  await page.mouse.up();

  // The floor beside the hero, clear of every button and card: a held press there walks the hero.
  const floor = at(60, 620);
  await page.mouse.move(floor.x, floor.y);
  await page.mouse.down();
  await expect.poll(async () => (await gameState(page)).hero.x).toBeLessThan(before.x - 20);
  await page.mouse.up();
});
