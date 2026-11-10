import { expect, test, type Page } from "@playwright/test";
import { rounds } from "../src/domain/field";
import { initialLane } from "../src/domain/lane";
import { initialRun } from "../src/domain/run";
import { starCenter } from "../src/game/field-layout";
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
  checkAll,
  checkStar,
  enterField,
  expectButton,
  expectStars,
  freshField,
  keepStars,
  nextRound,
  type Seen,
} from "./field-helpers";
import { closingLinePrint, expectMessage, freshShed, resultMessagePrint } from "./shed-helpers";

// Trial 3, The Wisp Field (.kiro/specs/06-trial-verify-stars): every press is a real touch tap on the
// canvas, and each star, the message and the closing line are read from the pixels, not the state.
// `dispatch` is used only for time, the language, and a keep that no button offers yet.

async function openGame(page: Page, lang: "ja" | "en") {
  await page.goto(`./?lang=${lang}`);
  await expect(page.locator("canvas")).toBeVisible();
  await expectBundledFont(page);
}

/** What the screen should show for a round when the stars in `checked` have been checked. */
function expectedSeen(round: number, checked: number[]): Seen[] {
  return [0, 1, 2, 3, 4].map((i) => {
    if (!checked.includes(i)) return "unchecked";
    return rounds[round]!.includes(i) ? "fake" : "real";
  });
}

test("REQ-6.1 to REQ-6.6: the title's button opens the field; each star is checked once, a fake is found, the real ones are kept, in Japanese", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "ja");
  await page.screenshot({ path: "e2e/screenshots/mobile-field-ja-title.png" });

  // REQ-6.1: a tap on the button opens the field and starts no run (nor another trial).
  await enterField(page, tap);
  const entered = await gameState(page);
  expect(entered).toMatchObject({ phase: "trial", trial: 3, lang: "ja", field: freshField(0) });
  expect(entered.lane).toEqual(initialLane);
  expect(entered.run).toEqual(initialRun);
  expect(entered.shed).toEqual(freshShed);
  await page.waitForTimeout(600);
  expect((await gameState(page)).run.remainingMs).toBe(60_000);

  // REQ-6.2.3: five stars that look alike, the wisp's message, no button and no closing line.
  await expectStars(page, expectedSeen(0, []));
  await expectMessage(page, "result");
  const start = await resultMessagePrint(page);
  await expectButton(page, false);
  await expectClosingLine(page, false);
  await page.screenshot({ path: "e2e/screenshots/mobile-field-ja-start.png" });

  // REQ-6.3: a real star is checked; only that star changes, and the message is about it.
  await checkStar(page, tap, 0);
  await expectStars(page, expectedSeen(0, [0]));
  await expect.poll(() => resultMessagePrint(page)).not.toBe(start);
  const real = await resultMessagePrint(page);
  await page.screenshot({ path: "e2e/screenshots/mobile-field-ja-real.png" });

  // REQ-6.4: a fake star is found, and the message changes with it.
  await checkStar(page, tap, 3);
  await expectStars(page, expectedSeen(0, [0, 3]));
  await expect.poll(() => resultMessagePrint(page)).not.toBe(real);
  await page.screenshot({ path: "e2e/screenshots/mobile-field-ja-fake.png" });

  // REQ-6.3.4: tapping a checked star again changes nothing.
  const before = await gameState(page);
  await tap(starCenter(3));
  await tap(starCenter(0));
  await page.waitForTimeout(300);
  expect(await gameState(page)).toEqual(before);
  await expectStars(page, expectedSeen(0, [0, 3]));

  // REQ-6.5.1: no keep before all five are checked, and a keep that reaches the reducer changes nothing.
  await checkStar(page, tap, 1);
  await checkStar(page, tap, 2);
  await dispatch(page, { type: "KeepStars" });
  await page.waitForTimeout(300);
  expect((await gameState(page)).field.stage).toBe("checking");
  await expectButton(page, false);
  await expectClosingLine(page, false);

  // REQ-6.5: the fifth check shows the keep button; checking alone keeps nothing.
  await checkStar(page, tap, 4);
  await expectStars(page, expectedSeen(0, [0, 1, 2, 3, 4]));
  await expectButton(page, true);
  expect((await gameState(page)).field.stage).toBe("checking");
  await page.screenshot({ path: "e2e/screenshots/mobile-field-ja-ready.png" });

  // REQ-6.5.2 to REQ-6.6: keeping accepts the real stars; the fake star fades; the closing line shows.
  await keepStars(page, tap);
  expect((await gameState(page)).field).toEqual({ stage: "kept", round: 0 });
  await expectStars(page, expectedSeen(0, [0, 1, 2, 3, 4]));
  await expectButton(page, true);
  await expectClosingLine(page, true);
  await page.screenshot({ path: "e2e/screenshots/mobile-field-ja-kept.png" });

  // The same state in English draws different words in the same place (REQ-6.11.4).
  const japanese = await closingLinePrint(page);
  await dispatch(page, { type: "SetLang", lang: "en" });
  await expect.poll(() => closingLinePrint(page)).not.toBe(japanese);
  await expectClosingLine(page, true);
  await expectStars(page, expectedSeen(0, [0, 1, 2, 3, 4]));
  await page.screenshot({ path: "e2e/screenshots/mobile-field-en-kept.png" });

  // REQ-6.5.4, REQ-6.7.3: the result stays; a star tap and a long tick change nothing.
  await tap(starCenter(0));
  await dispatch(page, { type: "Tick", ms: 60_000 });
  await page.waitForTimeout(1_000);
  expect(await gameState(page)).toMatchObject({
    phase: "trial",
    trial: 3,
    field: { stage: "kept", round: 0 },
  });
  await expectClosingLine(page, true);
  expect(errors).toEqual([]);
});

test("REQ-6.7: the next round has other fake stars, and the table of four rounds repeats, in English", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  const tap = tapper(page);
  await openGame(page, "en");
  await enterField(page, tap);

  for (const round of [0, 1, 2, 3, 0]) {
    expect((await gameState(page)).field).toEqual(freshField(round));
    await expectStars(page, expectedSeen(round, []));
    // Check the stars from the last to the first, so the order does not matter (REQ-6.3.3).
    await checkAll(page, tap, [4, 3, 2, 1, 0]);
    await expectStars(page, expectedSeen(round, [0, 1, 2, 3, 4]));
    if (round === 1) await page.screenshot({ path: "e2e/screenshots/mobile-field-en-fake.png" });
    await keepStars(page, tap);
    await expectClosingLine(page, true);
    if (round === 3) await page.screenshot({ path: "e2e/screenshots/mobile-field-en-kept4.png" });
    await nextRound(page, tap);
    await expectClosingLine(page, false);
  }
  expect((await gameState(page)).field).toEqual(freshField(1));
  expect(errors).toEqual([]);
});

test("REQ-6.1.3, REQ-6.8: a tap elsewhere on the title still starts trial 1, not the field", async ({
  page,
}) => {
  const tap = tapper(page);
  await openGame(page, "en");
  await startTrial(page, tap);
  const state = await gameState(page);
  expect(state).toMatchObject({ phase: "trial", trial: 1, field: freshField(0), shed: freshShed });
  await expect.poll(async () => (await gameState(page)).run.remainingMs).toBeLessThan(59_900);
});

for (const lang of ["ja", "en"] as const) {
  test(`REQ-6.10: plays the field offline after the first load: check, keep, next round, in ${lang}`, async ({
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

    await enterField(page, tap);
    await checkAll(page, tap);
    await expectStars(page, expectedSeen(0, [0, 1, 2, 3, 4]));
    await keepStars(page, tap);
    await expectClosingLine(page, true);
    await nextRound(page, tap);
    await expectStars(page, expectedSeen(1, []));

    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}
