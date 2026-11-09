// Draws the trial's pictures with Phaser Graphics: items, color swatches, badges, the star and the
// picked mark. Which pattern or shape a color has comes from `lane-view.ts`; the marks come from
// `pattern.ts`. No logic lives here (ADR 0003), only painting.

import Phaser from "phaser";
import { patternMarks, starPoints, type Mark } from "../pattern";
import { drawLantern, drawPumpkin } from "./items";
import { shade } from "./shade";

type Graphics = Phaser.GameObjects.Graphics;
type ItemArt = { fill: string; pattern: string; badge: string; silhouette: string };

const ink = 0x1b1b2a;
const white = 0xf4efe1;
const gold = 0xffd54a;
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

export function drawSilhouette(g: Graphics, silhouette: string, size: number, fill: string): void {
  if (silhouette === "pumpkin") drawPumpkin(g, size, toColor(fill));
  else drawLantern(g, size, toColor(fill));
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
  g.fillStyle(shade(toColor(art.fill), 0.6), 1);
  drawShape(g, art.shape, 58);
  g.fillStyle(toColor(art.fill), 1);
  drawShape(g, art.shape, 52);
  drawMarks(g, patternMarks(art.pattern, 30));
}

export function drawStar(g: Graphics, r: number): void {
  const points = (k: number) => starPoints(r * k).map((p) => new Phaser.Math.Vector2(p.x, p.y));
  g.fillStyle(shade(gold, 0.7), 1);
  g.fillPoints(points(1.12), true);
  g.fillStyle(gold, 1);
  g.fillPoints(points(1), true);
  g.fillStyle(0xfff3b0, 0.9);
  g.fillPoints(points(0.45), true);
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

/** The clock bar: a dark track and a gold fill that shrinks as the time runs out. */
export function drawBar(g: Graphics, width: number, height: number, fraction: number): void {
  g.fillStyle(palette.dark, 1);
  g.fillRoundedRect(0, 0, width, height, height / 2);
  const fill = Math.max(0, Math.min(1, fraction)) * width;
  if (fill < height) return;
  g.fillStyle(gold, 1);
  g.fillRoundedRect(0, 0, fill, height, height / 2);
}

/**
 * An empty lane slot: a dark socket with a thin rim and a faint ring. The rim is darker than the
 * lit slot's panel (`palette.lit`), so a lit slot is told from an empty one by its panel color.
 */
export function drawSlot(g: Graphics, size: number): void {
  drawPanel(g, size, size, palette.dark);
  g.lineStyle(2, 0x20203a, 1);
  g.strokeRoundedRect(-size / 2 + 1, -size / 2 + 1, size - 2, size - 2, 13);
  g.lineStyle(2, 0x2a2a4a, 0.5);
  g.strokeCircle(0, 0, size * 0.3);
}

/** A lit slot: the lit panel, and a warm halo around it that fades outward. */
export function drawLitSlot(g: Graphics, size: number): void {
  for (const [grow, alpha] of [
    [16, 0.05],
    [11, 0.08],
    [6, 0.14],
  ] as const) {
    g.lineStyle(grow, gold, alpha);
    g.strokeRoundedRect(
      -size / 2 - grow / 2,
      -size / 2 - grow / 2,
      size + grow,
      size + grow,
      14 + grow / 2,
    );
  }
  drawPanel(g, size, size, palette.lit);
  g.fillStyle(gold, 0.16);
  g.fillCircle(0, 0, size * 0.32);
}

/** A card: a soft shadow below, the cream face, and a light rim. */
export function drawCardFace(g: Graphics, width: number, height: number): void {
  g.fillStyle(0x000000, 0.35);
  g.fillRoundedRect(-width / 2, -height / 2 + 5, width, height, 14);
  drawPanel(g, width, height, white);
  g.lineStyle(2, 0xffffff, 0.6);
  g.strokeRoundedRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2, 13);
}

/** A button: a darker lip below the face, and a light band on top, so it looks pressable. */
export function drawButton(g: Graphics, width: number, height: number): void {
  g.fillStyle(shade(gold, 0.72), 1);
  g.fillRoundedRect(-width / 2, -height / 2 + 6, width, height, 14);
  drawPanel(g, width, height - 4, gold);
  g.fillStyle(0xffffff, 0.28);
  g.fillRoundedRect(-width / 2 + 8, -height / 2 + 6, width - 16, height * 0.28, 10);
}

export const palette = { ink, white, gold, dark: 0x15152a, lit: 0x2a2a4a };
