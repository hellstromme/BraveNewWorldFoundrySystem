Hooks.once('init', async function () {
  console.log('BNW | Initializing Brave New World system');

  CONFIG.BNW = CONFIG.BNW ?? {};
  CONFIG.BNW.traits = CONFIG.BNW.traits ?? ['body', 'mind', 'spirit'];
  CONFIG.BNW.defaultSkills =
    CONFIG.BNW.defaultSkills ??
    Object.freeze({
      athletics: { label: 'Athletics', trait: 'body', value: 2 },
      brawl: { label: 'Brawl', trait: 'body', value: 2 },
      might: { label: 'Might', trait: 'body', value: 2 },
      stealth: { label: 'Stealth', trait: 'body', value: 2 },
      investigation: { label: 'Investigation', trait: 'mind', value: 2 },
      knowledge: { label: 'Knowledge', trait: 'mind', value: 2 },
      science: { label: 'Science', trait: 'mind', value: 2 },
      technology: { label: 'Technology', trait: 'mind', value: 2 },
      leadership: { label: 'Leadership', trait: 'spirit', value: 2 },
      persuasion: { label: 'Persuasion', trait: 'spirit', value: 2 },
      streetwise: { label: 'Streetwise', trait: 'spirit', value: 2 },
      willpower: { label: 'Willpower', trait: 'spirit', value: 2 }
    });

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

  const systemBasePath = game.system?.path ?? `systems/${game.system.id}`;
  CONFIG.BNW.systemBasePath = systemBasePath;

  const templatesToLoad = [
    `${systemBasePath}/templates/actors/delta-sheet.hbs`,
    `${systemBasePath}/templates/items/power-sheet.hbs`,
    `${systemBasePath}/templates/chat/skill-roll-card.hbs`
  ];

  const loadHandlebarsTemplates =
    foundry?.applications?.handlebars?.loadTemplates ?? loadTemplates;
  await loadHandlebarsTemplates(templatesToLoad);

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
