/**
 * Brave New World Item Sheet - Application V2
 */

// Create the base class with HandlebarsApplicationMixin applied
const ItemSheetV2Base = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2
);

class BraveNewWorldItemSheetV2 extends ItemSheetV2Base {
  
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['bravenewworld', 'sheet', 'item', 'bnw'],
    position: {
      width: 520,
      height: 520
    },
    window: {
      resizable: true
    },
    actions: {
      editImage: BraveNewWorldItemSheetV2.prototype._onEditImage
    },
    form: {
      handler: BraveNewWorldItemSheetV2.prototype._onSubmitForm,
      submitOnChange: true
    }
  };

  /** @override */
  static PARTS = {
    form: {
      template: "systems/bravenewworld/templates/items/power-sheet-v2.hbs"
    }
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Dynamically set the template based on item type
    this.constructor.PARTS.form.template = `systems/bravenewworld/templates/items/${this.document.type}-sheet-v2.hbs`;
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    context.system = foundry.utils.deepClone(this.document.system);
    const actor = this.document?.parent ?? null;
    const currentTrait = context.system?.trait ?? '';
    const currentSkill = context.system?.skill ?? '';

    context.traitOptions = this._prepareTraitOptions(actor, currentTrait);
    context.skillOptions = this._prepareSkillOptions(actor, currentSkill, context.traitOptions);
    
    return context;
  }

  /**
   * Prepare trait options for dropdown
   * @param {Actor} actor
   * @param {string} currentTrait
   * @returns {Array}
   * @private
   */
  _prepareTraitOptions(actor, currentTrait) {
    const options = new Map();

    for (const key of CONFIG.BNW?.traits ?? []) {
      options.set(key, this._capitalize(key));
    }

    if (actor) {
      const actorTraits = foundry.utils.getProperty(actor, 'system.traits') ?? {};
      for (const [key, data] of Object.entries(actorTraits)) {
        options.set(key, data?.label ?? this._capitalize(key));
      }
    }

    if (currentTrait && !options.has(currentTrait)) {
      options.set(currentTrait, this._capitalize(currentTrait));
    }

    return Array.from(options.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Prepare skill options for dropdown
   * @param {Actor} actor
   * @param {string} currentSkill
   * @param {Array} traitOptions
   * @returns {Array}
   * @private
   */
  _prepareSkillOptions(actor, currentSkill, traitOptions = []) {
    const traitLabelMap = new Map(traitOptions.map(o => [o.key, o.label]));
    const defaultTraitKey = traitOptions[0]?.key ?? 'strength';
    const options = new Map();

    const mergeSkills = (skills = {}) => {
      for (const [key, data] of Object.entries(skills)) {
        const baseLabel = data?.label ?? this._capitalize(key);
        const traitKey = data?.trait ?? defaultTraitKey;
        const traitLabel = traitLabelMap.get(traitKey) ?? '';
        const label = traitLabel ? `${baseLabel} (${traitLabel})` : baseLabel;
        options.set(key, { key, label });
      }
    };

    mergeSkills(CONFIG.BNW?.defaultSkills ?? {});
    if (actor) {
      mergeSkills(foundry.utils.getProperty(actor, 'system.skills') ?? {});
    }

    if (currentSkill && !options.has(currentSkill)) {
      const label = this._capitalize(currentSkill);
      options.set(currentSkill, { key: currentSkill, label });
    }

    return Array.from(options.values())
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Capitalize first letter
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

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Handle form submission
   * @param {Event} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   * @private
   */
  async _onSubmitForm(event, form, formData) {
    // Handle different formData formats
    let submitData = {};
    
    if (formData instanceof FormData) {
      // Standard FormData object
      for (const [key, value] of formData.entries()) {
        submitData[key] = value;
      }
    } else if (formData && typeof formData === 'object') {
      // Already a plain object
      submitData = formData;
    } else {
      // Fallback: extract from form directly
      const fd = new FormData(form);
      for (const [key, value] of fd.entries()) {
        submitData[key] = value;
      }
    }
    
    // Expand dotted notation to nested object
    const expanded = foundry.utils.expandObject(submitData);
    await this.document.update(expanded);
  }
}

globalThis.BraveNewWorldItemSheetV2 = BraveNewWorldItemSheetV2;
