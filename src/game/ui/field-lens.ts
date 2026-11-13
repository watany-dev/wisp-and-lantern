// The lens: the star being looked at, drawn larger with the same clue, and once a round is kept the
// closing line. One place on the screen, below the stars and above the buttons. Painting only (ADR 0003).

import type Phaser from "phaser";
import { lensRect, lensStar, lessonText } from "../field-layout";
import type { FieldView } from "../field-view";
import { drawPanel, palette } from "./art";
import { drawClueStar } from "./field-art";
import { textStyle } from "./text";

export type LensWidget = {
  panel: Phaser.GameObjects.Graphics;
  art: Phaser.GameObjects.Graphics;
  lesson: Phaser.GameObjects.Text;
};

export function createLens(scene: Phaser.Scene): LensWidget {
  const { x, y } = lensRect;
  const panel = scene.add.graphics({ x, y });
  const art = scene.add.graphics({ x, y });
  const style = { ...textStyle, fontSize: "22px", wordWrap: { width: lessonText.wrap } };
  const lesson = scene.add.text(lessonText.x, lessonText.y, "", style).setOrigin(0.5);
  return { panel, art, lesson };
}

/** The panel is lit with a gold edge with the closing line, a plain lit panel with a faint ring when empty. */
function drawLensPanel(g: Phaser.GameObjects.Graphics, view: FieldView): void {
  const { width, height } = lensRect;
  g.clear();
  drawPanel(g, width, height, palette.lit);
  if (view.lesson) {
    g.lineStyle(3, palette.gold, 1).strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
  } else if (!view.lens) {
    // Nothing in the lens yet: a faint empty ring, so the place does not look broken.
    g.lineStyle(2, 0x3a3a5c, 1).strokeCircle(0, 0, lensStar.radius * 1.1);
  }
}

export function paintLens(widget: LensWidget, view: FieldView): void {
  drawLensPanel(widget.panel, view);
  widget.art.clear();
  if (view.lens)
    drawClueStar(widget.art, view.lens.shine, lensStar.radius, lensRect.height / 2 - 2);
  widget.lesson.setText(view.lesson ?? "");
}
