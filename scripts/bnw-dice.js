const BNW = globalThis.BNW ?? (globalThis.BNW = {});
BNW.dice = BNW.dice ?? {};

/**
 * Attempt to coerce a target number value from a DialogV2 response.
 * @param {*} value
 * @returns {number|null}
 */
function coerceTargetValue(value) {
  const parseNumber = (candidate) => {
    if (candidate == null) return null;
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : null;
  };

  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return parseNumber(value);

  if (value instanceof FormData) {
    return parseNumber(value.get?.('target'));
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = coerceTargetValue(entry);
      if (parsed != null) return parsed;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    if (value.formData) {
      const parsed = coerceTargetValue(value.formData);
      if (parsed != null) return parsed;
    }

    if (typeof value.get === 'function') {
      const parsed = coerceTargetValue(value.get('target'));
      if (parsed != null) return parsed;
    }

    const directKeys = ['target', 'value', 'result'];
    for (const key of directKeys) {
      if (key in value) {
        const parsed = parseNumber(value[key]);
        if (parsed != null) return parsed;
      }
    }
  }

  return null;
}

/**
 * Prompt the user for a target number if one was not provided.
 * @param {object} options
 * @param {number} [options.defaultTarget=7]
 * @param {string} [options.traitLabel]
 * @param {string} [options.skillLabel]
 * @returns {Promise<number|null>}
 */
BNW.dice.promptTargetNumber = async function ({ defaultTarget = 7, traitLabel = '', skillLabel = '' } = {}) {
  const title = game?.i18n?.localize?.('BNW.RollPromptTitle') ?? 'Brave New World Test';
  const targetLabel = game?.i18n?.localize?.('BNW.RollPromptTarget') ?? 'Target Number';
  const buttonLabel = game?.i18n?.localize?.('BNW.RollPromptButton') ?? 'Roll Dice';

  const label = [skillLabel, traitLabel].filter(Boolean).join(' / ');
  const content = `
    <form class="bnw-dialog">
      ${label ? `<p class="context">${label}</p>` : ''}
      <div class="form-group">
        <label>${targetLabel}</label>
        <input type="number" name="target" value="${defaultTarget}" min="2" step="1" />
      </div>
    </form>
  `;

  const dialogV2 = foundry?.applications?.api?.DialogV2;
  if (dialogV2?.prompt) {
    try {
      const result = await dialogV2.prompt({
        window: { title },
        content,
        ok: {
          label: buttonLabel,
          callback: (event, button, dialog) => {
            const dialogElement = dialog.element ?? dialog;
            const form = dialogElement.querySelector('form');
            const input = form?.querySelector('input[name="target"]');
            if (input?.value != null) {
              const parsed = Number(input.value);
              if (Number.isFinite(parsed)) return parsed;
            }
            return defaultTarget;
          }
        },
        rejectClose: false
      });

      if (typeof result === 'number' && Number.isFinite(result)) {
        return result;
      }
      return defaultTarget;
    } catch (error) {
      console.warn('BNW | DialogV2 prompt failed, falling back to Dialog.prompt', error);
    }
  }

  return Dialog.prompt({
    title,
    content,
    label: buttonLabel,
    callback: (html) => {
      const selector = 'input[name="target"]';

      let inputElement = null;
      if (typeof html?.find === 'function') {
        inputElement = html.find(selector)?.[0] ?? null;
      }

      if (!inputElement) {
        const root = html?.[0] ?? html;
        if (root?.querySelector) {
          inputElement = root.querySelector(selector);
        }
      }

      const rawValue = inputElement?.value;
      const value = Number(rawValue);
      return Number.isFinite(value) ? value : defaultTarget;
    },
    rejectClose: false
  });
};

/**
 * Roll a Brave New World trait + skill dice pool.
 * @param {object} params
 * @param {Actor} params.actor
 * @param {string} params.traitKey
 * @param {string} [params.skillId] - Optional skill item ID
 * @param {number} [params.target]
 * @param {number} [params.bonusDice=0]
 * @param {string} [params.label]
 * @param {Item} [params.sourceItem]
 */
BNW.dice.rollTraitSkill = async function ({
  actor,
  traitKey,
  skillId = null,
  target = null,
  bonusDice = 0,
  label = '',
  sourceItem = null
} = {}) {
  if (!actor) {
    console.warn('BNW | rollTraitSkill requires an actor.');
    return null;
  }

  const systemData = actor.system ?? {};
  const trait = foundry.utils.getProperty(systemData, `traits.${traitKey}`) ?? null;
  if (!trait) {
    ui.notifications?.warn?.(game?.i18n?.format?.('BNW.Warning.UnknownTrait', { trait: traitKey }) ?? `Unknown trait: ${traitKey}`);
    return null;
  }

  // Get trait configuration for label
  const traitConfig = CONFIG.BNW?.traits?.[traitKey] ?? { label: traitKey };
  const traitLabel = traitConfig.label ?? traitKey;

  // Look up skill item if provided
  let skillBonus = Number(trait?.default ?? 0);
  let skillLabel = null;
  let skillItem = null;

  if (skillId) {
    skillItem = actor.items.get(skillId);
    if (skillItem && skillItem.type === 'skill') {
      skillBonus = Number(skillItem.system?.bonus ?? 0);
      skillLabel = skillItem.name;
    } else {
      console.warn('BNW | Skill item not found:', skillId);
    }
  }

  const traitDice = Number(trait?.dice ?? 3);
  const bonusValue = Number(bonusDice ?? 0);

  const defaultTarget = Number(target ?? 0) || 7;
  const resolvedTarget = target ?? await BNW.dice.promptTargetNumber({
    defaultTarget,
    traitLabel: traitLabel,
    skillLabel: skillLabel
  });
  if (resolvedTarget == null) return null;

  const formula = `${traitDice}d6x=6`;
  let roll = new Roll(formula);

  // In Foundry v13+, roll.evaluate() no longer requires the async parameter
  try {
    roll = await roll.evaluate();
  } catch (error) {
    console.error('BNW | Failed to evaluate roll', error);
    ui.notifications?.error?.(game?.i18n?.localize?.('BNW.Error.RollEvaluation') ?? 'Failed to evaluate roll.');
    return null;
  }

  const diceResults = [];

  for (const term of roll.dice ?? []) {
    if (!term?.results) continue;

    let runningTotal = 0;
    for (const result of term.results) {
      if (result?.result == null) continue;

      const value = Number(result.result);
      if (!Number.isFinite(value)) continue;

      runningTotal += value;

      if (!result.exploded) {
        diceResults.push(runningTotal);
        runningTotal = 0;
      }
    }

    if (runningTotal > 0) {
      diceResults.push(runningTotal);
    }
  }

  if (!diceResults.length) {
    diceResults.push(0);
  }

  const highest = Math.max(...diceResults);
  const totalBonus = skillBonus + bonusValue;
  const finalResult = highest + totalBonus;
  const success = finalResult >= resolvedTarget;
  
  // Calculate number of successes: 1 for meeting TN, +1 for every 5 points over
  let successes = 0;
  if (success) {
    const margin = finalResult - resolvedTarget;
    successes = 1 + Math.floor(margin / 5);
  }

  const data = {
    actorName: actor.name,
    traitLabel: traitLabel,
    skillLabel: skillLabel ?? label,
    traitDice: traitDice,
    skillBonus: skillBonus,
    bonusDice: bonusValue > 0 ? bonusValue : null,
    totalBonus: totalBonus > 0 ? totalBonus : null,
    dice: diceResults,
    highest,
    finalResult,
    target: resolvedTarget,
    success,
    successes,
    title: label || (skillLabel ? `${skillLabel} (${traitLabel})` : traitLabel)
  };

  const systemBasePath =
    CONFIG.BNW?.systemBasePath ??
    game.system?.path ??
    (game.system?.id ? `systems/${game.system.id}` : '');
  const templateBasePath =
    CONFIG.BNW?.templatePath ?? (systemBasePath ? `${systemBasePath}/templates` : 'templates');
  const content = await foundry.applications.handlebars.renderTemplate(`${templateBasePath}/chat/skill-roll-card.hbs`, data);

  return roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: data.title,
    content,
    flags: {
      bravenewworld: {
        trait: traitKey,
        skillId: skillId,
        target: resolvedTarget,
        highest,
        finalResult,
        traitDice,
        skillBonus,
        bonusDice: bonusValue,
        successes,
        itemId: sourceItem?.id ?? null
      }
    }
  });
};

/**
 * Roll a weapon attack
 * @param {object} params
 * @param {Actor} params.actor
 * @param {Item} params.weapon
 * @param {number} [params.defenseRating=5]
 */
BNW.dice.rollWeaponAttack = async function ({ actor, weapon, defenseRating = null } = {}) {
  if (!actor) {
    console.warn('BNW | rollWeaponAttack requires an actor.');
    return null;
  }
  if (!weapon) {
    console.warn('BNW | rollWeaponAttack requires a weapon.');
    return null;
  }

  const skillRef = weapon.system?.attackSkill ?? '';

  if (!skillRef) {
    ui.notifications?.warn?.('Weapon must have an attack skill selected.');
    return null;
  }

  // Look up skill - handle both legacy ID and new name-based storage
  let skill = null;
  
  // Try to find by name first (new system)
  skill = actor.items.find(i => i.type === 'skill' && i.name === skillRef);
  
  // Fallback: try by ID (legacy system)
  if (!skill) {
    skill = actor.items.get(skillRef);
  }
  
  if (!skill) {
    ui.notifications?.warn?.(`Skill "${skillRef}" not found on character. Try re-selecting the skill in the weapon configuration.`);
    return null;
  }

  // Get the trait from the skill
  const attackTrait = skill.system?.trait;
  if (!attackTrait) {
    ui.notifications?.warn?.(`Skill "${skill.name}" does not have a trait assigned.`);
    return null;
  }

  // Prompt for defense rating if not provided
  const defaultDefense = Number(defenseRating ?? 0) || 5;
  const resolvedDefense = defenseRating ?? await BNW.dice.promptTargetNumber({
    defaultTarget: defaultDefense,
    traitLabel: game?.i18n?.localize?.('BNW.Dialog.DefenseRating') ?? 'Defense Rating',
    skillLabel: weapon.name
  });
  if (resolvedDefense == null) return null;

  // Use the existing rollTraitSkill function with the weapon's attack trait/skill
  return BNW.dice.rollTraitSkill({
    actor,
    traitKey: attackTrait,
    skillId: skill.id,
    target: resolvedDefense,
    bonusDice: 0,
    label: `${weapon.name} - ${game?.i18n?.localize?.('BNW.Roll.Attack') ?? 'Attack'}`,
    sourceItem: weapon
  });
};

/**
 * Prompt the user for target size if one was not provided.
 * @param {object} options
 * @param {number} [options.defaultSize=5]
 * @param {string} [options.weaponLabel]
 * @returns {Promise<{size: number, headshot: boolean}|null>}
 */
BNW.dice.promptTargetSize = async function ({ defaultSize = 5, weaponLabel = '' } = {}) {
  const title = game?.i18n?.localize?.('BNW.RollPromptSizeTitle') ?? 'Target Size';
  const sizeLabel = game?.i18n?.localize?.('BNW.RollPromptSize') ?? 'Target Size';
  const headshotLabel = game?.i18n?.localize?.('BNW.RollPromptHeadshot') ?? 'Head Shot';
  const buttonLabel = game?.i18n?.localize?.('BNW.RollPromptButton') ?? 'Roll Dice';

  const content = `
    <form class="bnw-dialog">
      ${weaponLabel ? `<p class="context">${weaponLabel}</p>` : ''}
      <div class="form-group">
        <label>${sizeLabel}</label>
        <input type="number" name="size" value="${defaultSize}" min="1" step="1" />
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" name="headshot" />
          ${headshotLabel}
        </label>
      </div>
    </form>
  `;

  const dialogV2 = foundry?.applications?.api?.DialogV2;
  if (dialogV2?.prompt) {
    try {
      const result = await dialogV2.prompt({
        window: { title },
        content,
        ok: {
          label: buttonLabel,
          callback: (event, button, dialog) => {
            const dialogElement = dialog.element ?? dialog;
            const form = dialogElement.querySelector('form');
            const sizeInput = form?.querySelector('input[name="size"]');
            const headshotInput = form?.querySelector('input[name="headshot"]');
            
            const size = sizeInput?.value != null ? Number(sizeInput.value) : defaultSize;
            const headshot = headshotInput?.checked ?? false;
            
            return {
              size: Number.isFinite(size) && size > 0 ? size : defaultSize,
              headshot
            };
          }
        },
        rejectClose: false
      });

      if (result && typeof result.size === 'number' && Number.isFinite(result.size) && result.size > 0) {
        return result;
      }
      return { size: defaultSize, headshot: false };
    } catch (error) {
      console.warn('BNW | DialogV2 prompt failed, falling back to Dialog.prompt', error);
    }
  }

  return Dialog.prompt({
    title,
    content,
    label: buttonLabel,
    callback: (html) => {
      const sizeSelector = 'input[name="size"]';
      const headshotSelector = 'input[name="headshot"]';

      let sizeInput = null;
      let headshotInput = null;
      
      if (typeof html?.find === 'function') {
        sizeInput = html.find(sizeSelector)?.[0] ?? null;
        headshotInput = html.find(headshotSelector)?.[0] ?? null;
      }

      if (!sizeInput) {
        const root = html?.[0] ?? html;
        if (root?.querySelector) {
          sizeInput = root.querySelector(sizeSelector);
          headshotInput = root.querySelector(headshotSelector);
        }
      }

      const size = Number(sizeInput?.value);
      const headshot = headshotInput?.checked ?? false;
      
      return {
        size: Number.isFinite(size) && size > 0 ? size : defaultSize,
        headshot
      };
    },
    rejectClose: false
  });
};

/**
 * Roll close combat weapon damage (divided by target size)
 * @param {object} params
 * @param {Actor} params.actor
 * @param {Item} params.weapon
 * @param {number} [params.targetSize] - Optional target size
 * @param {boolean} [params.headshot] - Optional headshot flag
 */
BNW.dice.rollCloseCombatDamage = async function ({ actor, weapon, targetSize = null, headshot = false } = {}) {
  if (!actor) {
    console.warn('BNW | rollCloseCombatDamage requires an actor.');
    return null;
  }
  if (!weapon) {
    console.warn('BNW | rollCloseCombatDamage requires a weapon.');
    return null;
  }

  const damageType = weapon.system?.damageType ?? 'strength';
  const weaponModifier = Number(weapon.system?.damageModifier ?? 0);

  // Prompt for target size and headshot if not provided
  let resolvedSize = targetSize;
  let resolvedHeadshot = headshot;
  
  if (targetSize == null) {
    const defaultSize = 5;
    const result = await BNW.dice.promptTargetSize({
      defaultSize,
      weaponLabel: weapon.name
    });
    if (result == null) return null;
    
    resolvedSize = result.size;
    resolvedHeadshot = result.headshot;
  }

  const headshotBonus = resolvedHeadshot ? 2 : 0;
  let pool;
  let damageLabel;
  let totalModifier = weaponModifier;
  
  // Determine dice pool based on damage type
  if (damageType === 'fixed') {
    // Fixed damage - use weapon's fixed dice
    const fixedDice = Number(weapon.system?.fixedDamageDice ?? 0);
    pool = Math.max(fixedDice + headshotBonus, 1);
    damageLabel = `${fixedDice}d6${headshotBonus > 0 ? ` +${headshotBonus} Headshot` : ''}`;
  } else {
    // Trait-based damage (strength, stun, etc.)
    const systemData = actor.system ?? {};
    const trait = foundry.utils.getProperty(systemData, `traits.${damageType}`) ?? null;
    
    if (!trait) {
      ui.notifications?.warn?.(`Unknown damage type: ${damageType}`);
      return null;
    }
    
    const traitDice = Number(trait?.dice ?? 0);
    const traitBonus = Number(trait?.default ?? 0);
    pool = Math.max(traitDice + headshotBonus, 1);
    
    // Add trait bonus to weapon modifier for total
    totalModifier = weaponModifier + traitBonus;
    
    // Get trait configuration for label
    const traitConfig = CONFIG.BNW?.traits?.[damageType] ?? { label: damageType };
    damageLabel = traitConfig.label ?? damageType;
  }

  const formula = `${pool}d6x=6`;
  let roll = new Roll(formula);

  try {
    roll = await roll.evaluate();
  } catch (error) {
    console.error('BNW | Failed to evaluate damage roll', error);
    ui.notifications?.error?.('Failed to evaluate damage roll.');
    return null;
  }

  const diceResults = [];

  for (const term of roll.dice ?? []) {
    if (!term?.results) continue;

    let runningTotal = 0;
    for (const result of term.results) {
      if (result?.result == null) continue;

      const value = Number(result.result);
      if (!Number.isFinite(value)) continue;

      runningTotal += value;

      if (!result.exploded) {
        diceResults.push(runningTotal);
        runningTotal = 0;
      }
    }

    if (runningTotal > 0) {
      diceResults.push(runningTotal);
    }
  }

  if (!diceResults.length) {
    diceResults.push(0);
  }

  const highest = Math.max(...diceResults);
  const rawDamage = highest + totalModifier;
  const finalDamage = Math.floor(rawDamage / resolvedSize);

  const data = {
    actorName: actor.name,
    weaponName: weapon.name,
    traitLabel: damageLabel,
    pool,
    dice: diceResults,
    highest,
    damageModifier: totalModifier,
    rawDamage,
    targetSize: resolvedSize,
    finalDamage,
    headshot: resolvedHeadshot,
    title: `${weapon.name} - ${game?.i18n?.localize?.('BNW.Roll.Damage') ?? 'Damage'}${resolvedHeadshot ? ' (Headshot)' : ''}`
  };

  const systemBasePath =
    CONFIG.BNW?.systemBasePath ??
    game.system?.path ??
    (game.system?.id ? `systems/${game.system.id}` : '');
  const templateBasePath =
    CONFIG.BNW?.templatePath ?? (systemBasePath ? `${systemBasePath}/templates` : 'templates');
  const content = await foundry.applications.handlebars.renderTemplate(`${templateBasePath}/chat/close-combat-damage-roll-card.hbs`, data);

  return roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: data.title,
    content,
    flags: {
      bravenewworld: {
        weaponId: weapon.id,
        damageType,
        damageModifier: totalModifier,
        highest,
        rawDamage,
        targetSize: resolvedSize,
        finalDamage,
        pool,
        headshot: resolvedHeadshot
      }
    }
  });
};

/**
 * Roll weapon damage
 * @param {object} params
 * @param {Actor} params.actor
 * @param {Item} params.weapon
 */
BNW.dice.rollWeaponDamage = async function ({ actor, weapon } = {}) {
  if (!actor) {
    console.warn('BNW | rollWeaponDamage requires an actor.');
    return null;
  }
  if (!weapon) {
    console.warn('BNW | rollWeaponDamage requires a weapon.');
    return null;
  }

  // Check if this is a close combat weapon or ranged weapon - use new damage system
  if (weapon.type === 'closeCombatWeapon' || weapon.type === 'rangedWeapon') {
    return BNW.dice.rollCloseCombatDamage({ actor, weapon });
  }

  // Legacy weapon damage for other types
  const damageType = weapon.system?.damageType ?? 'strength';
  const damageModifier = Number(weapon.system?.damageModifier ?? 0);

  // Get the damage trait (typically strength)
  const systemData = actor.system ?? {};
  const trait = foundry.utils.getProperty(systemData, `traits.${damageType}`) ?? null;
  
  if (!trait) {
    ui.notifications?.warn?.(`Unknown damage type: ${damageType}`);
    return null;
  }

  const traitDice = Number(trait?.dice ?? 0);
  let pool = Math.max(traitDice, 1);

  // Get trait configuration for label
  const traitConfig = CONFIG.BNW?.traits?.[damageType] ?? { label: damageType };

  const formula = `${pool}d6x=6`;
  let roll = new Roll(formula);

  try {
    roll = await roll.evaluate();
  } catch (error) {
    console.error('BNW | Failed to evaluate damage roll', error);
    ui.notifications?.error?.('Failed to evaluate damage roll.');
    return null;
  }

  const diceResults = [];

  for (const term of roll.dice ?? []) {
    if (!term?.results) continue;

    let runningTotal = 0;
    for (const result of term.results) {
      if (result?.result == null) continue;

      const value = Number(result.result);
      if (!Number.isFinite(value)) continue;

      runningTotal += value;

      if (!result.exploded) {
        diceResults.push(runningTotal);
        runningTotal = 0;
      }
    }

    if (runningTotal > 0) {
      diceResults.push(runningTotal);
    }
  }

  if (!diceResults.length) {
    diceResults.push(0);
  }

  const highest = Math.max(...diceResults);
  const totalDamage = highest + damageModifier;

  const data = {
    actorName: actor.name,
    weaponName: weapon.name,
    traitLabel: traitConfig.label ?? damageType,
    pool,
    dice: diceResults,
    highest,
    damageModifier,
    totalDamage,
    title: `${weapon.name} - ${game?.i18n?.localize?.('BNW.Roll.Damage') ?? 'Damage'}`
  };

  // Create a simple chat message for damage
  const content = `
    <div class="bnw dice-roll damage-roll">
      <div class="roll-header">
        <h3>${data.weaponName}</h3>
        <span class="roll-type">${game?.i18n?.localize?.('BNW.Roll.Damage') ?? 'Damage'}</span>
      </div>
      <div class="roll-content">
        <div class="dice-results">
          <strong>${game?.i18n?.localize?.('BNW.Label.Highest') ?? 'Highest'}:</strong> ${highest}
          ${damageModifier !== 0 ? ` + ${damageModifier}` : ''}
        </div>
        <div class="roll-total">
          <strong>Total Damage:</strong> ${totalDamage}
        </div>
        <div class="roll-details">
          <em>${data.traitLabel} (${pool}d6): [${diceResults.join(', ')}]</em>
        </div>
      </div>
    </div>
  `;

  return roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: data.title,
    content,
    flags: {
      bravenewworld: {
        weaponId: weapon.id,
        damageType,
        damageModifier,
        highest,
        totalDamage,
        pool
      }
    }
  });
};

/**
 * Roll initiative for a character
 * @param {object} params
 * @param {Actor} params.actor
 */
BNW.dice.rollInitiative = async function ({ actor } = {}) {
  if (!actor) {
    console.warn('BNW | rollInitiative requires an actor.');
    return null;
  }

  const systemData = actor.system ?? {};
  console.log('BNW | rollInitiative - systemData:', systemData);
  console.log('BNW | rollInitiative - traits:', systemData.traits);
  
  const speedTrait = foundry.utils.getProperty(systemData, 'traits.speed') ?? null;
  console.log('BNW | rollInitiative - speedTrait:', speedTrait);
  
  if (!speedTrait) {
    ui.notifications?.warn?.('Actor must have Speed trait configured.');
    return null;
  }

  const speedDice = Number(speedTrait?.dice ?? 3);
  const speedDefault = Number(speedTrait?.default ?? 0);
  const targetNumber = 5;

  // Roll speed dice
  const formula = `${speedDice}d6x=6`;
  let roll = new Roll(formula);

  try {
    roll = await roll.evaluate();
  } catch (error) {
    console.error('BNW | Failed to evaluate initiative roll', error);
    ui.notifications?.error?.('Failed to evaluate initiative roll.');
    return null;
  }

  const diceResults = [];

  for (const term of roll.dice ?? []) {
    if (!term?.results) continue;

    let runningTotal = 0;
    for (const result of term.results) {
      if (result?.result == null) continue;

      const value = Number(result.result);
      if (!Number.isFinite(value)) continue;

      console.log('BNW | Initiative dice result:', value, 'exploded:', result.exploded, 'runningTotal before:', runningTotal);
      runningTotal += value;

      if (!result.exploded) {
        diceResults.push(runningTotal);
        console.log('BNW | Pushing dice result:', runningTotal);
        runningTotal = 0;
      }
    }

    if (runningTotal > 0) {
      diceResults.push(runningTotal);
      console.log('BNW | Pushing final running total:', runningTotal);
    }
  }

  console.log('BNW | All dice results:', diceResults);

  if (!diceResults.length) {
    diceResults.push(0);
  }

  const highest = Math.max(...diceResults);
  const finalResult = highest + speedDefault;
  const success = finalResult >= targetNumber;
  
  // Calculate actions: 1 base + 1 per success, capped at speed dice
  let actions = 1;
  if (success) {
    const margin = finalResult - targetNumber;
    const successes = 1 + Math.floor(margin / 5);
    actions = 1 + successes;
  }
  
  // Cap actions at speed dice count
  actions = Math.min(actions, speedDice);

  const data = {
    actorName: actor.name,
    speedDice: speedDice,
    speedDefault: speedDefault,
    dice: diceResults,
    highest,
    finalResult,
    target: targetNumber,
    success,
    actions,
    title: game?.i18n?.localize?.('BNW.Label.Initiative') ?? 'Initiative'
  };

  const systemBasePath =
    CONFIG.BNW?.systemBasePath ??
    game.system?.path ??
    (game.system?.id ? `systems/${game.system.id}` : '');
  const templateBasePath =
    CONFIG.BNW?.templatePath ?? (systemBasePath ? `${systemBasePath}/templates` : 'templates');
  const content = await foundry.applications.handlebars.renderTemplate(`${templateBasePath}/chat/initiative-roll-card.hbs`, data);

  return roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: data.title,
    content,
    flags: {
      bravenewworld: {
        rollType: 'initiative',
        speedDice,
        speedDefault,
        target: targetNumber,
        highest,
        finalResult,
        actions
      }
    }
  });
};

