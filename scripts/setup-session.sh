#!/usr/bin/env bash
# Prepare a fresh clone (cloud session) for `npm run check`: verify the Node version, then `npm ci`.
# Called by the SessionStart hook in .kiro/hooks/setup.json; safe to run by hand.
# Prints short status lines on stdout (Kiro adds SessionStart stdout to the agent's context).
# Exits 1 with a clear message when Node does not match .nvmrc, so nobody runs the gates on an
# unsupported runtime or reports a check result that was never produced.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

want="$(tr -d '[:space:]v' < .nvmrc)"
have="$(node -v 2>/dev/null || true)"
have="${have#v}"

if [ -z "$have" ]; then
  echo "setup-session: node is not installed; .nvmrc requires Node $want. Install it, then run: npm ci" >&2
  exit 1
fi

# .nvmrc holds a major ("26") or a full version ("26.1.0"); compare the same number of parts.
parts="$(awk -F. '{print NF}' <<<"$want")"
if [ "$(cut -d. -f1-"$parts" <<<"$have")" != "$want" ]; then
  echo "setup-session: Node $have is active but .nvmrc requires Node $want. Do not run npm run check on this runtime; it would not be a valid result. Switch (for example: nvm install $want && nvm use $want), then run: bash scripts/setup-session.sh" >&2
  exit 1
fi

if [ -x node_modules/.bin/vp ] && [ node_modules/.package-lock.json -nt package-lock.json ]; then
  echo "setup-session: node_modules is up to date (Node $have)"
  exit 0
fi

echo "setup-session: running npm ci on Node $have"
npm ci --no-audit --no-fund
echo "setup-session: ready; run npm run check"
