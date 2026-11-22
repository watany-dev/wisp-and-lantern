import { expect, test, type Page } from "@playwright/test";
import { initialLane } from "../src/domain/lane";
import { buttonRects } from "../src/game/field-layout";
import { titleFieldButton } from "../src/game/field-layout";
import { canvas } from "../src/game/lane-layout";
import { titleShadowsButton } from "../src/game/shadows-layout";
import { leaveButton, titleShedButton } from "../src/game/shed-layout";
import { buttonCaption, buttonLabel } from "../src/game/title-layout";
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
  textPixels,
} from "./helpers";
import { expectButtons, inkPixels } from "./field-helpers";
import { expectClockShown, expectScoreDrawn, freshShed, rigSeed } from "./shed-helpers";
import {
  bubbleContent,
  closingBox,
  decide,
  enterShadows,
  expectBadges,
  expectHeard,
  freshShadows,
  itemNow,
  leaveFromEnd,
  leaveToTitle,
  messageBox,
  nextItem,
  playAgain,
  rightChoice,
  tileArt,
  wrongChoice,
} from "./shadows-helpers";

// Trial 4, The Listening Shadows (.kiro/specs/07-trial-keep-secrets): every press is a real touch tap on the
// canvas. The tick, the padlock, the bubble, the buttons, the clock, the score, the message and the closing line
// are read from the pixels, not the state, by brightness only. Trial 4 is a 60-second run on the real clock, so
// each test plays well under a minute. `dispatch` is used only for the language and time up (`Tick`). The seed is
// rigged so that the order of the items is known: seed 0 plays the house key, the candy, the ball, the address,
// the password and the flower.

async function openGame(page: Page, lang: "ja" | "en") {
  await rigSeed(page);
  await page.goto(`./?lang=${lang}`);
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);
}

const closingPrint = (page: Page) => fingerprint(page, closingBox);
const messagePrint = (page: Page) => fingerprint(page, messageBox);

test("REQ-7.1, REQ-7.2, REQ-7.7.1: the title's button opens trial 4 and starts a 60-second run; the clock, the score and the way back are on screen; the item, its name and the two buttons are there, and the shadow's bubble, the badges and the closing line are not, in Japanese", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterShadows(page, tap);
  const entered = await gameState(page);
  expect(entered).toMatchObject({ phase: "trial", trial: 4, lang: "ja" });
  expect(entered.shadows).toEqual(freshShadows(0, 0));
  expect(entered.lane).toEqual(initialLane);
  expect(entered.shed).toEqual(freshShed);
  expect(entered.run).toMatchObject({ score: 0, streak: 0, best: 0, record: false });
  expect(itemNow(entered)).toBe("houseKey");

  await expect.poll(async () => (await gameState(page)).run.remainingMs).toBeLessThan(59_900);
  await expectClockShown(page);
  await expectScoreDrawn(page);
  const leaveLabel = { x: leaveButton.x, y: leaveButton.y, width: 70, height: 22 };
  await expect.poll(() => inkPixels(page, leaveLabel)).toBeGreaterThan(minTextPixels);

  await expectButtons(page, ["left", "right"]);
  await expectHeard(page, "none");
  await expectBadges(page, { tick: false, lock: false });
  await expect.poll(() => textPixels(page, messageBox)).toBeGreaterThan(minTextPixels);
  expect(await textPixels(page, closingBox)).toBe(0);
  await page.screenshot({ path: "e2e/screenshots/mobile-shadows-ja-start.png" });
  expect(errors).toEqual([]);
});

test("REQ-7.3, REQ-7.7.3: a secret given, a thing that is fine to give given, kept, and a secret kept: each decision scores or ends the streak as the rules say, shows its badges, its bubble and its closing line, and a quick second tap changes nothing, in English", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "en");
  await enterShadows(page, tap);

  // Round 0, the house key: giving a secret scores nothing. The shadow heard it, and the closing line says why.
  // A quick second tap lands on the button that replaced the first one ("Next"), which ignores presses for a
  // moment, so the round stays decided.
  const ask = await messagePrint(page);
  const key = await fingerprint(page, tileArt);
  expect(wrongChoice(await gameState(page))).toBe("give");
  await page.waitForTimeout(600);
  const { box, scale } = await canvasFrame(page);
  const press = (slot: "left" | "single") => ({
    x: box.x + buttonRects[slot].x * scale,
    y: box.y + buttonRects[slot].y * scale,
  });
  await page.touchscreen.tap(press("left").x, press("left").y);
  await page.touchscreen.tap(press("single").x, press("single").y);
  await expect.poll(async () => (await gameState(page)).shadows.stage).toBe("decided");
  let state = await gameState(page);
  expect(state.shadows).toEqual({ stage: "decided", seed: 0, round: 0, choice: "give" });
  expect(state.run).toMatchObject({ score: 0, streak: 0 });
  await expectBadges(page, { tick: false, lock: false });
  await expectHeard(page, "item");
  await expectButtons(page, ["single"]);
  await expect.poll(() => textPixels(page, closingBox)).toBeGreaterThan(minTextPixels);
  expect(await messagePrint(page)).not.toBe(ask);
  const keyHeard = await fingerprint(page, bubbleContent);
  await page.screenshot({ path: "e2e/screenshots/mobile-shadows-en-given-secret.png" });
  await nextItem(page, tap);

  // Round 1, the candy: giving it is right. It scores 100, ticks the tile, and is in the bubble.
  state = await gameState(page);
  expect(itemNow(state)).toBe("candy");
  expect(rightChoice(state)).toBe("give");
  await expectHeard(page, "none");
  await expectBadges(page, { tick: false, lock: false });
  expect(await textPixels(page, closingBox)).toBe(0);
  expect(await fingerprint(page, tileArt)).not.toBe(key);
  await decide(page, tap, "give");
  expect((await gameState(page)).run).toMatchObject({ score: 100, streak: 1 });
  await expectBadges(page, { tick: true, lock: false });
  await expectHeard(page, "item");
  expect(await fingerprint(page, bubbleContent)).not.toBe(keyHeard);
  await page.screenshot({ path: "e2e/screenshots/mobile-shadows-en-given-safe.png" });
  await nextItem(page, tap);

  // Round 2, the ball: keeping it scores nothing and ends the streak. It is locked, and the shadow heard nothing.
  expect(itemNow(await gameState(page))).toBe("ball");
  await decide(page, tap, "keep");
  expect((await gameState(page)).run).toMatchObject({ score: 100, streak: 0 });
  await expectBadges(page, { tick: false, lock: true });
  await expectHeard(page, "quiet");
  await nextItem(page, tap);

  // Round 3, the address: keeping it is right. A tick and a padlock, and 100 again as the streak began again.
  expect(itemNow(await gameState(page))).toBe("address");
  await decide(page, tap, "keep");
  expect((await gameState(page)).run).toMatchObject({ score: 200, streak: 1 });
  await expectBadges(page, { tick: true, lock: true });
  await expectHeard(page, "quiet");
  expect(await closingPrint(page)).not.toBe("");
  await page.screenshot({ path: "e2e/screenshots/mobile-shadows-en-kept-secret.png" });
  expect(errors).toEqual([]);
});

test("REQ-7.7.2, REQ-7.5: the next item comes only after a decision; the six items go by in order, each with its own name and closing line, and the streak pays 100, 150, 200, 250", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterShadows(page, tap, 1);
  const seen = new Set<string>();
  const names = new Set<string>();
  for (const [round, expected] of [100, 250, 450, 700].entries()) {
    const state = await gameState(page);
    expect(state.shadows.round).toBe(round);
    seen.add(itemNow(state));
    names.add(await messagePrint(page));
    await decide(page, tap, rightChoice(state));
    expect((await gameState(page)).run.score).toBe(expected);
    await nextItem(page, tap);
  }
  // Seed 1 plays the ball, the address, the password, the candy: all different, with different words.
  expect(seen.size).toBe(4);
  expect(names.size).toBe(4);
  expect(errors).toEqual([]);
});

test("REQ-7.7.4, REQ-7.7.5: time up shows the end screen; play again starts a new run; the title button goes back, in a run and on the end screen; the best is kept", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "en");
  await enterShadows(page, tap);
  await decide(page, tap, "keep");
  expect((await gameState(page)).run.score).toBe(100);

  // The clock ran out: the end screen replaces trial 4, with the score and the best.
  await dispatch(page, { type: "Tick", ms: 60_000 });
  await expect.poll(async () => (await gameState(page)).phase).toBe("over");
  expect(await gameState(page)).toMatchObject({ phase: "over", trial: 4 });
  expect((await gameState(page)).run).toMatchObject({ score: 100, best: 100, record: true });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "e2e/screenshots/mobile-shadows-en-over.png" });

  // Play again: a full clock, a score of 0, round 0 of a new seed, the best kept.
  await playAgain(page, tap);
  const again = await gameState(page);
  expect(again).toMatchObject({ phase: "trial", trial: 4 });
  expect(again.shadows).toMatchObject({ stage: "deciding", round: 0 });
  expect(again.run).toMatchObject({ score: 0, streak: 0, best: 100 });
  await expectClockShown(page);
  await expectButtons(page, ["left", "right"]);

  // The way back, in the middle of a run: the title, with the best score kept and nothing of the run. A
  // child's quick second tap lands on the title, where a tap anywhere starts trial 1, so the title ignores
  // taps for a moment after trial 4 sent the child back.
  await decide(page, tap, rightChoice(again));
  const { box, scale } = await canvasFrame(page);
  const leave = { x: box.x + leaveButton.x * scale, y: box.y + leaveButton.y * scale };
  await page.touchscreen.tap(leave.x, leave.y);
  await page.touchscreen.tap(leave.x, leave.y);
  await expect.poll(async () => (await gameState(page)).phase).toBe("title");
  await page.waitForTimeout(300);
  const left = await gameState(page);
  expect(left).toMatchObject({ phase: "title", trial: 0, shadows: freshShadows(0, 0) });
  expect(left.run).toMatchObject({ remainingMs: 60_000, score: 0, best: 100 });
  await page.screenshot({ path: "e2e/screenshots/mobile-shadows-en-back.png" });

  // The lock is short: a tap elsewhere on the title starts trial 1 once it has passed.
  await page.waitForTimeout(900);
  await startTrial(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 1 });
  expect((await gameState(page)).shadows).toEqual(freshShadows(0, 0));
  expect(errors).toEqual([]);
});

test("REQ-7.7.5: from the end screen the title button goes back to the title, and trial 4 opens again from there", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterShadows(page, tap);
  await dispatch(page, { type: "Tick", ms: 60_000 });
  await expect.poll(async () => (await gameState(page)).phase).toBe("over");
  await page.waitForTimeout(900);
  await page.screenshot({ path: "e2e/screenshots/mobile-shadows-ja-over.png" });
  await leaveFromEnd(page, tap);
  expect(await gameState(page)).toMatchObject({
    phase: "title",
    trial: 0,
    shadows: freshShadows(0, 0),
  });
  expect((await gameState(page)).run).toMatchObject({ remainingMs: 60_000, score: 0, best: 0 });
  await page.waitForTimeout(900);
  await enterShadows(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 4 });
  await leaveToTitle(page, tap);
  expect(errors).toEqual([]);
});

test("REQ-7.10: nothing needs color or sound: on a grayscale screen the badges and the bubble still read, and the game makes no sound", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await page.addInitScript(() => {
    const sounds: string[] = [];
    (window as unknown as { __sounds: string[] }).__sounds = sounds;
    const w = window as unknown as Record<
      string,
      { prototype: Record<string, unknown> } | undefined
    >;
    for (const [name, method] of [
      ["AudioContext", "createOscillator"],
      ["AudioContext", "createBufferSource"],
      ["HTMLMediaElement", "play"],
    ] as const) {
      const proto = w[name]?.prototype;
      const original = proto?.[method] as ((...a: unknown[]) => unknown) | undefined;
      if (proto && original) {
        proto[method] = function (this: unknown, ...a: unknown[]) {
          sounds.push(`${name}.${method}`);
          return original.apply(this, a);
        };
      }
    }
  });
  await openGame(page, "en");
  await enterShadows(page, tap);
  await page.addStyleTag({ content: "canvas { filter: grayscale(1) }" });
  await expectHeard(page, "none");
  await expectBadges(page, { tick: false, lock: false });

  await decide(page, tap, "keep");
  await expectBadges(page, { tick: true, lock: true });
  await expectHeard(page, "quiet");
  await nextItem(page, tap);
  await decide(page, tap, "give");
  await expectBadges(page, { tick: true, lock: false });
  await expectHeard(page, "item");
  expect(await page.evaluate(() => (window as unknown as { __sounds: string[] }).__sounds)).toEqual(
    [],
  );
  expect(errors).toEqual([]);
});

test("REQ-7.1.3, REQ-7.1.6: a tap elsewhere on the title still starts trial 1; the third button has its label and its 60-second caption, and opens trial 4 only, in both languages", async ({
  page,
}) => {
  const tap = tapper(page);
  for (const lang of ["ja", "en"] as const) {
    await openGame(page, lang);
    for (const button of [titleShadowsButton, titleFieldButton, titleShedButton]) {
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
    await page.screenshot({ path: `e2e/screenshots/mobile-shadows-${lang}-title.png` });
  }
  await startTrial(page, tap);
  expect(await gameState(page)).toMatchObject({
    phase: "trial",
    trial: 1,
    shadows: freshShadows(0, 0),
    shed: freshShed,
  });
  expect(canvas.width).toBe(390);

  // The new button opens trial 4 and nothing else; the other buttons still open theirs.
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await enterShadows(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 4 });
});

for (const lang of ["ja", "en"] as const) {
  test(`REQ-7.10: plays trial 4 offline after the first load: decide, next, time up and back, in ${lang}`, async ({
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

    await enterShadows(page, tap);
    await decide(page, tap, "give");
    await expectHeard(page, "item");
    await nextItem(page, tap);
    await decide(page, tap, "give");
    await expect.poll(() => textPixels(page, closingBox)).toBeGreaterThan(minTextPixels);
    await leaveToTitle(page, tap);
    expect((await gameState(page)).phase).toBe("title");

    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}
