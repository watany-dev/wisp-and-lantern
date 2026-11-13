import { expect, test } from "@playwright/test";
import { toolCenter } from "../src/game/shed-layout";
import { clicker, collectErrors, expectBundledFont, expectClosingLine, gameState } from "./helpers";
import {
  enterShed,
  expectClockShown,
  expectMarked,
  expectMessage,
  expectPicture,
  freshShed,
  giveToWisp,
  pickTool,
  pressLeave,
  pressShedButton,
  rigSeed,
  shedAt,
} from "./shed-helpers";

test("REQ-5.10, REQ-5.14: plays the shed with the mouse only: a wrong tool, the answer, the next puzzle, the way back, in English", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const click = clicker(page);
  await rigSeed(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);

  // Seed 0: the lock first, then the leaves.
  await enterShed(page, click, 0);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 2, shed: freshShed });
  expect((await gameState(page)).run).toMatchObject({ score: 0, streak: 0 });
  await expectClockShown(page);
  await expectPicture(page, { puzzle: "lock", solved: false });

  await pickTool(page, click, "scissors");
  await expectMarked(page, ["scissors"]);
  await giveToWisp(page, click);
  await expectMessage(page, "result");
  await expectPicture(page, { puzzle: "lock", solved: false });
  await page.screenshot({ path: "e2e/screenshots/desktop-shed-scissors.png" });

  await pressShedButton(page, click);
  await pickTool(page, click, "key");
  await giveToWisp(page, click);
  await expectMessage(page, "result");
  await expectPicture(page, { puzzle: "lock", solved: true });
  await expectClosingLine(page, true);
  expect((await gameState(page)).run).toMatchObject({ score: 100, streak: 1 });
  await page.screenshot({ path: "e2e/screenshots/desktop-shed-freed.png" });

  await pressShedButton(page, click);
  expect((await gameState(page)).shed).toEqual(shedAt(0, 1));
  await expectPicture(page, { puzzle: "leaves", solved: false });

  await pressLeave(page, click);
  expect(await gameState(page)).toMatchObject({ phase: "title", trial: 0, shed: freshShed });
  expect(errors).toEqual([]);
});

test("REQ-5.10.3: a press that starts on a tool does not walk the hero, and a press on the floor does", async ({
  page,
}) => {
  const click = clicker(page);
  await rigSeed(page);
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
    .toMatchObject({ stage: "choosing", pick: "key" });
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
