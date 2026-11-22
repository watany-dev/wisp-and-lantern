import { expect, test, type Page } from "@playwright/test";
import { initialLane } from "../src/domain/lane";
import { bagMessage, titleBagButton } from "../src/game/bag-layout";
import { titleFieldButton } from "../src/game/field-layout";
import { canvas } from "../src/game/lane-layout";
import { leaveButton, titleShedButton } from "../src/game/shed-layout";
import { buttonCaption, buttonLabel } from "../src/game/title-layout";
import {
  enterBag,
  expectLesson,
  expectNext,
  expectPadlocks,
  expectRuleCard,
  expectTicks,
  freshBag,
  giveAllSafe,
  handOver,
  leaveFromEnd,
  leaveToTitle,
  nextBag,
  playAgain,
  safeNow,
  secretsNow,
  tapSecret,
} from "./bag-helpers";
import { freshField, inkPixels } from "./field-helpers";
import {
  canvasFrame,
  collectErrors,
  dispatch,
  expectBundledFont,
  fingerprint,
  gameState,
  minTextPixels,
  startTrial,
  tapper,
} from "./helpers";
import { expectClockShown, expectScoreDrawn, freshShed, scorePrint } from "./shed-helpers";

// Trial 4, The Listening Shadows (.kiro/specs/07-trial-keep-secrets): every press is a real touch tap on the
// canvas. The ticks, the padlocks, the rule card, the "Next" button, the clock, the score and the closing line
// are read from the pixels, not the state. The bag is a 60-second run on the real clock, so each test plays
// well under a minute. `dispatch` is used only for time up (`Tick`), which has no button.

async function openGame(page: Page, lang: "ja" | "en") {
  await page.goto(`./?lang=${lang}`);
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);
}

const messageBox = {
  x: bagMessage.x,
  y: bagMessage.y,
  width: bagMessage.wrap,
  height: bagMessage.height,
};
const messagePrint = (page: Page) => fingerprint(page, messageBox);

test("REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.4: the title's button opens the bag; a safe thing is handed over and scores; a secret is held back, in Japanese", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterBag(page, tap);
  const opened = await gameState(page);
  expect(opened).toMatchObject({ phase: "trial", trial: 4, lane: initialLane, shed: freshShed });
  expect(opened.field).toEqual(freshField(0, 0));
  expect(opened.bag).toEqual(freshBag(opened.bag.seed, 0));
  expect(opened.run).toMatchObject({ score: 0, streak: 0, best: 0 });

  // REQ-7.7.1: the clock and the score are drawn; the rule card is there, no tick, no padlock, no Next.
  await expectClockShown(page);
  await expectScoreDrawn(page);
  await expectRuleCard(page, true);
  await expectTicks(page, []);
  await expectPadlocks(page, []);
  await expectNext(page, false);
  await expectLesson(page, false);
  await page.screenshot({ path: "e2e/screenshots/mobile-bag-ja-start.png" });

  // A safe thing: handed over, ticked on the screen, and 100 points.
  const [first] = await safeNow(page);
  const startMessage = await messagePrint(page);
  const scoreBefore = await scorePrint(page);
  await handOver(page, tap, first!);
  await expectTicks(page, [first!]);
  expect((await gameState(page)).run).toMatchObject({ score: 100, streak: 1 });
  await expect.poll(() => scorePrint(page)).not.toBe(scoreBefore);
  await expect.poll(() => messagePrint(page)).not.toBe(startMessage);

  // A secret: nothing is handed over, the score stays, the streak ends, and the message changes.
  const [secret] = await secretsNow(page);
  const givenMessage = await messagePrint(page);
  await tapSecret(page, tap, secret!);
  const held = await gameState(page);
  expect(held.bag.stage === "giving" && held.bag.given[secret!]).toBe(false);
  expect(held.run).toMatchObject({ score: 100, streak: 0 });
  await expect.poll(() => messagePrint(page)).not.toBe(givenMessage);
  await expectTicks(page, [first!]);
  await expectPadlocks(page, []);
  await expectRuleCard(page, true);
  await page.screenshot({ path: "e2e/screenshots/mobile-bag-ja-secret.png" });

  // A thing already handed over, tapped again: nothing changes.
  const again = await gameState(page);
  await handOver(page, tap, first!);
  expect((await gameState(page)).bag).toEqual(again.bag);
  expect(errors).toEqual([]);
});

test("REQ-7.5, REQ-7.6: every safe thing handed over finishes the round: padlocks on the secrets, the closing line and Next; the next round has two secrets, in English", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "en");
  await enterBag(page, tap);
  const secrets0 = await secretsNow(page);
  expect(secrets0).toHaveLength(1);
  await giveAllSafe(page, tap);
  expect((await gameState(page)).run).toMatchObject({ score: 100 + 150 + 200 + 250, streak: 4 });
  await expectTicks(page, await safeNow(page));
  await expectPadlocks(page, secrets0);
  await expectRuleCard(page, false);
  await expectLesson(page, true);
  await expectNext(page, true);
  await page.screenshot({ path: "e2e/screenshots/mobile-bag-en-done.png" });

  // A done round takes no tap on a thing.
  const done = await gameState(page);
  await tap({ x: 75, y: 160 });
  await page.waitForTimeout(200);
  expect((await gameState(page)).bag).toEqual(done.bag);

  // Next: round 1, two secrets, the rule card back and nothing ticked. Each secret is held back.
  await nextBag(page, tap);
  expect((await gameState(page)).bag).toEqual(freshBag(done.bag.seed, 1));
  await expectLesson(page, false);
  await expectRuleCard(page, true);
  await expectNext(page, false);
  await expectTicks(page, []);
  const secrets1 = await secretsNow(page);
  expect(secrets1).toHaveLength(2);
  for (const i of secrets1) await tapSecret(page, tap, i);
  expect((await gameState(page)).bag).toMatchObject({ given: [false, false, false, false, false] });
  expect((await gameState(page)).run).toMatchObject({ score: 700, streak: 0 });
  await page.screenshot({ path: "e2e/screenshots/mobile-bag-en-secret.png" });
  await giveAllSafe(page, tap);
  await expectPadlocks(page, secrets1);
  await expectLesson(page, true);
  expect(errors).toEqual([]);
});

test("REQ-7.7.4, REQ-7.7.5, REQ-7.7.6: time up shows the end screen; play again keeps the best; Title goes back in a run, and a quick second tap does not start trial 1", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterBag(page, tap);
  await handOver(page, tap, (await safeNow(page))[0]!);

  await dispatch(page, { type: "Tick", ms: 60_000 });
  await expect.poll(async () => (await gameState(page)).phase).toBe("over");
  expect((await gameState(page)).run).toMatchObject({ score: 100, best: 100, record: true });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "e2e/screenshots/mobile-bag-ja-over.png" });

  await playAgain(page, tap);
  const again = await gameState(page);
  expect(again).toMatchObject({ phase: "trial", trial: 4 });
  expect(again.bag).toEqual(freshBag(again.bag.seed, 0));
  expect(again.run).toMatchObject({ score: 0, streak: 0, best: 100 });
  await expectClockShown(page);

  // A real quick double tap on Title: the title, and not trial 1.
  const { box, scale } = await canvasFrame(page);
  const leave = { x: box.x + leaveButton.x * scale, y: box.y + leaveButton.y * scale };
  await page.waitForTimeout(500);
  await page.touchscreen.tap(leave.x, leave.y);
  await page.touchscreen.tap(leave.x, leave.y);
  await expect.poll(async () => (await gameState(page)).phase).toBe("title");
  await page.waitForTimeout(300);
  const left = await gameState(page);
  expect(left).toMatchObject({ phase: "title", trial: 0, bag: freshBag(0, 0) });
  expect(left.run).toMatchObject({ remainingMs: 60_000, score: 0, best: 100 });

  await page.waitForTimeout(900);
  await startTrial(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 1, bag: freshBag(0, 0) });
  expect(errors).toEqual([]);
});

test("REQ-7.7.5: from the end screen Title goes back, and the bag opens again from there", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "en");
  await enterBag(page, tap);
  await dispatch(page, { type: "Tick", ms: 60_000 });
  await expect.poll(async () => (await gameState(page)).phase).toBe("over");
  await leaveFromEnd(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "title", trial: 0, bag: freshBag(0, 0) });
  await page.waitForTimeout(900);
  await enterBag(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 4 });
  await leaveToTitle(page, tap);
  expect(errors).toEqual([]);
});

test("REQ-7.1.1, REQ-7.1.3, REQ-7.13.4: the title has three buttons, each with its label and caption; a tap elsewhere still starts trial 1, in both languages", async ({
  page,
}) => {
  const tap = tapper(page);
  for (const lang of ["ja", "en"] as const) {
    await openGame(page, lang);
    for (const button of [titleBagButton, titleFieldButton, titleShedButton]) {
      const label = {
        x: button.x + buttonLabel.x,
        y: button.y + buttonLabel.y,
        width: 200,
        height: 26,
      };
      const caption = {
        x: button.x + buttonCaption.x,
        y: button.y + buttonCaption.y,
        width: 150,
        height: 20,
      };
      await expect.poll(() => inkPixels(page, label)).toBeGreaterThan(minTextPixels);
      await expect.poll(() => inkPixels(page, caption)).toBeGreaterThan(minTextPixels);
    }
    await page.screenshot({ path: `e2e/screenshots/mobile-bag-${lang}-title.png` });
  }
  await startTrial(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 1, bag: freshBag(0, 0) });
  expect(canvas.width).toBe(390);
});

for (const lang of ["ja", "en"] as const) {
  test(`REQ-7.10.2: plays the bag offline after the first load: hand-overs, a secret, a done round, Next and back, in ${lang}`, async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000);
    const errors = collectErrors(page);
    const tap = tapper(page);
    await openGame(page, lang);
    await page.waitForLoadState("networkidle");
    await context.setOffline(true);
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));

    await enterBag(page, tap);
    await tapSecret(page, tap, (await secretsNow(page))[0]!);
    await giveAllSafe(page, tap);
    await expectLesson(page, true);
    await nextBag(page, tap);
    await leaveToTitle(page, tap);
    expect((await gameState(page)).phase).toBe("title");

    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}
