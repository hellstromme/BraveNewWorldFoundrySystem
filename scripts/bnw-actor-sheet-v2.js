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
      resizable: true
    },
    actions: {
      rollSkill: BraveNewWorldActorSheetV2.prototype._onRollSkill,
      rollPower: BraveNewWorldActorSheetV2.prototype._onRollPower,
      rollWeaponAttack: BraveNewWorldActorSheetV2.prototype._onRollWeaponAttack,
      rollWeaponDamage: BraveNewWorldActorSheetV2.prototype._onRollWeaponDamage,
      rollInitiative: BraveNewWorldActorSheetV2.prototype._onRollInitiative,
      createItem: BraveNewWorldActorSheetV2.prototype._onCreateItem,
      editItem: BraveNewWorldActorSheetV2.prototype._onEditItem,
      deleteItem: BraveNewWorldActorSheetV2.prototype._onDeleteItem,
      editImage: BraveNewWorldActorSheetV2.prototype._onEditImage,
      changeTab: BraveNewWorldActorSheetV2.prototype._onChangeTab
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
      template: "systems/bravenewworld/templates/actors/actor-sheet-v2.hbs"
    }
  };

  /** @override */
  tabGroups = {
    primary: "traits"
  };

  /* -------------------------------------------- */
  /*  Lifecycle Methods                           */
  /* -------------------------------------------- */

  /** @override */
  _attachFrameListeners() {
    super._attachFrameListeners();
    
    // Store hook IDs so we can remove them later
    this._hookIds = this._hookIds || [];
    
    // Listen for embedded document changes to trigger re-render
    const createHookId = Hooks.on('createItem', this._onEmbeddedDocumentCreate.bind(this));
    const deleteHookId = Hooks.on('deleteItem', this._onEmbeddedDocumentDelete.bind(this));
    
    this._hookIds.push(createHookId, deleteHookId);
  }

  /** @override */
  async close(options = {}) {
    // Clean up hooks when closing
    if (this._hookIds) {
      for (const id of this._hookIds) {
        Hooks.off('createItem', id);
        Hooks.off('deleteItem', id);
      }
      this._hookIds = [];
    }
    return super.close(options);
  }

  /**
   * Handle embedded document creation
   * @param {Item} item - The item that was created
   * @param {object} options - Create options
   * @param {string} userId - The user who made the change
   * @private
   */
  _onEmbeddedDocumentCreate(item, options, userId) {
    // Only re-render if this item belongs to our actor
    if (item.parent?.id === this.document.id) {
      console.log('BNW | Item created, re-rendering actor sheet');
      this.render(false);
    }
  }

  /**
   * Handle embedded document deletion
   * @param {Item} item - The item that was deleted
   * @param {object} options - Delete options
   * @param {string} userId - The user who made the change
   * @private
   */
  _onEmbeddedDocumentDelete(item, options, userId) {
    // Only re-render if this item belongs to our actor
    if (item.parent?.id === this.document.id) {
      console.log('BNW | Item deleted, re-rendering actor sheet');
      this.render(false);
    }
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    
    // Manually activate the first tab if none are active
    const form = this.element.querySelector('[data-application-part="form"]');
    if (form) {
      const activeTab = form.querySelector('.tab.active');
      
      // Determine which tab to activate
      const tabToActivate = this._activeTab || 'traits';
      
      if (!activeTab || activeTab.dataset.tab !== tabToActivate) {
        // Remove active from all tabs
        form.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        form.querySelectorAll('.sheet-tabs .item').forEach(link => link.classList.remove('active'));
        
        // Activate the correct tab
        const tab = form.querySelector(`.tab[data-tab="${tabToActivate}"]`);
        const tabLink = form.querySelector(`.sheet-tabs [data-tab="${tabToActivate}"]`);
        
        if (tab) {
          tab.classList.add('active');
          console.log('BNW | Activated tab on render:', tabToActivate);
        }
        if (tabLink) {
          tabLink.classList.add('active');
        }
      }
    }
  }

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
    context.weapons = this._prepareWeapons(this.document.items.filter(i => i.type === 'closeCombatWeapon'));
    context.skills = this.document.items.filter(i => i.type === 'skill');
    context.negativeQuirksTotal = this._calculateNegativeQuirksTotal(context.quirks);
    context.woundsData = this._prepareWounds(context.system);
    
    console.log('BNW Actor | Context prepared', {
      traitsCount: context.traits.length,
      skillsCount: context.skills.length,
      powersCount: context.powers.length,
      tricksCount: context.tricks.length,
      quirksCount: context.quirks.length,
      weaponsCount: context.weapons.length,
      totalItems: this.document.items.size
    });
    
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
   * Prepare wounds data for rendering
   * @param {object} system
   * @returns {Array}
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
    
    return hitLocations.map(location => {
      // Get current wounds, ensure it's a number, and cap at max
      let current = Number(system.wounds[location.key] ?? 0);
      current = Math.min(Math.max(0, current), strengthDice);
      
      return {
        key: location.key,
        label: game.i18n.localize(location.labelKey),
        current: current,
        max: strengthDice,
        isMaxed: current >= strengthDice
      };
    });
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
    
    // Force full re-render with parts refresh
    await this.render(true, { parts: ['form'] });
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
  _onChangeTab(event, target) {
    const tabName = target.dataset.tab;
    const group = target.dataset.group || 'primary';
    
    // Store the active tab
    this._activeTab = tabName;
    
    console.log('BNW | Changing tab to:', tabName);
    
    const form = this.element.querySelector('[data-application-part="form"]');
    if (!form) return;
    
    // Remove active from all tabs in this group
    form.querySelectorAll(`.tab[data-group="${group}"]`).forEach(tab => {
      tab.classList.remove('active');
    });
    form.querySelectorAll(`.sheet-tabs[data-group="${group}"] .item`).forEach(link => {
      link.classList.remove('active');
    });
    
    // Add active to the selected tab
    const selectedTab = form.querySelector(`.tab[data-group="${group}"][data-tab="${tabName}"]`);
    if (selectedTab) {
      selectedTab.classList.add('active');
      target.classList.add('active');
    }
  }

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
}

globalThis.BraveNewWorldActorSheetV2 = BraveNewWorldActorSheetV2;
