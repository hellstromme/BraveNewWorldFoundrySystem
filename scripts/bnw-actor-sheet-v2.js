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
      createItem: BraveNewWorldActorSheetV2.prototype._onCreateItem,
      editItem: BraveNewWorldActorSheetV2.prototype._onEditItem,
      deleteItem: BraveNewWorldActorSheetV2.prototype._onDeleteItem,
      editImage: BraveNewWorldActorSheetV2.prototype._onEditImage,
      changeTab: BraveNewWorldActorSheetV2.prototype._onChangeTab
    },
    form: {
      handler: BraveNewWorldActorSheetV2.prototype._onSubmitForm,
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
    
    // Listen for embedded document changes to trigger re-render
    // Only re-render on create and delete, not on update
    Hooks.on('createItem', this._onEmbeddedDocumentCreate.bind(this));
    Hooks.on('deleteItem', this._onEmbeddedDocumentDelete.bind(this));
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
      systemData: context.system,
      hasTraits: !!context.system.traits,
      hasSkills: !!context.system.skills
    });
    
    // Check if actor needs trait initialization and save if needed
    const needsInit = await this._ensureTraitsInitialized();
    if (needsInit) {
      // Re-clone after initialization
      context.system = foundry.utils.deepClone(this.document.system);
    }
    
    this._initializeDefaults(context.system);
    
    context.traits = this._prepareTraits(context.system.traits);
    
    context.powers = this.document.items.filter(i => i.type === 'power');
    context.tricks = this.document.items.filter(i => i.type === 'trick');
    context.quirks = this.document.items.filter(i => i.type === 'quirk');
    context.weapons = this.document.items.filter(i => i.type === 'closeCombatWeapon');
    context.skills = this.document.items.filter(i => i.type === 'skill');
    
    context.negativeQuirksTotal = this._calculateNegativeQuirksTotal(context.quirks);
    
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
   * Ensure actor has traits initialized in the correct format
   * @returns {Promise<boolean>} True if traits were initialized and saved
   * @private
   */
  async _ensureTraitsInitialized() {
    const system = this.document.system;
    const configTraits = CONFIG.BNW?.traits ?? {};
    let needsUpdate = false;
    const updates = {};
    
    // Check if traits object exists
    if (!system.traits || typeof system.traits !== 'object') {
      updates['system.traits'] = {};
      needsUpdate = true;
    }
    
    // Check each trait from config
    for (const [traitKey, traitConfig] of Object.entries(configTraits)) {
      const actorTrait = system.traits?.[traitKey];
      
      // Check if trait is missing or has old format (has 'value' or 'label' instead of 'dice')
      if (!actorTrait || actorTrait.value !== undefined || actorTrait.label !== undefined || actorTrait.dice === undefined) {
        updates[`system.traits.${traitKey}`] = {
          dice: traitConfig.dice ?? 3,
          default: traitConfig.default ?? 0
        };
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      console.log('BNW | Initializing traits for actor:', this.document.name, updates);
      await this.document.update(updates);
      return true;
    }
    
    return false;
  }

  /**
   * Initialize default values for system data
   * @param {object} system
   * @private
   */
  _initializeDefaults(system) {
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
    
    system.traits ??= {};
    system.notes ??= '';
    
    // Initialize traits from config
    const configTraits = CONFIG.BNW?.traits ?? {};
    for (const [traitKey, traitConfig] of Object.entries(configTraits)) {
      if (!system.traits[traitKey]) {
        system.traits[traitKey] = {
          dice: traitConfig.dice ?? 3,
          default: traitConfig.default ?? 0
        };
      }
      system.traits[traitKey].dice ??= traitConfig.dice ?? 3;
      system.traits[traitKey].default ??= traitConfig.default ?? 0;
    }
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
   * Handle form submission
   * In V2, the parameters are: formConfig, event
   * @param {object} formConfig - Form configuration options
   * @param {Event} event - The form change event
   * @private
   */
  async _onSubmitForm(formConfig, event) {
    // Get the form element from the event
    const form = event.currentTarget?.tagName === 'FORM' ? event.currentTarget : event.currentTarget?.closest('form');
    
    if (!form) {
      console.warn('BNW | No form element found in event');
      return;
    }
    
    // Extract form data
    const formData = new FormData(form);
    const submitData = {};
    for (const [key, value] of formData.entries()) {
      submitData[key] = value;
    }
    
    console.log('BNW Actor | Submitting form data:', submitData);
    
    // Expand dotted notation to nested object
    const expanded = foundry.utils.expandObject(submitData);
    
    // Update without rendering
    await this.document.update(expanded, { render: false });
    
    console.log('BNW Actor | Document updated (no render)');
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
    const created = await this.document.createEmbeddedDocuments('Item', [itemData]);
    
    // Force full re-render with parts refresh
    await this.render(true, { parts: ['form'] });
    
    return created;
  }
}

globalThis.BraveNewWorldActorSheetV2 = BraveNewWorldActorSheetV2;
