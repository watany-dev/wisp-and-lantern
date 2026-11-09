import { expect, test } from "@playwright/test";
import { initialRun } from "../src/domain/run";
import { toolCenter } from "../src/game/shed-layout";
import { clicker, collectErrors, expectBundledFont, expectClosingLine, gameState } from "./helpers";
import {
  enterShed,
  expectMarked,
  expectMessage,
  expectPicture,
  freshShed,
  giveToWisp,
  pickTool,
  pressShedButton,
} from "./shed-helpers";

const shut = { door: "shut", cat: "inside", star: false } as const;
const open = { door: "open", cat: "outside", star: true } as const;

test("REQ-5.10, REQ-5.14: plays the shed with the mouse only: broom, hammer, key, in English", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const click = clicker(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);

  await enterShed(page, click);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 2, shed: freshShed });
  expect((await gameState(page)).run).toEqual(initialRun);
  await expectPicture(page, shut);

  await pickTool(page, click, "broom");
  await expectMarked(page, ["broom"]);
  await giveToWisp(page, click);
  await expectMessage(page, "result");
  await expectPicture(page, shut);
  await page.screenshot({ path: "e2e/screenshots/desktop-shed-broom.png" });

  await pressShedButton(page, click);
  await pickTool(page, click, "hammer");
  await giveToWisp(page, click);
  await expectPicture(page, shut);

  await pressShedButton(page, click);
  await pickTool(page, click, "key");
  await giveToWisp(page, click);
  await expectMessage(page, "result");
  await expectPicture(page, open);
  await expectClosingLine(page, true);
  await page.screenshot({ path: "e2e/screenshots/desktop-shed-open.png" });

  await pressShedButton(page, click);
  expect((await gameState(page)).shed).toEqual(freshShed);
  expect(errors).toEqual([]);
});

test("REQ-5.10.3: a press that starts on a tool does not walk the hero, and a press on the floor does", async ({
  page,
}) => {
  const click = clicker(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await enterShed(page, click);
  const box = (await page.locator("canvas").boundingBox())!;
  const scale = box.width / 390;
  const at = (x: number, y: number) => ({ x: box.x + x * scale, y: box.y + y * scale });

  const { x, y } = toolCenter("key");
  const onTool = at(x, y);
  await page.mouse.move(onTool.x, onTool.y);
  const before = (await gameState(page)).hero;
  await page.mouse.down();
  await expect
    .poll(async () => (await gameState(page)).shed)
    .toEqual({ stage: "choosing", pick: "key" });
  await page.waitForTimeout(500);
  expect((await gameState(page)).hero).toEqual(before);
  await page.mouse.up();

  // The floor between the button and the tools: a held press there walks the hero.
  const floor = at(60, 600);
  await page.mouse.move(floor.x, floor.y);
  await page.mouse.down();
  await expect.poll(async () => (await gameState(page)).hero.x).toBeLessThan(before.x - 20);
  await page.mouse.up();
});
