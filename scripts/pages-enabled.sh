#!/usr/bin/env bash
# Tell whether GitHub Pages is enabled for this repository, so a job can skip its live checks
# instead of polling for minutes for a site that nobody serves.
# Usage: bash scripts/pages-enabled.sh
# Needs GH_TOKEN (with `pages: read`) and GH_REPO. Appends `enabled=true` or `enabled=false` to
# $GITHUB_OUTPUT and always exits 0. Only a 404 counts as "not served": a private repository on a
# plan without Pages and a repository whose Pages source is not set both answer 404. Any other
# failure (missing permission, network) keeps `enabled=true`, so the wait and the live smoke run
# as before and a real problem is never hidden behind a skip.
set -uo pipefail
repo="${GH_REPO:?GH_REPO is required (owner/name)}"
out_file="${GITHUB_OUTPUT:-/dev/stdout}"

if answer="$(gh api "repos/$repo/pages" --jq '.html_url' 2>&1)"; then
  echo "GitHub Pages is enabled for $repo: $answer"
  echo "enabled=true" >> "$out_file"
elif grep -qF 'HTTP 404' <<<"$answer"; then
  echo "::warning title=GitHub Pages is not served::$repo has no Pages site (it is private on a plan without Pages, or Settings > Pages > Source is not set; see docs/maintainer-setup.md). The wait for Pages and the live smoke are skipped."
  echo "enabled=false" >> "$out_file"
else
  echo "::warning title=Could not check GitHub Pages::GET repos/$repo/pages failed: ${answer:-no output}. Waiting for Pages as usual."
  echo "enabled=true" >> "$out_file"
fi
