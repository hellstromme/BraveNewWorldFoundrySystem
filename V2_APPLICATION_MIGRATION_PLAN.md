# Foundry VTT Application V2 Migration Plan

**Project**: Brave New World Foundry System  
**Current State**: Using Application V1 (foundry.appv1.sheets.*)  
**Target State**: Application V2 Framework  
**Created**: 2025-11-14  
**Status**: 📋 PLANNING

---

## Executive Summary

This document outlines a comprehensive migration plan to move the Brave New World Foundry VTT system from the legacy Application V1 framework to the modern Application V2 framework introduced in Foundry VTT v13. The migration will improve performance, maintainability, and future-proof the system for upcoming Foundry releases.

**Key Benefits of V2 Migration**:
- ✅ Modern event handling with automatic cleanup
- ✅ Better separation of concerns (data/rendering/state)
- ✅ Built-in form handling and validation
- ✅ Improved accessibility features
- ✅ Better performance through intelligent re-rendering
- ✅ Future-proof against V1 deprecation
- ✅ Native Handlebars template support
- ✅ Type-safe data models

---

## Current System Architecture

### Files Using V1 Framework

| File | Current Implementation | Lines | Complexity |
|------|----------------------|-------|------------|
| `scripts/bnw-actor-sheet.js` | `foundry.appv1.sheets.ActorSheet` | 232 | Medium |
| `scripts/bnw-item-sheet.js` | `foundry.appv1.sheets.ItemSheet` | 142 | Low |
| `scripts/bnw-dice.js` | Dialog/DialogV2 prompts | 275 | Medium |
| `scripts/main.js` | Sheet registration | 121 | Low |

### Current V1 Patterns

```javascript
// Sheet base classes
class BraveNewWorldActorSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() { ... }
  getData(options) { ... }
  activateListeners(html) { ... }
}

// Sheet registration
foundry.documents.collections.Actors.registerSheet('bravenewworld', BraveNewWorldActorSheet, {
  types: ['delta'],
  makeDefault: true
});

// Template loading
await foundry.applications.handlebars.loadTemplates(templatesToLoad);
```

### Templates (Handlebars)
- `templates/actors/delta-sheet.hbs` - Main character sheet
- `templates/items/power-sheet.hbs` - Power item sheet
- `templates/items/trick-sheet.hbs` - Trick item sheet
- `templates/items/quirk-sheet.hbs` - Quirk item sheet
- `templates/chat/skill-roll-card.hbs` - Chat message template

---

## Application V2 Framework Overview

### Core Concepts

1. **ApplicationV2 Base Class**
   - Replaces FormApplication, ActorSheet, ItemSheet
   - Uses `foundry.applications.api.ApplicationV2`
   - Better lifecycle management

2. **HandlebarsApplication**
   - Extends ApplicationV2
   - Built-in Handlebars template rendering
   - Use `foundry.applications.api.HandlebarsApplicationMixin`

3. **DocumentSheet Mixin**
   - For document-based sheets (Actor, Item, etc.)
   - Handles document binding automatically
   - Use `foundry.applications.sheets.ActorSheetV2` or `foundry.applications.sheets.ItemSheetV2`

4. **Modern Event System**
   - Declarative event listeners
   - Automatic cleanup on close
   - Event delegation pattern

5. **Form Handling**
   - Built-in form submission
   - Automatic data binding
   - Validation support

### V2 Architecture Pattern

```javascript
// V2 Actor Sheet Example
class BraveNewWorldActorSheetV2 extends foundry.applications.sheets.ActorSheetV2 {
  // Static configuration
  static DEFAULT_OPTIONS = {
    classes: ['bravenewworld', 'sheet', 'actor'],
    position: { width: 720, height: 720 },
    window: { title: "BNW.Sheet.Actor" },
    actions: {
      rollSkill: this._onRollSkill,
      rollPower: this._onRollPower
    }
  };

  static PARTS = {
    header: { template: "systems/bravenewworld/templates/actors/parts/header.hbs" },
    tabs: { template: "systems/bravenewworld/templates/actors/parts/tabs.hbs" },
    traits: { template: "systems/bravenewworld/templates/actors/parts/traits.hbs" },
    powers: { template: "systems/bravenewworld/templates/actors/parts/powers.hbs" }
  };

  // Tab configuration
  tabGroups = {
    primary: "traits"
  };

  // Prepare context data
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.system = this.document.system;
    context.traits = this._prepareTraits(context.system.traits);
    context.powers = this.document.items.filter(i => i.type === 'power');
    return context;
  }

  // Action handlers (event handlers)
  static async _onRollSkill(event, target) {
    const { trait, skill } = target.dataset;
    await BNW.dice.rollTraitSkill({
      actor: this.document,
      traitKey: trait,
      skillKey: skill
    });
  }
}
```

---

## Migration Strategy

### Phase 1: Preparation & Research ⏱️ 1-2 days

**Objectives**:
- Create feature parity matrix
- Set up development environment for parallel implementation
- Review Foundry V2 API documentation
- Identify breaking changes and required refactors

**Tasks**:
1. ✅ Document all current V1 features and behaviors
2. ✅ Create test checklist for validation
3. ✅ Review V2 API documentation at https://foundryvtt.com/api/v13
4. ⬜ Set up git branch: `feature/v2-migration`
5. ⬜ Create backup of current stable V1 implementation

**Deliverables**:
- Feature parity checklist
- Test plan document
- Development branch ready

---

### Phase 2: Template Restructuring ⏱️ 2-3 days

**Objectives**:
- Split monolithic templates into V2 PARTS
- Maintain backward compatibility during transition
- Update template structure for V2 rendering

**Current Template Structure**:
```
templates/
├── actors/
│   └── delta-sheet.hbs (monolithic, ~100 lines)
├── items/
│   ├── power-sheet.hbs
│   ├── trick-sheet.hbs
│   └── quirk-sheet.hbs
└── chat/
    └── skill-roll-card.hbs
```

**Proposed V2 Template Structure**:
```
templates/
├── actors/
│   ├── actor-sheet-v2.hbs (main wrapper)
│   └── parts/
│       ├── header.hbs
│       ├── tabs.hbs
│       ├── traits.hbs
│       ├── powers.hbs
│       ├── tricks.hbs
│       ├── quirks.hbs
│       └── notes.hbs
├── items/
│   ├── item-sheet-v2.hbs (main wrapper)
│   └── parts/
│       ├── power-form.hbs
│       ├── trick-form.hbs
│       └── quirk-form.hbs
└── chat/
    └── skill-roll-card.hbs (unchanged)
```

**Template Refactoring Tasks**:

1. **Actor Sheet Templates**
   - [ ] Extract header section to `parts/header.hbs`
   - [ ] Extract tab navigation to `parts/tabs.hbs`
   - [ ] Extract traits/skills section to `parts/traits.hbs`
   - [ ] Extract powers section to `parts/powers.hbs`
   - [ ] Extract tricks section to `parts/tricks.hbs`
   - [ ] Extract quirks section to `parts/quirks.hbs`
   - [ ] Extract notes section to `parts/notes.hbs`
   - [ ] Create wrapper `actor-sheet-v2.hbs`

2. **Item Sheet Templates**
   - [ ] Create `parts/power-form.hbs` (extract from power-sheet.hbs)
   - [ ] Create `parts/trick-form.hbs` (extract from trick-sheet.hbs)
   - [ ] Create `parts/quirk-form.hbs` (extract from quirk-sheet.hbs)
   - [ ] Create wrapper `item-sheet-v2.hbs`

3. **Template Data Binding Updates**
   - [ ] Update form field names for V2 auto-submission
   - [ ] Add `data-action` attributes for V2 event handling
   - [ ] Update CSS selectors to work with partials
   - [ ] Add ARIA attributes for accessibility

**Example Template Conversion**:

**Before (V1 - Monolithic)**:
```handlebars
<form class="{{cssClass}}">
  <header>...</header>
  <nav class="sheet-tabs">...</nav>
  <section class="sheet-body">
    <div class="tab traits">...</div>
    <div class="tab powers">...</div>
  </section>
</form>
```

**After (V2 - Parts)**:
```handlebars
<!-- actor-sheet-v2.hbs (wrapper) -->
<form class="{{cssClass}}" data-application-part="form">
  {{> parts/header}}
  {{> parts/tabs}}
  <section class="sheet-body">
    {{#if (eq activeTab "traits")}}
      {{> parts/traits}}
    {{/if}}
    {{#if (eq activeTab "powers")}}
      {{> parts/powers}}
    {{/if}}
  </section>
</form>

<!-- parts/header.hbs -->
<header class="sheet-header flexrow">
  <img class="profile-img" src="{{actor.img}}" data-action="editImage" />
  <div class="header-fields">
    <h1 class="actor-name">
      <input name="name" type="text" value="{{actor.name}}" />
    </h1>
  </div>
</header>
```

---

### Phase 3: Actor Sheet Migration ⏱️ 3-4 days

**Objectives**:
- Migrate BraveNewWorldActorSheet to V2
- Implement modern event handling
- Maintain feature parity with V1

**Implementation Steps**:

1. **Create New V2 Actor Sheet Class**

Create `scripts/bnw-actor-sheet-v2.js`:

```javascript
/**
 * Brave New World Actor Sheet - Application V2
 * Modern implementation using Foundry VTT Application V2 framework
 */
class BraveNewWorldActorSheetV2 extends foundry.applications.sheets.ActorSheetV2 {
  
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['bravenewworld', 'sheet', 'actor', 'bnw'],
    position: {
      width: 720,
      height: 720
    },
    window: {
      resizable: true,
      title: "BNW.Sheet.Actor.Title"
    },
    actions: {
      // Dice rolling actions
      rollSkill: BraveNewWorldActorSheetV2._onRollSkill,
      rollPower: BraveNewWorldActorSheetV2._onRollPower,
      
      // Item management actions
      createItem: BraveNewWorldActorSheetV2._onCreateItem,
      editItem: BraveNewWorldActorSheetV2._onEditItem,
      deleteItem: BraveNewWorldActorSheetV2._onDeleteItem,
      
      // Image editing
      editImage: BraveNewWorldActorSheetV2._onEditImage
    },
    form: {
      handler: BraveNewWorldActorSheetV2._onSubmitForm,
      submitOnChange: true
    }
  };

  /** @override */
  static PARTS = {
    header: {
      template: "systems/bravenewworld/templates/actors/parts/header.hbs"
    },
    tabs: {
      template: "systems/bravenewworld/templates/actors/parts/tabs.hbs",
      scrollable: [""]
    },
    traits: {
      template: "systems/bravenewworld/templates/actors/parts/traits.hbs",
      scrollable: [".trait-list"]
    },
    powers: {
      template: "systems/bravenewworld/templates/actors/parts/powers.hbs",
      scrollable: [".power-list"]
    },
    tricks: {
      template: "systems/bravenewworld/templates/actors/parts/tricks.hbs",
      scrollable: [".trick-list"]
    },
    quirks: {
      template: "systems/bravenewworld/templates/actors/parts/quirks.hbs",
      scrollable: [".quirk-list"]
    },
    notes: {
      template: "systems/bravenewworld/templates/actors/parts/notes.hbs"
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
    
    // Clone system data
    context.system = foundry.utils.deepClone(this.document.system);
    
    // Initialize default values
    this._initializeDefaults(context.system);
    
    // Prepare traits and skills
    context.traits = this._prepareTraits(context.system.traits);
    context.skillsByTrait = this._prepareSkills(context.system.skills, context.traits);
    
    // Prepare items by type
    context.powers = this.document.items.filter(i => i.type === 'power');
    context.tricks = this.document.items.filter(i => i.type === 'trick');
    context.quirks = this.document.items.filter(i => i.type === 'quirk');
    
    // Calculate quirk total
    context.negativeQuirksTotal = this._calculateNegativeQuirksTotal(context.quirks);
    
    // Enrich HTML fields
    context.enrichedNotes = await TextEditor.enrichHTML(context.system.notes, {
      async: true,
      relativeTo: this.document
    });
    
    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    
    // Add part-specific data
    switch (partId) {
      case "traits":
        context.partData = {
          traits: context.traits,
          skillsByTrait: context.skillsByTrait
        };
        break;
      case "powers":
        context.partData = {
          items: context.powers
        };
        break;
      case "tricks":
        context.partData = {
          items: context.tricks
        };
        break;
      case "quirks":
        context.partData = {
          items: context.quirks,
          total: context.negativeQuirksTotal
        };
        break;
    }
    
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
    
    // Initialize default skills if empty
    const defaultSkills = CONFIG.BNW?.defaultSkills ?? {};
    if (foundry.utils.isEmpty(system.skills) && !foundry.utils.isEmpty(defaultSkills)) {
      system.skills = foundry.utils.deepClone(defaultSkills);
    }
    
    // Initialize default traits
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

    // Sort skills within each trait
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
  static async _onRollSkill(event, target) {
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
  static async _onRollPower(event, target) {
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
  static async _onCreateItem(event, target) {
    const { type } = target.dataset;
    
    const itemData = {
      name: game.i18n.format('DOCUMENT.New', { 
        type: game.i18n.localize(`ITEM.Type${type.capitalize()}`) 
      }),
      type: type
    };
    
    await this.document.createEmbeddedDocuments('Item', [itemData]);
  }

  /**
   * Handle item edit
   * @param {Event} event
   * @param {HTMLElement} target
   * @private
   */
  static async _onEditItem(event, target) {
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
  static async _onDeleteItem(event, target) {
    const { itemId } = target.dataset;
    const item = this.document.items.get(itemId);
    if (!item) return;
    
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize('BNW.Dialog.DeleteItem'),
      content: game.i18n.format('BNW.Dialog.DeleteItemContent', { name: item.name })
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
  static async _onEditImage(event, target) {
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
  static async _onSubmitForm(event, form, formData) {
    const submitData = formData.object;
    await this.document.update(submitData);
  }

  /* -------------------------------------------- */
  /*  Drop Handlers                               */
  /* -------------------------------------------- */

  /** @override */
  async _onDropItem(event, data) {
    const item = await Item.implementation.fromDropData(data);
    if (!item) return;
    
    // Validate trick requirements
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

    // Validate negative quirk limit
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

    return super._onDropItem(event, data);
  }
}
```

2. **Update Template Event Handlers**

Convert jQuery-style listeners to V2 action attributes:

**Before (V1)**:
```handlebars
<button class="skill-roll" data-trait="{{trait}}" data-skill="{{skill}}">
  Roll
</button>
```

**After (V2)**:
```handlebars
<button data-action="rollSkill" data-trait="{{trait}}" data-skill="{{skill}}">
  {{localize "BNW.Action.Roll"}}
</button>
```

3. **Migration Checklist**:
   - [ ] Create `bnw-actor-sheet-v2.js`
   - [ ] Implement `_prepareContext()` method
   - [ ] Implement `_preparePartContext()` for each part
   - [ ] Convert all event handlers to static action methods
   - [ ] Update template `data-action` attributes
   - [ ] Test form submission and auto-save
   - [ ] Test all dice rolling actions
   - [ ] Test item creation/deletion
   - [ ] Test drag-and-drop functionality
   - [ ] Test tab navigation
   - [ ] Verify quirk validation logic
   - [ ] Verify trick validation logic

---

### Phase 4: Item Sheet Migration ⏱️ 2-3 days

**Objectives**:
- Migrate BraveNewWorldItemSheet to V2
- Implement modern form handling
- Maintain feature parity with V1

**Implementation Steps**:

1. **Create New V2 Item Sheet Class**

Create `scripts/bnw-item-sheet-v2.js`:

```javascript
/**
 * Brave New World Item Sheet - Application V2
 */
class BraveNewWorldItemSheetV2 extends foundry.applications.sheets.ItemSheetV2 {
  
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['bravenewworld', 'sheet', 'item', 'bnw'],
    position: {
      width: 520,
      height: 520
    },
    window: {
      resizable: true,
      title: "BNW.Sheet.Item.Title"
    },
    actions: {
      editImage: BraveNewWorldItemSheetV2._onEditImage
    },
    form: {
      handler: BraveNewWorldItemSheetV2._onSubmitForm,
      submitOnChange: true
    }
  };

  /** @override */
  static PARTS = {
    form: {
      template: "systems/bravenewworld/templates/items/item-sheet-v2.hbs"
    }
  };

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
    
    // Enrich description
    if (context.system.description) {
      context.enrichedDescription = await TextEditor.enrichHTML(
        context.system.description, 
        { async: true, relativeTo: this.document }
      );
    }
    
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

    // Add default traits
    for (const key of CONFIG.BNW?.traits ?? []) {
      options.set(key, this._capitalize(key));
    }

    // Add actor's custom traits
    if (actor) {
      const actorTraits = foundry.utils.getProperty(actor, 'system.traits') ?? {};
      for (const [key, data] of Object.entries(actorTraits)) {
        options.set(key, data?.label ?? this._capitalize(key));
      }
    }

    // Ensure current trait is included
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

    // Merge default and actor skills
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

    // Ensure current skill is included
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
  static async _onEditImage(event, target) {
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
  static async _onSubmitForm(event, form, formData) {
    const submitData = formData.object;
    await this.document.update(submitData);
  }
}
```

2. **Migration Checklist**:
   - [ ] Create `bnw-item-sheet-v2.js`
   - [ ] Implement `_prepareContext()` method
   - [ ] Migrate trait/skill dropdown logic
   - [ ] Update template for V2 form handling
   - [ ] Test form submission
   - [ ] Test trait/skill selection
   - [ ] Test all item types (power, trick, quirk)
   - [ ] Verify data persistence

---

### Phase 5: Sheet Registration & Configuration ⏱️ 1 day

**Objectives**:
- Update sheet registration to use V2 sheets
- Provide migration path for existing documents
- Support both V1 and V2 during transition (optional)

**Implementation Steps**:

1. **Update main.js Registration**

```javascript
Hooks.once('init', async function () {
  console.log('BNW | Initializing Brave New World system (V2)');

  // ... existing CONFIG setup ...

  // Register V2 Actor Sheets
  foundry.applications.api.DocumentSheetConfig.registerSheet(
    Actor,
    'bravenewworld',
    BraveNewWorldActorSheetV2,
    {
      types: ['delta'],
      makeDefault: true,
      label: "BNW.Sheet.Actor.Label"
    }
  );

  // Register V2 Item Sheets
  foundry.applications.api.DocumentSheetConfig.registerSheet(
    Item,
    'bravenewworld',
    BraveNewWorldItemSheetV2,
    {
      types: ['power', 'trick', 'quirk'],
      makeDefault: true,
      label: "BNW.Sheet.Item.Label"
    }
  );
});
```

2. **Update system.json Scripts**

```json
{
  "scripts": [
    "scripts/bnw-dice.js",
    "scripts/bnw-actor-sheet-v2.js",
    "scripts/bnw-item-sheet-v2.js",
    "scripts/main.js"
  ]
}
```

3. **Migration Checklist**:
   - [ ] Update sheet registration in `main.js`
   - [ ] Update `system.json` scripts array
   - [ ] Remove V1 sheet files (or keep for fallback)
   - [ ] Test new document creation
   - [ ] Test existing document migration
   - [ ] Verify sheet selection in configuration

---

### Phase 6: Dialog Migration (Optional) ⏱️ 1-2 days

**Objectives**:
- Migrate dice roll prompts to V2 ApplicationV2
- Create reusable dialog component
- Improve UX with modern styling

**Current Implementation**:
The dice rolling system uses DialogV2 with fallback to Dialog v1. This works well but could be enhanced with a custom ApplicationV2 implementation.

**Proposed Enhancement** (Optional):

```javascript
/**
 * Custom roll prompt using ApplicationV2
 */
class BNWRollPrompt extends foundry.applications.api.ApplicationV2 {
  
  static DEFAULT_OPTIONS = {
    id: "bnw-roll-prompt-{id}",
    classes: ["bravenewworld", "dialog", "roll-prompt"],
    tag: "dialog",
    window: {
      title: "BNW.RollPromptTitle",
      minimizable: false
    },
    position: {
      width: 320,
      height: "auto"
    },
    actions: {
      roll: BNWRollPrompt._onRoll,
      cancel: BNWRollPrompt._onCancel
    }
  };

  static PARTS = {
    form: {
      template: "systems/bravenewworld/templates/dialogs/roll-prompt.hbs"
    }
  };

  constructor(options = {}) {
    super(options);
    this.#defaultTarget = options.defaultTarget ?? 7;
    this.#traitLabel = options.traitLabel ?? '';
    this.#skillLabel = options.skillLabel ?? '';
    this.#resolve = null;
  }

  #defaultTarget;
  #traitLabel;
  #skillLabel;
  #resolve;

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.defaultTarget = this.#defaultTarget;
    context.traitLabel = this.#traitLabel;
    context.skillLabel = this.#skillLabel;
    context.label = [this.#skillLabel, this.#traitLabel].filter(Boolean).join(' / ');
    return context;
  }

  /**
   * Show the dialog and wait for result
   * @returns {Promise<number|null>}
   */
  static async prompt(options = {}) {
    const dialog = new this(options);
    return new Promise((resolve) => {
      dialog.#resolve = resolve;
      dialog.render(true);
    });
  }

  static async _onRoll(event, target) {
    const form = this.element.querySelector('form');
    const input = form.querySelector('input[name="target"]');
    const value = Number(input.value);
    const result = Number.isFinite(value) ? value : this.#defaultTarget;
    this.#resolve?.(result);
    await this.close();
  }

  static async _onCancel(event, target) {
    this.#resolve?.(null);
    await this.close();
  }
}

// Update BNW.dice.promptTargetNumber to use new dialog
BNW.dice.promptTargetNumber = async function(options = {}) {
  return BNWRollPrompt.prompt(options);
};
```

**Migration Checklist** (Optional):
   - [ ] Create `BNWRollPrompt` class
   - [ ] Create roll prompt template
   - [ ] Update `bnw-dice.js` to use new dialog
   - [ ] Test prompt functionality
   - [ ] Test cancel behavior
   - [ ] Update styling for consistency

**Note**: This phase is optional. The current DialogV2 implementation works well.

---

### Phase 7: Testing & Validation ⏱️ 2-3 days

**Objectives**:
- Comprehensive testing of all V2 functionality
- Performance comparison with V1
- Bug fixing and refinement

**Test Plan**:

1. **Actor Sheet Tests**
   - [ ] Create new Delta actor
   - [ ] Edit actor name and portrait
   - [ ] Add/edit/delete traits
   - [ ] Add/edit/delete skills
   - [ ] Test trait dice modification
   - [ ] Test skill dice modification
   - [ ] Test skill pool calculation (trait + skill)
   - [ ] Roll trait-only check
   - [ ] Roll trait + skill check
   - [ ] Add power items to actor
   - [ ] Roll power with bonus dice
   - [ ] Add trick items to actor
   - [ ] Test trick power requirement validation
   - [ ] Add quirk items to actor
   - [ ] Test negative quirk limit (10 point max)
   - [ ] Test quirk over-limit warning
   - [ ] Edit notes tab
   - [ ] Test tab navigation (all tabs)
   - [ ] Test form auto-save on change
   - [ ] Test sheet close/reopen (data persistence)
   - [ ] Drag-drop item from compendium
   - [ ] Drag-drop item between actors
   - [ ] Test sheet resizing
   - [ ] Test sheet minimize/maximize

2. **Item Sheet Tests**
   - [ ] Create new power item
   - [ ] Edit power name and image
   - [ ] Set power activation type
   - [ ] Set power cost
   - [ ] Set power bonus dice
   - [ ] Select power trait
   - [ ] Select power skill
   - [ ] Edit power description
   - [ ] Create new trick item
   - [ ] Edit trick fields
   - [ ] Test trick power requirement field
   - [ ] Create new quirk item
   - [ ] Edit quirk cost (positive/negative)
   - [ ] Test item sheet auto-save
   - [ ] Test item sheet close/reopen
   - [ ] Drag-drop item to actor
   - [ ] Duplicate item

3. **Dice Rolling Tests**
   - [ ] Roll with target number prompt
   - [ ] Roll with pre-set target number
   - [ ] Test dice explosion (6s)
   - [ ] Test minimum 1d6 pool
   - [ ] Test success calculation
   - [ ] Test failure calculation
   - [ ] Verify chat message format
   - [ ] Test bonus dice in chat card
   - [ ] Test power rolls from sheet
   - [ ] Test roll with missing trait (error handling)
   - [ ] Test roll with missing skill (error handling)
   - [ ] Test prompt cancel behavior

4. **Integration Tests**
   - [ ] Create complete character workflow
   - [ ] Run full game session simulation
   - [ ] Test with multiple actors
   - [ ] Test with multiple players
   - [ ] Test compendium integration
   - [ ] Test module compatibility
   - [ ] Test macro compatibility
   - [ ] Test world migration from V1

5. **Performance Tests**
   - [ ] Measure sheet render time (V1 vs V2)
   - [ ] Measure form submission time
   - [ ] Test with large actor (many items)
   - [ ] Test with many open sheets
   - [ ] Memory usage comparison

6. **Accessibility Tests**
   - [ ] Keyboard navigation
   - [ ] Screen reader compatibility
   - [ ] Focus management
   - [ ] ARIA attributes

7. **Edge Cases & Error Handling**
   - [ ] Missing data fields
   - [ ] Invalid data types
   - [ ] Corrupted document data
   - [ ] Network interruption during save
   - [ ] Concurrent edits from multiple users
   - [ ] Sheet open during document deletion

**Bug Tracking**:
- Use GitHub Issues for bug tracking
- Label issues with `v2-migration` tag
- Prioritize: Critical > High > Medium > Low

---

### Phase 8: Documentation & Release ⏱️ 1-2 days

**Objectives**:
- Update all documentation for V2
- Create migration guide for users
- Prepare release notes

**Documentation Updates**:

1. **README.md**
   - [ ] Update feature descriptions
   - [ ] Add V2 framework mention
   - [ ] Update screenshots (if UI changed)
   - [ ] Update development workflow

2. **Create MIGRATION_GUIDE.md**
   ```markdown
   # Migration to Application V2
   
   ## For Users
   - No action required
   - Existing characters will work automatically
   - Sheet appearance unchanged
   - Performance improvements
   
   ## For Developers/Module Authors
   - Sheet classes now use ApplicationV2
   - Event handling uses action system
   - See V2_APPLICATION_MIGRATION_PLAN.md for details
   
   ## Breaking Changes
   - None for end users
   - Module developers: V1 sheet overrides will not work
   
   ## Rollback
   - If issues occur, use version X.X.X
   ```

3. **Create CHANGELOG.md Entry**
   ```markdown
   ## [Version 1.0.0] - 2025-XX-XX
   
   ### Changed
   - Migrated to Foundry VTT Application V2 framework
   - Improved sheet rendering performance
   - Enhanced form handling and auto-save
   - Better accessibility support
   
   ### Added
   - Modern event handling system
   - Improved error messages
   - Better validation feedback
   
   ### Fixed
   - [List any bugs fixed during migration]
   
   ### Technical
   - Replaced ActorSheet/ItemSheet with ActorSheetV2/ItemSheetV2
   - Converted jQuery event listeners to action system
   - Split templates into V2 PARTS architecture
   ```

4. **Update Localization**
   - [ ] Add new localization keys for V2 features
   - [ ] Update existing keys if labels changed

5. **Create Developer Documentation**
   - [ ] Document V2 architecture
   - [ ] Document action handlers
   - [ ] Document template structure
   - [ ] Create examples for extending sheets

**Release Checklist**:
   - [ ] All tests passing
   - [ ] Documentation complete
   - [ ] CHANGELOG updated
   - [ ] Version number bumped
   - [ ] Git tags created
   - [ ] Release notes written
   - [ ] Community announcement prepared

---

## Migration Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 1. Preparation & Research | 1-2 days | None |
| 2. Template Restructuring | 2-3 days | Phase 1 |
| 3. Actor Sheet Migration | 3-4 days | Phase 2 |
| 4. Item Sheet Migration | 2-3 days | Phase 2 |
| 5. Sheet Registration | 1 day | Phases 3, 4 |
| 6. Dialog Migration (Optional) | 1-2 days | Phase 5 |
| 7. Testing & Validation | 2-3 days | Phases 3-6 |
| 8. Documentation & Release | 1-2 days | Phase 7 |
| **Total** | **13-20 days** | - |

**Recommended Approach**: 
- 2-3 week sprint
- 1-2 developers
- Part-time allocation: 3-4 weeks calendar time

---

## Risk Assessment

### High Risk Items

1. **Data Migration**
   - **Risk**: Existing actor/item data might not work with V2 sheets
   - **Mitigation**: V2 should handle same data structure; test thoroughly
   - **Contingency**: Keep V1 sheets as fallback option

2. **Breaking Module Compatibility**
   - **Risk**: Third-party modules that override sheets will break
   - **Mitigation**: Document breaking changes; provide migration guide
   - **Contingency**: Offer V1 compatibility mode (temporary)

3. **User Experience Changes**
   - **Risk**: Users might notice behavioral differences
   - **Mitigation**: Maintain identical UI/UX; extensive testing
   - **Contingency**: Quick rollback plan via git tag

### Medium Risk Items

1. **Performance Regression**
   - **Risk**: V2 might be slower than V1 in some cases
   - **Mitigation**: Performance testing; optimize as needed
   - **Contingency**: Profile and fix bottlenecks

2. **Template Complexity**
   - **Risk**: Split templates might be harder to maintain
   - **Mitigation**: Good documentation; clear naming conventions
   - **Contingency**: Can still use monolithic templates with V2

3. **Testing Coverage**
   - **Risk**: Might miss edge cases without automated tests
   - **Mitigation**: Comprehensive manual test plan
   - **Contingency**: Community beta testing period

### Low Risk Items

1. **CSS Styling**
   - **Risk**: Styles might not apply correctly to V2 structure
   - **Mitigation**: Review and update CSS selectors
   - **Contingency**: Easy to fix with CSS updates

2. **Localization**
   - **Risk**: New keys might be missing translations
   - **Mitigation**: Document all new keys; provide English defaults
   - **Contingency**: Add missing translations in patch release

---

## Rollback Strategy

If critical issues are discovered after V2 release:

1. **Immediate Rollback** (< 24 hours)
   - Revert to last V1 stable version
   - Push emergency release
   - Notify users via GitHub/Discord

2. **Quick Fix** (1-3 days)
   - Identify critical bug
   - Fix in V2
   - Test and release patch
   - Keep V1 available as alternative

3. **Long-term Rollback** (> 1 week)
   - Major architectural issue found
   - Keep V1 as stable branch
   - Redesign V2 approach
   - Schedule future migration

**Version Strategy**:
- V1 stable: Tag as `v0.9.x` (maintenance mode)
- V2 release: Tag as `v1.0.0` (major version bump)
- V2 development: Work in `feature/v2-migration` branch

---

## Success Criteria

### Must Have (Blocker for Release)
- ✅ All current features work identically in V2
- ✅ No console errors or warnings
- ✅ Existing actors/items load correctly
- ✅ All dice rolling functionality works
- ✅ Item validation (tricks, quirks) works
- ✅ Form auto-save works
- ✅ No data loss during migration

### Should Have (Important but not Blocker)
- ✅ Performance equal or better than V1
- ✅ All templates converted to PARTS
- ✅ Comprehensive test coverage
- ✅ Documentation complete
- ✅ Migration guide written

### Nice to Have (Future Enhancement)
- ⬜ Custom dialog implementation
- ⬜ Improved accessibility features
- ⬜ Enhanced error messages
- ⬜ Animated transitions
- ⬜ Mobile-responsive improvements

---

## Future Enhancements (Post-V2)

Once V2 migration is complete, consider:

1. **DataModel Implementation**
   - Define typed data models for Actor/Item
   - Add schema validation
   - Improve TypeScript support

2. **Advanced UI Features**
   - Drag-and-drop skill reordering
   - Inline editing of traits/skills
   - Context menus for items
   - Keyboard shortcuts

3. **Automation Enhancements**
   - Active effects integration
   - Automated power cost tracking
   - Combat tracker integration
   - Token HUD integration

4. **Additional Item Types**
   - Gear/equipment
   - Advantages/disadvantages
   - Contacts/relationships
   - Experience tracking

5. **Compendium Content**
   - Pre-built powers
   - Pre-built tricks
   - Sample characters
   - Rule references

---

## Resources & References

### Official Documentation
- Foundry V2 API: https://foundryvtt.com/api/v13
- Application V2 Guide: https://foundryvtt.com/article/v2-applications/
- Migration Guide: https://foundryvtt.com/article/v2-api-migration/

### Example Implementations
- Simple Worldbuilding: Official V2 example system
- Foundry Community: https://discord.gg/foundryvtt
- GitHub Examples: Search for "ApplicationV2" or "ActorSheetV2"

### Development Tools
- Foundry VTT Dev Mode module: Helpful for debugging
- Browser DevTools: Essential for V2 debugging
- Git: Version control and rollback capability

---

## Questions & Decisions

### Resolved
- ✅ Use V2 framework (not V1)
- ✅ Target Foundry v13+ only
- ✅ Maintain UI/UX parity
- ✅ Split templates into PARTS

### Pending Decision
- ⬜ Keep V1 sheets as fallback option? (Recommend: No)
- ⬜ Implement custom dialog for rolls? (Recommend: Optional/Future)
- ⬜ Add automated tests? (Recommend: Manual testing first)
- ⬜ Beta testing period length? (Recommend: 2 weeks)

### Open Questions
- How will existing worlds migrate?
  - **Answer**: Automatically, V2 reads same data structure
- Will module compatibility break?
  - **Answer**: Modules that override sheets will break, need to update
- Performance impact?
  - **Answer**: Should be equal or better, test to confirm

---

## Conclusion

Migrating to Application V2 is a worthwhile investment that will:
1. ✅ Future-proof the system against V1 deprecation
2. ✅ Improve code maintainability
3. ✅ Provide better user experience
4. ✅ Enable future enhancements
5. ✅ Align with Foundry best practices

**Recommendation**: Proceed with migration following this plan.

**Estimated Effort**: 13-20 days development time (2-4 weeks calendar time)

**Risk Level**: Medium (mitigated with thorough testing and rollback plan)

**Priority**: High (V1 will eventually be deprecated)

---

**Next Steps**:
1. Review and approve this plan
2. Create GitHub project board for tracking
3. Create feature branch: `feature/v2-migration`
4. Begin Phase 1: Preparation & Research
5. Schedule regular progress reviews

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-14  
**Author**: GitHub Copilot  
**Status**: Ready for Review
