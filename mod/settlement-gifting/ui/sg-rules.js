// Pure decisions behind the settlement deal, kept free of game globals so
// test/sg-rules.test.js can run them in Node.

/** Minimum relationship setting, in dropdown order. */
export const MinRelationship = { ANY: 0, NEUTRAL: 1, FRIENDLY: 2, HELPFUL: 3, ALLIED: 4 };

const RELATIONSHIP_RANK = {
    PLAYER_RELATIONSHIP_NEUTRAL: MinRelationship.NEUTRAL,
    PLAYER_RELATIONSHIP_FRIENDLY: MinRelationship.FRIENDLY,
    PLAYER_RELATIONSHIP_HELPFUL: MinRelationship.HELPFUL
};

/**
 * @param {number} minimum one of MinRelationship
 * @param {string} relationship name from DiplomacyManager.getRelationshipTypeString, "" if unknown
 * @param {boolean} allied
 */
export function meetsRelationship(minimum, relationship, allied) {
    const rank = allied ? MinRelationship.ALLIED : RELATIONSHIP_RANK[relationship] ?? MinRelationship.ANY;
    return rank >= minimum;
}

/** Whether the settings let a settlement into the deal. city: {isTown, isCapital} */
export function settlementAllowed(city, settings) {
    if (city.isCapital && !settings.allowCapital) return false;
    if (!city.isTown && settings.townsOnly) return false;
    return true;
}

/**
 * The deal button for one leader in the diplomacy screen.
 * Returns null to hide it, "" when it can be used, or the LOC key of the reason it is disabled.
 */
export function dealButtonBlocker(state) {
    if (!state.enabled || !state.isMajor || !state.hasMet || state.atWar) return null;
    if (!state.turnActive) return "LOC_SG_BLOCKED_NOT_YOUR_TURN";
    if (state.dealPending) return "LOC_SG_BLOCKED_DEAL_PENDING";
    if (!state.relationshipOk) return "LOC_SG_BLOCKED_RELATIONSHIP";
    return "";
}

/**
 * The game setup toggle. Saves started before the mod was enabled have no value at all;
 * the feature is on for them, as it is by default for new games.
 */
export function isEnabledSetupValue(value) {
    return value !== false && value !== 0 && value !== "0";
}

/** Text for the middle of a new deal when none of the local player's settlements is listed. */
export function emptyDealHint(offeredByGame, shown) {
    if (shown > 0) return null;
    return offeredByGame > 0 ? "LOC_SG_DEAL_NONE_ALLOWED" : "LOC_SG_DEAL_NONE_FROM_GAME";
}
