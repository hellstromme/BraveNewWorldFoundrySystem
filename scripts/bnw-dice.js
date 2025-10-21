const BNW = globalThis.BNW ?? (globalThis.BNW = {});
BNW.dice = BNW.dice ?? {};

/**
 * Prompt the user for a target number if one was not provided.
 * @param {object} options
 * @param {number} [options.defaultTarget=7]
 * @param {string} [options.traitLabel]
 * @param {string} [options.skillLabel]
 * @returns {Promise<number|null>}
 */
BNW.dice.promptTargetNumber = async function ({ defaultTarget = 7, traitLabel = '', skillLabel = '' } = {}) {
  const title = game?.i18n?.localize?.('BNW.RollPromptTitle') ?? 'Brave New World Test';
  const targetLabel = game?.i18n?.localize?.('BNW.RollPromptTarget') ?? 'Target Number';
  const buttonLabel = game?.i18n?.localize?.('BNW.RollPromptButton') ?? 'Roll Dice';

  const label = [skillLabel, traitLabel].filter(Boolean).join(' / ');
  const content = `
    <form class="bnw-dialog">
      ${label ? `<p class="context">${label}</p>` : ''}
      <div class="form-group">
        <label>${targetLabel}</label>
        <input type="number" name="target" value="${defaultTarget}" min="2" step="1" />
      </div>
    </form>
  `;

  const dialogV2 = foundry?.applications?.api?.DialogV2;
  if (dialogV2?.prompt) {
    try {
      const result = await dialogV2.prompt({
        title,
        content,
        label: buttonLabel,
        rejectClose: false,
        submit: (event, form, formData) => {
          const rawFromData = formData?.get?.('target');
          if (rawFromData != null) {
            const parsed = Number(rawFromData);
            if (Number.isFinite(parsed)) return parsed;
          }

          const root = form instanceof HTMLElement ? form : form?.element ?? null;
          const input = root?.querySelector?.('input[name="target"]');
          if (input?.value != null) {
            const parsed = Number(input.value);
            if (Number.isFinite(parsed)) return parsed;
          }

          return defaultTarget;
        }
      });

      if (result != null) return result;
    } catch (error) {
      console.warn('BNW | DialogV2 prompt failed, falling back to Dialog.prompt', error);
    }
  }

  return Dialog.prompt({
    title,
    content,
    label: buttonLabel,
    callback: (html) => {
      const selector = 'input[name="target"]';

      let inputElement = null;
      if (typeof html?.find === 'function') {
        inputElement = html.find(selector)?.[0] ?? null;
      }

      if (!inputElement) {
        const root = html?.[0] ?? html;
        if (root?.querySelector) {
          inputElement = root.querySelector(selector);
        }
      }

      const rawValue = inputElement?.value;
      const value = Number(rawValue);
      return Number.isFinite(value) ? value : defaultTarget;
    },
    rejectClose: false
  });
};

/**
 * Roll a Brave New World trait + skill dice pool.
 * @param {object} params
 * @param {Actor} params.actor
 * @param {string} params.traitKey
 * @param {string} params.skillKey
 * @param {number} [params.target]
 * @param {number} [params.bonusDice=0]
 * @param {string} [params.label]
 * @param {Item} [params.sourceItem]
 */
BNW.dice.rollTraitSkill = async function ({
  actor,
  traitKey,
  skillKey,
  target = null,
  bonusDice = 0,
  label = '',
  sourceItem = null
} = {}) {
  if (!actor) {
    console.warn('BNW | rollTraitSkill requires an actor.');
    return null;
  }

  const systemData = actor.system ?? {};
  const trait = foundry.utils.getProperty(systemData, `traits.${traitKey}`) ?? null;
  if (!trait) {
    ui.notifications?.warn?.(game?.i18n?.format?.('BNW.Warning.UnknownTrait', { trait: traitKey }) ?? `Unknown trait: ${traitKey}`);
    return null;
  }

  let skill = null;
  if (skillKey) {
    skill = foundry.utils.getProperty(systemData, `skills.${skillKey}`) ?? null;
    if (!skill) {
      ui.notifications?.warn?.(game?.i18n?.format?.('BNW.Warning.UnknownSkill', { skill: skillKey }) ?? `Unknown skill: ${skillKey}`);
    }
  }

  const traitValue = Number(trait?.value ?? 0);
  const skillValue = Number(skill?.value ?? 0);
  const bonusValue = Number(bonusDice ?? 0);
  let pool = traitValue + skillValue + bonusValue;
  if (!Number.isFinite(pool) || pool < 1) pool = 1;

  const defaultTarget = Number(target ?? 0) || 7;
  const resolvedTarget = target ?? await BNW.dice.promptTargetNumber({
    defaultTarget,
    traitLabel: trait?.label ?? traitKey,
    skillLabel: skill?.label ?? skillKey
  });
  if (resolvedTarget == null) return null;

  const formula = `${pool}d6x=6`;
  let roll = new Roll(formula);

  const evaluateArgsLength = typeof roll.evaluate === 'function' ? roll.evaluate.length : null;
  let evaluation = null;
  if (typeof roll.evaluate === 'function') {
    try {
      evaluation = evaluateArgsLength === 0 ? roll.evaluate() : roll.evaluate({ async: true });
    } catch (error) {
      if (typeof roll.evaluateSync === 'function') {
        roll = roll.evaluateSync();
        evaluation = null;
      } else {
        throw error;
      }
    }
  }

  if (evaluation) {
    roll = evaluation instanceof Promise ? await evaluation : evaluation;
  }

  const diceResults = [];

  for (const term of roll.dice ?? []) {
    if (!term?.results) continue;

    let runningTotal = 0;
    for (const result of term.results) {
      if (result?.result == null) continue;

      const value = Number(result.result);
      if (!Number.isFinite(value)) continue;

      runningTotal += value;

      if (!result.exploded) {
        diceResults.push(runningTotal);
        runningTotal = 0;
      }
    }

    if (runningTotal > 0) {
      diceResults.push(runningTotal);
    }
  }

  if (!diceResults.length) {
    diceResults.push(0);
  }

  const highest = Math.max(...diceResults);
  const success = highest >= resolvedTarget;

  const data = {
    actorName: actor.name,
    traitLabel: trait?.label ?? traitKey,
    skillLabel: skill?.label ?? skillKey ?? label,
    pool,
    dice: diceResults,
    highest,
    target: resolvedTarget,
    success,
    bonusDice: bonusValue > 0 ? bonusValue : null,
    title: label || (skill?.label ? `${skill.label} (${trait?.label ?? traitKey})` : `${trait?.label ?? traitKey}`)
  };

  const systemBasePath =
    CONFIG.BNW?.systemBasePath ??
    game.system?.path ??
    (game.system?.id ? `systems/${game.system.id}` : '');
  const templateBasePath =
    CONFIG.BNW?.templatePath ?? (systemBasePath ? `${systemBasePath}/templates` : 'templates');
  const renderHandlebarsTemplate =
    foundry?.applications?.handlebars?.renderTemplate ?? renderTemplate;
  const content = await renderHandlebarsTemplate(`${templateBasePath}/chat/skill-roll-card.hbs`, data);

  return roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: data.title,
    content,
    flags: {
      bravenewworld: {
        trait: traitKey,
        skill: skillKey,
        target: resolvedTarget,
        highest,
        pool,
        bonusDice: bonusValue,
        itemId: sourceItem?.id ?? null
      }
    }
  });
};
