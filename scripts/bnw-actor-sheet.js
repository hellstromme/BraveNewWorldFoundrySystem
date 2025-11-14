class BraveNewWorldActorSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    const basePath = CONFIG.BNW?.systemBasePath ?? game.system?.path ?? `systems/${game.system.id}`;
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['bravenewworld', 'sheet', 'actor', 'bnw'],
      template: `${basePath}/templates/actors/delta-sheet.hbs`,
      width: 720,
      height: 720,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'traits' }]
    });
  }

  get template() {
    const basePath = CONFIG.BNW?.systemBasePath ?? game.system?.path ?? `systems/${game.system.id}`;
    return `${basePath}/templates/actors/${this.actor.type}-sheet.hbs`;
  }

  async getData(options) {
    const context = await super.getData(options);
    const system = foundry.utils.deepClone(this.actor.system ?? {});

    system.details ??= {};
    const defaultDetails = {
      playerName: '',
      heroName: '',
      codeName: '',
      origin: '',
      affiliation: '',
      background: ''
    };
    for (const [key, value] of Object.entries(defaultDetails)) {
      if (system.details[key] === undefined) system.details[key] = value;
    }
    system.traits ??= {};
    system.skills ??= {};

    const defaultSkills = CONFIG.BNW?.defaultSkills ?? {};
    if (foundry.utils.isEmpty(system.skills) && !foundry.utils.isEmpty(defaultSkills)) {
      system.skills = foundry.utils.deepClone(defaultSkills);
    }
    system.notes ??= '';

    for (const traitKey of CONFIG.BNW?.traits ?? []) {
      system.traits[traitKey] ??= { label: this._capitalize(traitKey), value: 0 };
    }

    context.system = system;
    context.traits = this._prepareTraits(system.traits);
    context.skillsByTrait = this._prepareSkills(system.skills, context.traits);

    for (const [traitKey, skills] of Object.entries(context.skillsByTrait ?? {})) {
      for (const skill of skills) {
        const skillData = system.skills[skill.key] ?? (system.skills[skill.key] = {});
        if (!skillData.trait) {
          skillData.trait = skill?.trait ?? traitKey;
        }
      }
    }

    context.powers = this.actor.items.filter((item) => item.type === 'power');
    context.tricks = this.actor.items.filter((item) => item.type === 'trick');
    context.quirks = this.actor.items.filter((item) => item.type === 'quirk');
    
    // Calculate total negative quirks points
    context.negativeQuirksTotal = this._calculateNegativeQuirksTotal(context.quirks);

    return context;
  }

  _prepareTraits(traits = {}) {
    return Object.entries(traits).map(([key, data]) => ({
      key,
      label: data?.label ?? this._capitalize(key),
      value: Number(data?.value ?? 0)
    }));
  }

  _prepareSkills(skills = {}, traits = []) {
    const groups = {};
    for (const trait of traits) {
      groups[trait.key] = [];
    }

    const defaultTraitKey = traits[0]?.key ?? CONFIG.BNW?.traits?.[0] ?? 'strength';

    for (const [key, data] of Object.entries(skills)) {
      const traitKey = data?.trait ?? defaultTraitKey;
      const trait = traits.find((t) => t.key === traitKey) ?? { key: traitKey, value: 0 };
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

    for (const trait of traits) {
      groups[trait.key] = (groups[trait.key] ?? []).sort((a, b) => a.label.localeCompare(b.label));
    }

    return groups;
  }

  _capitalize(value) {
    if (typeof value !== 'string' || !value.length) return value ?? '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  _calculateNegativeQuirksTotal(quirks = []) {
    let total = 0;
    for (const quirk of quirks) {
      const cost = Number(quirk.system?.cost ?? 0);
      if (cost < 0) {
        total += cost;
      }
    }
    return Math.abs(total); // Return as positive number for display
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('.skill-roll').on('click', this._onSkillRoll.bind(this));
    html.find('.power-roll').on('click', this._onPowerRoll.bind(this));
  }

  async _onItemCreate(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const type = button.dataset.type;
    
    const itemData = {
      name: game.i18n.format('DOCUMENT.New', { type: game.i18n.localize(`ITEM.Type${type.capitalize()}`) }),
      type: type
    };
    
    return this.actor.createEmbeddedDocuments('Item', [itemData]);
  }

  async _onDropItemCreate(itemData) {
    // Validate trick requirements before adding to actor
    if (itemData.type === 'trick') {
      const requiresPower = itemData.system?.requiresPower ?? false;
      const requiredPowerName = itemData.system?.requiredPowerName ?? '';

      if (requiresPower && requiredPowerName) {
        // Check if the actor has the required power
        const hasPower = this.actor.items.some(
          (item) => item.type === 'power' && 
                    item.name.toLowerCase().trim() === requiredPowerName.toLowerCase().trim()
        );

        if (!hasPower) {
          const message = game?.i18n?.format?.(
            'BNW.Warning.MissingRequiredPower',
            { trick: itemData.name, power: requiredPowerName }
          ) ?? `Cannot add trick '${itemData.name}' - requires power: ${requiredPowerName}`;
          
          ui.notifications?.warn?.(message);
          return false;
        }
      }
    }

    // Validate negative quirk limit before adding to actor
    if (itemData.type === 'quirk') {
      const cost = Number(itemData.system?.cost ?? 0);

      // Only validate if the quirk has negative cost
      if (cost < 0) {
        const currentQuirks = this.actor.items.filter((item) => item.type === 'quirk');
        const currentTotal = this._calculateNegativeQuirksTotal(currentQuirks);
        const newTotal = currentTotal + Math.abs(cost);

        if (newTotal > 10) {
          const message = game?.i18n?.format?.(
            'BNW.Warning.TooManyNegativeQuirks',
            { current: currentTotal, adding: Math.abs(cost) }
          ) ?? `Cannot add quirk - would exceed the limit of 10 negative quirk points (current: ${currentTotal}, attempting to add: ${Math.abs(cost)})`;
          
          ui.notifications?.warn?.(message);
          return false;
        }
      }
    }

    return super._onDropItemCreate(itemData);
  }

  async _onSkillRoll(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const traitKey = button.dataset.trait;
    const skillKey = button.dataset.skill;

    return BNW.dice.rollTraitSkill({
      actor: this.actor,
      traitKey,
      skillKey
    });
  }

  async _onPowerRoll(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const traitKey = item.system?.trait ?? '';
    const skillKey = item.system?.skill ?? '';

    return BNW.dice.rollTraitSkill({
      actor: this.actor,
      traitKey,
      skillKey,
      bonusDice: Number(item.system?.dice ?? 0),
      label: item.name,
      sourceItem: item
    });
  }
}

globalThis.BraveNewWorldActorSheet = BraveNewWorldActorSheet;
