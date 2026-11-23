// What a button on the field's, the shadows' or the lantern's screen is: its id, its word, the event a press sends,
// the place it sits in (`buttonRects` in `field-layout.ts`) and the picture on it. The three trials draw their
// buttons with `ui/field-buttons.ts`, so the shape is shared. Types only; no logic (ADR 0003).

import type { GameEvent } from "../domain/events";
import type { LookId } from "../domain/lantern";
import type { ButtonSlot } from "./field-layout";

/**
 * A tick and a ring of dots (the field's verdicts), an arrow and a padlock (the shadows' decisions), a look of a
 * lantern's part (the lantern's cards), or none.
 */
export type ButtonIcon = "tick" | "dots" | "arrow" | "lock" | LookId | "none";

export type ButtonView = {
  id: string;
  text: string;
  event: GameEvent;
  slot: ButtonSlot;
  /** The picture on the button, so it is told apart without reading or color. */
  icon: ButtonIcon;
};
