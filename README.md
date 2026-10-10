# Settlement Gifting

A Civilization VII mod that lets you give a town or city to another leader while you are at peace,
or ask for one of theirs. It adds an **Offer Settlement** button to the diplomacy screen of every
leader you are at peace with. The button opens the game's own deal screen, which the base game
only uses to end wars. At peace the deal holds no peace agreement, and the header shows your
relationship where the war name would be.

Mod id `settlement-gifting`, version 0.1.0, built for game version 1.5.0, MIT license.

## Status

Written from the game's files on a machine without the game, and **not yet run in the game**. The
engine may refuse settlements in a deal at peace. [experiments/README.md](experiments/README.md)
lists the checks that settle it, which are Phase 0 of [the plan](docs/settlement-gifting-plan.md).
The mod itself is the main test.

## Using it

- Open the diplomacy screen of a leader you have met and are at peace with, and click
  **Offer Settlement**.
- Click settlements, gold or influence on either side to move them into the deal, and click again
  to take them out. Both leaders' settlements are listed, as in a peace deal, so a deal can also
  ask for one of theirs. An AI leader's verdict updates with each change.
- Propose sends the deal. A human receiver gets the same screen with Accept and Reject, and can
  change the deal before sending it back.
- The button is greyed out, with the reason in its tooltip, when it is not your turn, when a deal
  with that leader is still pending, or when your relationship is below the minimum you set.

## Settings

To play a game without the mod, tick No Settlement Gifting under Advanced Options, Game Options
when you set it up. It is unticked by default, and saves made before the mod have it off too.

Each player sets the rest under Options, Mods, Settlement Gifting:

| Option | Default | Effect |
|---|---|---|
| Minimum Relationship | Any, at peace | Neutral, friendly, helpful or allies only before the button works |
| Towns Only | off | Cities are not listed |
| Include Capitals | off | Capitals are listed, though the game may still refuse them |
| Confirm Before Giving | on | Asks before sending or accepting a deal that gives away your settlements |

## Install

- The Steam Workshop item does not exist yet.
- By hand, unzip a release into `%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VII\Mods\`
  on Windows or `~/My Games/Sid Meier's Civilization VII/Mods/` on Linux, and enable the mod
  under Add-Ons.
- On Windows, from a clone: `powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1`.

The mod only changes the UI and sets `AffectsSavedGames` to 0, so you can add it to a save or
remove it. Every player in a multiplayer game needs it. The base deal screen cannot show a deal at
peace, so a player without the mod would get an empty screen.

## Limits

- The game decides whether an AI accepts, and the AI never offers a settlement by itself.
- The game data has a transfer unrest, `StandardCityTransferUnrest` (amount 15 for 10 turns,
  scaled by game speed). In the first test a gifted city showed none to the giver; whether the
  receiver gets it is still unchecked.
- English only. Every string is a `LOC_` key in `text/en_us/`, so a translation is one more file.

## How it works

Everything lives in `mod/settlement-gifting/ui/`:

- `settlement-gifting.js` wraps five named base-game methods:
  - `DiplomacyManager.populateDiplomacyActions` adds the button.
  - `populateAvailableActions` of `panel-other-player-diplomacy-actions` gives the button a line of
    its own, since the game sized that row for two buttons.
  - `populatePeaceDeal` of `panel-diplomacy-peace-deal` fills the screen when the two players are
    at peace, and runs the base method otherwise.
  - `clickProposeButton` asks for confirmation before settlements leave.
  - `clickBackToMap` renames the base screen's "Back To Peace Deal" button.
- `sg-settings.js` adds the options to a shared Mods tab and stores them with `UI.setOption`.
- `sg-rules.js` holds the decisions that need no game objects, and `test/sg-rules.test.js` tests
  them.

The setup option is one `Parameters` row in `config/sg-config.xml`, which the script reads with
`Configuration.getGame().getValue("NoSettlementGifting")`. When a game update breaks the mod,
look at the five methods above first.

## Development

- `npm test` runs the unit tests with Node 22 or newer.
- `scripts/package.sh` builds `dist/settlement-gifting-<version>.zip`.
- For in-game debugging, set `UIDebugger 1` and `UILogLevel 3` in `AppOptions.txt`. Chrome
  DevTools then connects at `localhost:9444`, and logs go to the `Logs` folder next to
  `AppOptions.txt`.
- `reference/` links to the shared copy of the game's `Base/modules` and stays out of git. Create
  it with `ln -s ../civ7-reference reference`.

To release, bump `<Version>` in the modinfo and `CHANGELOG.md`, then push the tag `v<version>`. The
`version` attribute of `<Mod>` stays a whole number, as in every modinfo that loads. The
Release workflow runs the tests, zips the mod and publishes a GitHub release.
[workshop/PUBLISHING.md](workshop/PUBLISHING.md) covers Workshop uploads.

## Layout

```
mod/settlement-gifting/   the mod as it ships: modinfo, config, text, ui, LICENSE
test/                           unit tests for ui/sg-rules.js
experiments/                    Phase 0 kit: console probes, E5 test mod, instructions
docs/                           the plan, with status and Phase 0 results
scripts/                        package.sh, deploy.ps1, upload_workshop.sh
workshop/                       Workshop description, preview, VDF template, PUBLISHING.md
.github/workflows/              release.yml on tags v*, workshop.yml by hand
```
