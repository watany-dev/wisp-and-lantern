// Helpers for the trial 3 (The Wisp Field) smoke. Presses are real taps or clicks; the picture is read from
// a screenshot, because it is drawn on the canvas and a state that says "fake" would pass even if the star
// never shone brighter. Spec: .kiro/specs/06-trial-verify-stars/design.md, "How the smoke sees the picture".

import { expect, type Page } from "@playwright/test";
import { fakesOf } from "../src/domain/field";
import {
  buttonRects,
  clearText,
  lensProbes,
  lensRect,
  starCenter,
  starProbes,
  titleFieldButton,
  type ButtonSlot,
  type Probes,
} from "../src/game/field-layout";
import { canvas, type Rect } from "../src/game/lane-layout";
import { canvasFrame, gameState, look, pressUntil, type GameState, type Press } from "./helpers";
import { colorsAt } from "./shed-helpers";
import { countMatching, near, type Rgb } from "./pixels";

const stars = [0, 1, 2, 3, 4];
export type Verdict = "real" | "fake";

/** The initial field of a round: nothing sorted, nothing in the lens, no verdict. */
export const freshField = (seed: number, round: number) =>
  ({
    stage: "sorting",
    seed,
    round,
    sorted: [false, false, false, false, false],
    looking: null,
    note: null,
  }) as const;

/** The fake stars of the round the game is in. The seed is random per visit, so the test reads it. */
export async function fakesNow(page: Page): Promise<readonly number[]> {
  const { field } = await gameState(page);
  return fakesOf(field.seed, field.round);
}

const sorting = (s: GameState) => (s.field.stage === "sorting" ? s.field : null);

/** Taps the title's field button until the field is open (the scene registers its input after loading). */
export const enterField = (page: Page, press: Press) =>
  pressUntil(page, press, { x: titleFieldButton.x, y: titleFieldButton.y }, (s) => s.trial === 3);

/** Taps a star until it is in the lens. Looking sorts nothing. */
export async function lookAt(page: Page, press: Press, index: number) {
  const before = sorting(await gameState(page))!.sorted;
  await pressUntil(page, press, starCenter(index), (s) => sorting(s)?.looking === index);
  expect(sorting(await gameState(page))!.sorted).toEqual(before);
}

const center = (slot: ButtonSlot) => ({ x: buttonRects[slot].x, y: buttonRects[slot].y });
const verdictSlot: Record<Verdict, ButtonSlot> = { real: "left", fake: "right" };

/** Taps a verdict button until the lens has closed with a verdict on it. */
export const giveVerdict = (page: Page, press: Press, verdict: Verdict) =>
  pressUntil(
    page,
    press,
    center(verdictSlot[verdict]),
    (s) => sorting(s)?.looking === null && sorting(s)?.note?.said === verdict,
  );

/** The true verdict for a star of the round the game is in. */
export async function truth(page: Page, index: number): Promise<Verdict> {
  return (await fakesNow(page)).includes(index) ? "fake" : "real";
}

/** Looks at a star and gives it the right verdict. */
export async function sortRight(page: Page, press: Press, index: number) {
  const verdict = await truth(page, index);
  await lookAt(page, press, index);
  await giveVerdict(page, press, verdict);
}

/** Sorts every star of the round, in `order`, rightly. */
export async function sortAll(page: Page, press: Press, order = stars) {
  for (const index of order) await sortRight(page, press, index);
}

/** Taps the button in a slot until the state says `done`. */
const pressSlot = (page: Page, press: Press, slot: ButtonSlot, done: (s: GameState) => boolean) =>
  pressUntil(page, press, center(slot), done);

/** The keep: taps the wide button until the round is finished. */
export const keepStars = (page: Page, press: Press) =>
  pressSlot(page, press, "single", (s) => s.field.stage !== "sorting");

/** The next round's button (after the first round of a run). */
export async function nextRound(page: Page, press: Press) {
  const before = (await gameState(page)).field.round;
  await pressSlot(
    page,
    press,
    "single",
    (s) => s.field.stage === "sorting" && s.field.round !== before,
  );
}

/** Play again, after the clear: left button. */
export async function playAgain(page: Page, press: Press) {
  const before = (await gameState(page)).field.round;
  await pressSlot(
    page,
    press,
    "left",
    (s) => s.field.stage === "sorting" && s.field.round !== before,
  );
}

/** The title button of the cleared trial: right button. */
export const leaveToTitle = (page: Page, press: Press) =>
  pressSlot(page, press, "right", (s) => s.phase === "title");

// What is on the screen.

/** Brightness 0 to 255 by the weights a grayscale screen uses. */
const luma = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** What the clue of one star reads as on the screen: how bright the halo is, and how broken the rim is. */
export type Clue = { glow: number; rimBreak: number; center: number };

const clueOf = (colors: Rgb[]): Clue => {
  const [middle, glow, dot, gap] = colors.map(luma) as [number, number, number, number];
  return { glow, rimBreak: dot - gap, center: middle };
};

const probeList = (p: Probes) => [p.center, p.glow, p.dot, p.gap];
/** The area of the star rows, big enough for every probe. */
const starArea = { x: canvas.width / 2, y: 210, width: canvas.width, height: 260 };

/** The five clues as the screen shows them right now. */
export async function seeClues(page: Page): Promise<Clue[]> {
  const colors = await colorsAt(
    page,
    starArea,
    stars.flatMap((i) => probeList(starProbes(i))),
  );
  return stars.map((i) => clueOf(colors.slice(4 * i, 4 * i + 4)));
}

/** The clue of the star in the lens. */
async function seeLens(page: Page): Promise<Clue> {
  return clueOf(await colorsAt(page, lensRect, probeList(lensProbes)));
}

/**
 * A star's clue reads as "bright" (a fake star) or "normal" (a real one). Both cues have to agree: the halo is
 * much brighter, and the rim has gaps (the dots are brighter than the spaces between them). The thresholds
 * sit between the measured values (a real star in its slot: halo 93, rim break about 0; a fake star: halo 167,
 * rim break 99; in the lens the halo is shrunk to fit, so 71 and 115) and apply to the brightness of the
 * picture, so a grayscale screen reads the same.
 */
const glowBright = { slot: 130, lens: 93 } as const;
const rimBroken = 55;
export function clueReads(
  clue: Clue,
  where: "slot" | "lens" = "slot",
): "bright" | "normal" | "mixed" {
  const bright = clue.glow > glowBright[where];
  const broken = clue.rimBreak > rimBroken;
  if (bright && broken) return "bright";
  return !bright && !broken ? "normal" : "mixed";
}

/**
 * The clues on the screen are the round's: bright for the fake stars, normal for the rest. Only the stars
 * not sorted yet are read; a sorted fake star fades and a sorted real star wears a frame.
 */
export async function expectCluesMatchRound(page: Page) {
  const fakes = await fakesNow(page);
  const { field } = await gameState(page);
  const unsorted = stars.filter((i) => field.stage === "sorting" && !field.sorted[i]);
  await expect
    .poll(
      async () => {
        const clues = await seeClues(page);
        return unsorted.map((i) => clueReads(clues[i]!));
      },
      { timeout: 5_000 },
    )
    .toEqual(unsorted.map((i) => (fakes.includes(i) ? "bright" : "normal")));
}

/** The lens shows a star of the given kind, or is empty (nothing in it). */
export async function expectLens(page: Page, kind: "bright" | "normal" | "empty") {
  await expect
    .poll(
      async () => {
        const clue = await seeLens(page);
        // An empty lens is the plain panel: no halo and no rim at all.
        const empty = clue.center < 60 && clue.glow < 60;
        return empty ? "empty" : clueReads(clue, "lens");
      },
      { timeout: 5_000 },
    )
    .toBe(kind);
}

const gold = (c: Rgb) => c[0] > 200 && c[1] > 170 && c[2] < 130;

/**
 * Which buttons are on the screen, by their gold faces. The wide button covers the gap between the two narrow
 * ones and they do not: a gold gap means the wide button, and a gold face with a dark gap a narrow one.
 */
async function buttonsShown(page: Page): Promise<ButtonSlot[]> {
  const y = buttonRects.single.y + 12;
  const spots = [
    { x: buttonRects.single.x, y },
    { x: buttonRects.left.x - buttonRects.left.width / 2 + 12, y },
    { x: buttonRects.right.x + buttonRects.right.width / 2 - 12, y },
  ];
  const area = { x: canvas.width / 2, y: buttonRects.single.y, width: canvas.width, height: 80 };
  const [gap, left, right] = (await colorsAt(page, area, spots)).map(gold);
  if (gap) return ["single"];
  return [...(left ? (["left"] as const) : []), ...(right ? (["right"] as const) : [])];
}

/** Exactly these slots have a button on the screen. */
export async function expectButtons(page: Page, shown: ButtonSlot[]) {
  await expect.poll(() => buttonsShown(page), { timeout: 5_000 }).toEqual(shown);
}

/** The sorted real stars are ticked on the screen (the badge is gold) and nothing else is. */
export async function expectTicks(page: Page, ticked: number[]) {
  const colors = async () =>
    colorsAt(
      page,
      starArea,
      stars.map((i) => starProbes(i).badge),
    );
  await expect
    .poll(async () => (await colors()).map((c, i) => (gold(c) ? i : -1)).filter((i) => i >= 0), {
      timeout: 5_000,
    })
    .toEqual(ticked);
}

/** Gold pixels (the clear word's color, `goldStyle` in `ui/text.ts`) in a game rectangle, in CSS pixels. */
async function goldPixels(page: Page, rect: Rect): Promise<number> {
  const { box, scale } = await canvasFrame(page);
  const clip = {
    x: box.x + (rect.x - rect.width / 2) * scale,
    y: box.y + (rect.y - rect.height / 2) * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
  const image = await look(page, clip);
  const ratio = image.width / clip.width;
  return countMatching(image, (pixel) => near(pixel, [0xff, 0xd5, 0x4a], 40)) / (ratio * ratio);
}

/** The clear panel is on the screen or is not: its gold word "Cleared!" is drawn in the middle of the lens place. */
export async function expectClearPanel(page: Page, shown: boolean) {
  const word = { x: clearText.title.x, y: clearText.title.y, width: clearText.wrap, height: 36 };
  await expect
    .poll(async () => (await goldPixels(page, word)) > 20, { timeout: 5_000 })
    .toBe(shown);
}

/** Where the closing line is drawn on the clear panel. */
export const clearTextAreas = {
  lesson: { x: clearText.lesson.x, y: clearText.lesson.y, width: clearText.wrap, height: 58 },
} as const;
/** The dark ink of the buttons' words (`inkStyle` in `ui/text.ts`), counted in a game rectangle in CSS pixels. */
export async function inkPixels(
  page: Page,
  rect: { x: number; y: number; width: number; height: number },
): Promise<number> {
  const { box, scale } = await canvasFrame(page);
  const clip = {
    x: box.x + (rect.x - rect.width / 2) * scale,
    y: box.y + (rect.y - rect.height / 2) * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
  const image = await look(page, clip);
  const ratio = image.width / clip.width;
  return countMatching(image, (pixel) => near(pixel, [0x1b, 0x1b, 0x2a], 60)) / (ratio * ratio);
}
