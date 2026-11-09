import type Phaser from "phaser";
import { pixelRatio } from "./pixel-ratio";

export const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: "ZenMaru",
  color: "#f4efe1",
  align: "center",
  // Drawn at the screen's pixel ratio, so letters stay sharp on a phone.
  resolution: pixelRatio,
  // A dark edge keeps the words readable over the scenery.
  stroke: "#0b0b14",
  strokeThickness: 4,
};

export const inkStyle = { ...textStyle, color: "#1b1b2a", stroke: undefined, strokeThickness: 0 };

export const goldStyle = { ...textStyle, color: "#ffd54a" };
