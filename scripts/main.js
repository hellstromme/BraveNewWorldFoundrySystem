Hooks.once('init', async function () {
  console.log('BNW | Initializing Brave New World system');

  // Register trait configuration setting
  game.settings.register('bravenewworld', 'traits', {
    name: "BNW.Settings.Traits.Name",
    hint: "BNW.Settings.Traits.Hint",
    scope: "world",
    config: false,  // Use custom menu instead
    type: Object,
    default: {
      strength: { label: "Strength", dice: 3, default: 0 },
      speed: { label: "Speed", dice: 3, default: 0 },
      smarts: { label: "Smarts", dice: 3, default: 0 },
      spirit: { label: "Spirit", dice: 3, default: 0 }
    },
    onChange: (value) => {
      CONFIG.BNW.traits = value;
    }
  });

  // Register settings menu for trait configuration
  game.settings.registerMenu('bravenewworld', 'traitConfig', {
    name: "BNW.Settings.Traits.MenuName",
    label: "BNW.Settings.Traits.MenuLabel",
    hint: "BNW.Settings.Traits.MenuHint",
    icon: "fas fa-cogs",
    type: BraveNewWorldTraitConfig,
    restricted: true  // Only GMs can access
  });

  CONFIG.BNW = CONFIG.BNW ?? {};
  CONFIG.BNW.traits = game.settings.get('bravenewworld', 'traits');

  CONFIG.Actor.typeLabels = CONFIG.Actor.typeLabels ?? {};
  CONFIG.Actor.typeLabels.delta = game.i18n.localize('BNW.ActorType.Delta');

  CONFIG.Item.typeLabels = CONFIG.Item.typeLabels ?? {};
  CONFIG.Item.typeLabels.power = game.i18n.localize('BNW.ItemType.Power');
  CONFIG.Item.typeLabels.trick = game.i18n.localize('BNW.ItemType.Trick');
  CONFIG.Item.typeLabels.quirk = game.i18n.localize('BNW.ItemType.Quirk');
  CONFIG.Item.typeLabels.closeCombatWeapon = game.i18n.localize('BNW.ItemType.CloseCombatWeapon');
  CONFIG.Item.typeLabels.rangedWeapon = game.i18n.localize('BNW.ItemType.RangedWeapon');
  CONFIG.Item.typeLabels.skill = game.i18n.localize('BNW.ItemType.Skill');

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

  // Add helper to filter skills by trait
  if (!Handlebars.helpers.filterSkillsByTrait) {
    Handlebars.registerHelper('filterSkillsByTrait', (skills, traitKey) => {
      if (!Array.isArray(skills)) return [];
      return skills.filter(s => s.system?.trait === traitKey);
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
    `${CONFIG.BNW.templatePath}/actors/parts/weapons.hbs`,
    `${CONFIG.BNW.templatePath}/actors/parts/notes.hbs`,
    `${CONFIG.BNW.templatePath}/items/power-sheet.hbs`,
    `${CONFIG.BNW.templatePath}/items/power-sheet-v2.hbs`,
    `${CONFIG.BNW.templatePath}/items/trick-sheet.hbs`,
    `${CONFIG.BNW.templatePath}/items/trick-sheet-v2.hbs`,
    `${CONFIG.BNW.templatePath}/items/quirk-sheet.hbs`,
    `${CONFIG.BNW.templatePath}/items/quirk-sheet-v2.hbs`,
    `${CONFIG.BNW.templatePath}/items/close-combat-weapon-sheet-v2.hbs`,
    `${CONFIG.BNW.templatePath}/items/ranged-weapon-sheet-v2.hbs`,
    `${CONFIG.BNW.templatePath}/items/skill-sheet-v2.hbs`,
    `${CONFIG.BNW.templatePath}/chat/skill-roll-card.hbs`,
    `${CONFIG.BNW.templatePath}/chat/initiative-roll-card.hbs`
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
  
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, 'bravenewworld', BraveNewWorldRangedWeaponSheetV2, {
    types: ['rangedWeapon'],
    makeDefault: true,
    label: "BNW.Sheet.Item.RangedWeapon.V2"
  });
  
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, 'bravenewworld', BraveNewWorldSkillSheetV2, {
    types: ['skill'],
    makeDefault: true,
    label: "BNW.Sheet.Item.Skill.V2"
  });
});

Hooks.once('ready', async function () {
  game.bnw = game.bnw ?? {};
  game.bnw.dice = BNW.dice;
  console.log('BNW | Ready');
});

/**
 * Initialize default actor data when a new actor is created
 */
Hooks.on('preCreateActor', async (actor, data, options, userId) => {
  console.log('BNW | preCreateActor hook - Initializing new actor data');
  
  const updates = {};
  
  // Initialize traits if they don't exist
  if (!actor.system.traits || Object.keys(actor.system.traits).length === 0) {
    console.log('BNW | Initializing traits for new actor');
    console.log('BNW | CONFIG.BNW.traits keys:', Object.keys(CONFIG.BNW.traits));
    const traits = {};
    for (const [key, config] of Object.entries(CONFIG.BNW.traits)) {
      console.log('BNW | Setting trait:', key, config);
      traits[key] = { dice: config.dice, default: config.default };
    }
    console.log('BNW | Created traits object:', traits);
    console.log('BNW | Traits keys:', Object.keys(traits));
    updates['system.traits'] = traits;
  }
  
  // Initialize wounds if they don't exist
  if (!actor.system.wounds) {
    console.log('BNW | Initializing wounds for new actor');
    updates['system.wounds'] = {
      head: 0,
      leftArm: 0,
      rightArm: 0,
      torso: 0,
      leftLeg: 0,
      rightLeg: 0
    };
  }
  
  // Apply initialization data
  if (Object.keys(updates).length > 0) {
    actor.updateSource(updates);
    console.log('BNW | Initialized new actor with default data:', updates);
  }
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
