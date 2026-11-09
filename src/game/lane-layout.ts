// Where everything in trial 1 sits on the 390 x 844 canvas, in game pixels (REQ-2.11).
// One table, so the scene, the unit tests and the e2e taps all use the same numbers.

import { isColor, type CardId, type ColorId, type ThingId } from "../domain/lane";
import type { Point } from "./steer";

export type Rect = { x: number; y: number; width: number; height: number };

export const canvas = { width: 390, height: 844 } as const;

/** Where `initialState` puts the hero. The strip around it stays free for the floor drag. */
export const heroStart: Point = { x: 195, y: 600 };
export const heroSize = 64;

export const slotSize = 88;
export const wishPictureSize = 64;
const wispHit = 96;
export const cardSize = { width: 96, height: 92 } as const;

export const wisp: Point = { x: 195, y: 370 };
export const wishText: Rect = { x: 130, y: 62, width: 200, height: 40 };
export const wishPicture: Point = { x: 265, y: 62 };
export const messageText = { x: 195, y: 454, wrap: 340, height: 60 } as const;
export const buttonRect: Rect = { x: 195, y: 528, width: 300, height: 80 };

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
