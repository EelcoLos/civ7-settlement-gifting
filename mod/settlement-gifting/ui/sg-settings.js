// In-game options in the shared "Mods" tab of the options screen. Values are stored as numbers
// with UI.setOption("user", "Interface", ...), the same store the base game's interface options use.
// shortcut: new option names there are assumed to persist, as the diplomacy ribbon's do; if they
// reset after a restart, store them somewhere else.
import { Options, OptionType } from '/core/ui/options/model-options.js';
import { CategoryData } from '/core/ui/options/options-helpers.js';
// Registers the base game's options first, so the Mods tab is added after the built-in tabs.
import '/core/ui/options/options.js';

const OPTION_SET = "user";
const OPTION_TYPE = "Interface";
const CATEGORY = "mods";
const GROUP = "settlement_gifting"; // label: LOC_OPTIONS_GROUP_SETTLEMENT_GIFTING

const DEFINITIONS = [
    {
        key: "minRelationship", name: "SGMinRelationship", type: OptionType.Dropdown, initial: 0,
        label: "LOC_SG_OPTION_MIN_RELATIONSHIP", description: "LOC_SG_OPTION_MIN_RELATIONSHIP_DESCRIPTION",
        items: [
            "LOC_SG_OPTION_RELATIONSHIP_ANY",
            "LOC_SG_OPTION_RELATIONSHIP_NEUTRAL",
            "LOC_SG_OPTION_RELATIONSHIP_FRIENDLY",
            "LOC_SG_OPTION_RELATIONSHIP_HELPFUL",
            "LOC_SG_OPTION_RELATIONSHIP_ALLIED"
        ]
    },
    {
        key: "townsOnly", name: "SGTownsOnly", type: OptionType.Checkbox, initial: 0,
        label: "LOC_SG_OPTION_TOWNS_ONLY", description: "LOC_SG_OPTION_TOWNS_ONLY_DESCRIPTION"
    },
    {
        key: "allowCapital", name: "SGAllowCapital", type: OptionType.Checkbox, initial: 0,
        label: "LOC_SG_OPTION_ALLOW_CAPITAL", description: "LOC_SG_OPTION_ALLOW_CAPITAL_DESCRIPTION"
    },
    {
        key: "confirm", name: "SGConfirm", type: OptionType.Checkbox, initial: 1,
        label: "LOC_SG_OPTION_CONFIRM", description: "LOC_SG_OPTION_CONFIRM_DESCRIPTION"
    }
];

function read(def) {
    const value = UI.getOption(OPTION_SET, OPTION_TYPE, def.name);
    return typeof value === "number" ? value : def.initial;
}

/** Current values, read from the option store on every call so changes apply at once. */
export function getSettings() {
    const values = {};
    for (const def of DEFINITIONS) {
        const value = read(def);
        values[def.key] = def.type == OptionType.Checkbox ? value != 0 : value;
    }
    return values;
}

function addOptions() {
    // Another mod may already have created the shared tab; keep its title.
    CategoryData[CATEGORY] ??= {
        title: "LOC_SG_OPTIONS_CATEGORY_MODS",
        description: "LOC_SG_OPTIONS_CATEGORY_MODS_DESCRIPTION"
    };
    for (const def of DEFINITIONS) {
        const info = {
            category: CATEGORY,
            group: GROUP,
            type: def.type,
            id: "sg-" + def.key,
            label: def.label,
            description: def.description
        };
        if (def.type == OptionType.Dropdown) {
            info.dropdownItems = def.items.map((label) => ({ label }));
            info.initListener = (option) => { option.selectedItemIndex = read(def); };
            info.updateListener = (option, index) => {
                UI.setOption(OPTION_SET, OPTION_TYPE, def.name, index);
                option.selectedItemIndex = index;
            };
        } else {
            info.initListener = (option) => { option.currentValue = read(def) != 0; };
            info.updateListener = (option, value) => {
                UI.setOption(OPTION_SET, OPTION_TYPE, def.name, value ? 1 : 0);
                option.currentValue = value;
            };
        }
        Options.addOption(info);
    }
}

try {
    Options.addInitCallback(addOptions);
} catch (e) {
    // Only thrown when the options screen was already built in this UI context.
    console.error("[settlement-gifting] options not registered:", e);
}
