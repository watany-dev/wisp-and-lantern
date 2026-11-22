// The shadow and its speech bubble, the quiet dots and the padlock badge. The shadow is a round, soft listener
// with a big ear turned toward the item and eyes that look at it: curious, never angry or scary (REQ-7.2.4).
// Painting only; no logic (ADR 0003).

import type Phaser from "phaser";
import { bubbleBox, lockBadge } from "../shadows-layout";
import { palette } from "./art";

type Graphics = Phaser.GameObjects.Graphics;

const body = 0x6b5b9a;
const rim = 0x9a8bd0;
const ear = 0x8f80c8;
const earInner = 0x4a3d78;

/** The ear on the left, toward the item: a big lavender oval with a darker hollow. */
function drawEar(g: Graphics): void {
  g.fillStyle(rim, 1);
  g.fillEllipse(-50, -8, 40, 62);
  g.fillStyle(ear, 1);
  g.fillEllipse(-50, -8, 34, 56);
  g.fillStyle(earInner, 1);
  g.fillEllipse(-48, -6, 16, 34);
}

/** Two round eyes with the pupils turned left, toward the item, and a small calm mouth. */
function drawFace(g: Graphics): void {
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(-14, -14, 20, 24);
  g.fillEllipse(22, -14, 20, 24);
  g.fillStyle(palette.ink, 1);
  g.fillCircle(-18, -13, 6);
  g.fillCircle(18, -13, 6);
  g.lineStyle(3, palette.ink, 1);
  g.lineBetween(-6, 14, 10, 14);
}

/** The shadow, centered at (0, 0) in about 130 x 120: a soft body, its ear and its face. */
export function drawShadow(g: Graphics): void {
  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(8, 54, 84, 14);
  g.fillStyle(rim, 1);
  g.fillEllipse(8, -2, 100, 112);
  g.fillStyle(body, 1);
  g.fillEllipse(8, -2, 92, 104);
  drawEar(g);
  drawFace(g);
}

/** The bubble over the shadow's head: a cream rounded box with a tail pointing down at the shadow. */
export function drawBubble(g: Graphics): void {
  const { width, height } = bubbleBox;
  g.fillStyle(0x000000, 0.25);
  g.fillRoundedRect(-width / 2, -height / 2 + 4, width, height, 16);
  g.fillStyle(palette.white, 1);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
  g.fillTriangle(-10, height / 2 - 2, 10, height / 2 - 2, 0, height / 2 + 14);
}

/** Three quiet dots: the shadow heard nothing. */
export function drawQuiet(g: Graphics): void {
  g.fillStyle(palette.ink, 1);
  for (const x of [-18, 0, 18]) g.fillCircle(x, 0, 5);
}

/** The padlock badge on the tile's corner: a gold disc with a shackle over a body, so "kept" is a shape. */
export function drawLockBadge(g: Graphics): void {
  g.fillStyle(palette.gold, 1);
  g.fillCircle(lockBadge.x, lockBadge.y, lockBadge.radius);
  g.lineStyle(3, palette.ink, 1);
  g.beginPath();
  g.arc(lockBadge.x, lockBadge.y - 1, 4.5, Math.PI, 2 * Math.PI);
  g.strokePath();
  g.fillStyle(palette.ink, 1);
  g.fillRoundedRect(lockBadge.x - 7, lockBadge.y - 1, 14, 10, 2);
}

/** A padlock for the title's button, centered at (0, 0) in a square of side `size`: a shackle over a body with a keyhole. */
export function drawPadlock(g: Graphics, size: number): void {
  g.lineStyle(size * 0.1, palette.ink, 1);
  g.beginPath();
  g.arc(0, -size * 0.06, size * 0.2, Math.PI, 2 * Math.PI);
  g.strokePath();
  g.fillStyle(palette.ink, 1);
  g.fillRoundedRect(-size * 0.3, -size * 0.06, size * 0.6, size * 0.44, size * 0.08);
  g.fillStyle(palette.gold, 1);
  g.fillCircle(0, size * 0.1, size * 0.06);
  g.fillRect(-size * 0.025, size * 0.1, size * 0.05, size * 0.14);
}
