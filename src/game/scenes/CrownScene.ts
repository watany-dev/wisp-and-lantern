// Trial 6, The Hollow Crown: three chains of tell, give, go, check and fix light the town's three lamps. Draws
// `crownView(state)` and turns taps into events; it keeps no rules. Trial 6 has no clock, so unlike the other trials
// it dispatches no `Tick`. Spec: .kiro/specs/09-trial-hollow-crown/design.md

import Phaser from "phaser";
import { balance } from "../../domain/balance";
import type { LampPart } from "../../domain/crown";
import type { GameEvent } from "../../domain/events";
import type { GameState, Lang } from "../../domain/state";
import { crownGuide, crownMessage, lampRow, townLamp } from "../crown-layout";
import { crownView, justLit, type CrownView } from "../crown-view";
import { fieldWisp } from "../field-layout";
import type { Game } from "../judge";
import { fontSize } from "../lane-layout";
import { sceneFor } from "../route";
import { newSeed } from "../seed";
import { leaveButton } from "../shed-layout";
import { stepToward } from "../steer";
import { burst, ripple } from "../fx/sparks";
import { drawBackground } from "../ui/background";
import { fitCamera } from "../ui/camera";
import { drawTownLamp } from "../ui/crown-art";
import { createControls, paintControls, type ControlsWidget } from "../ui/crown-controls";
import { createCrownStage, paintCrownStage, type CrownStage } from "../ui/crown-stage";
import { createSteps, paintSteps, type StepsWidget } from "../ui/crown-steps";
import { createLeaveButton, type LeaveWidget } from "../ui/leave-button";
import { textStyle } from "../ui/text";
import { createHero, createWispArt } from "../ui/wisp-actor";

type Text = Phaser.GameObjects.Text;
type Graphics = Phaser.GameObjects.Graphics;

export class CrownScene extends Phaser.Scene {
  private view: CrownView | undefined;
  private shown: { crown?: GameState["crown"]; lang?: Lang } = {};
  private walks = true;
  private hero!: Phaser.GameObjects.Container;
  private steps!: StepsWidget;
  private guide!: Text;
  private message!: Text;
  private stage!: CrownStage;
  private controls!: ControlsWidget;
  private town!: Graphics[];
  private leave!: LeaveWidget;

  constructor(private readonly game_: Game) {
    super("crown");
  }

  create(): void {
    // The scene object is reused: forget what the last visit drew.
    this.shown = {};
    this.view = undefined;
    this.walks = true;
    fitCamera(this);
    drawBackground(this, false);
    this.hero = createHero(this);
    this.steps = createSteps(this);
    this.createTexts();
    this.stage = createCrownStage(this, (part) => this.point(part));
    this.add.container(fieldWisp.x, fieldWisp.y, [createWispArt(this)]);
    this.town = [0, 1, 2].map((i) => this.add.graphics({ x: townLamp(i).x, y: townLamp(i).y }));
    this.controls = createControls();
    this.leave = createLeaveButton(this, leaveButton, 16, () => this.send({ type: "LeaveCrown" }));
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (_p: unknown, over: unknown[]) => {
      this.walks = over.length === 0;
    });
    const unsubscribe = this.game_.subscribe((s) => this.render(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.render(this.game_.state());
  }

  /** No clock here: only the hero's floor drag. */
  override update(_time: number, deltaMs: number): void {
    const pointer = this.input.activePointer;
    if (!this.walks || !pointer.isDown) return;
    const target = { x: pointer.worldX, y: pointer.worldY };
    const next = stepToward(this.game_.state().hero, target, balance.heroSpeed, deltaMs);
    if (next) this.game_.dispatch({ type: "MoveHeroTo", ...next });
  }

  private point(part: LampPart): void {
    this.send({ type: "PointLamp", part });
  }

  /** "Play again" needs a new seed, and only the scene may draw one. */
  private send(event: GameEvent): void {
    this.game_.dispatch(event.type === "StartCrown" ? { ...event, seed: newSeed() } : event);
  }

  private createTexts(): void {
    const size = `${fontSize.message}px`;
    const text = (at: { x: number; y: number; wrap: number }) =>
      this.add
        .text(at.x, at.y, "", { ...textStyle, fontSize: size, wordWrap: { width: at.wrap } })
        .setOrigin(0.5);
    this.guide = text(crownGuide);
    this.message = text(crownMessage);
  }

  private render(state: GameState): void {
    // The child went back to the title: that scene takes over.
    if (sceneFor(state) !== "crown") {
      this.scene.start(sceneFor(state), { fromTrial: true });
      return;
    }
    this.hero.setPosition(state.hero.x, state.hero.y);
    if (state.crown === this.shown.crown && state.lang === this.shown.lang) return;
    const before = this.view;
    this.shown = { crown: state.crown, lang: state.lang };
    const view = crownView(state);
    this.view = view;
    this.show(view);
    if (justLit(before, view)) this.flourish(view);
  }

  private show(view: CrownView): void {
    this.leave.label.setText(view.leave);
    this.guide.setText(view.guide);
    this.message.setText(view.message);
    paintSteps(this.steps, view.steps);
    paintCrownStage(this.stage, view);
    paintControls(this, this.controls, view.controls, (e) => this.send(e));
    view.town.forEach((lit, i) => drawTownLamp(this.town[i]!, lit));
  }

  /** A lit lamp: a ripple and sparks from its light and its town lamp. The clear: sparks from every town lamp. */
  private flourish(view: CrownView): void {
    if (view.result === "lit") {
      const light = lampRow("light");
      burst(this, light.x, light.y);
      ripple(this, light.x, light.y);
    }
    view.town.forEach((lit, i) => {
      const at = townLamp(i);
      if (lit && (view.result === "clear" || i === view.town.lastIndexOf(true)))
        burst(this, at.x, at.y);
    });
  }
}
