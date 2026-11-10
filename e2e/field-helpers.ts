// Helpers for the trial 3 (The Wisp Field) smoke. Presses are real taps or clicks; the picture is read from
// a screenshot, because it is drawn on the canvas and a state that says "fake" would pass even if the star
// never drew hollow. Spec: .kiro/specs/06-trial-verify-stars/design.md, "How the smoke sees the picture".

import { expect, type Page } from "@playwright/test";
import { buttonRect, canvas } from "../src/game/lane-layout";
import { starCenter, starProbes, titleFieldButton } from "../src/game/field-layout";
import { gameState, pressUntil, type GameState, type Press } from "./helpers";
import { brightness, colorsAt } from "./shed-helpers";

/** What the child knows about each star, as the screen shows it. */
export type Seen = "unchecked" | "real" | "fake";

/** The initial field of round `round`: nothing checked, no star last. */
export const freshField = (round: number) =>
  ({ stage: "checking", round, checked: [false, false, false, false, false], last: null }) as const;

const stars = [0, 1, 2, 3, 4];
const checkedStar = (s: GameState, index: number) =>
  s.field.stage === "checking" && s.field.checked[index] === true;

/** Taps the title's field button until the field is open (the scene registers its input after loading). */
export const enterField = (page: Page, press: Press) =>
  pressUntil(page, press, { x: titleFieldButton.x, y: titleFieldButton.y }, (s) => s.trial === 3);

/** Taps a star until it is checked. */
export const checkStar = (page: Page, press: Press, index: number) =>
  pressUntil(page, press, starCenter(index), (s) => checkedStar(s, index));

/** Taps the keep button until the real stars are kept. */
export const keepStars = (page: Page, press: Press) =>
  pressUntil(page, press, { x: buttonRect.x, y: buttonRect.y }, (s) => s.field.stage === "kept");

/** Taps the button after the keep until the next round has begun. */
export async function nextRound(page: Page, press: Press) {
  const before = (await gameState(page)).field.round;
  await pressUntil(
    page,
    press,
    { x: buttonRect.x, y: buttonRect.y },
    (s) => s.field.stage === "checking" && s.field.round !== before,
  );
}

/** Checks the stars in order and returns the order. */
export async function checkAll(page: Page, press: Press, order = stars) {
  for (const index of order) await checkStar(page, press, index);
}

const bright = 150;
/** The area of the star rows, big enough for every probe (the badge points sit just above a slot). */
const starArea = { x: canvas.width / 2, y: 220, width: canvas.width, height: 240 };

/**
 * What each star shows right now (REQ-6.13.2): the middle is bright for a solid star and dark for a
 * hollow one, and the tick badge is bright only for a real star.
 */
async function seen(page: Page): Promise<Seen[]> {
  const points = stars.flatMap((i) => [starProbes(i).center, starProbes(i).badge]);
  const colors = await colorsAt(page, starArea, points);
  return stars.map((i) => {
    const solid = brightness(colors[2 * i]!) > bright;
    const ticked = brightness(colors[2 * i + 1]!) > bright;
    if (!solid) return "fake";
    return ticked ? "real" : "unchecked";
  });
}

/** The five stars on the screen are the expected ones. A state that says "fake" with a solid star fails. */
export async function expectStars(page: Page, expected: Seen[]) {
  await expect.poll(() => seen(page), { timeout: 5_000 }).toEqual(expected);
}

/** The button (keep, or next stars) is on the screen or is not: its gold face, left of the label. */
export async function expectButton(page: Page, shown: boolean) {
  const probe = { x: buttonRect.x - buttonRect.width / 2 + 20, y: buttonRect.y };
  const area = { ...buttonRect };
  const isGold = async () => {
    const [color] = await colorsAt(page, area, [probe]);
    return color![0] > 200 && color![1] > 170 && color![2] < 130;
  };
  await expect.poll(isGold, { timeout: 5_000 }).toBe(shown);
}
