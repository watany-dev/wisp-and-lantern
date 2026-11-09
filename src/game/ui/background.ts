// The night behind every screen. The sky is a CSS gradient on the page (`index.html`) and the canvas is
// transparent, so the browser paints it for free; filling a full-screen gradient in the canvas every
// frame is the most expensive thing a phone could be asked to do here. What is drawn in the canvas is
// small: a moon, stars and two bare trees. A few stars twinkle slowly (never faster than once a
// second). Light details are dim, so they are not mistaken for text.

import Phaser from "phaser";
import { canvas } from "../lane-layout";

type Graphics = Phaser.GameObjects.Graphics;

const moonColor = 0xf4efe1;
const skyDark = 0x0a0a1a;

function drawMoon(g: Graphics): void {
  g.fillStyle(moonColor, 0.04);
  g.fillCircle(298, 150, 84);
  g.fillStyle(moonColor, 0.07);
  g.fillCircle(298, 150, 60);
  g.fillStyle(moonColor, 0.16);
  g.fillCircle(298, 150, 38);
  g.fillStyle(skyDark, 0.18);
  g.fillCircle(286, 142, 7);
  g.fillCircle(310, 160, 5);
}

/** Stars placed by a fixed rule, so the sky looks the same every time. */
function starAt(i: number): { x: number; y: number; r: number } {
  return { x: (i * 97 + 31) % canvas.width, y: (i * 211 + 17) % 640, r: 0.8 + (i % 3) * 0.5 };
}

function drawStars(g: Graphics): void {
  g.fillStyle(moonColor, 0.35);
  for (let i = 0; i < 40; i += 1) {
    const { x, y, r } = starAt(i);
    g.fillCircle(x, y, r);
  }
}

function drawTree(g: Graphics, x: number, y: number, flip: number): void {
  g.lineStyle(6, 0x120d26, 1);
  g.lineBetween(x, y, x, y - 90);
  g.lineStyle(3, 0x120d26, 1);
  g.lineBetween(x, y - 50, x + flip * 28, y - 82);
  g.lineBetween(x, y - 66, x - flip * 22, y - 92);
  g.lineBetween(x + flip * 28, y - 82, x + flip * 40, y - 84);
}

/** `moon` is off in the lane, where the moon would sit behind the slots and the wish. */
export function drawBackground(scene: Phaser.Scene, moon = true): void {
  const g = scene.add.graphics().setDepth(-10);
  if (moon) drawMoon(g);
  drawStars(g);
  drawTree(g, 18, 650, 1);
  drawTree(g, 372, 660, -1);
  twinkle(scene);
}

/** A few brighter stars fade in and out, each at its own pace (about 2 to 4 seconds a cycle). */
function twinkle(scene: Phaser.Scene): void {
  for (let i = 0; i < 8; i += 1) {
    const { x, y } = starAt(i * 5 + 2);
    const star = scene.add.circle(x, y, 1.8, moonColor, 0.5).setDepth(-9);
    scene.tweens.add({
      targets: star,
      alpha: 0.08,
      duration: 1000 + (i % 4) * 400,
      delay: i * 230,
      yoyo: true,
      repeat: -1,
    });
  }
}
