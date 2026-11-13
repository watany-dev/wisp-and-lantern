import { expect, test } from "@playwright/test";
import { starCenter } from "../src/game/field-layout";
import { clicker, collectErrors, expectBundledFont, gameState } from "./helpers";
import {
  enterField,
  expectButtons,
  expectCluesMatchRound,
  expectLesson,
  expectLens,
  expectTicks,
  fakesNow,
  giveVerdict,
  keepStars,
  leaveToTitle,
  lookAt,
  nextRound,
  sortAll,
} from "./field-helpers";

test("REQ-6.9, REQ-6.13: plays the field with the mouse only: look, a wrong verdict, sort, keep, the next round and back to the title, in English", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  const click = clicker(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);

  await enterField(page, click);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 3 });
  expect((await gameState(page)).run).toMatchObject({ score: 0, streak: 0, best: 0 });
  await expectCluesMatchRound(page);

  // A wrong verdict on the first fake star, then the right ones.
  const fake = (await fakesNow(page))[0]!;
  await lookAt(page, click, fake);
  await expectLens(page, "bright");
  await giveVerdict(page, click, "real");
  await expectTicks(page, []);
  await sortAll(page, click);
  await expectButtons(page, ["single"]);
  await page.screenshot({ path: "e2e/screenshots/desktop-field-ready.png" });

  await keepStars(page, click);
  await expectLesson(page, true);
  await expectButtons(page, ["single"]);
  await page.screenshot({ path: "e2e/screenshots/desktop-field-kept.png" });
  await nextRound(page, click);
  await expectLesson(page, false);

  await leaveToTitle(page, click);
  expect(await gameState(page)).toMatchObject({ phase: "title", trial: 0 });
  expect(errors).toEqual([]);
});

test("REQ-6.9.3: a press that starts on a star does not walk the hero, and a press on the floor does", async ({
  page,
}) => {
  const click = clicker(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await enterField(page, click);
  const box = (await page.locator("canvas").boundingBox())!;
  const scale = box.width / 390;
  const at = (x: number, y: number) => ({ x: box.x + x * scale, y: box.y + y * scale });

  const { x, y } = starCenter(0);
  const onStar = at(x, y);
  await page.mouse.move(onStar.x, onStar.y);
  const before = (await gameState(page)).hero;
  await page.mouse.down();
  await expect
    .poll(async () => {
      const f = (await gameState(page)).field;
      return f.stage === "sorting" && f.looking === 0;
    })
    .toBe(true);
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
