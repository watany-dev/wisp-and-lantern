// The three parts of a lantern in their nine looks, each drawn around (0, 0) inside its 160 x 80 row
// (`partSize` in `lantern-layout.ts`): the handle (a ring, a bow, a bell) sits low in its row, on top of the roof;
// the roof (pointy, round, flat) rests on the glass; the light is the glass with a candle, a star or a moon inside,
// dim until the lantern is lit. The looks differ by outline, not by color (hard rule 7). Every picture stays more
// than 12 pixels below the top of its row, where the frame of dots runs. Painting only; no logic (ADR 0003).

import Phaser from "phaser";
import type { LookId } from "../../domain/lantern";
import { glass } from "../lantern-layout";
import { starPoints } from "../pattern";
import { palette } from "./art";
import { shade } from "./shade";

type Graphics = Phaser.GameObjects.Graphics;

const brass = 0xe5b93c;
const roofColor = 0x8f6ad8;
const frameColor = 0x6b6b8f;
const bowColor = 0xff7aa8;
const wax = 0xf4efe1;
const flame = 0xffb347;

/** The stem from the handle down to the roof, so the handle hangs on the lantern. */
function stem(g: Graphics): void {
  g.lineStyle(5, frameColor, 1);
  g.lineBetween(0, 16, 0, 40);
}

function ring(g: Graphics): void {
  stem(g);
  g.lineStyle(9, shade(brass, 0.7), 1);
  g.strokeCircle(0, 0, 16);
  g.lineStyle(5, brass, 1);
  g.strokeCircle(0, 0, 16);
}

function bow(g: Graphics): void {
  stem(g);
  g.fillStyle(shade(bowColor, 0.75), 1);
  g.fillTriangle(-4, 2, -34, -16, -30, 20);
  g.fillTriangle(4, 2, 34, -16, 30, 20);
  g.fillStyle(bowColor, 1);
  g.fillTriangle(-4, 2, -28, -10, -26, 14);
  g.fillTriangle(4, 2, 28, -10, 26, 14);
  g.fillCircle(0, 2, 8);
}

function bell(g: Graphics): void {
  stem(g);
  g.fillStyle(shade(brass, 0.7), 1);
  g.fillRoundedRect(-24, 6, 48, 10, 4);
  g.fillStyle(brass, 1);
  g.fillCircle(0, -4, 17);
  g.fillRect(-17, -4, 34, 14);
  g.fillCircle(0, 22, 6);
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(-7, -10, 7, 12);
}

function pointy(g: Graphics): void {
  g.fillStyle(shade(roofColor, 0.7), 1);
  g.fillTriangle(0, -24, -66, 38, 66, 38);
  g.fillStyle(roofColor, 1);
  g.fillTriangle(0, -16, -56, 34, 56, 34);
}

function round(g: Graphics): void {
  g.fillStyle(shade(roofColor, 0.7), 1);
  g.slice(0, 38, 64, Math.PI, 2 * Math.PI, false);
  g.fillPath();
  g.fillStyle(roofColor, 1);
  g.slice(0, 38, 56, Math.PI, 2 * Math.PI, false);
  g.fillPath();
}

function flat(g: Graphics): void {
  g.fillStyle(shade(roofColor, 0.7), 1);
  g.fillRoundedRect(-68, 14, 136, 24, 6);
  g.fillStyle(roofColor, 1);
  g.fillRoundedRect(-62, 18, 124, 16, 5);
  g.fillStyle(shade(roofColor, 0.7), 1);
  g.fillRect(-36, 6, 72, 10);
}

function candle(g: Graphics, alpha: number): void {
  g.fillStyle(wax, alpha);
  g.fillRoundedRect(-8, -6, 16, 28, 3);
  g.fillStyle(flame, alpha);
  g.fillEllipse(0, -14, 12, 18);
}

function star(g: Graphics, alpha: number): void {
  g.fillStyle(palette.gold, alpha);
  g.fillPoints(
    starPoints(20).map((p) => new Phaser.Math.Vector2(p.x, p.y + 2)),
    true,
  );
}

/** A crescent: a pale disc with a disc of the glass's own color over its upper right. */
function moon(g: Graphics, alpha: number, glassColor: number): void {
  g.fillStyle(wax, alpha);
  g.fillCircle(0, 0, 19);
  g.fillStyle(glassColor, 1);
  g.fillCircle(9, -6, 16);
}

const dimGlass = 0x35355a;
const litGlass = 0xffe9a0;

/** The glass with its top and bottom bars; bright with a glow when lit. */
function drawGlass(g: Graphics, lit: boolean): number {
  const { width, height } = glass;
  if (lit) {
    for (const [grow, alpha] of [
      [22, 0.1],
      [12, 0.18],
    ] as const) {
      g.fillStyle(palette.gold, alpha);
      g.fillRoundedRect(
        -width / 2 - grow,
        -height / 2 - grow,
        width + 2 * grow,
        height + 2 * grow,
        18,
      );
    }
  }
  const fill = lit ? litGlass : dimGlass;
  g.fillStyle(fill, 1);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
  g.fillStyle(frameColor, 1);
  g.fillRect(-width / 2 - 6, -height / 2 - 2, width + 12, 6);
  g.fillRect(-width / 2 - 6, height / 2 - 4, width + 12, 6);
  return fill;
}

function light(look: "candle" | "star" | "moon") {
  return (g: Graphics, lit: boolean) => {
    const fill = drawGlass(g, lit);
    const alpha = lit ? 1 : 0.55;
    if (look === "candle") candle(g, alpha);
    else if (look === "star") star(g, alpha);
    else moon(g, alpha, fill);
  };
}

const pictures: Record<LookId, (g: Graphics, lit: boolean) => void> = {
  ring,
  bow,
  bell,
  pointy,
  round,
  flat,
  candle: light("candle"),
  star: light("star"),
  moon: light("moon"),
};

/** Draws a part in its look. Only the light knows `lit`; the handle and the roof look the same either way. */
export function drawPart(g: Graphics, look: LookId, lit: boolean): void {
  g.clear();
  pictures[look](g, lit);
}
