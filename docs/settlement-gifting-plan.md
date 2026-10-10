# Plan: giving a settlement to another player as a diplomatic act (Civ7 1.5.0)

Written 2026-10-10 from the game files in `reference/`, a copy of `Base/modules` of game
version 1.5.0. Route A was built the same day as `mod/settlement-gifting` v0.1.0, on a
machine without the game, so nothing has run in the game yet. See the status below.

## Status (2026-10-10)

Built:

- The route A mod as designed below, with the setup toggle and the in-game options.
- The Phase 0 kit in `experiments/`: a DevTools console script for E1, E1b, E2, E4 and E6, the
  E5 throwaway data mod, and step-by-step instructions in `experiments/README.md`.
- Packaging, the Workshop text and preview, and the release and Workshop workflows. The README
  describes them.

Not done yet is every in-game check. Phase 0 comes first, and the mod itself is the E1 to E3 test.

Found while building, and how the mod handles it:

1. The deal panel needs a war. `populatePeaceDeal` looks up the war's joint event, its war data
   and its project data, and returns with an error when there is none, at
   `panel-diplomacy-peace-deal.js:478-516`. The receiving player's screen goes through the same
   method, so a patch around lines 524-537 is not enough. At peace the mod runs its own trimmed
   copy of the method instead. The copy calls the panel's other methods, has no war lookup and
   adds no peace agreement. At war the base method runs unchanged.
2. `onAttach` sets the header to "Peace Deal" and "To End" once. The mod sets its own header each
   time it fills the screen at peace, shows the relationship where the war name was, and restores
   the base header for war deals. `clickBackToMap` names its button "Back To Peace Deal", and the
   mod renames it.
3. The base screen sends INSPECT for a new deal at once, because its deal always holds a peace
   item. A new settlement deal starts empty, so the mod skips that first INSPECT. Every change to
   the deal still sends one.
4. The AI's generic answer "I accept this proposal for peace!", `LOC_DIPLO_MAKE_DEAL_ACCEPTED_GENERIC`,
   only appears for leaders without their own line. All 19 base leaders have one, so the mod
   leaves it alone.
5. The incoming-deal notification texts, `LOC_DIPLOMACY_MAKE_DEAL_NOTIFICATION_*`, say "peace
   deal". E3 shows whether the engine uses them for a deal at peace.
6. The setup toggle defaults to on. A save without the value, because the mod was added mid-game,
   counts as on.
7. The in-game options default to minimum relationship Any, towns only off, capitals off and
   confirmation on. Only the on/off toggle is per game. The screen lists both leaders'
   settlements, gold and influence, as the base peace deal does, so a deal can also ask for the
   other leader's settlements. Towns only and capitals apply to both sides.
8. The first try in the game showed no Offer Settlement button. The modinfo listed only
   `ui/settlement-gifting.js` in UIScripts, and the game probably does not load a mod file the
   modinfo does not name, so the two modules it imports were missing and nothing ran. All three
   files are now listed, as Leonardfactory's UI mod does with its modules. Not yet confirmed.

### Phase 0 results

| Exp | Date | Result | Notes |
|---|---|---|---|
| E1 | | | |
| E1b | | | |
| E2 | | | |
| E3 | | | |
| E4 | | | |
| E5 | | | |
| E6 | | | |

## Goal

Let a player hand one of their settlements to another player in peacetime, through diplomacy,
with a game-setup toggle that turns the feature on. Human-to-human must work; AI-to-human is a
bonus; the AI giving cities away is out of scope because AI deal evaluation lives in the engine.

## What the game files establish

Cities change hands in exactly these places:

- Peace deals. The engine's deal system (`Game.DiplomacyDeals`) supports city items, with
  subtypes OFFER (your own city) and CEDE_OCCUPIED (a city you occupy). The shipped UI uses it
  only in `base-standard/ui/diplomacy-peace-deal/panel-diplomacy-peace-deal.js`, which is pushed
  only while at war (`diplomacy-manager.js:679-747`) and always adds a MAKE_PEACE agreement item
  first (lines 524-537).
- Capture. `CityCommandTypes.DESTROY` with directives KEEP, RAZE, LIBERATE_FOUNDER and
  LIBERATE_PREVIOUS_OWNER (`model-city-capture-chooser.js`). The recipient is fixed.
- City-state incorporation (`EFFECT_DAE_INCORPORATE_CITY_STATE`) and a Modern-age great person
  (`EFFECT_GRANT_CITY_FROM_CITY_STATE_PLOT`).
- One data effect, `EFFECT_CITY_TRANSFER_OWNER`, used once: narrative crisis LOYALTY001B gives
  you a foreign city that revolts (`base-standard/data/narrative-crises-stories-gameeffects.xml:3`,
  collection `COLLECTION_ANY_CITY_AT_STORY`, argument `TransferType` = BY_REVOLT). Known transfer
  types anywhere: BY_COMBAT, BY_REVOLT, BY_INCORPORATE_CITY_STATE.

Diplomatic actions are data rows (`DiplomacyActions`, `DiplomaticProjects_UI_Data`,
`DiplomaticActionStages`, `EnterStageModifiers`, `DiplomaticActionResponses`,
`DiplomaticActionInfluenceCosts`, `DiplomaticActionValidTokens`, `DiplomacyBonusEnvoyData`,
AI weights in `AiFavoredItems`). The UI lists and starts them generically. Their behavior,
however, comes from one of 28 engine `PlayerOperationType` values. Five of those target a
settlement of the other player (`Target2Type="DIPLOMACY_TARGET_SETTLEMENT"`): OPEN_THE_GATES,
CONVERT_POPULATION, SABOTAGE_WORKERS, CREATE_TREASURE_FLEET and DEMAND_TRIBUTE.
DEMAND_TRIBUTE also has accept/reject response rows, so the engine already supports "the target
player decides" (`age-exploration/data/diplomacy-actions.xml:61-62, 173-174`).

Effects can be attached to the other player on acceptance through
`EFFECT_DAE_TARGET_ATTACH_MODIFIER` with argument `TargetPlayerAccept` (`base-standard/data/
diplomacy-gameeffects.xml:32-36`). Useful collections: `COLLECTION_OWNER`,
`COLLECTION_PLAYER_CITIES`, `COLLECTION_OWNER_CITY`, `COLLECTION_ALL_CITIES`. There is no
collection meaning "the settlement this action targets"; the espionage effects that act on the
target settlement do so inside the engine (`EFFECT_DAE_ESPIONAGE_CONVERT_SETTLEMENT` uses
`COLLECTION_OWNER`).

Scripts cannot help on their own. The shipped gameplay scripts only run at map generation and at
age transition, the documented `ScenarioScripts` action has no example, nothing bridges UI
scripts and gameplay scripts, and the gameplay API is unknown beyond what shipped code calls.
FireTuner (part of the SDK, Steam app 3688890, Windows only) is the tool for probing it.

Game-setup toggles are fully data-driven: a `Domain="bool"` row in `Parameters` (shell-scope
`UpdateDatabase`) shows up under Advanced Options > Game Settings on its own. Gameplay data is
gated with the officially documented `ConfigurationValueMatches` criterion, which no base file
uses, so it needs one in-game check. Scripts and UI can read the value with
`Configuration.getGameValue` / `Configuration.getGame().getValue`.

Side effects the engine applies to any transfer: 15 unrest for 10 turns
(`StandardCityTransferUnrest` in `base-standard/data/happiness-identity.xml:18`), the city
property `LastTransferType`, the `CityTransfered` engine event, and the settlement cap.

## Candidate mechanisms

**A. Peacetime deal (UI-only mod).** Reuse the engine deal system outside war: build a working
deal with a city OFFER item and no MAKE_PEACE item, send it, let the receiver accept. Engine
validated and multiplayer synced by construction. Unknowns: whether the engine lists city items
at peace, whether it accepts a deal without MAKE_PEACE, how the AI answers, and whether a human
receiver gets a usable incoming-deal screen at peace.

**B. Diplomatic action (data plus small UI).** A "Request settlement" action started by the
receiver, targeting one of the giver's settlements through a settlement-targeting operation
type, with accept/reject responses, and a completion-stage modifier that transfers the city.
Native UI, AI weighting, per-age data. Unknown: whether `EFFECT_CITY_TRANSFER_OWNER` can be
pointed at the action's target settlement and recipient at all. Probably not; test anyway.

**C. Gameplay script.** Only if FireTuner reveals a city-transfer API and a usable trigger
(an event the script receives, or a property the UI can set and the script can read). Long
shot: no shipped script does anything like it.

## Phase 0: experiments (Windows PC, each under an hour)

Preparation: in `AppOptions.txt` set `EnableTuner 1`, `UIDebugger 1`, `UILogLevel 3`; install
the SDK for FireTuner; open Chrome DevTools on `localhost:9444` while in a game. Use a
Standard-speed single-player game with two AI civs you have met, plus a hotseat game with two
humans for E3. Remember `console.error` reaches `Logs/UI.log`; `console.log` may not.

E1, city items at peace. In the DevTools console:

```js
const me = GameContext.localPlayerID, them = 1; // pick a met, peaceful major
const deal = { direction: DiplomacyDealDirection.OUTGOING, player1: me, player2: them };
Game.DiplomacyDeals.clearWorkingDeal(deal);
Game.DiplomacyDeals.getPossibleWorkingDealItems(deal, me, DiplomacyDealItemTypes.CITIES);
```

Empty result: the engine refuses city items at peace. Then try E1b: add
`{ type: DiplomacyDealItemTypes.AGREEMENTS, agreementType: DiplomacyDealItemAgreementTypes.MAKE_PEACE }`
first and query again; if that unlocks cities, route A needs the engine to tolerate a peace
agreement between players already at peace, which E2 will show. Non-empty result: continue.

E2, propose at peace. Add one OFFER item from the E1 list with
`Game.DiplomacyDeals.addItemToWorkingDeal(deal, item)`, then
`Game.DiplomacyDeals.sendWorkingDeal(deal, DiplomacyDealProposalActions.INSPECT)` and read the
answer that arrives as a `DiplomacyStatement` engine event (the UI wraps it in
`DiplomacyDealProposalResponseEvent`, `diplomacy-manager.js:333-336`). Then send `PROPOSED` and
watch for `DiplomacyDealEnacted` and `CityTransfered` (`core/data/gamecore-events.xml`). Record
whether the AI accepts a free city, what happens to relationship, and whether the city appears
with unrest.

E3, human receiver. In hotseat, propose from player one, end turn, and check whether player two
sees the incoming deal screen and can accept. The deal manager routes incoming deals into the
peace-deal panel (`handleDealStatement`, `diplomacy-manager.js:333-353`); note any war-only
assumptions in that panel (title, mandatory peace item) as cosmetic or blocking.

E4, sweeteners. Repeat E2 with GOLD and INFLUENCE items in both directions to see whether the
AI's INSPECT answer changes. This tells whether a general peacetime trade screen is viable.

E5, the transfer effect. Build a throwaway data mod: clone the DEMAND_TRIBUTE rows into
`DIPLOMACY_ACTION_TEST_GIFT` (same `PlayerOperationType`, `Target2Type` settlement, accept and
reject responses), and give its COMPLETE stage an `EnterStageModifiers` row pointing at a
modifier with `effect="EFFECT_CITY_TRANSFER_OWNER"`, `TransferType` BY_REVOLT, first on
`COLLECTION_OWNER`, then as a `TargetPlayerAccept` modifier through
`EFFECT_DAE_TARGET_ATTACH_MODIFIER` with `COLLECTION_PLAYER_CITIES`. Check `Database.log` for
load errors, run the action, and record which city moved and to whom. Expect failure; the
result settles route B either way.

E6, script API discovery. From FireTuner (or a `ScenarioScripts` probe that only logs), dump
`Object.getOwnPropertyNames` of `Cities.get(id)`, `Players.get(id)`, `Players.get(id).Cities`
and `Game`, and list which `engine.on` event names fire in that context during a turn. Look for
owner, transfer or capture methods. Record findings in this file.

Decision rule: A passes E1 to E3, build A. Otherwise B if E5 moved the chosen city to the
chosen player. Otherwise C only if E6 found both an API and a trigger. Otherwise stop and keep
this document as the record.

## Phase 1, route A design (the likely outcome)

- Mod id `settlement-gifting`, UI-only payload plus a config XML for the setup toggle;
  same packaging, Workshop and CI setup as the research-queue plan.
- Entry point: a "Propose deal" or "Gift settlement" action in the player diplomacy panel,
  added where `DiplomacyManager.populateDiplomacyActions` builds the list, shown only when the
  setup toggle is on, the players are at peace, and (setting) the relationship is at least
  Friendly.
- Deal screen: reuse `panel-diplomacy-peace-deal`. Push it with a flag that skips the
  MAKE_PEACE item and swaps the title; the panel already lists own cities as OFFER items, gold
  and influence items, the AI INSPECT preview, and the send button. One prototype patch around
  the working-deal creation (lines 524-537) is enough. The receiver side already works through
  `handleDealStatement`. (Wrong: the panel also needs a war; see Status, item 1.)
- Settings: a game-setup bool parameter (shell-scope `UpdateDatabase`), plus in-game options in
  the shared "mods" options tab: minimum relationship, towns only or cities too, allow or block
  the capital if the engine allows it at all, confirmation dialog.
- Data: none required. The transfer unrest is engine behavior tied to any transfer and cannot be
  limited to gifts by data, so leave it and document it.
- Multiplayer: deals are engine-synced; hotseat needs the E3 result; network play needs a
  two-client test as in the research-queue plan.
- AI: acceptance is engine-side and cannot be modded; the AI never initiates a gift.

Verification: toggle on and off in setup; gift a town and a city to a human and to an AI; AI
INSPECT answers with and without gold; relationship and unrest after the transfer; save, load;
age transition; both players with the mod and only one player with it; the deal screen never
offers MAKE_PEACE at peace and never appears for players at war beyond the vanilla flow.

## Phase 1, route B outline (only if E5 passed)

Rows per age module: `Types` (KIND_DIPLOMACY_ACTION), `DiplomacyActions`,
`DiplomaticProjects_UI_Data`, `DiplomaticActionStages`, `EnterStageModifiers`,
`DiplomaticActionResponses`, `DiplomaticActionInfluenceCosts`, `DiplomaticActionValidTokens`,
`DiplomacyBonusEnvoyData`, `AiFavoredItems`, text. Gate everything on the setup toggle with
`ConfigurationValueMatches`. The UI needs nothing unless the action should hide the "demand"
wording. Verify the target list the engine offers (it is the other player's settlements, so the
receiver initiates and the giver accepts).

## Risks and unknowns

| Risk | Where it bites | Fallback |
|---|---|---|
| Engine lists no city items at peace | Route A, E1 | Route B, then C, then stop |
| Engine rejects deals without MAKE_PEACE | Route A, E2 | Include MAKE_PEACE and test whether a peace agreement at peace is a no-op |
| Receiver UI assumes war | Route A, E3 | Patch the panel title and item list; worst case a small custom incoming-deal popup |
| AI rejects every gift | Route A | Document as human-to-human feature |
| `EFFECT_CITY_TRANSFER_OWNER` ignores action targets | Route B, E5 | Drop route B |
| `ConfigurationValueMatches` unsupported | Setup toggle | Read the config value in UI code instead and skip the data part |
| In-game rebinding or patches change the diplomacy panels (1.4.0 rewrote much UI) | All routes | Keep hooks to named methods and list them in the README |

## Related

- Research-queue plan: `a local plan file`
  (packaging, Workshop, CI and settings patterns to reuse).
- Research reports behind this document were produced on 2026-10-10 from `reference/`; the
  memory note `civ7-modding-boundaries` summarizes them.
