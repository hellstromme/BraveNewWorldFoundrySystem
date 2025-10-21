# BraveNewWorldFoundrySystem

BraveNewWorldFoundrySystem brings the Brave New World tabletop roleplaying game into Foundry Virtual Tabletop with native character, power, and dice automation tailored for Delta heroes.

## Project goals

- Deliver a Foundry VTT system that reflects Brave New World's trait, skill, and power structure without requiring custom scripting by table groups.
- Provide user-friendly sheets and dice tooling so players can manage Deltas, roll trait + skill pools, and share results in chat quickly.
- Supply an extensible foundation for further content—additional items, talents, or rule options—through standard Foundry conventions.

## Prerequisites

- Foundry Virtual Tabletop core software version 11 or later, with current manifest compatibility spanning minimum 11 through verified/maximum 13.【F:system.json†L15-L19】
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

- Dedicated Delta actor sheet with portrait, concept, demeanor, quote, and background fields organized in a responsive header layout.【F:templates/actors/delta-sheet.hbs†L1-L29】
- Trait panels display customizable labels and dice ratings, with an auto-generated skills table per trait that summarizes current dice pools.【F:templates/actors/delta-sheet.hbs†L31-L71】
- Tabs for **Traits & Skills**, **Powers**, and **Notes** keep long-form character information organized for play.【F:templates/actors/delta-sheet.hbs†L23-L89】

### Powers and items

- Power items capture summary text, activation type, cost, bonus dice, and associated trait/skill keys within a tailored item sheet.【F:templates/items/power-sheet.hbs†L1-L37】
- Actor sheets list embedded powers with quick access to roll, edit, or delete controls plus at-a-glance dice bonuses.【F:templates/actors/delta-sheet.hbs†L73-L88】
- A bundled item compendium (`bnw-items.db`) seeds campaigns with reusable Brave New World content.【F:system.json†L23-L32】

### Dice and chat automation

- `Roll Trait + Skill` buttons on the actor sheet launch automated dice pools for the selected trait/skill pair.【F:templates/actors/delta-sheet.hbs†L57-L71】【F:scripts/bnw-actor-sheet.js†L58-L79】
- Players are prompted for a target number when one is not supplied, enabling on-the-fly tests that respect table difficulty decisions.【F:scripts/bnw-dice.js†L12-L39】
- Dice pools total trait dice, skill dice, and any bonus dice (with a minimum pool of one die) before rolling and sending results to chat.【F:scripts/bnw-dice.js†L40-L86】
- Chat cards highlight every die, the highest result, target number, success/failure state, and any bonus dice for clarity.【F:scripts/bnw-dice.js†L87-L121】【F:templates/chat/skill-roll-card.hbs†L1-L29】
- `game.bnw.dice` exposes the rolling helpers for macro authors and module integrations.【F:scripts/main.js†L1-L31】

### Localization support

- English language strings cover sheet labels, roll prompts, and chat feedback, making it easy to translate the interface for other locales.【F:lang/en.json†L1-L36】

## Data entry workflow

1. **Create a Delta actor.** The sheet automatically seeds trait definitions using the configured `body`, `mind`, and `spirit` categories so you can immediately set dice ratings.【F:scripts/main.js†L1-L14】【F:scripts/bnw-actor-sheet.js†L18-L40】
2. **Set trait labels and dice.** Edit the trait headings and dice inputs in each trait card to match your character concept.【F:templates/actors/delta-sheet.hbs†L31-L49】
3. **Define skills per trait.** Populate `system.skills` entries (via the sheet's fields or the actor's data sidebar) with labels, dice, and linked trait keys; each saved entry appears within the relevant trait table and shows its total pool.【F:scripts/bnw-actor-sheet.js†L41-L57】【F:templates/actors/delta-sheet.hbs†L50-L71】
4. **Add and manage powers.** Use the **Add Power** control to create new power items, then fill out activation, cost, bonus dice, and trait/skill associations on the item sheet.【F:templates/actors/delta-sheet.hbs†L73-L82】【F:templates/items/power-sheet.hbs†L9-L37】
5. **Roll during play.** Trigger trait/skill checks or power rolls directly from the sheet to prompt for target numbers, roll pools, and broadcast formatted results to chat.【F:scripts/bnw-actor-sheet.js†L58-L97】【F:scripts/bnw-dice.js†L12-L121】
6. **Track notes and background.** Record freeform information on the Notes tab for quick reference at the table.【F:templates/actors/delta-sheet.hbs†L85-L89】

## Brave New World mechanics in Foundry

- Dice pools combine trait, skill, and optional bonus dice and always roll at least one d6, mirroring Brave New World's resolution approach.【F:scripts/bnw-dice.js†L58-L77】
- The system compares the highest die to the chosen target number to determine success or failure, echoing the tabletop rule of beating a difficulty.【F:scripts/bnw-dice.js†L78-L111】【F:templates/chat/skill-roll-card.hbs†L12-L24】
- Power rolls automatically include their configured bonus dice and preserve the source item in chat message flags for downstream automation or logging.【F:scripts/bnw-actor-sheet.js†L80-L97】【F:scripts/bnw-dice.js†L99-L118】
- Activation types (Standard, Quick, Free) and costs on power items provide reminders of Brave New World's action economy during sessions.【F:templates/items/power-sheet.hbs†L13-L27】

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
