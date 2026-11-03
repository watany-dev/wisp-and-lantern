#!/usr/bin/env bash
# ShellCheck over scripts/*.sh, as CI's `static` job does (same pinned image).
# Local helper for `npm run check`: runs a local `shellcheck` binary if there is one, else Docker,
# and otherwise prints a notice and exits 0 so a missing tool never blocks local work. CI is the gate.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Keep in sync with the image digest in .github/workflows/ci.yml (ShellCheck 0.11.0).
image="koalaman/shellcheck@sha256:bb596a0d169b85ddd81d8b6d3a2ff6d5baf5fca10b97f575ebc647c3dff62b3d"

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck scripts/*.sh
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker run --rm -v "$PWD:/mnt" -w /mnt "$image" scripts/*.sh
else
  echo "lint-shell: neither shellcheck nor a running Docker found; skipped (CI still runs ShellCheck)" >&2
fi
