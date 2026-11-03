// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { boot } from "./game/boot";
import { createGame, exposeGame, pickLang, readJudgeParams } from "./game/judge";
import { initialState } from "./domain/state";

const params = readJudgeParams(window.location.search);
const game = createGame({ ...initialState, lang: pickLang(params, navigator.language) });
exposeGame(window as { __game?: Parameters<typeof exposeGame>[0]["__game"] }, game);

// Load the bundled font before the first frame so text never renders in a system font.
document.fonts
  .load('16px "ZenMaru"', String.fromCodePoint(0x3042))
  .catch(() => undefined)
  .finally(() => boot(document.getElementById("app")!, game));
