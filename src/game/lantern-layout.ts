// Where everything in trial 5 (The Flickering Lantern) sits on the 390 x 844 canvas, in game pixels (REQ-8.11).
// The guide and the way back to the title are the shed's (`shed-layout.ts`), the buttons and the wisp are the
// field's (`field-layout.ts`), and the canvas and `Rect` are the lane's (`lane-layout.ts`): one layout, so the other
// trials' numbers and tests are untouched. Spec: .kiro/specs/08-trial-tell-whats-wrong/design.md

import type { PartId } from "../domain/lantern";
import type { Rect } from "./lane-layout";
import type { Point } from "./steer";

/** The two panels side by side: the wish on the left, the wisp's lantern on the right. Neither moves. */
export const wishPanel: Rect = { x: 97, y: 260, width: 170, height: 264 };
export const lanternPanel: Rect = { x: 293, y: 260, width: 170, height: 264 };

/** The label above each panel ("Your wish", "The wisp's lantern"). */
export const panelLabel = { y: 110, size: 16 } as const;

/** The rows of the three parts, from the top, the same in both panels so they compare row by row. */
const partRows: Readonly<Record<PartId, number>> = { handle: 176, roof: 260, light: 344 };
export const partSize = { width: 160, height: 80 } as const;

/** A part of the wisp's lantern: the tap target, and where its picture, its frame and its flicker are. */
export const partRect = (part: PartId): Rect => ({
  x: lanternPanel.x,
  y: partRows[part],
  ...partSize,
});

/** The same part on the wish's panel. It is not a tap target. */
export const wishPartAt = (part: PartId): Point => ({ x: wishPanel.x, y: partRows[part] });

/** The glass of the light, in the middle of the light's row: dim until the lantern is lit. */
export const glass = { width: 96, height: 56 } as const;

/** What the game says: one message place, the same in every stage. */
export const lanternMessage = { x: 195, y: 432, wrap: 340, height: 60 } as const;

/** The title's button into trial 5: above the shadows' button, below the title's wisp and hero. */
export const titleLanternButton: Rect = { x: 195, y: 472, width: 300, height: 80 };

/** The frame round a part: dots this far apart, this far inside its rectangle, with this radius. */
export const frame = { step: 16, inset: 4, dot: 3.5, line: 4 } as const;

/**
 * The dots of the frame round a part, clockwise from the top left: along the top and the bottom every `frame.step`
 * pixels from `frame.step / 2` in, and along the sides the same, `frame.inset` inside the rectangle.
 */
export function frameDots(rect: Rect): Point[] {
  const left = rect.x - rect.width / 2 + frame.inset;
  const right = rect.x + rect.width / 2 - frame.inset;
  const top = rect.y - rect.height / 2 + frame.inset;
  const bottom = rect.y + rect.height / 2 - frame.inset;
  const along = (from: number, to: number) =>
    Array.from(
      { length: Math.floor((to - from) / frame.step) },
      (_, i) => from + frame.step * (i + 0.5),
    );
  const xs = along(left, right);
  const ys = along(top, bottom);
  return [
    ...xs.map((x) => ({ x, y: top })),
    ...ys.map((y) => ({ x: right, y })),
    ...xs.map((x) => ({ x, y: bottom })),
    ...ys.map((y) => ({ x: left, y })),
  ];
}

/** The tick badge on the lit lantern: `drawPickedMark`'s disc on the panel's top right corner. */
export const tickBadge = {
  x: lanternPanel.x + lanternPanel.width / 2 - 8,
  y: lanternPanel.y - lanternPanel.height / 2 + 8,
  radius: 15,
} as const;

/**
 * Points the smoke reads from a screenshot to see the picture, not only the state. For each part, one point on a dot
 * of the top edge of its frame and one halfway to the next dot: both dark with no frame, dot bright and gap dark
 * with the frame of dots, both bright with the solid frame. The tick: a point in the badge's disc above the panel
 * (on the sky when there is no badge). The light: a point inside the glass, clear of the light's picture.
 */
export function partProbes(part: PartId): { dot: Point; gap: Point } {
  const dot = frameDots(partRect(part))[5]!;
  return { dot, gap: { x: dot.x + frame.step / 2, y: dot.y } };
}

export const probes = {
  tick: { x: tickBadge.x, y: tickBadge.y - 10 },
  light: { x: lanternPanel.x - 36, y: partRows.light + 14 },
} as const satisfies Record<string, Point>;
