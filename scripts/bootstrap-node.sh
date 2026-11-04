#!/usr/bin/env bash
# Install the pinned Node.js into .cache/node for sandboxes that cannot switch Node themselves.
# Kiro Web ships Node 22 and mounts ~/.nvm and /usr read-only, so `nvm install 26` and `dnf install`
# both fail. Called by scripts/setup-session.sh when `node -v` does not match .nvmrc; safe to run by hand.
# The archive is checked against the SHA-256 pinned below, never piped into a shell or tar.
# Node 26 needs libatomic.so.1, which the Amazon Linux 2023 image lacks; on that image the pinned
# libatomic RPM is unpacked (rpm2archive, no root) into .cache/node/lib-compat. Run Node with
#   PATH=.cache/node/bin:$PATH LD_LIBRARY_PATH=.cache/node/lib-compat
# Prints one line on stdout. Exits 1 on any failure.
# To bump Node: update .nvmrc, `version` and both columns of the sums from
# https://nodejs.org/dist/<version>/SHASUMS256.txt.
set -euo pipefail

version="v26.13.0"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dir="$root/.cache/node"
compat="$dir/lib-compat"

# Amazon Linux 2023 libatomic (x86_64). The blobstore path is the RPM's own SHA-256.
atomic_sum="e9423ed266d08f19eda2244058c0baef8d983b83900fbf055b6deae763ba3d60"
atomic_url="https://cdn.amazonlinux.com/al2023/blobstore/$atomic_sum/libatomic-11.5.0-5.amzn2023.0.3.x86_64.rpm"

fail() {
  echo "bootstrap-node: $*" >&2
  exit 1
}

node_runs() { # $1 = node binary, $2 = lib-compat dir
  [ "$(LD_LIBRARY_PATH="$2" "$1" -v 2>/dev/null)" = "$version" ]
}

want="$(tr -d '[:space:]v' < "$root/.nvmrc")"
case "${version#v}" in
  "$want" | "$want".*) ;;
  *) fail ".nvmrc requires Node $want but this script pins $version; update the pin" ;;
esac

if [ -x "$dir/bin/node" ] && node_runs "$dir/bin/node" "$compat"; then
  echo "node $version already installed in ${dir#"$root"/}"
  exit 0
fi

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) target="linux-x64" sum="d28a96af6c38596f6d9d97c0ee531c13d238d757742387d1928de822d959e997" ;;
  Linux-aarch64 | Linux-arm64) target="linux-arm64" sum="406fe3fbde1c054adff8b297c16fdb5af6659db327c1ac8acd46b56ef1af9a92" ;;
  Darwin-x86_64) target="darwin-x64" sum="8bd636bc981a92e1ab930c02340eece2076eb1aaf94d14e421cdeeddc1292298" ;;
  Darwin-arm64) target="darwin-arm64" sum="6f5b3187d9df9fc007e881167905bc7d69ad26450ddc377c83d63256a2495b6e" ;;
  *) fail "no prebuilt Node for $(uname -s) $(uname -m)" ;;
esac

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

# fetch <url> <file> <sha256>
fetch() {
  curl --proto '=https' --tlsv1.2 -fsSL --retry 2 -o "$2" "$1" || fail "download failed: $1"
  [ "$(sha256 "$2")" = "$3" ] || fail "checksum mismatch for $(basename "$1")"
}

mkdir -p "$root/.cache"
tmp="$(mktemp -d "$root/.cache/node-install.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT

fetch "https://nodejs.org/dist/$version/node-$version-$target.tar.xz" "$tmp/node.tar.xz" "$sum"
mkdir "$tmp/node"
tar -xJf "$tmp/node.tar.xz" -C "$tmp/node" --strip-components=1 || fail "could not unpack the Node archive"

if ! node_runs "$tmp/node/bin/node" "$tmp/node/lib-compat"; then
  [ "$target" = "linux-x64" ] || fail "the downloaded Node does not start on this system"
  command -v rpm2archive >/dev/null 2>&1 || fail "Node does not start (libatomic.so.1 missing) and rpm2archive is not available to unpack it"
  fetch "$atomic_url" "$tmp/libatomic.rpm" "$atomic_sum"
  mkdir -p "$tmp/rpm" "$tmp/node/lib-compat"
  rpm2archive - < "$tmp/libatomic.rpm" | tar -xz -C "$tmp/rpm" || fail "could not unpack the libatomic RPM"
  cp -a "$tmp"/rpm/usr/lib64/libatomic.so.1* "$tmp/node/lib-compat/" || fail "libatomic.so.1 not found in the RPM"
  node_runs "$tmp/node/bin/node" "$tmp/node/lib-compat" || fail "Node still does not start after adding libatomic"
fi

rm -rf "$dir"
mv "$tmp/node" "$dir"
node_runs "$dir/bin/node" "$compat" || fail "installed Node does not start from ${dir#"$root"/}"
echo "node $version installed in ${dir#"$root"/}"
