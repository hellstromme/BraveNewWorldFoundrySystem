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
 * @param {number} damage - Amount of damage before armor
 * @param {object} options - Additional options
 * @param {string} options.hitLocation - Specific hit location (head, leftArm, etc.)
 * @param {boolean} options.bypassArmor - Whether to ignore armor
 * @param {Actor} options.attacker - The attacking actor (for chat message)
 */
BNW.damage.applyDamage = async function({ actor, damage, options = {} } = {}) {
  if (!actor) {
    ui.notifications.error('No actor specified for damage application');
    return;
  }

  const hitLocation = options.hitLocation || await this.promptHitLocation();
  if (!hitLocation) return; // User cancelled

  const bypassArmor = options.bypassArmor || false;

  // Get equipped armor
  const armor = bypassArmor ? null : this.getEquippedArmor(actor, hitLocation);
  const armorValue = armor?.woundsAbsorbed || 0;

  // Calculate final damage
  const damageAfterArmor = Math.max(0, damage - armorValue);

  // Prepare damage application data
  const damageData = {
    actor: actor.name,
    attacker: options.attacker?.name || 'Unknown',
    rawDamage: damage,
    hitLocation: this.getHitLocationLabel(hitLocation),
    hitLocationKey: hitLocation,
    armorName: armor?.name || game.i18n.localize('BNW.Label.Unarmored'),
    armorValue,
    finalDamage: damageAfterArmor,
    bypassedArmor: bypassArmor
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

  return new Promise((resolve) => {
    new Dialog({
      title: game.i18n.localize('BNW.Dialog.SelectHitLocation'),
      content,
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('BNW.Button.Confirm'),
          callback: (html) => {
            const form = html[0].querySelector('form');
            const location = form.hitLocation.value;
            resolve(location);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('BNW.Button.Cancel'),
          callback: () => resolve(null)
        }
      },
      default: 'ok'
    }).render(true);
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
  
  for (const armor of armorItems) {
    if (armor.system.coverage && armor.system.coverage[hitLocation]) {
      return {
        name: armor.name,
        woundsAbsorbed: armor.system.woundsAbsorbed || 0,
        deflection: armor.system.deflection || 0,
        item: armor
      };
    }
  }
  
  return null;
};

/**
 * Confirm damage application with user
 * @param {object} damageData - Damage application data
 * @returns {Promise<boolean>} Whether user confirmed
 */
BNW.damage.confirmDamageApplication = async function(damageData) {
  const content = `
    <form class="bnw-damage-confirm">
      <div class="damage-summary">
        <h3>${game.i18n.localize('BNW.Label.DamageApplication')}</h3>
        <p><strong>${game.i18n.localize('BNW.Label.Target')}:</strong> ${damageData.actor}</p>
        <p><strong>${game.i18n.localize('BNW.Label.HitLocation')}:</strong> ${damageData.hitLocation}</p>
        <p><strong>${game.i18n.localize('BNW.Label.RawDamage')}:</strong> ${damageData.rawDamage}</p>
        ${!damageData.bypassedArmor ? `
          <p><strong>${game.i18n.localize('BNW.Label.Armor')}:</strong> ${damageData.armorName} (${damageData.armorValue})</p>
        ` : ''}
        <p class="final-damage"><strong>${game.i18n.localize('BNW.Label.FinalDamage')}:</strong> ${damageData.finalDamage} ${game.i18n.localize('BNW.Label.Wounds')}</p>
      </div>
    </form>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title: game.i18n.localize('BNW.Dialog.ConfirmDamage'),
      content,
      buttons: {
        apply: {
          icon: '<i class="fas fa-heart-broken"></i>',
          label: game.i18n.localize('BNW.Button.ApplyDamage'),
          callback: () => resolve(true)
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('BNW.Button.Cancel'),
          callback: () => resolve(false)
        }
      },
      default: 'apply'
    }).render(true);
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
        ${!damageData.bypassedArmor ? `<p>${game.i18n.localize('BNW.Label.Armor')}: ${damageData.armorName} (-${damageData.armorValue})</p>` : ''}
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
 * Hook into damage roll chat cards to add "Apply Damage" button
 */
Hooks.on('renderChatMessage', (message, html) => {
  // Check if this is a damage roll
  const rollType = message.getFlag('bravenewworld', 'rollType');
  if (rollType !== 'damage') return;

  const finalDamage = message.getFlag('bravenewworld', 'finalDamage');
  if (finalDamage == null) return;

  // Add apply damage button
  const buttonHtml = `
    <button type="button" class="bnw-apply-damage" data-damage="${finalDamage}">
      <i class="fas fa-heart-broken"></i> ${game.i18n.localize('BNW.Button.ApplyDamage')}
    </button>
  `;

  html.find('.message-content').append(buttonHtml);

  // Attach click handler
  html.find('.bnw-apply-damage').click(async (event) => {
    const damage = Number(event.currentTarget.dataset.damage);
    
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
        attacker
      }
    });
  });
});

console.log('BNW | Damage application system loaded');
