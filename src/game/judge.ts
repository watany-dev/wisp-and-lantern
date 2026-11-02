// Scaffold stub: replaced by .kiro/specs/01-core-loop

import type { GameEvent } from "../domain/events";
import { reduce } from "../domain/reducer";
import type { GameState, Lang } from "../domain/state";

export type JudgeParams = { judge: boolean; trial: number | null; lang: Lang | null };

/** Reads `?judge=1`, `?trial=n` and `?lang=ja|en` from a URL query string. */
export function readJudgeParams(search: string): JudgeParams {
  const q = new URLSearchParams(search);
  const trial = Number(q.get("trial"));
  const lang = q.get("lang");
  return {
    judge: q.get("judge") === "1",
    trial: Number.isInteger(trial) && trial >= 1 && trial <= 6 ? trial : null,
    lang: lang === "ja" || lang === "en" ? lang : null,
  };
}

/** The URL language wins, then the browser language, then English. */
export function pickLang(params: JudgeParams, browserLang: string | undefined): Lang {
  return params.lang ?? (browserLang?.toLowerCase().startsWith("ja") ? "ja" : "en");
}

export type Game = {
  state: () => GameState;
  dispatch: (event: GameEvent) => void;
  subscribe: (listener: (state: GameState) => void) => () => void;
};

export function createGame(initial: GameState): Game {
  let current = initial;
  const listeners = new Set<(state: GameState) => void>();
  return {
    state: () => current,
    dispatch: (event) => {
      current = reduce(current, event);
      for (const listener of listeners) listener(current);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Exposes `window.__game = { state, dispatch }` for e2e tests and judges. */
export function exposeGame(target: { __game?: Pick<Game, "state" | "dispatch"> }, game: Game): void {
  target.__game = { state: game.state, dispatch: game.dispatch };
}
