// Evidence records stay machine-readable and free of personal data.
// - docs/evidence/kiro-log/*.jsonl: every line is JSON with ts (ISO 8601), session, kind, surface;
//   the file is named <session>.jsonl.
// - docs/evidence/playtest-*.md: has a `consent:` line.
// - docs/evidence/**: no e-mail addresses or phone numbers.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const ROOT = "docs/evidence";
const problems = [];
const report = (file, line, message) => problems.push(`${file}${line ? `:${line}` : ""}: ${message}`);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(?<![\w.])(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-])\d{2,4}[\s-]\d{3,4}(?![\w.])|(?<![\w.])0\d{9,10}(?![\w.])/;

const files = walk(ROOT);
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");

  if (file.startsWith(join(ROOT, "kiro-log")) && file.endsWith(".jsonl")) {
    lines.forEach((line, i) => {
      if (!line.trim()) return;
      let rec;
      try {
        rec = JSON.parse(line);
      } catch {
        report(file, i + 1, "not valid JSON");
        return;
      }
      if (typeof rec.ts !== "string" || !ISO.test(rec.ts) || Number.isNaN(Date.parse(rec.ts))) report(file, i + 1, "ts must be an ISO 8601 timestamp");
      for (const key of ["session", "kind", "surface"]) {
        if (typeof rec[key] !== "string" || !rec[key]) report(file, i + 1, `missing ${key}`);
      }
      if (typeof rec.session === "string" && basename(file) !== `${rec.session}.jsonl`) report(file, i + 1, `session ${rec.session} does not match the file name`);
    });
  }

  if (/^playtest-.*\.md$/.test(basename(file)) && !/^\s*[-*]?\s*consent:/im.test(text)) report(file, 0, "needs a `consent:` line");

  lines.forEach((line, i) => {
    if (EMAIL.test(line)) report(file, i + 1, "looks like an e-mail address");
    if (PHONE.test(line)) report(file, i + 1, "looks like a phone number");
  });
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`check-evidence: ok (${files.length} files)`);
