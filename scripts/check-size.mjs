// Size budget for the deployed site (dist/).
// WOFF2 <= 200 KB each, gzip(JS + CSS) <= 1 MB, dist <= 15 MB, dist/.nojekyll present, no .ttf/.otf.
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = "dist";
const KB = 1024;
const MB = 1024 * KB;
const problems = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

if (!existsSync(DIST)) {
  console.error("check-size: dist/ not found; run `npm run build` first");
  process.exit(1);
}

const files = walk(DIST);
let total = 0;
let gzipCode = 0;
const rows = [];
for (const file of files) {
  const size = statSync(file).size;
  total += size;
  const ext = extname(file).toLowerCase();
  const rel = relative(DIST, file);
  if (ext === ".js" || ext === ".css") {
    const gz = gzipSync(readFileSync(file)).length;
    gzipCode += gz;
    rows.push(`| ${rel} | ${(size / KB).toFixed(1)} KB | ${(gz / KB).toFixed(1)} KB |`);
  }
  if (ext === ".woff2") {
    rows.push(`| ${rel} | ${(size / KB).toFixed(1)} KB | — |`);
    if (size > 200 * KB) problems.push(`${rel} is ${(size / KB).toFixed(1)} KB (max 200 KB)`);
  }
  if (ext === ".ttf" || ext === ".otf")
    problems.push(`${rel}: raw font files must not be deployed`);
}
if (!existsSync(join(DIST, ".nojekyll"))) problems.push(".nojekyll is missing from dist/");
if (gzipCode > MB)
  problems.push(`gzip(JS + CSS) is ${(gzipCode / KB).toFixed(1)} KB (max 1024 KB)`);
if (total > 15 * MB) problems.push(`dist/ is ${(total / MB).toFixed(2)} MB (max 15 MB)`);

const summary = [
  "### Bundle size",
  "",
  "| file | size | gzip |",
  "|---|---|---|",
  ...rows,
  `| **gzip JS + CSS** | | **${(gzipCode / KB).toFixed(1)} KB** / 1024 KB |`,
  `| **dist total** | **${(total / MB).toFixed(2)} MB** / 15 MB | |`,
  "",
].join("\n");
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);

if (problems.length) {
  for (const p of problems) console.error(`::error::check-size: ${p}`);
  process.exit(1);
}
