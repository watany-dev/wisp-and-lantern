// Where everything in trial 3 (The Wisp Field) sits on the 390 x 844 canvas, in game pixels (REQ-6.9).
// The guide is the shed's (`shed-layout.ts`); the canvas and `Rect` are the lane's (`lane-layout.ts`).
// Spec: .kiro/specs/06-trial-verify-stars/design.md

import { rim } from "./field-look";
import type { Rect } from "./lane-layout";
import type { Point } from "./steer";

/** A star's slot: a square tap target. */
export const starSlot = 88;

/** Three stars in the upper row, two in the lower row, centered like the lane's slots. */
const starSpots: readonly Point[] = [
  { x: 75, y: 160 },
  { x: 195, y: 160 },
  { x: 315, y: 160 },
  { x: 135, y: 256 },
  { x: 255, y: 256 },
];

export const starCenter = (index: number): Point => starSpots[index]!;
export const starRect = (index: number): Rect => ({
  ...starCenter(index),
  width: starSlot,
  height: starSlot,
});

/** Inside a slot (offsets from its center): the star above the middle, its word below. */
export const starArt = { y: -12, radius: 20 } as const;
export const starLabel = { y: 31, size: 18 } as const;
/** The tick badge `drawPickedMark` draws at the top right of a slot of this size. */
export const starBadge = { x: starSlot / 2 - 8, y: -starSlot / 2 + 8, radius: 15 } as const;

/** What the wisp or the game says: one message place, the same in every stage. */
export const fieldMessage = { x: 195, y: 336, wrap: 340, height: 60 } as const;

/**
 * The lens: the star being looked at, larger, with its glow and rim. Once a round is kept the same place
 * holds the closing line. It is below the star rows and above the buttons, so the stars stay in view.
 */
export const lensRect: Rect = { x: 195, y: 428, width: 340, height: 124 };
export const lensStar = { radius: 34 } as const;
/** The closing line, inside `lensRect`. */
export const lessonText = { x: 195, y: 428, wrap: 320 } as const;

/** Where the buttons are: one wide button (the keep, "next stars"), or two side by side (the verdicts). All are 80 high. */
export type ButtonSlot = "single" | "left" | "right";
const buttonY = 534;
export const buttonRects: Record<ButtonSlot, Rect> = {
  single: { x: 195, y: buttonY, width: 300, height: 80 },
  left: { x: 118, y: buttonY, width: 146, height: 80 },
  right: { x: 272, y: buttonY, width: 146, height: 80 },
};

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

/** The points of a star the smoke reads from a screenshot to see the clue (REQ-6.13). */
export type Probes = { center: Point; glow: Point; dot: Point; gap: Point };

const polar = (middle: Point, distance: number, angle: number): Point => ({
  x: middle.x + distance * Math.cos(angle),
  y: middle.y + distance * Math.sin(angle),
});

/**
 * For a star drawn at `middle` with this `radius`: its middle; a point just outside the star in the halo, in
 * the valley between two points (bright for a fake star, dim for a real one); and two points on the rim,
 * one on a dot (the first, at the right) and one half a step further round, in the gap (bright and dark on a dotted rim, both bright on a line).
 */
export function probesFor(middle: Point, radius: number): Probes {
  return {
    center: middle,
    glow: polar(middle, radius * 1.3, (18 * Math.PI) / 180),
    dot: polar(middle, radius * rim.radius, 0),
    gap: polar(middle, radius * rim.radius, Math.PI / rim.dots),
  };
}

/** The probes of a star in its slot, with the tick badge's upper half (bright only for a sorted real star). */
export function starProbes(index: number): Probes & { badge: Point } {
  const at = starCenter(index);
  const middle = { x: at.x, y: at.y + starArt.y };
  return {
    ...probesFor(middle, starArt.radius),
    badge: { x: at.x + starBadge.x, y: at.y + starBadge.y - 10 },
  };
}

/** The probes of the star in the lens. */
export const lensProbes: Probes = probesFor({ x: lensRect.x, y: lensRect.y }, lensStar.radius);
