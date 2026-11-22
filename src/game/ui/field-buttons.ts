// The buttons of the field and of the shadows: one wide button or two side by side, each with an optional
// picture (a tick or a ring of dots for a verdict, an arrow or a padlock for a decision, so it is told without
// reading or color) and a label. There is one widget per slot; a
// slot with no button in the view is hidden, and a hidden widget takes no taps. Painting only (ADR 0003).

import type Phaser from "phaser";
import { buttonRects, type ButtonSlot } from "../field-layout";
import { pressable, setChanged } from "../button-lock";
import type { ButtonIcon, ButtonView } from "../button-view";
import { dotAngles } from "../field-look";
import { drawButton, palette } from "./art";
import { inkStyle } from "./text";

type ButtonWidget = {
  box: Phaser.GameObjects.Container;
  picture: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  /** What a tap does now: set by the view, so the same widget serves every stage. */
  press: ButtonView["event"] | null;
};

/** The widgets, and when the set on screen appeared (`shownAt`, game time) with the ids it holds. */
export type ButtonsWidget = {
  slots: Record<ButtonSlot, ButtonWidget>;
  shown: { at: number; ids: readonly string[] };
};

const slots: readonly ButtonSlot[] = ["single", "left", "right"];

type Graphics = Phaser.GameObjects.Graphics;

const tick = (g: Graphics) => {
  g.lineStyle(6, palette.ink, 1);
  g.lineBetween(-11, 0, -3, 8);
  g.lineBetween(-3, 8, 12, -10);
};

/** Twelve dots, like the fake star's rim. */
const dots = (g: Graphics) => {
  g.fillStyle(palette.ink, 1);
  for (const a of dotAngles) g.fillCircle(12 * Math.cos(a), 12 * Math.sin(a), 2.6);
};

/** An arrow to the right: the thing goes to the wisp. */
const arrow = (g: Graphics) => {
  g.lineStyle(6, palette.ink, 1);
  g.lineBetween(-12, 0, 11, 0);
  g.lineBetween(2, -9, 12, 0);
  g.lineBetween(2, 9, 12, 0);
};

/** A padlock: a round shackle over a body. */
const lock = (g: Graphics) => {
  g.lineStyle(5, palette.ink, 1);
  g.beginPath();
  g.arc(0, -4, 7, Math.PI, 2 * Math.PI);
  g.strokePath();
  g.fillStyle(palette.ink, 1);
  g.fillRoundedRect(-11, -4, 22, 17, 4);
};

const icons: Record<Exclude<ButtonIcon, "none">, (g: Graphics) => void> = {
  tick,
  dots,
  arrow,
  lock,
};

function drawIcon(g: Graphics, icon: ButtonIcon): void {
  g.clear();
  if (icon !== "none") icons[icon](g);
}

function createButton(
  scene: Phaser.Scene,
  slot: ButtonSlot,
  onTap: (widget: ButtonWidget) => void,
): ButtonWidget {
  const { x, y, width, height } = buttonRects[slot];
  const panel = scene.add.graphics();
  drawButton(panel, width, height);
  const picture = scene.add.graphics({ x: -width / 2 + 30, y: 0 });
  const label = scene.add.text(0, 0, "", { ...inkStyle, fontSize: "22px" }).setOrigin(0.5);
  const box = scene.add.container(x, y, [panel, picture, label]).setSize(width, height);
  const widget: ButtonWidget = { box, picture, label, press: null };
  box.setInteractive().on("pointerdown", () => onTap(widget));
  box.setVisible(false);
  return widget;
}

export function createButtons(
  scene: Phaser.Scene,
  dispatch: (event: NonNullable<ButtonWidget["press"]>) => void,
): ButtonsWidget {
  const shown = { at: 0, ids: [] as readonly string[] };
  const tap = (w: ButtonWidget) => {
    if (w.press && pressable(scene.game.getTime(), shown.at)) dispatch(w.press);
  };
  const [single, left, right] = slots.map((slot) => createButton(scene, slot, tap));
  return { slots: { single: single!, left: left!, right: right! }, shown };
}

/** A slot with a button in the view shows it; a slot without one is hidden and takes no taps. */
function paintButton(w: ButtonWidget, view: ButtonView | undefined): void {
  w.press = view?.event ?? null;
  w.box.setVisible(view !== undefined);
  if (!view) return;
  drawIcon(w.picture, view.icon);
  w.label.setText(view.text).setX(view.icon === "none" ? 0 : 22);
}

export function paintButtons(widget: ButtonsWidget, buttons: ButtonView[], now: number): void {
  const ids = buttons.map((b) => b.id);
  if (setChanged(widget.shown.ids, ids))
    widget.shown = Object.assign(widget.shown, { at: now, ids });
  for (const slot of slots)
    paintButton(
      widget.slots[slot],
      buttons.find((b) => b.slot === slot),
    );
}
