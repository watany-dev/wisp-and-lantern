// The wisp and the hero, drawn with Graphics. Both are plain vector shapes, so they stay sharp at any
// pixel ratio and no image file is loaded. Each is one object that the scene can move and scale.

import Phaser from "phaser";
import { palette } from "./art";
import { shade } from "./shade";

type Graphics = Phaser.GameObjects.Graphics;

const wispBody = 0xebf0ff;
const wispGlow = 0xbcd4ff;
// Bluer than the message text on purpose: the smoke test tells the wisp from words by blue.
const wispEdge = 0xcfe0ff;

/** The outline of the ghost: a round head, straight sides and three waves along the bottom. */
function wispOutline(): Phaser.Math.Vector2[] {
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= 16; i += 1) {
    const angle = Math.PI + (i * Math.PI) / 16;
    points.push(new Phaser.Math.Vector2(Math.cos(angle) * 27, -4 + Math.sin(angle) * 27));
  }
  for (let i = 0; i <= 12; i += 1) {
    const x = 27 - (i * 54) / 12;
    points.push(new Phaser.Math.Vector2(x, 24 + Math.sin((i * Math.PI * 3) / 12) * 5));
  }
  return points;
}

function wispFace(g: Graphics): void {
  g.fillStyle(palette.ink, 1);
  g.fillEllipse(-9, -6, 6, 9);
  g.fillEllipse(9, -6, 6, 9);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(-8, -8, 1.6);
  g.fillCircle(10, -8, 1.6);
  g.fillStyle(0xff9bb3, 0.55);
  g.fillCircle(-16, 2, 4);
  g.fillCircle(16, 2, 4);
  g.lineStyle(2.5, palette.ink, 1);
  g.beginPath();
  g.arc(0, 1, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  g.strokePath();
}

/** The wisp: a soft halo, a pale body that is lighter in the middle, and a small face. */
export function drawWisp(g: Graphics): void {
  for (const [r, alpha] of [
    [60, 0.07],
    [50, 0.1],
    [41, 0.16],
  ] as const) {
    g.fillStyle(wispGlow, alpha);
    g.fillCircle(0, 2, r);
  }
  g.fillStyle(wispEdge, 1);
  g.fillPoints(wispOutline(), true);
  g.fillStyle(wispBody, 1);
  g.fillEllipse(0, 0, 40, 46);
  wispFace(g);
}

/** The hero: a little witch with a purple hat, an orange cloak and a lantern in her hand. */
export function drawHero(g: Graphics): void {
  const cloak = 0xe8903a;
  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(0, 29, 40, 9);
  g.fillStyle(shade(cloak, 0.75), 1);
  g.fillTriangle(-20, 28, 20, 28, 0, -4);
  g.fillStyle(cloak, 1);
  g.fillTriangle(-17, 27, 17, 27, 0, -2);
  g.fillStyle(0xf6d6b0, 1);
  g.fillCircle(0, -9, 12);
  g.fillStyle(palette.ink, 1);
  g.fillCircle(-4.5, -9, 1.8);
  g.fillCircle(4.5, -9, 1.8);
  g.fillStyle(0xff9bb3, 0.6);
  g.fillCircle(-8, -5, 2.6);
  g.fillCircle(8, -5, 2.6);
  heroHat(g);
  heroLantern(g);
}

function heroHat(g: Graphics): void {
  g.fillStyle(0x4a2c7a, 1);
  g.fillTriangle(-9, -17, 9, -17, 3, -34);
  g.fillStyle(0x6b3fa6, 1);
  g.fillEllipse(0, -17, 30, 7);
  g.fillStyle(palette.gold, 1);
  g.fillRect(-9, -21, 18, 3);
}

function heroLantern(g: Graphics): void {
  g.fillStyle(palette.gold, 0.2);
  g.fillCircle(21, 10, 14);
  g.fillStyle(palette.gold, 0.35);
  g.fillCircle(21, 10, 9);
  g.fillStyle(0xfff3b0, 1);
  g.fillRoundedRect(17, 5, 8, 11, 2);
  g.fillStyle(0x6b6b8f, 1);
  g.fillRect(16, 3, 10, 3);
  g.fillRect(16, 15, 10, 3);
}
