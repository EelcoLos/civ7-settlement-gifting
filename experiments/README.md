# Phase 0 experiments

The mod follows route A of [the plan](../docs/settlement-gifting-plan.md): a peacetime deal through
the game's own deal system. Nobody knows yet whether the engine allows that. These steps find out
on the Windows PC. Write the results into the "Phase 0 results" table of the plan.

Nothing in this folder ships to the Workshop.

## Preparation

1. In `%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VII\AppOptions.txt` set
   `UIDebugger 1`, `UILogLevel 3` and `EnableTuner 1`, then restart the game.
2. Install the mod with `scripts\deploy.ps1` from a clone of this repository, or unzip a release
   into `%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VII\Mods\`. Enable it under Add-Ons.
3. Start a Standard-speed single-player game and meet two AI leaders without going to war.
4. In the game, open `http://localhost:9444` in Chrome, pick the game UI view and paste
   [phase0-console.js](phase0-console.js) into its console. That defines `sg`. Run `sg.majors()`
   for the player ids, then `sg.watch()` so the console also logs the engine's answers to deals
   made in the mod's screen.

## E1 to E4: the deal at peace

| Step | How | What to record |
|---|---|---|
| E1 | Diplomacy screen of a leader at peace, click Offer Settlement. Then `sg.e1(id)`. | Does the screen list your settlements, or say the game offers none? `sg.e1` prints the engine's full lists for both players, capitals flagged, plus the gold and influence lumps. |
| E1b | Only if E1 listed no settlements: `sg.e1b(id)`. | Does a peace agreement in the deal unlock settlements? What item id did it get? |
| E2a | Move a town into the deal in the mod's screen, or run `sg.offer(id)`. | The AI's verdict in the screen, or the `[sg] DiplomacyStatement` line in the console. |
| E2b | Click Propose, or run `sg.offer(id, {propose: true})`. | The leader's answer, the `DiplomacyDealEnacted` and `CityTransfered` lines, the town's new owner, its unrest, the relationship afterwards. |
| E3 | Hotseat game with two humans at peace. Player 1 proposes a town to player 2 and ends the turn. | Does player 2 get the deal screen, or a notification that opens it? What does the notification say? Can they accept, and does the town move? |
| E4 | `sg.offer(id, {extras: ["theirGold"]})`, then `["myGold"]` and `["myInfluence"]`. | Does the AI's answer change with gold or influence on either side? |

Reading the results:

- E1 lists settlements and E2b moves the town: route A works. Go on with the Verification list in
  the plan.
- E1 is empty but E1b is not: the engine wants a peace agreement in the deal. Run
  `sg.offer(id, {peace: true, propose: true})` and check that a peace agreement between players at
  peace changes nothing else. If so, the mod needs a small change to add one to every deal.
- Both are empty, or E2b never moves the town: go to E5.

## E5: the transfer effect, route B

`sg-e5-transfer-test/` is a throwaway data mod with two diplomatic actions cloned from Demand
Tribute. Each tries `EFFECT_CITY_TRANSFER_OWNER` in a different way. Variant B may move every city
of the player who accepts, so use a test save.

1. Install it with `scripts\deploy.ps1 -E5` or by copying the folder into the Mods folder, enable
   it, and start a new hotseat game. It changes gameplay data, so it cannot join a running game.
2. Check `Logs\Database.log` for errors that mention `SG_E5`.
3. As player 1, open player 2's diplomacy screen and start "E5 test A" from the sanctions list,
   targeting one of player 2's settlements. End the turn, and accept as player 2.
4. Once the action completes, note which settlement changed owner and to whom. Repeat with "E5
   test B".

Expect failure. A settlement that moves to player 1 would make route B possible.

## E6: script API discovery, route C

`sg.e6()` lists the property names of `Game`, `Players`, `Cities` and their libraries in the UI
context, then the names that look like transfer methods. Gameplay scripts run in a different
context, so paste the `e6` function into FireTuner's console as well. FireTuner comes with the
SDK, Steam app 3688890, Windows only.

## Logs

All in `%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VII\Logs\`:

- `UI.log` has script errors, including lines that start with `[settlement-gifting]`.
- `Database.log` has data errors, which matters for E5.
- `Modding.log` shows which mods loaded.
