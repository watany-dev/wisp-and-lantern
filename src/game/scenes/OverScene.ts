// The end screen of a run: the time is up, the score, the best, and the buttons. Trial 1's has one button
// (play again). The shed's has a second one back to the title. Draws `overView(state)` and turns a button
// tap into an event; it keeps no rules. Specs: .kiro/specs/04-score-attack/design.md,
// .kiro/specs/05-trial-grant-tools/design.md

import Phaser from "phaser";
import type { GameEvent } from "../../domain/events";
import type { GameState } from "../../domain/state";
import type { Game } from "../judge";
import { buttonRect, overLockMs, overText } from "../lane-layout";
import { overView, type OverAction, type OverView } from "../over-view";
import { sceneFor } from "../route";
import { newSeed } from "../seed";
import { overLeave, overWispTwoButtons } from "../shed-layout";
import { drawButton } from "../ui/art";
import { drawBackground } from "../ui/background";
import { fitCamera } from "../ui/camera";
import { createLeaveButton } from "../ui/leave-button";
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
    const view = overView(this.game_.state());
    const wisp = view.buttons.length > 1 ? overWispTwoButtons : { x: 195, y: 690 };
    this.add.container(wisp.x, wisp.y, [createWispArt(this)]).setScale(1.8);
    this.locked = true;
    this.time.delayedCall(overLockMs, () => (this.locked = false));
    this.createLines(view);
    this.createButtons(view);
    const unsubscribe = this.game_.subscribe((s) => this.render(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  private createLines(view: OverView): void {
    this.line(overText.title, view.title, textStyle, 40);
    if (view.record) this.line(overText.record, view.record, goldStyle, 30);
    this.line(overText.score, view.score, goldStyle, 48);
    this.line(overText.best, view.best, textStyle, 26);
  }

  private line(at: { x: number; y: number }, text: string, style: object, size: number): void {
    const wordWrap = { width: overText.wrap };
    this.add.text(at.x, at.y, text, { ...style, fontSize: `${size}px`, wordWrap }).setOrigin(0.5);
  }

  private createButtons(view: OverView): void {
    const [first, second] = view.buttons;
    this.createButton(first!.text, first!.action);
    if (second) {
      const leave = createLeaveButton(this, overLeave, 24, () => this.press(second.action));
      leave.label.setText(second.text);
    }
  }

  private createButton(text: string, action: OverAction): void {
    const { x, y, width, height } = buttonRect;
    const panel = this.add.graphics();
    drawButton(panel, width, height);
    const label = this.add.text(0, 0, text, { ...inkStyle, fontSize: "24px" }).setOrigin(0.5);
    const button = this.add.container(x, y, [panel, label]).setSize(width, height);
    button.setInteractive().on("pointerdown", () => this.press(action));
  }

  /** The start of the shed needs a seed for the order of its puzzles; only the scene may draw one. */
  private eventFor(action: OverAction): GameEvent {
    if (action === "playShed") return { type: "StartShed", seed: newSeed() };
    return action === "leave" ? { type: "LeaveShed" } : { type: "Start" };
  }

  private press(action: OverAction): void {
    if (!this.locked) this.game_.dispatch(this.eventFor(action));
  }

  /** A new run began, or the child went back to the title: that scene takes over. */
  private render(state: GameState): void {
    if (state.phase !== "over") this.scene.start(sceneFor(state), { fromTrial: true });
  }
}
