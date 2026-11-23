import { expect, test, type Page } from "@playwright/test";
import { initialLane } from "../src/domain/lane";
import { broughtAt, initialLantern } from "../src/domain/lantern";
import { buttonRects, titleFieldButton } from "../src/game/field-layout";
import { canvas } from "../src/game/lane-layout";
import { titleLanternButton } from "../src/game/lantern-layout";
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
  cardAt,
  enterLantern,
  expectLit,
  expectMarks,
  faultNow,
  leaveFromEnd,
  leaveToTitle,
  lightIt,
  messageBox,
  nextLantern,
  partArt,
  pickCard,
  playAgain,
  pointAt,
  rightLook,
  tapSteady,
  wishArt,
} from "./lantern-helpers";

// Trial 5, The Flickering Lantern (.kiro/specs/08-trial-tell-whats-wrong): every press is a real touch tap on the
// canvas. The frames, the tick badge, the light, the buttons, the clock, the score and the message are read from the
// pixels, not the state, by brightness only. Trial 5 is a 60-second run on the real clock, so each test plays well
// under a minute. `dispatch` is used only for time up (`Tick`). The seed is rigged so that the rounds are known: seed
// 0 brings a bell for the wish's ring (the handle flickers; the cards are the ring and the bow), then a pointy roof
// for a flat one, then a candle for a moon.

async function openGame(page: Page, lang: "ja" | "en") {
  await rigSeed(page);
  await page.goto(`./?lang=${lang}`);
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);
}

const messagePrint = (page: Page) => fingerprint(page, messageBox);

test("REQ-8.1, REQ-8.2, REQ-8.3, REQ-8.9.1: the title's button opens trial 5 and starts a 60-second run; the clock, the score and the way back are on screen; the handle has its frame of dots, the light is dim and there are no buttons, in Japanese", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterLantern(page, tap);
  const entered = await gameState(page);
  expect(entered).toMatchObject({ phase: "trial", trial: 5, lang: "ja" });
  expect(entered.lantern).toEqual(initialLantern);
  expect(entered.lane).toEqual(initialLane);
  expect(entered.shed).toEqual(freshShed);
  expect(entered.run).toMatchObject({ score: 0, streak: 0, best: 0, record: false });
  expect(faultNow(entered)).toBe("handle");

  await expect.poll(async () => (await gameState(page)).run.remainingMs).toBeLessThan(59_900);
  await expectClockShown(page);
  await expectScoreDrawn(page);
  const leaveLabel = { x: leaveButton.x, y: leaveButton.y, width: 70, height: 22 };
  await expect.poll(() => inkPixels(page, leaveLabel)).toBeGreaterThan(minTextPixels);

  await expectMarks(page, ["dots", "none", "none"]);
  await expectLit(page, false);
  await expectButtons(page, []);
  await expect.poll(() => textPixels(page, messageBox)).toBeGreaterThan(minTextPixels);
  await page.screenshot({ path: "e2e/screenshots/mobile-lantern-ja-start.png" });
  expect(errors).toEqual([]);
});

test("REQ-8.4, REQ-8.5, REQ-8.6: a tap on a steady part is fine; a point opens two cards; a wrong card changes the part and it still flickers; the right card lights the lantern and only that part changed, in English", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "en");
  await enterLantern(page, tap);
  const look = await messagePrint(page);

  // A steady part: the game says it is fine. Nothing changes, nothing is scored.
  await tapSteady(page, tap, "roof");
  expect((await gameState(page)).run).toMatchObject({ score: 0, streak: 0 });
  await expectMarks(page, ["dots", "none", "none"]);
  await expectButtons(page, []);
  await expect.poll(() => messagePrint(page)).not.toBe(look);

  // The flickering part: a solid frame and two cards. The roof and the light keep their pictures.
  await pointAt(page, tap, "handle");
  await expectMarks(page, ["solid", "none", "none"]);
  await expectButtons(page, ["left", "right"]);
  const roof = await fingerprint(page, partArt("roof"));
  const bell = await fingerprint(page, partArt("handle"));
  await page.screenshot({ path: "e2e/screenshots/mobile-lantern-en-point.png" });

  // A wrong card: the wisp makes it a bow, as told; it still flickers and nothing is scored.
  await pickCard(page, tap, "bow");
  let state = await gameState(page);
  expect(state.lantern).toMatchObject({ stage: "looking", note: { kind: "said", look: "bow" } });
  expect(state.lantern.stage === "looking" && state.lantern.shape).toEqual({
    ...broughtAt(0, 0),
    handle: "bow",
  });
  expect(state.run).toMatchObject({ score: 0, streak: 0 });
  await expectMarks(page, ["dots", "none", "none"]);
  await expectButtons(page, []);
  await expectLit(page, false);
  await page.screenshot({ path: "e2e/screenshots/mobile-lantern-en-said.png" });

  // Point again: the handle is a bow now, held still, so its picture is not the bell's.
  await pointAt(page, tap, "handle");
  await expect.poll(() => fingerprint(page, partArt("handle"))).not.toBe(bell);
  expect(await fingerprint(page, partArt("roof"))).toBe(roof);

  // The right card: the lantern is lit, with the tick and a bright light, and Next.
  await pickCard(page, tap, "ring");
  state = await gameState(page);
  expect(state.lantern).toEqual({ stage: "lit", seed: 0, round: 0 });
  expect(state.run).toMatchObject({ score: 100, streak: 1 });
  await expectLit(page, true);
  await expectMarks(page, ["none", "none", "none"]);
  await expectButtons(page, ["single"]);
  expect(await fingerprint(page, partArt("roof"))).toBe(roof);
  await page.screenshot({ path: "e2e/screenshots/mobile-lantern-en-lit.png" });
  expect(errors).toEqual([]);
});

test("REQ-8.8, REQ-8.9.2, REQ-8.9.3, REQ-8.11.5: Next brings a new wish with the flicker on another part; the streak pays 100, 150, 200, 250; a quick second tap on the card's place does not press Next", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterLantern(page, tap);
  const faults: string[] = [];
  const wishes = new Set<string>();
  for (const expected of [100, 250, 450]) {
    faults.push(faultNow(await gameState(page)));
    wishes.add(await fingerprint(page, wishArt));
    await lightIt(page, tap);
    expect((await gameState(page)).run.score).toBe(expected);
    await nextLantern(page, tap);
  }
  expect(faults).toEqual(["handle", "roof", "light"]);
  expect(wishes.size).toBe(3);
  await expectMarks(page, ["dots", "none", "none"]);

  // Round 3: two raw taps back to back, the right card and then the place of the Next button that replaces the
  // cards. Next ignores presses for a moment, so the lantern stays lit in round 3.
  const state = await gameState(page);
  await pointAt(page, tap, faultNow(state));
  await page.waitForTimeout(600);
  const { box, scale } = await canvasFrame(page);
  const card = await cardAt(page, rightLook(state));
  await page.touchscreen.tap(box.x + card.x * scale, box.y + card.y * scale);
  const next = buttonRects.single;
  await page.touchscreen.tap(box.x + next.x * scale, box.y + (next.y + 20) * scale);
  await expect.poll(async () => (await gameState(page)).lantern.stage).toBe("lit");
  await page.waitForTimeout(200);
  expect((await gameState(page)).lantern).toEqual({ stage: "lit", seed: 0, round: 3 });
  expect((await gameState(page)).run.score).toBe(700);
  expect(errors).toEqual([]);
});

test("REQ-8.9.4, REQ-8.9.5, REQ-8.9.6: time up shows the end screen; play again starts a new run; the title button goes back, in a run and on the end screen; the best is kept", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "en");
  await enterLantern(page, tap);
  await lightIt(page, tap);
  expect((await gameState(page)).run.score).toBe(100);

  await dispatch(page, { type: "Tick", ms: 60_000 });
  await expect.poll(async () => (await gameState(page)).phase).toBe("over");
  expect(await gameState(page)).toMatchObject({ phase: "over", trial: 5 });
  expect((await gameState(page)).run).toMatchObject({ score: 100, best: 100, record: true });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "e2e/screenshots/mobile-lantern-en-over.png" });

  await playAgain(page, tap);
  const again = await gameState(page);
  expect(again).toMatchObject({ phase: "trial", trial: 5 });
  expect(again.lantern).toMatchObject({ stage: "looking", round: 0, note: null });
  expect(again.run).toMatchObject({ score: 0, streak: 0, best: 100 });
  await expectClockShown(page);

  // The way back in the middle of a run, with a child's quick second tap on the title: the title ignores taps for
  // a moment after trial 5 sent the child back, so trial 1 does not start.
  await pointAt(page, tap, faultNow(again));
  const { box, scale } = await canvasFrame(page);
  const leave = { x: box.x + leaveButton.x * scale, y: box.y + leaveButton.y * scale };
  await page.touchscreen.tap(leave.x, leave.y);
  await page.touchscreen.tap(leave.x, leave.y);
  await expect.poll(async () => (await gameState(page)).phase).toBe("title");
  await page.waitForTimeout(300);
  const left = await gameState(page);
  expect(left).toMatchObject({ phase: "title", trial: 0, lantern: initialLantern });
  expect(left.run).toMatchObject({ remainingMs: 60_000, score: 0, best: 100 });

  await page.waitForTimeout(900);
  await startTrial(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 1 });
  expect((await gameState(page)).lantern).toEqual(initialLantern);
  expect(errors).toEqual([]);
});

test("REQ-8.9.5: from the end screen the title button goes back to the title, and trial 5 opens again from there", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterLantern(page, tap);
  await dispatch(page, { type: "Tick", ms: 60_000 });
  await expect.poll(async () => (await gameState(page)).phase).toBe("over");
  await page.waitForTimeout(900);
  await page.screenshot({ path: "e2e/screenshots/mobile-lantern-ja-over.png" });
  await leaveFromEnd(page, tap);
  expect(await gameState(page)).toMatchObject({
    phase: "title",
    trial: 0,
    lantern: initialLantern,
  });
  await page.waitForTimeout(900);
  await enterLantern(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 5 });
  await leaveToTitle(page, tap);
  expect(errors).toEqual([]);
});

test("REQ-8.12: nothing needs color or sound: on a grayscale screen the frames, the badge and the light still read, and the game makes no sound", async ({
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
  await enterLantern(page, tap);
  await page.addStyleTag({ content: "canvas { filter: grayscale(1) }" });
  await expectMarks(page, ["dots", "none", "none"]);
  await expectLit(page, false);
  await pointAt(page, tap, "handle");
  await expectMarks(page, ["solid", "none", "none"]);
  await pickCard(page, tap, "ring");
  await expectLit(page, true);
  await expectMarks(page, ["none", "none", "none"]);
  await nextLantern(page, tap);
  await expectMarks(page, ["none", "dots", "none"]);
  await page.screenshot({ path: "e2e/screenshots/mobile-lantern-en-gray.png" });
  expect(await page.evaluate(() => (window as unknown as { __sounds: string[] }).__sounds)).toEqual(
    [],
  );
  expect(errors).toEqual([]);
});

test("REQ-8.1.3, REQ-8.1.6: a tap elsewhere on the title still starts trial 1; the fourth button has its label and its 60-second caption, and opens trial 5 only, in both languages", async ({
  page,
}) => {
  const tap = tapper(page);
  for (const lang of ["ja", "en"] as const) {
    await openGame(page, lang);
    for (const button of [
      titleLanternButton,
      titleShadowsButton,
      titleFieldButton,
      titleShedButton,
    ]) {
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
    await page.screenshot({ path: `e2e/screenshots/mobile-lantern-${lang}-title.png` });
  }
  await startTrial(page, tap);
  expect(await gameState(page)).toMatchObject({
    phase: "trial",
    trial: 1,
    lantern: initialLantern,
    shed: freshShed,
  });
  expect(canvas.width).toBe(390);

  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await enterLantern(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 5 });
});

for (const lang of ["ja", "en"] as const) {
  test(`REQ-8.12.2: plays trial 5 offline after the first load: point, fix, next, and back, in ${lang}`, async ({
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

    await enterLantern(page, tap);
    await pointAt(page, tap, "handle");
    await pickCard(page, tap, "bow");
    await lightIt(page, tap);
    await expectLit(page, true);
    await nextLantern(page, tap);
    await leaveToTitle(page, tap);
    expect((await gameState(page)).phase).toBe("title");

    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}
