Hooks.once('init', async function () {
  console.log('BNW | Initializing Brave New World system');

  CONFIG.BNW = CONFIG.BNW ?? {};
  CONFIG.BNW.traits = CONFIG.BNW.traits ?? ['body', 'mind', 'spirit'];

  if (!Handlebars.helpers.eq) {
    Handlebars.registerHelper('eq', (a, b) => a === b);
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
