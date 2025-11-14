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
    Hooks.on('createItem', this._onEmbeddedDocumentChange.bind(this));
    Hooks.on('updateItem', this._onEmbeddedDocumentChange.bind(this));
    Hooks.on('deleteItem', this._onEmbeddedDocumentChange.bind(this));
  }

  /**
   * Handle embedded document changes
   * @param {Item} item - The item that changed
   * @param {object} changes - The changes made
   * @param {object} options - Update options
   * @param {string} userId - The user who made the change
   * @private
   */
  _onEmbeddedDocumentChange(item, changes, options, userId) {
    // Only re-render if this item belongs to our actor
    if (item.parent?.id === this.document.id) {
      console.log('BNW | Item changed, re-rendering:', item.name);
      this.render(true, { parts: ['form'] });
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
    
    this._initializeDefaults(context.system);
    
    context.traits = this._prepareTraits(context.system.traits);
    context.skillsByTrait = this._prepareSkills(context.system.skills, context.traits);
    
    context.powers = this.document.items.filter(i => i.type === 'power');
    context.tricks = this.document.items.filter(i => i.type === 'trick');
    context.quirks = this.document.items.filter(i => i.type === 'quirk');
    
    context.negativeQuirksTotal = this._calculateNegativeQuirksTotal(context.quirks);
    
    console.log('BNW Actor | Context prepared', {
      traitsCount: context.traits.length,
      skillsCount: Object.keys(context.skillsByTrait).length,
      powersCount: context.powers.length,
      tricksCount: context.tricks.length,
      quirksCount: context.quirks.length,
      totalItems: this.document.items.size
    });
    
    return context;
  }

  /* -------------------------------------------- */
  /*  Data Preparation Helpers                    */
  /* -------------------------------------------- */

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
    system.skills ??= {};
    system.notes ??= '';
    
    const defaultSkills = CONFIG.BNW?.defaultSkills ?? {};
    if (foundry.utils.isEmpty(system.skills) && !foundry.utils.isEmpty(defaultSkills)) {
      system.skills = foundry.utils.deepClone(defaultSkills);
    }
    
    for (const traitKey of CONFIG.BNW?.traits ?? []) {
      system.traits[traitKey] ??= { 
        label: this._capitalize(traitKey), 
        value: 0 
      };
    }
  }

  /**
   * Prepare trait data for rendering
   * @param {object} traits
   * @returns {Array}
   * @private
   */
  _prepareTraits(traits = {}) {
    return Object.entries(traits).map(([key, data]) => ({
      key,
      label: data?.label ?? this._capitalize(key),
      value: Number(data?.value ?? 0)
    }));
  }

  /**
   * Prepare skill data grouped by trait
   * @param {object} skills
   * @param {Array} traits
   * @returns {object}
   * @private
   */
  _prepareSkills(skills = {}, traits = []) {
    const groups = {};
    for (const trait of traits) {
      groups[trait.key] = [];
    }

    const defaultTraitKey = traits[0]?.key ?? CONFIG.BNW?.traits?.[0] ?? 'strength';

    for (const [key, data] of Object.entries(skills)) {
      const traitKey = data?.trait ?? defaultTraitKey;
      const trait = traits.find(t => t.key === traitKey) ?? { key: traitKey, value: 0 };
      const traitValue = Number(trait?.value ?? 0);
      const skillValue = Number(data?.value ?? 0);
      const pool = Math.max(traitValue + skillValue, 1);
      
      const skillData = {
        key,
        label: data?.label ?? this._capitalize(key),
        trait: traitKey,
        value: skillValue,
        pool
      };

      if (!groups[traitKey]) groups[traitKey] = [];
      groups[traitKey].push(skillData);
    }

    for (const trait of traits) {
      groups[trait.key] = (groups[trait.key] ?? []).sort((a, b) => 
        a.label.localeCompare(b.label)
      );
    }

    return groups;
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
    const { trait, skill } = target.dataset;
    
    await BNW.dice.rollTraitSkill({
      actor: this.document,
      traitKey: trait,
      skillKey: skill
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
    const skillKey = item.system?.skill ?? '';

    await BNW.dice.rollTraitSkill({
      actor: this.document,
      traitKey,
      skillKey,
      bonusDice: Number(item.system?.dice ?? 0),
      label: item.name,
      sourceItem: item
    });
  }

  /**
   * Handle item creation
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onCreateItem(event, target) {
    const { type } = target.dataset;
    
    const itemData = {
      name: `New ${type.capitalize()}`,
      type: type
    };
    
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
