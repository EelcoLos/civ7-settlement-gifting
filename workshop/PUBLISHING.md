# Publishing to the Steam Workshop

Publish once the in-game checks in the plan's Verification section pass. The Steam account that
uploads must own Civilization VII, app 1295660.

The files here are `description.bbcode` for the page text, `preview.png` for the 640x640 preview
rendered from `preview.svg`, and `workshop.vdf` with the item id, title and visibility.
`scripts/upload_workshop.sh` fills in the rest of the VDF.

## First publish, once

Create the item one of two ways.

- **Workshop Uploader, on Windows.** Install "Sid Meier's Civilization VII Development Tools" from
  the Tools section of the Steam library and open its Workshop uploader. Create an item from the
  folder `mod/settlement-gifting`, from a clone or the unzipped release. Use the title
  `[1.5.0] Settlement Gifting`, the text of `description.bbcode`, the image `preview.png`, and
  private visibility.
- **SteamCMD, on Linux.** With `publishedfileid` still `"0"` in `workshop.vdf`, run
  `STEAM_USERNAME=<account> scripts/upload_workshop.sh --changenote "First release"`. This creates a
  private item without a preview.

Then:

1. Open the item under Steam, Workshop, Your Files, and accept the Workshop legal agreement if
   Steam asks for it.
2. Copy the id from the page address, the number after `?id=`, into `publishedfileid` in
   `workshop.vdf` and commit it. Every later upload updates that item.
3. On the item's page, add `preview.png` if it is missing, since SteamCMD cannot upload previews
   for Civilization VII items. Set tags such as Mod, UI and Diplomacy, and make the item public
   once tested.
4. Test the subscription. Delete the local copy from the Mods folder first, because two copies of
   one mod break screens. Subscribe, start a game, and check in `Logs/Modding.log` that the mod
   loads from `steamapps/workshop/content/1295660/<id>/`.

## Updates

- On GitHub, run Actions, Workshop update, with the branch or tag to upload and a change note.
- On Linux, run `STEAM_USERNAME=<account> scripts/upload_workshop.sh --changenote "<text>"`.

Updates leave the visibility set on the Steam page alone. Steam cuts the description and change
note off at a straight double quote or a backslash, so the script refuses both.

## Secrets for the workflow

1. On Linux, install SteamCMD with `sudo apt install steamcmd` or Valve's tarball, and log in once
   in a terminal: `steamcmd +login <account> +quit`. It asks for the password and a Steam Guard
   code.
2. Find the cached login with `find ~ -name config.vdf -path '*/config/config.vdf'`.
3. In the GitHub repository settings, add two Actions secrets: `STEAM_USERNAME`, and
   `STEAM_CONFIG_VDF` holding the output of `base64 -w0 <path to config.vdf>`.

The cached login expires now and then. When the workflow fails at login, repeat these steps.
Anyone who can edit this repository's workflows can read the secret and use the Steam account, so
keep write access to the repository limited.
