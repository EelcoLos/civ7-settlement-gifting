// Phase 0 probes for docs/settlement-gifting-plan.md (E1, E1b, E2, E4, E6).
// Paste this whole file into the Chrome DevTools console of the game UI while a game is loaded
// (AppOptions.txt: UIDebugger 1, then open http://localhost:9444 and pick the game view).
// It defines window.sg; see experiments/README.md for the order of the calls.
(() => {
    const me = () => GameContext.localPlayerID;
    const dealWith = (them) => ({ direction: DiplomacyDealDirection.OUTGOING, player1: me(), player2: them });
    const enumName = (values, value) => Object.keys(values).find((key) => values[key] === value) ?? value;
    const possible = (deal, player, type) =>
        Array.from(Game.DiplomacyDeals.getPossibleWorkingDealItems(deal, player, type) ?? []);
    const cityLabel = (cityId) => {
        const city = Cities.get(cityId);
        if (!city) return "unknown city " + JSON.stringify(cityId);
        return Locale.compose(city.name) + (city.isCapital ? " (capital)" : "") + (city.isTown ? " (town)" : " (city)");
    };
    const describe = (item) => ({
        type: enumName(DiplomacyDealItemTypes, item.type),
        subType: item.type == DiplomacyDealItemTypes.CITIES
            ? enumName(DiplomacyDealItemCityTransferTypes, item.subType)
            : item.subType,
        from: item.from,
        to: item.to,
        city: item.cityId ? cityLabel(item.cityId) : undefined,
        amount: item.amount,
        isValid: item.isValid
    });
    const dealItems = (deal) =>
        Array.from(Game.DiplomacyDeals.getWorkingDeal(deal)?.itemIds ?? []).map((id) =>
            describe(Game.DiplomacyDeals.getWorkingDealItem(deal, id) ?? {}));
    const report = (label, value) => {
        console.log(`[sg] ${label}\n` + JSON.stringify(value, null, 1));
        return value;
    };
    const offerables = (deal, player) => ({
        cities: possible(deal, player, DiplomacyDealItemTypes.CITIES).map(describe),
        gold: possible(deal, player, DiplomacyDealItemTypes.GOLD).map(describe),
        influence: possible(deal, player, DiplomacyDealItemTypes.INFLUENCE).map(describe)
    });
    const propertyNames = (object) => {
        const names = new Set();
        for (let o = object; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) {
            Object.getOwnPropertyNames(o).forEach((name) => names.add(name));
        }
        return [...names].sort();
    };

    const sg = {
        /** Met major leaders, with the state the deal button depends on. */
        majors() {
            const diplomacy = Players.get(me()).Diplomacy;
            return report("majors", Players.getAliveMajorIds().filter((id) => id != me() && diplomacy.hasMet(id)).map((id) => ({
                id,
                name: Locale.compose(Players.get(id).name),
                human: Players.get(id).isHuman,
                atWar: diplomacy.isAtWarWith(id),
                allied: diplomacy.hasAllied(id),
                relationship: Locale.compose(diplomacy.getRelationshipLevelName(id)),
                pendingDeal: Game.DiplomacyDeals.hasPendingDeal(me(), id)
            })));
        },

        /** E1: what the engine offers in a fresh deal with a leader you are at peace with. */
        e1(them) {
            const deal = dealWith(them);
            Game.DiplomacyDeals.clearWorkingDeal(deal);
            return report(`E1 (no peace item), player ${them}`, { mine: offerables(deal, me()), theirs: offerables(deal, them) });
        },

        /** E1b: the same after adding a peace agreement first. */
        e1b(them) {
            const deal = dealWith(them);
            Game.DiplomacyDeals.clearWorkingDeal(deal);
            const id = Game.DiplomacyDeals.addItemToWorkingDeal(deal, {
                type: DiplomacyDealItemTypes.AGREEMENTS,
                agreementType: DiplomacyDealItemAgreementTypes.MAKE_PEACE
            });
            return report(`E1b (peace item id ${id}), player ${them}`, {
                deal: dealItems(deal), mine: offerables(deal, me()), theirs: offerables(deal, them)
            });
        },

        /**
         * E2 and E4: offer one of your settlements (index into the E1 list of OFFER items), optionally
         * with lump sums ("myGold", "theirGold", "myInfluence", "theirInfluence"), and send it.
         * propose: false sends INSPECT (the AI only answers), true sends PROPOSED (the city may move).
         * peace: true puts a peace agreement in the deal first, for when E1b was the only way to get
         * settlements.
         */
        offer(them, { city = 0, extras = [], propose = false, peace = false } = {}) {
            const deal = dealWith(them);
            Game.DiplomacyDeals.clearWorkingDeal(deal);
            if (peace) {
                Game.DiplomacyDeals.addItemToWorkingDeal(deal, {
                    type: DiplomacyDealItemTypes.AGREEMENTS,
                    agreementType: DiplomacyDealItemAgreementTypes.MAKE_PEACE
                });
            }
            const offers = possible(deal, me(), DiplomacyDealItemTypes.CITIES)
                .filter((item) => item.subType == DiplomacyDealItemCityTransferTypes.OFFER);
            if (city >= 0) {
                if (!offers[city]) return console.warn(`[sg] no OFFER settlement at index ${city}; run sg.e1(${them}) first`);
                Game.DiplomacyDeals.addItemToWorkingDeal(deal, offers[city]);
            }
            for (const extra of extras) {
                const player = extra.startsWith("my") ? me() : them;
                const type = extra.endsWith("Gold") ? DiplomacyDealItemTypes.GOLD : DiplomacyDealItemTypes.INFLUENCE;
                const item = possible(deal, player, type).find((i) => i.isValid !== false);
                if (item) Game.DiplomacyDeals.addItemToWorkingDeal(deal, item);
                else console.warn(`[sg] no valid ${extra} item`);
            }
            sg.watch();
            report("deal sent", dealItems(deal));
            Game.DiplomacyDeals.sendWorkingDeal(deal, propose ? DiplomacyDealProposalActions.PROPOSED : DiplomacyDealProposalActions.INSPECT);
            console.log(`[sg] sent ${propose ? "PROPOSED" : "INSPECT"}; the answer shows up as [sg] events`);
        },

        /** Logs the engine events that answer a deal. Called by offer(); safe to call again. */
        watch() {
            if (sg.watching) return;
            sg.watching = true;
            engine.on("DiplomacyStatement", (data) => {
                const v = data.values ?? {};
                console.log(`[sg] DiplomacyStatement from ${v.FromPlayer} to ${v.ToPlayer}: ` +
                    `DealAction ${enumName(DiplomacyDealProposalActions, v.DealAction)}, ` +
                    `responding to ${enumName(DiplomacyDealProposalActions, v.RespondingToDealAction)}, session ${data.sessionId}`);
                if (v.RespondingToDealAction == DiplomacyDealProposalActions.INSPECT && v.ToPlayer == me()) {
                    Game.DiplomacySessions.closeSession(data.sessionId); // the deal screen does the same
                }
            });
            for (const name of ["DiplomacyDealEnacted", "CityTransfered", "DiplomacyIncomingDeal", "DiplomacySessionClosed",
                "DiplomacyRelationshipChanged", "DiplomacyMakePeace", "DiplomacyDeclareWar"]) {
                engine.on(name, (data) => console.log(`[sg] ${name} ` + JSON.stringify(data)));
            }
        },

        /** E6: property names of the scripting objects, plus the ones that look like transfer APIs. */
        e6() {
            const player = Players.get(me());
            const city = Array.from(player?.Cities?.getCities?.() ?? [])[0];
            const dump = {
                Game: propertyNames(Game),
                "Game.Diplomacy": propertyNames(Game.Diplomacy),
                "Game.DiplomacyDeals": propertyNames(Game.DiplomacyDeals),
                "Game.CityOperations": propertyNames(Game.CityOperations),
                "Game.CityCommands": propertyNames(Game.CityCommands),
                "Game.PlayerOperations": propertyNames(Game.PlayerOperations),
                Players: propertyNames(Players),
                player: propertyNames(player),
                "player.Cities": propertyNames(player?.Cities),
                Cities: propertyNames(Cities),
                city: propertyNames(city)
            };
            report("E6 property names", dump);
            return report("E6 candidates", Object.entries(dump).flatMap(([owner, names]) =>
                names.filter((n) => /transfer|owner|cede|gift|give|acquire|capture|liberate/i.test(n)).map((n) => owner + "." + n)));
        }
    };
    window.sg = sg;
    console.log("[sg] ready: sg.majors(), sg.e1(id), sg.e1b(id), sg.offer(id), sg.offer(id, {propose: true}), " +
        "sg.offer(id, {extras: ['theirGold']}), sg.e6()");
})();
