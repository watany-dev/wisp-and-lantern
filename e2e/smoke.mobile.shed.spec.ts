import { expect, test, type Page } from "@playwright/test";
import { initialLane } from "../src/domain/lane";
import { buttonRect, wisp } from "../src/game/lane-layout";
import { leaveButton, overLeave, toolCenter } from "../src/game/shed-layout";
import {
  canvasFrame,
  collectErrors,
  dispatch,
  expectBundledFont,
  expectClosingLine,
  gameState,
  pressUntil,
  startTrial,
  tapper,
  type Press,
} from "./helpers";
import {
  closingLinePrint,
  enterShed,
  expectClockShown,
  expectMarked,
  expectMessage,
  expectPicture,
  expectPictureNow,
  expectScoreDrawn,
  freshShed,
  giveToWisp,
  guidePrint,
  nextSeed,
  pickTool,
  pressLeave,
  pressShedButton,
  resultMessagePrint,
  rigSeed,
  rightTool,
  scorePrint,
  shedAt,
  wrongTool,
} from "./shed-helpers";

// Trial 2, The Locked Shed (.kiro/specs/05-trial-grant-tools, revision 2): a 60-second time attack with
// five puzzles. Every press is a real touch tap on the canvas, and the picture, the obstacle, the tool
// names and the closing line are read from the pixels, not the state. `dispatch` is used only for the
// time and the language, which have no button on the screen. The order of the puzzles comes from a seed
// the test sets (`enterShed(page, tap, seed)`): seed n starts at puzzle n of lock, leaves, boards, rope,
// roof, and goes on in that order.

async function openGame(page: Page, lang: "ja" | "en") {
  await rigSeed(page);
  await page.goto(`./?lang=${lang}`);
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);
}

/** Hands over the answer to this round's puzzle, checks the freed cat on the screen, then goes on. */
async function solveRound(page: Page, press: Press) {
  const state = await gameState(page);
  await expectPictureNow(page, false);
  await pickTool(page, press, rightTool(state));
  await giveToWisp(page, press);
  await expectMessage(page, "result");
  await expectPictureNow(page, true);
  await expectClosingLine(page, true);
  await pressShedButton(page, press);
}

/** Hands over a tool that does not answer this round's puzzle: the puzzle stays as it was. */
async function missRound(page: Page, press: Press) {
  const state = await gameState(page);
  await pickTool(page, press, wrongTool(state));
  await giveToWisp(page, press);
  await expectMessage(page, "result");
  await expectPictureNow(page, false);
  await expectClosingLine(page, false);
}

const playAgain = (page: Page, press: Press) =>
  pressUntil(page, press, { x: buttonRect.x, y: buttonRect.y }, (s) => s.phase === "trial");
const leaveFromEnd = (page: Page, press: Press) =>
  pressUntil(page, press, { x: overLeave.x, y: overLeave.y }, (s) => s.phase === "title");

test("REQ-5.1, REQ-5.2, REQ-5.7: the title's button opens the shed and starts a 60-second run; picking, a wrong tool and the retry, in Japanese", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-title.png" });

  // REQ-5.1.2: a tap on the button opens the shed and starts a run (not trial 1).
  await enterShed(page, tap, 0);
  const entered = await gameState(page);
  expect(entered).toMatchObject({ phase: "trial", trial: 2, lang: "ja", shed: freshShed });
  expect(entered.lane).toEqual(initialLane);
  expect(entered.run).toMatchObject({ score: 0, streak: 0 });
  // REQ-5.7.1: the clock runs from the first tap, and the top row shows it.
  await expect.poll(async () => (await gameState(page)).run.remainingMs).toBeLessThan(59_500);
  await expectClockShown(page);
  await expectScoreDrawn(page);
  await expectPicture(page, { puzzle: "lock", solved: false });
  await expectMarked(page, []);
  await expectMessage(page, "choosing");
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-choosing.png" });

  // REQ-5.4.3: the wisp with nothing picked changes nothing.
  await tap(wisp);
  await page.waitForTimeout(300);
  expect((await gameState(page)).shed).toEqual(freshShed);
  await expectPicture(page, { puzzle: "lock", solved: false });

  // REQ-5.3: picking marks one tool of the five, replaces it, and uses nothing.
  await pickTool(page, tap, "broom");
  await expectMarked(page, ["broom"]);
  await pickTool(page, tap, "ladder");
  await expectMarked(page, ["ladder"]);
  await pickTool(page, tap, "broom");
  await expectMarked(page, ["broom"]);
  await expectPicture(page, { puzzle: "lock", solved: false });
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-picked.png" });

  // REQ-5.5, REQ-5.6: the broom does not fit the lock; the door stays shut and the cat stays inside.
  await giveToWisp(page, tap);
  expect((await gameState(page)).shed).toEqual({
    stage: "tried",
    seed: 0,
    round: 0,
    tool: "broom",
  });
  await expectMessage(page, "result");
  await expectPicture(page, { puzzle: "lock", solved: false });
  await expectClosingLine(page, false);
  expect((await gameState(page)).run).toMatchObject({ score: 0, streak: 0 });
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-broom.png" });

  // REQ-5.4.4: while the result shows, the pick and the hand-over are locked.
  await tap(toolCenter("key"));
  await tap(wisp);
  await page.waitForTimeout(300);
  expect((await gameState(page)).shed).toMatchObject({ stage: "tried", tool: "broom" });
  await expectPicture(page, { puzzle: "lock", solved: false });

  // REQ-5.6: the retry is the same puzzle with nothing picked, and costs no points.
  await pressShedButton(page, tap);
  expect((await gameState(page)).shed).toEqual(freshShed);
  await expectMarked(page, []);
  expect((await gameState(page)).run).toMatchObject({ score: 0, streak: 0 });
  expect(errors).toEqual([]);
});

test("REQ-5.5, REQ-5.7, REQ-5.8: the key frees the cat for 100 points and the closing line stays; the next puzzle is the leaves, in Japanese", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterShed(page, tap, 0);
  await expectPicture(page, { puzzle: "lock", solved: false });

  // REQ-5.5, REQ-5.8: the key frees the cat; the message and the closing line are on the screen; 100 points.
  const before = await scorePrint(page);
  await pickTool(page, tap, "key");
  await giveToWisp(page, tap);
  await expectMessage(page, "result");
  await expectPicture(page, { puzzle: "lock", solved: true });
  await expectClosingLine(page, true);
  expect((await gameState(page)).run).toMatchObject({ score: 100, streak: 1 });
  await expect.poll(() => scorePrint(page)).not.toBe(before);
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-lock-freed.png" });

  // REQ-5.7.2: nothing removes the result or the closing line by itself.
  await page.waitForTimeout(800);
  await expectClosingLine(page, true);
  await expectPicture(page, { puzzle: "lock", solved: true });

  // REQ-5.2.3: the next puzzle is a different one, with its own guide and its own answer.
  const lockGuide = await guidePrint(page);
  await pressShedButton(page, tap);
  expect((await gameState(page)).shed).toEqual(shedAt(0, 1));
  await expect.poll(() => guidePrint(page)).not.toBe(lockGuide);
  await expectPicture(page, { puzzle: "leaves", solved: false });
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-leaves.png" });
  expect(errors).toEqual([]);
});

test("REQ-5.2.3, REQ-5.5: the boards and the hammer, the rope and the scissors, the cat on the roof and the ladder, in Japanese", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  // Seed 2 starts at the boards and goes on to the rope and the roof.
  await enterShed(page, tap, 2);
  await expectPicture(page, { puzzle: "boards", solved: false });
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-boards.png" });
  await missRound(page, tap);
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-boards-stuck.png" });
  await pressShedButton(page, tap);
  expect((await gameState(page)).shed).toEqual(shedAt(2, 0));
  await solveRound(page, tap);

  await expectPicture(page, { puzzle: "rope", solved: false });
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-rope.png" });
  await solveRound(page, tap);

  await expectPicture(page, { puzzle: "roof", solved: false });
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-ja-roof.png" });
  await solveRound(page, tap);
  expect((await gameState(page)).run).toMatchObject({ score: 450, streak: 3 });
  expect(errors).toEqual([]);
});

test("REQ-5.5, REQ-5.6, REQ-5.8: the roof first, a hammer does not help, then the ladder frees the cat, in English", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "en");
  await enterShed(page, tap, 4);
  expect((await gameState(page)).lang).toBe("en");
  await expectPicture(page, { puzzle: "roof", solved: false });
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-en-roof.png" });

  await pickTool(page, tap, "hammer");
  await expectMarked(page, ["hammer"]);
  await giveToWisp(page, tap);
  await expectMessage(page, "result");
  await expectPicture(page, { puzzle: "roof", solved: false });
  await expectClosingLine(page, false);
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-en-hammer.png" });
  const hammerMessage = await resultMessagePrint(page);

  // Another wrong tool: the message names the tool that was tried, so it is drawn differently.
  await pressShedButton(page, tap);
  await pickTool(page, tap, "scissors");
  await giveToWisp(page, tap);
  await expectMessage(page, "result");
  await expectPicture(page, { puzzle: "roof", solved: false });
  await expect.poll(() => resultMessagePrint(page)).not.toBe(hammerMessage);

  await pressShedButton(page, tap);
  await pickTool(page, tap, "ladder");
  await giveToWisp(page, tap);
  await expectMessage(page, "result");
  await expectPicture(page, { puzzle: "roof", solved: true });
  await expectClosingLine(page, true);
  // The same state in Japanese draws different words in the same place (REQ-5.12.4).
  const english = await closingLinePrint(page);
  await dispatch(page, { type: "SetLang", lang: "ja" });
  await expect.poll(() => closingLinePrint(page)).not.toBe(english);
  await expectPicture(page, { puzzle: "roof", solved: true });
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-en-ladder.png" });
  expect(errors).toEqual([]);
});

test("REQ-5.7.4, REQ-5.7.5, REQ-5.16: time up shows the end screen; play again starts a new run; the title button goes back; the best is kept", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "en");
  await enterShed(page, tap, 1);
  await solveRound(page, tap);
  expect((await gameState(page)).run.score).toBe(100);

  // The clock ran out: the end screen replaces the shed, with the score and the best.
  await dispatch(page, { type: "Tick", ms: 60_000 });
  await expect.poll(async () => (await gameState(page)).phase).toBe("over");
  expect(await gameState(page)).toMatchObject({ phase: "over", trial: 2 });
  expect((await gameState(page)).run).toMatchObject({ score: 100, best: 100, record: true });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "e2e/screenshots/mobile-shed-en-over.png" });

  // Play again: a full clock, a score of 0, round 0 of a new order, the best kept.
  await nextSeed(page, 3);
  await playAgain(page, tap);
  expect(await gameState(page)).toMatchObject({
    phase: "trial",
    trial: 2,
    shed: shedAt(3, 0),
  });
  expect((await gameState(page)).run).toMatchObject({ score: 0, streak: 0, best: 100 });
  await expectPicture(page, { puzzle: "rope", solved: false });

  // The way back, in the middle of a run: the title, with the best score kept and nothing of the run. A
  // child's quick second tap lands on the title, where a tap anywhere starts trial 1, so the title ignores
  // taps for a moment after the shed sent the child back.
  const { box, scale } = await canvasFrame(page);
  const leave = { x: box.x + leaveButton.x * scale, y: box.y + leaveButton.y * scale };
  await page.touchscreen.tap(leave.x, leave.y);
  await page.touchscreen.tap(leave.x, leave.y);
  await expect.poll(async () => (await gameState(page)).phase).toBe("title");
  await page.waitForTimeout(300);
  const left = await gameState(page);
  expect(left).toMatchObject({ phase: "title", trial: 0, shed: freshShed });
  expect(left.run).toMatchObject({ remainingMs: 60_000, score: 0, best: 100 });

  // From the title the shed opens again; time up and the end screen's own title button.
  await page.waitForTimeout(600);
  await enterShed(page, tap, 0);
  await dispatch(page, { type: "Tick", ms: 60_000 });
  await expect.poll(async () => (await gameState(page)).phase).toBe("over");
  await leaveFromEnd(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "title", trial: 0, shed: freshShed });
  expect((await gameState(page)).run.best).toBe(100);
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
  test(`REQ-5.11: plays the shed offline after the first load: miss, retry, free, next, back to the title, in ${lang}`, async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    const errors = collectErrors(page);
    const tap = tapper(page);
    await openGame(page, lang);
    await page.waitForLoadState("networkidle");
    await context.setOffline(true);
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));

    await enterShed(page, tap, 0);
    await missRound(page, tap);
    await pressShedButton(page, tap);
    await solveRound(page, tap);
    await solveRound(page, tap);
    await expectPicture(page, { puzzle: "boards", solved: false });
    await pressLeave(page, tap);
    expect((await gameState(page)).phase).toBe("title");

    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}
