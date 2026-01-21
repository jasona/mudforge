/**
 * Encumbrance command - Check your current weight and encumbrance status.
 *
 * Usage:
 *   encumbrance - Show weight bar, current/max weight, percentage, and penalties
 *   enc - Alias for encumbrance
 *   weight - Alias for encumbrance
 */

import type { MudObject, Living, EquipmentSlot, Item } from '../../lib/std.js';
import { ENCUMBRANCE_PENALTIES } from '../../std/living.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['encumbrance', 'enc', 'weight'];
export const description = 'Check your current weight and encumbrance';
export const usage = 'encumbrance';

/**
 * Generate a visual weight bar.
 */
function generateWeightBar(percent: number, width: number = 20): string {
  const filledWidth = Math.min(width, Math.round((percent / 100) * width));
  const filled = '█'.repeat(filledWidth);
  const empty = '░'.repeat(width - filledWidth);

  // Color based on encumbrance level
  let color = 'green';
  if (percent > 124) {
    color = 'red';
  } else if (percent > 99) {
    color = 'yellow';
  } else if (percent > 74) {
    color = 'cyan';
  }

  return `{${color}}[${filled}${empty}]{/}`;
}

/**
 * Get encumbrance level name with color.
 */
function getEncumbranceLevelDisplay(level: string): string {
  switch (level) {
    case 'none':
      return '{green}None{/}';
    case 'light':
      return '{cyan}Light{/}';
    case 'medium':
      return '{yellow}Medium{/}';
    case 'heavy':
      return '{red}Heavy{/}';
    default:
      return level;
  }
}

export function execute(ctx: CommandContext): void {
  const { player } = ctx;
  const living = player as Living;

  const currentWeight = living.getCarriedWeight();
  const maxWeight = living.getMaxCarryWeight();
  const percent = living.getEncumbrancePercent();
  const level = living.getEncumbranceLevel();
  const penalties = living.getEncumbrancePenalties();
  const equipped = living.getAllEquipped();

  // Build set of equipped item references
  const equippedSet = new Set<MudObject>(equipped.values());

  // Calculate equipped vs carried weight
  let equippedWeight = 0;
  let carriedWeight = 0;

  for (const obj of player.inventory) {
    const item = obj as Item;
    if (typeof item.getEffectiveWeight === 'function') {
      const weight = item.getEffectiveWeight();
      if (equippedSet.has(obj)) {
        equippedWeight += weight;
      } else {
        carriedWeight += weight;
      }
    }
  }

  // Header
  ctx.sendLine('{bold}=== Encumbrance ==={/}');
  ctx.sendLine('');

  // Weight bar
  const bar = generateWeightBar(percent);
  ctx.sendLine(`Weight: ${bar} ${percent.toFixed(1)}%`);
  ctx.sendLine('');

  // Weight stats
  ctx.sendLine(`Current Weight: {bold}${currentWeight.toFixed(1)}{/} / ${maxWeight.toFixed(1)}`);
  ctx.sendLine(`  Equipped: ${equippedWeight.toFixed(1)}`);
  ctx.sendLine(`  Carried:  ${carriedWeight.toFixed(1)}`);
  ctx.sendLine('');

  // Encumbrance level
  ctx.sendLine(`Status: ${getEncumbranceLevelDisplay(level)}`);

  // Show penalties if any
  if (level !== 'none') {
    ctx.sendLine('');
    ctx.sendLine('{dim}Active Penalties:{/}');
    if (penalties.attackSpeedPenalty > 0) {
      ctx.sendLine(`  {red}-${Math.round(penalties.attackSpeedPenalty * 100)}% attack speed{/}`);
    }
    if (penalties.dodgePenalty > 0) {
      ctx.sendLine(`  {red}-${Math.round(penalties.dodgePenalty * 100)}% dodge chance{/}`);
    }
    if (level === 'heavy') {
      ctx.sendLine(`  {red}Cannot pick up more items{/}`);
    }
  }

  // Show strength info
  ctx.sendLine('');
  ctx.sendLine(`{dim}Strength: ${living.getStat('strength')} (carry capacity: ${maxWeight.toFixed(0)}){/}`);
}

export default { name, description, usage, execute };
