#!/usr/bin/env bash
# Uploads the mod folder to the Steam Workshop with SteamCMD.
#   scripts/upload_workshop.sh --changenote "text" [--visibility public|friends|private|unlisted]
# Needs STEAM_USERNAME and a cached SteamCMD login: run `steamcmd +login <user> +quit` once in a
# terminal (password and Steam Guard), or restore its config.vdf as the workshop workflow does.
# STEAMCMD overrides the steamcmd command. Item id and title come from workshop/workshop.vdf, the
# description from workshop/description.bbcode. The preview image cannot be uploaded this way for
# Civilization VII items; set it on the item's Steam page (see workshop/PUBLISHING.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STEAMCMD="${STEAMCMD:-steamcmd}"
CHANGENOTE="Update"
VISIBILITY=""
while [ $# -gt 0 ]; do
	case "$1" in
		--changenote) CHANGENOTE="$2"; shift 2 ;;
		--visibility) VISIBILITY="$2"; shift 2 ;;
		*) echo "unknown argument: $1" >&2; exit 1 ;;
	esac
done
: "${STEAM_USERNAME:?set STEAM_USERNAME}"

mkdir -p "$ROOT/dist"
VDF="$ROOT/dist/workshop-upload.vdf"
python3 -I - "$ROOT" "$CHANGENOTE" "$VDF" "$VISIBILITY" <<'PY'
import pathlib, re, sys
root, changenote, out, visibility = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
levels = {"public": "0", "friends": "1", "private": "2", "unlisted": "3"}
if visibility and visibility not in levels:
    sys.exit("visibility must be public, friends, private or unlisted")
description = (root / "workshop/description.bbcode").read_text(encoding="utf-8").strip()
for text, name in ((description, "description.bbcode"), (changenote, "the change note")):
    # Steam's VDF parser ends the value at a straight double quote and mangles backslashes.
    if '"' in text or "\\" in text:
        sys.exit(f"{name} contains a straight double quote or a backslash; use curly quotes instead")
vdf = (root / "workshop/workshop.vdf").read_text(encoding="utf-8")
if visibility:
    vdf = re.sub(r'("visibility"\s*)"\d"', lambda m: m.group(1) + '"' + levels[visibility] + '"', vdf)
elif not re.search(r'"publishedfileid"\s*"0"', vdf):
    # Updating an existing item: keep the visibility chosen on its Steam page.
    vdf = re.sub(r'\n\s*"visibility"[^\n]*', "", vdf)
vdf = (vdf.replace("@CONTENT@", str(root / "mod/settlement-gifting"))
          .replace("@DESCRIPTION@", description)
          .replace("@CHANGENOTE@", changenote))
pathlib.Path(out).write_text(vdf, encoding="utf-8")
PY
echo "Uploading with $VDF"
"$STEAMCMD" +login "$STEAM_USERNAME" +workshop_build_item "$VDF" +quit
