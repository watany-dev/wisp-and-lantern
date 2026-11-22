// One thing of the bag: a card with the thing's picture and its name, the frame and tick once it is handed over,
// and the padlock badge once a round is done and it is a secret that stayed with the child. Tapping it calls
// `onTap`. Painting only (ADR 0003).

import type Phaser from "phaser";
import type { ItemId } from "../../domain/bag";
import { itemArt, itemCard, itemCenter, itemLabel, lockBadge } from "../bag-layout";
import type { BagView } from "../bag-view";
import { drawCardFace, drawPickedMark } from "./art";
import { drawItem, drawPadlock } from "./bag-items";
import { inkStyle } from "./text";

export type ItemWidget = {
  box: Phaser.GameObjects.Container;
  art: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  tick: Phaser.GameObjects.Graphics;
  lock: Phaser.GameObjects.Graphics;
  /** The thing drawn now, so the picture is drawn again only when the round brings another thing. */
  drawn: ItemId | null;
};

export function createItemCard(scene: Phaser.Scene, index: number, onTap: () => void): ItemWidget {
  const { width, height } = itemCard;
  const panel = scene.add.graphics();
  drawCardFace(panel, width, height);
  const art = scene.add.graphics({ x: 0, y: itemArt.y });
  const style = { ...inkStyle, fontSize: `${itemLabel.size}px` };
  const label = scene.add.text(0, itemLabel.y, "", style).setOrigin(0.5);
  const tick = scene.add.graphics().setVisible(false);
  drawPickedMark(tick, width, height);
  const lock = scene.add.graphics().setVisible(false);
  drawPadlock(lock, lockBadge.x, lockBadge.y, lockBadge.radius);
  const { x, y } = itemCenter(index);
  const box = scene.add.container(x, y, [panel, art, label, tick, lock]);
  box.setSize(width, height).setInteractive().on("pointerdown", onTap);
  return { box, art, label, tick, lock, drawn: null };
}

/** Draws the thing as the view says: its picture, its name, the tick and the padlock. */
export function paintItem(widget: ItemWidget, item: BagView["items"][number]): void {
  if (widget.drawn !== item.item) {
    widget.art.clear();
    drawItem(widget.art, item.item, itemArt.size);
    widget.drawn = item.item;
  }
  widget.label.setText(item.label);
  widget.tick.setVisible(item.given);
  widget.lock.setVisible(item.kept);
}
