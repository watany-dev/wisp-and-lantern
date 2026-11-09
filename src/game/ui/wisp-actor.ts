// The wisp and the hero as scene objects: a drawing that floats gently inside a container the scene
// moves. The float is a tween on the drawing, so moving the container never fights it.

import type Phaser from "phaser";
import { drawHero, drawWisp } from "./characters";

type Container = Phaser.GameObjects.Container;

function float(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, by: number): void {
  scene.tweens.add({
    targets: target,
    y: by,
    duration: 1100,
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  });
}

/** The wisp's drawing, floating up and down about 4 pixels. Add it to a container. */
export function createWispArt(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const art = scene.add.graphics();
  drawWisp(art);
  float(scene, art, 4);
  return art;
}

/** The hero, as a container the scene can place; the drawing inside bobs slightly. */
export function createHero(scene: Phaser.Scene): Container {
  const art = scene.add.graphics();
  drawHero(art);
  scene.tweens.add({ targets: art, y: -2, duration: 700, yoyo: true, repeat: -1 });
  return scene.add.container(0, 0, [art]);
}
