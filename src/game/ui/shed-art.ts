// The shed picture: roof, wall, window, door and lock, drawn at the center of `shedBox` in the local
// coordinates of `shedParts`. It is redrawn from the view's `picture`, so the door, the lock and the
// cat can only agree with the result. Painting only; no logic (ADR 0003).

import type Phaser from "phaser";
import type { ShedView } from "../shed-view";
import { shedParts } from "../shed-layout";
import { shedColors, shedLook } from "../shed-palette";
import { drawStar } from "./art";
import { drawCatFace, drawCatSitting } from "./cat";
import { shade } from "./shade";

type Graphics = Phaser.GameObjects.Graphics;
type Picture = ShedView["picture"];

const { wall, door, window: win, lock } = shedParts;

function drawGround(g: Graphics): void {
  g.fillStyle(shedLook.ground, 1);
  g.fillRoundedRect(-150, 88, 300, 12, 6);
}

function drawWall(g: Graphics): void {
  const left = wall.x - wall.width / 2;
  const top = wall.y - wall.height / 2;
  g.fillStyle(shedLook.wall, 1);
  g.fillRect(left, top, wall.width, wall.height);
  g.lineStyle(2, shedLook.wallLine, 1);
  for (let x = left + 22; x < left + wall.width; x += 22)
    g.lineBetween(x, top, x, top + wall.height);
}

function drawRoof(g: Graphics): void {
  const [a, b, c] = shedParts.roof;
  g.fillStyle(shedLook.roofEdge, 1);
  g.fillTriangle(a.x - 6, a.y + 6, b.x, b.y - 6, c.x + 6, c.y + 6);
  g.fillStyle(shedLook.roof, 1);
  g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
}

/** The window: a frame, dark glass, and the cat's face in it until the door is open. */
function drawWindow(g: Graphics, picture: Picture): void {
  g.fillStyle(shedLook.frame, 1);
  g.fillRect(win.x - win.width / 2 - 4, win.y - win.height / 2 - 4, win.width + 8, win.height + 8);
  g.fillStyle(shedColors.windowGlass, 1);
  g.fillRect(win.x - win.width / 2, win.y - win.height / 2, win.width, win.height);
  if (picture.cat !== "inside") return;
  g.save();
  g.translateCanvas(win.x, win.y + 4);
  drawCatFace(g, 14);
  g.restore();
}

/** A padlock at the door's edge: a closed shackle when locked, a lifted and open one when not. */
function drawLock(g: Graphics, open: boolean): void {
  g.lineStyle(4, shedLook.lock, 1);
  g.beginPath();
  if (open) g.arc(lock.x + 5, lock.y - 13, 7, Math.PI * 1.05, Math.PI * 1.9);
  else g.arc(lock.x, lock.y - 6, 7, Math.PI, 0);
  g.strokePath();
  g.fillStyle(shedLook.lockDark, 1);
  g.fillRoundedRect(lock.x - 9, lock.y - 6, 18, 16, 3);
  g.fillStyle(shedLook.lock, 1);
  g.fillRoundedRect(lock.x - 7, lock.y - 4, 14, 12, 2);
}

function drawShutDoor(g: Graphics): void {
  const left = door.x - door.width / 2;
  const top = door.y - door.height / 2;
  g.fillStyle(shade(shedColors.door, 0.7), 1);
  g.fillRect(left - 3, top - 3, door.width + 6, door.height + 3);
  g.fillStyle(shedColors.door, 1);
  g.fillRect(left, top, door.width, door.height);
  g.lineStyle(2, shedLook.doorLine, 1);
  g.lineBetween(left + 23, top, left + 23, top + door.height);
  g.lineBetween(left + 47, top, left + 47, top + door.height);
  drawLock(g, false);
}

/** The open door: a dark doorway, and the door swung out to the left on its hinge. */
function drawOpenDoor(g: Graphics): void {
  const left = door.x - door.width / 2;
  const top = door.y - door.height / 2;
  g.fillStyle(shade(shedColors.door, 0.7), 1);
  g.fillRect(left - 3, top - 3, door.width + 6, door.height + 3);
  g.fillStyle(shedColors.doorway, 1);
  g.fillRect(left, top, door.width, door.height);
  g.fillStyle(shedColors.door, 1);
  const hinge = { x: left, y: top };
  const out = { x: left - 28, y: top + 8 };
  g.fillTriangle(hinge.x, hinge.y, hinge.x, hinge.y + door.height, out.x, out.y + door.height);
  g.fillTriangle(hinge.x, hinge.y, out.x, out.y, out.x, out.y + door.height);
  drawLock(g, true);
}

/** Draws the whole picture for `picture`. `g` sits at the center of the shed's box. */
export function drawShed(g: Graphics, picture: Picture): void {
  drawGround(g);
  drawWall(g);
  drawRoof(g);
  drawWindow(g, picture);
  if (picture.door === "open") drawOpenDoor(g);
  else drawShutDoor(g);
  if (picture.cat !== "outside") return;
  g.save();
  g.translateCanvas(shedParts.catOutside.x, shedParts.catOutside.y);
  drawCatSitting(g, 36);
  g.restore();
}

/** The star of the open result, at its place in the picture. */
export function drawShedStar(g: Graphics): void {
  drawStar(g, shedParts.star.radius);
}
