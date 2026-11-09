// Draws the trial's pictures with Phaser Graphics: items, color swatches, badges, the star and the
// picked mark. Which pattern or shape a color has comes from `lane-view.ts`; the marks come from
// `pattern.ts`. No logic lives here (ADR 0003), only painting.

import Phaser from "phaser";
import { patternMarks, starPoints, type Mark } from "../pattern";

type Graphics = Phaser.GameObjects.Graphics;
type ItemArt = { fill: string; pattern: string; badge: string; silhouette: string };

const ink = 0x1b1b2a;
const white = 0xf4efe1;
const gold = 0xffd54a;
// Mid-tone, so the lantern's caps show on both the dark lane and the cream cards.
const cap = 0x6b6b8f;
const toColor = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

function drawShape(g: Graphics, shape: string, size: number): void {
  const half = size / 2;
  if (shape === "circle") g.fillCircle(0, 0, half);
  else if (shape === "square") g.fillRect(-half, -half, size, size);
  else g.fillTriangle(0, -half, -half, half, half, half);
}

function drawMarks(g: Graphics, marks: Mark[]): void {
  g.lineStyle(3, ink, 0.75);
  g.fillStyle(ink, 0.75);
  for (const m of marks) {
    if (m.kind === "line") g.lineBetween(m.x1, m.y1, m.x2, m.y2);
    else g.fillCircle(m.x, m.y, m.r);
  }
}

function drawPumpkin(g: Graphics, s: number): void {
  g.fillEllipse(0, s * 0.06, s, s * 0.82);
  g.fillStyle(0x3a6b2f, 1);
  g.fillRect(-s * 0.05, -s * 0.5, s * 0.1, s * 0.18);
}

function drawLantern(g: Graphics, s: number): void {
  g.fillRoundedRect(-s * 0.3, -s * 0.36, s * 0.6, s * 0.78, s * 0.08);
  g.fillStyle(cap, 1);
  g.fillRect(-s * 0.36, -s * 0.46, s * 0.72, s * 0.1);
  g.fillRect(-s * 0.36, s * 0.38, s * 0.72, s * 0.1);
}

export function drawSilhouette(g: Graphics, silhouette: string, size: number, fill: string): void {
  g.fillStyle(toColor(fill), 1);
  if (silhouette === "pumpkin") drawPumpkin(g, size);
  else drawLantern(g, size);
}

/** A small shape in the corner, so a color is also told by its shape (hard rule 7). */
function drawBadge(g: Graphics, shape: string, size: number): void {
  g.save();
  g.translateCanvas(size * 0.34, size * 0.36);
  g.fillStyle(ink, 1);
  drawShape(g, shape, size * 0.3 + 4);
  g.fillStyle(white, 1);
  drawShape(g, shape, size * 0.3);
  g.restore();
}

/** An item in the lane or in the wish: silhouette in the color, its pattern, and its shape badge. */
export function drawItem(g: Graphics, art: ItemArt, size: number): void {
  drawSilhouette(g, art.silhouette, size, art.fill);
  drawMarks(g, patternMarks(art.pattern, size * 0.5));
  drawBadge(g, art.badge, size);
}

/** A color card's swatch: its shape filled with the color, and the pattern over it. */
export function drawSwatch(
  g: Graphics,
  art: { fill: string; shape: string; pattern: string },
): void {
  g.fillStyle(toColor(art.fill), 1);
  drawShape(g, art.shape, 52);
  drawMarks(g, patternMarks(art.pattern, 30));
}

export function drawStar(g: Graphics, r: number): void {
  g.fillStyle(gold, 1);
  g.fillPoints(
    starPoints(r).map((p) => new Phaser.Math.Vector2(p.x, p.y)),
    true,
  );
}

/** A picked card: a thick frame and a tick, so the mark is a shape, not a color. */
export function drawPickedMark(g: Graphics, width: number, height: number): void {
  g.lineStyle(6, gold, 1);
  g.strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
  g.fillStyle(gold, 1);
  g.fillCircle(width / 2 - 8, -height / 2 + 8, 15);
  g.lineStyle(4, ink, 1);
  g.lineBetween(width / 2 - 15, -height / 2 + 8, width / 2 - 9, -height / 2 + 14);
  g.lineBetween(width / 2 - 9, -height / 2 + 14, width / 2 - 1, -height / 2 + 2);
}

export function drawPanel(
  g: Graphics,
  width: number,
  height: number,
  fill: number,
  alpha = 1,
): void {
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
}

export const palette = { ink, white, gold, dark: 0x15152a, lit: 0x2a2a4a };
