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

  const roll = await (new Roll(`${pool}d6`)).evaluate({ async: true });
  const diceResults = roll.dice.reduce((results, term) => {
    if (!term?.results) return results;
    for (const result of term.results) {
      if (result?.result != null) results.push(Number(result.result));
    }
    return results;
  }, []);
  const highest = diceResults.length ? Math.max(...diceResults) : 0;
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

  const content = await renderTemplate('templates/chat/skill-roll-card.hbs', data);

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
