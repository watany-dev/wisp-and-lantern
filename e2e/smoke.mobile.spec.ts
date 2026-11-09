import { expect, test } from "@playwright/test";
import { wishAt } from "../src/domain/lane";
import { cardCenter, wisp } from "../src/game/lane-layout";
import {
  askWisp,
  collectErrors,
  expectBundledFont,
  gameState,
  pickCards,
  pressButton,
  pressUntil,
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

// Trial 1 (.kiro/specs/02-trial-tell): every press below is a real touch tap on the canvas.
// The first wish is the yellow lantern (`balance.wishes[0]`); red lantern is a different request.
const wish = wishAt(0);
const other = { color: wish.color === "red" ? "blue" : "red", thing: wish.thing } as const;

test("REQ-2.1, REQ-2.3, REQ-2.4, REQ-2.7, REQ-2.8: plays trial 1 with taps in Japanese", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const tap = tapper(page);
  await page.goto("./?lang=ja");
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);
  await startTrial(page, tap);
  expect((await gameState(page)).lang).toBe("ja");

  // A color alone is not a request: tapping the wisp searches nothing (the scene is ready, because
  // the first pick above already landed).
  await pressUntil(page, tap, cardCenter(other.color), (s) => s.lane.pick.color === other.color);
  await tap(wisp);
  await page.waitForTimeout(300);
  expect((await gameState(page)).lane).toMatchObject({ asked: false, pick: { thing: null } });

  // Both cards, then the explicit request: the helper searches exactly what was picked.
  await pickCards(page, tap, other.color, other.thing);
  await askWisp(page, tap);
  expect((await gameState(page)).lane).toMatchObject({ asked: true, pick: other });
  await page.screenshot({ path: "e2e/screenshots/mobile-lane-different.png" });

  // The pick is locked until the retry; the retry starts over on the same wish, without blame.
  await tap(cardCenter("yellow"));
  await page.waitForTimeout(300);
  expect((await gameState(page)).lane.pick).toEqual(other);
  await pressButton(page, tap);
  expect((await gameState(page)).lane).toEqual({
    wish: 0,
    pick: { color: null, thing: null },
    asked: false,
  });

  // The right request finds the wish; "play again" moves to the next one.
  await pickCards(page, tap, wish.color, wish.thing);
  await askWisp(page, tap);
  expect((await gameState(page)).lane).toMatchObject({ asked: true, pick: wish });
  await page.screenshot({ path: "e2e/screenshots/mobile-lane-right.png" });
  await pressButton(page, tap);
  expect((await gameState(page)).lane.wish).toBe(1);

  expect(errors).toEqual([]);
});

test("REQ-2.12: finishes offline after the first load, in English", async ({ page, context }) => {
  const errors = collectErrors(page);
  const tap = tapper(page);
  await page.goto("./?lang=en");
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
  expect((await gameState(page)).lang).toBe("en");
  await pickCards(page, tap, other.color, other.thing);
  await askWisp(page, tap);
  await pressButton(page, tap);
  await pickCards(page, tap, wish.color, wish.thing);
  await askWisp(page, tap);
  expect((await gameState(page)).lane).toMatchObject({ asked: true, pick: wish });
  await pressButton(page, tap);

  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
