import { expect, test, type Page } from "@playwright/test";
import { initialLane } from "../src/domain/lane";
import { buttonRects, fieldMessage, starCenter } from "../src/game/field-layout";
import { titleFieldButton } from "../src/game/field-layout";
import { canvas } from "../src/game/lane-layout";
import { leaveButton, titleShedButton } from "../src/game/shed-layout";
import {
  buttonCaption,
  buttonLabel,
  titleCard,
  titleIntro,
  titlePrompt,
} from "../src/game/title-layout";
import {
  collectErrors,
  canvasFrame,
  dispatch,
  expectBundledFont,
  fingerprint,
  gameState,
  minTextPixels,
  startTrial,
  tapper,
  textPixels,
} from "./helpers";
import {
  clueReads,
  enterField,
  expectButtons,
  expectCluesMatchRound,
  expectLens,
  expectLesson,
  expectTicks,
  fakesNow,
  freshField,
  giveVerdict,
  inkPixels,
  keepStars,
  leaveFromEnd,
  leaveToTitle,
  lessonArea,
  lookAt,
  nextRound,
  playAgain,
  seeClues,
  sortAll,
  sortRight,
  truth,
} from "./field-helpers";
import { expectClockShown, expectScoreDrawn, freshShed, scorePrint } from "./shed-helpers";

// Trial 3, The Wisp Field (.kiro/specs/06-trial-verify-stars, revision 3): every press is a real touch tap on
// the canvas. The clue, the lens, the buttons, the ticks, the clock, the score and the closing line are read
// from the pixels, not the state. The field is a 60-second run on the real clock, so each test plays well under
// a minute. `dispatch` is used only for the language, time up (`Tick`), and a keep that no button offers.

async function openGame(page: Page, lang: "ja" | "en") {
  await page.goto(`./?lang=${lang}`);
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);
}

const messageBox = {
  x: fieldMessage.x,
  y: fieldMessage.y,
  width: fieldMessage.wrap,
  height: fieldMessage.height,
};
const messagePrint = (page: Page) => fingerprint(page, messageBox);
const stars = [0, 1, 2, 3, 4];

test("REQ-6.1, REQ-6.2, REQ-6.7.1: the title's button opens the field and starts a 60-second run; the clock, the score and the way back are on screen; the clue is on every star before any tap, with no button yet, in Japanese", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterField(page, tap);
  const entered = await gameState(page);
  expect(entered).toMatchObject({ phase: "trial", trial: 3, lang: "ja" });
  expect(entered.field).toMatchObject({ ...freshField(entered.field.seed, 0) });
  expect(entered.lane).toEqual(initialLane);
  expect(entered.shed).toEqual(freshShed);
  expect(entered.run).toMatchObject({ score: 0, streak: 0, best: 0, record: false });

  // REQ-6.7.1: the clock runs from the first frame, the top row is drawn, and the way back to the title is there.
  await expect.poll(async () => (await gameState(page)).run.remainingMs).toBeLessThan(59_900);
  await expectClockShown(page);
  await expectScoreDrawn(page);
  const leaveLabel = { x: leaveButton.x, y: leaveButton.y, width: 70, height: 22 };
  await expect.poll(() => inkPixels(page, leaveLabel)).toBeGreaterThan(minTextPixels);

  // REQ-6.2.3: before any tap, the fake stars shine brighter and have a dotted rim; the others do not.
  await expectCluesMatchRound(page);
  const fakes = await fakesNow(page);
  expect(fakes).toHaveLength(1);
  const clues = await seeClues(page);
  for (const i of stars) {
    const fake = fakes.includes(i);
    expect(clues[i]!.glow, `star ${i} halo`).toBeGreaterThan(fake ? 130 : 0);
    expect(clueReads(clues[i]!), `star ${i}`).toBe(fake ? "bright" : "normal");
  }
  await expectLens(page, "empty");
  await expectButtons(page, []);
  await expectLesson(page, false);
  await expect.poll(() => textPixels(page, messageBox)).toBeGreaterThan(minTextPixels);
  await page.screenshot({ path: "e2e/screenshots/mobile-field-ja-start.png" });
  expect(errors).toEqual([]);
});

test("REQ-6.3, REQ-6.7.3: a tap looks and sorts nothing; a wrong verdict in either direction tells what happened, scores nothing and ends the streak; the right one sorts and scores", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterField(page, tap);
  await expectCluesMatchRound(page);
  const fake = (await fakesNow(page))[0]!;
  const real = stars.find((i) => i !== fake)!;
  const start = await messagePrint(page);
  const scoreAtStart = await scorePrint(page);

  // A tap on a real star puts it in the lens, shows both verdict buttons, and sorts and scores nothing.
  await lookAt(page, tap, real);
  await expectLens(page, "normal");
  await expectButtons(page, ["left", "right"]);
  await expectTicks(page, []);
  await expect.poll(() => messagePrint(page)).not.toBe(start);
  const looking = await messagePrint(page);
  expect((await gameState(page)).run).toMatchObject({ score: 0, streak: 0 });
  await page.screenshot({ path: "e2e/screenshots/mobile-field-ja-look.png" });

  // REQ-6.3.4: called fake, it is real: nothing is sorted, the lens closes, the message tells what happened,
  // and the score stays where it was.
  await giveVerdict(page, tap, "fake");
  expect((await gameState(page)).field).toMatchObject({
    sorted: [false, false, false, false, false],
    looking: null,
    note: { star: real, said: "fake" },
  });
  expect((await gameState(page)).run).toMatchObject({ score: 0, streak: 0 });
  await expectLens(page, "empty");
  await expectButtons(page, []);
  await expectTicks(page, []);
  await expect.poll(() => messagePrint(page)).not.toBe(looking);
  const missedReal = await messagePrint(page);
  expect(await scorePrint(page)).toBe(scoreAtStart);
  await page.screenshot({ path: "e2e/screenshots/mobile-field-ja-miss-real.png" });

  // The same star again, with the right verdict: it is sorted and ticked, and 100 points are scored.
  await lookAt(page, tap, real);
  await giveVerdict(page, tap, "real");
  await expectTicks(page, [real]);
  await expect.poll(() => messagePrint(page)).not.toBe(missedReal);
  expect((await gameState(page)).run).toMatchObject({ score: 100, streak: 1 });
  await expect.poll(() => scorePrint(page)).not.toBe(scoreAtStart);

  // A fake star: its lens shows the bright star with the dotted rim. Called real, it is not accepted, and the
  // streak ends.
  await lookAt(page, tap, fake);
  await expectLens(page, "bright");
  await giveVerdict(page, tap, "real");
  expect((await gameState(page)).field).toMatchObject({
    looking: null,
    note: { star: fake, said: "real" },
  });
  expect((await gameState(page)).run).toMatchObject({ score: 100, streak: 0 });
  await expectTicks(page, [real]);
  const missedFake = await messagePrint(page);
  expect(missedFake).not.toBe(missedReal);
  await page.screenshot({ path: "e2e/screenshots/mobile-field-ja-miss-fake.png" });

  await lookAt(page, tap, fake);
  await giveVerdict(page, tap, "fake");
  await expectTicks(page, [real]);
  const field = (await gameState(page)).field;
  expect(field).toMatchObject({ note: { star: fake, said: "fake" } });
  expect((await gameState(page)).run).toMatchObject({ score: 200, streak: 1 });
  await page.screenshot({ path: "e2e/screenshots/mobile-field-ja-sorted-fake.png" });

  // A tap on a sorted star changes nothing but the clock.
  const before = await gameState(page);
  await tap(starCenter(real));
  await tap(starCenter(fake));
  await page.waitForTimeout(300);
  const after = await gameState(page);
  expect({ ...after, run: { ...after.run, remainingMs: 0 } }).toEqual({
    ...before,
    run: { ...before.run, remainingMs: 0 },
  });
  expect(errors).toEqual([]);
});

test("REQ-6.5, REQ-6.6, REQ-6.7.2: sorting all five shows the keep button; the keep shows the closing line and the next stars, and the trial goes on with two fake stars", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterField(page, tap);

  // Round 1: one fake star. A keep sent too early changes nothing, and no keep button is there.
  await sortAll(page, tap, [4, 3, 2, 1]);
  await dispatch(page, { type: "KeepStars" });
  await page.waitForTimeout(300);
  expect((await gameState(page)).field.stage).toBe("sorting");
  await expectButtons(page, []);
  await sortRight(page, tap, 0);
  const sorted = await gameState(page);
  expect(sorted.field).toMatchObject({ sorted: [true, true, true, true, true], looking: null });
  // Five right verdicts in a row: 100 + 150 + 200 + 250 + 300.
  expect(sorted.run).toMatchObject({ score: 1000, streak: 5 });
  const fakes = await fakesNow(page);
  await expectTicks(
    page,
    stars.filter((i) => !fakes.includes(i)),
  );
  await expectButtons(page, ["single"]);
  await expectLesson(page, false);
  await page.screenshot({ path: "e2e/screenshots/mobile-field-ja-ready.png" });

  // REQ-6.5.3: the keep accepts the real stars and shows the closing line. A quick double tap on the keep
  // button must not also press "Next stars", which takes its place (REQ-6.9.5).
  const { box: frame, scale: pixels } = await canvasFrame(page);
  const keepAt = {
    x: frame.x + buttonRects.single.x * pixels,
    y: frame.y + buttonRects.single.y * pixels,
  };
  await page.waitForTimeout(600); // past the new buttons' short lock
  await page.touchscreen.tap(keepAt.x, keepAt.y);
  await page.touchscreen.tap(keepAt.x, keepAt.y);
  await expect.poll(async () => (await gameState(page)).field.stage).toBe("kept");
  await page.waitForTimeout(500);
  expect((await gameState(page)).field).toMatchObject({ stage: "kept", round: 0 });
  expect((await gameState(page)).run.score).toBe(1000);
  await expectLesson(page, true);
  await expectButtons(page, ["single"]);
  await page.screenshot({ path: "e2e/screenshots/mobile-field-ja-kept.png" });
  const japanese = await fingerprint(page, lessonArea);
  await dispatch(page, { type: "SetLang", lang: "en" });
  await expect.poll(() => fingerprint(page, lessonArea)).not.toBe(japanese);
  await page.screenshot({ path: "e2e/screenshots/mobile-field-en-kept.png" });

  // Round 2: two fake stars, the closing line is gone, and every unsorted star's clue matches the round.
  await nextRound(page, tap);
  expect((await gameState(page)).phase).toBe("trial");
  expect((await fakesNow(page)).length).toBe(2);
  await expectCluesMatchRound(page);
  await expectLesson(page, false);
  await expectLens(page, "empty");
  await expectButtons(page, []);
  expect((await gameState(page)).run.score).toBe(1000);
  expect(errors).toEqual([]);
});

test("REQ-6.7.4, REQ-6.7.5: time up shows the end screen; play again starts a new run; the title button goes back, in a run and on the end screen; the best is kept", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "en");
  await enterField(page, tap);
  await sortRight(page, tap, 0);
  expect((await gameState(page)).run.score).toBe(100);

  // The clock ran out: the end screen replaces the field, with the score and the best.
  await dispatch(page, { type: "Tick", ms: 60_000 });
  await expect.poll(async () => (await gameState(page)).phase).toBe("over");
  expect(await gameState(page)).toMatchObject({ phase: "over", trial: 3 });
  expect((await gameState(page)).run).toMatchObject({ score: 100, best: 100, record: true });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "e2e/screenshots/mobile-field-en-over.png" });

  // Play again: a full clock, a score of 0, round 0 of a new seed, the best kept.
  await playAgain(page, tap);
  const again = await gameState(page);
  expect(again).toMatchObject({ phase: "trial", trial: 3 });
  expect(again.field).toMatchObject({ ...freshField(again.field.seed, 0) });
  expect(again.run).toMatchObject({ score: 0, streak: 0, best: 100 });
  await expectCluesMatchRound(page);
  await expectClockShown(page);

  // The way back, in the middle of a run: the title, with the best score kept and nothing of the run. A
  // child's quick second tap lands on the title, where a tap anywhere starts trial 1, so the title ignores
  // taps for a moment after the field sent the child back.
  await sortRight(page, tap, 1);
  const { box, scale } = await canvasFrame(page);
  const leave = { x: box.x + leaveButton.x * scale, y: box.y + leaveButton.y * scale };
  await page.touchscreen.tap(leave.x, leave.y);
  await page.touchscreen.tap(leave.x, leave.y);
  await expect.poll(async () => (await gameState(page)).phase).toBe("title");
  await page.waitForTimeout(300);
  const left = await gameState(page);
  expect(left).toMatchObject({ phase: "title", trial: 0, field: freshField(0, 0) });
  expect(left.run).toMatchObject({ remainingMs: 60_000, score: 0, best: 100 });
  await page.screenshot({ path: "e2e/screenshots/mobile-field-en-back.png" });

  // The lock is short: a tap elsewhere on the title starts trial 1 once it has passed.
  await page.waitForTimeout(900);
  await startTrial(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 1 });
  expect((await gameState(page)).field).toEqual(freshField(0, 0));
  expect(errors).toEqual([]);
});

test("REQ-6.7.5: from the end screen the title button goes back to the title, and the field opens again from there", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await enterField(page, tap);
  await dispatch(page, { type: "Tick", ms: 60_000 });
  await expect.poll(async () => (await gameState(page)).phase).toBe("over");
  await leaveFromEnd(page, tap);
  expect(await gameState(page)).toMatchObject({
    phase: "title",
    trial: 0,
    field: freshField(0, 0),
  });
  expect((await gameState(page)).run).toMatchObject({ remainingMs: 60_000, score: 0, best: 0 });
  await page.waitForTimeout(900);
  await enterField(page, tap);
  expect(await gameState(page)).toMatchObject({ phase: "trial", trial: 3 });
  await leaveToTitle(page, tap);
  expect(errors).toEqual([]);
});

test("REQ-6.2.2, REQ-6.10: the clue works without color and without sound: on a grayscale screen the fake stars still shine brighter and have a broken rim, and the game makes no sound", async ({
  page,
}) => {
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
  await enterField(page, tap);
  await page.addStyleTag({ content: "canvas { filter: grayscale(1) }" });
  await expectCluesMatchRound(page);

  // The screenshot has no color left at the probes (red, green and blue agree), yet the clue still reads.
  const clues = await seeClues(page);
  const fakes = await fakesNow(page);
  for (const i of stars) {
    expect(clueReads(clues[i]!), `star ${i} in grayscale`).toBe(
      fakes.includes(i) ? "bright" : "normal",
    );
  }
  const brightest = Math.max(...stars.filter((i) => !fakes.includes(i)).map((i) => clues[i]!.glow));
  expect(Math.min(...fakes.map((i) => clues[i]!.glow)) - brightest).toBeGreaterThan(40);

  // In the lens too, and through a whole sort.
  await lookAt(page, tap, fakes[0]!);
  await expectLens(page, "bright");
  await giveVerdict(page, tap, "fake");
  await sortAll(
    page,
    tap,
    stars.filter((i) => i !== fakes[0]),
  );
  expect(await page.evaluate(() => (window as unknown as { __sounds: string[] }).__sounds)).toEqual(
    [],
  );
  expect(errors).toEqual([]);
});

test("REQ-6.1.3, REQ-6.1.6, REQ-5.1.1: a tap elsewhere on the title still starts trial 1; the 60 seconds sit in trial 1's card and in the captions of the shed's and the field's buttons, in both languages", async ({
  page,
}) => {
  const tap = tapper(page);
  for (const lang of ["ja", "en"] as const) {
    await openGame(page, lang);
    // Trial 1's card: its way in and its rule are drawn in their places.
    const prompt = { ...titlePrompt, width: 300, height: titlePrompt.size + 8 };
    const intro = { ...titleIntro, width: 300, height: 2 * titleIntro.size + 8 };
    await expect.poll(() => textPixels(page, prompt)).toBeGreaterThan(minTextPixels);
    await expect.poll(() => textPixels(page, intro)).toBeGreaterThan(minTextPixels);
    // Each button has its label and its caption, drawn under it.
    for (const button of [titleFieldButton, titleShedButton]) {
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
    // The card is separate from the buttons: no light text between the card and the buttons' region.
    expect(titleCard.y + titleCard.height / 2).toBeLessThan(titleFieldButton.y - 40);
    await page.screenshot({ path: `e2e/screenshots/mobile-field-${lang}-title.png` });
  }
  await startTrial(page, tap);
  expect(await gameState(page)).toMatchObject({
    phase: "trial",
    trial: 1,
    field: freshField(0, 0),
    shed: freshShed,
  });
  await expect.poll(async () => (await gameState(page)).run.remainingMs).toBeLessThan(59_900);
  expect(canvas.width).toBe(390);
});

for (const lang of ["ja", "en"] as const) {
  test(`REQ-6.10: plays the field offline after the first load: look, sort, keep, the next stars and back, in ${lang}`, async ({
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

    await enterField(page, tap);
    await sortAll(page, tap);
    await keepStars(page, tap);
    await expectLesson(page, true);
    await nextRound(page, tap);
    await leaveToTitle(page, tap);
    expect((await gameState(page)).phase).toBe("title");

    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
    expect(await truth(page, 0)).toMatch(/real|fake/);
  });
}
