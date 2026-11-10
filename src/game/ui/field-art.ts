// The stars of the field: the slot behind a star, a solid gold star, and the hollow dashed outline of a
// fake star with a larger, paler halo. Painting only; no logic (ADR 0003). The probes in
// `field-layout.ts` read the middle of the star: bright when solid, dark when hollow.

import type Phaser from "phaser";
import { starArt, starSlot } from "../field-layout";
import { starPoints } from "../pattern";
import { drawLitSlot, drawSlot, drawStar } from "./art";

type Graphics = Phaser.GameObjects.Graphics;
type Picture = "solid" | "hollow";

const pale = 0xcfe0ff;

/** The slot behind a star: lit for a solid star, a dark socket for a hollow one. */
export function drawStarSlot(g: Graphics, picture: Picture): void {
  if (picture === "solid") drawLitSlot(g, starSlot);
  else drawSlot(g, starSlot);
}

/** One dashed edge of the hollow star: two strokes with a gap in the middle. */
function dashedEdge(g: Graphics, a: { x: number; y: number }, b: { x: number; y: number }): void {
  for (const [from, to] of [
    [0, 0.38],
    [0.62, 1],
  ] as const) {
    g.lineBetween(
      a.x + (b.x - a.x) * from,
      a.y + (b.y - a.y) * from,
      a.x + (b.x - a.x) * to,
      a.y + (b.y - a.y) * to,
    );
  }
}

/** A fake star: pale rings around an empty middle, and a dashed outline of the star. */
function drawHollowStar(g: Graphics, r: number): void {
  for (const [scale, alpha] of [
    [1.75, 0.1],
    [1.5, 0.15],
    [1.25, 0.22],
  ] as const) {
    g.lineStyle(r * 0.3, pale, alpha);
    g.strokeCircle(0, 0, r * scale);
  }
  g.lineStyle(3, pale, 1);
  const corners = starPoints(r * starArt.haloScale);
  corners.forEach((corner, i) => dashedEdge(g, corner, corners[(i + 1) % corners.length]!));
}

/** The star in a slot, centered at (0, 0): the existing gold star, or the hollow outline. */
export function drawStarPicture(g: Graphics, picture: Picture): void {
  if (picture === "solid") drawStar(g, starArt.radius);
  else drawHollowStar(g, starArt.radius);
}
