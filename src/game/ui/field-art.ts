// The stars of the field: the slot behind a star, and the star with its clue. A real star is gold with a
// faint halo and an unbroken rim; a fake star is whiter, with a larger, stronger halo and a rim of separate
// dots. The numbers are in `field-look.ts`, where a test proves they differ in brightness and in shape.
// Painting only; no logic (ADR 0003).

import Phaser from "phaser";
import type { Shine } from "../../domain/field";
import { dotAngles, looks, rim, type Look } from "../field-look";
import { starPoints } from "../pattern";
import { drawLitSlot, drawSlot } from "./art";

type Graphics = Phaser.GameObjects.Graphics;

/** The slot behind a star: lit, or a dark socket once a fake star has been put aside. */
export function drawStarSlot(g: Graphics, size: number, aside: boolean): void {
  if (aside) drawSlot(g, size);
  else drawLitSlot(g, size);
}

function drawBody(g: Graphics, look: Look, r: number): void {
  const points = (k: number) => starPoints(r * k).map((p) => new Phaser.Math.Vector2(p.x, p.y));
  g.fillStyle(look.edge, 1);
  g.fillPoints(points(1.12), true);
  g.fillStyle(look.body, 1);
  g.fillPoints(points(1), true);
  g.fillStyle(look.core, 0.9);
  g.fillPoints(points(0.45), true);
}

/** An unbroken ring for a real star, twelve separate dots for a fake one. */
function drawRim(g: Graphics, look: Look, r: number): void {
  const radius = r * rim.radius;
  if (look.rim === "line") {
    g.lineStyle(r * rim.lineWidth, look.rimColor, 1);
    g.strokeCircle(0, 0, radius);
    return;
  }
  g.fillStyle(look.rimColor, 1);
  for (const angle of dotAngles) {
    g.fillCircle(radius * Math.cos(angle), radius * Math.sin(angle), r * rim.dotRadius);
  }
}

/**
 * The star at (0, 0): its halo, its body and its rim. The same drawing in a slot and in the lens. A halo
 * that would reach further than `haloLimit` (in pixels) is shrunk to fit, keeping its layers in order.
 */
export function drawClueStar(g: Graphics, shine: Shine, r: number, haloLimit = Infinity): void {
  const look = looks[shine];
  const widest = Math.max(...look.halo.map(([reach]) => reach)) * r;
  const fit = Math.min(1, haloLimit / widest);
  for (const [reach, alpha] of look.halo) {
    g.fillStyle(look.haloColor, alpha);
    g.fillCircle(0, 0, r * reach * fit);
  }
  drawBody(g, look, r);
  drawRim(g, look, r);
}
