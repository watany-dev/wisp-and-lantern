import { expect, test } from "@playwright/test";
import { wishAt } from "../src/domain/lane";
import { cardCenter, wisp } from "../src/game/lane-layout";
import {
  askWisp,
  collectErrors,
  dispatch,
  expectBrought,
  expectBundledFont,
  expectClosingLine,
  fingerprint,
  gameState,
  lessonArea,
  pickCards,
  pickOne,
  pressButton,
  startTrial,
  tapper,
} from "./helpers";

test("boots on a phone and starts the game with a tap", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("./");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expectBundledFont(page);
  await page.screenshot({ path: "e2e/screenshots/mobile-title.png" });

  // The scene registers its pointer listener after its assets load, so an early tap is lost.
  // Tap again until the phase changes; a broken tap handler never gets there and still fails.
  await expect(async () => {
    await canvas.tap({ timeout: 2_000 });
    expect((await gameState(page)).phase).toBe("trial");
  }).toPass({ timeout: 15_000 });
  expect(errors).toEqual([]);
});

// Trial 1 (.kiro/specs/02-trial-tell and 03-trial-tell-vague-request): every press below is a real
// touch tap on the canvas, and what the wisp brought is read from the pixels, not from the state.
// The first wish is the yellow lantern (`balance.wishes[0]`). What one card brings for it, written
// out by hand from the table in the design: yellow only brings the yellow pumpkin, lantern only
// the red lantern.
const wish = wishAt(0);
const emptyLane = { wish: 0, pick: { color: null, thing: null }, asked: false };

test("REQ-3.1, REQ-3.2, REQ-3.3, REQ-3.4, REQ-3.5: a color alone brings another object, then both cards find the wish, in Japanese", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const tap = tapper(page);
  await page.goto("./?lang=ja");
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);
  await startTrial(page, tap);
  expect((await gameState(page)).lang).toBe("ja");

  // One card is a request: picking does not send the wisp, tapping the wisp does.
  await pickOne(page, tap, "yellow");
  await askWisp(page, tap);
  expect((await gameState(page)).lane).toEqual({
    wish: 0,
    pick: { color: "yellow", thing: null },
    asked: true,
  });
  // The wisp chose the object itself: the pumpkin is lit, the lantern slot is not, and there is
  // no closing line on a result that is not the wish.
  await expectBrought(page, "yellow pumpkin");
  await expectClosingLine(page, false);
  await page.screenshot({ path: "e2e/screenshots/mobile-ja-vague-color.png" });

  // The cards are locked until the retry, which keeps the wish and clears the pick.
  await tap(cardCenter("blue"));
  await page.waitForTimeout(300);
  expect((await gameState(page)).lane.pick).toEqual({ color: "yellow", thing: null });
  await pressButton(page, tap);
  expect((await gameState(page)).lane).toEqual(emptyLane);

  // No card is not a request. The scene is ready here, since a result was just answered.
  await tap(wisp);
  await page.waitForTimeout(300);
  expect((await gameState(page)).lane).toEqual(emptyLane);

  // Both cards find the wish, and the closing line shows.
  await pickCards(page, tap, wish.color, wish.thing);
  await askWisp(page, tap);
  expect((await gameState(page)).lane).toMatchObject({ asked: true, pick: wish });
  await expectBrought(page, "yellow lantern");
  await expectClosingLine(page, true);
  await page.screenshot({ path: "e2e/screenshots/mobile-ja-right.png" });

  // The same state in English draws different words in the same place.
  const japanese = await fingerprint(page, lessonArea);
  await dispatch(page, { type: "SetLang", lang: "en" });
  await expect.poll(() => fingerprint(page, lessonArea)).not.toBe(japanese);
  await expectClosingLine(page, true);
  await page.screenshot({ path: "e2e/screenshots/mobile-en-right.png" });

  await pressButton(page, tap);
  expect((await gameState(page)).lane.wish).toBe(1);
  expect(errors).toEqual([]);
});

test("REQ-3.1, REQ-3.3, REQ-3.4, REQ-3.5: an object alone brings another color, then both cards find the wish, in English", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const tap = tapper(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);
  await startTrial(page, tap);
  expect((await gameState(page)).lang).toBe("en");

  await pickOne(page, tap, "lantern");
  await askWisp(page, tap);
  expect((await gameState(page)).lane).toEqual({
    wish: 0,
    pick: { color: null, thing: "lantern" },
    asked: true,
  });
  await expectBrought(page, "red lantern");
  await expectClosingLine(page, false);
  await page.screenshot({ path: "e2e/screenshots/mobile-en-vague-object.png" });

  await pressButton(page, tap);
  expect((await gameState(page)).lane).toEqual(emptyLane);
  await pickCards(page, tap, wish.color, wish.thing);
  await askWisp(page, tap);
  await expectBrought(page, "yellow lantern");
  await expectClosingLine(page, true);

  await pressButton(page, tap);
  expect((await gameState(page)).lane.wish).toBe(1);
  expect(errors).toEqual([]);
});

test("REQ-3.4: a complete request for another item is answered as before, without the closing line", async ({
  page,
}) => {
  const tap = tapper(page);
  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await startTrial(page, tap);
  await pickCards(page, tap, "red", wish.thing);
  await askWisp(page, tap);
  await expectBrought(page, "red lantern");
  await expectClosingLine(page, false);
  await pressButton(page, tap);
  expect((await gameState(page)).lane).toEqual(emptyLane);
});

for (const lang of ["ja", "en"] as const) {
  test(`REQ-3.7: finishes offline after the first load, in ${lang}`, async ({ page, context }) => {
    const errors = collectErrors(page);
    const tap = tapper(page);
    await page.goto(`./?lang=${lang}`);
    await expect(page.locator("canvas")).toBeVisible();
    await expectBundledFont(page);
    // Phaser fetches the two placeholder PNGs at boot; wait until nothing is in flight, so the first
    // load is complete before the network goes away.
    await page.waitForLoadState("networkidle");

    // Offline from the title screen on: the start tap, the scene change and the whole trial run
    // without a network.
    await context.setOffline(true);
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));

    await startTrial(page, tap);
    expect((await gameState(page)).lang).toBe(lang);
    await pickOne(page, tap, "yellow");
    await askWisp(page, tap);
    await expectBrought(page, "yellow pumpkin");
    await pressButton(page, tap);
    await pickOne(page, tap, "lantern");
    await askWisp(page, tap);
    await expectBrought(page, "red lantern");
    await pressButton(page, tap);
    await pickCards(page, tap, wish.color, wish.thing);
    await askWisp(page, tap);
    expect((await gameState(page)).lane).toMatchObject({ asked: true, pick: wish });
    await expectBrought(page, "yellow lantern");
    await expectClosingLine(page, true);
    await pressButton(page, tap);

    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}
