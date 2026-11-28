// What trial 6 (The Hollow Crown) shows for a game state: the row of steps, texts, the wish, what the wisp's panel
// holds, the controls of the step, and the town's lamps. There is no clock and no score. The way back to the title is
// the shed's button, so only its word is here. Plain data in, plain data out, so the scene stays thin (ADR 0003).
// Child-facing text comes from `src/content` only (REQ-9.14.1). Spec: .kiro/specs/09-trial-hollow-crown/design.md

import {
  cardsOf,
  jobAt,
  lampCount,
  lampParts,
  litCount,
  thingsAt,
  wishOf,
  type Crown,
  type CrownStage,
  type JobId,
  type Lamp,
  type LampPart,
  type Thing,
  type Told,
} from "../domain/crown";
import type { GameEvent } from "../domain/events";
import { looksOf, type LookId } from "../domain/lantern";
import type { ItemId } from "../domain/shadows";
import type { ToolId } from "../domain/shed";
import type { GameState, Lang } from "../domain/state";
import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";
import { oneButton, tellButton, tellCard, thingTile, twoButtons } from "./crown-layout";
import type { Rect } from "./lane-layout";
import { leaveLabel } from "./shed-view";

const strings = { ja, en };

const stepIds = ["tell", "give", "go", "check", "fix"] as const;
type StepId = (typeof stepIds)[number];

/** A step of the row: a tick when it is done in this chain, a solid frame when the child is on it, else neither. */
type StepMark = "done" | "now" | "later";

/** The picture on a control, so it is told apart without reading or color. */
export type ControlIcon = LookId | ToolId | ItemId | "tick" | "dots" | "none";

export type ControlView = {
  id: string;
  text: string;
  event: GameEvent;
  rect: Rect;
  icon: ControlIcon;
  /** A picked tell card has a frame and a tick. */
  picked: boolean;
};

/** What the wisp's panel holds: what was told so far, the shed with the job, or the lamp the wisp has. */
export type PanelView =
  | { kind: "told"; told: Told }
  | { kind: "shed"; job: JobId; tool: ToolId | null }
  | { kind: "lamp"; lamp: Lamp; lit: boolean; pointed: LampPart | null };

export type CrownView = {
  steps: { word: string; mark: StepMark }[];
  guide: string;
  wishLabel: string;
  panelLabel: string;
  message: string;
  /** The wish: a look for each part, always drawn lit. */
  wish: Lamp;
  panel: PanelView;
  controls: ControlView[];
  /** The town's three lamps, from the left: on or off. */
  town: boolean[];
  /** The label of the button back to the title, always shown (the shed's word). */
  leave: string;
  /** For the scene's flourish: a lamp is lit, the trial is clear, or neither. */
  result: "lit" | "clear" | null;
};

/** The label of the title's button into trial 6. */
export function crownEnterLabel(lang: Lang): string {
  return strings[lang].crown.enter;
}

/** The caption under it: three lamps, and no clock. */
export function crownCaption(lang: Lang): string {
  return strings[lang].crown.caption;
}

/** Where each stage is in the row of steps. The lit lamp and the clear have every step done. */
const stepAt: Readonly<Record<CrownStage, number>> = {
  telling: 0,
  giving: 1,
  going: 2,
  checking: 3,
  fixing: 4,
  lit: stepIds.length,
  clear: stepIds.length,
};

function stepsFor(crown: Crown, lang: Lang): CrownView["steps"] {
  const at = stepAt[crown.stage];
  const markOf = (i: number): StepMark => (i < at ? "done" : i === at ? "now" : "later");
  return stepIds.map((id: StepId, i) => ({ word: strings[lang].crown.steps[id], mark: markOf(i) }));
}

const partWord = (part: LampPart, lang: Lang) => strings[lang].lantern.parts[part];
const lookWord = (look: LookId, lang: Lang) => strings[lang].lantern.looks[look];
const toolWord = (tool: ToolId, lang: Lang) => strings[lang].shed.tools[tool];
const itemWord = (item: ItemId, lang: Lang) => strings[lang].shadows.items[item];
const isTool = (thing: Thing): thing is ToolId => thing in strings.en.shed.tools;
const thingWord = (thing: Thing, lang: Lang) =>
  isTool(thing) ? toolWord(thing, lang) : itemWord(thing, lang);

function guideFor(crown: Crown, lang: Lang): string {
  const s = strings[lang];
  switch (crown.stage) {
    case "telling":
      return s.crown.guide.tell;
    case "giving":
      return s.shed.puzzles[jobAt(crown.seed, crown.chain)].guide;
    case "going":
      return s.crown.guide.go;
    case "checking":
      return s.crown.guide.check;
    case "fixing":
      return s.crown.guide.fix;
    case "lit":
      return s.crown.guide.lit;
    case "clear":
      return s.crown.guide.clear;
  }
}

function tellMessage(crown: Extract<Crown, { stage: "telling" }>, lang: Lang): string {
  const s = strings[lang].crown;
  return crown.note ? s.missing.replace("{0}", partWord(crown.note.part, lang)) : s.tell;
}

function giveMessage(crown: Extract<Crown, { stage: "giving" }>, lang: Lang): string {
  const s = strings[lang];
  const { note } = crown;
  if (note === null) return s.crown.give;
  if (note.kind === "secret") return s.crown.secret.replace("{0}", itemWord(note.thing, lang));
  const stuck = s.shed.puzzles[jobAt(crown.seed, crown.chain)].stuck;
  return stuck.replace("{0}", toolWord(note.tool, lang));
}

function checkMessage(crown: Extract<Crown, { stage: "checking" }>, lang: Lang): string {
  const s = strings[lang].crown;
  const { note } = crown;
  if (note === null) return s.made;
  return note.kind === "again" ? s.again : s.said.replace("{0}", lookWord(note.look, lang));
}

function fixMessage(crown: Extract<Crown, { stage: "fixing" }>, lang: Lang): string {
  const s = strings[lang].crown;
  if (crown.part !== null) return s.point.replace("{0}", partWord(crown.part, lang));
  return crown.note ? s.fine.replace("{0}", partWord(crown.note.part, lang)) : s.fix;
}

/** One message place, one message per stage; the note says which. */
function messageFor(crown: Crown, lang: Lang): string {
  const s = strings[lang].crown;
  switch (crown.stage) {
    case "telling":
      return tellMessage(crown, lang);
    case "giving":
      return giveMessage(crown, lang);
    case "going":
      return s.going.replace("{0}", toolWord(crown.tool, lang));
    case "checking":
      return checkMessage(crown, lang);
    case "fixing":
      return fixMessage(crown, lang);
    case "lit":
      return s.lit;
    case "clear":
      return s.clear;
  }
}

function panelLabelFor(crown: Crown, lang: Lang): string {
  const s = strings[lang].crown.panel;
  if (crown.stage === "telling") return s.told;
  return crown.stage === "giving" || crown.stage === "going" ? s.shed : s.lamp;
}

function panelFor(crown: Crown): PanelView {
  switch (crown.stage) {
    case "telling":
      return { kind: "told", told: crown.told };
    case "giving":
      return { kind: "shed", job: jobAt(crown.seed, crown.chain), tool: null };
    case "going":
      return { kind: "shed", job: jobAt(crown.seed, crown.chain), tool: crown.tool };
    case "checking":
      return { kind: "lamp", lamp: crown.lamp, lit: false, pointed: null };
    case "fixing":
      return { kind: "lamp", lamp: crown.lamp, lit: false, pointed: crown.part };
    default:
      return { kind: "lamp", lamp: wishOf(crown), lit: true, pointed: null };
  }
}

const control = (
  id: string,
  text: string,
  event: GameEvent,
  rect: Rect,
  icon: ControlIcon,
): ControlView => ({ id, text, event, rect, icon, picked: false });

/** Six cards, three for each part, and "Tell". */
function tellControls(crown: Extract<Crown, { stage: "telling" }>, lang: Lang): ControlView[] {
  const cards = lampParts.flatMap((part) =>
    looksOf[part].map((look, i) => ({
      ...control(look, lookWord(look, lang), { type: "SayLook", look }, tellCard(part, i), look),
      picked: crown.told[part] === look,
    })),
  );
  const s = strings[lang].crown;
  return [...cards, control("tell", s.tellButton, { type: "Tell" }, tellButton, "none")];
}

function giveControls(crown: Extract<Crown, { stage: "giving" }>, lang: Lang): ControlView[] {
  return thingsAt(crown.seed, crown.chain).map((thing, i) =>
    control(thing, thingWord(thing, lang), { type: "GiveItem", thing }, thingTile(i), thing),
  );
}

function checkControls(lang: Lang): ControlView[] {
  const s = strings[lang].crown;
  const [left, right] = twoButtons;
  return [
    control("same", s.same, { type: "CheckLamp", same: true }, left, "tick"),
    control("different", s.different, { type: "CheckLamp", same: false }, right, "dots"),
  ];
}

function fixControls(crown: Crown, lang: Lang): ControlView[] {
  return cardsOf(crown).map((look, i) =>
    control(`fix-${look}`, lookWord(look, lang), { type: "FixLamp", look }, twoButtons[i]!, look),
  );
}

function controlsFor(state: GameState): ControlView[] {
  const { crown, lang } = state;
  const s = strings[lang];
  switch (crown.stage) {
    case "telling":
      return tellControls(crown, lang);
    case "giving":
      return giveControls(crown, lang);
    case "going":
      return [control("go", s.crown.go, { type: "Go" }, oneButton, "none")];
    case "checking":
      return checkControls(lang);
    case "fixing":
      return fixControls(crown, lang);
    case "lit":
      return [control("next", s.lantern.next, { type: "NextLamp" }, oneButton, "none")];
    case "clear":
      return [control("again", s.run.again, { type: "StartCrown", seed: 0 }, oneButton, "none")];
  }
}

function resultOf(crown: Crown): CrownView["result"] {
  if (crown.stage === "lit") return "lit";
  return crown.stage === "clear" ? "clear" : null;
}

export function crownView(state: GameState): CrownView {
  const { crown, lang } = state;
  const lit = litCount(crown);
  return {
    steps: stepsFor(crown, lang),
    guide: guideFor(crown, lang),
    wishLabel: strings[lang].crown.wish,
    panelLabel: panelLabelFor(crown, lang),
    message: messageFor(crown, lang),
    wish: wishOf(crown),
    panel: panelFor(crown),
    controls: controlsFor(state),
    town: Array.from({ length: lampCount }, (_, i) => i < lit),
    leave: leaveLabel(lang),
    result: resultOf(crown),
  };
}

/** A lamp has just been lit, or the trial has just been cleared: this view has a result and the one before did not. */
export function justLit(before: CrownView | undefined, after: CrownView): boolean {
  return after.result !== null && (before?.result ?? null) !== after.result;
}
