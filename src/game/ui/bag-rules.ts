// The rule card: the three secrets as pictures, each with a padlock, while a round is played, so a child who
// cannot read yet sees which things stay with them (REQ-7.4.6). Once a round is done the same place holds the
// closing line, with a gold edge. One place on the screen, below the message. Painting only (ADR 0003).

import type Phaser from "phaser";
import { secretItems } from "../../domain/bag";
import { bagLesson, ruleLock, rulePictures, rulesRect } from "../bag-layout";
import type { BagView } from "../bag-view";
import { drawPanel, palette } from "./art";
import { drawItem, drawPadlock } from "./bag-items";
import { textStyle } from "./text";

export type RulesWidget = {
  panel: Phaser.GameObjects.Graphics;
  pictures: Phaser.GameObjects.Graphics;
  lesson: Phaser.GameObjects.Text;
};

/** The three secrets in a row, each with its padlock at the lower right. */
function drawRulePictures(g: Phaser.GameObjects.Graphics): void {
  secretItems.forEach((item, i) => {
    const x = rulePictures.xs[i]! - rulesRect.x;
    g.save();
    g.translateCanvas(x, 0);
    drawItem(g, item, rulePictures.size);
    g.restore();
    drawPadlock(g, x + ruleLock.x, ruleLock.y, ruleLock.radius);
  });
}

export function createRules(scene: Phaser.Scene): RulesWidget {
  const { x, y } = rulesRect;
  const panel = scene.add.graphics({ x, y });
  const pictures = scene.add.graphics({ x, y });
  drawRulePictures(pictures);
  const style = { ...textStyle, fontSize: "22px", wordWrap: { width: bagLesson.wrap } };
  const lesson = scene.add.text(bagLesson.x, bagLesson.y, "", style).setOrigin(0.5);
  return { panel, pictures, lesson };
}

/** The lit panel, with a gold edge once the closing line is in it. */
export function paintRules(widget: RulesWidget, view: BagView): void {
  const { width, height } = rulesRect;
  widget.panel.clear();
  drawPanel(widget.panel, width, height, palette.lit, 0.85);
  if (view.lesson) {
    widget.panel.lineStyle(3, palette.gold, 1);
    widget.panel.strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
  }
  widget.pictures.setVisible(view.rules !== null);
  widget.lesson.setText(view.lesson ?? "");
}
