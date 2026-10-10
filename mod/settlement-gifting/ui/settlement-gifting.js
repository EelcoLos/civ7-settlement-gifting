// Settlement Gifting: leaders at peace trade settlements through the game's own deal system.
// The base game opens its deal screen only to end a war. This adds an "Offer Settlement" button
// for leaders at peace and makes the screen work without a war. All hooks wrap named base methods
// (listed in the README) so a game update that renames one shows up as a single broken hook.
import DiplomacyManager, { TempDiplomacyActionType } from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import LeaderModelManager from '/base-standard/ui/diplomacy/leader-model-manager.js';
import '/base-standard/ui/diplomacy-peace-deal/panel-diplomacy-peace-deal.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { DialogBoxManager } from '/core/ui/dialog-box/manager-dialog-box.js';
import { DialogBoxAction } from '/core/ui/dialog-box/model-dialog-box.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { getSettings } from './sg-settings.js';
import { meetsRelationship, settlementAllowed, dealButtonBlocker, isEnabledSetupValue, emptyDealHint } from './sg-rules.js';

const SETUP_KEY = "SettlementGifting"; // ConfigurationKey in config/sg-config.xml

const RELATIONSHIP_LABELS = [
    "LOC_SG_OPTION_RELATIONSHIP_ANY",
    "LOC_SG_OPTION_RELATIONSHIP_NEUTRAL",
    "LOC_SG_OPTION_RELATIONSHIP_FRIENDLY",
    "LOC_SG_OPTION_RELATIONSHIP_HELPFUL",
    "LOC_SG_OPTION_RELATIONSHIP_ALLIED"
];

function otherDealPlayer() {
    return DiplomacyManager.currentDiplomacyDealData?.OtherPlayer ?? DiplomacyManager.selectedPlayerID;
}

/** The deal screen is ours whenever it opens between players at peace; the base game only opens it at war. */
function isSettlementDeal() {
    const them = otherDealPlayer();
    const diplomacy = Players.get(GameContext.localPlayerID)?.Diplomacy;
    return !!diplomacy && them != PlayerIds.NO_PLAYER && !diplomacy.isAtWarWith(them);
}

// ---------------------------------------------------------------------------------------------
// The "Offer Settlement" button

function createDealAction(them) {
    const me = GameContext.localPlayerID;
    const player = Players.get(me);
    const other = Players.get(them);
    const diplomacy = player?.Diplomacy;
    if (!player || !other || !diplomacy || them == me) return null;
    const settings = getSettings();
    const blocker = dealButtonBlocker({
        enabled: isEnabledSetupValue(Configuration.getGame().getValue(SETUP_KEY)),
        isMajor: other.isMajor && other.isAlive,
        hasMet: diplomacy.hasMet(them),
        atWar: diplomacy.isAtWarWith(them),
        turnActive: player.isTurnActive,
        dealPending: Game.DiplomacyDeals.hasPendingDeal(me, them),
        relationshipOk: meetsRelationship(
            settings.minRelationship,
            DiplomacyManager.getRelationshipTypeString(diplomacy.getRelationshipEnum(them)),
            diplomacy.hasAllied(them)
        )
    });
    if (blocker === null) return null;
    return {
        actionString: Locale.compose("LOC_SG_ACTION_NAME"),
        available: blocker == "",
        disabledTooltip: blocker ? Locale.compose(blocker, Locale.compose(RELATIONSHIP_LABELS[settings.minRelationship])) : "",
        Callback: () => InterfaceMode.switchTo("INTERFACEMODE_PEACE_DEAL"),
        audioString: "data-audio-propose-peace-release"
    };
}

const basePopulateActions = DiplomacyManager.populateDiplomacyActions;
DiplomacyManager.populateDiplomacyActions = function () {
    basePopulateActions.call(this);
    try {
        const action = createDealAction(this.selectedPlayerID);
        if (action) {
            const actions = this.diplomacyActions;
            const war = actions.findIndex((a) => a.action === TempDiplomacyActionType.DECLARE_WAR);
            actions.splice(war < 0 ? actions.length : war, 0, action);
        }
    } catch (e) {
        console.error("[settlement-gifting] diplomacy action failed:", e);
    }
};

// ---------------------------------------------------------------------------------------------
// The deal screen at peace

function setHeader(panel, title, subtitle) {
    const titleElement = panel.Root.querySelector(".peace-deal__title");
    if (titleElement) titleElement.innerHTML = Locale.compose(title);
    const subtitleElement = panel.Root.querySelector(".peace-deal__to-end");
    if (subtitleElement) subtitleElement.innerHTML = Locale.compose(subtitle);
}

function isInWorkingDeal(workingDealId, workingDeal, cityId) {
    return workingDeal.itemIds.some(
        (itemId) => Game.DiplomacyDeals.getWorkingDealItem(workingDealId, itemId)?.cityId?.id == cityId.id
    );
}

/** Lists the local player's settlements the game offers for the deal, filtered by the settings. */
function addSettlementChoices(panel, workingDealId, workingDeal, settings) {
    const me = GameContext.localPlayerID;
    const counts = { offered: 0, shown: 0 };
    for (const dealItem of Game.DiplomacyDeals.getPossibleWorkingDealItems(workingDealId, me, DiplomacyDealItemTypes.CITIES)) {
        if (!dealItem.cityId || dealItem.subType != DiplomacyDealItemCityTransferTypes.OFFER) continue;
        const city = Cities.get(dealItem.cityId);
        if (!city || (city.originalOwner == me && city.owner != me)) continue;
        counts.offered++;
        if (isInWorkingDeal(workingDealId, workingDeal, dealItem.cityId) || !settlementAllowed(city, settings)) continue;
        const element = panel.createCityDealItem(city);
        element.addEventListener("action-activate", () => panel.moveDealItem(dealItem, me, false, element));
        panel.ourYourDealItemsContainer?.appendChild(element);
        counts.shown++;
    }
    return counts;
}

// shortcut: a trimmed copy of the base populatePeaceDeal (no war lookup, no peace item, only your own
// settlements listed); compare it with panel-diplomacy-peace-deal.js after every game update.
function populateSettlementDeal(panel) {
    const me = GameContext.localPlayerID;
    const them = otherDealPlayer();
    const localPlayer = Players.get(me);
    const otherPlayer = Players.get(them);
    const otherLeaderType = Configuration.getPlayer(them)?.leaderTypeName;
    if (!localPlayer || !otherPlayer || !otherLeaderType) {
        console.error("[settlement-gifting] cannot open a deal with player " + them);
        return;
    }
    const incoming = DiplomacyManager.currentDiplomacyDealData;

    setHeader(panel, "LOC_SG_DEAL_TITLE", "LOC_SG_DEAL_SUBTITLE");
    const relationship = panel.Root.querySelector(".peace-deal__war-name");
    if (relationship) relationship.innerHTML = Locale.compose(localPlayer.Diplomacy?.getRelationshipLevelName(them) ?? "");

    panel.otherPlayerReceivesTitle = MustGetElement(".peace-deal__other-player-receives-title", panel.Root);
    const iconWrapper = MustGetElement(".peace-deal__other-player-receives-icon-wrapper", panel.Root);
    removeAllChildren(iconWrapper);
    const leaderIcon = document.createElement("leader-icon");
    leaderIcon.classList.add("w-8", "h-8", "pointer-events-auto");
    leaderIcon.setAttribute("leader", otherLeaderType);
    leaderIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(them));
    leaderIcon.setAttribute("fg-color", "white");
    iconWrapper.appendChild(leaderIcon);
    MustGetElement(".peace-deal__other-player-receives-title-wrapper", panel.Root).style.setProperty(
        "--other-player-color",
        UI.Player.getPrimaryColorValueAsString(them)
    );
    panel.otherPlayerReceivesTitle.innerHTML =
        Locale.compose(otherPlayer.leaderName) + " " + Locale.compose("LOC_DIPLOMACY_PEACE_DEAL_RECEIVES");

    panel.proposeButton?.classList.remove("disabled");
    panel.rejectButton?.classList.remove("disabled");
    for (const container of [
        panel.ourYourDealItemsContainer,
        panel.theirTheirDealItemsContainer,
        panel.ourTheirDealItemsContainer,
        panel.theirYourDealItemsContainer
    ]) {
        if (container) removeAllChildren(container);
    }
    panel.realizePlayerVisuals(localPlayer, otherPlayer);

    // Clears the AI's verdict on an earlier deal; the placeholder keeps the row at its usual height.
    const inspectWrapper = MustGetElement(".panel-diplomacy-peace-deal__inspect-wrapper", panel.Root);
    removeAllChildren(inspectWrapper);
    inspectWrapper.classList.remove("peace-deal__accept-color", "peace-deal__reject-color");
    const placeholder = document.createElement("div");
    placeholder.classList.value = "size-12";
    inspectWrapper.appendChild(placeholder);

    panel.selectSettlementText = panel.Root.querySelector(".peace-deal__select-settlements");
    panel.selectSettlementText?.setAttribute("data-l10n-id", "LOC_DIPLOMACY_PEACE_DEAL_SELECT_SETTLEMENTS");

    const workingDealId = incoming
        ? incoming.WorkingDealID
        : { direction: DiplomacyDealDirection.OUTGOING, player1: me, player2: them };
    panel.setWorkingDealID(workingDealId);
    panel.isNewDeal = !incoming;
    if (panel.isNewDeal) {
        // shortcut: no peace agreement in the deal; if Phase 0 shows the engine needs one (E1b), add it here.
        Game.DiplomacyDeals.clearWorkingDeal(workingDealId);
        panel.proposeButton?.setAttribute("caption", Locale.compose("LOC_DIPLOMACY_DEAL_PROPOSE"));
        panel.rejectButton?.setAttribute("caption", Locale.compose("LOC_GENERIC_CANCEL"));
    } else {
        panel.proposeButton?.setAttribute("caption", Locale.compose("LOC_GENERIC_ACCEPT"));
        panel.rejectButton?.setAttribute("caption", Locale.compose("LOC_DIPLOMACY_DEAL_REJECT"));
    }
    const workingDeal = Game.DiplomacyDeals.getWorkingDeal(workingDealId);
    if (!workingDeal) {
        console.error("[settlement-gifting] no working deal with player " + them);
        return;
    }

    // Settlements already in the deal, when answering an offer.
    for (const itemId of workingDeal.itemIds) {
        const dealItem = Game.DiplomacyDeals.getWorkingDealItem(workingDealId, itemId);
        if (!dealItem?.cityId || dealItem.cityId.id == -1) continue;
        const city = Cities.get(dealItem.cityId);
        if (!city) continue;
        const element = panel.createCityDealItem(city, dealItem.cityTransferType);
        element.addEventListener("action-activate", () => panel.moveDealItem(dealItem, dealItem.to, true, element));
        let fromLocalPlayer = city.owner == me;
        if (dealItem.subType == DiplomacyDealItemCityTransferTypes.CEDE_OCCUPIED) fromLocalPlayer = !fromLocalPlayer;
        if (fromLocalPlayer) {
            panel.theirYourDealItemsContainer?.appendChild(element);
            panel.otherPlayerReceivesTitleWrapper?.classList.remove("hidden");
        } else {
            panel.ourTheirDealItemsContainer?.appendChild(element);
            panel.localPlayerReceivesTitleWrapper?.classList.remove("hidden");
        }
    }
    panel.populateGoldInfluenceItems(workingDealId, workingDeal, me, panel.ourYourDealItemsContainer);
    panel.populateGoldInfluenceItems(workingDealId, workingDeal, them, panel.theirTheirDealItemsContainer);
    const settlements = addSettlementChoices(panel, workingDealId, workingDeal, getSettings());

    panel.updateButtonStates();
    panel.showLeaderModel(false);
    // Unlike the base game, a new deal is not inspected while it is still empty.
    if (panel.pendingDealAdditions.length > 0 || panel.pendingDealRemovals.length > 0) {
        panel.inspectCurrentDeal(otherPlayer.isHuman);
    }
    if (!panel.ourTheirDealItemsContainer?.hasChildNodes()) panel.localPlayerReceivesTitleWrapper?.classList.add("hidden");
    if (!panel.theirYourDealItemsContainer?.hasChildNodes()) panel.otherPlayerReceivesTitleWrapper?.classList.add("hidden");

    const hint = panel.isNewDeal ? emptyDealHint(settlements.offered, settlements.shown) : null;
    if (hint) panel.selectSettlementText?.setAttribute("data-l10n-id", hint);
}

function outgoingSettlementNames(workingDealId) {
    const workingDeal = workingDealId ? Game.DiplomacyDeals.getWorkingDeal(workingDealId) : null;
    const names = [];
    for (const itemId of workingDeal?.itemIds ?? []) {
        const dealItem = Game.DiplomacyDeals.getWorkingDealItem(workingDealId, itemId);
        const city = dealItem?.cityId && dealItem.cityId.id != -1 ? Cities.get(dealItem.cityId) : null;
        if (city && city.owner == GameContext.localPlayerID) names.push(Locale.compose(city.name));
    }
    return names;
}

function patchDealPanel(proto) {
    const basePopulate = proto.populatePeaceDeal;
    proto.populatePeaceDeal = function () {
        if (!isSettlementDeal()) {
            // The same panel may have shown a settlement deal before.
            setHeader(this, "LOC_DIPLOMACY_DEAL_PEACE_TITLE", "LOC_DIPLOMACY_PEACE_DEAL_TO_END");
            return basePopulate.call(this);
        }
        try {
            populateSettlementDeal(this);
        } catch (e) {
            console.error("[settlement-gifting] deal screen failed:", e);
        }
    };

    const baseClickPropose = proto.clickProposeButton;
    proto.clickProposeButton = function () {
        if (this.proposeButton?.classList.contains("disabled") || !isSettlementDeal() || !getSettings().confirm) {
            return baseClickPropose.call(this);
        }
        const leaving = outgoingSettlementNames(this.currentWorkingDealID);
        if (leaving.length == 0) {
            return baseClickPropose.call(this);
        }
        DialogBoxManager.createDialog_ConfirmCancel({
            title: "LOC_SG_CONFIRM_TITLE",
            body: Locale.compose(
                "LOC_SG_CONFIRM_BODY",
                leaving.join(", "),
                Locale.compose(Players.get(otherDealPlayer())?.name ?? "")
            ),
            canClose: false,
            callback: (action) => {
                if (action == DialogBoxAction.Confirm) baseClickPropose.call(this);
            }
        });
    };

    const baseClickBackToMap = proto.clickBackToMap;
    proto.clickBackToMap = function () {
        baseClickBackToMap.call(this);
        if (!isSettlementDeal()) return;
        // shortcut: the base method adds its "Back To Peace Deal" button after this same delay and
        // equal timers run in order; if the old caption still shows in the game, hook the button instead.
        setTimeout(
            () => this.backToDealButton?.setAttribute("caption", "LOC_SG_BACK_TO_DEAL"),
            LeaderModelManager.MAX_LENGTH_OF_ANIMATION_EXIT
        );
    };
}

const DealPanel = Controls.getDefinition("panel-diplomacy-peace-deal")?.createInstance;
if (DealPanel) {
    patchDealPanel(DealPanel.prototype);
} else {
    console.error("[settlement-gifting] panel-diplomacy-peace-deal not found; the deal screen is unchanged");
}
