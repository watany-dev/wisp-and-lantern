#!/usr/bin/env bash
# Install the pinned ptuf binary (https://github.com/watany-dev/ptuf) for the PreToolUse guardrail
# in .kiro/hooks/ptuf.json. Called by the SessionStart hook; safe to run by hand.
# The archive is checked against the SHA-256 pinned below, never piped into a shell.
# Prints one line on stdout (Kiro adds SessionStart stdout to the agent's context).
# On failure it exits 1 and the PreToolUse hook then blocks every tool call (fail closed).
set -euo pipefail

version="v0.7.0"
# Repository-local and gitignored: cloud sandboxes may not allow writes to $HOME, and the hook
# command in .kiro/hooks/ptuf.json runs this exact path, not whatever `ptuf` is on PATH.
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bin_dir="$root/.cache/bin"

fail() {
  echo "bootstrap-ptuf: $*; tool calls stay blocked until ptuf $version is installed" >&2
  exit 1
}

if [ -x "$bin_dir/ptuf" ] && [ "$("$bin_dir/ptuf" --version 2>/dev/null)" = "ptuf ${version#v}" ]; then
  echo "ptuf ${version#v} already installed in ${bin_dir#"$root"/}"
  exit 0
fi

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) target="x86_64-unknown-linux-musl" sum="fd65e1c2e2a8a48749daed9a77a2ac25cd53541fd603fd3e376a45eae79464d9" ;;
  Linux-aarch64 | Linux-arm64) target="aarch64-unknown-linux-musl" sum="5b21d4ac7cd0b814493595d916b203678b92f6b60397cb5354285b1c60e20609" ;;
  Darwin-x86_64) target="x86_64-apple-darwin" sum="12af5eb496ed1e08baa6d6b5a33e09958f54c1ff11a5e16a1af4b8e16b764581" ;;
  Darwin-arm64) target="aarch64-apple-darwin" sum="d0152a0f57a89e2822bfeb70eab21167c09a0bdc807b4275a7b7aa164e159b0c" ;;
  *) fail "no prebuilt binary for $(uname -s) $(uname -m)" ;;
esac

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
archive="$tmp/ptuf.tar.gz"
url="https://github.com/watany-dev/ptuf/releases/download/$version/ptuf-$target.tar.gz"

curl --proto '=https' --tlsv1.2 -fsSL --retry 2 -o "$archive" "$url" || fail "download failed: $url"

if command -v sha256sum >/dev/null 2>&1; then
  actual="$(sha256sum "$archive" | cut -d' ' -f1)"
else
  actual="$(shasum -a 256 "$archive" | cut -d' ' -f1)"
fi
[ "$actual" = "$sum" ] || fail "checksum mismatch for ptuf-$target.tar.gz"

tar -xzf "$archive" -C "$tmp" --strip-components=1 || fail "could not unpack the archive"
mkdir -p "$bin_dir"
install -m 0755 "$tmp/ptuf" "$bin_dir/ptuf" || fail "could not install into $bin_dir"

# A guardrail that does not deny is worse than none: check one known-bad command (deny = exit 2).
status=0
"$bin_dir/ptuf" check --tool Bash 'rm -rf /' >/dev/null 2>&1 || status=$?
[ "$status" -eq 2 ] || fail "installed binary did not deny 'rm -rf /' (exit $status)"

echo "ptuf ${version#v} installed in ${bin_dir#"$root"/}"
