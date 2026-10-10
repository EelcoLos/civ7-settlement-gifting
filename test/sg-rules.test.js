import { test } from "node:test";
import assert from "node:assert/strict";
import {
    MinRelationship,
    meetsRelationship,
    settlementAllowed,
    dealButtonBlocker,
    isEnabledSetupValue,
    emptyDealHint
} from "../mod/settlement-gifting/ui/sg-rules.js";

test("relationship minimum", () => {
    assert.equal(meetsRelationship(MinRelationship.ANY, "PLAYER_RELATIONSHIP_HOSTILE", false), true);
    assert.equal(meetsRelationship(MinRelationship.ANY, "", false), true);
    assert.equal(meetsRelationship(MinRelationship.NEUTRAL, "PLAYER_RELATIONSHIP_UNFRIENDLY", false), false);
    assert.equal(meetsRelationship(MinRelationship.NEUTRAL, "PLAYER_RELATIONSHIP_NEUTRAL", false), true);
    assert.equal(meetsRelationship(MinRelationship.FRIENDLY, "PLAYER_RELATIONSHIP_NEUTRAL", false), false);
    assert.equal(meetsRelationship(MinRelationship.FRIENDLY, "PLAYER_RELATIONSHIP_HELPFUL", false), true);
    assert.equal(meetsRelationship(MinRelationship.ALLIED, "PLAYER_RELATIONSHIP_HELPFUL", false), false);
    assert.equal(meetsRelationship(MinRelationship.ALLIED, "PLAYER_RELATIONSHIP_NEUTRAL", true), true);
});

test("settlement filter", () => {
    const rules = { townsOnly: false, allowCapital: false };
    assert.equal(settlementAllowed({ isTown: true, isCapital: false }, rules), true);
    assert.equal(settlementAllowed({ isTown: false, isCapital: false }, rules), true);
    assert.equal(settlementAllowed({ isTown: false, isCapital: true }, rules), false);
    assert.equal(settlementAllowed({ isTown: false, isCapital: true }, { ...rules, allowCapital: true }), true);
    assert.equal(settlementAllowed({ isTown: false, isCapital: false }, { ...rules, townsOnly: true }), false);
    assert.equal(settlementAllowed({ isTown: true, isCapital: false }, { ...rules, townsOnly: true }), true);
});

test("deal button", () => {
    const ready = {
        enabled: true, isMajor: true, hasMet: true, atWar: false,
        turnActive: true, dealPending: false, relationshipOk: true
    };
    assert.equal(dealButtonBlocker(ready), "");
    assert.equal(dealButtonBlocker({ ...ready, enabled: false }), null);
    assert.equal(dealButtonBlocker({ ...ready, isMajor: false }), null);
    assert.equal(dealButtonBlocker({ ...ready, hasMet: false }), null);
    assert.equal(dealButtonBlocker({ ...ready, atWar: true }), null);
    assert.equal(dealButtonBlocker({ ...ready, turnActive: false }), "LOC_SG_BLOCKED_NOT_YOUR_TURN");
    assert.equal(dealButtonBlocker({ ...ready, dealPending: true }), "LOC_SG_BLOCKED_DEAL_PENDING");
    assert.equal(dealButtonBlocker({ ...ready, relationshipOk: false }), "LOC_SG_BLOCKED_RELATIONSHIP");
});

test("setup toggle", () => {
    assert.equal(isEnabledSetupValue(true), true);
    assert.equal(isEnabledSetupValue(undefined), true);
    assert.equal(isEnabledSetupValue(null), true);
    assert.equal(isEnabledSetupValue(false), false);
    assert.equal(isEnabledSetupValue(0), false);
    assert.equal(isEnabledSetupValue("0"), false);
});

test("empty deal hint", () => {
    assert.equal(emptyDealHint(3, 1), null);
    assert.equal(emptyDealHint(3, 0), "LOC_SG_DEAL_NONE_ALLOWED");
    assert.equal(emptyDealHint(0, 0), "LOC_SG_DEAL_NONE_FROM_GAME");
});
