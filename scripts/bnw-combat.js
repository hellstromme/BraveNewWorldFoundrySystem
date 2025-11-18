/**
 * Brave New World Combat Integration
 * Integrates BNW initiative rules with Foundry's Combat Tracker
 * 
 * BNW Combat Rules:
 * - Everyone rolls Speed (TN 5) for initiative
 * - Actions = 1 base + 1 per success (capped at Speed dice)
 * - Turn order: All combatants take action 1 (sorted by initiative), 
 *   then all take action 2 (same order), etc.
 * 
 * Implementation: Creates duplicate combatant entries for each action.
 * Each actor appears N times in the tracker based on their action count.
 */

/**
 * Set BNW initiative formula for Combat
 */
Hooks.on('init', () => {
  console.log('BNW Combat | init hook fired - setting up combat integration');
  
  // Set default initiative formula for BNW system
  CONFIG.Combat.initiative = {
    formula: "3d6x=6",
    decimals: 2
  };

  console.log('BNW Combat | Combat initiative formula set:', CONFIG.Combat.initiative);

  // Override Combatant._getInitiativeFormula to use actor's Speed trait
  const originalGetInitiativeFormula = CONFIG.Combatant.documentClass.prototype._getInitiativeFormula;
  
  console.log('BNW Combat | Combatant._getInitiativeFormula exists?', !!originalGetInitiativeFormula);
  
  CONFIG.Combatant.documentClass.prototype._getInitiativeFormula = function() {
    console.log('BNW Combat | _getInitiativeFormula called for combatant:', this.name);
    
    const actor = this.actor;
    if (!actor) {
      console.log('BNW Combat | No actor, using default formula');
      return originalGetInitiativeFormula?.call(this) || CONFIG.Combat.initiative.formula;
    }
    
    const speedTrait = actor.system?.traits?.speed;
    console.log('BNW Combat | Speed trait:', speedTrait);
    
    if (!speedTrait) {
      console.log('BNW Combat | No speed trait, using default formula');
      return originalGetInitiativeFormula?.call(this) || CONFIG.Combat.initiative.formula;
    }
    
    const speedDice = Number(speedTrait.dice ?? 3);
    const speedDefault = Number(speedTrait.default ?? 0);
    
    // BNW initiative formula: Xd6x=6 + default bonus
    const formula = speedDefault > 0 
      ? `${speedDice}d6x=6 + ${speedDefault}`
      : `${speedDice}d6x=6`;
    
    console.log('BNW Combat | Generated formula for', actor.name, ':', formula);
    
    return formula;
  };

  console.log('BNW Combat | Combatant._getInitiativeFormula override complete');

  console.log('BNW Combat | About to override Combat.prototype.rollInitiative');
  
  // Override Combat.rollInitiative to handle BNW action creation
  const originalRollInitiative = Combat.prototype.rollInitiative;
  
  console.log('BNW Combat | Original rollInitiative:', typeof originalRollInitiative);
  
  Combat.prototype.rollInitiative = async function(ids, options={}) {
    console.log('BNW Combat | CUSTOM rollInitiative called with ids:', ids);
    
    // Call original rollInitiative
    const result = await originalRollInitiative.call(this, ids, options);
    
    console.log('BNW Combat | Original rollInitiative completed, processing combatants');
    
    // Wait a tick for roll data to be saved
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now process each combatant to create duplicates
    for (const id of ids) {
      const combatant = this.combatants.get(id);
      if (!combatant) continue;
      
      console.log('BNW Combat | Processing combatant after initiative roll:', combatant.name);
      console.log('BNW Combat | Combatant initiative value:', combatant.initiative);
      console.log('BNW Combat | Combatant isPrimaryCombatant flag:', combatant.getFlag('bravenewworld', 'isPrimaryCombatant'));
      
      // Only process primary combatants - check === true to avoid undefined
      if (combatant.getFlag('bravenewworld', 'isPrimaryCombatant') !== true) {
        console.log('BNW Combat | Skipping non-primary combatant');
        continue;
      }
      
      await processCombatantInitiative(combatant);
    }
    
    // Reset to first turn after creating duplicates
    if (this.combatants.size > 0) {
      await this.update({ turn: 0 });
      console.log('BNW Combat | Reset combat to first turn');
    }
    
    return result;
  };
  
  console.log('BNW Combat | Combat.prototype.rollInitiative override complete');
});

/**
 * Initialize combatant with BNW flags
 */
Hooks.on('preCreateCombatant', (combatant, data, options, userId) => {
  // Only initialize if not already set (don't overwrite flags from duplicate creation)
  if (!('flags' in data && 'bravenewworld' in data.flags)) {
    combatant.updateSource({
      'flags.bravenewworld.actionsTotal': 1,
      'flags.bravenewworld.speedRoll': 0,
      'flags.bravenewworld.isPrimaryCombatant': true,
      'flags.bravenewworld.actionNumber': 1
    });
    console.log('BNW Combat | Initialized combatant as primary:', combatant.name);
  } else {
    console.log('BNW Combat | Combatant already has BNW flags, skipping initialization:', combatant.name);
  }
});

/**
 * Process combatant initiative and create duplicates
 */
async function processCombatantInitiative(combatant) {
  const actor = combatant.actor;
  if (!actor) {
    console.log('BNW Combat | No actor found');
    return;
  }

  const speedTrait = actor.system?.traits?.speed;
  if (!speedTrait) {
    console.log('BNW Combat | No speed trait found');
    return;
  }

  const speedDice = Number(speedTrait.dice ?? 3);
  const speedDefault = Number(speedTrait.default ?? 0);
  const targetNumber = 5;

  // Get initiative value (this is the final result after roll + bonus)
  const initiativeValue = combatant.initiative;
  if (initiativeValue == null) {
    console.log('BNW Combat | No initiative value found');
    return;
  }

  console.log('BNW Combat | Processing initiative for', actor.name, 'with value:', initiativeValue);

  // The initiative value is already the highest die + default bonus
  // We need to calculate actions based on this
  const finalResult = initiativeValue;
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

  // Store in combatant flags
  await combatant.setFlag('bravenewworld', 'actionsTotal', actions);
  await combatant.setFlag('bravenewworld', 'speedRoll', finalResult);

  console.log(`BNW Combat | ${actor.name} initiative ${finalResult}, has ${actions} actions this round`);

  // Create duplicate combatants for additional actions
  await createActionCombatants(combatant, actions, combatant.initiative);
}

/**
 * Create duplicate combatant entries for each action
 */
async function createActionCombatants(primaryCombatant, actionCount, initiativeValue) {
  const combat = primaryCombatant.combat;
  if (!combat) return;

  // Delete any existing duplicate combatants for this actor
  const duplicates = combat.combatants.filter(c => 
    c.actorId === primaryCombatant.actorId &&
    !c.getFlag('bravenewworld', 'isPrimaryCombatant') &&
    c.id !== primaryCombatant.id
  );
  
  if (duplicates.length > 0) {
    await combat.deleteEmbeddedDocuments('Combatant', duplicates.map(c => c.id));
    console.log(`BNW Combat | Deleted ${duplicates.length} old duplicate combatants`);
  }

  // Create duplicate combatants for actions 2 through N
  const duplicateData = [];
  for (let actionNum = 2; actionNum <= actionCount; actionNum++) {
    // Use a large offset per action number to ensure proper grouping
    // All action 1's sort by initiative, then all action 2's, then all action 3's
    // Subtract 100 * (actionNum - 1) to create clear separation between action cycles
    const adjustedInitiative = initiativeValue - (100 * (actionNum - 1));
    
    duplicateData.push({
      tokenId: primaryCombatant.tokenId,
      sceneId: primaryCombatant.sceneId,
      actorId: primaryCombatant.actorId,
      hidden: primaryCombatant.hidden,
      initiative: adjustedInitiative,
      flags: {
        bravenewworld: {
          isPrimaryCombatant: false,
          actionNumber: actionNum,
          actionsTotal: actionCount,
          speedRoll: primaryCombatant.getFlag('bravenewworld', 'speedRoll'),
          primaryCombatantId: primaryCombatant.id
        }
      }
    });
  }

  if (duplicateData.length > 0) {
    await combat.createEmbeddedDocuments('Combatant', duplicateData);
    console.log(`BNW Combat | Created ${duplicateData.length} duplicate combatants for ${primaryCombatant.name}`);
  }
}

/**
 * Hook into combat updates for round changes
 */
Hooks.on('updateCombat', async (combat, change, options, userId) => {
  // Handle round changes - re-roll initiative
  if ('round' in change) {
    console.log('BNW Combat | New round started, rolling initiative for all combatants');

    // First, get list of primary combatants BEFORE deletion
    const primaryCombatants = combat.combatants.filter(c => 
      c.getFlag('bravenewworld', 'isPrimaryCombatant') === true
    );
    const combatantIds = primaryCombatants.map(c => c.id);
    
    console.log(`BNW Combat | Found ${combatantIds.length} primary combatants before deletion`);
    console.log('BNW Combat | Primary combatant IDs:', combatantIds);

    // Delete all duplicate combatants from previous round
    const duplicates = combat.combatants.filter(c => 
      c.getFlag('bravenewworld', 'isPrimaryCombatant') === false
    );
    
    if (duplicates.length > 0) {
      console.log(`BNW Combat | Deleting ${duplicates.length} duplicate combatants from previous round`);
      await combat.deleteEmbeddedDocuments('Combatant', duplicates.map(c => c.id));
    }
    
    console.log(`BNW Combat | Rolling initiative for ${combatantIds.length} primary combatants`);
    
    if (combatantIds.length > 0) {
      await combat.rollInitiative(combatantIds);
    }
  }
});

/**
 * Clean up duplicate combatants when primary is deleted
 */
Hooks.on('preDeleteCombatant', async (combatant, options, userId) => {
  const isPrimary = combatant.getFlag('bravenewworld', 'isPrimaryCombatant') !== false;
  
  if (isPrimary) {
    // Delete all duplicates for this actor
    const combat = combatant.combat;
    if (!combat) return;
    
    const duplicates = combat.combatants.filter(c => 
      c.actorId === combatant.actorId &&
      !c.getFlag('bravenewworld', 'isPrimaryCombatant') &&
      c.id !== combatant.id
    );
    
    if (duplicates.length > 0) {
      await combat.deleteEmbeddedDocuments('Combatant', duplicates.map(c => c.id));
    }
  }
});

/**
 * Hook to customize initiative chat messages with BNW template
 */
Hooks.on('preCreateChatMessage', async (message, data, options, userId) => {
  // Only process initiative rolls
  if (!message.rolls?.length) return;
  if (!message.flavor?.includes('Initiative')) return;
  
  const roll = message.rolls[0];
  const combatant = message.speaker?.token ? game.combat?.combatants.find(c => c.tokenId === message.speaker.token) : null;
  
  if (!combatant?.actor) return;
  
  const actor = combatant.actor;
  const speedTrait = actor.system?.traits?.speed;
  
  if (!speedTrait) return;
  
  const speedDice = Number(speedTrait.dice ?? 3);
  const speedDefault = Number(speedTrait.default ?? 0);
  const targetNumber = 5;
  
  // Parse the roll to get dice results
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
  
  if (!diceResults.length) diceResults.push(0);
  
  const highest = Math.max(...diceResults);
  const finalResult = highest + speedDefault;
  const success = finalResult >= targetNumber;
  
  // Calculate actions
  let actions = 1;
  if (success) {
    const margin = finalResult - targetNumber;
    const successes = 1 + Math.floor(margin / 5);
    actions = 1 + successes;
  }
  actions = Math.min(actions, speedDice);
  
  // Prepare data for custom template
  const templateData = {
    actorName: actor.name,
    speedDice: speedDice,
    speedDefault: speedDefault,
    dice: diceResults,
    highest,
    finalResult,
    target: targetNumber,
    success,
    actions,
    title: game.i18n.localize('BNW.Label.Initiative') || 'Initiative'
  };
  
  // Render custom template
  const systemBasePath = CONFIG.BNW?.systemBasePath ?? game.system?.path ?? `systems/${game.system.id}`;
  const templateBasePath = CONFIG.BNW?.templatePath ?? `${systemBasePath}/templates`;
  const content = await foundry.applications.handlebars.renderTemplate(
    `${templateBasePath}/chat/initiative-roll-card.hbs`, 
    templateData
  );
  
  // Update message with custom content
  message.updateSource({ content });
  
  // Add BNW flags
  message.updateSource({
    'flags.bravenewworld': {
      rollType: 'initiative',
      speedDice,
      speedDefault,
      target: targetNumber,
      highest,
      finalResult,
      actions
    }
  });
  
  console.log('BNW Combat | Customized initiative chat message for', actor.name);
});
Hooks.on('renderCombatTracker', (app, html, data) => {
  // html is an HTMLElement in v13, not jQuery
  const element = html instanceof HTMLElement ? html : html[0];
  if (!element) return;

  // Add action indicators to each combatant
  const combatants = element.querySelectorAll('.combatant');
  combatants.forEach((combatantElement) => {
    const combatantId = combatantElement.dataset.combatantId;
    const combatant = game.combat?.combatants.get(combatantId);
    
    if (!combatant) return;
    
    const actionNumber = combatant.getFlag('bravenewworld', 'actionNumber') ?? 1;
    const actionsTotal = combatant.getFlag('bravenewworld', 'actionsTotal') ?? 1;
    const isPrimary = combatant.getFlag('bravenewworld', 'isPrimaryCombatant') ?? true;

    // Only show action indicator if actor has multiple actions
    if (actionsTotal > 1) {
      // Create action indicator showing which action this is
      const actionIndicator = document.createElement('div');
      actionIndicator.classList.add('bnw-actions');
      actionIndicator.textContent = `#${actionNumber}`;
      actionIndicator.title = `Action ${actionNumber} of ${actionsTotal}`;

      // Insert after the combatant name
      const nameElement = combatantElement.querySelector('.token-name h4');
      if (nameElement) {
        nameElement.appendChild(actionIndicator);
      }
    }
  });
});

console.log('BNW | Combat tracker integration loaded');
