// Short celebrations for a find: a burst of gold sparks and a ring that opens and fades. Every effect
// destroys itself. Nothing flashes: the ring lasts over half a second, the sparks about a second.

import Phaser from "phaser";
import { pixelRatio } from "../ui/pixel-ratio";

const sparkKey = "spark";
const gold = 0xffd54a;

/** A small round spark texture, drawn at the screen's pixel ratio so it stays sharp. */
function ensureSparkTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(sparkKey)) return;
  const size = 16 * pixelRatio;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xfff3b0, 0.4).fillCircle(size / 2, size / 2, size / 2);
  g.fillStyle(0xffffff, 1).fillCircle(size / 2, size / 2, size / 4);
  g.generateTexture(sparkKey, size, size);
  g.destroy();
}

/** Gold sparks fly out of (x, y) and fall a little. */
export function burst(scene: Phaser.Scene, x: number, y: number): void {
  ensureSparkTexture(scene);
  const emitter = scene.add.particles(x, y, sparkKey, {
    speed: { min: 90, max: 240 },
    lifespan: 900,
    scale: { start: 0.9 / pixelRatio, end: 0 },
    alpha: { start: 1, end: 0 },
    gravityY: 220,
    tint: [gold, 0xffa940, 0xfff0a0],
    emitting: false,
  });
  emitter.setDepth(8).explode(24);
  scene.time.delayedCall(1100, () => emitter.destroy());
}

/** A gold ring grows from (x, y) and fades. */
export function ripple(scene: Phaser.Scene, x: number, y: number): void {
  const ring = scene.add.circle(x, y, 30).setStrokeStyle(4, gold, 1).setDepth(7);
  scene.tweens.add({
    targets: ring,
    scale: 2.2,
    alpha: 0,
    duration: 650,
    ease: "Cubic.easeOut",
    onComplete: () => ring.destroy(),
  });
}
