// Where everything in trial 2 (The Locked Shed) sits on the 390 x 844 canvas, in game pixels
// (REQ-5.10). The wisp's home, the messages, the closing line and the button are the lane's
// (`lane-layout.ts`): one layout, so trial 1's numbers and tests are untouched. Spec:
// .kiro/specs/05-trial-grant-tools/design.md

import type { PuzzleId, ToolId } from "../domain/shed";
import { cardSize, type Rect } from "./lane-layout";
import type { Point } from "./steer";

/**
 * The guide: what is wrong in this round's puzzle, and what to do. Always on screen, under the clock row
 * (`hudTime` in `lane-layout.ts`, y 8 to 40) and above the picture.
 */
export const guideText = { x: 195, y: 68, wrap: 340, height: 56 } as const;

/** The shed picture: roof, wall, door, lock, window, the cat and the star. One drawing. */
export const shedBox: Rect = { x: 195, y: 198, width: 300, height: 200 };

/** The wisp's size on screen, and where it stands to try the tool: below the door, clear of the text. */
export const wispArtSize = 60;
export const wispWork: Point = { x: 120, y: 318 };

/** Three tool cards in the upper row (the lane's color cards) and two in the lower, centered like the lane's object cards. */
const toolSpots: Record<ToolId, Point> = {
  key: { x: 75, y: 690 },
  broom: { x: 195, y: 690 },
  hammer: { x: 315, y: 690 },
  scissors: { x: 135, y: 788 },
  ladder: { x: 255, y: 788 },
};

export const toolCenter = (tool: ToolId): Point => ({ ...toolSpots[tool] });
export const toolRect = (tool: ToolId): Rect => ({ ...toolCenter(tool), ...cardSize });

/**
 * The way back to the title: a button of its own at the bottom right, beside the lower row of tools. It is
 * 80 x 80, the smallest target (REQ-5.10), and is always on screen, in a run and on its end screen.
 */
export const leaveButton: Rect = { x: 347, y: 788, width: 80, height: 80 };
/** On the end screen the leave button is a wide one under the play-again button (`overLeave`). */
export const overLeave: Rect = { x: 195, y: 634, width: 300, height: 80 };
/** The wisp on the end screen when it has two buttons: lower than trial 1's, clear of the second button. */
export const overWispTwoButtons: Point = { x: 195, y: 776 };

/** The title's button into the shed: a tap target of its own, below the title's wisp and hero. */
export const titleShedButton: Rect = { x: 195, y: 736, width: 300, height: 80 };
/** The title's wisp and hero end at about this y. The buttons sit below it (`titleArt` in `field-layout.ts`). */
export const titleArtBottom = 606;

/** Parts of the shed picture, as offsets from the center of `shedBox`. */
export const shedParts = {
  roof: [
    { x: -130, y: -30 },
    { x: 0, y: -95 },
    { x: 130, y: -30 },
  ],
  wall: { x: 0, y: 30, width: 220, height: 120 },
  door: { x: -45, y: 45, width: 70, height: 90 },
  window: { x: 55, y: 30, width: 60, height: 50 },
  lock: { x: -22, y: 45 },
  /** The size of the tool the wisp tries, drawn at the puzzle's spot (`toolSpot`). */
  tool: { size: 44 },
  /** The cat once it is free: sitting by the shed. */
  catOutside: { x: 128, y: 62 },
  /** The cat in the roof puzzle: sitting on the left slope of the roof. */
  catRoof: { x: -100, y: -67 },
  star: { x: 128, y: 14, radius: 14 },
  /** The pile of leaves in front of the door (the `leaves` puzzle). */
  leaves: { x: -45, y: 78, width: 84, height: 30 },
  /** The two planks nailed across the door (the `boards` puzzle): their middles. */
  planks: [
    { x: -45, y: 24, width: 96, height: 14 },
    { x: -45, y: 66, width: 96, height: 14 },
  ],
  /** The rope wound around the door and its knot (the `rope` puzzle). */
  rope: { x: -45, y: 45, width: 76, bands: [30, 52, 74], knot: { x: -45, y: 52, radius: 7 } },
} as const;

/**
 * Where the wisp tries the tool in each puzzle, as an offset from the center of `shedBox`: at the lock,
 * the leaves, the boards, the rope, or under the cat on the roof. The tool is drawn here, whatever it is.
 */
const spotOf: Record<PuzzleId, Point> = {
  lock: { x: -38, y: 45 },
  leaves: { x: -45, y: 56 },
  boards: { x: -45, y: 45 },
  rope: { x: -45, y: 45 },
  roof: { x: -100, y: 0 },
};

export const toolSpot = (puzzle: PuzzleId): Point => ({ ...spotOf[puzzle] });

/** A point of the shed picture given as an offset from its center, in game pixels. */
export function shedPoint(local: Point): Point {
  return { x: shedBox.x + local.x, y: shedBox.y + local.y };
}

/**
 * Points the smoke reads from a screenshot to see the picture, not only the state: the door's upper left
 * corner (wood when shut, the dark doorway when open; clear of every obstacle), the window's middle (the
 * cat's face when it is inside), the cat's body outside (on the fur, beside its pale belly), the cat's body
 * on the roof, and the star (bright only when it is drawn; the sky is dark). Each is clear of the tool and
 * the wisp.
 */
export const probes = {
  door: shedPoint({
    x: shedParts.door.x - shedParts.door.width / 2 + 12,
    y: shedParts.door.y - shedParts.door.height / 2 + 12,
  }),
  window: shedPoint(shedParts.window),
  catOutside: shedPoint({ x: shedParts.catOutside.x + 8, y: shedParts.catOutside.y + 8 }),
  catRoof: shedPoint({ x: shedParts.catRoof.x + 8, y: shedParts.catRoof.y + 8 }),
  star: shedPoint(shedParts.star),
} as const;

/**
 * One point on each obstacle where the smoke reads its color from a screenshot: on the last leaf of the
 * bottom row, on the upper plank, and on the middle band of the rope. Each is clear of the tool the wisp
 * tries (`toolSpot`), and of the door probe.
 */
export const obstacleProbes = {
  leaves: shedPoint({ x: -14, y: 89 }),
  boards: shedPoint({ x: -15, y: 24 }),
  rope: shedPoint({ x: -15, y: 52 }),
} as const;
