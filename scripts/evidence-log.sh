#!/usr/bin/env bash
# Append one JSON line per agent event to docs/evidence/kiro-log/<session>.jsonl.
# Called by Kiro hooks (e.g. AgentStop). Never fails the hook: problems go to stderr, exit 0.
# Records metadata only, never prompts or file contents.
# Usage: bash scripts/evidence-log.sh <kind>   (an optional JSON hook payload on stdin)
set -uo pipefail

kind="${1:-event}"
root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root" || exit 0
mkdir -p .cache docs/evidence/kiro-log

payload=""
if [ ! -t 0 ]; then payload="$(timeout 2 head -c 65536 || true)"; fi

# One file per session. Cloud sandboxes clone fresh, so the id lives in the gitignored .cache/.
if [ ! -s .cache/session-id ]; then
  printf '%s-%s\n' "$(date -u +%Y%m%dT%H%M%SZ)" "$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')" > .cache/session-id
fi
session="$(cat .cache/session-id)"

PAYLOAD="$payload" KIND="$kind" SESSION="$session" node - >> "docs/evidence/kiro-log/$session.jsonl" <<'EOF' || echo "evidence-log: could not write a record" >&2
const { execSync } = require("node:child_process");
const sh = (cmd) => {
  try { return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; }
};
let p = {};
try { p = JSON.parse(process.env.PAYLOAD || "{}"); } catch { p = {}; }
const status = sh("cat .cache/last-test-status");
const base = sh("git merge-base HEAD origin/main");
const record = {
  ts: new Date().toISOString(),
  session: process.env.SESSION,
  kind: process.env.KIND,
  surface: process.env.EVIDENCE_SURFACE || p.surface || "unknown",
  hook: p.hook_event_name || p.trigger || null,
  branch: sh("git rev-parse --abbrev-ref HEAD"),
  head: sh("git rev-parse --short HEAD"),
  files_changed: base ? Number(sh(`git diff --name-only ${base} | wc -l`)) : null,
  last_check_exit: status === "" ? null : Number(status),
};
process.stdout.write(JSON.stringify(record) + "\n");
EOF
exit 0
