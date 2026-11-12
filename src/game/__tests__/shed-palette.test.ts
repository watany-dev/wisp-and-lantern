import { describe, expect, it } from "vite-plus/test";
import { shedColors, shedLook } from "../shed-palette";

const channels = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255] as const;
/** The largest difference in one channel, the distance the smoke's color match uses. */
const apart = (a: number, b: number) =>
  Math.max(...channels(a).map((v, i) => Math.abs(v - channels(b)[i]!)));

// The sky behind the canvas is a gradient from #0a0a1a to #1f1340 (index.html).
const skyTop = 0x0a0a1a;
const skyBottom = 0x1f1340;

describe("shed colors (REQ-5.5.6, REQ-5.14.2)", () => {
  it("gives the shut door, the open doorway, the window, the fur and the star their own colors", () => {
    expect(shedColors).toEqual({
      door: 0x6f4222,
      doorway: 0x07070f,
      windowGlass: 0x0e0e1c,
      fur: 0xe8a04c,
      star: 0xffd54a,
    });
  });

  it("tells a shut door from a dark doorway by a wide margin, so the smoke cannot mistake one for the other", () => {
    expect(apart(shedColors.door, shedColors.doorway)).toBeGreaterThan(60);
  });

  it("tells a cat in the window from an empty window by a wide margin", () => {
    expect(apart(shedColors.fur, shedColors.windowGlass)).toBeGreaterThan(150);
  });

  it("tells the cat and the star from the night sky behind them", () => {
    for (const sky of [skyTop, skyBottom]) {
      expect(apart(shedColors.fur, sky)).toBeGreaterThan(150);
      expect(apart(shedColors.star, sky)).toBeGreaterThan(150);
    }
  });

  it("tells the cat's fur from the star and from the door", () => {
    expect(apart(shedColors.fur, shedColors.star)).toBeGreaterThan(30);
    expect(apart(shedColors.fur, shedColors.door)).toBeGreaterThan(60);
  });

  it("keeps the wall's own colors apart from the probe colors, so a probe never reads the wall", () => {
    for (const color of Object.values(shedLook)) {
      expect(apart(color, shedColors.doorway)).toBeGreaterThan(20);
      expect(apart(color, shedColors.windowGlass)).toBeGreaterThan(20);
    }
    expect(shedLook.frame).not.toBe(shedColors.fur);
    expect(shedLook.lock).not.toBe(shedColors.star);
    expect(Object.keys(shedLook)).toEqual([
      "wall",
      "wallLine",
      "doorLine",
      "roof",
      "roofEdge",
      "frame",
      "ground",
      "lock",
      "lockDark",
      "plank",
      "plankEdge",
      "nail",
      "rope",
      "ropeDark",
      "leafRed",
      "leafOrange",
      "leafGold",
      "leafBrown",
    ]);
  });
});
