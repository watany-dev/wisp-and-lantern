// Where the title's words sit, in game pixels. Trial 1's rule ("60 seconds") and its way in ("tap") share one
// card, so the 60 seconds can only be read as trial 1's; the two buttons below it are the other trials and
// say, each in its own words, that they have no timer (REQ-6.1.6). Spec: .kiro/specs/06-trial-verify-stars/design.md

import type { Rect } from "./lane-layout";

export const titleText = { x: 195, y: 230 } as const;

/** Trial 1's card: the way in (tap anywhere) and its rule (60 seconds). Nothing else is inside it. */
export const titleCard: Rect = { x: 195, y: 372, width: 340, height: 144 };
export const titlePrompt = { x: 195, y: 338, size: 26 } as const;
export const titleIntro = { x: 195, y: 400, size: 22 } as const;

/** Inside each of the two buttons (offsets from the button's center): the label, then the small caption. */
export const buttonLabel = { x: 26, y: -10, size: 22 } as const;
export const buttonCaption = { x: 26, y: 20, size: 16 } as const;
/** The picture on the left of the label. */
export const buttonPicture = { x: -106 } as const;
