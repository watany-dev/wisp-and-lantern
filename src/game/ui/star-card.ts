// One star of the field: its slot, the star, the word under it and the tick. Tapping it calls `onTap`.
// It repeats the shape of `createToolCard` for a slot whose art is a star. Painting only (ADR 0003).

import type Phaser from "phaser";
import { starArt, starCenter, starLabel, starSlot } from "../field-layout";
import type { FieldView } from "../field-view";
import { drawPickedMark } from "./art";
import { drawStarPicture, drawStarSlot } from "./field-art";
import { textStyle } from "./text";

export type StarWidget = {
  box: Phaser.GameObjects.Container;
  panel: Phaser.GameObjects.Graphics;
  art: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  mark: Phaser.GameObjects.Graphics;
};

/** The stars pop in one after another and then bob a little. Neither carries any meaning. */
function animate(scene: Phaser.Scene, art: Phaser.GameObjects.Graphics, index: number): void {
  art.setScale(0);
  scene.tweens.add({
    targets: art,
    scale: 1,
    duration: 320,
    delay: index * 90,
    ease: "Back.easeOut",
  });
  const bob = { y: starArt.y + 3, duration: 1300 + index * 120, yoyo: true, repeat: -1 };
  scene.tweens.add({ targets: art, ease: "Sine.easeInOut", ...bob });
}

export function createStarCard(scene: Phaser.Scene, index: number, onTap: () => void): StarWidget {
  const panel = scene.add.graphics();
  const art = scene.add.graphics({ x: 0, y: starArt.y });
  animate(scene, art, index);
  const style = { ...textStyle, fontSize: `${starLabel.size}px` };
  const label = scene.add.text(0, starLabel.y, "", style).setOrigin(0.5);
  const mark = scene.add.graphics().setVisible(false);
  drawPickedMark(mark, starSlot, starSlot);
  const { x, y } = starCenter(index);
  const box = scene.add.container(x, y, [panel, art, label, mark]);
  box.setSize(starSlot, starSlot).setInteractive().on("pointerdown", onTap);
  return { box, panel, art, label, mark };
}

/** Draws the star as the view says: its slot and shape, its word, the tick, and how faded it is. */
export function paintStar(widget: StarWidget, star: FieldView["stars"][number]): void {
  widget.panel.clear();
  drawStarSlot(widget.panel, star.picture);
  widget.art.clear();
  drawStarPicture(widget.art, star.picture);
  widget.label.setText(star.label);
  widget.mark.setVisible(star.ticked);
  widget.box.setAlpha(star.alpha);
}
