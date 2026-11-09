import { expect, test, type Page } from "@playwright/test";
import { initialLane } from "../src/domain/lane";
import { initialRun } from "../src/domain/run";
import { toolCenter } from "../src/game/shed-layout";
import { wisp } from "../src/game/lane-layout";
import {
  collectErrors,
  dispatch,
  expectBundledFont,
  expectClosingLine,
  gameState,
  startTrial,
  tapper,
} from "./helpers";
import {
  closingLinePrint,
  enterShed,
  expectMarked,
  expectMessage,
  expectPicture,
  freshShed,
  giveToWisp,
  pickTool,
  pressShedButton,
  resultMessagePrint,
} from "./shed-helpers";

// Trial 2, The Locked Shed (.kiro/specs/05-trial-grant-tools): every press is a real touch tap on the
// canvas, and the picture, the tool names and the closing line are read from the pixels, not the state.
// `dispatch` is used only for the time and the language, which have no button on the screen.

const shut = { door: "shut", cat: "inside", star: false } as const;
const open = { door: "open", cat: "outside", star: true } as const;

async function openGame(page: Page, lang: "ja" | "en") {
  await page.goto(`./?lang=${lang}`);
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);
}

test("REQ-5.1 to REQ-5.9: the title's button opens the shed; a broom and a hammer leave the door shut; the key opens it, in Japanese", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-title.png" });

  // REQ-5.1: a tap on the button opens the shed and starts no run (nor trial 1).
  await enterShed(page, tap);
  const entered = await gameState(page);
  expect(entered).toMatchObject({ phase: "trial", trial: 2, lang: "ja", shed: freshShed });
  expect(entered.lane).toEqual(initialLane);
  expect(entered.run).toEqual(initialRun);
  await page.waitForTimeout(600);
  expect((await gameState(page)).run.remainingMs).toBe(60_000);
  await expectPicture(page, shut);
  await expectMarked(page, []);
  await expectMessage(page, "choosing");
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-choosing.png" });

  // REQ-5.4.3: the wisp with nothing picked changes nothing.
  await tap(wisp);
  await page.waitForTimeout(300);
  expect((await gameState(page)).shed).toEqual(freshShed);
  await expectPicture(page, shut);

  // REQ-5.3: picking marks one tool, replaces it, and uses nothing.
  await pickTool(page, tap, "broom");
  await expectMarked(page, ["broom"]);
  await pickTool(page, tap, "hammer");
  await expectMarked(page, ["hammer"]);
  await pickTool(page, tap, "broom");
  await expectMarked(page, ["broom"]);
  await expectPicture(page, shut);
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-picked.png" });

  // REQ-5.5, REQ-5.6: the broom is handed over; the door stays shut and the cat stays inside.
  await giveToWisp(page, tap);
  expect((await gameState(page)).shed).toEqual({ stage: "tried", tool: "broom" });
  await expectMessage(page, "result");
  await expectPicture(page, shut);
  await expectClosingLine(page, false);
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-broom.png" });

  // REQ-5.4.4: while the result shows, the pick and the hand-over are locked, and time changes nothing.
  await tap(toolCenter("key"));
  await tap(wisp);
  await dispatch(page, { type: "Tick", ms: 60_000 });
  await page.waitForTimeout(300);
  expect(await gameState(page)).toMatchObject({
    phase: "trial",
    trial: 2,
    shed: { stage: "tried", tool: "broom" },
  });
  await expectPicture(page, shut);

  // REQ-5.6: the retry returns to the same shed with nothing picked.
  await pressShedButton(page, tap);
  expect((await gameState(page)).shed).toEqual(freshShed);
  await expectMarked(page, []);
  await expectPicture(page, shut);
  expect(errors).toEqual([]);
});

test("REQ-5.5 to REQ-5.8: the hammer leaves the door shut; the key opens it and the closing line stays; play again, in Japanese", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterShed(page, tap);
  await pickTool(page, tap, "broom");
  await giveToWisp(page, tap);
  await expectMessage(page, "result");
  const broomMessage = await resultMessagePrint(page);
  await pressShedButton(page, tap);
  await pickTool(page, tap, "hammer");
  await giveToWisp(page, tap);
  expect((await gameState(page)).shed).toEqual({ stage: "tried", tool: "hammer" });
  await expectMessage(page, "result");
  await expectPicture(page, shut);
  // The message names the tool that was tried: it is drawn differently for the hammer.
  await expect.poll(() => resultMessagePrint(page)).not.toBe(broomMessage);

  // REQ-5.5.1, REQ-5.8: the key opens the door; the message and the closing line are on the screen.
  await pressShedButton(page, tap);
  await pickTool(page, tap, "key");
  await giveToWisp(page, tap);
  expect((await gameState(page)).shed).toEqual({ stage: "tried", tool: "key" });
  await expectMessage(page, "result");
  await expectPicture(page, open);
  await expectClosingLine(page, true);
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-open.png" });

  // The same state in English draws different words in the same place (REQ-5.12.4).
  const japanese = await closingLinePrint(page);
  await dispatch(page, { type: "SetLang", lang: "en" });
  await expect.poll(() => closingLinePrint(page)).not.toBe(japanese);
  await expectClosingLine(page, true);
  await expectPicture(page, open);
  expect((await gameState(page)).shed).toEqual({ stage: "tried", tool: "key" });
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-en-open.png" });

  // REQ-5.7.2: nothing removes the result or the closing line by itself.
  await page.waitForTimeout(1_000);
  await expectClosingLine(page, true);
  await expectPicture(page, open);

  // REQ-5.7.3: play again returns to a fresh shed, and the key opens it again.
  await pressShedButton(page, tap);
  expect((await gameState(page)).shed).toEqual(freshShed);
  await expectPicture(page, shut);
  await pickTool(page, tap, "key");
  await giveToWisp(page, tap);
  await expectPicture(page, open);
  await expectClosingLine(page, true);
  expect(errors).toEqual([]);
});

test("REQ-5.5, REQ-5.6, REQ-5.8: a hammer leaves the door shut, then the key opens it, in English", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "en");
  await enterShed(page, tap);
  expect((await gameState(page)).lang).toBe("en");

  await pickTool(page, tap, "hammer");
  await expectMarked(page, ["hammer"]);
  await giveToWisp(page, tap);
  await expectMessage(page, "result");
  await expectPicture(page, shut);
  await expectClosingLine(page, false);
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-en-hammer.png" });

  await pressShedButton(page, tap);
  await pickTool(page, tap, "key");
  await giveToWisp(page, tap);
  await expectMessage(page, "result");
  await expectPicture(page, open);
  await expectClosingLine(page, true);
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-en-key.png" });
  expect(errors).toEqual([]);
});

test("REQ-5.1.3, REQ-5.9: a tap elsewhere on the title still starts trial 1, not the shed", async ({
  page,
}) => {
  const tap = tapper(page);
  await openGame(page, "en");
  await startTrial(page, tap);
  const state = await gameState(page);
  expect(state).toMatchObject({ phase: "trial", trial: 1, shed: freshShed });
  await expect.poll(async () => (await gameState(page)).run.remainingMs).toBeLessThan(59_900);
});

for (const lang of ["ja", "en"] as const) {
  test(`REQ-5.11: plays the shed offline after the first load: shut, retry, open, in ${lang}`, async ({
    page,
    context,
  }) => {
    const errors = collectErrors(page);
    const tap = tapper(page);
    await openGame(page, lang);
    await page.waitForLoadState("networkidle");
    await context.setOffline(true);
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));

    await enterShed(page, tap);
    await pickTool(page, tap, "broom");
    await giveToWisp(page, tap);
    await expectPicture(page, shut);
    await pressShedButton(page, tap);
    await pickTool(page, tap, "key");
    await giveToWisp(page, tap);
    await expectPicture(page, open);
    await expectClosingLine(page, true);

    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}
