// Where everything in trial 1 sits on the 390 x 844 canvas, in game pixels (REQ-2.11).
// One table, so the scene, the unit tests and the e2e taps all use the same numbers.

import { isColor, type CardId, type ColorId, type ThingId } from "../domain/lane";
import type { Point } from "./steer";

export type Rect = { x: number; y: number; width: number; height: number };

export const canvas = { width: 390, height: 844 } as const;

/** Where `initialState` puts the hero. The strip around it stays free for the floor drag. */
export const heroStart: Point = { x: 195, y: 612 };
export const heroSize = 64;

export const slotSize = 88;
export const wishPictureSize = 64;
const wispHit = 96;
export const cardSize = { width: 96, height: 92 } as const;

export const wisp: Point = { x: 195, y: 370 };
export const wishText: Rect = { x: 130, y: 76, width: 200, height: 40 };
export const wishPicture: Point = { x: 265, y: 76 };
/** The run's clock and score share the top row, above the wish. */
export const hudTime: Rect = { x: 36, y: 24, width: 44, height: 32 };
export const hudBar: Rect = { x: 150, y: 24, width: 170, height: 14 };
export const hudScore: Rect = { x: 311, y: 24, width: 110, height: 32 };
/** The end screen: its lines from the top, and the button where the lane's button is. */
export const overText = {
  title: { x: 195, y: 200 },
  record: { x: 195, y: 258 },
  score: { x: 195, y: 340 },
  best: { x: 195, y: 420 },
  wrap: 340,
} as const;
/** How long the end screen ignores taps, so a last quick tap does not restart the run. */
export const overLockMs = 800;
export const messageText = { x: 195, y: 454, wrap: 340, height: 60 } as const;
/**
 * After a result the wisp has flown to a slot, so the area it left (y 322 to 418) is free. The
 * result message and the closing line go there: nothing shrinks and nothing is hidden.
 */
export const resultText = { x: 195, y: 380, wrap: 340, height: 60 } as const;
export const lessonBox: Rect = { x: 195, y: 448, width: 340, height: 64 };
export const lessonWrap = 320;
export const buttonRect: Rect = { x: 195, y: 528, width: 300, height: 80 };
/** The closing line is as large as the message it follows (REQ-3.5.4). */
export const fontSize = { message: 22, lesson: 22 } as const;

const columnX: Record<ColorId, number> = { red: 75, blue: 195, yellow: 315 };
const rowY: Record<ThingId, number> = { pumpkin: 170, lantern: 270 };
const thingCardX: Record<ThingId, number> = { pumpkin: 135, lantern: 255 };
const colorCardY = 690;
const thingCardY = 788;

/** The center of the lane slot for a color and an object. */
export function slotCenter(color: ColorId, thing: ThingId): Point {
  return { x: columnX[color], y: rowY[thing] };
}

/** The center of a picture card: color cards in the upper row, object cards in the lower row. */
export function cardCenter(card: CardId): Point {
  return isColor(card)
    ? { x: columnX[card], y: colorCardY }
    : { x: thingCardX[card], y: thingCardY };
}

export const cardRect = (card: CardId): Rect => ({ ...cardCenter(card), ...cardSize });
export const wispRect: Rect = { ...wisp, width: wispHit, height: wispHit };
