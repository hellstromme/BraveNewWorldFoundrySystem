/**
 * Brave New World Combat Integration
 * Integrates BNW initiative rules with Foundry's Combat Tracker
 * 
 * BNW Combat Rules:
 * - Everyone rolls Speed (TN 5) for initiative
 * - Actions = 1 base + 1 per success (capped at Speed dice)
 * - Turn order: All combatants take action 1 (sorted by initiative), 
 *   then all take action 2 (same order), etc.
 */

/**
 * Set BNW initiative formula for Combat
 */
Hooks.on('init', () => {
  // Set default initiative formula for BNW system
  CONFIG.Combat.initiative = {
    formula: "3d6x=6",
    decimals: 2
  };

  // Store original method
  const originalGetInitiativeRoll = CONFIG.Actor.documentClass.prototype.getInitiativeRoll;

  /**
   * Get initiative roll for BNW system
   * Rolls Speed trait with TN 5, calculates actions
   */
  CONFIG.Actor.documentClass.prototype.getInitiativeRoll = async function(formula) {
    // Get Speed trait
    const speedTrait = this.system?.traits?.speed;
    if (!speedTrait) {
      ui.notifications.warn(`${this.name} has no Speed trait configured.`);
      return originalGetInitiativeRoll.call(this, formula);
    }

    const speedDice = Number(speedTrait.dice ?? 3);
    const speedDefault = Number(speedTrait.default ?? 0);

    // BNW initiative formula: Xd6x=6 (exploding 6s)
    const rollFormula = `${speedDice}d6x=6`;
    const roll = await new Roll(rollFormula).evaluate();

    return roll;
  };

  // Override Combat setupTurns to create BNW-style turn order
  const originalSetupTurns = Combat.prototype.setupTurns;
  
  Combat.prototype.setupTurns = function() {
    // Call original to get base combatants
    const turns = originalSetupTurns.call(this);
    
    // Build BNW turn order with action cycles
    const bnwTurns = [];
    
    // Find max actions across all combatants
    let maxActions = 1;
    for (const combatant of turns) {
      const actions = combatant.getFlag('bravenewworld', 'actionsTotal') ?? 1;
      maxActions = Math.max(maxActions, actions);
    }
    
    // Create turns for each action cycle
    for (let actionNum = 1; actionNum <= maxActions; actionNum++) {
      // Add all combatants that have at least this many actions
      for (const combatant of turns) {
        const actionsTotal = combatant.getFlag('bravenewworld', 'actionsTotal') ?? 1;
        if (actionNum <= actionsTotal) {
          // Create a virtual turn entry
          bnwTurns.push({
            ...combatant,
            _id: `${combatant.id}-action${actionNum}`, // Virtual ID for this action
            _actionNumber: actionNum,
            _originalCombatant: combatant
          });
        }
      }
    }
    
    return bnwTurns;
  };
});

/**
 * Hook into Combat.rollInitiative to calculate BNW actions
 */
Hooks.on('preCreateCombatant', (combatant, data, options, userId) => {
  // Initialize BNW-specific flags
  combatant.updateSource({
    'flags.bravenewworld.actionsTotal': 1,
    'flags.bravenewworld.actionsRemaining': 1,
    'flags.bravenewworld.speedRoll': 0
  });
});

/**
 * Calculate actions from initiative roll
 */
Hooks.on('updateCombatant', async (combatant, change, options, userId) => {
  // Only process if initiative changed
  if (!change.initiative) return;

  const actor = combatant.actor;
  if (!actor) return;

  const speedTrait = actor.system?.traits?.speed;
  if (!speedTrait) return;

  const speedDice = Number(speedTrait.dice ?? 3);
  const speedDefault = Number(speedTrait.default ?? 0);
  const targetNumber = 5;

  // Get the roll from the combatant
  const roll = combatant.rolls?.[0];
  if (!roll) return;

  // Parse dice results to find highest (accounting for exploding dice)
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

  // Store in combatant flags
  await combatant.setFlag('bravenewworld', 'actionsTotal', actions);
  await combatant.setFlag('bravenewworld', 'speedRoll', finalResult);

  console.log(`BNW Combat | ${actor.name} rolled ${finalResult}, has ${actions} actions this round`);
  
  // Rebuild turn order after initiative changes
  if (combatant.combat) {
    await combatant.combat.setupTurns();
  }
});

/**
 * Hook into combat updates for round changes
 */
Hooks.on('updateCombat', async (combat, change, options, userId) => {
  // Handle round changes - re-roll initiative
  if ('round' in change) {
    console.log('BNW Combat | New round started, rolling initiative for all combatants');

    // Roll initiative for all combatants at the start of each round
    const combatantIds = combat.combatants.map(c => c.id);
    await combat.rollInitiative(combatantIds);
  }
});

/**
 * Render hook to display action numbers in combat tracker
 */
Hooks.on('renderCombatTracker', (app, html, data) => {
  // html is an HTMLElement in v13, not jQuery
  const element = html instanceof HTMLElement ? html : html[0];
  if (!element) return;

  // Add action indicators to each combatant
  const combatants = element.querySelectorAll('.combatant');
  combatants.forEach((combatantElement) => {
    const combatantId = combatantElement.dataset.combatantId;
    
    // Check if this is a virtual turn (has action number in ID)
    const match = combatantId?.match(/^(.+)-action(\d+)$/);
    if (match) {
      const realCombatantId = match[1];
      const actionNumber = match[2];
      const combatant = game.combat?.combatants.get(realCombatantId);
      
      if (!combatant) return;
      
      const actionsTotal = combatant.getFlag('bravenewworld', 'actionsTotal') ?? 1;

      // Create action indicator showing which action this is
      const actionIndicator = document.createElement('div');
      actionIndicator.classList.add('bnw-actions');
      actionIndicator.textContent = `#${actionNumber}`;
      actionIndicator.title = `Action ${actionNumber} of ${actionsTotal}`;

      // Insert after the initiative value
      const initiativeElement = combatantElement.querySelector('.token-initiative');
      if (initiativeElement) {
        initiativeElement.parentNode.insertBefore(actionIndicator, initiativeElement.nextSibling);
      }
    }
  });
});

console.log('BNW | Combat tracker integration loaded');
