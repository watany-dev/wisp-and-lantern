// The seed that picks which stars are fake when the field opens. The domain takes it as an event field and
// never draws a random number itself (ADR 0001, hard rule 3), so the same seed and the same taps always play
// out the same way. Spec: .kiro/specs/06-trial-verify-stars/design.md

/** A whole number from 0 up to (not including) 2 to the 32nd, from `random`, which is `Math.random` in the game. */
export function newSeed(random: () => number = Math.random): number {
  return Math.floor(random() * 2 ** 32) >>> 0;
}
