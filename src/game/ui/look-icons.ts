// The nine looks of a lantern's parts as small ink pictures for the cards, so a card is told by its outline without
// reading or color (hard rule 7): a ring, a bow and a bell (the handle); a pointy, a round and a flat roof; a candle,
// a star and a moon (the light). Each fits a square of about 28 pixels around (0, 0). Painting only (ADR 0003).

import Phaser from "phaser";
import type { LookId } from "../../domain/lantern";
import { starPoints } from "../pattern";
import { palette } from "./art";

type Graphics = Phaser.GameObjects.Graphics;
const ink = palette.ink;

const ring = (g: Graphics) => {
  g.lineStyle(5, ink, 1);
  g.strokeCircle(0, 0, 10);
};

const bow = (g: Graphics) => {
  g.fillStyle(ink, 1);
  g.fillTriangle(-3, 0, -14, -9, -14, 9);
  g.fillTriangle(3, 0, 14, -9, 14, 9);
  g.fillCircle(0, 0, 4);
};

const bell = (g: Graphics) => {
  g.fillStyle(ink, 1);
  g.fillCircle(0, -3, 9);
  g.fillRect(-9, -3, 18, 9);
  g.fillRect(-13, 5, 26, 4);
  g.fillCircle(0, 11, 3);
};

const pointy = (g: Graphics) => {
  g.fillStyle(ink, 1);
  g.fillTriangle(0, -13, -14, 9, 14, 9);
};

const round = (g: Graphics) => {
  g.fillStyle(ink, 1);
  g.slice(0, 8, 14, Math.PI, 2 * Math.PI, false);
  g.fillPath();
};

const flat = (g: Graphics) => {
  g.fillStyle(ink, 1);
  g.fillRect(-15, -2, 30, 9);
};

const candle = (g: Graphics) => {
  g.fillStyle(ink, 1);
  g.fillRect(-5, -2, 10, 15);
  g.fillTriangle(0, -14, -4, -5, 4, -5);
};

const star = (g: Graphics) => {
  g.fillStyle(ink, 1);
  g.fillPoints(
    starPoints(13).map((p) => new Phaser.Math.Vector2(p.x, p.y)),
    true,
  );
};

/** A crescent: an ink disc with a gold one over its upper right, the button's own face. */
const moon = (g: Graphics) => {
  g.fillStyle(ink, 1);
  g.fillCircle(0, 0, 12);
  g.fillStyle(palette.gold, 1);
  g.fillCircle(6, -4, 10);
};

export const lookIcons: Record<LookId, (g: Graphics) => void> = {
  ring,
  bow,
  bell,
  pointy,
  round,
  flat,
  candle,
  star,
  moon,
};
