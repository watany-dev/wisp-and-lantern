// The tile that holds the item in front of the wisp: a lit panel, the item's picture, its name, the tick badge
// (with its gold frame) and the padlock badge. It is not a tap target. Painting only (ADR 0003).

import type Phaser from "phaser";
import type { ShadowsView } from "../shadows-view";
import { itemArt, itemLabel, itemTile } from "../shadows-layout";
import { drawLitSlot, drawPickedMark } from "./art";
import { drawItemArt } from "./item-art";
import { drawLockBadge } from "./shadow-art";
import { textStyle } from "./text";

export type TileWidget = {
  box: Phaser.GameObjects.Container;
  art: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  tick: Phaser.GameObjects.Graphics;
  lock: Phaser.GameObjects.Graphics;
};

export function createTile(scene: Phaser.Scene): TileWidget {
  const { x, y, width, height } = itemTile;
  const panel = scene.add.graphics();
  drawLitSlot(panel, width);
  const art = scene.add.graphics({ x: 0, y: itemArt.y });
  const style = { ...textStyle, fontSize: `${itemLabel.size}px` };
  const label = scene.add.text(0, itemLabel.y, "", style).setOrigin(0.5);
  const tick = scene.add.graphics().setVisible(false);
  drawPickedMark(tick, width, height);
  const lock = scene.add.graphics().setVisible(false);
  drawLockBadge(lock);
  const box = scene.add.container(x, y, [panel, art, label, tick, lock]);
  return { box, art, label, tick, lock };
}

/** Draws the item as the view says: its picture and name, how faded it is, and its two badges. */
export function paintTile(widget: TileWidget, item: ShadowsView["item"]): void {
  widget.art.clear();
  drawItemArt(widget.art, item.id, itemArt.size);
  widget.label.setText(item.label);
  widget.tick.setVisible(item.ticked);
  widget.lock.setVisible(item.locked);
  widget.art.setAlpha(item.alpha);
}
