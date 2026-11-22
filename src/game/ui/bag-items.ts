// The seven things of trial 4 and the padlock badge, drawn with Graphics inside a square of side `s` around
// (0, 0). They are told apart by outline, not by color (hard rule 7): candy is a round sweet with two twisted
// ends, a flower has petals round a middle, an acorn is a nut under a cap, a leaf a pointed oval with a vein,
// the house key the shed's key with a small house on its bow, the address a house with a pin, the password a
// speech bubble with three stars for hidden letters. Painting only; no logic (ADR 0003).

import Phaser from "phaser";
import type { ItemId } from "../../domain/bag";
import { addressPin } from "../bag-layout";
import { starPoints } from "../pattern";
import { palette } from "./art";
import { shade } from "./shade";
import { drawTool } from "./tools";

type Graphics = Phaser.GameObjects.Graphics;

const pink = 0xff8fb1;
const leafGreen = 0x5fae4e;
const nut = 0xb7793f;
const roof = 0xc8553d;
const wall = 0xf1d7a8;
/** The pin's red (`pinRed` in `e2e/bag-helpers.ts` reads it). */
const pinRed = 0xd9534f;

/** Candy: a round sweet with a stripe, and a twisted wrapper end on each side. */
function drawCandy(g: Graphics, s: number): void {
  g.fillStyle(shade(pink, 0.75), 1);
  g.fillTriangle(-s * 0.22, 0, -s * 0.46, -s * 0.18, -s * 0.46, s * 0.18);
  g.fillTriangle(s * 0.22, 0, s * 0.46, -s * 0.18, s * 0.46, s * 0.18);
  g.fillStyle(pink, 1);
  g.fillCircle(0, 0, s * 0.26);
  g.lineStyle(s * 0.06, 0xffffff, 0.85);
  g.beginPath();
  g.arc(0, 0, s * 0.15, Math.PI * 1.1, Math.PI * 1.9);
  g.strokePath();
}

/** A flower: five round petals round a middle, on a short stem. */
function drawFlower(g: Graphics, s: number): void {
  g.fillStyle(leafGreen, 1);
  g.fillRect(-s * 0.03, s * 0.1, s * 0.06, s * 0.36);
  g.fillStyle(0xf6a5c0, 1);
  for (let k = 0; k < 5; k += 1) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    g.fillCircle(s * 0.2 * Math.cos(a), -s * 0.08 + s * 0.2 * Math.sin(a), s * 0.13);
  }
  g.fillStyle(palette.gold, 1);
  g.fillCircle(0, -s * 0.08, s * 0.11);
}

/** An acorn: a round nut under a rough cap with a stalk. */
function drawAcorn(g: Graphics, s: number): void {
  g.fillStyle(nut, 1);
  g.fillEllipse(0, s * 0.1, s * 0.46, s * 0.56);
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(-s * 0.09, s * 0.06, s * 0.1, s * 0.22);
  g.fillStyle(shade(nut, 0.55), 1);
  g.fillEllipse(0, -s * 0.16, s * 0.56, s * 0.24);
  g.fillRect(-s * 0.03, -s * 0.4, s * 0.06, s * 0.16);
  g.fillStyle(shade(nut, 0.4), 1);
  for (const x of [-0.14, 0, 0.14]) g.fillCircle(s * x, -s * 0.17, s * 0.035);
}

/** A leaf: a pointed oval with a vein down the middle and a stalk. */
function drawLeaf(g: Graphics, s: number): void {
  const points = Array.from({ length: 21 }, (_, i) => {
    const t = (i / 20) * Math.PI * 2;
    const y = -s * 0.42 * Math.cos(t);
    const x = s * 0.26 * Math.sin(t) * (1 - Math.abs(Math.cos(t)) * 0.35);
    return new Phaser.Math.Vector2(x, y);
  });
  g.fillStyle(leafGreen, 1);
  g.fillPoints(points, true);
  g.lineStyle(s * 0.04, shade(leafGreen, 0.6), 1);
  g.lineBetween(0, -s * 0.36, 0, s * 0.46);
  g.lineBetween(0, -s * 0.05, s * 0.14, -s * 0.18);
  g.lineBetween(0, s * 0.12, -s * 0.14, -s * 0.01);
}

/** A small house: a wall, a roof and a door, centered at (x, y), `w` wide. */
function drawHouse(g: Graphics, x: number, y: number, w: number): void {
  g.fillStyle(roof, 1);
  g.fillTriangle(x - w * 0.6, y - w * 0.1, x + w * 0.6, y - w * 0.1, x, y - w * 0.62);
  g.fillStyle(wall, 1);
  g.fillRect(x - w * 0.45, y - w * 0.1, w * 0.9, w * 0.62);
  g.fillStyle(shade(roof, 0.7), 1);
  g.fillRect(x - w * 0.12, y + w * 0.16, w * 0.24, w * 0.36);
}

/** The house key: the shed's key, with a small house inside its bow so it is the key of a home. */
function drawHouseKey(g: Graphics, s: number): void {
  drawTool(g, "key", s);
  drawHouse(g, 0, -s * 0.28, s * 0.16);
}

/** The address: a house, and a map pin over it. */
function drawAddress(g: Graphics, s: number): void {
  drawHouse(g, -s * 0.08, s * 0.12, s * 0.5);
  const { x, y, radius } = addressPin;
  g.fillStyle(pinRed, 1);
  g.fillCircle(s * x, s * y, s * radius);
  g.fillTriangle(
    s * (x - 0.11),
    s * (y + 0.06),
    s * (x + 0.11),
    s * (y + 0.06),
    s * x,
    s * (y + 0.28),
  );
  g.fillStyle(0xffffff, 1);
  g.fillCircle(s * x, s * (y - 0.01), s * 0.05);
}

/** The password: a speech bubble, with three stars where the hidden letters are. */
function drawPassword(g: Graphics, s: number): void {
  g.fillStyle(palette.ink, 1);
  g.fillRoundedRect(-s * 0.46, -s * 0.3, s * 0.92, s * 0.5, s * 0.14);
  g.fillTriangle(-s * 0.22, s * 0.18, -s * 0.02, s * 0.18, -s * 0.26, s * 0.42);
  g.fillStyle(0xffffff, 1);
  for (const x of [-0.25, 0, 0.25]) {
    const points = starPoints(s * 0.11).map(
      (p) => new Phaser.Math.Vector2(s * x + p.x, p.y - s * 0.05),
    );
    g.fillPoints(points, true);
  }
}

const drawers: Record<ItemId, (g: Graphics, s: number) => void> = {
  candy: drawCandy,
  flower: drawFlower,
  acorn: drawAcorn,
  leaf: drawLeaf,
  key: drawHouseKey,
  address: drawAddress,
  password: drawPassword,
};

/** Draws the thing centered at (0, 0) in a square of side `size`. */
export function drawItem(g: Graphics, item: ItemId, size: number): void {
  drawers[item](g, size);
}

/** The padlock badge: a dark disc with a white padlock (a shackle over a body), a shape and not a color. */
export function drawPadlock(g: Graphics, x: number, y: number, r: number): void {
  g.fillStyle(palette.ink, 1);
  g.fillCircle(x, y, r);
  g.lineStyle(r * 0.22, 0xffffff, 1);
  g.beginPath();
  g.arc(x, y - r * 0.12, r * 0.32, Math.PI, 0);
  g.strokePath();
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(x - r * 0.45, y - r * 0.12, r * 0.9, r * 0.62, r * 0.12);
}
