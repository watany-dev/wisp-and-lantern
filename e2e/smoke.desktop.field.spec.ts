import { expect, test } from "@playwright/test";
import { initialRun } from "../src/domain/run";
import { starCenter } from "../src/game/field-layout";
import { clicker, collectErrors, expectBundledFont, expectClosingLine, gameState } from "./helpers";
import {
  checkAll,
  enterField,
  expectButton,
  expectStars,
  freshField,
  keepStars,
  nextRound,
} from "./field-helpers";

test("REQ-6.9, REQ-6.13: plays the field with the mouse only: check every star, keep, the next round, in English", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const click = clicker(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);

  await enterField(page, click);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 3, field: freshField(0) });
  expect((await gameState(page)).run).toEqual(initialRun);
  await expectStars(page, ["unchecked", "unchecked", "unchecked", "unchecked", "unchecked"]);

  await checkAll(page, click);
  await expectStars(page, ["real", "real", "real", "fake", "real"]);
  await expectButton(page, true);
  await page.screenshot({ path: "e2e/screenshots/desktop-field-ready.png" });

  await keepStars(page, click);
  await expectClosingLine(page, true);
  await page.screenshot({ path: "e2e/screenshots/desktop-field-kept.png" });

  await nextRound(page, click);
  expect((await gameState(page)).field).toEqual(freshField(1));
  await expectStars(page, ["unchecked", "unchecked", "unchecked", "unchecked", "unchecked"]);
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
      return f.stage === "checking" && f.checked[0];
    })
    .toBe(true);
  await page.waitForTimeout(500);
  expect((await gameState(page)).hero).toEqual(before);
  await page.mouse.up();

  // The floor between the button and the wisp: a held press there walks the hero.
  const floor = at(60, 600);
  await page.mouse.move(floor.x, floor.y);
  await page.mouse.down();
  await expect.poll(async () => (await gameState(page)).hero.x).toBeLessThan(before.x - 20);
  await page.mouse.up();
});
