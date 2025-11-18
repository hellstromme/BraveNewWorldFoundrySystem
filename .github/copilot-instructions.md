# AI Assistant Instructions for Brave New World Foundry System

## Project Overview

This is a Foundry Virtual Tabletop system implementation for the Brave New World tabletop RPG. The system uses plain JavaScript (no build tools), Handlebars templates, and CSS to provide character sheets, dice automation, and item management for Delta heroes.

## Architecture

### Core Components

- **Scripts**: Located in `scripts/` directory
  - `main.js` - System initialization and registration hooks
  - `bnw-actor-sheet-v2.js` - Main Delta character sheet (ApplicationV2 API)
  - `bnw-item-sheet-v2.js` - Item sheets for powers, skills, quirks, etc. (ApplicationV2 API)
  - `bnw-dice.js` - Dice rolling logic and chat message formatting
  - `bnw-trait-config.js` - Trait configuration dialog
  - **Legacy files**: `bnw-actor-sheet.js`, `bnw-item-sheet.js` (deprecated, use V2 versions)

- **Templates**: Located in `templates/` directory using Handlebars (.hbs)
  - Actor sheets in `templates/actors/`
  - Item sheets in `templates/items/`

- **Styles**: Located in `styles/main.css`
  - All styles scoped under `.bnw` class prefix

- **Localization**: `lang/en.json` for all user-facing strings

- **Data Packs**: Compendiums in `packs/` directory (.db files)

### API Version

- **Current Target**: Foundry VTT v13
- **Application API**: Using ApplicationV2 (`foundry.applications.api.ApplicationV2`) for all sheets
- **CRITICAL**: Do NOT use legacy Application API. All new work must use ApplicationV2.

## Coding Standards

### General Principles

1. **No Build Tools**: This is a plain JavaScript project. Do not introduce bundlers, transpilers, or build steps.
2. **Foundry v13 Native**: Use native v13 APIs and features. Check compatibility before adding new patterns.
3. **Minimal Changes**: Make surgical, targeted edits. Don't refactor working code unnecessarily.
4. **ApplicationV2 Only**: All sheets must extend `foundry.applications.api.ApplicationV2`

### JavaScript Style

- Use modern ES6+ syntax (const/let, arrow functions, template literals, destructuring)
- No semicolons (project convention)
- Prefer `const` over `let` where possible
- Use async/await for asynchronous operations
- Register all sheet classes and helpers in Foundry hooks (`init`, `ready`)

### Handlebars Templates

- Use semantic HTML5 elements
- Add `data-` attributes for JavaScript hooks (e.g., `data-action`, `data-item-id`)
- Use Foundry helper functions: `{{localize}}`, `{{numberFormat}}`, `{{editor}}`
- Keep templates focused - one template per sheet/partial

### CSS

- All styles must be scoped under `.bnw` class
- Use flexbox/grid for layouts
- Follow existing naming conventions
- Keep specificity low
- Responsive design considerations for different screen sizes

### Localization

- All user-facing strings must be in `lang/en.json`
- Use namespaced keys: `BNW.Category.Subcategory.Label`
- Reference in templates: `{{localize "BNW.Label.Key"}}`
- Reference in JS: `game.i18n.localize("BNW.Label.Key")`

## Game Mechanics Implementation

### Traits & Skills

- **Traits**: Strength, Speed, Smarts, Spirit (each has dice count + default bonus)
- **Skills**: Items with associated trait and bonus value
- Stored in actor data: `system.traits.strength`, etc.
- Skills are separate Item documents that can be shared via compendiums

### Dice Rolling

- Formula: `[Trait Dice]d6 + [Skill Bonus or Trait Default]`
- Exploding 6s using `x=6` modifier
- Compare highest die to target number
- Exposed via `game.bnw.dice.rollTraitSkill()`
- Always prompt for target number if not provided

### Item Types

1. **skill** - Skill with trait association and bonus
2. **power** - Delta powers with activation type, cost, bonus dice
3. **trick** - Special techniques requiring specific powers
4. **quirk** - Character traits with point costs (enforce -10 negative limit)
5. **closeCombatWeapon** - Melee weapons with damage and properties
6. **rangedWeapon** - Ranged weapons
7. **armor** - Protective gear
8. **gear** - General equipment

### Chat Cards

- Display dice pool, individual results, highest die, target number, success/failure
- Store roll data in message flags for hooks
- Use Foundry's built-in chat message styling

## Development Workflow

### Testing Changes

1. Make minimal, targeted changes
2. Reload Foundry world (`F5` or manual reload)
3. Test with a Delta actor:
   - Create/edit items
   - Roll dice
   - Verify chat output
   - Check console for errors
4. No automated tests - manual validation required

### Common Tasks

**Adding a new item type:**
1. Add to `system.json` `documentTypes.Item`
2. Create template in `templates/items/`
3. Add data model in item sheet class
4. Add localization strings in `lang/en.json`
5. Update item sheet to handle new type

**Adding a new roll type:**
1. Add function to `bnw-dice.js`
2. Create chat message template if needed
3. Expose via `game.bnw.dice` API
4. Add button/trigger in appropriate sheet

**Modifying actor sheet:**
1. Edit `bnw-actor-sheet-v2.js` for logic
2. Edit `templates/actors/delta-sheet-v2.hbs` for UI
3. Update `styles/main.css` for styling
4. Add any new strings to `lang/en.json`

## Known Issues & Constraints

- **No Build Process**: Do not add TypeScript, JSDoc type checking, bundlers, or similar tools
- **ApplicationV2 Migration**: Legacy `bnw-actor-sheet.js` and `bnw-item-sheet.js` are deprecated
- **Manual Testing Only**: No automated test suite exists
- **v13 Only**: System targets Foundry VTT v13 exclusively

## File Organization

```
bravenewworld/
├── .github/
│   └── copilot-instructions.md (this file)
├── lang/
│   └── en.json
├── packs/
│   └── bnw-items.db
├── scripts/
│   ├── main.js
│   ├── bnw-actor-sheet-v2.js
│   ├── bnw-item-sheet-v2.js
│   ├── bnw-dice.js
│   └── bnw-trait-config.js
├── styles/
│   └── main.css
├── templates/
│   ├── actors/
│   └── items/
├── system.json
└── README.md
```

## When Making Changes

1. **Check API references FIRST** - Always consult the Helpful References section below before planning any implementation. The Foundry API changes frequently and using outdated patterns leads to broken or fragile code.
2. **Read existing code** - Understand the current pattern before modifying
3. **Verify ApplicationV2 compatibility** - Ensure all changes use v2 API correctly
4. **Minimal edits** - Change only what's necessary
5. **Test thoroughly** - Create actor, add items, roll dice, check chat
6. **Update localization** - Add any new strings to `lang/en.json`
7. **Preserve working features** - Don't break existing functionality
8. **Follow conventions** - Match existing code style and patterns

## Questions to Ask Before Coding

1. **Have I checked the API references?** (Answer must be YES - check Helpful References section)
2. Does this use ApplicationV2 API? (Answer must be YES)
3. Are all strings localized in `lang/en.json`?
4. Does this follow existing patterns in the codebase?
5. Will this work in Foundry v13 without additional dependencies?
6. Have I made the minimal change necessary?
7. Does this preserve existing functionality?

## Helpful References

**⚠️ CRITICAL: Always check these references BEFORE planning any implementation. The Foundry API changes frequently between versions, and using outdated patterns will break functionality or create fragile code.**

- **Foundry VTT v13 API**: https://foundryvtt.com/api/ - Official API documentation for the current version
- **ApplicationV2 Guide**: Search Foundry docs for "ApplicationV2" - Required for all sheet implementations
- **Project Documentation**: See README.md and migration guide docs in repo root for system-specific patterns
- **When in doubt**: Check the official API docs first, then examine existing working code in this repository
