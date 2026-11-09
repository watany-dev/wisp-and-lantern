// The end screen of a run: the time is up, the score, the best, and one button to play again.
// Draws `overView(state)` and turns the button tap into `Start`; it keeps no rules.
// Spec: .kiro/specs/04-score-attack/design.md

import Phaser from "phaser";
import type { GameState } from "../../domain/state";
import type { Game } from "../judge";
import { buttonRect, overLockMs, overText } from "../lane-layout";
import { overView } from "../over-view";
import { drawButton } from "../ui/art";
import { drawBackground } from "../ui/background";
import { fitCamera } from "../ui/camera";
import { createWispArt } from "../ui/wisp-actor";
import { goldStyle, inkStyle, textStyle } from "../ui/text";

export class OverScene extends Phaser.Scene {
  private locked = true;

  constructor(private readonly game_: Game) {
    super("over");
  }

  create(): void {
    fitCamera(this);
    drawBackground(this);
    this.add.container(195, 690, [createWispArt(this)]).setScale(1.8);
    const view = overView(this.game_.state());
    this.locked = true;
    this.time.delayedCall(overLockMs, () => (this.locked = false));
    this.line(overText.title, view.title, textStyle, 40);
    if (view.record) this.line(overText.record, view.record, goldStyle, 30);
    this.line(overText.score, view.score, goldStyle, 48);
    this.line(overText.best, view.best, textStyle, 26);
    this.createButton(view.button.text);
    const unsubscribe = this.game_.subscribe((s) => this.render(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  private line(at: { x: number; y: number }, text: string, style: object, size: number): void {
    const wordWrap = { width: overText.wrap };
    this.add.text(at.x, at.y, text, { ...style, fontSize: `${size}px`, wordWrap }).setOrigin(0.5);
  }

  private createButton(text: string): void {
    const { x, y, width, height } = buttonRect;
    const panel = this.add.graphics();
    drawButton(panel, width, height);
    const label = this.add.text(0, 0, text, { ...inkStyle, fontSize: "24px" }).setOrigin(0.5);
    const button = this.add.container(x, y, [panel, label]).setSize(width, height);
    button.setInteractive().on("pointerdown", () => this.restart());
  }

  private restart(): void {
    if (!this.locked) this.game_.dispatch({ type: "Start" });
  }

  /** A new run began: the lane scene takes over. */
  private render(state: GameState): void {
    if (state.phase === "trial") this.scene.start("lane");
  }
}
