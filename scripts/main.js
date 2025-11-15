const BNW_DEFAULT_TRAIT_KEYS = Object.freeze(['strength', 'speed', 'smarts', 'spirit']);

const BNW_DEFAULT_TRAIT_LABELS = Object.freeze({
  strength: 'Strength',
  speed: 'Speed',
  smarts: 'Smarts',
  spirit: 'Spirit'
});

const BNW_DEFAULT_SKILLS = Object.freeze({
  athletics: { label: 'Athletics', trait: 'strength', value: 2 },
  brawl: { label: 'Brawl', trait: 'strength', value: 2 },
  might: { label: 'Might', trait: 'strength', value: 2 },
  stealth: { label: 'Stealth', trait: 'speed', value: 2 },
  investigation: { label: 'Investigation', trait: 'smarts', value: 2 },
  knowledge: { label: 'Knowledge', trait: 'smarts', value: 2 },
  science: { label: 'Science', trait: 'smarts', value: 2 },
  technology: { label: 'Technology', trait: 'smarts', value: 2 },
  leadership: { label: 'Leadership', trait: 'spirit', value: 2 },
  persuasion: { label: 'Persuasion', trait: 'spirit', value: 2 },
  streetwise: { label: 'Streetwise', trait: 'spirit', value: 2 },
  willpower: { label: 'Willpower', trait: 'spirit', value: 2 }
});



Hooks.once('init', async function () {
  console.log('BNW | Initializing Brave New World system');

  CONFIG.BNW = CONFIG.BNW ?? {};
  CONFIG.BNW.traits = CONFIG.BNW.traits ?? Array.from(BNW_DEFAULT_TRAIT_KEYS);
  CONFIG.BNW.defaultSkills = CONFIG.BNW.defaultSkills ?? BNW_DEFAULT_SKILLS;

  CONFIG.Actor.typeLabels = CONFIG.Actor.typeLabels ?? {};
  CONFIG.Actor.typeLabels.delta = game.i18n.localize('BNW.ActorType.Delta');

  CONFIG.Item.typeLabels = CONFIG.Item.typeLabels ?? {};
  CONFIG.Item.typeLabels.power = game.i18n.localize('BNW.ItemType.Power');
  CONFIG.Item.typeLabels.trick = game.i18n.localize('BNW.ItemType.Trick');
  CONFIG.Item.typeLabels.quirk = game.i18n.localize('BNW.ItemType.Quirk');
  CONFIG.Item.typeLabels.closeCombatWeapon = game.i18n.localize('BNW.ItemType.CloseCombatWeapon');

  if (!Handlebars.helpers.eq) {
    Handlebars.registerHelper('eq', (a, b) => a === b);
  }

  if (!Handlebars.helpers.gt) {
    Handlebars.registerHelper('gt', (a, b) => a > b);
  }

  if (!Handlebars.helpers.hasEntries) {
    Handlebars.registerHelper('hasEntries', (value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      if (value && typeof value === 'object') {
        return Object.keys(value).length > 0;
      }

      return false;
    });
  }

  const systemBasePath = game.system?.path ?? `systems/${game.system.id}`;
  CONFIG.BNW.systemBasePath = systemBasePath;
  CONFIG.BNW.templatePath = `${systemBasePath}/templates`;

  const templatesToLoad = [
    `${CONFIG.BNW.templatePath}/actors/delta-sheet.hbs`,
    `${CONFIG.BNW.templatePath}/actors/actor-sheet-v2.hbs`,
    `${CONFIG.BNW.templatePath}/actors/parts/header.hbs`,
    `${CONFIG.BNW.templatePath}/actors/parts/tabs.hbs`,
    `${CONFIG.BNW.templatePath}/actors/parts/traits.hbs`,
    `${CONFIG.BNW.templatePath}/actors/parts/powers.hbs`,
    `${CONFIG.BNW.templatePath}/actors/parts/tricks.hbs`,
    `${CONFIG.BNW.templatePath}/actors/parts/quirks.hbs`,
    `${CONFIG.BNW.templatePath}/actors/parts/notes.hbs`,
    `${CONFIG.BNW.templatePath}/items/power-sheet.hbs`,
    `${CONFIG.BNW.templatePath}/items/power-sheet-v2.hbs`,
    `${CONFIG.BNW.templatePath}/items/trick-sheet.hbs`,
    `${CONFIG.BNW.templatePath}/items/trick-sheet-v2.hbs`,
    `${CONFIG.BNW.templatePath}/items/quirk-sheet.hbs`,
    `${CONFIG.BNW.templatePath}/items/quirk-sheet-v2.hbs`,
    `${CONFIG.BNW.templatePath}/items/close-combat-weapon-sheet-v2.hbs`,
    `${CONFIG.BNW.templatePath}/chat/skill-roll-card.hbs`
  ];

  await foundry.applications.handlebars.loadTemplates(templatesToLoad);

  // Register V1 Actor Sheets (existing)
  foundry.documents.collections.Actors.registerSheet('bravenewworld', BraveNewWorldActorSheet, {
    types: ['delta'],
    makeDefault: false,
    label: "BNW.Sheet.Actor.V1"
  });

  // Register V1 Item Sheets (existing)
  foundry.documents.collections.Items.registerSheet('bravenewworld', BraveNewWorldItemSheet, {
    types: ['power', 'trick', 'quirk'],
    makeDefault: false,
    label: "BNW.Sheet.Item.V1"
  });

  // Register V2 Actor Sheets
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, 'bravenewworld', BraveNewWorldActorSheetV2, {
    types: ['delta'],
    makeDefault: true,
    label: "BNW.Sheet.Actor.V2"
  });

  // Register V2 Item Sheets - one class per type
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, 'bravenewworld', BraveNewWorldPowerSheetV2, {
    types: ['power'],
    makeDefault: true,
    label: "BNW.Sheet.Item.Power.V2"
  });
  
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, 'bravenewworld', BraveNewWorldTrickSheetV2, {
    types: ['trick'],
    makeDefault: true,
    label: "BNW.Sheet.Item.Trick.V2"
  });
  
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, 'bravenewworld', BraveNewWorldQuirkSheetV2, {
    types: ['quirk'],
    makeDefault: true,
    label: "BNW.Sheet.Item.Quirk.V2"
  });
  
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, 'bravenewworld', BraveNewWorldCloseCombatWeaponSheetV2, {
    types: ['closeCombatWeapon'],
    makeDefault: true,
    label: "BNW.Sheet.Item.CloseCombatWeapon.V2"
  });
});

Hooks.once('ready', async function () {
  game.bnw = game.bnw ?? {};
  game.bnw.dice = BNW.dice;
  console.log('BNW | Ready');
});

/**
 * Coerce a value to a finite number, or return the fallback value.
 * @param {*} value - The value to coerce
 * @param {number} [fallback=0] - The fallback value if coercion fails
 * @returns {number} The coerced number or fallback
 */
function coerceNumber(value, fallback = 0) {
  if (value == null) {  // Catches both null and undefined
    const fallbackParsed = Number(fallback);
    return Number.isFinite(fallbackParsed) ? fallbackParsed : 0;
  }
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  const fallbackParsed = Number(fallback);
  return Number.isFinite(fallbackParsed) ? fallbackParsed : 0;
}

/**
 * Capitalize the first letter of a string.
 * @param {string} value - The string to capitalize
 * @returns {string} The capitalized string
 */
function capitalize(value) {
  if (typeof value !== 'string' || value.length === 0) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
