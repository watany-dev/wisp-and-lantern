// The three tools of the shed, drawn with Graphics inside a square of side `s` around (0, 0). They are
// told apart by outline, not by color (hard rule 7): a key has a round bow and teeth, a broom a long
// handle and a wide brush, a hammer a handle and a block head. Painting only; no logic (ADR 0003).

import type Phaser from "phaser";
import type { ToolId } from "../../domain/shed";
import { shade } from "./shade";

type Graphics = Phaser.GameObjects.Graphics;

const brass = 0xe5b93c;
const wood = 0x8a5a32;
const straw = 0xd9b45a;
const iron = 0x9a9db4;

/** A key: a ring for the bow, a long shaft, and two teeth to one side. */
function drawKey(g: Graphics, s: number): void {
  g.lineStyle(s * 0.11, shade(brass, 0.7), 1);
  g.strokeCircle(0, -s * 0.3, s * 0.17);
  g.lineStyle(s * 0.07, brass, 1);
  g.strokeCircle(0, -s * 0.3, s * 0.17);
  g.fillStyle(shade(brass, 0.7), 1);
  g.fillRect(-s * 0.07, -s * 0.14, s * 0.14, s * 0.58);
  g.fillRect(s * 0.07, s * 0.18, s * 0.17, s * 0.1);
  g.fillRect(s * 0.07, s * 0.33, s * 0.12, s * 0.09);
  g.fillStyle(brass, 1);
  g.fillRect(-s * 0.04, -s * 0.14, s * 0.08, s * 0.54);
  g.fillRect(s * 0.04, s * 0.2, s * 0.17, s * 0.06);
  g.fillRect(s * 0.04, s * 0.34, s * 0.12, s * 0.06);
}

/** A broom: a thin handle and a wide brush of straw that fans out at the bottom. */
function drawBroom(g: Graphics, s: number): void {
  g.fillStyle(shade(wood, 0.7), 1);
  g.fillRect(-s * 0.05, -s * 0.46, s * 0.1, s * 0.6);
  g.fillStyle(wood, 1);
  g.fillRect(-s * 0.03, -s * 0.46, s * 0.06, s * 0.6);
  g.fillStyle(shade(straw, 0.7), 1);
  g.fillTriangle(-s * 0.1, s * 0.1, s * 0.1, s * 0.1, s * 0.3, s * 0.46);
  g.fillTriangle(-s * 0.1, s * 0.1, -s * 0.3, s * 0.46, s * 0.3, s * 0.46);
  g.fillStyle(straw, 1);
  g.fillTriangle(-s * 0.07, s * 0.14, s * 0.07, s * 0.14, s * 0.24, s * 0.43);
  g.fillTriangle(-s * 0.07, s * 0.14, -s * 0.24, s * 0.43, s * 0.24, s * 0.43);
  g.fillStyle(shade(wood, 0.8), 1);
  g.fillRect(-s * 0.11, s * 0.08, s * 0.22, s * 0.06);
}

/** A hammer: a handle, and a wide block of a head across the top. */
function drawHammer(g: Graphics, s: number): void {
  g.fillStyle(shade(wood, 0.7), 1);
  g.fillRect(-s * 0.06, -s * 0.18, s * 0.12, s * 0.64);
  g.fillStyle(wood, 1);
  g.fillRect(-s * 0.04, -s * 0.18, s * 0.08, s * 0.64);
  g.fillStyle(shade(iron, 0.6), 1);
  g.fillRoundedRect(-s * 0.3, -s * 0.44, s * 0.6, s * 0.3, s * 0.04);
  g.fillStyle(iron, 1);
  g.fillRoundedRect(-s * 0.27, -s * 0.41, s * 0.54, s * 0.24, s * 0.03);
  g.fillStyle(0xffffff, 0.35);
  g.fillRect(-s * 0.24, -s * 0.39, s * 0.48, s * 0.05);
}

/** Draws the tool centered at (0, 0) in a square of side `size`. */
export function drawTool(g: Graphics, tool: ToolId, size: number): void {
  if (tool === "key") drawKey(g, size);
  else if (tool === "broom") drawBroom(g, size);
  else drawHammer(g, size);
}
