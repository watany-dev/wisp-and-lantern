// Where everything in trial 3 (The Wisp Field) sits on the 390 x 844 canvas, in game pixels (REQ-6.9).
// The guide is the shed's (`shed-layout.ts`); the message, the closing line and the button are the lane's
// (`lane-layout.ts`): one layout, so the other trials' numbers and tests are untouched. Spec:
// .kiro/specs/06-trial-verify-stars/design.md

import type { Rect } from "./lane-layout";
import type { Point } from "./steer";

/** A star's slot: a square tap target. */
export const starSlot = 88;

/** Three stars in the upper row, two in the lower row, centered like the lane's slots. */
const starSpots: readonly Point[] = [
  { x: 75, y: 170 },
  { x: 195, y: 170 },
  { x: 315, y: 170 },
  { x: 135, y: 270 },
  { x: 255, y: 270 },
];

export const starCenter = (index: number): Point => starSpots[index]!;
export const starRect = (index: number): Rect => ({
  ...starCenter(index),
  width: starSlot,
  height: starSlot,
});

/** Inside a slot (offsets from its center): the star above the middle, its label below. */
export const starArt = { y: -10, radius: 24, haloScale: 1.12 } as const;
export const starLabel = { y: 30, height: 22, size: 18 } as const;
/** The tick badge `drawPickedMark` draws at the top right of a slot of this size. */
export const starBadge = { x: starSlot / 2 - 8, y: -starSlot / 2 + 8, radius: 15 } as const;

/** The wisp stays in view at the bottom, as the one who brought the stars. It is not a tap target. */
export const fieldWisp: Point = { x: 195, y: 720 };
export const fieldWispSize = 60;

/** The title's button into the field: above the shed's button, below the title's wisp and hero. */
export const titleFieldButton: Rect = { x: 195, y: 648, width: 300, height: 80 };

/**
 * The title's wisp and hero, moved up so that two buttons fit under them. `bottom` is how far the
 * drawing reaches below its center before scaling (the wisp's waves, the hero's shadow).
 */
export const titleArt = {
  wisp: { x: 285, y: 538, scale: 2, bottom: 31 },
  hero: { x: 110, y: 548, scale: 1.6, bottom: 34 },
} as const;

/**
 * Two points per star that the smoke reads from a screenshot to see the picture, not only the state:
 * the star's middle (bright for a solid star, dark for a hollow one) and a point in the upper half of the
 * tick badge's disc, clear of the tick (bright only for a real star; the slots are dark there).
 */
export function starProbes(index: number): { center: Point; badge: Point } {
  const at = starCenter(index);
  return {
    center: { x: at.x, y: at.y + starArt.y },
    badge: { x: at.x + starBadge.x, y: at.y + starBadge.y - 10 },
  };
}
