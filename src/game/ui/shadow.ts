// A listening shadow: a soft dark shape with round eyes and one big ear turned toward the wisp. It stands for
// someone who may be listening (REQ-7.2.5). It has no teeth, no claws and no angry face, it never moves toward
// anything, and it is not a tap target. It sways a little, which carries no meaning. Painting only (ADR 0003).

import type Phaser from "phaser";
import { shadowSize } from "../bag-layout";

type Graphics = Phaser.GameObjects.Graphics;

const body = 0x3b3560;
const rim = 0x5a5390;

/** The body: a round head on a body that fades out at the bottom, like a shadow on the ground. */
function drawBody(g: Graphics): void {
  const { width, height } = shadowSize;
  g.fillStyle(body, 0.35);
  g.fillEllipse(0, height * 0.28, width, height * 0.5);
  g.fillStyle(body, 0.85);
  g.fillEllipse(0, height * 0.06, width * 0.82, height * 0.62);
  g.fillCircle(0, -height * 0.2, width * 0.36);
  g.lineStyle(2, rim, 0.9);
  g.strokeCircle(0, -height * 0.2, width * 0.36);
}

/** Round, calm eyes and a small round mouth: curious, not angry. */
function drawFace(g: Graphics): void {
  const { width, height } = shadowSize;
  g.fillStyle(0xf4efe1, 1);
  g.fillCircle(-width * 0.12, -height * 0.22, 5);
  g.fillCircle(width * 0.12, -height * 0.22, 5);
  g.fillStyle(0x1b1b2a, 1);
  g.fillCircle(-width * 0.1, -height * 0.21, 2.4);
  g.fillCircle(width * 0.14, -height * 0.21, 2.4);
  g.fillStyle(0xf4efe1, 0.7);
  g.fillCircle(0, -height * 0.08, 2.2);
}

/** The big ear, cupped, on the side of `toward` (1 is right, -1 is left). */
function drawEar(g: Graphics, toward: number): void {
  const { width, height } = shadowSize;
  g.clear();
  g.fillStyle(body, 0.95);
  g.fillEllipse(toward * width * 0.42, -height * 0.24, width * 0.3, height * 0.3);
  g.fillStyle(rim, 1);
  g.fillEllipse(toward * width * 0.44, -height * 0.24, width * 0.14, height * 0.18);
}

export type ShadowWidget = { box: Phaser.GameObjects.Container; ear: Phaser.GameObjects.Graphics };

/** A shadow at (x, y) whose ear turns toward the wisp. */
export function createShadow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  toward: number,
): ShadowWidget {
  const shape = scene.add.graphics();
  drawBody(shape);
  drawFace(shape);
  const ear = scene.add.graphics();
  drawEar(ear, toward);
  const box = scene.add.container(x, y, [shape, ear]);
  scene.tweens.add({
    targets: box,
    angle: toward * 3,
    duration: 1600,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
  return { box, ear };
}

/** The ear twitches once after a secret is tapped. It carries no meaning; the message says what happened. */
export function twitch(scene: Phaser.Scene, shadow: ShadowWidget): void {
  scene.tweens.add({ targets: shadow.ear, scaleY: 1.25, duration: 140, yoyo: true });
}
