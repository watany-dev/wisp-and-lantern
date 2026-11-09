// The trapped cat: its face in the shed's window, and the whole cat sitting by the shed once the door
// is open. Calm and friendly in both (REQ-5.5.5): round eyes, a small smile, never afraid. Painting only.

import type Phaser from "phaser";
import { shedColors } from "../shed-palette";
import { palette } from "./art";
import { shade } from "./shade";

type Graphics = Phaser.GameObjects.Graphics;

const fur = shedColors.fur;
const furDark = shade(fur, 0.7);
const pink = 0xff9bb3;

/** A cat's head of radius `r` centered at (0, 0): two ears, eyes, a nose, a smile and whiskers. */
export function drawCatFace(g: Graphics, r: number): void {
  g.fillStyle(furDark, 1);
  g.fillTriangle(-r, -r * 0.2, -r * 0.35, -r * 0.95, -r * 0.9, -r * 1.25);
  g.fillTriangle(r, -r * 0.2, r * 0.35, -r * 0.95, r * 0.9, -r * 1.25);
  g.fillStyle(fur, 1);
  g.fillCircle(0, 0, r);
  g.fillStyle(pink, 1);
  g.fillTriangle(-r * 0.8, -r * 0.45, -r * 0.5, -r * 0.8, -r * 0.8, -r * 1.0);
  g.fillTriangle(r * 0.8, -r * 0.45, r * 0.5, -r * 0.8, r * 0.8, -r * 1.0);
  g.fillStyle(palette.ink, 1);
  g.fillEllipse(-r * 0.38, -r * 0.1, r * 0.2, r * 0.3);
  g.fillEllipse(r * 0.38, -r * 0.1, r * 0.2, r * 0.3);
  g.fillStyle(pink, 1);
  g.fillTriangle(-r * 0.1, r * 0.18, r * 0.1, r * 0.18, 0, r * 0.3);
  g.lineStyle(Math.max(1, r * 0.08), palette.ink, 1);
  g.lineBetween(-r * 1.15, r * 0.12, -r * 0.6, r * 0.2);
  g.lineBetween(r * 1.15, r * 0.12, r * 0.6, r * 0.2);
}

/** A cat of width `s` sitting, centered at (0, 0): body, tail, paws and the face on top. */
export function drawCatSitting(g: Graphics, s: number): void {
  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(0, s * 0.62, s * 0.9, s * 0.16);
  g.lineStyle(s * 0.16, furDark, 1);
  g.beginPath();
  g.arc(s * 0.32, s * 0.42, s * 0.3, Math.PI * 1.1, Math.PI * 0.2, true);
  g.strokePath();
  g.fillStyle(furDark, 1);
  g.fillEllipse(0, s * 0.22, s * 0.66, s * 0.8);
  g.fillStyle(fur, 1);
  g.fillEllipse(0, s * 0.22, s * 0.58, s * 0.72);
  g.fillStyle(0xfff0d0, 1);
  g.fillEllipse(0, s * 0.32, s * 0.3, s * 0.46);
  g.fillStyle(furDark, 1);
  g.fillEllipse(-s * 0.13, s * 0.58, s * 0.2, s * 0.12);
  g.fillEllipse(s * 0.13, s * 0.58, s * 0.2, s * 0.12);
  g.save();
  g.translateCanvas(0, -s * 0.32);
  drawCatFace(g, s * 0.34);
  g.restore();
}
