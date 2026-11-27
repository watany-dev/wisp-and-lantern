// The row of the five steps at the top of trial 6: each cell has its word; the step the child is on has a solid gold
// frame, and a step done in this chain has a gold tick. The marks are shapes, not colors (REQ-9.3.3, hard rule 7).
// Painting only (ADR 0003).

import type Phaser from "phaser";
import { stepCell, stepRect, stepTick, stepWord } from "../crown-layout";
import type { CrownView } from "../crown-view";
import { drawPanel, palette } from "./art";
import { textStyle } from "./text";

type Cell = { frame: Phaser.GameObjects.Graphics; word: Phaser.GameObjects.Text };

export type StepsWidget = Cell[];

function createCell(scene: Phaser.Scene, index: number): Cell {
  const { x, y, width, height } = stepRect(index);
  drawPanel(scene.add.graphics({ x, y }), width, height, palette.lit, 0.85);
  const frame = scene.add.graphics({ x, y });
  const style = { ...textStyle, fontSize: `${stepWord.size}px`, strokeThickness: 3 };
  const word = scene.add.text(x + stepWord.x, y, "", style).setOrigin(0.5);
  return { frame, word };
}

export function createSteps(scene: Phaser.Scene): StepsWidget {
  return [0, 1, 2, 3, 4].map((i) => createCell(scene, i));
}

function drawTick(g: Phaser.GameObjects.Graphics): void {
  const x = stepTick.x;
  g.lineStyle(5, palette.gold, 1);
  g.lineBetween(x - 6, 0, x - 1, 5);
  g.lineBetween(x - 1, 5, x + 7, -6);
}

export function paintSteps(widget: StepsWidget, steps: CrownView["steps"]): void {
  steps.forEach(({ word, mark }, i) => {
    const cell = widget[i]!;
    cell.word.setText(word);
    cell.frame.clear();
    if (mark === "done") drawTick(cell.frame);
    if (mark !== "now") return;
    const { width, height } = stepCell;
    // Six pixels wide on the cell's edge, so the smoke reads it on the edge itself at any scale.
    cell.frame.lineStyle(6, palette.gold, 1);
    cell.frame.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
  });
}
