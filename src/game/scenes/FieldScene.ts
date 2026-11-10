// Trial 3, The Wisp Field. Draws `fieldView(state)` and turns taps into events; it keeps no rules.
// It never dispatches `Tick`: the field has no clock. Spec: .kiro/specs/06-trial-verify-stars/design.md

import Phaser from "phaser";
import { balance } from "../../domain/balance";
import { starCount } from "../../domain/field";
import type { GameState, Lang } from "../../domain/state";
import { fieldWisp, starCenter } from "../field-layout";
import { fieldView, justChecked, justKept, type FieldView } from "../field-view";
import type { Game } from "../judge";
import { buttonRect, fontSize, lessonBox, lessonWrap, resultText } from "../lane-layout";
import { guideText } from "../shed-layout";
import { stepToward } from "../steer";
import { burst, ripple } from "../fx/sparks";
import { drawButton, drawPanel, palette } from "../ui/art";
import { drawBackground } from "../ui/background";
import { fitCamera } from "../ui/camera";
import { createStarCard, paintStar, type StarWidget } from "../ui/star-card";
import { inkStyle, textStyle } from "../ui/text";
import { createHero, createWispArt } from "../ui/wisp-actor";

type Graphics = Phaser.GameObjects.Graphics;
type Text = Phaser.GameObjects.Text;

export class FieldScene extends Phaser.Scene {
  private view: FieldView | undefined;
  private shown: { field?: GameState["field"]; lang?: Lang } = {};
  private walks = true;
  private hero!: Phaser.GameObjects.Container;
  private wispBox!: Phaser.GameObjects.Container;
  private guide!: Text;
  private message!: Text;
  private lessonPanel!: Graphics;
  private lesson!: Text;
  private button!: Phaser.GameObjects.Container;
  private buttonLabel!: Text;
  private stars: StarWidget[] = [];

  constructor(private readonly game_: Game) {
    super("field");
  }

  create(): void {
    // The scene object is reused: forget what the last visit drew.
    this.shown = {};
    this.view = undefined;
    this.walks = true;
    fitCamera(this);
    drawBackground(this, false);
    this.hero = createHero(this);
    this.createTexts();
    this.createLesson();
    this.wispBox = this.add.container(fieldWisp.x, fieldWisp.y, [createWispArt(this)]);
    this.createButton();
    this.stars = Array.from({ length: starCount }, (_, i) => this.addStar(i));
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (_p: unknown, over: unknown[]) => {
      this.walks = over.length === 0;
    });
    const unsubscribe = this.game_.subscribe((s) => this.render(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.render(this.game_.state());
  }

  override update(_time: number, deltaMs: number): void {
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
      .text(resultText.x, resultText.y, "", { ...textStyle, fontSize: size, ...wrap })
      .setOrigin(0.5);
  }

  /** The closing line: its own panel and text, shown on the kept result until the button. */
  private createLesson(): void {
    const { x, y, width, height } = lessonBox;
    this.lessonPanel = this.add.graphics({ x, y });
    drawPanel(this.lessonPanel, width, height, palette.lit);
    this.lessonPanel
      .lineStyle(3, palette.gold, 1)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
    const style = {
      ...textStyle,
      fontSize: `${fontSize.lesson}px`,
      wordWrap: { width: lessonWrap },
    };
    this.lesson = this.add.text(x, y, "", style).setOrigin(0.5);
    this.lessonPanel.setVisible(false);
    this.lesson.setVisible(false);
  }

  private createButton(): void {
    const { x, y, width, height } = buttonRect;
    const panel = this.add.graphics();
    drawButton(panel, width, height);
    this.buttonLabel = this.add.text(0, 0, "", { ...inkStyle, fontSize: "24px" }).setOrigin(0.5);
    this.button = this.add.container(x, y, [panel, this.buttonLabel]).setSize(width, height);
    this.button.setInteractive().on("pointerdown", () => this.tapButton());
    this.button.setVisible(false);
  }

  private tapButton(): void {
    if (this.view?.button) this.game_.dispatch(this.view.button.event);
  }

  private addStar(index: number): StarWidget {
    return createStarCard(this, index, () => this.game_.dispatch({ type: "CheckStar", index }));
  }

  private render(state: GameState): void {
    this.hero.setPosition(state.hero.x, state.hero.y);
    if (state.field === this.shown.field && state.lang === this.shown.lang) return;
    const before = this.view;
    this.shown = { field: state.field, lang: state.lang };
    const view = fieldView(state);
    this.view = view;
    this.show(view);
    this.flourish(before, view);
  }

  private show(view: FieldView): void {
    this.guide.setText(view.guide);
    this.message.setText(view.message);
    this.lessonPanel.setVisible(view.lesson !== null);
    this.lesson.setVisible(view.lesson !== null).setText(view.lesson ?? "");
    this.button.setVisible(view.button !== null);
    this.buttonLabel.setText(view.button?.text ?? "");
    view.stars.forEach((star, i) => paintStar(this.stars[i]!, star));
  }

  /** A check or the keep plays a short flourish. The state and the picture already say everything. */
  private flourish(before: FieldView | undefined, view: FieldView): void {
    const found = justChecked(before, view);
    if (found !== null) this.revealed(found, view.stars[found]!.mark === "real");
    if (justKept(before, view)) this.celebrate(view);
  }

  /** A ripple at the star; sparks for a real star, and the wisp tilts once for a fake one. */
  private revealed(index: number, real: boolean): void {
    const { x, y } = starCenter(index);
    ripple(this, x, y);
    this.tweens.add({ targets: this.stars[index]!.art, scale: 1.3, duration: 180, yoyo: true });
    if (real) burst(this, x, y);
    else
      this.tweens.add({ targets: this.wispBox, angle: 12, duration: 160, yoyo: true, repeat: 1 });
  }

  /** Sparks fly from every star that was kept, and the wisp hops once. */
  private celebrate(view: FieldView): void {
    for (const star of view.stars) {
      if (star.ticked) burst(this, starCenter(star.index).x, starCenter(star.index).y);
    }
    this.tweens.add({ targets: this.wispBox, y: fieldWisp.y - 16, duration: 200, yoyo: true });
  }
}
