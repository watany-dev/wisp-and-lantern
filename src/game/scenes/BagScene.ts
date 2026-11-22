// Trial 4, The Listening Shadows: a 60-second time attack. Draws `bagView(state)` and turns taps into events; it
// keeps no rules. Like the other trials, it dispatches `Tick` from `update`, which is how time reaches the
// reducer. Spec: .kiro/specs/07-trial-keep-secrets/design.md

import Phaser from "phaser";
import { balance } from "../../domain/balance";
import { itemCount } from "../../domain/bag";
import type { GameState, Lang } from "../../domain/state";
import { bagMessage, itemCenter, shadowSpots } from "../bag-layout";
import { bagView, justFinished, justGiven, justHeld, type BagView } from "../bag-view";
import { tickMs } from "../clock";
import { fieldWisp } from "../field-layout";
import type { Game } from "../judge";
import { fontSize } from "../lane-layout";
import { hudView } from "../lane-view";
import { sceneFor } from "../route";
import { guideText, leaveButton } from "../shed-layout";
import { stepToward } from "../steer";
import { burst } from "../fx/sparks";
import { createRules, paintRules, type RulesWidget } from "../ui/bag-rules";
import { drawItem } from "../ui/bag-items";
import { drawBackground } from "../ui/background";
import { fitCamera } from "../ui/camera";
import { createButtons, paintButtons, type ButtonsWidget } from "../ui/field-buttons";
import { createHud, paintHud, type HudWidget } from "../ui/hud";
import { createItemCard, paintItem, type ItemWidget } from "../ui/item-card";
import { createLeaveButton, type LeaveWidget } from "../ui/leave-button";
import { createShadow, twitch, type ShadowWidget } from "../ui/shadow";
import { goldStyle, textStyle } from "../ui/text";
import { createHero, createWispArt } from "../ui/wisp-actor";

type Text = Phaser.GameObjects.Text;

export class BagScene extends Phaser.Scene {
  private view: BagView | undefined;
  private shown: { bag?: GameState["bag"]; lang?: Lang } = {};
  private walks = true;
  private hero!: Phaser.GameObjects.Container;
  private wispBox!: Phaser.GameObjects.Container;
  private guide!: Text;
  private message!: Text;
  private rules!: RulesWidget;
  private buttons!: ButtonsWidget;
  private items: ItemWidget[] = [];
  private shadows: ShadowWidget[] = [];
  private hud!: HudWidget;
  private leave!: LeaveWidget;
  private lastScore = 0;

  constructor(private readonly game_: Game) {
    super("bag");
  }

  create(): void {
    // The scene object is reused: forget what the last visit drew.
    this.shown = {};
    this.view = undefined;
    this.walks = true;
    this.lastScore = 0;
    fitCamera(this);
    drawBackground(this, false);
    this.hero = createHero(this);
    this.hud = createHud(this);
    this.createTexts();
    this.rules = createRules(this);
    this.createListeners();
    this.buttons = createButtons(this, (event) => this.game_.dispatch(event));
    this.items = Array.from({ length: itemCount }, (_, i) => this.addItem(i));
    this.leave = createLeaveButton(this, leaveButton, 16, () =>
      this.game_.dispatch({ type: "LeaveBag" }),
    );
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (_p: unknown, over: unknown[]) => {
      this.walks = over.length === 0;
    });
    const unsubscribe = this.game_.subscribe((s) => this.render(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.render(this.game_.state());
  }

  override update(_time: number, deltaMs: number): void {
    this.game_.dispatch({ type: "Tick", ms: tickMs(deltaMs) });
    const pointer = this.input.activePointer;
    if (!this.walks || !pointer.isDown) return;
    const target = { x: pointer.worldX, y: pointer.worldY };
    const next = stepToward(this.game_.state().hero, target, balance.heroSpeed, deltaMs);
    if (next) this.game_.dispatch({ type: "MoveHeroTo", ...next });
  }

  private createTexts(): void {
    const size = `${fontSize.message}px`;
    const wrap = { wordWrap: { width: guideText.wrap } };
    this.guide = this.add
      .text(guideText.x, guideText.y, "", { ...textStyle, fontSize: size, ...wrap })
      .setOrigin(0.5);
    this.message = this.add
      .text(bagMessage.x, bagMessage.y, "", { ...textStyle, fontSize: size, ...wrap })
      .setOrigin(0.5);
  }

  /** The wisp at the bottom, and a shadow on each side of it, its ear turned toward the wisp. */
  private createListeners(): void {
    this.wispBox = this.add.container(fieldWisp.x, fieldWisp.y, [createWispArt(this)]);
    this.shadows = shadowSpots.map((p) => createShadow(this, p.x, p.y, p.x < fieldWisp.x ? 1 : -1));
  }

  private addItem(index: number): ItemWidget {
    return createItemCard(this, index, () => this.game_.dispatch({ type: "GiveItem", index }));
  }

  private render(state: GameState): void {
    // The clock ran out (the end screen), or the child went back to the title: that scene takes over.
    if (sceneFor(state) !== "bag") {
      this.scene.start(sceneFor(state), { fromTrial: true });
      return;
    }
    this.hero.setPosition(state.hero.x, state.hero.y);
    paintHud(this.hud, hudView(state));
    const gained = state.run.score - this.lastScore;
    this.lastScore = state.run.score;
    if (state.bag === this.shown.bag && state.lang === this.shown.lang) return;
    const before = this.view;
    this.shown = { bag: state.bag, lang: state.lang };
    const view = bagView(state);
    this.view = view;
    this.show(view);
    this.flourish(before, view, gained);
  }

  private show(view: BagView): void {
    this.leave.label.setText(view.leave);
    this.guide.setText(view.guide);
    this.message.setText(view.message);
    paintRules(this.rules, view);
    paintButtons(this.buttons, view.buttons, this.game.getTime());
    view.items.forEach((item, i) => paintItem(this.items[i]!, item));
  }

  /** A hand-over, a secret tap or a done round plays a short flourish. The picture already says everything. */
  private flourish(before: BagView | undefined, view: BagView, gained: number): void {
    const given = justGiven(before, view);
    if (given !== null) this.handOver(view.items[given]!.item, given, gained);
    const held = justHeld(before, view);
    if (held !== null) this.holdBack(held);
    if (justFinished(before, view) && before) this.celebrate();
  }

  /** The thing's picture floats down to the wisp and fades, the wisp hops, and the points pop from the card. */
  private handOver(item: BagView["items"][number]["item"], index: number, gained: number): void {
    const { x, y } = itemCenter(index);
    const copy = this.add.graphics({ x, y }).setDepth(9);
    drawItem(copy, item, 40);
    this.tweens.add({
      targets: copy,
      x: fieldWisp.x,
      y: fieldWisp.y,
      scale: 0.5,
      alpha: 0,
      duration: 600,
      onComplete: () => copy.destroy(),
    });
    this.tweens.add({ targets: this.wispBox, y: fieldWisp.y - 12, duration: 180, yoyo: true });
    if (gained > 0) this.popPoints(gained, x, y);
  }

  /** "+150" rises from the card that was handed over, then fades. */
  private popPoints(points: number, x: number, y: number): void {
    const text = this.add
      .text(x, y, `+${points}`, { ...goldStyle, fontSize: "34px" })
      .setOrigin(0.5)
      .setDepth(10);
    this.tweens.add({
      targets: text,
      y: y - 70,
      alpha: 0,
      duration: 1100,
      onComplete: () => text.destroy(),
    });
  }

  /** A secret tap: the card wobbles once and the shadows' ears twitch once. No red, no shake, no sound. */
  private holdBack(index: number): void {
    const card = this.items[index]!.box;
    this.tweens.add({ targets: card, angle: 6, duration: 90, yoyo: true, repeat: 1 });
    for (const shadow of this.shadows) twitch(this, shadow);
  }

  /** Sparks fly from the wisp once a round is done. */
  private celebrate(): void {
    burst(this, fieldWisp.x, fieldWisp.y);
  }
}
