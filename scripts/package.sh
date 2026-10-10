#!/usr/bin/env bash
# Zips the mod folder into dist/settlement-gifting-<version>.zip, version from <Version> in the modinfo.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOD=settlement-gifting
VERSION=$(sed -n "s/.*<Version>\([^<]*\)<\/Version>.*/\1/p" "$ROOT/mod/$MOD/$MOD.modinfo")
[ -n "$VERSION" ] || { echo "no version found in $MOD.modinfo" >&2; exit 1; }
OUT="$ROOT/dist/$MOD-$VERSION.zip"
mkdir -p "$ROOT/dist"
rm -f "$OUT"
(cd "$ROOT/mod" && python3 -m zipfile -c "$OUT" "$MOD")
echo "$OUT"
