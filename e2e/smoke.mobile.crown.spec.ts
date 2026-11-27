import { expect, test, type Page } from "@playwright/test";
import { initialCrown } from "../src/domain/crown";
import { initialLane } from "../src/domain/lane";
import { initialLantern } from "../src/domain/lantern";
import { titleCrownButton, tellButton } from "../src/game/crown-layout";
import { titleFieldButton } from "../src/game/field-layout";
import { titleLanternButton } from "../src/game/lantern-layout";
import { titleShadowsButton } from "../src/game/shadows-layout";
import { leaveButton, titleShedButton } from "../src/game/shed-layout";
import { buttonCaption, buttonLabel } from "../src/game/title-layout";
import {
  canvasFrame,
  collectErrors,
  expectBundledFont,
  fingerprint,
  gameState,
  minTextPixels,
  startTrial,
  tapper,
  textPixels,
  type GameState,
} from "./helpers";
import { inkPixels } from "./field-helpers";
import { freshShed, rigSeed } from "./shed-helpers";
import {
  controlsBox,
  enterCrown,
  expectLampBadge,
  expectPicked,
  expectSteps,
  expectTown,
  giveThing,
  leaveToTitle,
  messageBox,
  partArt,
  playChain,
  pressCheck,
  pressFix,
  pressGo,
  pressTell,
  pressWide,
  sayLook,
  tapPart,
} from "./crown-helpers";

// Trial 6, The Hollow Crown (.kiro/specs/09-trial-hollow-crown): every press is a real touch tap on the canvas, and
// `dispatch` is not used: trial 6 has no clock. The row of steps, the picked cards, the lamp's badge, the town's lamps
// and the message are read from the pixels, not the state, by brightness only. The seed is rigged so that the chains
// are known: seed 0 wants a pointy roof and a candle first, leaves block the door (the things are the broom, the
// hammer and the house key), and the wisp makes a round roof.

async function openGame(page: Page, lang: "ja" | "en") {
  await rigSeed(page);
  await page.goto(`./?lang=${lang}`);
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);
}

const stage = (name: string) => (s: GameState) => s.crown.stage === name;
const note = (kind: string) => (s: GameState) =>
  "note" in s.crown && s.crown.note !== null && s.crown.note.kind === kind;
const messagePrint = (page: Page) => fingerprint(page, messageBox);

test("REQ-9.1, REQ-9.2, REQ-9.3: the title's button opens trial 6 at the tell step; no clock, the steps, the cards, the dark town and the way back are on screen, in Japanese", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterCrown(page, tap);
  const entered = await gameState(page);
  expect(entered).toMatchObject({ phase: "trial", trial: 6, lang: "ja" });
  expect(entered.crown).toEqual(initialCrown);
  expect(entered.lane).toEqual(initialLane);
  expect(entered.shed).toEqual(freshShed);
  expect(entered.lantern).toEqual(initialLantern);
  expect(entered.run).toMatchObject({ remainingMs: 60_000, score: 0 });

  await expectSteps(page, ["now", "later", "later", "later", "later"]);
  await expectPicked(page, []);
  await expectLampBadge(page, false);
  await expectTown(page, [false, false, false]);
  await expect.poll(() => textPixels(page, messageBox)).toBeGreaterThan(minTextPixels);
  const leaveLabel = { x: leaveButton.x, y: leaveButton.y, width: 70, height: 22 };
  await expect.poll(() => inkPixels(page, leaveLabel)).toBeGreaterThan(minTextPixels);
  // No clock: a second later the run has not moved.
  await page.waitForTimeout(1_000);
  expect((await gameState(page)).run.remainingMs).toBe(60_000);
  await page.screenshot({ path: "e2e/screenshots/mobile-crown-ja-tell.png" });
  expect(errors).toEqual([]);
});

test("REQ-9.4 to REQ-9.9: one chain with every slip a child makes: a half tell, a secret, a tool that does not fit, a 'same' too early, a part that is the same; then the fix and a lit lamp, in English", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "en");
  await enterCrown(page, tap);
  const asking = await messagePrint(page);

  // Tell with one card: the wisp asks for the light and waits.
  await sayLook(page, tap, "pointy");
  await expectPicked(page, ["pointy"]);
  await pressTell(page, tap, note("missing"));
  expect((await gameState(page)).crown).toMatchObject({
    stage: "telling",
    note: { part: "light" },
  });
  await expect.poll(() => messagePrint(page)).not.toBe(asking);
  await expectSteps(page, ["now", "later", "later", "later", "later"]);

  await sayLook(page, tap, "candle");
  await expectPicked(page, ["pointy", "candle"]);
  await page.screenshot({ path: "e2e/screenshots/mobile-crown-en-tell.png" });
  await pressTell(page, tap, stage("giving"));
  await expectSteps(page, ["done", "now", "later", "later", "later"]);
  await page.screenshot({ path: "e2e/screenshots/mobile-crown-en-give.png" });

  // A secret is not a tool: nothing moves on.
  await giveThing(page, tap, "houseKey", note("secret"));
  expect((await gameState(page)).crown.stage).toBe("giving");
  await expectSteps(page, ["done", "now", "later", "later", "later"]);
  await page.screenshot({ path: "e2e/screenshots/mobile-crown-en-secret.png" });

  // A tool for another job: the wisp tries it, and the leaves are still there.
  await giveThing(page, tap, "hammer", stage("going"));
  await expectSteps(page, ["done", "done", "now", "later", "later"]);
  await page.screenshot({ path: "e2e/screenshots/mobile-crown-en-go.png" });
  await pressGo(page, tap);
  expect((await gameState(page)).crown).toMatchObject({
    stage: "giving",
    note: { kind: "stuck", tool: "hammer" },
  });
  await expectSteps(page, ["done", "now", "later", "later", "later"]);

  // The broom: the wisp makes the lamp, with a round roof where the wish has a pointy one.
  await giveThing(page, tap, "broom", stage("going"));
  await pressGo(page, tap);
  expect((await gameState(page)).crown).toMatchObject({
    stage: "checking",
    lamp: { roof: "round", light: "candle" },
  });
  await expectSteps(page, ["done", "done", "done", "now", "later"]);
  await expectLampBadge(page, false);
  await page.screenshot({ path: "e2e/screenshots/mobile-crown-en-check.png" });

  // "Same" on a lamp that is not the wish: look again.
  await pressCheck(page, tap, true, note("again"));
  expect((await gameState(page)).crown.stage).toBe("checking");
  await pressCheck(page, tap, false, stage("fixing"));
  await expectSteps(page, ["done", "done", "done", "done", "now"]);

  // The light is the same as the wish's: the game says so. The roof is pointed at, and only the roof changes.
  await tapPart(page, tap, "light", note("fine"));
  await tapPart(page, tap, "roof", (s) => s.crown.stage === "fixing" && s.crown.part === "roof");
  const light = await fingerprint(page, partArt("light"));
  const roof = await fingerprint(page, partArt("roof"));
  await page.screenshot({ path: "e2e/screenshots/mobile-crown-en-fix.png" });
  await pressFix(page, tap, "pointy");
  expect((await gameState(page)).crown).toMatchObject({
    stage: "checking",
    lamp: { roof: "pointy", light: "candle" },
    note: { kind: "said", look: "pointy" },
  });
  await expectSteps(page, ["done", "done", "done", "now", "later"]);
  await expect.poll(() => fingerprint(page, partArt("roof"))).not.toBe(roof);
  expect(await fingerprint(page, partArt("light"))).toBe(light);

  await pressCheck(page, tap, true, stage("lit"));
  await expectLampBadge(page, true);
  await expectTown(page, [true, false, false]);
  await expectSteps(page, ["done", "done", "done", "done", "done"]);
  await page.screenshot({ path: "e2e/screenshots/mobile-crown-en-lit.png" });
  expect((await gameState(page)).run).toMatchObject({ remainingMs: 60_000, score: 0 });
  expect(errors).toEqual([]);
});

test("REQ-9.9, REQ-9.10, REQ-9.12.5: three chains clear the trial and light the whole town; play again starts over with the town dark; a quick second tap on Tell does not give a thing", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterCrown(page, tap);

  // Two raw taps back to back on "Tell": the second lands on the house key's tile that replaces it, which ignores
  // presses for a moment, so nothing is given.
  await sayLook(page, tap, "pointy");
  await sayLook(page, tap, "candle");
  await page.waitForTimeout(600);
  const { box, scale } = await canvasFrame(page);
  const at = { x: box.x + tellButton.x * scale, y: box.y + tellButton.y * scale };
  await page.touchscreen.tap(at.x, at.y);
  await page.touchscreen.tap(at.x, at.y);
  await expect.poll(async () => (await gameState(page)).crown.stage).toBe("giving");
  await page.waitForTimeout(200);
  expect((await gameState(page)).crown).toMatchObject({ stage: "giving", note: null });
  await leaveToTitle(page, tap);
  await page.waitForTimeout(900);
  await enterCrown(page, tap);

  const prints = new Set<string>();
  for (const lamps of [
    [true, false, false],
    [true, true, false],
    [true, true, true],
  ]) {
    await expectSteps(page, ["now", "later", "later", "later", "later"]);
    await playChain(page, tap);
    await expectTown(page, lamps);
    prints.add(await fingerprint(page, partArt("roof")));
    await pressWide(page, tap, (s) => s.crown.stage !== "lit");
  }
  expect(prints.size).toBe(3);
  expect((await gameState(page)).crown).toEqual({ stage: "clear", seed: 0 });
  await expectTown(page, [true, true, true]);
  await expectSteps(page, ["done", "done", "done", "done", "done"]);
  await page.waitForTimeout(600);
  await page.screenshot({ path: "e2e/screenshots/mobile-crown-ja-clear.png" });

  const clear = await fingerprint(page, controlsBox);
  await pressWide(page, tap, stage("telling"));
  const again = await gameState(page);
  expect(again.crown).toMatchObject({
    stage: "telling",
    chain: 0,
    told: { roof: null, light: null },
  });
  await expectTown(page, [false, false, false]);
  await expect.poll(() => fingerprint(page, controlsBox)).not.toBe(clear);
  expect(errors).toEqual([]);
});

test("REQ-9.10.4, REQ-9.10.5: the title button goes back from a chain and from the clear; a quick second tap does not start trial 1", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "en");
  await enterCrown(page, tap);
  await sayLook(page, tap, "flat");

  const { box, scale } = await canvasFrame(page);
  const leave = { x: box.x + leaveButton.x * scale, y: box.y + leaveButton.y * scale };
  await page.touchscreen.tap(leave.x, leave.y);
  await page.touchscreen.tap(leave.x, leave.y);
  await expect.poll(async () => (await gameState(page)).phase).toBe("title");
  await page.waitForTimeout(300);
  expect(await gameState(page)).toMatchObject({ phase: "title", trial: 0, crown: initialCrown });

  await page.waitForTimeout(900);
  await enterCrown(page, tap);
  for (let i = 0; i < 3; i += 1) {
    await playChain(page, tap);
    await pressWide(page, tap, (s) => s.crown.stage !== "lit");
  }
  expect((await gameState(page)).crown.stage).toBe("clear");
  await leaveToTitle(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "title", trial: 0, crown: initialCrown });
  await page.waitForTimeout(900);
  await startTrial(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 1 });
  expect(errors).toEqual([]);
});

test("REQ-9.13: nothing needs color or sound: on a grayscale screen the steps, the picked cards, the badge and the town still read, and the game makes no sound", async ({
  page,
}) => {
  test.setTimeout(120_000);
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
  await enterCrown(page, tap);
  await page.addStyleTag({ content: "canvas { filter: grayscale(1) }" });
  await sayLook(page, tap, "pointy");
  await expectPicked(page, ["pointy"]);
  await expectSteps(page, ["now", "later", "later", "later", "later"]);
  await playChain(page, tap);
  await expectLampBadge(page, true);
  await expectTown(page, [true, false, false]);
  await expectSteps(page, ["done", "done", "done", "done", "done"]);
  await page.screenshot({ path: "e2e/screenshots/mobile-crown-en-gray.png" });
  expect(await page.evaluate(() => (window as unknown as { __sounds: string[] }).__sounds)).toEqual(
    [],
  );
  expect(errors).toEqual([]);
});

test("REQ-9.1.3, REQ-9.1.6: the fifth button has its label and caption; a tap in the middle of the title still starts trial 1; the button opens trial 6 only, in both languages", async ({
  page,
}) => {
  const tap = tapper(page);
  for (const lang of ["ja", "en"] as const) {
    await openGame(page, lang);
    for (const button of [
      titleCrownButton,
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
    await page.screenshot({ path: `e2e/screenshots/mobile-crown-${lang}-title.png` });
  }
  await startTrial(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 1, crown: initialCrown });

  await page.goto("./?lang=en");
  await expect(page.locator("canvas")).toBeVisible();
  await enterCrown(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 6 });
  expect((await gameState(page)).lane).toEqual(initialLane);
});

for (const lang of ["ja", "en"] as const) {
  test(`REQ-9.13.2: plays trial 6 offline after the first load: a whole chain, Next and back, in ${lang}`, async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    const errors = collectErrors(page);
    const tap = tapper(page);
    await openGame(page, lang);
    await page.waitForLoadState("networkidle");
    await context.setOffline(true);
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));

    await enterCrown(page, tap);
    await playChain(page, tap);
    await pressWide(page, tap, stage("telling"));
    await leaveToTitle(page, tap);
    expect((await gameState(page)).phase).toBe("title");
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}
