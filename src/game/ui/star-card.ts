// One star of the field: its slot, the star with its clue, the word under it, the tick, and the frame that
// marks the star in the lens. Tapping it calls `onTap`. Painting only (ADR 0003).

import type Phaser from "phaser";
import { starArt, starCenter, starLabel, starSlot } from "../field-layout";
import type { FieldView } from "../field-view";
import { drawPickedMark } from "./art";
import { drawClueStar, drawStarSlot } from "./field-art";
import { textStyle } from "./text";

export type StarWidget = {
  box: Phaser.GameObjects.Container;
  panel: Phaser.GameObjects.Graphics;
  art: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  mark: Phaser.GameObjects.Graphics;
  frame: Phaser.GameObjects.Graphics;
};

/** The stars pop in one after another. It carries no meaning, and the stars stay still afterwards. */
function popIn(scene: Phaser.Scene, art: Phaser.GameObjects.Graphics, index: number): void {
  art.setScale(0);
  scene.tweens.add({
    targets: art,
    scale: 1,
    duration: 320,
    delay: index * 90,
    ease: "Back.easeOut",
  });
}

/** The white frame of the star in the lens: a thick line round the slot, not a color on its own. */
function drawLookFrame(g: Phaser.GameObjects.Graphics): void {
  g.lineStyle(5, 0xffffff, 1);
  g.strokeRoundedRect(-starSlot / 2, -starSlot / 2, starSlot, starSlot, 14);
}

export function createStarCard(scene: Phaser.Scene, index: number, onTap: () => void): StarWidget {
  const panel = scene.add.graphics();
  const art = scene.add.graphics({ x: 0, y: starArt.y });
  popIn(scene, art, index);
  const style = { ...textStyle, fontSize: `${starLabel.size}px` };
  const label = scene.add.text(0, starLabel.y, "", style).setOrigin(0.5);
  const mark = scene.add.graphics().setVisible(false);
  drawPickedMark(mark, starSlot, starSlot);
  const frame = scene.add.graphics().setVisible(false);
  drawLookFrame(frame);
  const { x, y } = starCenter(index);
  const box = scene.add.container(x, y, [panel, art, label, mark, frame]);
  box.setSize(starSlot, starSlot).setInteractive().on("pointerdown", onTap);
  return { box, panel, art, label, mark, frame };
}

/** Draws the star as the view says: its slot, its clue, its word, the tick and the frame. */
export function paintStar(widget: StarWidget, star: FieldView["stars"][number]): void {
  widget.panel.clear();
  drawStarSlot(widget.panel, starSlot, star.mark === "fake");
  widget.art.clear();
  drawClueStar(widget.art, star.shine, starArt.radius);
  widget.label.setText(star.label);
  widget.mark.setVisible(star.ticked);
  widget.frame.setVisible(star.looking);
  widget.box.setAlpha(star.alpha);
}
