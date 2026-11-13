// The colors of the shed picture that the smoke reads from a screenshot (see `probes` in
// shed-layout.ts), as plain numbers so `e2e/` can import them in Node. The drawing in `ui/shed-art.ts`
// uses the same numbers, so a change here moves the drawing and the check together.

export const shedColors = {
  /** The shut door. */
  door: 0x6f4222,
  /** The doorway once the door is open: dark, with nothing in it. */
  doorway: 0x07070f,
  /** The window when the cat is not in it. */
  windowGlass: 0x0e0e1c,
  /** The cat's fur, in the window and by the shed. */
  fur: 0xe8a04c,
  /** The star of the open result (the same gold as `palette.gold` in `ui/art.ts`). */
  star: 0xffd54a,
} as const;

/** The colors of the shed that nothing reads: its wall, roof, frame, ground, lock and the puzzles' obstacles. */
export const shedLook = {
  wall: 0x8a5a32,
  wallLine: 0x6a4224,
  doorLine: 0x56331a,
  roof: 0x4b3b6e,
  roofEdge: 0x2f2548,
  frame: 0xc8a46a,
  ground: 0x241d3c,
  lock: 0xe5b93c,
  lockDark: 0x8a6a1a,
  plank: 0xb98a52,
  plankEdge: 0x6a4a28,
  nail: 0x2b2b3a,
  rope: 0xd8bd86,
  ropeDark: 0x8c6d3c,
  leafRed: 0xb5432e,
  leafOrange: 0xd9792b,
  leafGold: 0xe0b23a,
  leafBrown: 0x7a4a24,
} as const;
