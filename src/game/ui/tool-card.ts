// One tool card: a panel, the tool's picture, its label and a "picked" mark. Tapping it calls `onTap`.
// It repeats the shape of `createCard` for a card whose art is a tool, instead of changing trial 1's card.

import type Phaser from "phaser";
import type { ToolId } from "../../domain/shed";
import { cardSize } from "../lane-layout";
import { toolCenter } from "../shed-layout";
import { drawCardFace, drawPickedMark } from "./art";
import type { CardWidget } from "./cards";
import { inkStyle } from "./text";
import { drawTool } from "./tools";

export function createToolCard(scene: Phaser.Scene, id: ToolId, onTap: () => void): CardWidget {
  const { width, height } = cardSize;
  const panel = scene.add.graphics();
  drawCardFace(panel, width, height);
  const art = scene.add.graphics({ x: 0, y: -14 });
  drawTool(art, id, 56);
  const label = scene.add.text(0, 30, "", { ...inkStyle, fontSize: "20px" }).setOrigin(0.5);
  const mark = scene.add.graphics().setVisible(false);
  drawPickedMark(mark, width, height);
  const { x, y } = toolCenter(id);
  const box = scene.add.container(x, y, [panel, art, label, mark]);
  box.setSize(width, height).setInteractive().on("pointerdown", onTap);
  return { box, label, mark };
}
