// One picture card: a panel, its art, its label and a "picked" mark. Tapping it calls `onTap`.

import type Phaser from "phaser";
import { isColor, type CardId } from "../../domain/lane";
import { cardCenter, cardSize } from "../lane-layout";
import { colorArt, thingArt } from "../lane-view";
import { drawPanel, drawPickedMark, drawSilhouette, drawSwatch, palette } from "./art";
import { inkStyle } from "./text";

export type CardWidget = {
  box: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  mark: Phaser.GameObjects.Graphics;
};

function drawCardArt(g: Phaser.GameObjects.Graphics, id: CardId): void {
  if (isColor(id)) return drawSwatch(g, colorArt(id));
  const art = thingArt(id);
  drawSilhouette(g, art.silhouette, 56, art.fill);
}

export function createCard(scene: Phaser.Scene, id: CardId, onTap: () => void): CardWidget {
  const { width, height } = cardSize;
  const panel = scene.add.graphics();
  drawPanel(panel, width, height, palette.white);
  const art = scene.add.graphics({ x: 0, y: -14 });
  drawCardArt(art, id);
  const label = scene.add.text(0, 30, "", { ...inkStyle, fontSize: "20px" }).setOrigin(0.5);
  const mark = scene.add.graphics().setVisible(false);
  drawPickedMark(mark, width, height);
  const { x, y } = cardCenter(id);
  const box = scene.add.container(x, y, [panel, art, label, mark]);
  box.setSize(width, height).setInteractive().on("pointerdown", onTap);
  return { box, label, mark };
}
