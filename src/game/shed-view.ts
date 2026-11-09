// What trial 2 (The Locked Shed) shows for a game state: texts, which tools are marked, the picture of
// the shed, the button. Plain data in, plain data out, so the scene stays thin (ADR 0003).
// Child-facing text comes from `src/content` only (REQ-5.12.1). Spec:
// .kiro/specs/05-trial-grant-tools/design.md

import { canGive, shedOutcome, tools, triedTool, type ToolId } from "../domain/shed";
import type { ShedEvent } from "../domain/events";
import type { GameState, Lang } from "../domain/state";
import en from "../content/strings.en.json";
import ja from "../content/strings.ja.json";
import { messageText as choosingText, resultText, wisp } from "./lane-layout";
import { wispWork } from "./shed-layout";
import type { Point } from "./steer";

const strings = { ja, en };

/** The center of a text box or a spot as a plain point. */
const spot = ({ x, y }: Point): Point => ({ x, y });

/** How one tool card looks: its label, whether it is marked, and how faded it is. */
type ToolState = { id: ToolId; label: string; picked: boolean; alpha: number };

/** The drawing of the shed. It follows the result and the tried tool, nothing else. */
type ShedPicture = {
  door: "shut" | "open";
  /** Inside, seen at the window, until the door opens. */
  cat: "inside" | "outside";
  /** The tool the wisp tries at the lock, or none before the hand-over. */
  tool: ToolId | null;
  star: boolean;
};

export type ShedView = {
  guide: string;
  message: string;
  /** Where the message goes: below the wisp while choosing, in the wisp's spot after the hand-over. */
  messageAt: Point;
  /** Shown after the hand-over. Both results retry; `open` plays the shed again. */
  button: { text: string; event: ShedEvent } | null;
  /** The wisp can be handed the picked tool now. */
  armed: boolean;
  tools: ToolState[];
  picture: ShedPicture;
  /** The closing line, on the open result only. It is its own text, not part of `message`. */
  lesson: string | null;
  /** The wisp is faded while there is nothing to hand it. */
  wispAlpha: number;
  wispTarget: Point;
};

/** The tool's name in the child's language. */
export function toolName(tool: ToolId, lang: Lang): string {
  return strings[lang].shed.tools[tool];
}

/** The label of the title's button into the shed. */
export function shedEnterLabel(lang: Lang): string {
  return strings[lang].shed.enter;
}

/** The message for the stage; it names the picked tool, or the tool the wisp tried. */
function messageFor(state: GameState): string {
  const s = strings[state.lang].shed;
  const { shed } = state;
  if (shed.stage === "choosing") {
    return shed.pick === null ? s.pick : s.ready.replace("{0}", toolName(shed.pick, state.lang));
  }
  const text = shedOutcome(shed) === "open" ? s.open : s.shut;
  return text.replace("{0}", toolName(shed.tool, state.lang));
}

function buttonFor(state: GameState): ShedView["button"] {
  const outcome = shedOutcome(state.shed);
  if (outcome === "choosing") return null;
  const s = strings[state.lang].shed;
  return { text: outcome === "open" ? s.again : s.retry, event: { type: "RetryShed" } };
}

/** The tool that is picked while choosing, or that was handed over after. */
function markedTool(state: GameState): ToolId | null {
  const { shed } = state;
  return shed.stage === "choosing" ? shed.pick : shed.tool;
}

/** After the hand-over the tools that were not handed over fade, as the lane fades unpicked cards. */
function toolStates(state: GameState): ToolState[] {
  const marked = markedTool(state);
  const tried = state.shed.stage === "tried";
  return tools.map((id) => ({
    id,
    label: toolName(id, state.lang),
    picked: id === marked,
    alpha: tried && id !== marked ? 0.45 : 1,
  }));
}

function pictureFor(state: GameState): ShedPicture {
  const open = shedOutcome(state.shed) === "open";
  return {
    door: open ? "open" : "shut",
    cat: open ? "outside" : "inside",
    tool: triedTool(state.shed),
    star: open,
  };
}

/** The closing line looks back at the key that was handed over; only the open result has one. */
function lessonFor(state: GameState): string | null {
  if (shedOutcome(state.shed) !== "open") return null;
  const name = toolName(triedTool(state.shed)!, state.lang);
  return strings[state.lang].shed.lesson.replace("{0}", name);
}

export function shedView(state: GameState): ShedView {
  const { shed } = state;
  const tried = shed.stage === "tried";
  return {
    guide: strings[state.lang].shed.guide,
    message: messageFor(state),
    messageAt: spot(tried ? resultText : choosingText),
    button: buttonFor(state),
    armed: canGive(shed),
    tools: toolStates(state),
    picture: pictureFor(state),
    lesson: lessonFor(state),
    wispAlpha: canGive(shed) || tried ? 1 : 0.55,
    wispTarget: spot(tried ? wispWork : wisp),
  };
}
