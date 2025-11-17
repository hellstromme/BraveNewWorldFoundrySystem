# ApplicationV2 Refactor - Actor Sheet Architecture Issue

## Current Problem

The actor sheet is **NOT** structured according to ApplicationV2 best practices, which is causing the scroll position issue.

### Current (WRONG) Structure:
```javascript
static PARTS = {
  form: {
    template: "systems/bravenewworld/templates/actors/actor-sheet-v2.hbs"
  }
};
```

**One monolithic template containing:**
- Header
- Tabs bar
- All tab content (traits, powers, tricks, quirks, combat, notes)

### Recommended (CORRECT) Structure:
```javascript
static PARTS = {
  header: {
    template: "systems/bravenewworld/templates/actors/parts/header.hbs"
  },
  tabs: {
    template: "systems/bravenewworld/templates/actors/parts/tabs.hbs"
  },
  traits: {
    template: "systems/bravenewworld/templates/actors/parts/traits.hbs",
    scrollable: [".trait-list"]
  },
  powers: {
    template: "systems/bravenewworld/templates/actors/parts/powers.hbs",
    scrollable: [".power-list"]
  },
  combat: {
    template: "systems/bravenewworld/templates/actors/parts/weapons.hbs",
    scrollable: [".weapons-section"]
  },
  notes: {
    template: "systems/bravenewworld/templates/actors/parts/notes.hbs"
  }
};
```

**Multiple parts, each with:**
- Individual template
- Own `scrollable` selector
- Rendered independently

## Why This Matters

### With Current Single-Part Approach:
- ❌ Full sheet re-renders on ANY change
- ❌ All tabs re-render even when hidden
- ❌ Scroll position lost because entire DOM is replaced
- ❌ Poor performance (re-rendering everything)
- ❌ Can't use ApplicationV2's automatic scroll preservation

### With Proper Multi-Part Approach:
- ✅ Only changed parts re-render
- ✅ Each part has its own scroll preservation
- ✅ Better performance (partial rendering)
- ✅ ApplicationV2 automatically handles scroll for `scrollable` selectors
- ✅ Tab switching doesn't re-render hidden tabs

## Current Template Structure

**File: `templates/actors/actor-sheet-v2.hbs`**
```handlebars
<div>
  {{> "systems/bravenewworld/templates/actors/parts/header.hbs"}}
  {{> "systems/bravenewworld/templates/actors/parts/tabs.hbs"}}
  
  <section class="sheet-body">
    <div class="tab traits" data-group="primary" data-tab="traits">
      {{> "systems/bravenewworld/templates/actors/parts/traits.hbs"}}
    </div>
    <div class="tab combat" data-group="primary" data-tab="combat">
      {{> "systems/bravenewworld/templates/actors/parts/weapons.hbs"}}
    </div>
    <!-- etc -->
  </section>
</div>
```

**Templates already exist as partials!** They just need to be exposed as PARTS.

## Refactor Plan

### Phase 1: Split PARTS Definition

Change PARTS to match the template structure:

```javascript
static PARTS = {
  header: {
    template: "systems/bravenewworld/templates/actors/parts/header.hbs"
  },
  tabs: {
    template: "systems/bravenewworld/templates/actors/parts/tabs.hbs"
  },
  traits: {
    template: "systems/bravenewworld/templates/actors/parts/traits.hbs",
    scrollable: [".traits-content"],
    templates: ["systems/bravenewworld/templates/actors/parts/traits.hbs"]
  },
  powers: {
    template: "systems/bravenewworld/templates/actors/parts/powers.hbs",
    scrollable: [".powers-content"]
  },
  tricks: {
    template: "systems/bravenewworld/templates/actors/parts/tricks.hbs",
    scrollable: [".tricks-content"]
  },
  quirks: {
    template: "systems/bravenewworld/templates/actors/parts/quirks.hbs",
    scrollable: [".quirks-content"]
  },
  combat: {
    template: "systems/bravenewworld/templates/actors/parts/weapons.hbs",
    scrollable: [".sheet-body"]
  },
  notes: {
    template: "systems/bravenewworld/templates/actors/parts/notes.hbs"
  }
};
```

### Phase 2: Update Main Template

**Create: `templates/actors/actor-sheet-v2.hbs`**
```handlebars
{{!-- ApplicationV2 uses data-application-part to identify parts --}}
<div data-application-part="header"></div>
<div data-application-part="tabs"></div>

<section class="sheet-body">
  <div class="tab traits" data-group="primary" data-tab="traits">
    <div data-application-part="traits"></div>
  </div>
  
  <div class="tab powers" data-group="primary" data-tab="powers">
    <div data-application-part="powers"></div>
  </div>
  
  <div class="tab tricks" data-group="primary" data-tab="tricks">
    <div data-application-part="tricks"></div>
  </div>
  
  <div class="tab quirks" data-group="primary" data-tab="quirks">
    <div data-application-part="quirks"></div>
  </div>
  
  <div class="tab combat" data-group="primary" data-tab="combat">
    <div data-application-part="combat"></div>
  </div>
  
  <div class="tab notes" data-group="primary" data-tab="notes">
    <div data-application-part="notes"></div>
  </div>
</section>
```

### Phase 3: Update _prepareContext

Each part needs its own context. Override `_preparePartContext`:

```javascript
async _preparePartContext(partId, context, options) {
  context = await super._preparePartContext(partId, context, options);
  
  switch(partId) {
    case 'header':
      context.headerData = this._prepareHeaderData();
      break;
    case 'traits':
      context.traits = this._prepareTraits();
      break;
    case 'combat':
      context.weapons = this._prepareWeapons();
      context.wounds = this._prepareWounds();
      break;
    // etc
  }
  
  return context;
}
```

### Phase 4: Remove Manual Scroll Handling

Delete all manual scroll position code:
- Remove `_preRender` scroll saving
- Remove `_onRender` scroll restoration
- Remove `_scrollPositions` tracking

ApplicationV2 will handle it automatically via `scrollable` property!

### Phase 5: Optimize Rendering

Update actions to only re-render affected parts:

```javascript
async _onAdjustArmorDurability(event, target) {
  // Update data...
  await this.document.updateEmbeddedDocuments('Item', updates);
  
  // Only re-render the combat part, not the whole sheet
  await this.render(false, { parts: ['combat'] });
}
```

## Benefits After Refactor

1. **Automatic Scroll Preservation**: ApplicationV2 handles it
2. **Better Performance**: Only affected parts re-render
3. **Cleaner Code**: No manual scroll tracking needed
4. **Follows Best Practices**: Proper ApplicationV2 architecture
5. **Future-Proof**: Compatible with Foundry updates

## Effort Estimate

- **Time**: 2-3 hours
- **Risk**: Medium (requires testing all functionality)
- **Files Changed**: 2 (main template + sheet class)
- **Lines of Code**: ~100 changes

## Testing Required

After refactor, test:
- [ ] All tabs render correctly
- [ ] Scroll position preserved automatically
- [ ] Tab switching works
- [ ] Item add/edit/delete works
- [ ] Durability buttons work without scroll jump
- [ ] Form submission works
- [ ] Performance is better

## Decision

**Should we refactor now or work around it?**

**Option A: Proper Refactor (Recommended)**
- Takes time but fixes root cause
- Future-proof and performant
- Follows ApplicationV2 best practices

**Option B: Keep Current Workaround**
- Faster short-term
- Per-tab scroll tracking still needed
- Not ideal long-term

**Recommendation: Refactor now** - The sheet is already mostly structured correctly (partials exist), just needs to be wired up properly.
