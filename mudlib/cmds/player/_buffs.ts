/**
 * buffs - View your active buffs and debuffs.
 *
 * Usage:
 *   buffs        - Show all active effects
 *   buffs detail - Show detailed view with sources and durations
 */

import type { MudObject } from '../../lib/std.js';
import type { Effect, EffectCategory } from '../../std/combat/types.js';
import type { Living } from '../../std/living.js';

interface BuffsPlayer extends MudObject {
  name: string;
  getEffects(): Effect[];
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['buffs', 'effects', 'debuffs'];
export const description = 'View your active buffs and debuffs';
export const usage = 'buffs [detail]';

/**
 * Format duration in milliseconds to human-readable string.
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
}

/**
 * Get a description for an effect based on its type and properties.
 */
function getEffectDescription(effect: Effect): string {
  // Use the effect's description if provided
  if (effect.description) {
    return effect.description;
  }

  // Generate description based on effect type
  const magnitude = effect.magnitude;
  const stacks = effect.stacks || 1;
  const stackStr = stacks > 1 ? ` x${stacks}` : '';

  switch (effect.type) {
    case 'stat_modifier':
      if (effect.stat) {
        const sign = magnitude >= 0 ? '+' : '';
        return `${sign}${magnitude} ${effect.stat}${stackStr}`;
      }
      break;

    case 'combat_modifier':
      if (effect.combatStat) {
        const sign = magnitude >= 0 ? '+' : '';
        return `${sign}${magnitude} ${effect.combatStat}${stackStr}`;
      }
      break;

    case 'damage_over_time':
      return `${magnitude} dmg/tick${stackStr}`;

    case 'heal_over_time':
      return `${magnitude} heal/tick${stackStr}`;

    case 'damage_shield':
      return `${magnitude} absorption remaining`;

    case 'thorns':
      return `${magnitude} damage reflection`;

    case 'haste':
      return `+${(magnitude * 100).toFixed(0)}% speed`;

    case 'slow':
      return `-${(magnitude * 100).toFixed(0)}% speed`;

    case 'stun':
      return 'Cannot attack';

    case 'invulnerable':
      return 'Immune to damage';

    // Visibility effects
    case 'stealth':
      if (magnitude >= 50) {
        return 'Hidden from view';
      }
      return 'Moving quietly';

    case 'invisibility':
      return 'Invisible to normal sight';

    case 'see_invisible':
      return 'Can see invisible creatures';

    case 'detect_hidden':
      return `+${magnitude} perception`;
  }

  return '';
}

/**
 * Determine the category of an effect for display.
 */
function getEffectCategory(effect: Effect): EffectCategory {
  // Use explicit category if set
  if (effect.category) {
    return effect.category;
  }

  // Infer category from effect type
  switch (effect.type) {
    case 'damage_over_time':
    case 'stun':
    case 'slow':
      return 'debuff';

    case 'heal_over_time':
    case 'damage_shield':
    case 'haste':
    case 'invulnerable':
      return 'buff';

    case 'stat_modifier':
    case 'combat_modifier':
      // Positive magnitude = buff, negative = debuff
      return effect.magnitude >= 0 ? 'buff' : 'debuff';

    case 'thorns':
      return 'buff';

    // Visibility effects are all buffs
    case 'stealth':
    case 'invisibility':
    case 'see_invisible':
    case 'detect_hidden':
      return 'buff';

    default:
      return 'neutral';
  }
}

/**
 * Get color for effect category.
 */
function getCategoryColor(category: EffectCategory): string {
  switch (category) {
    case 'buff':
      return 'green';
    case 'debuff':
      return 'red';
    default:
      return 'yellow';
  }
}

export function execute(ctx: CommandContext): void {
  const player = ctx.player as BuffsPlayer;
  const args = ctx.args.trim().toLowerCase();
  const detailed = args === 'detail' || args === 'details' || args === 'd';

  // Get all effects
  const effects = player.getEffects();

  // Filter out hidden effects
  const visibleEffects = effects.filter((e) => !e.hidden);

  if (visibleEffects.length === 0) {
    ctx.sendLine('{dim}You have no active effects.{/}');
    return;
  }

  // Categorize effects
  const buffs: Effect[] = [];
  const debuffs: Effect[] = [];
  const neutral: Effect[] = [];

  for (const effect of visibleEffects) {
    const category = getEffectCategory(effect);
    if (category === 'buff') {
      buffs.push(effect);
    } else if (category === 'debuff') {
      debuffs.push(effect);
    } else {
      neutral.push(effect);
    }
  }

  // Sort each category by remaining duration
  const sortByDuration = (a: Effect, b: Effect) => a.duration - b.duration;
  buffs.sort(sortByDuration);
  debuffs.sort(sortByDuration);
  neutral.sort(sortByDuration);

  // Display
  ctx.sendLine('');
  ctx.sendLine('{bold}{cyan}=== Active Effects ==={/}');
  ctx.sendLine('');

  // Display buffs
  if (buffs.length > 0) {
    ctx.sendLine('{bold}{green}Buffs:{/}');
    for (const effect of buffs) {
      displayEffect(ctx, effect, 'buff', detailed);
    }
    ctx.sendLine('');
  }

  // Display debuffs
  if (debuffs.length > 0) {
    ctx.sendLine('{bold}{red}Debuffs:{/}');
    for (const effect of debuffs) {
      displayEffect(ctx, effect, 'debuff', detailed);
    }
    ctx.sendLine('');
  }

  // Display neutral effects
  if (neutral.length > 0) {
    ctx.sendLine('{bold}{yellow}Other Effects:{/}');
    for (const effect of neutral) {
      displayEffect(ctx, effect, 'neutral', detailed);
    }
    ctx.sendLine('');
  }

  // Summary
  const total = visibleEffects.length;
  const buffCount = buffs.length;
  const debuffCount = debuffs.length;

  let summary = `{dim}${total} active effect${total !== 1 ? 's' : ''}`;
  if (buffCount > 0 || debuffCount > 0) {
    const parts: string[] = [];
    if (buffCount > 0) parts.push(`${buffCount} buff${buffCount !== 1 ? 's' : ''}`);
    if (debuffCount > 0) parts.push(`${debuffCount} debuff${debuffCount !== 1 ? 's' : ''}`);
    summary += ` (${parts.join(', ')})`;
  }
  summary += '{/}';

  ctx.sendLine(summary);

  if (!detailed) {
    ctx.sendLine("{dim}Use 'buffs detail' for more information.{/}");
  }
}

/**
 * Display a single effect.
 */
function displayEffect(
  ctx: CommandContext,
  effect: Effect,
  category: EffectCategory,
  detailed: boolean
): void {
  const color = getCategoryColor(category);
  const description = getEffectDescription(effect);
  const duration = formatDuration(effect.duration);

  if (detailed) {
    // Detailed view
    ctx.sendLine(`  {${color}}${effect.name}{/}`);
    if (description) {
      ctx.sendLine(`    Effect: ${description}`);
    }
    ctx.sendLine(`    Time remaining: ${duration}`);

    if (effect.source && 'name' in effect.source) {
      ctx.sendLine(`    Source: ${(effect.source as Living & { name: string }).name}`);
    }

    if (effect.stacks && effect.stacks > 1) {
      ctx.sendLine(`    Stacks: ${effect.stacks}${effect.maxStacks ? `/${effect.maxStacks}` : ''}`);
    }
  } else {
    // Compact view
    const descStr = description ? ` (${description})` : '';
    ctx.sendLine(`  {${color}}${effect.name}{/}${descStr} - ${duration} remaining`);
  }
}

export default { name, description, usage, execute };
