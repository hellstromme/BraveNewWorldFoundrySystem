class BraveNewWorldItemSheet extends ItemSheet {
  static get defaultOptions() {
    const basePath = `systems/${game.system.id}`;
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['bravenewworld', 'sheet', 'item', 'bnw'],
      template: `${basePath}/templates/items/power-sheet.hbs`,
      width: 520,
      height: 520
    });
  }

  get template() {
    return `systems/${game.system.id}/templates/items/${this.item.type}-sheet.hbs`;
  }

  async getData(options) {
    const context = await super.getData(options);
    context.system = foundry.utils.deepClone(this.item.system ?? {});
    const actor = this.item?.parent ?? this.actor ?? null;
    const currentTrait = context.system?.trait ?? '';
    const currentSkill = context.system?.skill ?? '';

    context.traitOptions = this._prepareTraitOptions(actor, currentTrait);
    context.skillOptions = this._prepareSkillOptions(actor, currentSkill, context.traitOptions);
    return context;
  }

  _prepareTraitOptions(actor, currentTrait) {
    const options = new Map();

    const defaultTraits = this._getDefaultTraitData();
    for (const [key, data] of Object.entries(defaultTraits)) {
      const label = data?.label ?? this._capitalize(key);
      options.set(key, label);
    }

    for (const key of CONFIG.BNW?.traits ?? []) {
      if (!options.has(key)) {
        options.set(key, this._capitalize(key));
      }
    }

    if (actor) {
      const actorTraits = foundry.utils.getProperty(actor, 'system.traits') ?? {};
      for (const [key, data] of Object.entries(actorTraits)) {
        const label = data?.label ?? this._capitalize(key);
        options.set(key, label);
      }
    }

    if (currentTrait && !options.has(currentTrait)) {
      options.set(currentTrait, this._capitalize(currentTrait));
    }

    return Array.from(options.entries()).map(([key, label]) => ({ key, label }));
  }

  _prepareSkillOptions(actor, currentSkill, traitOptions = []) {
    const traitLabelMap = new Map((traitOptions ?? []).map((option) => [option.key, option.label]));
    const defaultTraitKey = this._defaultTraitKey(traitOptions);
    const options = new Map();

    const mergeSkills = (skills = {}) => {
      if (!skills || typeof skills !== 'object') return;

      for (const [key, data] of Object.entries(skills)) {
        const baseLabel = data?.label && String(data.label).trim().length ? String(data.label).trim() : this._capitalize(key);
        const traitKey = data?.trait ?? defaultTraitKey;
        const traitLabel = traitKey ? traitLabelMap.get(traitKey) ?? this._capitalize(traitKey) : '';
        const label = traitLabel ? `${baseLabel} (${traitLabel})` : baseLabel;
        options.set(key, { key, label });
      }
    };

    mergeSkills(this._getDefaultSkillData());

    if (actor) {
      mergeSkills(foundry.utils.getProperty(actor, 'system.skills'));
    }

    if (currentSkill && !options.has(currentSkill)) {
      const currentData = actor ? foundry.utils.getProperty(actor, `system.skills.${currentSkill}`) : null;
      const baseLabel = currentData?.label && String(currentData.label).trim().length
        ? String(currentData.label).trim()
        : this._capitalize(currentSkill);
      const traitKey = currentData?.trait ?? defaultTraitKey;
      const traitLabel = traitKey ? traitLabelMap.get(traitKey) ?? this._capitalize(traitKey) : '';
      const label = traitLabel ? `${baseLabel} (${traitLabel})` : baseLabel;
      options.set(currentSkill, { key: currentSkill, label });
    }

    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  _getDefaultTraitData() {
    if (typeof game === 'undefined') return {};

    const systemData = game.system ?? {};
    return (
      foundry.utils.getProperty(systemData, 'template.Actor.delta.system.traits') ??
      foundry.utils.getProperty(systemData, 'model.Actor.delta.traits') ??
      foundry.utils.getProperty(systemData, 'model.Actor.delta.system.traits') ??
      {}
    );
  }

  _getDefaultSkillData() {
    if (typeof game === 'undefined') return {};

    const systemData = game.system ?? {};
    return (
      foundry.utils.getProperty(systemData, 'template.Actor.delta.system.skills') ??
      foundry.utils.getProperty(systemData, 'model.Actor.delta.skills') ??
      foundry.utils.getProperty(systemData, 'model.Actor.delta.system.skills') ??
      {}
    );
  }

  _defaultTraitKey(traitOptions = []) {
    if (Array.isArray(traitOptions) && traitOptions.length > 0) {
      const firstKey = traitOptions[0]?.key;
      if (firstKey) return firstKey;
    }

    if (Array.isArray(CONFIG.BNW?.traits) && CONFIG.BNW.traits.length > 0) {
      return CONFIG.BNW.traits[0];
    }

    const defaultTraits = this._getDefaultTraitData();
    const firstDefaultKey = Object.keys(defaultTraits)[0];
    if (firstDefaultKey) return firstDefaultKey;

    return 'body';
  }

  _capitalize(value) {
    if (typeof value !== 'string' || !value.length) return value ?? '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

globalThis.BraveNewWorldItemSheet = BraveNewWorldItemSheet;
