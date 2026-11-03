// Dependency policy over package-lock.json (rule 5 and rule 6 in AGENTS.md).
// - Every package comes from registry.npmjs.org with an integrity hash.
// - Shipped packages (not dev-only) use a permissive license; dev tools may also use weak copyleft
//   or data licenses that never reach the bundle.
// SPDX expressions: OR passes if any alternative passes, AND needs every part.
import { readFileSync } from "node:fs";

const PERMISSIVE = [
  "MIT",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "Zlib",
  "BlueOak-1.0.0",
  "CC0-1.0",
  "Unlicense",
];
// Build and test tools only: MPL-2.0 (file-level copyleft), CC-BY-4.0 (browser data),
// Python-2.0 (argparse).
const DEV_ONLY = ["MPL-2.0", "CC-BY-4.0", "Python-2.0"];
const REGISTRY = "registry.npmjs.org";

function allowed(expression, licenses) {
  const spdx = expression.replace(/[()]/g, "");
  return spdx
    .split(/ OR /i)
    .some((alt) => alt.split(/ AND /i).every((id) => licenses.includes(id.trim())));
}

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const problems = [];
let count = 0;
for (const [path, pkg] of Object.entries(lock.packages ?? {})) {
  if (path === "" || pkg.link || pkg.inBundle) continue;
  count += 1;
  const name = path.replace(/^.*node_modules\//, "");
  const host = pkg.resolved ? new URL(pkg.resolved).host : "";
  if (host !== REGISTRY)
    problems.push(`${name}: resolved from ${host || "nowhere"}, not ${REGISTRY}`);
  if (!pkg.integrity) problems.push(`${name}: no integrity hash`);
  const licenses = pkg.dev ? [...PERMISSIVE, ...DEV_ONLY] : PERMISSIVE;
  if (typeof pkg.license !== "string") problems.push(`${name}: no license`);
  else if (!allowed(pkg.license, licenses))
    problems.push(
      `${name}: license ${pkg.license} is not allowed${pkg.dev ? "" : " in shipped code"}`,
    );
}

if (problems.length) {
  console.error(problems.map((p) => `check-licenses: ${p}`).join("\n"));
  process.exit(1);
}
console.log(`check-licenses: ok (${count} packages)`);
