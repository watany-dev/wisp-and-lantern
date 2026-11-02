// Every character in the content files must have a glyph in the bundled subset font,
// so no child-facing text falls back to a system font (REQ-1.11).
import * as fontkit from "fontkit";
import { contentCodePoints, FONT_PATH } from "./check-content-lib.mjs";

const font = fontkit.openSync(FONT_PATH);
const missing = [...contentCodePoints()].filter((cp) => !font.hasGlyphForCodePoint(cp));
if (missing.length) {
  const list = missing.map((cp) => `${String.fromCodePoint(cp)} (U+${cp.toString(16).toUpperCase().padStart(4, "0")})`);
  console.error(`check-font-coverage: ${FONT_PATH} lacks ${missing.length} character(s):\n  ${list.join("\n  ")}`);
  console.error("Run `npm run font` to regenerate the subset.");
  process.exit(1);
}
console.log("check-font-coverage: ok");
