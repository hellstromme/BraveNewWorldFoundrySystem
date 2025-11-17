/**
 * Brave New World Actor Sheet - Application V2
 * Modern implementation using Foundry VTT Application V2 framework
 */

// Create the base class with HandlebarsApplicationMixin applied
const ActorSheetV2Base = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
);

class BraveNewWorldActorSheetV2 extends ActorSheetV2Base {
  
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['bravenewworld', 'sheet', 'actor', 'bnw'],
    position: {
      width: 720,
      height: 720
    },
    window: {
      resizable: true,
      contentClasses: ['standard-form']
    },
    actions: {
      changeTab: BraveNewWorldActorSheetV2.prototype._onChangeTab,
      rollSkill: BraveNewWorldActorSheetV2.prototype._onRollSkill,
      rollPower: BraveNewWorldActorSheetV2.prototype._onRollPower,
      rollWeaponAttack: BraveNewWorldActorSheetV2.prototype._onRollWeaponAttack,
      rollWeaponDamage: BraveNewWorldActorSheetV2.prototype._onRollWeaponDamage,
      rollInitiative: BraveNewWorldActorSheetV2.prototype._onRollInitiative,
      createItem: BraveNewWorldActorSheetV2.prototype._onCreateItem,
      editItem: BraveNewWorldActorSheetV2.prototype._onEditItem,
      deleteItem: BraveNewWorldActorSheetV2.prototype._onDeleteItem,
      editImage: BraveNewWorldActorSheetV2.prototype._onEditImage,
      selectArmor: BraveNewWorldActorSheetV2.prototype._onSelectArmor,
      adjustArmorDurability: BraveNewWorldActorSheetV2.prototype._onAdjustArmorDurability
    },
    form: {
      submitOnChange: true
    },
    dragDrop: [
      { dragSelector: '.item[data-item-id]', dropSelector: 'form' }
    ]
  };

  /** @override */
  static PARTS = {
    form: {
      template: "systems/bravenewworld/templates/actors/actor-sheet-v2.hbs",
      scrollable: [".tab.active"]
    }
  };

  /** @override */
  tabGroups = {
    primary: "traits"
  };

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    // Add actor to context for templates
    context.actor = this.document;
    context.system = foundry.utils.deepClone(this.document.system);
    
    console.log('BNW Actor | Preparing context', {
      actorName: this.document.name,
      hasTraits: !!context.system.traits,
      hasSkills: !!context.system.skills
    });
    
    // Initialize defaults in the cloned context only (no saves)
    this._initializeDefaults(context.system);
    
    // Prepare data for display
    context.traits = this._prepareTraits(context.system.traits);
    context.powers = this.document.items.filter(i => i.type === 'power');
    context.tricks = this.document.items.filter(i => i.type === 'trick');
    context.quirks = this.document.items.filter(i => i.type === 'quirk');
    context.closeCombatWeapons = this._prepareWeapons(this.document.items.filter(i => i.type === 'closeCombatWeapon'));
    context.rangedWeapons = this._prepareWeapons(this.document.items.filter(i => i.type === 'rangedWeapon'));
    context.skills = this.document.items.filter(i => i.type === 'skill');
    context.negativeQuirksTotal = this._calculateNegativeQuirksTotal(context.quirks);
    context.woundsData = this._prepareWounds(context.system);
    
    // Manually prepare tabs data since ApplicationV2 doesn't auto-populate it
    context.tabs = {};
    for (const [groupId, activeTab] of Object.entries(this.tabGroups)) {
      context.tabs[groupId] = {
        active: activeTab,
        tabs: {
          traits: { id: "traits", group: groupId, label: "Traits & Skills", active: activeTab === "traits" },
          powers: { id: "powers", group: groupId, label: "Powers", active: activeTab === "powers" },
          tricks: { id: "tricks", group: groupId, label: "Tricks", active: activeTab === "tricks" },
          quirks: { id: "quirks", group: groupId, label: "Quirks", active: activeTab === "quirks" },
          combat: { id: "combat", group: groupId, label: "Combat", active: activeTab === "combat" },
          notes: { id: "notes", group: groupId, label: "Notes", active: activeTab === "notes" }
        }
      };
    }
    
    // Add tabsActive for template compatibility
    context.tabsActive = this.tabGroups.primary || 'traits';
    
    console.log('BNW Actor | Context prepared', {
      traitsCount: context.traits.length,
      skillsCount: context.skills.length,
      powersCount: context.powers.length,
      tricksCount: context.tricks.length,
      quirksCount: context.quirks.length,
      closeCombatWeaponsCount: context.closeCombatWeapons.length,
      rangedWeaponsCount: context.rangedWeapons.length,
      totalItems: this.document.items.size,
      tabsActive: context.tabs.primary?.active
    });
    
    return context;
  }

  /**
   * Prepare context for a specific part
   * @override
   */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    
    // Each part receives the full context prepared by _prepareContext
    // No need to filter - templates will use what they need
    
    return context;
  }

  /* -------------------------------------------- */
  /*  Data Preparation Helpers                    */
  /* -------------------------------------------- */

  /**
   * Initialize default values for system data in the context clone
   * This does NOT save to the database - only provides defaults for rendering
   * @param {object} system - The cloned system data
   * @private
   */
  _initializeDefaults(system) {
    // Initialize details with empty defaults
    system.details ??= {};
    const defaultDetails = {
      playerName: '',
      heroName: '',
      codeName: '',
      origin: '',
      affiliation: '',
      background: ''
    };
    foundry.utils.mergeObject(system.details, defaultDetails, { insertKeys: false });
    
    // Initialize traits from config
    system.traits ??= {};
    for (const [key, config] of Object.entries(CONFIG.BNW.traits)) {
      if (!system.traits[key]) {
        system.traits[key] = { dice: config.dice, default: config.default };
      }
    }
    
    // Initialize wounds - only add missing properties, don't overwrite existing values
    system.wounds ??= {};
    const woundLocations = ['head', 'leftArm', 'rightArm', 'torso', 'leftLeg', 'rightLeg'];
    for (const location of woundLocations) {
      // Only set to 0 if undefined - preserve existing values
      if (system.wounds[location] === undefined) {
        system.wounds[location] = 0;
      }
    }
    
    system.notes ??= '';
  }

  /**
   * Prepare trait data for rendering
   * @param {object} traits
   * @returns {Array}
   * @private
   */
  _prepareTraits(traits = {}) {
    const configTraits = CONFIG.BNW?.traits ?? {};
    
    return Object.entries(configTraits).map(([key, config]) => {
      const actorTrait = traits[key] ?? {};
      return {
        key,
        label: config.label ?? this._capitalize(key),
        dice: Number(actorTrait?.dice ?? config.dice ?? 3),
        default: Number(actorTrait?.default ?? config.default ?? 0)
      };
    });
  }

  /**
   * Calculate total negative quirk points
   * @param {Array} quirks
   * @returns {number}
   * @private
   */
  _calculateNegativeQuirksTotal(quirks = []) {
    let total = 0;
    for (const quirk of quirks) {
      const cost = Number(quirk.system?.cost ?? 0);
      if (cost < 0) {
        total += cost;
      }
    }
    return Math.abs(total);
  }

  /**
   * Prepare wounds data for rendering with armor information
   * @param {object} system
   * @returns {object}
   * @private
   */
  _prepareWounds(system) {
    // Get strength dice value for max wounds
    const strengthDice = Number(system.traits?.strength?.dice ?? 3);
    
    // Initialize wounds if not present
    system.wounds ??= {};
    
    // Define hit locations with their localization keys
    const hitLocations = [
      { key: 'head', labelKey: 'BNW.HitLocation.Head' },
      { key: 'leftArm', labelKey: 'BNW.HitLocation.LeftArm' },
      { key: 'rightArm', labelKey: 'BNW.HitLocation.RightArm' },
      { key: 'torso', labelKey: 'BNW.HitLocation.Torso' },
      { key: 'leftLeg', labelKey: 'BNW.HitLocation.LeftLeg' },
      { key: 'rightLeg', labelKey: 'BNW.HitLocation.RightLeg' }
    ];
    
    // Get equipped armor items
    const equippedArmor = this.document.items.filter(i => i.type === 'armor' && i.system?.equipped);
    
    // Build armor coverage map
    const armorByLocation = {};
    hitLocations.forEach(loc => {
      armorByLocation[loc.key] = {
        deflection: 0,
        durability: 0,
        maxDurability: 0,
        armorItems: []
      };
    });
    
    // Process each equipped armor
    equippedArmor.forEach(armor => {
      hitLocations.forEach(loc => {
        const covered = armor.system?.coverage?.[loc.key] ?? false;
        if (covered) {
          const deflection = Number(armor.system?.deflection ?? 0);
          const durability = Number(armor.system?.durability?.[loc.key] ?? 0);
          const woundsAbsorbed = Number(armor.system?.woundsAbsorbed ?? 0);
          
          // Add deflection values (they stack)
          armorByLocation[loc.key].deflection += deflection;
          
          // Track the armor with highest durability for this location
          if (durability > armorByLocation[loc.key].durability) {
            armorByLocation[loc.key].durability = durability;
            armorByLocation[loc.key].maxDurability = woundsAbsorbed;
          }
          
          armorByLocation[loc.key].armorItems.push({
            id: armor.id,
            name: armor.name,
            woundsAbsorbed: woundsAbsorbed
          });
        }
      });
    });
    
    const woundsData = hitLocations.map(location => {
      // Get current wounds, ensure it's a number, and cap at max
      let current = Number(system.wounds[location.key] ?? 0);
      current = Math.min(Math.max(0, current), strengthDice);
      
      const armorData = armorByLocation[location.key];
      
      return {
        key: location.key,
        label: game.i18n.localize(location.labelKey),
        current: current,
        max: strengthDice,
        isMaxed: current >= strengthDice,
        deflection: armorData.deflection,
        durability: armorData.durability,
        maxDurability: armorData.maxDurability,
        hasArmor: armorData.armorItems.length > 0,
        armorItems: armorData.armorItems
      };
    });
    
    // Get armor names for display
    const armorNames = equippedArmor.map(a => a.name).join(', ');
    
    return {
      locations: woundsData,
      equippedArmorNames: armorNames || game.i18n.localize('BNW.Label.Unarmored'),
      hasArmor: equippedArmor.length > 0
    };
  }

  /**
   * Prepare weapons data for rendering
   * @param {Array} weapons - Array of weapon items
   * @returns {Array}
   * @private
   */
  _prepareWeapons(weapons = []) {
    const configTraits = CONFIG.BNW?.traits ?? {};
    
    return weapons.map(weapon => {
      const enrichedWeapon = foundry.utils.deepClone(weapon);
      
      // Look up skill - handle both legacy ID and new name-based storage
      const skillRef = weapon.system?.attackSkill;
      let skill = null;
      
      if (skillRef) {
        // Try to find by name first (new system)
        skill = this.document.items.find(i => i.type === 'skill' && i.name === skillRef);
        
        // Fallback: try by ID (legacy system)
        if (!skill) {
          skill = this.document.items.get(skillRef);
        }
        
        if (skill) {
          enrichedWeapon.attackSkillName = skill.name;
          // Get trait from the skill
          const traitKey = skill.system?.trait;
          enrichedWeapon.attackTraitLabel = configTraits[traitKey]?.label ?? traitKey ?? '—';
        } else {
          // Show what we have, even if not found
          enrichedWeapon.attackSkillName = skillRef;
          enrichedWeapon.attackTraitLabel = '—';
        }
      } else {
        enrichedWeapon.attackSkillName = '—';
        enrichedWeapon.attackTraitLabel = '—';
      }
      
      return enrichedWeapon;
    });
  }

  /**
   * Capitalize first letter of string
   * @param {string} value
   * @returns {string}
   * @private
   */
  _capitalize(value) {
    if (typeof value !== 'string' || !value.length) return value ?? '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  /**
   * Handle skill roll action
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onRollSkill(event, target) {
    const { trait, skillId } = target.dataset;
    
    await BNW.dice.rollTraitSkill({
      actor: this.document,
      traitKey: trait,
      skillId: skillId
    });
  }

  /**
   * Handle power roll action
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onRollPower(event, target) {
    const { itemId } = target.dataset;
    const item = this.document.items.get(itemId);
    if (!item) return;

    const traitKey = item.system?.trait ?? '';
    const skillId = item.system?.skill ?? '';

    await BNW.dice.rollTraitSkill({
      actor: this.document,
      traitKey,
      skillId,
      bonusDice: Number(item.system?.dice ?? 0),
      label: item.name,
      sourceItem: item
    });
  }  /**
   * Handle weapon attack roll
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onRollWeaponAttack(event, target) {
    const { itemId } = target.dataset;
    const weapon = this.document.items.get(itemId);
    if (!weapon) return;

    await BNW.dice.rollWeaponAttack({
      actor: this.document,
      weapon: weapon
    });
  }

  /**
   * Handle weapon damage roll
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onRollWeaponDamage(event, target) {
    const { itemId } = target.dataset;
    const weapon = this.document.items.get(itemId);
    if (!weapon) return;

    await BNW.dice.rollWeaponDamage({
      actor: this.document,
      weapon: weapon
    });
  }

  /**
   * Handle initiative roll
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onRollInitiative(event, target) {
    await BNW.dice.rollInitiative({
      actor: this.document
    });
  }

  /* -------------------------------------------- */
  /*  Tab Management                              */
  /* -------------------------------------------- */

  /**
   * Handle tab change
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onChangeTab(event, target) {
    const { tab, group } = target.dataset;
    if (!tab || !group) return;
    
    // Update the active tab in tabGroups
    this.tabGroups[group] = tab;
    
    // Re-render to show the new tab
    await this.render();
  }

  /**
   * Handle item creation
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onCreateItem(event, target) {
    const { type, trait } = target.dataset;
    
    const itemData = {
      name: `New ${type.capitalize()}`,
      type: type
    };
    
    // If creating a skill with a specific trait, set it
    if (type === 'skill' && trait) {
      itemData.system = { trait: trait };
    }
    
    const created = await this.document.createEmbeddedDocuments('Item', [itemData]);
    
    // Open the sheet for the newly created item and bring it to front
    if (created && created[0]) {
      const sheet = created[0].sheet;
      sheet.render(true);
      // Bring to front after a short delay to ensure it's rendered
      setTimeout(() => sheet.bringToFront(), 50);
    }
    
    // Don't manually render - the createItem hook will handle it
  }

  /**
   * Handle item edit
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onEditItem(event, target) {
    const { itemId } = target.dataset;
    const item = this.document.items.get(itemId);
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * Handle item deletion
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onDeleteItem(event, target) {
    const { itemId } = target.dataset;
    const item = this.document.items.get(itemId);
    if (!item) return;
    
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize('BNW.Dialog.DeleteItem')
      },
      content: `<p>${game.i18n.format('BNW.Dialog.DeleteItemContent', { name: item.name })}</p>`,
      rejectClose: false,
      modal: true
    });
    
    if (confirmed) {
      await item.delete();
    }
  }

  /**
   * Handle image edit
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onEditImage(event, target) {
    const fp = new FilePicker({
      type: "image",
      current: this.document.img,
      callback: async (path) => {
        await this.document.update({ img: path });
      }
    });
    fp.render(true);
  }

  /**
   * Handle tab change
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Prepare submit data - override to handle specific field updates
   * @override
   */
  _prepareSubmitData(event, form, formData) {
    // IMPORTANT: Only submit the specific field that changed
    // This prevents corruption of data in hidden tabs
    const target = event?.target;
    
    if (target?.name) {
      // If this is a specific field change, only update that field
      const submitData = {};
      const keys = target.name.split('.');
      let current = submitData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = current[keys[i]] || {};
        current = current[keys[i]];
      }
      
      // Set the value
      const finalKey = keys[keys.length - 1];
      let value = target.value;
      
      // Convert to number if it's a number input
      if (target.type === 'number') {
        value = Number(value);
      }
      
      current[finalKey] = value;
      
      console.log('BNW Actor | Prepared submit data for field:', target.name, 'value:', value);
      
      return submitData;
    }
    
    // Fallback to default behavior for full form submissions
    return super._prepareSubmitData(event, form, formData);
  }

  /**
   * Submit a document update based on the processed form data.
   * This method is called automatically after _prepareSubmitData.
   * @param {SubmitEvent} event - The originating form submission event
   * @param {HTMLFormElement} form - The form element that was submitted
   * @param {object} submitData - Processed and validated form data
   * @protected
   * @override
   */
  async _processSubmitData(event, form, submitData) {
    console.log('BNW Actor | _processSubmitData called with:', submitData.system?.wounds);
    await this.document.update(submitData);
    console.log('BNW Actor | Document updated successfully');
  }

  /* -------------------------------------------- */
  /*  Drop Handlers                               */
  /* -------------------------------------------- */

  /** @override */
  async _onDrop(event) {
    // V2 way to get drag data - use the standard data transfer
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return false;
    }
    
    if (data?.type === 'Item') {
      return this._onDropItem(event, data);
    }
    
    return super._onDrop(event);
  }

  /**
   * Handle dropping an item on the actor sheet
   * @param {DragEvent} event
   * @param {object} data
   * @private
   */
  async _onDropItem(event, data) {
    const item = await Item.implementation.fromDropData(data);
    if (!item) return;
    
    // Check if item already exists on this actor
    if (item.parent?.id === this.document.id) {
      console.log('BNW | Item already on this actor');
      return false;
    }
    
    if (item.type === 'trick') {
      const requiresPower = item.system?.requiresPower ?? false;
      const requiredPowerName = item.system?.requiredPowerName ?? '';

      if (requiresPower && requiredPowerName) {
        const hasPower = this.document.items.some(
          i => i.type === 'power' && 
               i.name.toLowerCase().trim() === requiredPowerName.toLowerCase().trim()
        );

        if (!hasPower) {
          ui.notifications.warn(
            game.i18n.format('BNW.Warning.MissingRequiredPower', {
              trick: item.name,
              power: requiredPowerName
            })
          );
          return false;
        }
      }
    }

    if (item.type === 'quirk') {
      const cost = Number(item.system?.cost ?? 0);

      if (cost < 0) {
        const currentQuirks = this.document.items.filter(i => i.type === 'quirk');
        const currentTotal = this._calculateNegativeQuirksTotal(currentQuirks);
        const newTotal = currentTotal + Math.abs(cost);

        if (newTotal > 10) {
          ui.notifications.warn(
            game.i18n.format('BNW.Warning.TooManyNegativeQuirks', {
              current: currentTotal,
              adding: Math.abs(cost)
            })
          );
          return false;
        }
      }
    }

    // Create the item on this actor
    const itemData = item.toObject();
    
    // Ensure skills have a default bonus if not set
    if (itemData.type === 'skill' && (itemData.system.bonus == null || itemData.system.bonus === '')) {
      itemData.system.bonus = 2; // Default from template.json
    }
    
    const created = await this.document.createEmbeddedDocuments('Item', [itemData]);
    
    // The createItem hook will trigger a re-render automatically
    
    return created;
  }

  /* -------------------------------------------- */
  /*  Armor Management Actions                    */
  /* -------------------------------------------- */

  /**
   * Show armor selection dialog
   * @param {Event} event
   * @param {HTMLElement} target
   */
  async _onSelectArmor(event, target) {
    const armors = this.document.items.filter(i => i.type === 'armor');
    
    if (!armors.length) {
      ui.notifications?.warn?.(game.i18n.localize('BNW.Warning.NoArmor'));
      return;
    }
    
    // Build checkbox list of armor
    const content = `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize('BNW.Dialog.SelectArmorToWear')}</label>
          ${armors.map(armor => `
            <div>
              <label>
                <input type="checkbox" name="armor-${armor.id}" ${armor.system?.equipped ? 'checked' : ''}/>
                ${armor.name}
              </label>
            </div>
          `).join('')}
        </div>
      </form>
    `;
    
    const dialogV2 = foundry?.applications?.api?.DialogV2;
    if (dialogV2?.prompt) {
      try {
        await dialogV2.prompt({
          window: { title: game.i18n.localize('BNW.Dialog.SelectArmor') },
          content,
          ok: {
            label: game.i18n.localize('BNW.Action.Apply'),
            callback: async (event, button, dialog) => {
              const form = dialog.element.querySelector('form');
              const updates = [];
              armors.forEach(armor => {
                const checkbox = form.querySelector(`input[name="armor-${armor.id}"]`);
                if (checkbox) {
                  updates.push({
                    _id: armor.id,
                    'system.equipped': checkbox.checked
                  });
                }
              });
              if (updates.length) {
                await this.document.updateEmbeddedDocuments('Item', updates);
              }
            }
          },
          rejectClose: false
        });
      } catch (err) {
        // User cancelled or closed dialog
      }
    }
  }

  /**
   * Adjust armor durability for a hit location
   * @param {Event} event
   * @param {HTMLElement} target
   */
  async _onAdjustArmorDurability(event, target) {
    const location = target.dataset.location;
    const change = parseInt(target.dataset.change);
    
    if (!location || !change) return;
    
    // Find armor covering this location
    const armors = this.document.items.filter(i => 
      i.type === 'armor' && 
      i.system?.equipped && 
      i.system?.coverage?.[location]
    );
    
    if (!armors.length) return;
    
    // Update durability for all armor pieces covering this location
    const updates = [];
    for (const armor of armors) {
      const currentDurability = Number(armor.system?.durability?.[location] ?? 0);
      const maxDurability = Number(armor.system?.woundsAbsorbed ?? 0);
      const newDurability = Math.max(0, Math.min(maxDurability, currentDurability + change));
      
      if (newDurability !== currentDurability) {
        updates.push({
          _id: armor.id,
          [`system.durability.${location}`]: newDurability
        });
      }
    }
    
    if (updates.length) {
      await this.document.updateEmbeddedDocuments('Item', updates);
    }
  }
}

globalThis.BraveNewWorldActorSheetV2 = BraveNewWorldActorSheetV2;
