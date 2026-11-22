// Where everything in trial 4 (The Listening Shadows) sits on the 390 x 844 canvas, in game pixels (REQ-7.9).
// The guide and the way back to the title are the shed's (`shed-layout.ts`), the buttons and the wisp are the
// field's (`field-layout.ts`), and the canvas and `Rect` are the lane's (`lane-layout.ts`): one layout, so the
// other trials' numbers and tests are untouched. Spec: .kiro/specs/07-trial-keep-secrets/design.md

import type { Rect } from "./lane-layout";
import type { Point } from "./steer";

/** The tile that holds the item in front of the wisp: the picture above, its name below. */
export const itemTile: Rect = { x: 112, y: 232, width: 140, height: 140 };
/** Inside the tile (offsets from its center): the item's picture, and its name. */
export const itemArt = { y: -14, size: 76 } as const;
export const itemLabel = { y: 50, size: 20 } as const;
/** The two badges on the tile's top corners: the tick (a right decision, right) and the padlock (kept, left). */
export const tickBadge = { x: 62, y: -62, radius: 15 } as const;
export const lockBadge = { x: -62, y: -62, radius: 15 } as const;

/** The shadow: a soft body with an ear turned toward the tile. It is not a tap target. */
export const shadowBox: Rect = { x: 290, y: 246, width: 130, height: 120 };

/** The speech bubble over the shadow's head: the item it heard, or three quiet dots. */
export const bubbleBox: Rect = { x: 290, y: 138, width: 88, height: 60 };
/** The item drawn small inside the bubble. */
export const bubbleItem = { size: 40 } as const;

/** What the game says about the decision: one message place, the same in every stage. */
export const shadowsMessage = { x: 195, y: 352, wrap: 340, height: 60 } as const;

/** The closing line: what kind of thing the item is. Its own panel, under the message, above the buttons. */
export const whyBox: Rect = { x: 195, y: 440, width: 340, height: 88 };
export const whyWrap = 320;

/** The title's button into trial 4: above the field's button, below the title's wisp and hero. */
export const titleShadowsButton: Rect = { x: 195, y: 560, width: 300, height: 80 };

/**
 * Points the smoke reads from a screenshot to see the picture, not only the state: a point on the inner side of
 * the tick's disc and of the padlock's disc, 12 pixels from their middles (gold only when the badge is drawn; the
 * tile's panel is dark). Each is clear of the badge's glyph, of the tile's gold frame (which comes with the tick)
 * and of the item's picture.
 */
export const probes = {
  tick: { x: itemTile.x + tickBadge.x - 12, y: itemTile.y + tickBadge.y },
  lock: { x: itemTile.x + lockBadge.x + 12, y: itemTile.y + lockBadge.y },
} as const satisfies Record<string, Point>;
