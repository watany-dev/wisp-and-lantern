#!/usr/bin/env bash
# Wait until a deployed page serves a given build.
# Usage: bash scripts/wait-for-build.sh <url> <sha> [timeout_s=600]
# Polls every 15 s for <meta name="build" content="<sha>">. Exits 1 on timeout.
set -uo pipefail
url="${1:?usage: wait-for-build.sh <url> <sha> [timeout_s]}"
sha="${2:?usage: wait-for-build.sh <url> <sha> [timeout_s]}"
timeout_s="${3:-600}"
needle="name=\"build\" content=\"$sha\""
deadline=$(( $(date +%s) + timeout_s ))

while :; do
  # Capture first, then grep: `curl | grep -q` misreports under pipefail when grep exits early.
  body="$(curl -fsSL --max-time 10 -H 'Cache-Control: no-cache' "$url" 2>/dev/null || true)"
  if grep -qF "$needle" <<<"$body"; then
    echo "$url serves build $sha"
    exit 0
  fi
  served="$(grep -oE 'name="build" content="[^"]*"' <<<"$body" | head -n1 || true)"
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "::error::$url did not serve build $sha within ${timeout_s}s (last seen: ${served:-nothing})"
    exit 1
  fi
  echo "Waiting for $sha at $url (now: ${served:-no build meta})"
  sleep 15
done
