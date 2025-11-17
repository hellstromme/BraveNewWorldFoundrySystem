# ApplicationV2 Implementation Guide

**Last Updated:** November 17, 2025  
**Status:** Production Ready ✅

This guide documents the correct way to implement ApplicationV2 in Foundry VTT v13+, based on real-world implementation in the Brave New World system.

## Table of Contents
1. [Core Principles](#core-principles)
2. [Class Structure](#class-structure)
3. [Template Structure](#template-structure)
4. [Tab Navigation](#tab-navigation)
5. [CSS Requirements](#css-requirements)
6. [Common Mistakes](#common-mistakes)

---

## Core Principles

### ✅ DO: Use Native ApplicationV2 Features

ApplicationV2 provides built-in functionality for:
- **Form handling** - Automatic form submission and data updates
- **Tab management** - Built-in tab state via `tabGroups`
- **Scroll preservation** - Automatic via `scrollable` property
- **Action handlers** - Declarative via `data-action` attributes
- **Drag & drop** - Automatic support for item dragging

### ❌ DON'T: Implement Custom Solutions

Do NOT manually implement:
- Custom tab switching logic
- Custom scroll position tracking
- Manual form submission handlers
- Custom event listeners for actions
- Nested form elements

---

## Class Structure

### Minimal Working Example

```javascript
export class BraveNewWorldActorSheetV2 extends foundry.applications.sheets.ActorSheetV2 {
  
  /** Default options for the application */
  static DEFAULT_OPTIONS = {
    classes: ["bravenewworld", "actor", "bnw"],
    position: { width: 720, height: 720 },
    actions: {
      // Built-in action for tab changes
      changeTab: this._onChangeTab,
      // Custom actions
      rollSkill: this._onRollSkill,
      editItem: this._onEditItem,
      deleteItem: this._onDeleteItem
    },
    window: {
      resizable: true
    }
  };

  /** Template parts that make up the sheet */
  static PARTS = {
    header: {
      template: "systems/bravenewworld/templates/actors/parts/header.hbs"
    },
    tabs: {
      template: "systems/bravenewworld/templates/actors/parts/tabs.hbs"
    },
    traits: {
      template: "systems/bravenewworld/templates/actors/parts/traits.hbs",
      scrollable: [""]  // Enable automatic scroll preservation
    },
    powers: {
      template: "systems/bravenewworld/templates/actors/parts/powers.hbs",
      scrollable: [""]
    }
    // Add more parts as needed
  };

  /** Tab groups - ApplicationV2 manages state automatically */
  tabGroups = {
    primary: "traits"  // Default active tab
  };
  
  /** Prepare context data for rendering */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    // Add active tab to context for conditional rendering
    context.tabsActive = this.tabGroups.primary;
    
    // Add other data
    context.traits = this.actor.system.traits;
    context.items = this.actor.items.contents;
    
    return context;
  }
  
  /** Handle tab change - updates tabGroups, ApplicationV2 handles the rest */
  _onChangeTab(event, target) {
    this.tabGroups[target.dataset.group] = target.dataset.tab;
  }
  
  /** Custom action handler example */
  async _onRollSkill(event, target) {
    const trait = target.dataset.trait;
    const skillId = target.dataset.skillId;
    // Handle the roll...
  }
}
```

---

## Template Structure

### Critical Rule: Single Root Element

**Every template part MUST render exactly ONE root HTML element.**

#### ✅ CORRECT

```handlebars
{{!-- Single root div wrapping all content --}}
<div class="power-section">
  <h3>Powers</h3>
  <button type="button" data-action="createItem" data-type="power">
    Add Power
  </button>
  <ol class="powers-list">
    {{#each powers}}
      <li>{{this.name}}</li>
    {{/each}}
  </ol>
</div>
```

#### ❌ WRONG

```handlebars
{{!-- Multiple root elements - will cause error --}}
<h3>Powers</h3>
<button type="button">Add Power</button>
<ol class="powers-list">...</ol>
```

### Main Form Template

**CRITICAL:** Do NOT use `<form>` tag - ApplicationV2 creates it automatically.

```handlebars
{{!-- Use <div> with data-application-part attribute --}}
<div class="" data-application-part="form">
  
  {{!-- Header section --}}
  <header class="sheet-header flexrow">
    <img class="profile-img" src="{{actor.img}}" data-action="editImage">
    <div class="header-fields">
      <h1 class="actor-name">
        <input name="name" type="text" value="{{actor.name}}">
      </h1>
    </div>
  </header>
  
  {{!-- Tab navigation --}}
  <nav class="sheet-tabs tabs" data-group="primary">
    <a class="item {{#if (eq tabsActive 'traits')}}active{{/if}}" 
       data-action="changeTab" data-tab="traits" data-group="primary">
      Traits & Skills
    </a>
    <a class="item {{#if (eq tabsActive 'powers')}}active{{/if}}" 
       data-action="changeTab" data-tab="powers" data-group="primary">
      Powers
    </a>
  </nav>
  
  {{!-- Tab content sections --}}
  <section class="sheet-body tab {{#if (eq tabsActive 'traits')}}active{{/if}}" 
           data-group="primary" data-tab="traits">
    <div class="traits-content">
      {{!-- Traits content here --}}
    </div>
  </section>
  
  <section class="sheet-body tab {{#if (eq tabsActive 'powers')}}active{{/if}}" 
           data-group="primary" data-tab="powers">
    <div class="powers-content">
      {{!-- Powers content here --}}
    </div>
  </section>
  
</div>
```

---

## Tab Navigation

### Tab Button Template

Each tab button needs specific attributes for ApplicationV2:

```handlebars
<nav class="sheet-tabs tabs" data-group="primary">
  <a class="item {{#if (eq tabsActive 'traits')}}active{{/if}}" 
     data-action="changeTab"    {{!-- Triggers built-in tab handler --}}
     data-tab="traits"          {{!-- Tab identifier --}}
     data-group="primary">      {{!-- Tab group name --}}
    Traits & Skills
  </a>
</nav>
```

### Tab Content Template

Each tab content area needs matching attributes:

```handlebars
<section class="sheet-body tab {{#if (eq tabsActive 'traits')}}active{{/if}}" 
         data-group="primary"   {{!-- Must match nav data-group --}}
         data-tab="traits">     {{!-- Must match nav data-tab --}}
  <div class="content">
    {{!-- Tab content --}}
  </div>
</section>
```

### Tab Handler in JavaScript

```javascript
// ApplicationV2 provides this automatically - just update tabGroups
_onChangeTab(event, target) {
  this.tabGroups[target.dataset.group] = target.dataset.tab;
  // That's it! ApplicationV2 handles re-rendering with the new active tab
}
```

---

## CSS Requirements

### Tab Visibility

**CRITICAL:** Use CSS to control tab visibility, NOT JavaScript.

```css
/* Hide all tabs by default */
.sheet-body.tab {
  display: none;
}

/* Show only the active tab */
.sheet-body.tab.active {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
```

### Flexbox Hierarchy for Scrolling

For proper scrolling in tabs, maintain this structure:

```css
/* Form container */
form.application {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Content area */
.window-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Form part */
[data-application-part="form"] {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Tab content */
.sheet-body.tab {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

---

## Common Mistakes

### ❌ Mistake #1: Custom Tab Handling

```javascript
// WRONG - Don't manually handle tab clicks
_activateListeners(html) {
  html.find('.tabs .item').click(this._onChangeTab.bind(this));
}

_onChangeTab(event) {
  // Manual DOM manipulation
  this.element.querySelectorAll('.tab').forEach(t => {
    t.style.display = 'none';
  });
  // ...more manual code
}
```

**✅ CORRECT:** Use `data-action="changeTab"` and let ApplicationV2 handle it.

---

### ❌ Mistake #2: Nested Form Tags

```handlebars
{{!-- WRONG - Creates nested forms --}}
<form data-application-part="form">
  <form>...</form>
</form>
```

**✅ CORRECT:** Use `<div>` for the form part:

```handlebars
<div data-application-part="form">
  {{!-- Content --}}
</div>
```

---

### ❌ Mistake #3: Custom Scroll Preservation

```javascript
// WRONG - Don't manually track scroll
_onRender(context, options) {
  const scrollPos = this._savedScrollPosition;
  this.element.querySelector('.sheet-body').scrollTop = scrollPos;
}
```

**✅ CORRECT:** Add `scrollable: [""]` to PARTS definition:

```javascript
static PARTS = {
  traits: {
    template: "path/to/template.hbs",
    scrollable: [""]  // ApplicationV2 handles it automatically
  }
};
```

---

### ❌ Mistake #4: JavaScript Tab Visibility

```javascript
// WRONG - Don't hide tabs with JavaScript
_onChangeTab(event) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');
}
```

**✅ CORRECT:** Use CSS:

```css
.sheet-body.tab:not(.active) {
  display: none;
}
```

---

### ❌ Mistake #5: Multiple Root Elements

```handlebars
{{!-- WRONG - Multiple roots cause errors --}}
<h3>Section Title</h3>
<div class="content">...</div>
<footer>...</footer>
```

**✅ CORRECT:** Wrap in single root:

```handlebars
<div class="section">
  <h3>Section Title</h3>
  <div class="content">...</div>
  <footer>...</footer>
</div>
```

---

## Benefits of ApplicationV2

When implemented correctly, ApplicationV2 provides:

1. **Automatic Form Handling** - No manual submission code needed
2. **Built-in Drag & Drop** - Automatic item dragging support  
3. **Declarative Actions** - Clean `data-action` attributes
4. **Scroll Preservation** - Automatic via `scrollable` property
5. **Efficient Rendering** - Only changed parts re-render
6. **Tab Management** - Built-in state via `tabGroups`
7. **Future-Proof** - V1 framework removed in v16+

---

## Migration Checklist

When migrating from V1 to V2:

- [ ] Extend `ActorSheetV2` or `ItemSheetV2`
- [ ] Define `DEFAULT_OPTIONS` with actions
- [ ] Define `PARTS` for modular templates
- [ ] Add `tabGroups` property for tabs
- [ ] Implement `_prepareContext()` for data
- [ ] Use `_onChangeTab()` for tab handling
- [ ] Ensure templates have single root elements
- [ ] Use `<div>` not `<form>` for form part
- [ ] Add CSS for tab visibility
- [ ] Remove all custom tab/scroll/form code
- [ ] Test all functionality
- [ ] Remove deprecation warnings

---

## Resources

- [Foundry VTT API Documentation](https://foundryvtt.com/api/)
- [ApplicationV2 Class Reference](https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html)
- [ActorSheetV2 Reference](https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html)

---

**Document Status:** Complete and verified in production ✅  
**Last Tested:** Foundry VTT v13, November 2025
