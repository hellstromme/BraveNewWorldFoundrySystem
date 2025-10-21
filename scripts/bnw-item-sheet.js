class BraveNewWorldItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['bravenewworld', 'sheet', 'item', 'bnw'],
      template: 'templates/items/power-sheet.hbs',
      width: 520,
      height: 520
    });
  }

  get template() {
    return `templates/items/${this.item.type}-sheet.hbs`;
  }

  async getData(options) {
    const context = await super.getData(options);
    context.system = foundry.utils.deepClone(this.item.system ?? {});
    return context;
  }
}

globalThis.BraveNewWorldItemSheet = BraveNewWorldItemSheet;
