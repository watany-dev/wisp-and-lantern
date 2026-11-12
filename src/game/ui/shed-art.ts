// The shed picture: roof, wall, window and door, the round's obstacle (a lock, a pile of leaves, boards,
// a rope, or the cat up on the roof), and the cat, drawn at the center of `shedBox` in the local
// coordinates of `shedParts`. It is redrawn from the view's `picture`, so the obstacle, the door and the
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

const parts = shedParts;
const { wall, door, window: win, lock } = parts;

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

/** Whether the cat is in the shed, seen at the window: not in the roof puzzle, and not once it is free. */
const catInside = (picture: Picture) => picture.puzzle !== "roof" && !picture.solved;

/** The door swings open for every puzzle but the roof, where the door was never the problem. */
const doorOpens = (picture: Picture) => picture.puzzle !== "roof" && picture.solved;

/** The window: a frame, dark glass, and the cat's face in it while the cat is inside. */
function drawWindow(g: Graphics, picture: Picture): void {
  g.fillStyle(shedLook.frame, 1);
  g.fillRect(win.x - win.width / 2 - 4, win.y - win.height / 2 - 4, win.width + 8, win.height + 8);
  g.fillStyle(shedColors.windowGlass, 1);
  g.fillRect(win.x - win.width / 2, win.y - win.height / 2, win.width, win.height);
  if (!catInside(picture)) return;
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

function drawShutDoor(g: Graphics, locked: boolean): void {
  const left = door.x - door.width / 2;
  const top = door.y - door.height / 2;
  g.fillStyle(shade(shedColors.door, 0.7), 1);
  g.fillRect(left - 3, top - 3, door.width + 6, door.height + 3);
  g.fillStyle(shedColors.door, 1);
  g.fillRect(left, top, door.width, door.height);
  g.lineStyle(2, shedLook.doorLine, 1);
  g.lineBetween(left + 23, top, left + 23, top + door.height);
  g.lineBetween(left + 47, top, left + 47, top + door.height);
  if (locked) drawLock(g, false);
}

/** The open door: a dark doorway, and the door swung out to the left on its hinge. */
function drawOpenDoor(g: Graphics, locked: boolean): void {
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
  if (locked) drawLock(g, true);
}

/** A heap of autumn leaves against the foot of the door: overlapping ovals in four colors. */
function drawLeaves(g: Graphics): void {
  const { x, y, width, height } = parts.leaves;
  const colors = [shedLook.leafRed, shedLook.leafOrange, shedLook.leafGold, shedLook.leafBrown];
  for (let i = 0; i < 12; i += 1) {
    const across = (i % 6) / 5 - 0.5;
    const up = Math.floor(i / 6) * 0.5;
    const leafX = x + across * (width - 22) * (1 - up * 0.5);
    const leafY = y + height / 2 - 8 - up * height * 0.55;
    g.fillStyle(colors[i % colors.length]!, 1);
    g.fillEllipse(leafX, leafY, 26, 15);
    g.lineStyle(1.5, shedLook.leafBrown, 1);
    g.lineBetween(leafX - 9, leafY, leafX + 9, leafY);
  }
}

/** Two planks nailed across the door, each with a nail at both ends. */
function drawBoards(g: Graphics): void {
  for (const { x, y, width, height } of parts.planks) {
    g.fillStyle(shedLook.plankEdge, 1);
    g.fillRect(x - width / 2 - 2, y - height / 2 - 2, width + 4, height + 4);
    g.fillStyle(shedLook.plank, 1);
    g.fillRect(x - width / 2, y - height / 2, width, height);
    g.fillStyle(shedLook.nail, 1);
    g.fillCircle(x - width / 2 + 7, y, 3);
    g.fillCircle(x + width / 2 - 7, y, 3);
  }
}

/** A rope wound three times round the door, with a knot and two loose ends. */
function drawRope(g: Graphics): void {
  const { x, width, bands, knot } = parts.rope;
  for (const [w, color] of [
    [10, shedLook.ropeDark],
    [7, shedLook.rope],
  ] as const) {
    g.lineStyle(w, color, 1);
    for (const y of bands) g.lineBetween(x - width / 2, y, x + width / 2, y);
    g.lineBetween(knot.x, knot.y, knot.x - 8, knot.y + 22);
    g.lineBetween(knot.x, knot.y, knot.x + 9, knot.y + 20);
  }
  g.fillStyle(shedLook.ropeDark, 1);
  g.fillCircle(knot.x, knot.y, knot.radius + 2);
  g.fillStyle(shedLook.rope, 1);
  g.fillCircle(knot.x, knot.y, knot.radius);
}

/** The cat up on the left slope of the roof. */
function drawCatOnRoof(g: Graphics): void {
  g.save();
  g.translateCanvas(parts.catRoof.x, parts.catRoof.y);
  drawCatSitting(g, 36);
  g.restore();
}

/** What is in the way in each puzzle while the cat is stuck. A lock is part of the door, not listed here. */
const obstacles: Partial<Record<Picture["puzzle"], (g: Graphics) => void>> = {
  leaves: drawLeaves,
  boards: drawBoards,
  rope: drawRope,
  roof: drawCatOnRoof,
};

function drawObstacle(g: Graphics, picture: Picture): void {
  if (!picture.solved) obstacles[picture.puzzle]?.(g);
}

/** Draws the whole picture for `picture`. `g` sits at the center of the shed's box. */
export function drawShed(g: Graphics, picture: Picture): void {
  drawGround(g);
  drawWall(g);
  drawRoof(g);
  drawWindow(g, picture);
  const locked = picture.puzzle === "lock";
  if (doorOpens(picture)) drawOpenDoor(g, locked);
  else drawShutDoor(g, locked);
  drawObstacle(g, picture);
  if (!picture.solved) return;
  g.save();
  g.translateCanvas(parts.catOutside.x, parts.catOutside.y);
  drawCatSitting(g, 36);
  g.restore();
}

/** The star of the open result, at its place in the picture. */
export function drawShedStar(g: Graphics): void {
  drawStar(g, shedParts.star.radius);
}
