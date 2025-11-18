/**
 * Brave New World Damage Application System
 * Handles damage application, armor reduction, and wound tracking
 */

// Initialize BNW damage namespace
window.BNW = window.BNW || {};
BNW.damage = BNW.damage || {};

/**
 * Apply damage to an actor with armor reduction and hit location tracking
 * @param {Actor} actor - The actor receiving damage
 * @param {number} damage - Raw damage points before armor and size division
 * @param {object} options - Additional options
 * @param {string} options.hitLocation - Specific hit location (head, leftArm, etc.)
 * @param {boolean} options.bypassArmor - Whether to ignore armor
 * @param {Actor} options.attacker - The attacking actor (for chat message)
 * @param {number} options.targetSize - Target size used to convert damage points to wounds
 */
BNW.damage.applyDamage = async function({ actor, damage, options = {} } = {}) {
  if (!actor) {
    ui.notifications.error('No actor specified for damage application');
    return;
  }

  const hitLocation = options.hitLocation || await this.promptHitLocation();
  if (!hitLocation) return; // User cancelled

  const bypassArmor = options.bypassArmor || false;
  const targetSize = Number(options.targetSize ?? 5) || 5;

  // Clamp raw damage to non-negative
  const rawDamage = Math.max(0, Number(damage ?? 0) || 0);

  // Get equipped armor
  const armor = bypassArmor ? null : this.getEquippedArmor(actor, hitLocation);

  // Determine effective deflection and absorption for this hit
  let armorName = game.i18n.localize('BNW.Label.Unarmored');
  let armorDeflection = 0;
  let armorMaxAbsorb = 0;
  let armorDurability = 0;

  if (armor) {
    armorName = armor.name;
    armorDeflection = Number(armor.deflection ?? 0) || 0;
    armorMaxAbsorb = Number(armor.woundsAbsorbed ?? 0) || 0;
    armorDurability = Number(armor.durability ?? 0) || 0;

    // If this location has no remaining durability, the armor no longer
    // provides deflection or absorption.
    const canStillAbsorb = armorMaxAbsorb > 0 && armorDurability > 0;
    if (!canStillAbsorb) {
      armorDeflection = 0;
    }
  }

  // Apply deflection before dividing by size
  const damageAfterDeflection = Math.max(0, rawDamage - armorDeflection);

  // Convert damage points to wounds
  const totalWounds = Math.floor(damageAfterDeflection / targetSize);

  // Split wounds between armor and wearer.
  // Armor can absorb at most 1 wound per hit, and only if durability > 0.
  let woundsToArmor = 0;
  let woundsToActor = totalWounds;

  const canAbsorbThisHit = armor && armorMaxAbsorb > 0 && armorDurability > 0 && totalWounds > 0;
  if (canAbsorbThisHit) {
    woundsToArmor = 1;
    woundsToActor = totalWounds - woundsToArmor;
  }

  // Update armor durability if applicable
  if (armor && armorMaxAbsorb > 0 && woundsToArmor > 0 && armor.item) {
    // Durability represents remaining capacity at this location;
    // each absorbed wound reduces it by 1.
    const newDurability = Math.max(0, armorDurability - 1);
    await armor.item.update({
      [`system.durability.${hitLocation}`]: newDurability
    });
    armorDurability = newDurability;
  }

  // Calculate final damage
  const damageAfterArmor = Math.max(0, woundsToActor);

  // Prepare damage application data
  const damageData = {
    actor: actor.name,
    attacker: options.attacker?.name || 'Unknown',
    rawDamage,
    hitLocation: this.getHitLocationLabel(hitLocation),
    hitLocationKey: hitLocation,
    armorName,
    armorDeflection,
    armorMaxAbsorb,
    armorDurability,
    totalWounds,
    woundsToArmor,
    finalDamage: damageAfterArmor,
    bypassedArmor: bypassArmor,
    targetSize
  };

  // Show confirmation dialog
  const confirmed = await this.confirmDamageApplication(damageData);
  if (!confirmed) return;

  // Apply wound to hit location
  const currentWound = actor.system.wounds[hitLocation] || 0;
  const newWound = currentWound + damageAfterArmor;

  await actor.update({
    [`system.wounds.${hitLocation}`]: newWound
  });

  // Create chat message
  await this.createDamageMessage(damageData);

  console.log(`BNW Damage | Applied ${damageAfterArmor} wounds to ${actor.name}'s ${hitLocation}`);
};

/**
 * Prompt user to select a hit location
 * @returns {Promise<string>} The selected hit location key
 */
BNW.damage.promptHitLocation = async function() {
  const locations = [
    { key: 'head', label: game.i18n.localize('BNW.HitLocation.Head') },
    { key: 'leftArm', label: game.i18n.localize('BNW.HitLocation.LeftArm') },
    { key: 'rightArm', label: game.i18n.localize('BNW.HitLocation.RightArm') },
    { key: 'torso', label: game.i18n.localize('BNW.HitLocation.Torso') },
    { key: 'leftLeg', label: game.i18n.localize('BNW.HitLocation.LeftLeg') },
    { key: 'rightLeg', label: game.i18n.localize('BNW.HitLocation.RightLeg') }
  ];

  const title = game.i18n.localize('BNW.Dialog.SelectHitLocation');
  const content = `
    <form>
      <div class="form-group">
        <label>${game.i18n.localize('BNW.Label.HitLocation')}:</label>
        <select name="hitLocation" autofocus>
          ${locations.map(loc => `<option value="${loc.key}">${loc.label}</option>`).join('')}
        </select>
      </div>
      <p class="hint">${game.i18n.localize('BNW.Hint.SelectHitLocation')}</p>
    </form>
  `;

  const dialogV2 = foundry?.applications?.api?.DialogV2;
  if (dialogV2?.prompt) {
    try {
      const result = await dialogV2.prompt({
        window: { title },
        content,
        ok: {
          label: game.i18n.localize('BNW.Button.Confirm'),
          callback: (event, button, dialog) => {
            const dialogElement = dialog.element ?? dialog;
            const form = dialogElement.querySelector('form');
            const select = form?.querySelector('select[name="hitLocation"]');
            return select?.value ?? locations[0]?.key ?? null;
          }
        },
        rejectClose: false
      });

      return result ?? null;
    } catch (error) {
      console.warn('BNW | DialogV2 hit location prompt failed, falling back to Dialog.prompt', error);
    }
  }

  return Dialog.prompt({
    title,
    content,
    label: game.i18n.localize('BNW.Button.Confirm'),
    callback: (html) => {
      const selector = 'select[name="hitLocation"]';

      let select = null;
      if (typeof html?.find === 'function') {
        select = html.find(selector)?.[0] ?? null;
      }

      if (!select) {
        const root = html?.[0] ?? html;
        if (root?.querySelector) {
          select = root.querySelector(selector);
        }
      }

      return select?.value ?? locations[0]?.key ?? null;
    },
    rejectClose: false
  });
};

/**
 * Get equipped armor that covers a specific hit location
 * @param {Actor} actor - The actor
 * @param {string} hitLocation - The hit location key
 * @returns {object|null} Armor data or null
 */
BNW.damage.getEquippedArmor = function(actor, hitLocation) {
  const armorItems = actor.items.filter(i => i.type === 'armor' && i.system.equipped);
  let bestArmor = null;

  for (const armor of armorItems) {
    if (armor.system.coverage && armor.system.coverage[hitLocation]) {
      const deflection = Number(armor.system.deflection ?? 0) || 0;
      const woundsAbsorbed = Number(armor.system.woundsAbsorbed ?? 0) || 0;
      const durability = Number(armor.system.durability?.[hitLocation] ?? 0) || 0;

      // Prefer the armor with the highest deflection value
      if (!bestArmor || deflection > bestArmor.deflection) {
        bestArmor = {
          name: armor.name,
          woundsAbsorbed,
          deflection,
          durability,
          item: armor
        };
      }
    }
  }

  return bestArmor;
};

/**
 * Confirm damage application with user
 * @param {object} damageData - Damage application data
 * @returns {Promise<boolean>} Whether user confirmed
 */
BNW.damage.confirmDamageApplication = async function(damageData) {
  const title = game.i18n.localize('BNW.Dialog.ConfirmDamage');
  const content = `
    <form class="bnw-damage-confirm">
      <div class="damage-summary">
        <h3>${game.i18n.localize('BNW.Label.DamageApplication')}</h3>
        <p><strong>${game.i18n.localize('BNW.Label.Target')}:</strong> ${damageData.actor}</p>
        <p><strong>${game.i18n.localize('BNW.Label.HitLocation')}:</strong> ${damageData.hitLocation}</p>
        <p><strong>${game.i18n.localize('BNW.Label.RawDamage')}:</strong> ${damageData.rawDamage}</p>
        ${!damageData.bypassedArmor ? `
          <p><strong>${game.i18n.localize('BNW.Label.Armor')}:</strong> ${damageData.armorName}${BNW.damage.formatArmorRating(damageData)}</p>
        ` : ''}
        <p class="final-damage"><strong>${game.i18n.localize('BNW.Label.FinalDamage')}:</strong> ${damageData.finalDamage} ${game.i18n.localize('BNW.Label.Wounds')}</p>
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
          label: game.i18n.localize('BNW.Button.ApplyDamage'),
          callback: () => true
        },
        rejectClose: false
      });

      return result === true;
    } catch (error) {
      console.warn('BNW | DialogV2 damage confirm failed, falling back to Dialog.confirm', error);
    }
  }

  return Dialog.confirm({
    title,
    content,
    yes: () => true,
    no: () => false,
    defaultYes: true
  });
};

/**
 * Create chat message for damage application
 * @param {object} damageData - Damage application data
 */
BNW.damage.createDamageMessage = async function(damageData) {
  const content = `
    <div class="bnw-damage-card">
      <h3>${game.i18n.localize('BNW.Label.DamageApplied')}</h3>
      <p><strong>${damageData.actor}</strong> ${game.i18n.localize('BNW.Label.WasHitIn')} <strong>${damageData.hitLocation}</strong></p>
      <div class="damage-details">
        <p>${game.i18n.localize('BNW.Label.RawDamage')}: ${damageData.rawDamage}</p>
        ${!damageData.bypassedArmor ? `<p>${game.i18n.localize('BNW.Label.Armor')}: ${damageData.armorName}${BNW.damage.formatArmorRating(damageData)}</p>` : ''}
        <p class="final"><strong>${game.i18n.localize('BNW.Label.WoundsTaken')}: ${damageData.finalDamage}</strong></p>
      </div>
    </div>
  `;

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize('BNW.System.Name') })
  });
};

/**
 * Get localized hit location label
 * @param {string} key - Hit location key
 * @returns {string} Localized label
 */
BNW.damage.getHitLocationLabel = function(key) {
  const labels = {
    head: 'BNW.HitLocation.Head',
    leftArm: 'BNW.HitLocation.LeftArm',
    rightArm: 'BNW.HitLocation.RightArm',
    torso: 'BNW.HitLocation.Torso',
    leftLeg: 'BNW.HitLocation.LeftLeg',
    rightLeg: 'BNW.HitLocation.RightLeg'
  };

  return game.i18n.localize(labels[key] || key);
};

/**
 * Format an armor rating string like \"10/3\" or \"10/—\".
 * Returns an empty string if there is effectively no armor.
 * @param {object} damageData
 * @returns {string}
 */
BNW.damage.formatArmorRating = function(damageData) {
  if (!damageData) return '';
  const deflection = Number(damageData.armorDeflection ?? 0) || 0;
  const maxAbsorb = Number(damageData.armorMaxAbsorb ?? 0) || 0;
  if (deflection <= 0 && maxAbsorb <= 0) return '';
  const absorbDisplay = maxAbsorb > 0 ? maxAbsorb : '—';
  return ` (${deflection}/${absorbDisplay})`;
};

/**
 * Hook into damage roll chat cards to add "Apply Damage" button
 * Uses renderChatMessageHTML (v13+) instead of deprecated renderChatMessage.
 */
Hooks.on('renderChatMessageHTML', (message, htmlElement) => {
  // Check if this is a damage roll
  const rollType = message.getFlag('bravenewworld', 'rollType');
  if (rollType !== 'damage') return;

  const finalDamage = message.getFlag('bravenewworld', 'finalDamage');
  if (finalDamage == null) return;

  // Prefer rawDamage and targetSize from the roll flags so we can
  // apply armor deflection before size division as per rules.
  const rawDamage = message.getFlag('bravenewworld', 'rawDamage') ?? finalDamage;
  const targetSize = message.getFlag('bravenewworld', 'targetSize') ?? 5;
  const hitLocationKey = message.getFlag('bravenewworld', 'hitLocationKey') ?? null;

  // Find the message content element (HTMLElement API)
  const contentElement = htmlElement.querySelector?.('.message-content');
  if (!contentElement) return;

  // Add apply damage button
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bnw-apply-damage';
  button.dataset.damage = String(finalDamage);
  button.innerHTML = `
    <i class="fas fa-heart-broken"></i> ${game.i18n.localize('BNW.Button.ApplyDamage')}
  `;

  contentElement.appendChild(button);

  // Attach click handler
  button.addEventListener('click', async (event) => {
    const damage = Number(rawDamage);
    const size = Number(targetSize) || 5;
    const hitLocation = hitLocationKey || null;

    // Get selected tokens
    const targets = Array.from(game.user.targets);
    if (targets.length === 0) {
      ui.notifications.warn(game.i18n.localize('BNW.Warning.NoTargetSelected'));
      return;
    }

    const target = targets[0];
    if (!target.actor) {
      ui.notifications.error(game.i18n.localize('BNW.Error.NoActorOnTarget'));
      return;
    }

    // Get attacker from message speaker
    const speaker = message.speaker;
    let attacker = null;
    if (speaker.token) {
      const token = canvas.tokens.get(speaker.token);
      attacker = token?.actor;
    } else if (speaker.actor) {
      attacker = game.actors.get(speaker.actor);
    }

    await BNW.damage.applyDamage({
      actor: target.actor,
      damage,
      options: {
        attacker,
        targetSize: size,
        hitLocation
      }
    });
  });
});

console.log('BNW | Damage application system loaded');
