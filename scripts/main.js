Hooks.once('init', async function () {
  console.log('BNW | Initializing Brave New World system');

  CONFIG.BNW = CONFIG.BNW ?? {};
  CONFIG.BNW.traits = CONFIG.BNW.traits ?? ['body', 'mind', 'spirit'];

  CONFIG.Actor.typeLabels = CONFIG.Actor.typeLabels ?? {};
  CONFIG.Actor.typeLabels.delta = game.i18n.localize('BNW.ActorType.Delta');

  CONFIG.Item.typeLabels = CONFIG.Item.typeLabels ?? {};
  CONFIG.Item.typeLabels.power = game.i18n.localize('BNW.ItemType.Power');

  if (!Handlebars.helpers.eq) {
    Handlebars.registerHelper('eq', (a, b) => a === b);
  }

  if (!Handlebars.helpers.hasEntries) {
    Handlebars.registerHelper('hasEntries', (value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      if (value && typeof value === 'object') {
        return Object.keys(value).length > 0;
      }

      return false;
    });
  }

  await loadTemplates([
    'templates/actors/delta-sheet.hbs',
    'templates/items/power-sheet.hbs',
    'templates/chat/skill-roll-card.hbs'
  ]);

  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('bravenewworld', BraveNewWorldActorSheet, {
    types: ['delta'],
    makeDefault: true
  });

  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('bravenewworld', BraveNewWorldItemSheet, {
    types: ['power'],
    makeDefault: true
  });
});

Hooks.once('ready', function () {
  game.bnw = game.bnw ?? {};
  game.bnw.dice = BNW.dice;
  console.log('BNW | Ready');
});
