#!/usr/bin/env bash
# Submission invariants for Kiroween 2026. Runs in CI on every pull request and before submitting.
set -uo pipefail
export LC_ALL=C.UTF-8
fail=0
err() { echo "check-submission: $*" >&2; fail=1; }

# MIT license at the root.
grep -q "MIT License" LICENSE 2>/dev/null || err "LICENSE is missing or not MIT"

# /.kiro at the root, tracked and not ignored.
[ -d .kiro ] || err ".kiro/ is missing"
git check-ignore -q .kiro && err ".kiro is ignored"
[ -n "$(git ls-files .kiro)" ] || err ".kiro has no tracked files"

# README sections judges rely on.
for h in "## Play" "## For judges" "## Prior work" "## Kiro usage" "## License"; do
  grep -qF "$h" README.md || err "README.md lacks '$h'"
done

# Font license, credits, size; raw font sources must not ship.
[ -f public/assets/CREDITS.md ] || err "public/assets/CREDITS.md is missing"
grep -q "OFL" public/assets/fonts/OFL.txt 2>/dev/null || err "public/assets/fonts/OFL.txt is missing or not OFL"
font=public/assets/fonts/zen-maru-gothic-subset.woff2
if [ -f "$font" ]; then
  [ "$(stat -c %s "$font")" -le 204800 ] || err "$font is larger than 200 KB"
else
  err "$font is missing"
fi
git ls-files public | grep -qiE '\.(ttf|otf)$' && err "raw font files under public/ would be deployed; keep them in assets-src/"

# Exact dependency versions, pinned MCP servers.
# shellcheck disable=SC2016 # JavaScript in single quotes: nothing here is meant to expand.
node -e '
  const p = require("./package.json");
  const bad = Object.entries({ ...p.dependencies, ...p.devDependencies }).filter(([, v]) => /^[\^~*]|latest|x/.test(v));
  if (bad.length) { console.error(bad.map(([n, v]) => `${n}@${v}`).join("\n")); process.exit(1); }
' || err "unpinned dependency versions in package.json"
git grep -n "@latest" -- .kiro && err "pin MCP server versions in .kiro (no @latest)"

# Repository text is English; Japanese only in allowlisted files.
allow=scripts/check-cjk-allowlist.txt
if hits="$(git ls-files | grep -vE -f <(sed '/^#/d;/^$/d' "$allow") | tr '\n' '\0' | xargs -0 -r grep -lIP '[\p{Han}\p{Hiragana}\p{Katakana}]' 2>/dev/null)"; then
  [ -n "$hits" ] && { echo "$hits" >&2; err "Japanese text outside $allow"; }
fi

# No vendor names of the scaffold tool (pattern split so this file does not match itself).
v1="Clau""de"; v2="Anth""ropic"; v3="AI-gen""erated"
git grep -nI -E "$v1|$v2|$v3" -- . && err "vendor names found"

exit "$fail"
