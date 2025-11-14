# Testing the V2 Migration

This branch contains the Application V2 framework migration for the Brave New World system.

## Quick Start Testing

### 1. Setup
```bash
# Make sure you're on the feature branch
git checkout feature/v2-migration

# Copy system to Foundry data directory (adjust path as needed)
# Linux/Mac:
ln -s $(pwd) ~/foundry/Data/systems/bravenewworld

# Windows:
# Create junction/symlink to your Foundry data/systems folder
```

### 2. Enable V2 Sheets in Foundry

1. Start Foundry VTT v13
2. Create or open a test world with Brave New World system
3. Create a new Delta actor
4. Right-click the actor → **Configure Sheet**
5. Select **"BNW Actor Sheet (V2)"**
6. Click OK

### 3. Test Key Features

#### Actor Sheet Tests
- [ ] Edit actor name and portrait
- [ ] Modify trait values
- [ ] Add/edit skills
- [ ] Roll trait + skill (should prompt for target number)
- [ ] Create power item
- [ ] Roll power (should include bonus dice)
- [ ] Create trick item (test power requirement validation)
- [ ] Create quirk item (test 10-point negative limit)
- [ ] Switch between tabs (Traits, Powers, Tricks, Quirks, Notes)
- [ ] Edit notes field
- [ ] Close and reopen sheet (verify data persists)
- [ ] Drag-drop item from compendium

#### Item Sheet Tests
- [ ] Create new power item
- [ ] Edit power fields (activation, cost, dice, trait, skill)
- [ ] Create trick item with power requirement
- [ ] Create quirk item with negative cost
- [ ] Close and reopen item sheets (verify data persists)

#### Form Auto-Save
- [ ] Type in any field and wait 2 seconds
- [ ] Verify changes save automatically without clicking Save
- [ ] Refresh browser and verify data persisted

### 4. Compare with V1

1. Right-click actor → **Configure Sheet**
2. Select **"BraveNewWorldActorSheet"** (V1)
3. Verify all data still displays correctly
4. Test same features
5. Switch back to V2 and verify no data loss

## What's New in V2

✅ **Modern Event Handling** - No jQuery, uses V2 action system  
✅ **Auto-Save Forms** - Changes save automatically  
✅ **Modular Templates** - Split into reusable parts  
✅ **Better Performance** - Intelligent re-rendering  
✅ **Future-Proof** - Won't be deprecated  

## Known Differences from V1

- Event handling changed from jQuery to V2 actions
- Template split into 7 parts (header, tabs, traits, powers, tricks, quirks, notes)
- Sheet registration uses `DocumentSheetConfig` instead of `Actors.registerSheet`

## Reporting Issues

If you find bugs:

1. Check if bug exists in V1 sheet (might be pre-existing)
2. Create GitHub issue with:
   - Title: `[V2] Brief description`
   - Label: `v2-migration`
   - Description: Steps to reproduce, expected vs actual behavior
   - Browser console logs (F12 → Console tab)

## Rolling Back

If V2 has critical issues:

```bash
# Revert to main branch
git checkout main

# Or just switch sheet in Foundry:
# Right-click actor → Configure Sheet → Select V1 sheet
```

## Testing Checklist

Full testing checklist available in:
- `V2_APPLICATION_MIGRATION_PLAN.md` - Phase 7: Testing & Validation
- `V2_MIGRATION_SUMMARY.md` - Next Steps section

## Questions?

Check these documents:
- `V2_APPLICATION_MIGRATION_PLAN.md` - Complete migration plan
- `V2_MIGRATION_SUMMARY.md` - What was implemented
- `README.md` - General system documentation

## Implementation Status

- ✅ Phase 1: Preparation (Complete)
- ✅ Phase 2: Template Restructuring (Complete)
- ✅ Phase 3: Actor Sheet Migration (Complete)
- ✅ Phase 4: Item Sheet Migration (Complete)
- ✅ Phase 5: Sheet Registration (Complete)
- ⬜ Phase 6: Dialog Migration (Optional - Deferred)
- 🔄 Phase 7: Testing & Validation (Current Phase)
- ⬜ Phase 8: Documentation & Release

**Progress**: 62.5% (5 of 8 phases complete)
