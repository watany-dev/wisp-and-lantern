// Where everything in trial 2 (The Locked Shed) sits on the 390 x 844 canvas, in game pixels
// (REQ-5.10). The wisp's home, the messages, the closing line and the button are the lane's
// (`lane-layout.ts`): one layout, so trial 1's numbers and tests are untouched. Spec:
// .kiro/specs/05-trial-grant-tools/design.md

import type { ToolId } from "../domain/shed";
import { cardSize, type Rect } from "./lane-layout";
import type { Point } from "./steer";

/** The guide: what to do, always on screen. */
export const guideText = { x: 195, y: 56, wrap: 340, height: 60 } as const;

/** The shed picture: roof, wall, door, lock, window, the cat and the star. One drawing. */
export const shedBox: Rect = { x: 195, y: 198, width: 300, height: 200 };

/** The wisp's size on screen, and where it stands to try the tool: below the door, clear of the text. */
export const wispArtSize = 60;
export const wispWork: Point = { x: 120, y: 318 };

const toolX: Record<ToolId, number> = { key: 75, broom: 195, hammer: 315 };
const toolY = 690;

/** The tool cards share the row of the lane's color cards. */
export const toolCenter = (tool: ToolId): Point => ({ x: toolX[tool], y: toolY });
export const toolRect = (tool: ToolId): Rect => ({ ...toolCenter(tool), ...cardSize });

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
  /** The tool the wisp tries, drawn on the door next to the lock. */
  tool: { x: -38, y: 45, size: 44 },
  /** The cat once the door is open: sitting by the shed. */
  catOutside: { x: 128, y: 62 },
  star: { x: 128, y: 14, radius: 14 },
} as const;

/** A point of the shed picture given as an offset from its center, in game pixels. */
export function shedPoint(local: Point): Point {
  return { x: shedBox.x + local.x, y: shedBox.y + local.y };
}

/**
 * Four points the smoke reads from a screenshot to see the picture, not only the state: the door's
 * upper left corner (wood when shut, the dark doorway when open), the window's middle (the cat's face
 * when it is inside), the cat's body outside (on the fur, beside its pale belly), and the star (bright
 * only when it is drawn; the sky is dark). Each is clear of the tool and the wisp.
 */
export const probes = {
  door: shedPoint({
    x: shedParts.door.x - shedParts.door.width / 2 + 12,
    y: shedParts.door.y - shedParts.door.height / 2 + 12,
  }),
  window: shedPoint(shedParts.window),
  catOutside: shedPoint({ x: shedParts.catOutside.x + 8, y: shedParts.catOutside.y + 8 }),
  star: shedPoint(shedParts.star),
} as const;
