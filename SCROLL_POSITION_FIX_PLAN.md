# Scroll Position Fix - Root Cause Analysis & Refactor Plan

## Root Cause

The scroll position reset issue is caused by **redundant render calls**:

1. **Double Rendering**: When items are created/deleted, TWO renders happen:
   - Manual `render(true, { parts: ['form'] })` in action handler (line 570)
   - Automatic `render(false)` from hook (line 115, 130)

2. **Form Submit on Change**: `submitOnChange: true` causes re-renders on every form input change

3. **Missing Position Preservation**: ApplicationV2 has built-in position/scroll preservation, but only when `render()` is called with proper options

## Current Issues

```javascript
// ❌ BAD: Manual render after data change
async _onCreateItem(event, target) {
  await this.document.createEmbeddedDocuments('Item', [itemData]);
  await this.render(true, { parts: ['form'] });  // <-- CAUSES SCROLL RESET
}

// ❌ BAD: Hook also renders
_onEmbeddedDocumentCreate(item, options, userId) {
  this.render(false);  // <-- SECOND RENDER
}
```

## Solution: Use ApplicationV2 Properly

### 1. Remove Manual Renders from Actions

Actions that modify data should **NOT** manually call `render()`. The data change triggers hooks, which handle rendering.

```javascript
// ✅ GOOD: Let hooks handle rendering
async _onCreateItem(event, target) {
  await this.document.createEmbeddedDocuments('Item', [itemData]);
  // Hook will automatically trigger render - NO manual render needed
}
```

### 2. Configure Render Options for Position Preservation

Override `_configureRenderOptions` to preserve scroll position:

```javascript
_configureRenderOptions(options) {
  options = super._configureRenderOptions(options);
  // Preserve position on re-renders unless explicitly forced
  if (options.position !== false) {
    options.position = null;  // null = preserve current position
  }
  return options;
}
```

### 3. Remove Hook Renders (Optional)

Since ApplicationV2 with `submitOnChange: true` auto-renders on data changes, the hooks might be redundant.

**Test without hooks first** - if auto-render works, remove them.

### 4. Use Proper Scroll Preservation

ApplicationV2 doesn't automatically preserve scroll within content areas. Two options:

**Option A: Manual (Current Approach)**
- Use `_preRender()` to save scroll position
- Use `_onRender()` to restore scroll position
- Simple but requires manual tracking

**Option B: CSS-based (Better)**
- Ensure scrollable container has stable identity
- Use `position: relative` and proper overflow
- ApplicationV2 may preserve automatically

## Implementation Steps

### Step 1: Remove Manual Renders
- [ ] Remove `render()` call from `_onCreateItem`
- [ ] Test if hooks are still needed

### Step 2: Configure Render Options
- [ ] Add `_configureRenderOptions` override
- [ ] Set `position: null` for preserving window position

### Step 3: Fix Scroll Preservation
- [ ] Keep `_preRender()` / `_onRender()` approach
- [ ] Ensure `.sheet-body` is the target element
- [ ] Add delay if needed: `setTimeout(() => restore, 0)`

### Step 4: Test Scenarios
- [ ] Click durability +/- buttons
- [ ] Add new items
- [ ] Delete items
- [ ] Change tabs
- [ ] Edit item inline

## Expected Behavior

After fix:
1. ✅ Durability buttons: Scroll stays in place
2. ✅ Add item: Scroll stays in place (item sheet opens)
3. ✅ Delete item: Scroll stays in place
4. ✅ Tab change: Scroll resets (expected - different content)
5. ✅ Form input: Scroll stays in place

## Code Changes Required

**File: `scripts/bnw-actor-sheet-v2.js`**

1. Remove line 570: `await this.render(true, { parts: ['form'] });`
2. Add `_configureRenderOptions()` method
3. Update `_preRender()` / `_onRender()` with proper timing
4. Consider removing embedded document hooks if redundant

## References

- Foundry API: https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html
- ApplicationV2 render lifecycle: `_preRender` → `_renderHTML` → `_onRender`
- Position preservation: `options.position = null` preserves window position
- Scroll preservation: Manual via `_preRender` / `_onRender`
