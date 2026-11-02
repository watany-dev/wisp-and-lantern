#!/usr/bin/env bash
# Open (or comment on) one issue per failure kind, without duplicates.
# Usage: bash scripts/report-failure.sh <title> <label> <run_url>
# Needs GH_TOKEN and GH_REPO in the environment.
set -euo pipefail
title="${1:?usage: report-failure.sh <title> <label> <run_url>}"
label="${2:?usage: report-failure.sh <title> <label> <run_url>}"
run_url="${3:?usage: report-failure.sh <title> <label> <run_url>}"

gh label create "$label" --force --color B60205 --description "Opened by scripts/report-failure.sh" >/dev/null
number="$(gh issue list --state open --label "$label" --limit 100 --json number,title \
  | jq -r --arg t "$title" '[.[] | select(.title == $t)][0].number // empty')"
body="Failed run: $run_url"
if [ -n "$number" ]; then
  gh issue comment "$number" --body "$body"
  echo "Commented on #$number"
else
  gh issue create --title "$title" --label "$label" --body "$body"
fi
