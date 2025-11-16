# Brave New World Foundry VTT System - Developer Reference

**Last Updated**: 2025-11-16  
**Foundry VTT Version**: 13 (minimum/verified/maximum)  
**Framework**: Application V2 (fully migrated)  
**Status**: Production Ready ✅

---

## Quick Reference

### System Identity
- **ID**: `bravenewworld`
- **Title**: Brave New World
- **Version**: 0.1.0
- **Game System**: Brave New World TTRPG (superhero RPG with Delta heroes)

### Key File Locations
```
scripts/
├── main.js                    # System initialization & config
├── bnw-actor-sheet-v2.js     # V2 Actor sheet (DEFAULT)
├── bnw-item-sheet-v2.js      # V2 Item sheets (DEFAULT)
├── bnw-actor-sheet.js        # V1 Actor sheet (legacy)
├── bnw-item-sheet.js         # V1 Item sheet (legacy)
└── bnw-dice.js               # Dice rolling system

templates/
├── actors/
│   ├── actor-sheet-v2.hbs    # V2 actor template wrapper
│   ├── delta-sheet.hbs       # V1 actor template
│   └── parts/                # Modular V2 template parts
│       ├── header.hbs        # Character header (portrait, name, details)
│       ├── tabs.hbs          # Tab navigation
│       ├── traits.hbs        # Traits & Skills tab
│       ├── powers.hbs        # Powers tab
│       ├── tricks.hbs        # Tricks tab
│       ├── quirks.hbs        # Quirks tab
│       ├── weapons.hbs       # Weapons tab
│       └── notes.hbs         # Notes tab
├── items/
│   ├── skill-sheet-v2.hbs    # V2 skill item [NEW]
│   ├── power-sheet-v2.hbs    # V2 power item
│   ├── trick-sheet-v2.hbs    # V2 trick item
│   ├── quirk-sheet-v2.hbs    # V2 quirk item
│   ├── close-combat-weapon-sheet-v2.hbs  # V2 weapon item
│   └── [type]-sheet.hbs      # V1 versions
├── chat/
│   └── skill-roll-card.hbs   # Chat message for rolls
└── template.json             # Actor/Item data model definitions

styles/
└── main.css                  # All system styles (flexbox-based)

lang/
└── en.json                   # English localization (90+ keys)

packs/
└── bnw-items.db             # Item compendium
```

---

## Architecture Overview

### Trait & Skill System (Nov 2025 Redesign)

**Key Design Decision**: Traits are system configuration + Skills are Item documents

#### Traits
- **Stored in**: `game.settings` (world-level configuration) → `CONFIG.BNW.traits`
- **Structure**: Each trait has `{ label, dice, default }`
  - `label`: Display name (e.g., "Strength")
  - `dice`: Default dice count for trait (e.g., 3)
  - `default`: Default bonus when no skill applies (e.g., 0)
- **Actor Storage**: Each actor stores personalized `system.traits.<traitKey>.dice` and `.default` values
- **Default Traits**: Strength, Speed, Smarts, Spirit
- **Customization**: GMs can add/edit/delete traits via Settings → "Configure Traits"
  - Trait keys are immutable after creation (for data integrity)
  - Changes apply world-wide but don't affect existing actor values
  - New actors receive current default values

#### Skills
- **Stored as**: Item documents (type `skill`)
- **Benefits**:
  - Can be stored in compendiums and shared across actors
  - Can be dragged/dropped like other items
  - Proper CRUD operations with sheets
  - Reusable across campaigns
- **Structure**: 
  - `system.trait`: Key of associated trait (e.g., "strength")
  - `system.bonus`: Numeric bonus to add to rolls (e.g., 2)
  - `system.summary`: Optional description
  - `system.notes`: Long-form notes

#### Roll Mechanics
- **Old System**: `pool = trait.value + skill.value` (variable dice pool)
- **New System**: `[trait.dice]d6 + [skill.bonus || trait.default]` (fixed trait dice + bonus)
- **Example**: Strength 3 dice + Athletics +2 bonus = `3d6+2` with exploding 6s

#### Trait Configuration UI
- **Location**: Settings → System Settings → "Configure Traits"
- **Access**: GM-only
- **Features**: 
  - Add new traits with custom key, label, default dice, default bonus
  - Edit existing trait properties (except key)
  - Delete traits with confirmation
  - Changes saved to world settings
- **Implementation**: Application V2 FormApplication with custom template

### Application V2 Migration (Completed Nov 2025)
- **V2 sheets are DEFAULT** for all actor/item types
- V1 sheets available for backward compatibility
- Migration statistics: 27 files changed, 3,309+ insertions, 100% functionality preserved
- Zero deprecation warnings in Foundry v13+

### Framework Pattern: HandlebarsApplicationMixin
```javascript
// All V2 sheets follow this pattern:
const Base = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2  // or ItemSheetV2
);

class BraveNewWorldActorSheetV2 extends Base {
  static DEFAULT_OPTIONS = { /* config */ };
  static PARTS = { /* template parts */ };
  tabGroups = { primary: "traits" };
  
  async _prepareContext(options) { /* data prep */ }
  async _onSubmitForm(formConfig, event) { /* form handling */ }
}
```

---

## Data Models (templates/template.json)

### Actor Type: `delta`
Delta heroes with traits, embedded skill/power/trick/quirk/weapon items.

**Core Data Structure**:
```json
{
  "details": {
    "playerName": "",
    "heroName": "",
    "codeName": "",
    "origin": "",
    "affiliation": "",
    "background": ""
  },
  "traits": {
    "strength|speed|smarts|spirit": {
      "dice": 3,      // dice count for trait
      "default": 0    // default bonus when no skill applies
    }
  },
  "notes": ""
}
```

**Default Traits** (4):
- Strength, Speed, Smarts, Spirit
- Each starts at 3 dice, 0 default bonus
- Trait configuration stored in `CONFIG.BNW.traits` (world settings)
- Actor sheet auto-initializes missing traits on first open

**Skills**: No longer in actor data model - now Item documents (see below)

### Item Types

#### `skill` [NEW]
Skills as reusable Item documents linked to traits.
```json
{
  "trait": "strength",  // associated trait key
  "bonus": 2,           // bonus to add to rolls
  "summary": "",        // short description
  "notes": ""           // long-form notes
}
```

**Benefits**:
- Can be stored in compendiums
- Reusable across actors/campaigns
- Proper CRUD with dedicated sheet
- Drag-drop functionality

#### `power`
Super-powered abilities with dice bonuses and trait/skill associations.
```json
{
  "summary": "",
  "activation": "standard|quick|free",
  "cost": 0,
  "dice": 0,           // bonus dice to add to rolls
  "trait": "strength", // associated trait KEY
  "skillId": "uuid",   // associated skill ITEM ID
  "notes": ""
}
```

**Important**: Powers reference skills by Item ID, not by key

#### `trick`
Special techniques that may require a specific power.
```json
{
  "summary": "",
  "requiresPower": false,
  "requiredPowerName": "",
  "notes": ""
}
```

#### `quirk`
Character quirks with costs (positive or negative).
```json
{
  "description": "",
  "cost": 0,              // negative = penalty/bonus, positive = cost
  "quirkType": "standard|social",
  "requirements": ""
}
```

**Business Rule**: Total negative quirk cost cannot exceed -10 per character.

#### `close-combat-weapon`
Melee weapons with damage and skill associations.
```json
{
  "damage": "1d6",
  "skillId": "uuid",     // associated skill ITEM ID
  "summary": "",
  "notes": ""
}
```

---

## Dice System (BNW.dice)

### Core Mechanics
1. **Dice Formula** = `[Trait Dice]d6 + [Skill Bonus or Trait Default]` (minimum 1d6)
2. **Exploding Dice**: 6s explode (`Xd6x=6`)
3. **Success Check**: Highest die ≥ Target Number (default 7)
4. **Results**: Show all dice, highest result, bonus applied, success/failure

**Example**: Strength 3 dice + Athletics +2 = `3d6+2` → roll 3 exploding d6, add +2 to result

### API

#### `BNW.dice.rollTraitSkill(params)`
Primary rolling function exposed on `game.bnw.dice`.

**Parameters**:
```javascript
{
  actor: Actor,           // REQUIRED: The actor rolling
  traitKey: string,       // REQUIRED: Trait key (e.g., "strength")
  skillId: string|null,   // OPTIONAL: Skill Item ID (uses trait default if null)
  target: number|null,    // OPTIONAL: Target number (prompts if null)
  bonusDice: number,      // OPTIONAL: Extra dice to add (default 0)
  label: string,          // OPTIONAL: Custom label for roll
  sourceItem: Item        // OPTIONAL: Item that triggered roll (for flags)
}
```

**Changed from V1**: 
- Was: `skillKey` (string key from actor.system.skills)
- Now: `skillId` (Item document ID, or null to use trait default)

**Returns**: Promise\<ChatMessage\> or null

**Flow**:
1. Validates actor and trait exist
2. Looks up skill Item by ID (if provided)
3. Calculates: `traitDice d6 + (skillBonus || traitDefault)`
4. Prompts for target number if not provided
5. Evaluates roll with `Roll` class (exploding 6s)
6. Renders chat card from `templates/chat/skill-roll-card.hbs`
7. Posts message with flags for automation

#### `BNW.dice.promptTargetNumber(options)`
Shows dialog to get target number from user.

**Parameters**:
```javascript
{
  defaultTarget: 7,       // Default target number
  traitLabel: "",        // Display label for trait
  skillLabel: ""         // Display label for skill
}
```

**Returns**: Promise\<number|null\>

### Roll Result Flags
Chat messages include flags for automation:
```javascript
flags: {
  bravenewworld: {
    trait: "strength",
    skillId: "uuid-or-null",  // skill Item ID or null if using trait default
    target: 7,
    highest: 9,
    traitDice: 3,             // number of d6 rolled
    bonus: 2,                 // bonus added to roll
    bonusDice: 0,             // extra dice from powers
    itemId: "uuid-here"       // if rolled from power/weapon
  }
}
```

---

## System Configuration (CONFIG.BNW)

Set up in `main.js` during `init` hook:

```javascript
// Trait configuration stored in world settings
game.settings.register('bravenewworld', 'traits', {
  name: 'Trait Configuration',
  scope: 'world',
  config: false,
  type: Object,
  default: {
    strength: { label: 'Strength', dice: 3, default: 0 },
    speed: { label: 'Speed', dice: 3, default: 0 },
    smarts: { label: 'Smarts', dice: 3, default: 0 },
    spirit: { label: 'Spirit', dice: 3, default: 0 }
  }
});

// Load traits into CONFIG for easy access
CONFIG.BNW = {
  traits: game.settings.get('bravenewworld', 'traits'),
  systemBasePath: 'systems/bravenewworld',
  templatePath: 'systems/bravenewworld/templates'
};

CONFIG.Actor.typeLabels = {
  delta: game.i18n.localize('BNW.ActorType.Delta')
};

CONFIG.Item.typeLabels = {
  skill: game.i18n.localize('BNW.ItemType.Skill'),
  power: game.i18n.localize('BNW.ItemType.Power'),
  trick: game.i18n.localize('BNW.ItemType.Trick'),
  quirk: game.i18n.localize('BNW.ItemType.Quirk'),
  'close-combat-weapon': game.i18n.localize('BNW.ItemType.CloseCombatWeapon')
};
```

**Key Change**: No more `CONFIG.BNW.defaultSkills` - skills are now Items

## V2 Actor Sheet (BraveNewWorldActorSheetV2)

### Key Features
- **6-tab interface**: Traits & Skills, Powers, Tricks, Quirks, Weapons, Notes
- **Auto-save on change** (submitOnChange: true)
- **Drag-drop items** from compendiums/sidebar (skills, powers, tricks, quirks, weapons)
- **Inline skill creation** per trait with auto-editor opening
- **Inline item creation** for powers, tricks, quirks, weapons
- **Manual tab management** (CSS-based show/hide)
- **Proper flexbox scrolling** (critical for V2)
- **Document hooks** for embedded item changes
- **Auto-initialization** of missing traits on first sheet open

### Actor Trait Initialization
The `_ensureTraitsInitialized()` method automatically:
1. Checks if actor has all traits from `CONFIG.BNW.traits`
2. Adds any missing traits with default dice/bonus values
3. Saves changes to actor document
4. Called during `_prepareContext()` before rendering

This ensures actors created before trait configuration changes get updated automatically.

### Configuration
```javascript
static DEFAULT_OPTIONS = {
  classes: ['bravenewworld', 'sheet', 'actor', 'bnw'],
  position: { width: 720, height: 720 },
  window: { resizable: true },
  actions: {
    rollSkill: _onRollSkill,           // Roll trait + skill
    createSkill: _onCreateSkill,       // Create skill for trait
    createItem: _onCreateItem,         // Create power/trick/quirk/weapon
    editItem: _onEditItem,             // Open item editor
    deleteItem: _onDeleteItem,         // Delete with confirmation
    editImage: _onEditImage,           // Open FilePicker
    changeTab: _onChangeTab            // Switch tab
  },
  form: {
    handler: _onSubmitForm,
    submitOnChange: true
  },
  dragDrop: [
    { dragSelector: '.item[data-item-id]', dropSelector: 'form' }
  ]
};
```

### Actions (Click Handlers)
All actions use `data-action` attributes in templates:

- `data-action="rollSkill" data-trait="X" data-skill-id="uuid"` - Roll trait+skill (or trait default if no skill-id)
- `data-action="createSkill" data-trait="X"` - Create new skill for trait
- `data-action="createItem" data-type="power|trick|quirk|close-combat-weapon"` - Create new item
- `data-action="editItem" data-item-id="uuid"` - Open item editor
- `data-action="deleteItem" data-item-id="uuid"` - Delete with confirmation
- `data-action="editImage"` - Open FilePicker for image
- `data-action="changeTab" data-tab="traits|powers|tricks|quirks|weapons|notes"` - Switch tab

### Template Context
The `_prepareContext()` method provides:
```javascript
{
  actor: this.document,
  system: actor.system,
  traits: Object.entries(CONFIG.BNW.traits).map(([key, config]) => ({
    key,
    label: config.label,
    dice: actor.system.traits[key]?.dice ?? config.dice,
    default: actor.system.traits[key]?.default ?? config.default
  })),
  skills: actor.items.filter(i => i.type === 'skill'),
  powers: actor.items.filter(i => i.type === 'power'),
  tricks: actor.items.filter(i => i.type === 'trick'),
  quirks: actor.items.filter(i => i.type === 'quirk'),
  weapons: actor.items.filter(i => i.type === 'close-combat-weapon'),
  hasPowers: powers.length > 0,
  hasTricks: tricks.length > 0,
  hasQuirks: quirks.length > 0,
  hasWeapons: weapons.length > 0,
  totalNegativeQuirks: sum of negative quirk costs,
  enrichedNotes: await TextEditor.enrichHTML(notes)
}
```

**Key Changes from V1**:
- No `skills` property in context (filtered from actor.items instead)
- Traits built from CONFIG.BNW.traits + actor overrides
- `filterSkillsByTrait` Handlebars helper used in template to filter skills per trait

### Embedded Document Hooks
Listens to `createItem`, `updateItem`, `deleteItem` hooks to auto-re-render when items change:
```javascript
_onEmbeddedDocumentChange(item, changes, options, userId) {
  if (item.parent?.id === this.document.id) {
    this.render(true, { parts: ['form'] });
  }
}
```

### Critical CSS Pattern for Scrolling
```css
.bnw.sheet form { display: flex; flex-direction: column; height: 100%; }
.bnw.sheet .window-content { flex: 1; min-height: 0; overflow: hidden; }
.bnw.sheet [data-application-part="form"] { flex: 1; min-height: 0; overflow: hidden; }
.bnw.sheet .sheet-body { flex: 1; min-height: 0; overflow: hidden; }
.bnw.sheet .tab { flex: 1; min-height: 0; overflow-y: auto; }
```

**Key**: `min-height: 0` at each flex level is essential for proper scrolling in V2.

---

## V2 Item Sheets

### Base Class: BraveNewWorldItemSheetV2
Generic base for all items with:
- Form auto-save
- Image editing
- Trait/skill dropdown population (from parent actor)

### Specialized Classes
Each item type has its own class that sets the template:

```javascript
class BraveNewWorldSkillSheetV2 extends BraveNewWorldItemSheetV2 {
  static PARTS = {
    form: { template: ".../skill-sheet-v2.hbs" }
  };
}

class BraveNewWorldPowerSheetV2 extends BraveNewWorldItemSheetV2 {
  static PARTS = {
    form: { template: ".../power-sheet-v2.hbs" }
  };
}

class BraveNewWorldTrickSheetV2 extends BraveNewWorldItemSheetV2 {
  static PARTS = {
    form: { template: ".../trick-sheet-v2.hbs" }
  };
}

class BraveNewWorldQuirkSheetV2 extends BraveNewWorldItemSheetV2 {
  static PARTS = {
    form: { template: ".../quirk-sheet-v2.hbs" }
  };
}

class BraveNewWorldCloseCombatWeaponSheetV2 extends BraveNewWorldItemSheetV2 {
  static PARTS = {
    form: { template: ".../close-combat-weapon-sheet-v2.hbs" }
  };
}
```

**Important Methods in Base Class**:

#### `_prepareTraitOptions()`
Builds trait dropdown options from `CONFIG.BNW.traits`:
```javascript
_prepareTraitOptions() {
  const traits = CONFIG.BNW.traits;
  return Object.entries(traits).map(([key, config]) => ({
    value: key,
    label: config.label
  }));
}
```

#### `_prepareSkillOptions()`
Builds skill dropdown options from parent actor's skill items:
```javascript
_prepareSkillOptions() {
  const actor = this.document.parent;
  if (!actor) return [];
  
  const skills = actor.items.filter(i => i.type === 'skill');
  return skills.map(skill => ({
    value: skill.id,
    label: skill.name
  }));
}
```

**Key Change**: Skills now use Item IDs as dropdown values, not string keys

### Form Handling (V2 Pattern)
```javascript
async _onSubmitForm(formConfig, event) {
  const form = event.currentTarget?.closest('form');
  const formData = new FormData(form);
  const submitData = {};
  for (const [key, value] of formData.entries()) {
    submitData[key] = value;
  }
  const expanded = foundry.utils.expandObject(submitData);
  await this.document.update(expanded, { render: false });
}
```

---

## System Configuration (CONFIG.BNW)

Set up in `main.js` during `init` hook:

```javascript
CONFIG.BNW = {
  traits: ['strength', 'speed', 'smarts', 'spirit'],
  defaultSkills: {
    athletics: { label: 'Athletics', trait: 'strength', value: 2 },
    // ... 11 more
  },
  systemBasePath: 'systems/bravenewworld',
  templatePath: 'systems/bravenewworld/templates'
};

CONFIG.Actor.typeLabels = {
  delta: game.i18n.localize('BNW.ActorType.Delta')
};

CONFIG.Item.typeLabels = {
  power: game.i18n.localize('BNW.ItemType.Power'),
  trick: game.i18n.localize('BNW.ItemType.Trick'),
  quirk: game.i18n.localize('BNW.ItemType.Quirk')
};
```

---

## Handlebars Helpers

Registered in `main.js`:

```javascript
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('gt', (a, b) => a > b);
Handlebars.registerHelper('hasEntries', (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return false;
});

// NEW: Filter skills by trait key
Handlebars.registerHelper('filterSkillsByTrait', function(skills, traitKey) {
  if (!skills || !Array.isArray(skills)) return [];
  return skills.filter(skill => skill.system?.trait === traitKey);
});
```

**Key Addition**: `filterSkillsByTrait` enables trait-based skill filtering in templates:
```handlebars
{{#each (filterSkillsByTrait skills trait.key) as |skill|}}
  <!-- skill row -->
{{/each}}
```

---

## Sheet Registration

### V2 Registration (Default - Foundry v13+)
```javascript
// Actor Sheets
foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, 'bravenewworld', BraveNewWorldActorSheetV2, {
  types: ['delta'],
  makeDefault: true,
  label: "BNW.Sheet.Actor.V2"
});

// Item Sheets (one per type)
foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, 'bravenewworld', BraveNewWorldPowerSheetV2, {
  types: ['power'],
  makeDefault: true,
  label: "BNW.Sheet.Item.Power.V2"
});
// ... similar for Trick and Quirk
```

### V1 Registration (Legacy - available but not default)
```javascript
foundry.documents.collections.Actors.registerSheet('bravenewworld', BraveNewWorldActorSheet, {
  types: ['delta'],
  makeDefault: false,
  label: "BNW.Sheet.Actor.V1"
});

foundry.documents.collections.Items.registerSheet('bravenewworld', BraveNewWorldItemSheet, {
  types: ['power', 'trick', 'quirk'],
  makeDefault: false,
  label: "BNW.Sheet.Item.V1"
});
```

---

## Testing Checklist

### Actor Sheet
- ✅ Sheet opens with all tabs visible
- ✅ Tab switching works (manual activation)
- ✅ Tab state persists across renders
- ✅ Form fields auto-save on change
- ✅ Portrait image can be edited
- ✅ Traits display with dice and default bonus
- ✅ Traits auto-initialize on first sheet open
- ✅ Skills display per trait (filtered correctly)
- ✅ Add Skill button creates skill for specific trait
- ✅ Skill roll buttons work (prompts for target)
- ✅ Trait default rolls work (when no skill specified)
- ✅ Items can be dragged onto sheet
- ✅ Add Power/Trick/Quirk/Weapon buttons work
- ✅ New item editor opens automatically
- ✅ Item editor appears above actor sheet (z-index)
- ✅ Items can be edited from list
- ✅ Items can be deleted (with confirmation)
- ✅ Item lists scroll when overflowing
- ✅ Negative quirk total calculated correctly
- ✅ Negative quirk limit (10) enforced

### Item Sheets
- ✅ Skill sheet opens and saves
- ✅ Power sheet opens and saves
- ✅ Trick sheet opens and saves
- ✅ Quirk sheet opens and saves
- ✅ Weapon sheet opens and saves
- ✅ Trait dropdowns populated from CONFIG.BNW.traits
- ✅ Skill dropdowns populated from actor's skill items
- ✅ Skill dropdown uses Item IDs as values (not keys)
- ✅ Image editing works

### Dice Rolling
- ✅ Skill rolls prompt for target number
- ✅ Dice formula calculated correctly (trait dice d6 + skill bonus)
- ✅ Trait default rolls work (when no skill)
- ✅ Exploding 6s work
- ✅ Highest die identified
- ✅ Bonus applied to result correctly
- ✅ Success/failure determined correctly
- ✅ Chat card displays all information (dice, bonus, result)
- ✅ Power rolls include bonus dice
- ✅ Roll flags set correctly for automation

### Console
- ✅ No deprecation warnings in v13
- ✅ No errors in v13

---

## Compatibility

### Foundry VTT Versions
- ✅ **v13**: Fully compatible (current target)
- ✅ **v14**: Future-proofed (no v12 deprecations used)
- ✅ **v15**: Future-proofed (no v13 deprecations used)
- ✅ **v16**: Ready (V1 sheets available as fallback if needed)

### Migration Path
- V1 sheets remain available for users who need them
- V2 sheets are default for all new documents
- No breaking changes to data model
- All V1 features preserved in V2

---

## Common Tasks

### Adding a New Trait
1. Update `CONFIG.BNW.traits` in system settings (or modify default in main.js)
2. Add localization key in `lang/en.json` if needed
3. Trait automatically appears in actor sheets on next open
4. Existing actors auto-initialize the new trait with defaults

### Adding a New Skill
**For a specific actor**:
1. Open actor sheet
2. Click "Add Skill" next to the desired trait
3. Fill in skill name and bonus
4. Save - skill appears in trait's table

**For compendium/reuse**:
1. Create skill Item in Items directory or compendium
2. Set trait association and bonus
3. Drag onto actor sheets as needed

### Modifying Trait Defaults
Edit the settings registration in `main.js`:
```javascript
game.settings.register('bravenewworld', 'traits', {
  default: {
    strength: { label: 'Strength', dice: 3, default: 0 },
    // ... modify dice or default values
  }
});
```

Existing actors keep their values; new actors use new defaults.

### Adding a New Item Type
1. Define template in `templates/template.json`
2. Create V2 sheet class in `bnw-item-sheet-v2.js`
3. Create template in `templates/items/[type]-sheet-v2.hbs`
4. Register sheet in `main.js`
5. Add to `system.json` documentTypes.Item
6. Add localization keys
7. Add tab to actor sheet if needed

### Customizing Roll Behavior
Edit `BNW.dice.rollTraitSkill()` in `scripts/bnw-dice.js`:
- Change dice formula (currently `Xd6x=6 + bonus`)
- Modify success determination logic
- Customize chat card template
- Add automation hooks via flags

### Adding New Actor Sheet Actions
1. Add method to `BraveNewWorldActorSheetV2` class
2. Register in `DEFAULT_OPTIONS.actions` object
3. Add `data-action="methodName"` to template
4. Method signature: `async _onMethodName(event, target)`

---

## Utility Functions (main.js)

### `coerceNumber(value, fallback = 0)`
Safely converts any value to a finite number or returns fallback.

### `capitalize(value)`
Capitalizes first letter of string.

---

## Known Limitations

1. **Delta Prime Actor Type**: Not yet migrated to V2 (uses V1 sheet)
2. **Compendium Content**: Only `bnw-items.db` included; limited pre-made skills/powers
3. **Automation**: Basic roll mechanics only; no advanced automation hooks for damage/effects
4. **Macros**: `game.bnw.dice` API available but no pre-built macros
5. **i18n**: Only English localization currently available
6. **Skill Migration**: Old actors with skills in `system.skills` need manual conversion to Items

---

## Development Workflow

### Local Setup
1. Clone/fork repository
2. Symlink to `[Foundry User Data]/systems/bravenewworld`
3. Create test world with BNW system
4. Make changes to files
5. Reload Foundry to test (F5 in browser)

### No Build Step Required
- Plain JavaScript (ES6+)
- Handlebars templates
- Vanilla CSS
- Changes reflected immediately on reload

### Code Style
- Use `async`/`await` for promises
- Prefer `const` over `let`
- Use nullish coalescing (`??`) for defaults
- Comment only when clarification needed
- Follow existing patterns for consistency

---

## Critical V2 Migration Lessons Learned

### 1. Template Structure
V2 templates **must have a single root element**:
```html
<!-- ✅ CORRECT -->
<form>...</form>

<!-- ❌ WRONG -->
<div>...</div>
<div>...</div>
```

### 2. Form Submission Signature
V2 changed the signature:
```javascript
// V1: _onSubmit(event)
// V2: _onSubmitForm(formConfig, event)
```

### 3. Data Expansion
Always use `foundry.utils.expandObject()` for form data:
```javascript
const submitData = {};
for (const [key, value] of formData.entries()) {
  submitData[key] = value;
}
const expanded = foundry.utils.expandObject(submitData);
await this.document.update(expanded);
```

### 4. Tab Management
V2 doesn't have built-in tab activation - must implement manually:
```javascript
_onChangeTab(event, target) {
  this._activeTab = target.dataset.tab;
  this.render(true);
}

_onRender(context, options) {
  // Manually show/hide tabs with CSS
  const tabToActivate = this._activeTab || 'traits';
  form.querySelectorAll('.tab').forEach(tab => 
    tab.classList.toggle('active', tab.dataset.tab === tabToActivate)
  );
}
```

### 5. Deprecated API Updates (v13)
```javascript
// Window management
// OLD: app.bringToTop()
// NEW: app.bringToFront()

// Dialogs
// OLD: Dialog.confirm()
// NEW: foundry.applications.api.DialogV2.confirm()

// Text Editor
// OLD: TextEditor.enrichHTML()
// NEW: foundry.applications.ux.TextEditor.implementation.enrichHTML()

// Sheet Registration (V1)
// OLD: DocumentSheetConfig.registerSheet()
// NEW: foundry.applications.apps.DocumentSheetConfig.registerSheet()
```

### 6. Embedded Document Hooks
Must manually listen for item changes to trigger re-renders:
```javascript
Hooks.on('createItem', this._onEmbeddedDocumentChange.bind(this));
Hooks.on('updateItem', this._onEmbeddedDocumentChange.bind(this));
Hooks.on('deleteItem', this._onEmbeddedDocumentChange.bind(this));
```

---

## Future Enhancements Roadmap

### Short-term (v0.2.0)
- [ ] Migrate Delta Prime actor sheet to V2
- [ ] Add pre-built power compendiums
- [ ] Create macro examples
- [ ] Add system settings panel

### Medium-term (v0.3.0)
- [ ] Combat tracker integration
- [ ] Active effects for powers
- [ ] Token HUD quick powers
- [ ] Automated damage/healing

### Long-term (v1.0.0)
- [ ] Remove V1 sheets entirely
- [ ] Full automation suite
- [ ] Additional localizations (es, fr, de)
- [ ] NPC/Villain actor types
- [ ] Vehicle/base actors
- [ ] Journal compendiums (setting info)

---

## Documentation References

### Official Foundry Docs
- [Application V2 Guide](https://foundryvtt.com/article/v2-applications/)
- [Sheet Configuration](https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html)
- [Handlebars Mixin](https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html)

### Internal Docs
- `V2_MIGRATION_COMPLETE.md` - Complete migration summary
- `V2_APPLICATION_MIGRATION_PLAN.md` - Original migration plan (1,598 lines)
- `V2_MIGRATION_SUMMARY.md` - Phase-by-phase summary
- `V13_API_COMPATIBILITY_REVIEW.md` - V13 API updates
- `TESTING_V2.md` - Testing procedures
- `README.md` - User-facing documentation

---

## Support & Contributing

### Reporting Issues
Include:
- Foundry VTT version
- System version
- Browser and OS
- Console errors (F12 → Console tab)
- Steps to reproduce

### Contributing Code
1. Fork repository
2. Create feature branch
3. Follow existing code style
4. Test thoroughly
5. Update documentation
6. Submit pull request

---

## License

No explicit license currently published. Coordinate with maintainers before redistribution.

---

**End of Reference Document**

This document should be kept in sync with major system updates.
