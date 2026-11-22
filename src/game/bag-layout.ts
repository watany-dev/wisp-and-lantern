// Where everything in trial 4 (The Listening Shadows) sits on the 390 x 844 canvas, in game pixels (REQ-7.9).
// The guide is the shed's (`shed-layout.ts`), the "Next" button the field's (`field-layout.ts`), the wisp the
// field's place, and the canvas and `Rect` the lane's (`lane-layout.ts`).
// Spec: .kiro/specs/07-trial-keep-secrets/design.md

import type { Rect } from "./lane-layout";
import type { Point } from "./steer";

/** A thing's card: a tap target a little larger than the lane's cards, so a two-word name fits. */
export const itemCard = { width: 104, height: 100 } as const;

/** Three things in the upper row, two in the lower row, centered like the lane's slots. */
const itemSpots: readonly Point[] = [
  { x: 75, y: 160 },
  { x: 195, y: 160 },
  { x: 315, y: 160 },
  { x: 135, y: 268 },
  { x: 255, y: 268 },
];

export const itemCenter = (index: number): Point => ({ ...itemSpots[index]! });
export const itemRect = (index: number): Rect => ({ ...itemCenter(index), ...itemCard });

/** Inside a card (offsets from its center): the picture above the middle, the name below it. */
export const itemArt = { y: -12, size: 48 } as const;
export const itemLabel = { y: 32, size: 16 } as const;
/** The tick badge `drawPickedMark` draws at the top right of a card of this size. */
export const tickBadge = {
  x: itemCard.width / 2 - 8,
  y: -itemCard.height / 2 + 8,
  radius: 15,
} as const;
/** The padlock badge of a secret kept, at the top left: another corner and another shape than the tick. */
export const lockBadge = { x: -38, y: -36, radius: 13 } as const;

/** What the game says: one message place, the same in every stage. */
export const bagMessage = { x: 195, y: 354, wrap: 340, height: 60 } as const;

/**
 * The rule card: the three secrets as pictures, each with a padlock, while a round is played. Once a round is done
 * the same place holds the closing line.
 */
export const rulesRect: Rect = { x: 195, y: 440, width: 340, height: 96 };
export const rulePictures = { xs: [105, 195, 285], size: 44 } as const;
/** The padlock on each picture of the rule card, as an offset from the picture's center. */
export const ruleLock = { x: 22, y: 18, radius: 11 } as const;
/** The map pin on the address picture, as fractions of the picture's size from its center (the pin's head). */
export const addressPin = { x: 0.22, y: -0.24, radius: 0.13 } as const;
/**
 * The red head of the pin on the rule card's address picture (the second picture). Nothing else in that place is
 * red, and the closing line's letters are not, so red there means the rule card is drawn.
 */
export const rulePinProbe: Point = {
  x: rulePictures.xs[1] + addressPin.x * rulePictures.size,
  y: rulesRect.y + addressPin.y * rulePictures.size,
};
/** The closing line, inside `rulesRect`. */
export const bagLesson = { x: 195, y: 440, wrap: 320 } as const;

/** The two shadows beside the wisp (which is at the field's place, `fieldWisp`). Not tap targets. */
export const shadowSpots: readonly Point[] = [
  { x: 92, y: 708 },
  { x: 298, y: 708 },
];
/** How far a shadow's drawing reaches from its center. */
export const shadowSize = { width: 56, height: 72 } as const;

/** The title's button into the bag: above the field's button, below the title's wisp and hero. */
export const titleBagButton: Rect = { x: 195, y: 560, width: 300, height: 80 };

/**
 * Points the smoke reads from a screenshot (REQ-7.13.2): the tick badge's upper half (gold only on a thing handed
 * over), and the dark disc of the padlock badge, left of the padlock (only on a secret of a done round). Both are
 * inside the badge and clear of the picture.
 */
export function givenProbe(index: number): Point {
  const at = itemCenter(index);
  return { x: at.x + tickBadge.x, y: at.y + tickBadge.y - 5 };
}

export function keptProbe(index: number): Point {
  const at = itemCenter(index);
  return { x: at.x + lockBadge.x - 9, y: at.y + lockBadge.y };
}

/**
 * The white body of each padlock on the rule card: white while the card is shown, the dark panel once the closing
 * line has taken its place (the card's panel is as dark as a padlock's disc, so the disc could not tell).
 */
export const ruleProbes: readonly Point[] = rulePictures.xs.map((x) => ({
  x: x + ruleLock.x,
  y: rulesRect.y + ruleLock.y + 2,
}));
