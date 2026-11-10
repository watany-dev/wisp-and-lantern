import type Phaser from "phaser";
import { pixelRatio } from "./pixel-ratio";

const baseStyle = {
  fontFamily: "ZenMaru",
  color: "#f4efe1",
  align: "center",
  // Drawn at the screen's pixel ratio, so letters stay sharp on a phone.
  resolution: pixelRatio,
} satisfies Phaser.Types.GameObjects.Text.TextStyle;

export const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  ...baseStyle,
  // A dark edge keeps the words readable over the scenery.
  stroke: "#0b0b14",
  strokeThickness: 4,
};

// No `stroke` key at all: with a zero thickness there is no edge to colour.
export const inkStyle = { ...baseStyle, color: "#1b1b2a", strokeThickness: 0 };

export const goldStyle = { ...textStyle, color: "#ffd54a" };
