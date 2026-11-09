// The two objects of the lane, drawn with shading: a pumpkin with ribs and a leaf, a lantern with a
// glass, a frame and a handle. `fill` is the color of the pumpkin skin or the lantern glass. Shapes
// stay inside a square of side `s` around (0, 0), as the flat silhouettes did.

import type Phaser from "phaser";
import { shade } from "./shade";

type Graphics = Phaser.GameObjects.Graphics;

const leaf = 0x4f9a3c;
const frame = 0x6b6b8f;

/** A soft dark shadow under an item, so it sits on the panel instead of floating. */
function shadow(g: Graphics, s: number): void {
  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(0, s * 0.43, s * 0.7, s * 0.14);
}

/** One rib of the pumpkin: a lobe in the skin color with a darker edge. */
function lobe(
  g: Graphics,
  fill: number,
  shape: [x: number, w: number, h: number],
  s: number,
): void {
  const [x, w, h] = shape;
  g.fillStyle(fill, 1);
  g.fillEllipse(x * s, s * 0.08, w * s, h * s);
  g.lineStyle(Math.max(1.5, s * 0.025), shade(fill, 0.62), 0.9);
  g.strokeEllipse(x * s, s * 0.08, w * s, h * s);
}

export function drawPumpkin(g: Graphics, s: number, fill: number): void {
  shadow(g, s);
  lobe(g, shade(fill, 0.85), [-0.24, 0.42, 0.7], s);
  lobe(g, shade(fill, 0.85), [0.24, 0.42, 0.7], s);
  lobe(g, fill, [0, 0.5, 0.8], s);
  g.fillStyle(0xffffff, 0.3);
  g.fillEllipse(-s * 0.12, -s * 0.12, s * 0.14, s * 0.22);
  g.fillStyle(leaf, 1);
  g.fillRoundedRect(-s * 0.05, -s * 0.5, s * 0.1, s * 0.18, s * 0.03);
  g.fillTriangle(s * 0.04, -s * 0.36, s * 0.26, -s * 0.46, s * 0.16, -s * 0.26);
}

/** The glass of the lantern, with a lighter core so it looks lit from inside. */
function glass(g: Graphics, s: number, fill: number): void {
  g.fillStyle(shade(fill, 0.8), 1);
  g.fillRoundedRect(-s * 0.3, -s * 0.36, s * 0.6, s * 0.78, s * 0.1);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(-s * 0.24, -s * 0.3, s * 0.48, s * 0.66, s * 0.08);
  g.fillStyle(0xffffff, 0.32);
  g.fillEllipse(0, s * 0.02, s * 0.26, s * 0.4);
  g.fillStyle(0xffffff, 0.4);
  g.fillRoundedRect(-s * 0.2, -s * 0.26, s * 0.06, s * 0.3, s * 0.03);
}

export function drawLantern(g: Graphics, s: number, fill: number): void {
  shadow(g, s);
  g.lineStyle(Math.max(2, s * 0.045), frame, 1);
  g.strokeEllipse(0, -s * 0.52, s * 0.34, s * 0.22);
  glass(g, s, fill);
  g.fillStyle(frame, 1);
  g.fillRoundedRect(-s * 0.36, -s * 0.46, s * 0.72, s * 0.1, s * 0.04);
  g.fillRoundedRect(-s * 0.36, s * 0.38, s * 0.72, s * 0.1, s * 0.04);
  g.fillStyle(shade(frame, 1.35), 1);
  g.fillRect(-s * 0.36, -s * 0.46, s * 0.72, s * 0.03);
}
