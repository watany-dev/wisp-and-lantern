// Helpers for the trial 2 (The Locked Shed) smoke. Presses are real taps or clicks; the picture is read
// from a screenshot, because it is drawn on the canvas and a state that says `open` would pass even if
// the door never drew. Spec: .kiro/specs/05-trial-grant-tools/design.md, "How the smoke sees the picture".

import { createHash } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { tools, type ToolId } from "../src/domain/shed";
import {
  buttonRect,
  canvas,
  cardSize,
  lessonBox,
  messageText,
  resultText,
  wisp,
  type Rect,
} from "../src/game/lane-layout";
import { probes, shedBox, titleShedButton, toolCenter } from "../src/game/shed-layout";
import { shedColors } from "../src/game/shed-palette";
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
import { near, pixelAt, type Rgb } from "./pixels";

const rgb = (hex: number): Rgb => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const asRect = (t: { x: number; y: number; wrap: number; height: number }) => ({
  x: t.x,
  y: t.y,
  width: t.wrap,
  height: t.height,
});

/** The initial shed: nothing picked, nothing tried. */
export const freshShed = { stage: "choosing", pick: null } as const;

const picked = (s: GameState, tool: ToolId) => s.shed.stage === "choosing" && s.shed.pick === tool;

/** Taps the title's shed button until the shed is open (the scene registers its input after loading). */
export async function enterShed(page: Page, press: Press) {
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

/** Taps the button after a result (try another tool, or play again). */
export const pressShedButton = (page: Page, press: Press) =>
  pressUntil(page, press, { x: buttonRect.x, y: buttonRect.y }, (s) => s.shed.stage === "choosing");

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

type Picture = { door: "shut" | "open"; cat: "inside" | "outside"; star: boolean };
type Seen = {
  door: Picture["door"] | "?";
  window: "cat" | "empty" | "?";
  outside: boolean;
  star: boolean;
};

export const brightness = ([r, g, b]: Rgb) => (r + g + b) / 3;

/** What the four probe points of the picture show right now (REQ-5.14.2). */
async function seen(page: Page): Promise<Seen> {
  const [door, window, outside, star] = await colorsAt(page, shedBox, [
    probes.door,
    probes.window,
    probes.catOutside,
    probes.star,
  ]);
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
    star: brightness(star!) > 150,
  };
}

/**
 * The picture on the screen is the expected one: the door shut or open, the cat in the window or by the
 * shed (in one place only), and the star. A state that says `open` with a shut door fails here.
 */
export async function expectPicture(page: Page, expected: Picture) {
  const inside = expected.cat === "inside";
  await expect
    .poll(() => seen(page), { timeout: 5_000 })
    .toEqual({
      door: expected.door,
      window: inside ? "cat" : "empty",
      outside: !inside,
      star: expected.star,
    });
}

/** The tool cards whose "picked" mark (a gold disc at the top right) is drawn. */
async function markedTools(page: Page): Promise<ToolId[]> {
  const spots = tools.map((tool) => {
    const c = toolCenter(tool);
    // The gold disc of the mark, at its upper edge: clear of the tick drawn across its middle.
    return { x: c.x + cardSize.width / 2 - 8, y: c.y - cardSize.height / 2 - 4 };
  });
  const row = { x: canvas.width / 2, y: toolCenter("key").y - 6, width: canvas.width, height: 120 };
  const colors = await colorsAt(page, row, spots);
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
