// A child's second tap must not press the button that replaces the first one. The field's buttons share a few
// places (the keep, "next stars", "play again" and "title" sit where the verdict buttons were), so a quick double
// tap would skip the screen between them. A set of buttons ignores presses for a moment after it appears.
// Spec: .kiro/specs/06-trial-verify-stars/design.md, "Buttons".

/** How long a new set of buttons ignores presses, in ms. Long enough for a double tap, short enough to feel instant. */
export const buttonLockMs = 450;

/** A press counts once the buttons have been on screen for `buttonLockMs`. */
export function pressable(now: number, shownAt: number): boolean {
  return now - shownAt >= buttonLockMs;
}

/** The buttons just changed: a different set of ids than the one on screen. */
export function setChanged(before: readonly string[], after: readonly string[]): boolean {
  return before.length !== after.length || before.some((id, i) => id !== after[i]);
}
