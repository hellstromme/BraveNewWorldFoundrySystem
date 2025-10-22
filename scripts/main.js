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

const LEGACY_SKILL_TRAIT_MAP = Object.freeze({
  athletics: 'strength',
  brawl: 'strength',
  might: 'strength',
  stealth: 'speed',
  investigation: 'smarts',
  knowledge: 'smarts',
  science: 'smarts',
  technology: 'smarts',
  leadership: 'spirit',
  persuasion: 'spirit',
  streetwise: 'spirit',
  willpower: 'spirit'
});

const TRAIT_MIGRATION_NAMESPACE = 'bravenewworld';
const TRAIT_MIGRATION_SETTING = 'traitsStrengthSpeedMigration';

let traitMigrationSettingRegistered = false;

Hooks.once('init', async function () {
  console.log('BNW | Initializing Brave New World system');

  CONFIG.BNW = CONFIG.BNW ?? {};
  CONFIG.BNW.traits = CONFIG.BNW.traits ?? Array.from(BNW_DEFAULT_TRAIT_KEYS);
  CONFIG.BNW.defaultSkills = CONFIG.BNW.defaultSkills ?? BNW_DEFAULT_SKILLS;

  if (game?.settings?.register) {
    try {
      game.settings.register(TRAIT_MIGRATION_NAMESPACE, TRAIT_MIGRATION_SETTING, {
        name: 'Brave New World trait migration',
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
      });
      traitMigrationSettingRegistered = true;
    } catch (error) {
      console.warn('BNW | Failed to register trait migration setting', error);
    }
  }

  CONFIG.Actor.typeLabels = CONFIG.Actor.typeLabels ?? {};
  CONFIG.Actor.typeLabels.delta = game.i18n.localize('BNW.ActorType.Delta');

  CONFIG.Item.typeLabels = CONFIG.Item.typeLabels ?? {};
  CONFIG.Item.typeLabels.power = game.i18n.localize('BNW.ItemType.Power');

  if (!Handlebars.helpers.eq) {
    Handlebars.registerHelper('eq', (a, b) => a === b);
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
    `${CONFIG.BNW.templatePath}/items/power-sheet.hbs`,
    `${CONFIG.BNW.templatePath}/chat/skill-roll-card.hbs`
  ];

  const loadHandlebarsTemplates =
    foundry?.applications?.handlebars?.loadTemplates ?? loadTemplates;
  await loadHandlebarsTemplates(templatesToLoad);

  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('bravenewworld', BraveNewWorldActorSheet, {
    types: ['delta'],
    makeDefault: true
  });

  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('bravenewworld', BraveNewWorldItemSheet, {
    types: ['power'],
    makeDefault: true
  });
});

Hooks.once('ready', async function () {
  game.bnw = game.bnw ?? {};
  game.bnw.dice = BNW.dice;
  console.log('BNW | Ready');
  if (!game?.user?.isGM) return;
  if (!game?.settings) return;

  let shouldRunMigration = !traitMigrationSettingRegistered;

  if (traitMigrationSettingRegistered) {
    try {
      shouldRunMigration = !game.settings.get(TRAIT_MIGRATION_NAMESPACE, TRAIT_MIGRATION_SETTING);
    } catch (error) {
      console.warn('BNW | Failed to read trait migration setting, attempting migration once', error);
      shouldRunMigration = true;
    }
  }

  if (!shouldRunMigration) return;

  try {
    await migrateLegacyTraitData();

    if (traitMigrationSettingRegistered) {
      try {
        await game.settings.set(TRAIT_MIGRATION_NAMESPACE, TRAIT_MIGRATION_SETTING, true);
      } catch (error) {
        console.error('BNW | Failed to flag trait migration as complete', error);
      }
    }
  } catch (error) {
    console.error('BNW | Trait migration failed', error);
  }
});

function coerceNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  const fallbackParsed = Number(fallback);
  return Number.isFinite(fallbackParsed) ? fallbackParsed : 0;
}

function capitalize(value) {
  if (typeof value !== 'string' || value.length === 0) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sanitizeTrait(traits, key, fallbackValue = 0) {
  const existing = traits[key] ?? {};
  const defaultLabel = BNW_DEFAULT_TRAIT_LABELS[key] ?? capitalize(key);
  const label = typeof existing.label === 'string' && existing.label.trim().length ? existing.label : defaultLabel;
  const value = coerceNumber(existing.value, fallbackValue);
  traits[key] = {
    ...existing,
    label,
    value
  };
}

function mapLegacyTrait(traitKey, skillKey = '') {
  const normalizedTrait = String(traitKey ?? '').toLowerCase();
  if (!normalizedTrait) return '';

  if (normalizedTrait === 'body') {
    const normalizedSkill = String(skillKey ?? '').toLowerCase();
    return LEGACY_SKILL_TRAIT_MAP[normalizedSkill] ?? 'strength';
  }

  if (normalizedTrait === 'mind') {
    return 'smarts';
  }

  return normalizedTrait;
}

async function migrateLegacyTraitData() {
  const actors = Array.from(game?.actors?.contents ?? []);
  const items = Array.from(game?.items?.contents ?? []);

  if (actors.length === 0 && items.length === 0) return;

  console.log('BNW | Running legacy trait migration');

  for (const actor of actors) {
    if (!actor || actor.type !== 'delta') continue;

    const traits = foundry.utils.deepClone(actor.system?.traits ?? {});
    const skills = foundry.utils.deepClone(actor.system?.skills ?? {});

    const hasLegacyTraits = Object.prototype.hasOwnProperty.call(traits, 'body') || Object.prototype.hasOwnProperty.call(traits, 'mind');

    let traitsChanged = false;
    if (hasLegacyTraits) {
      const bodyValue = coerceNumber(traits.body?.value, 0);
      const mindValue = coerceNumber(traits.mind?.value, 0);

      delete traits.body;
      delete traits.mind;

      sanitizeTrait(traits, 'strength', bodyValue);
      sanitizeTrait(traits, 'speed', bodyValue);
      sanitizeTrait(traits, 'smarts', mindValue);
      sanitizeTrait(traits, 'spirit', traits.spirit?.value ?? 0);
      traitsChanged = true;
    }

    let skillsChanged = false;
    for (const [skillKey, skillData] of Object.entries(skills)) {
      const currentTraitRaw = skillData?.trait ?? '';
      const normalizedTrait = String(currentTraitRaw ?? '').toLowerCase();
      const normalizedSkill = String(skillKey ?? '').toLowerCase();
      const mappedTrait = mapLegacyTrait(normalizedTrait, normalizedSkill);
      if (!mappedTrait) continue;

      if (mappedTrait !== normalizedTrait || currentTraitRaw !== mappedTrait) {
        skillsChanged = true;
        skills[skillKey] = {
          ...skillData,
          trait: mappedTrait
        };
      }
    }

    if (traitsChanged || skillsChanged) {
      const updateData = {};
      if (traitsChanged) updateData['system.traits'] = traits;
      if (skillsChanged) updateData['system.skills'] = skills;

      try {
        await actor.update(updateData);
      } catch (error) {
        console.error(`BNW | Failed to migrate actor ${actor.name}`, error);
      }
    }

    for (const item of actor.items ?? []) {
      await migrateItemTrait(item);
    }
  }

  for (const item of items) {
    await migrateItemTrait(item);
  }
}

async function migrateItemTrait(item) {
  if (!item || item.type !== 'power') return;

  const traitRaw = item.system?.trait ?? '';
  const skillKey = item.system?.skill ?? '';
  const normalizedTrait = String(traitRaw ?? '').toLowerCase();
  const mappedTrait = mapLegacyTrait(normalizedTrait, skillKey);
  if (!mappedTrait) return;

  if (mappedTrait === normalizedTrait && traitRaw === mappedTrait) return;

  try {
    await item.update({ 'system.trait': mappedTrait });
  } catch (error) {
    console.error(`BNW | Failed to migrate item ${item.name}`, error);
  }
}
