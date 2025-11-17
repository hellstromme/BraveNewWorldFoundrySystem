/**
 * Brave New World Item Sheet - Application V2
 * Base class for all item sheets
 */

// Create the base class with HandlebarsApplicationMixin applied
const ItemSheetV2Base = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2
);

class BraveNewWorldItemSheetV2 extends ItemSheetV2Base {
  
  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    foundry.applications.sheets.ItemSheetV2.DEFAULT_OPTIONS,
    {
      classes: ['bravenewworld', 'sheet', 'item', 'bnw'],
      position: {
        width: 560,
        height: 'auto'
      },
      window: {
        resizable: true
      },
      actions: {
        editImage: BraveNewWorldItemSheetV2.prototype._onEditImage
      },
      form: {
        closeOnSubmit: false,
        submitOnChange: true
      }
    },
    { inplace: false }
  );

  /** @override */
  static PARTS = {
    form: {
      template: "systems/bravenewworld/templates/items/power-sheet-v2.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    // Copy document data to context
    context.item = this.document;
    context.system = foundry.utils.deepClone(this.document.system);
    
    const actor = this.document?.parent ?? null;
    const currentTrait = context.system?.trait ?? '';
    const currentSkillId = context.system?.skill ?? '';

    context.traitOptions = this._prepareTraitOptions(actor, currentTrait);
    context.skillOptions = this._prepareSkillOptions(actor, currentSkillId);
    
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

    // Get traits from CONFIG.BNW.traits (now an object, not array)
    const configTraits = CONFIG.BNW?.traits ?? {};
    for (const [key, data] of Object.entries(configTraits)) {
      options.set(key, data?.label ?? this._capitalize(key));
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
   * @param {string} currentSkillName - Current skill name (not ID)
   * @returns {Array}
   * @private
   */
  _prepareSkillOptions(actor, currentSkillName) {
    const options = [];
    const configTraits = CONFIG.BNW?.traits ?? {};
    
    let skills = [];
    
    if (actor) {
      // If owned by an actor, use skills from that actor
      skills = actor.items.filter(i => i.type === 'skill');
    } else {
      // If standalone item, use skills from world Items collection
      skills = game.items?.filter(i => i.type === 'skill') ?? [];
    }
    
    for (const skill of skills) {
      const traitKey = skill.system?.trait ?? '';
      const traitLabel = configTraits[traitKey]?.label ?? traitKey;
      const label = `${skill.name} (${traitLabel})`;
      
      options.push({
        name: skill.name,
        label: label,
        trait: traitKey
      });
    }
    
    // Sort by label
    options.sort((a, b) => a.label.localeCompare(b.label));
    
    return options;
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
}

/**
 * Power Item Sheet
 */
class BraveNewWorldPowerSheetV2 extends BraveNewWorldItemSheetV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {}, {inplace: false});
  
  static PARTS = {
    form: {
      template: "systems/bravenewworld/templates/items/power-sheet-v2.hbs"
    }
  };
}

/**
 * Trick Item Sheet
 */
class BraveNewWorldTrickSheetV2 extends BraveNewWorldItemSheetV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {}, {inplace: false});
  
  static PARTS = {
    form: {
      template: "systems/bravenewworld/templates/items/trick-sheet-v2.hbs"
    }
  };
}

/**
 * Quirk Item Sheet
 */
class BraveNewWorldQuirkSheetV2 extends BraveNewWorldItemSheetV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {}, {inplace: false});
  
  static PARTS = {
    form: {
      template: "systems/bravenewworld/templates/items/quirk-sheet-v2.hbs"
    }
  };
}

/**
 * Close Combat Weapon Item Sheet
 */
class BraveNewWorldCloseCombatWeaponSheetV2 extends BraveNewWorldItemSheetV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {}, {inplace: false});
  
  static PARTS = {
    form: {
      template: "systems/bravenewworld/templates/items/close-combat-weapon-sheet-v2.hbs"
    }
  };
}

/**
 * Ranged Weapon Item Sheet
 */
class BraveNewWorldRangedWeaponSheetV2 extends BraveNewWorldItemSheetV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {}, {inplace: false});
  
  static PARTS = {
    form: {
      template: "systems/bravenewworld/templates/items/ranged-weapon-sheet-v2.hbs"
    }
  };
}

/**
 * Skill Item Sheet
 */
class BraveNewWorldSkillSheetV2 extends BraveNewWorldItemSheetV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {}, {inplace: false});
  
  static PARTS = {
    form: {
      template: "systems/bravenewworld/templates/items/skill-sheet-v2.hbs"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    // Get trait options from system config
    context.traitOptions = Object.entries(CONFIG.BNW?.traits ?? {}).map(([key, data]) => ({
      key,
      label: data?.label ?? key
    }));
    
    return context;
  }
}

globalThis.BraveNewWorldItemSheetV2 = BraveNewWorldItemSheetV2;
globalThis.BraveNewWorldPowerSheetV2 = BraveNewWorldPowerSheetV2;
globalThis.BraveNewWorldTrickSheetV2 = BraveNewWorldTrickSheetV2;
globalThis.BraveNewWorldQuirkSheetV2 = BraveNewWorldQuirkSheetV2;
globalThis.BraveNewWorldCloseCombatWeaponSheetV2 = BraveNewWorldCloseCombatWeaponSheetV2;
globalThis.BraveNewWorldRangedWeaponSheetV2 = BraveNewWorldRangedWeaponSheetV2;
globalThis.BraveNewWorldSkillSheetV2 = BraveNewWorldSkillSheetV2;
