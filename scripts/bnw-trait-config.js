/**
 * Brave New World Trait Configuration
 * Application V2 implementation for configuring world traits
 */

// Create the base class with HandlebarsApplicationMixin
const TraitConfigBase = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
);

class BraveNewWorldTraitConfig extends TraitConfigBase {
  
  constructor(options = {}) {
    super(options);
    // Store working copy of traits
    this.workingTraits = null;
  }
  
  /** @override */
  static DEFAULT_OPTIONS = {
    id: 'bnw-trait-config',
    classes: ['bravenewworld', 'trait-config'],
    tag: 'form',
    position: {
      width: 600,
      height: 'auto'
    },
    window: {
      resizable: false,
      title: 'BNW.Settings.Traits.Name'
    },
    actions: {
      addTrait: BraveNewWorldTraitConfig.prototype._onAddTrait,
      deleteTrait: BraveNewWorldTraitConfig.prototype._onDeleteTrait,
      save: BraveNewWorldTraitConfig.prototype._onSave,
      cancel: BraveNewWorldTraitConfig.prototype._onCancel
    },
    form: {
      handler: BraveNewWorldTraitConfig.prototype._onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: true
    }
  };

  /** @override */
  static PARTS = {
    form: {
      template: 'systems/bravenewworld/templates/dialogs/trait-config.hbs'
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    // Initialize working copy on first render
    if (!this.workingTraits) {
      this.workingTraits = foundry.utils.deepClone(
        game.settings.get('bravenewworld', 'traits')
      );
    }
    
    // Convert to array for template iteration
    context.traits = Object.entries(this.workingTraits).map(([key, config]) => ({
      key,
      label: config.label,
      dice: config.dice,
      default: config.default
    }));
    
    return context;
  }

  /** @override */
  async _onSubmitForm(formConfig, event) {
    event.preventDefault();
    
    // Get form data
    const formData = new foundry.applications.ux.FormDataExtended(event.target).object;
    
    // Reconstruct traits object from form data
    const traits = {};
    const expanded = foundry.utils.expandObject(formData);
    
    if (expanded.traits) {
      // Convert array back to keyed object
      for (const trait of expanded.traits) {
        if (trait.key && trait.label) {
          traits[trait.key] = {
            label: trait.label,
            dice: Number(trait.dice ?? 3),
            default: Number(trait.default ?? 0)
          };
        }
      }
    }
    
    // Save to settings
    await game.settings.set('bravenewworld', 'traits', traits);
    
    // Update CONFIG
    CONFIG.BNW.traits = traits;
    
    ui.notifications.info(game.i18n.localize('BNW.Settings.Traits.Updated'));
    
    // Close the form
    await this.close();
  }

  /**
   * Handle adding a new trait
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onAddTrait(event, target) {
    event.preventDefault();
    
    // Find a unique key
    let counter = 1;
    let newKey = `trait${counter}`;
    while (this.workingTraits[newKey]) {
      counter++;
      newKey = `trait${counter}`;
    }
    
    // Add new trait to working copy
    this.workingTraits[newKey] = {
      label: `New Trait`,
      dice: 3,
      default: 0
    };
    
    // Re-render to show the new trait
    await this.render(true);
  }

  /**
   * Handle deleting a trait
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onDeleteTrait(event, target) {
    event.preventDefault();
    
    const traitKey = target.dataset.key;
    
    // Confirm deletion
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize('BNW.Settings.Traits.DeleteTitle')
      },
      content: game.i18n.format('BNW.Settings.Traits.DeleteContent', { 
        trait: traitKey 
      }),
      rejectClose: false,
      modal: true
    });
    
    if (!confirmed) return;
    
    // Delete from working copy
    delete this.workingTraits[traitKey];
    
    // Re-render
    await this.render(true);
    
    ui.notifications.info(game.i18n.format('BNW.Settings.Traits.Deleted', {
      trait: traitKey
    }));
  }

  /**
   * Handle save button click
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onSave(event, target) {
    event.preventDefault();
    
    // Find the form element
    const form = this.element.querySelector('form');
    
    if (!form) {
      console.error('No form found!');
      return;
    }
    
    // Get form data directly using the proper V2 API
    const formData = new foundry.applications.ux.FormDataExtended(form).object;
    
    // Reconstruct traits object from form data
    const traits = {};
    const expanded = foundry.utils.expandObject(formData);
    
    if (expanded.traits) {
      // Check if it's an array or object
      const traitsArray = Array.isArray(expanded.traits) 
        ? expanded.traits 
        : Object.values(expanded.traits);
      
      // Convert array back to keyed object
      for (const trait of traitsArray) {
        if (trait.key && trait.label) {
          traits[trait.key] = {
            label: trait.label,
            dice: Number(trait.dice ?? 3),
            default: Number(trait.default ?? 0)
          };
        }
      }
    }
    
    // Save to settings
    await game.settings.set('bravenewworld', 'traits', traits);
    
    // Update CONFIG
    CONFIG.BNW.traits = traits;
    
    ui.notifications.info(game.i18n.localize('BNW.Settings.Traits.Updated'));
    
    // Close the dialog
    await this.close();
  }

  /**
   * Handle cancel button click
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  async _onCancel(event, target) {
    event.preventDefault();
    await this.close();
  }
}

// Export to global scope
globalThis.BraveNewWorldTraitConfig = BraveNewWorldTraitConfig;
