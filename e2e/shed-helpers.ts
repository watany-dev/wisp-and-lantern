// Helpers for the trial 2 (The Locked Shed) smoke. Presses are real taps or clicks; the picture is read
// from a screenshot, because it is drawn on the canvas and a state that says `freed` would pass even if
// the obstacle never went away. Spec: .kiro/specs/05-trial-grant-tools/design.md, "How the smoke sees the
// picture".

import { createHash } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { answerOf, puzzleAt, tools, type PuzzleId, type ToolId } from "../src/domain/shed";
import {
  buttonRect,
  canvas,
  cardSize,
  hudScore,
  hudTime,
  lessonBox,
  messageText,
  resultText,
  wisp,
  type Rect,
} from "../src/game/lane-layout";
import {
  guideText,
  leaveButton,
  obstacleProbes,
  probes,
  shedBox,
  titleShedButton,
  toolCenter,
} from "../src/game/shed-layout";
import { shedColors, shedLook } from "../src/game/shed-palette";
import type { Point } from "../src/game/steer";
import {
  canvasFrame,
  gameState,
  look,
  minTextPixels,
  pressUntil,
  textPixels,
  type GameState,
  type Press,
} from "./helpers";
import { countMatching, near, pixelAt, type Rgb } from "./pixels";

const rgb = (hex: number): Rgb => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const asRect = (t: { x: number; y: number; wrap: number; height: number }) => ({
  x: t.x,
  y: t.y,
  width: t.wrap,
  height: t.height,
});

/** The idle shed: round 0 of seed 0, nothing picked. It is what the state holds outside trial 2. */
export const freshShed = { stage: "choosing", seed: 0, round: 0, pick: null } as const;

/** Round `round` of `seed`, choosing, nothing picked. */
export const shedAt = (seed: number, round: number) =>
  ({ stage: "choosing", seed, round, pick: null }) as const;

/** The puzzle of the round the game is in. */
const puzzleNow = (s: GameState): PuzzleId => puzzleAt(s.shed.seed, s.shed.round);

/** The tool that answers the round the game is in, and a tool that does not. */
export const rightTool = (s: GameState): ToolId => answerOf(puzzleNow(s));
export const wrongTool = (s: GameState): ToolId => tools.find((t) => t !== rightTool(s))!;

const picked = (s: GameState, tool: ToolId) => s.shed.stage === "choosing" && s.shed.pick === tool;

type SeedWindow = Window & { __nextSeed?: number | undefined };

/**
 * Makes the next seed the game draws for the order of the puzzles a number of the test's choosing. The
 * game draws one with `Math.random` when a button on the title or the end screen starts a run; this lets
 * the smoke play a known order with real taps. Call it before `page.goto`.
 */
export async function rigSeed(page: Page) {
  await page.addInitScript(() => {
    const real = Math.random;
    Math.random = () => {
      const w = window as SeedWindow;
      const next = w.__nextSeed;
      if (next === undefined) return real();
      w.__nextSeed = undefined;
      return next / 2 ** 32;
    };
  });
}

/** The next run starts with this seed. */
export const nextSeed = (page: Page, seed: number) =>
  page.evaluate((n) => ((window as SeedWindow).__nextSeed = n), seed);

/** Taps the title's shed button until the shed is open (the scene registers its input after loading). */
export async function enterShed(page: Page, press: Press, seed = 0) {
  await nextSeed(page, seed);
  await pressUntil(
    page,
    press,
    { x: titleShedButton.x, y: titleShedButton.y },
    (s) => s.trial === 2,
  );
}

/** Picks a tool, and checks that picking alone has not used it (REQ-5.3.4). */
export async function pickTool(page: Page, press: Press, tool: ToolId) {
  await pressUntil(page, press, toolCenter(tool), (s) => picked(s, tool));
  expect((await gameState(page)).shed.stage).toBe("choosing");
}

/** Taps the wisp: the explicit hand-over. */
export const giveToWisp = (page: Page, press: Press) =>
  pressUntil(page, press, wisp, (s) => s.shed.stage === "tried");

/** Taps the button after a result (try another tool, or the next puzzle). */
export const pressShedButton = (page: Page, press: Press) =>
  pressUntil(page, press, { x: buttonRect.x, y: buttonRect.y }, (s) => s.shed.stage === "choosing");

/** Taps the button back to the title until the game is on the title screen. */
export const pressLeave = (page: Page, press: Press) =>
  pressUntil(page, press, { x: leaveButton.x, y: leaveButton.y }, (s) => s.phase === "title");

/**
 * The average color of a 5 x 5 patch of the screenshot around each game point. Only the game rectangle
 * `area` is photographed, which keeps a poll cheap on a slow runner.
 */
export async function colorsAt(page: Page, area: Rect, points: Point[]): Promise<Rgb[]> {
  const { box, scale } = await canvasFrame(page);
  const left = area.x - area.width / 2;
  const top = area.y - area.height / 2;
  const clip = {
    x: box.x + left * scale,
    y: box.y + top * scale,
    width: area.width * scale,
    height: area.height * scale,
  };
  const image = await look(page, clip);
  const ratio = image.width / clip.width;
  return points.map((point) => {
    const cx = (point.x - left) * scale * ratio;
    const cy = (point.y - top) * scale * ratio;
    const sum = [0, 0, 0];
    for (let dx = -2; dx <= 2; dx += 1) {
      for (let dy = -2; dy <= 2; dy += 1) {
        pixelAt(image, cx + dx, cy + dy).forEach((v, i) => (sum[i] = sum[i]! + v));
      }
    }
    return [sum[0]! / 25, sum[1]! / 25, sum[2]! / 25];
  });
}

/** What the picture should show: the puzzle of the round, and whether the cat is free. */
type Picture = { puzzle: PuzzleId; solved: boolean };
type Seen = {
  door: "shut" | "open" | "?";
  window: "cat" | "empty" | "?";
  outside: boolean;
  roofCat: boolean;
  star: boolean;
  obstacle: boolean;
};

const brightness = ([r, g, b]: Rgb) => (r + g + b) / 3;

/** The color of each obstacle at its probe point (`obstacleProbes`). The lock is part of the door. */
const obstacleColor: Partial<Record<PuzzleId, number>> = {
  leaves: shedLook.leafOrange,
  boards: shedLook.plank,
  rope: shedLook.rope,
};

/** What the probe points of the picture show right now for this puzzle (REQ-5.14.2). */
async function seen(page: Page, puzzle: PuzzleId): Promise<Seen> {
  const spot = obstacleProbes[puzzle as keyof typeof obstacleProbes] ?? probes.door;
  const [door, window, outside, roofCat, star, obstacle] = await colorsAt(page, shedBox, [
    probes.door,
    probes.window,
    probes.catOutside,
    probes.catRoof,
    probes.star,
    spot,
  ]);
  const wanted = obstacleColor[puzzle];
  return {
    door: near(door!, rgb(shedColors.door), 30)
      ? "shut"
      : near(door!, rgb(shedColors.doorway), 30)
        ? "open"
        : "?",
    window: near(window!, rgb(shedColors.fur), 45)
      ? "cat"
      : near(window!, rgb(shedColors.windowGlass), 30)
        ? "empty"
        : "?",
    outside: near(outside!, rgb(shedColors.fur), 45),
    roofCat: near(roofCat!, rgb(shedColors.fur), 45),
    star: brightness(star!) > 150,
    obstacle: wanted !== undefined && near(obstacle!, rgb(wanted), 45),
  };
}

/**
 * The picture on the screen is the expected one for this puzzle. While the cat is stuck: the door shut, the
 * cat in the window (or on the roof, in the roof puzzle), and the obstacle there (leaves, boards, rope).
 * Once it is free: the obstacle gone, the cat by the shed in one place only, the star, and the door open
 * (not in the roof puzzle, where the door was never shut for a reason). A state that says `freed` with the
 * obstacle still on the screen fails here.
 */
export async function expectPicture(page: Page, expected: Picture) {
  const { puzzle, solved } = expected;
  const opens = solved && puzzle !== "roof";
  const inside = !solved && puzzle !== "roof";
  await expect
    .poll(() => seen(page, puzzle), { timeout: 5_000 })
    .toEqual({
      door: opens ? "open" : "shut",
      window: inside ? "cat" : "empty",
      outside: solved,
      roofCat: puzzle === "roof" && !solved,
      star: solved,
      obstacle: !solved && puzzle in obstacleColor,
    });
}

/** The picture for the round the game is in right now, stuck or free. */
export async function expectPictureNow(page: Page, solved: boolean) {
  await expectPicture(page, { puzzle: puzzleNow(await gameState(page)), solved });
}

/** The tool cards whose "picked" mark (a gold frame and a gold disc at the top right) is drawn. */
async function markedTools(page: Page): Promise<ToolId[]> {
  const spots = tools.map((tool) => {
    const c = toolCenter(tool);
    // On the frame at the disc's upper left: gold when picked, clear of the tick drawn across the disc's
    // middle, and (in the lower row) clear of the frame of the card above.
    return { x: c.x + cardSize.width / 2 - 16, y: c.y - cardSize.height / 2 + 2 };
  });
  const area = { x: canvas.width / 2, y: 730, width: canvas.width, height: 200 };
  const colors = await colorsAt(page, area, spots);
  return tools.filter((_, i) => near(colors[i]!, rgb(shedColors.star), 40));
}

export async function expectMarked(page: Page, expected: ToolId[]) {
  await expect.poll(() => markedTools(page), { timeout: 5_000 }).toEqual(expected);
}

const resultBox = asRect(resultText);
const guideBox = asRect(messageText);

/** The message is drawn where the stage puts it: the result place after a hand-over, below the wisp before. */
export async function expectMessage(page: Page, stage: "choosing" | "result") {
  const box = stage === "result" ? resultBox : guideBox;
  await expect.poll(() => textPixels(page, box), { timeout: 5_000 }).toBeGreaterThan(minTextPixels);
}

/** A fingerprint of what is drawn in a game rectangle: different words, different fingerprint. */
async function print(page: Page, rect: { x: number; y: number; width: number; height: number }) {
  const { box, scale } = await canvasFrame(page);
  const clip = {
    x: box.x + (rect.x - rect.width / 2) * scale,
    y: box.y + (rect.y - rect.height / 2) * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
  return createHash("sha1")
    .update((await look(page, clip)).data)
    .digest("hex");
}

export const resultMessagePrint = (page: Page) => print(page, resultBox);
export const closingLinePrint = (page: Page) => print(page, lessonBox);

/** The clock's number is drawn in the top row: the run is on the screen (REQ-5.7.1). */
export async function expectClockShown(page: Page) {
  await expect
    .poll(() => textPixels(page, hudTime), { timeout: 5_000 })
    .toBeGreaterThan(minTextPixels);
}

/** Gold pixels in a game rectangle, counted in CSS pixels. The score is drawn in the star's gold. */
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
  const gold = rgb(shedColors.star);
  return countMatching(image, (pixel) => near(pixel, gold, 40)) / (ratio * ratio);
}

/** The score is drawn in the top row, in gold, from the start ("Score 0"). */
export async function expectScoreDrawn(page: Page) {
  await expect
    .poll(() => goldPixels(page, hudScore), { timeout: 5_000 })
    .toBeGreaterThan(minTextPixels);
}

/** A fingerprint of the score: it changes when a cat is freed. */
export const scorePrint = (page: Page) => print(page, hudScore);

/** A fingerprint of the guide: a different puzzle, different words, a different fingerprint. */
export const guidePrint = (page: Page) => print(page, asRect(guideText));
