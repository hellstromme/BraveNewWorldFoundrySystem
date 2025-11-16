# BraveNewWorldFoundrySystem

BraveNewWorldFoundrySystem brings the Brave New World tabletop roleplaying game into Foundry Virtual Tabletop with native character, power, and dice automation tailored for Delta heroes.

## Project goals

- Deliver a Foundry VTT system that reflects Brave New World's trait, skill, and power structure without requiring custom scripting by table groups.
- Provide user-friendly sheets and dice tooling so players can manage Deltas, roll trait + skill pools, and share results in chat quickly.
- Supply an extensible foundation for further content—additional items, talents, or rule options—through standard Foundry conventions.

## Prerequisites

- Foundry Virtual Tabletop core software version 13, with current manifest compatibility set to minimum/verified/maximum 13.【F:system.json†L15-L19】
- Access to the Brave New World tabletop rules for reference when defining traits, skills, and powers.

## Installation

### Install via manifest URL

1. Open **Configuration & Setup → Game Systems** from the Foundry setup screen.
2. Paste the manifest URL `https://github.com/BraveNewWorldFoundrySystem/releases/latest/download/system.json` into the **Manifest URL** field and click **Install**.【F:system.json†L13-L14】
3. Activate *Brave New World* as the game system for your world.

### Manual installation

1. Download the latest system package (`system.zip`) from the releases page at `https://github.com/BraveNewWorldFoundrySystem/releases/latest/download/system.zip`.【F:system.json†L13-L16】
2. Extract the archive into your Foundry data folder under `Data/systems/bravenewworld` (create the folder if it does not exist).
3. Restart Foundry VTT and select *Brave New World* as the system for your world.

## Features

### Delta character management

- Dedicated Delta actor sheet with portrait, player name, hero name, code name, origin, affiliation, and background fields organized in a responsive header layout.
- Trait panels display each trait's dice count and default bonus, with an auto-generated skills table per trait showing skill-specific bonuses.
- Skills are managed as Item documents that can be created, edited, deleted, and reused across actors or stored in compendiums.
- Tabs for **Traits & Skills**, **Powers**, **Tricks**, **Quirks**, and **Notes** keep long-form character information organized for play.

### Powers, skills, and items

- **Skill items** capture a skill name, associated trait, and bonus value. Skills are reusable Items that can be stored in compendiums.
- **Power items** capture summary text, activation type, cost, bonus dice, and associated trait/skill selections within a tailored item sheet.
- **Trick items** represent special techniques that may require a specific power to use.
- **Quirk items** define character traits with positive or negative point costs, with a -10 negative quirk limit per character.
- **Close-combat weapon items** define melee weapons with damage dice, associated skills, and special properties.
- Actor sheets list embedded items with quick access to roll, edit, or delete controls plus at-a-glance dice bonuses.
- A bundled item compendium (`bnw-items.db`) seeds campaigns with reusable Brave New World content.

### Dice and chat automation

- `Roll` buttons next to each skill on the actor sheet launch automated rolls combining trait dice and skill bonus.
- Players are prompted for a target number when one is not supplied, enabling on-the-fly tests that respect table difficulty decisions.
- Roll formula: `[Trait Dice]d6 + [Skill Bonus or Trait Default]` with exploding 6s, comparing highest die to target number.
- Chat cards display the dice pool, individual die results (with exploding 6s), the highest result, target number, and success/failure state.
- Power rolls automatically include configured bonus dice and associate the source item for automation hooks.
- `game.bnw.dice` exposes the rolling helpers (`rollTraitSkill`, `promptTargetNumber`) for macro authors and module integrations.

### Localization support

- English language strings cover sheet labels, roll prompts, and chat feedback, making it easy to translate the interface for other locales.【F:lang/en.json†L1-L36】

## Data entry workflow

1. **Create a Delta actor.** The sheet automatically initializes traits with default dice counts (3) and default bonuses (0) for Strength, Speed, Smarts, and Spirit.
2. **Set trait dice and default bonus.** Edit the dice count and default bonus (used when no skill applies) in each trait panel to match your character concept.
3. **Add skills.** Click **Add Skill** next to any trait to create a new skill Item. Fill in the skill name, select the associated trait, and set the skill bonus. Skills appear in the trait's table and can be rolled directly.
4. **Add powers, tricks, and quirks.** Use the **Add Power**, **Add Trick**, and **Add Quirk** buttons on their respective tabs to create new items. Fill out activation types, costs, requirements, and trait/skill associations on the item sheets.
5. **Add weapons.** Use the **Add Weapon** button to create close-combat weapons with damage, skills, and special properties.
6. **Roll during play.** Click the roll button next to any skill to prompt for a target number, roll `[trait dice]d6 + [skill bonus]`, and broadcast formatted results to chat. Power rolls automatically include bonus dice.
7. **Track notes and background.** Record freeform information on the Notes tab for quick reference at the table.

## Brave New World mechanics in Foundry

- **Traits** are configured as system settings with dice counts and default bonuses. Each actor stores their personalized trait dice and defaults.
- **Skills** are Item documents linked to a specific trait, with a bonus value. This allows skills to be shared via compendiums and reused across characters.
- **Roll formula**: `[Trait Dice]d6 + [Skill Bonus or Trait Default]` with exploding 6s (`x=6`), always rolling at least one die.
- The system compares the highest die result to the target number to determine success or failure, mirroring the tabletop resolution system.
- Power rolls automatically include their configured bonus dice and preserve the source item in chat message flags for downstream automation or logging.
- Activation types (Standard, Quick, Free) and costs on power items provide reminders of Brave New World's action economy during sessions.
- Quirks enforce a -10 negative cost limit per character, preventing excessive negative quirk stacking.

## Contributor and development guide

### Local setup

1. Clone or fork the repository into your development workspace.
2. Symlink or copy the project folder into your Foundry `Data/systems` directory so local changes load in your testing world.
3. Launch Foundry and enable the *Brave New World* system to review your changes.

The codebase is plain JavaScript, Handlebars templates, and CSS organized under `scripts/`, `templates/`, `styles/`, `lang/`, and `packs/`, so no build step is required for iterative development.【F:scripts/main.js†L1-L31】【F:templates/actors/delta-sheet.hbs†L1-L89】【F:styles/main.css†L1-L118】

### Development workflow

- Follow Foundry VTT best practices: register new sheets or helpers within initialization hooks and keep styles within the scoped `.bnw` classes seen in `styles/main.css`.【F:scripts/main.js†L1-L24】【F:styles/main.css†L1-L118】
- Prefer extending the existing `BraveNewWorldActorSheet` and `BraveNewWorldItemSheet` classes when adding features so traits, skills, and power integration remain consistent.【F:scripts/bnw-actor-sheet.js†L1-L100】【F:scripts/bnw-item-sheet.js†L1-L21】
- Update localization keys in `lang/en.json` when introducing new interface strings.【F:lang/en.json†L1-L36】
- Contribute additional compendium content by exporting packs through Foundry and placing the resulting `.db` files under `packs/` with entries added to `system.json`.【F:system.json†L1-L32】

### Testing

- Manual testing is currently expected: reload your Foundry world after changes, create a test Delta actor, and verify sheet edits, dice rolls, and chat cards behave as intended.【F:templates/actors/delta-sheet.hbs†L31-L89】【F:scripts/bnw-dice.js†L12-L121】
- If you add automated tooling (linting, bundlers, CI), document the commands in this section for future contributors.

## Licensing

A dedicated open-source license has not yet been published in this repository. Coordinate with the maintainers before redistributing or incorporating the system into other projects, and include licensing updates with substantial contributions.
