// Builds the bundled Japanese subset font from the source TTF in assets-src/ (not deployed).
// Includes hiragana, katakana, CJK punctuation, printable ASCII and every character in the content files.
import { readFileSync, statSync, writeFileSync } from "node:fs";
import subsetFont from "subset-font";
import { contentCodePoints, FONT_PATH } from "./check-content-lib.mjs";

const SOURCE = "assets-src/fonts/ZenMaruGothic-Regular.ttf";
const LIMIT = 200 * 1024;
const ranges = [
  [0x3041, 0x309f], // hiragana
  [0x30a0, 0x30ff], // katakana
  [0x3000, 0x303f], // CJK symbols and punctuation, prolonged sound mark
  [0x0020, 0x007e], // printable ASCII
];

const codePoints = new Set(contentCodePoints());
for (const [from, to] of ranges) for (let cp = from; cp <= to; cp += 1) codePoints.add(cp);
const text = String.fromCodePoint(...[...codePoints].sort((a, b) => a - b));

const out = await subsetFont(readFileSync(SOURCE), text, { targetFormat: "woff2" });
writeFileSync(FONT_PATH, out);
const size = statSync(FONT_PATH).size;
console.log(`${FONT_PATH}: ${(size / 1024).toFixed(1)} KB, ${codePoints.size} code points`);
if (size > LIMIT) {
  console.error(`subset-font: larger than ${LIMIT / 1024} KB`);
  process.exit(1);
}
