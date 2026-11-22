// The six items of trial 4, drawn with Graphics inside a square of side `s` around (0, 0). They are told apart
// by outline, not by color (hard rule 7): a house key has a bow shaped like a house and teeth, an address is a
// card with a little house and lines, a password is a card with a row of dots, a candy is a wrapped sweet with
// twisted ends, a ball is a circle with a band across, a flower has round petals on a stem. Painting only; no
// logic (ADR 0003).

import type Phaser from "phaser";
import type { ItemId } from "../../domain/shadows";
import { palette } from "./art";
import { shade } from "./shade";

type Graphics = Phaser.GameObjects.Graphics;

const brass = 0xe5b93c;
const paper = 0xf4efe1;
const pink = 0xff7aa8;
const blue = 0x4aa3e0;
const petal = 0xff9d5c;
const green = 0x4f9a3c;

/** A small house, as a filled roof and a filled body: the shape of the key's bow and of the address's icon. */
function house(g: Graphics, x: number, y: number, w: number, fill: number): void {
  g.fillStyle(fill, 1);
  g.fillTriangle(x - w * 0.62, y, x, y - w * 0.62, x + w * 0.62, y);
  g.fillRect(x - w * 0.46, y - 1, w * 0.92, w * 0.8);
}

/** A key: a round bow with a little house inside it, a long shaft and two teeth to one side. */
function drawHouseKey(g: Graphics, s: number): void {
  g.lineStyle(s * 0.12, shade(brass, 0.7), 1);
  g.strokeCircle(0, -s * 0.22, s * 0.2);
  g.lineStyle(s * 0.07, brass, 1);
  g.strokeCircle(0, -s * 0.22, s * 0.2);
  house(g, 0, -s * 0.27, s * 0.17, brass);
  g.fillStyle(shade(brass, 0.7), 1);
  g.fillRect(-s * 0.06, -s * 0.02, s * 0.12, s * 0.48);
  g.fillRect(s * 0.06, s * 0.2, s * 0.17, s * 0.09);
  g.fillRect(s * 0.06, s * 0.34, s * 0.12, s * 0.09);
  g.fillStyle(brass, 1);
  g.fillRect(-s * 0.035, -s * 0.02, s * 0.07, s * 0.44);
}

/** A card with ink edges, for the address and the password. */
function card(g: Graphics, s: number): void {
  g.fillStyle(palette.ink, 1);
  g.fillRoundedRect(-s * 0.46, -s * 0.32, s * 0.92, s * 0.64, s * 0.07);
  g.fillStyle(paper, 1);
  g.fillRoundedRect(-s * 0.42, -s * 0.28, s * 0.84, s * 0.56, s * 0.05);
}

/** An address: a card with a little house on the left and three lines of writing on the right. */
function drawAddress(g: Graphics, s: number): void {
  card(g, s);
  house(g, -s * 0.22, -s * 0.04, s * 0.26, palette.ink);
  g.fillStyle(palette.ink, 1);
  for (const y of [-0.14, -0.02, 0.1]) g.fillRect(s * 0.06, s * y, s * 0.28, s * 0.05);
}

/** A password: a card with a row of four dots over a short line, as it is typed. */
function drawPassword(g: Graphics, s: number): void {
  card(g, s);
  g.fillStyle(palette.ink, 1);
  for (const x of [-0.24, -0.08, 0.08, 0.24]) g.fillCircle(s * x, -s * 0.06, s * 0.055);
  g.fillRect(-s * 0.26, s * 0.1, s * 0.52, s * 0.05);
}

/** A candy: a round sweet in a wrapper that is twisted at both ends, with a stripe. */
function drawCandy(g: Graphics, s: number): void {
  for (const side of [-1, 1]) {
    g.fillStyle(shade(pink, 0.75), 1);
    g.fillTriangle(side * s * 0.22, 0, side * s * 0.46, -s * 0.2, side * s * 0.46, s * 0.2);
  }
  g.fillStyle(shade(pink, 0.75), 1);
  g.fillEllipse(0, 0, s * 0.56, s * 0.42);
  g.fillStyle(pink, 1);
  g.fillEllipse(0, 0, s * 0.5, s * 0.36);
  g.lineStyle(s * 0.05, 0xffffff, 0.9);
  g.lineBetween(-s * 0.1, -s * 0.15, s * 0.04, s * 0.15);
}

/** A ball: a circle with a light band across it and a highlight. */
function drawBall(g: Graphics, s: number): void {
  g.fillStyle(shade(blue, 0.7), 1);
  g.fillCircle(0, 0, s * 0.4);
  g.fillStyle(blue, 1);
  g.fillCircle(0, 0, s * 0.36);
  g.lineStyle(s * 0.07, 0xffffff, 0.95);
  g.beginPath();
  g.arc(0, s * 0.55, s * 0.62, -Math.PI * 0.78, -Math.PI * 0.22);
  g.strokePath();
  g.fillStyle(0xffffff, 0.45);
  g.fillEllipse(-s * 0.14, -s * 0.16, s * 0.12, s * 0.18);
}

/** A flower: five round petals around a gold middle, on a stem with a leaf. */
function drawFlower(g: Graphics, s: number): void {
  g.fillStyle(green, 1);
  g.fillRect(-s * 0.02, -s * 0.04, s * 0.04, s * 0.5);
  g.fillEllipse(s * 0.12, s * 0.26, s * 0.2, s * 0.1);
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    g.fillStyle(petal, 1);
    g.fillCircle(Math.cos(angle) * s * 0.2, -s * 0.12 + Math.sin(angle) * s * 0.2, s * 0.14);
  }
  g.fillStyle(palette.gold, 1);
  g.fillCircle(0, -s * 0.12, s * 0.11);
}

const draws: Record<ItemId, (g: Graphics, s: number) => void> = {
  houseKey: drawHouseKey,
  address: drawAddress,
  password: drawPassword,
  candy: drawCandy,
  ball: drawBall,
  flower: drawFlower,
};

/** Draws the item centered at (0, 0) in a square of side `size`. */
export function drawItemArt(g: Graphics, item: ItemId, size: number): void {
  draws[item](g, size);
}
