// Where everything in trial 6 (The Hollow Crown) sits on the 390 x 844 canvas, in game pixels (REQ-9.12). The way
// back to the title is the shed's (`shed-layout.ts`), the wisp's place the field's (`field-layout.ts`), and the canvas
// and `Rect` are the lane's (`lane-layout.ts`): one layout, so the other trials' numbers and tests are untouched.
// Spec: .kiro/specs/09-trial-hollow-crown/design.md

import type { LampPart } from "../domain/crown";
import type { Rect } from "./lane-layout";
import type { Point } from "./steer";

/** The row of the five steps at the top: tell, give, go, check, fix. Not tap targets. */
const stepY = 26;
export const stepCell = { width: 72, height: 40 } as const;
export const stepRect = (index: number): Rect => ({ x: 39 + 78 * index, y: stepY, ...stepCell });
/** Inside a cell: the tick of a done step on the left, the word in the middle. */
export const stepTick = { x: -26, size: 9 } as const;
export const stepWord = { x: 10, size: 14 } as const;

/** The guide: what to do in this step. Under the row of steps, above the panels. */
export const crownGuide = { x: 195, y: 76, wrap: 340, height: 52 } as const;

/** The two panels side by side: the wish on the left, the wisp's panel on the right. Neither moves. */
export const wishPanel: Rect = { x: 97, y: 214, width: 170, height: 172 };
export const lampPanel: Rect = { x: 293, y: 214, width: 170, height: 172 };
/** The label above each panel. */
export const panelLabel = { y: 116, size: 16 } as const;

/** The rows of a lamp, from the top, the same in both panels so they compare row by row. */
const rowY: Readonly<Record<LampPart, number>> = { roof: 168, light: 250 };
export const rowSize = { width: 160, height: 80 } as const;

/** A part of the wisp's lamp: where its picture is, and its tap target in the fix step. */
export const lampRow = (part: LampPart): Rect => ({ x: lampPanel.x, y: rowY[part], ...rowSize });
/** The same part on the wish's panel. It is not a tap target. */
export const wishRow = (part: LampPart): Point => ({ x: wishPanel.x, y: rowY[part] });

/** The shed in the wisp's panel during the give and go steps: trial 2's picture at half size, and the tool held. */
export const shedPicture = { x: lampPanel.x, y: 200, scale: 0.5 } as const;
export const heldTool = { x: lampPanel.x, y: 274, size: 40 } as const;

/** The solid frame round the pointed part: this far inside its row, this thick. */
export const pointFrame = { inset: 4, line: 4 } as const;

/** What the game says: one message place, the same in every stage. */
export const crownMessage = { x: 195, y: 332, wrap: 340, height: 56 } as const;

/** The tell cards: the roof's row and the light's row, three looks each, and "Tell" beside both rows. */
const cardX = [52, 146, 240] as const;
const cardRowY: Readonly<Record<LampPart, number>> = { roof: 412, light: 506 };
export const tellCard = (part: LampPart, index: number): Rect => ({
  x: cardX[index]!,
  y: cardRowY[part],
  width: 88,
  height: 80,
});
export const tellButton: Rect = { x: 340, y: 459, width: 88, height: 174 };

/** The three things of the give step. */
export const thingTile = (index: number): Rect => ({
  x: 75 + 120 * index,
  y: 455,
  width: 110,
  height: 110,
});

/** One wide button ("Go!", "Next", "Play again"), or two side by side (the check, the fix cards). */
export const oneButton: Rect = { x: 195, y: 455, width: 300, height: 96 };
export const twoButtons: readonly [Rect, Rect] = [
  { x: 106, y: 455, width: 170, height: 96 },
  { x: 284, y: 455, width: 170, height: 96 },
];

/** The town's three lamps, at the bottom left. Not tap targets. */
export const townLamp = (index: number): Rect => ({
  x: 36 + 56 * index,
  y: 796,
  width: 56,
  height: 64,
});

/** The title's button into trial 6: between trial 1's card and the title's wisp and hero. */
export const titleCrownButton: Rect = { x: 195, y: 240, width: 300, height: 80 };

/** The tick badge of a picked card or of the lit lamp: `drawPickedMark`'s disc on the top right corner. */
export const badgeOf = (rect: Rect): Point => ({
  x: rect.x + rect.width / 2 - 8,
  y: rect.y - rect.height / 2 + 8,
});

/**
 * Points the smoke reads from a screenshot to see the picture, not only the state. A step: a point on the top edge of
 * its cell (on the solid frame of the current step) and a point on its tick (a done step). A card or the lit lamp:
 * a point in the upper half of the tick badge's disc, which sticks out above the card or the panel, where the sky is
 * when there is no badge. A town lamp: a point on its top ray, which is drawn only when it is lit.
 */
export const probes = {
  stepFrame: (index: number): Point => {
    const r = stepRect(index);
    return { x: r.x + 12, y: r.y - r.height / 2 };
  },
  stepTick: (index: number): Point => {
    const r = stepRect(index);
    return { x: r.x + stepTick.x + 2, y: r.y + 1 };
  },
  badge: (rect: Rect): Point => ({ x: badgeOf(rect).x, y: badgeOf(rect).y - 10 }),
  townRay: (index: number): Point => {
    const r = townLamp(index);
    return { x: r.x, y: r.y - 29 };
  },
} as const;
