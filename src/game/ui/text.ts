import type Phaser from "phaser";

export const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: "ZenMaru",
  color: "#f4efe1",
  align: "center",
};

export const inkStyle = { ...textStyle, color: "#1b1b2a" };

export const goldStyle = { ...textStyle, color: "#ffd54a" };
