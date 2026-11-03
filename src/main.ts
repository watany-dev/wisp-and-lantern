// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { boot } from "./game/boot";
import { createGame, exposeGame, pickLang, readJudgeParams } from "./game/judge";
import { initialState } from "./domain/state";

declare global {
  interface Window {
    __game?: NonNullable<Parameters<typeof exposeGame>[0]["__game"]>;
  }
}

const params = readJudgeParams(window.location.search);
const game = createGame({ ...initialState, lang: pickLang(params, navigator.language) });
exposeGame(window, game);

// Load the bundled font before the first frame so text never renders in a system font.
document.fonts
  .load('16px "ZenMaru"', String.fromCodePoint(0x3042))
  .catch(() => undefined)
  .finally(() => boot(document.getElementById("app")!, game));
