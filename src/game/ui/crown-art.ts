// The pictures of trial 6 that no other trial has: a town lamp, dark or lit, and the title's picture of the crown of
// lamps. A dark lamp has a dim glass and a ring of dots round it; a lit one has a bright glass, rays and a tick badge,
// so it is told by shape, not by color (REQ-9.2.6, hard rule 7). Painting only (ADR 0003).

import type Phaser from "phaser";
import { palette } from "./art";

type Graphics = Phaser.GameObjects.Graphics;

const post = 0x6b6b8f;
const dimGlass = 0x35355a;
const litGlass = 0xffe9a0;
const orange = 0xff9d5c;

function drawBody(g: Graphics, glass: number): void {
  g.fillStyle(post, 1);
  g.fillRect(-3, 14, 6, 18);
  g.fillRect(-12, 30, 24, 4);
  g.fillTriangle(-14, -12, 14, -12, 0, -22);
  g.fillRect(-12, 10, 24, 4);
  g.fillStyle(glass, 1);
  g.fillRoundedRect(-10, -12, 20, 22, 4);
}

function drawRays(g: Graphics): void {
  g.lineStyle(4, palette.gold, 1);
  g.lineBetween(0, -24, 0, -34);
  g.lineBetween(-16, -16, -24, -24);
  g.lineBetween(16, -16, 24, -24);
  g.fillStyle(palette.gold, 1);
  g.fillCircle(17, 20, 8);
  g.lineStyle(3, palette.ink, 1);
  g.lineBetween(13, 20, 16, 23);
  g.lineBetween(16, 23, 21, 16);
}

function drawDots(g: Graphics): void {
  g.fillStyle(palette.white, 0.7);
  for (let i = 0; i < 12; i += 1) {
    const a = (i * Math.PI) / 6;
    g.fillCircle(20 * Math.cos(a), -2 + 20 * Math.sin(a), 2);
  }
}

/** A town lamp at (0, 0), about 56 x 64. */
export function drawTownLamp(g: Graphics, lit: boolean): void {
  g.clear();
  drawBody(g, lit ? litGlass : dimGlass);
  if (lit) drawRays(g);
  else drawDots(g);
}

/** The title's picture: a crown with a lit lamp on each of its three points, orange so it reads on the gold button. */
export function drawCrownIcon(g: Graphics): void {
  g.fillStyle(palette.ink, 1);
  g.fillRect(-22, 6, 44, 10);
  g.fillTriangle(-22, 8, -10, 8, -18, -10);
  g.fillTriangle(-6, 8, 6, 8, 0, -14);
  g.fillTriangle(10, 8, 22, 8, 18, -10);
  g.fillStyle(orange, 1);
  for (const [x, y] of [
    [-18, -14],
    [0, -18],
    [18, -14],
  ] as const) {
    g.fillCircle(x, y, 5);
  }
}
