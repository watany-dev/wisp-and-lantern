// Child-facing Japanese text rules (AGENTS.md hard rule 2) and card integrity.
// - strings.ja.json values (keys containing "parent" skipped) and cards.json label.ja:
//   no kanji, no romaji, max 12 characters per line (spaces between words not counted), max 2 lines.
// - cards.json: non-empty shape, pattern, label.ja, label.en; no two cards share color+shape+pattern.
// - strings.ja/en and parents.ja/en have the same keys.
// Prints `file:path: message` per violation and exits 1 if there are any.
import { CONTENT_DIR, readJson, strings } from "./check-content-lib.mjs";

const MAX_CHARS = 12;
const MAX_LINES = 2;
const problems = [];
const report = (file, path, message) => problems.push(`${file}:${path}: ${message}`);

function checkKidText(file, path, text) {
  if (/\p{Script=Han}/u.test(text)) report(file, path, `kanji is not allowed: "${text}"`);
  if (/[A-Za-z]/.test(text)) report(file, path, `romaji is not allowed: "${text}"`);
  const lines = text.split("\n");
  if (lines.length > MAX_LINES) report(file, path, `${lines.length} lines (max ${MAX_LINES})`);
  for (const line of lines) {
    const length = [...line.replace(/\s/gu, "")].length;
    if (length > MAX_CHARS)
      report(file, path, `${length} characters in "${line}" (max ${MAX_CHARS})`);
  }
}

function compareKeys(fileA, a, fileB, b, path = "") {
  const isObj = (v) => v && typeof v === "object";
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      report(fileB, path || "(root)", `does not match the shape of ${fileA}`);
      return;
    }
    a.forEach((v, i) => compareKeys(fileA, v, fileB, b[i], `${path}[${i}]`));
    return;
  }
  if (!isObj(a) || !isObj(b)) return;
  for (const k of Object.keys(a)) {
    const p = path ? `${path}.${k}` : k;
    if (!(k in b)) report(fileB, p, `missing key (present in ${fileA})`);
    else compareKeys(fileA, a[k], fileB, b[k], p);
  }
  for (const k of Object.keys(b)) {
    if (!(k in a)) report(fileA, path ? `${path}.${k}` : k, `missing key (present in ${fileB})`);
  }
}

const ja = `${CONTENT_DIR}/strings.ja.json`;
for (const [path, text] of strings(readJson(ja))) {
  if (!/parent/i.test(path) && !/(^|\.)en$/.test(path)) checkKidText(ja, path, text);
}

const cardsFile = `${CONTENT_DIR}/cards.json`;
const cards = readJson(cardsFile);
if (!Array.isArray(cards)) report(cardsFile, "(root)", "must be an array");
else {
  const seen = new Map();
  cards.forEach((card, i) => {
    const at = `[${i}]`;
    for (const field of ["shape", "pattern"]) {
      if (typeof card?.[field] !== "string" || !card[field].trim())
        report(cardsFile, `${at}.${field}`, "must be a non-empty string");
    }
    for (const lang of ["ja", "en"]) {
      const v = card?.label?.[lang];
      if (typeof v !== "string" || !v.trim())
        report(cardsFile, `${at}.label.${lang}`, "must be a non-empty string");
    }
    if (typeof card?.label?.ja === "string")
      checkKidText(cardsFile, `${at}.label.ja`, card.label.ja);
    const triple = JSON.stringify([card?.color, card?.shape, card?.pattern]);
    if (seen.has(triple))
      report(cardsFile, at, `same color, shape and pattern as [${seen.get(triple)}]`);
    else seen.set(triple, i);
  });
}

for (const name of ["strings", "parents"]) {
  const a = `${CONTENT_DIR}/${name}.ja.json`;
  const b = `${CONTENT_DIR}/${name}.en.json`;
  compareKeys(a, readJson(a), b, readJson(b));
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("check-kid-strings: ok");
