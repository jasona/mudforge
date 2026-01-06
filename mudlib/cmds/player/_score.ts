/**
 * score - View your character's statistics.
 *
 * Usage:
 *   score        - View full character sheet
 *   score stats  - View only stats
 *   score brief  - View condensed info
 */

import type { MudObject } from '../../lib/std.js';
import { STAT_SHORT_NAMES, type StatName } from '../../std/living.js';

interface StatsPlayer extends MudObject {
  name: string;
  title: string;
  gender: 'male' | 'female' | 'neutral';
  level: number;
  experience: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  alive: boolean;
  permissionLevel?: number;
  playTime: number;
  getStats(): Record<StatName, number>;
  getBaseStats(): Record<StatName, number>;
  getStatBonus(stat: StatName): number;
  getProperty(key: string): unknown;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['score', 'sc', 'stats', 'status'];
export const description = 'View your character statistics';
export const usage = 'score [stats|brief]';

/**
 * Format a stat value with its equipment modifier (if any).
 */
function formatStat(name: string, value: number, equipBonus: number): string {
  // Only show bonus if there's an equipment modifier
  if (equipBonus !== 0) {
    const bonusStr = equipBonus > 0 ? `{green}+${equipBonus}{/}` : `{red}${equipBonus}{/}`;
    return `  {cyan}${name.padEnd(4)}{/} ${String(value).padStart(2)} (${bonusStr})`;
  }
  return `  {cyan}${name.padEnd(4)}{/} ${String(value).padStart(2)}`;
}

/**
 * Format playtime as hours/minutes/seconds.
 */
function formatPlayTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Get permission level name.
 */
function getPermissionName(level: number): string {
  switch (level) {
    case 0: return 'Player';
    case 1: return '{magenta}Builder{/}';
    case 2: return '{MAGENTA}Senior Builder{/}';
    case 3: return '{red}Administrator{/}';
    default: return 'Unknown';
  }
}

/**
 * Get health bar visualization.
 */
function getHealthBar(current: number, max: number, width: number = 20): string {
  const percentage = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(percentage * width);
  const empty = width - filled;

  let color = 'green';
  if (percentage <= 0.25) color = 'red';
  else if (percentage <= 0.5) color = 'yellow';

  const bar = '{' + color + '}' + '█'.repeat(filled) + '{/}' + '{dim}░{/}'.repeat(empty);
  return bar;
}

/**
 * Get mana bar visualization.
 */
function getManaBar(current: number, max: number, width: number = 20): string {
  const percentage = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(percentage * width);
  const empty = width - filled;

  let color = 'blue';
  if (percentage <= 0.25) color = 'BLUE';
  else if (percentage <= 0.5) color = 'cyan';

  const bar = '{' + color + '}' + '█'.repeat(filled) + '{/}' + '{dim}░{/}'.repeat(empty);
  return bar;
}

/**
 * Get experience bar visualization.
 */
function getXpBar(current: number, max: number, width: number = 20): string {
  const percentage = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(percentage * width);
  const empty = width - filled;

  const bar = '{yellow}' + '█'.repeat(filled) + '{/}' + '{dim}░{/}'.repeat(empty);
  return bar;
}

export function execute(ctx: CommandContext): void {
  const player = ctx.player as StatsPlayer;
  const args = ctx.args.trim().toLowerCase();

  // Get stats
  const stats = player.getStats();
  const baseStats = player.getBaseStats();

  // Brief mode
  if (args === 'brief' || args === 'b') {
    const healthPct = Math.round((player.health / player.maxHealth) * 100);
    const manaPct = Math.round((player.mana / player.maxMana) * 100);
    ctx.sendLine(`{bold}${player.name}{/} [Lv ${player.level}] HP: ${player.health}/${player.maxHealth} (${healthPct}%) | MP: ${player.mana}/${player.maxMana} (${manaPct}%) | XP: ${player.experience}`);

    const statLine = Object.entries(STAT_SHORT_NAMES)
      .map(([stat, short]) => `${short}:${stats[stat as StatName]}`)
      .join(' ');
    ctx.sendLine(`Stats: ${statLine}`);
    return;
  }

  // Stats only mode
  if (args === 'stats' || args === 'stat' || args === 's') {
    ctx.sendLine('\n{bold}{cyan}=== Character Stats ==={/}');
    ctx.sendLine('');

    const statNames: StatName[] = ['strength', 'intelligence', 'wisdom', 'charisma', 'dexterity', 'constitution', 'luck'];

    for (const stat of statNames) {
      const value = stats[stat];
      const base = baseStats[stat];
      const equipBonus = player.getStatBonus(stat);
      const modifier = value - base;

      const shortName = STAT_SHORT_NAMES[stat];
      const fullName = stat.charAt(0).toUpperCase() + stat.slice(1);

      let line = `  {cyan}${shortName}{/} {dim}${fullName.padEnd(12)}{/} ${String(base).padStart(2)}`;

      // Show equipment bonus if any
      if (equipBonus !== 0) {
        const bonusStr = equipBonus > 0 ? `{green}+${equipBonus}{/}` : `{red}${equipBonus}{/}`;
        line += ` (${bonusStr})`;
      }

      ctx.sendLine(line);
    }

    ctx.sendLine('');
    ctx.sendLine('{dim}Bonuses come from equipment and buffs{/}');
    return;
  }

  // Full character sheet
  ctx.sendLine('');
  ctx.sendLine('{bold}{cyan}╔══════════════════════════════════════════╗{/}');
  ctx.sendLine('              {bold}CHARACTER SHEET{/}');
  ctx.sendLine('{bold}{cyan}╚══════════════════════════════════════════╝{/}');
  ctx.sendLine('');

  // Identity
  const displayName = player.title ? `${player.name} ${player.title}` : player.name;
  ctx.sendLine(`  {bold}Name:{/}   ${displayName}`);
  ctx.sendLine(`  {bold}Gender:{/} ${player.gender.charAt(0).toUpperCase() + player.gender.slice(1)}`);
  ctx.sendLine(`  {bold}Level:{/}  ${player.level}`);

  const playerClass = player.getProperty('class') as string | undefined;
  if (playerClass) {
    ctx.sendLine(`  {bold}Class:{/}  ${playerClass.charAt(0).toUpperCase() + playerClass.slice(1)}`);
  }

  const permLevel = player.permissionLevel ?? 0;
  if (permLevel > 0) {
    ctx.sendLine(`  {bold}Role:{/}   ${getPermissionName(permLevel)}`);
  }

  ctx.sendLine('');

  // Experience
  ctx.sendLine('{bold}{yellow}── Experience ──{/}');
  const xpBar = getXpBar(player.experience, player.xpForNextLevel);
  ctx.sendLine(`  {bold}XP:{/} ${xpBar} ${player.experience}/${player.xpForNextLevel}`);
  ctx.sendLine(`  {dim}${player.xpToNextLevel} XP to next level{/}`);
  ctx.sendLine('');

  // Health & Mana
  ctx.sendLine('{bold}{yellow}── Vitals ──{/}');
  const healthBar = getHealthBar(player.health, player.maxHealth);
  const manaBar = getManaBar(player.mana, player.maxMana);
  ctx.sendLine(`  {bold}HP:{/} ${healthBar} ${player.health}/${player.maxHealth}`);
  ctx.sendLine(`  {bold}MP:{/} ${manaBar} ${player.mana}/${player.maxMana}`);
  ctx.sendLine('');

  // Stats
  ctx.sendLine('{bold}{yellow}── Stats ──{/}');

  const leftStats: StatName[] = ['strength', 'dexterity', 'constitution'];
  const rightStats: StatName[] = ['intelligence', 'wisdom', 'charisma'];

  for (let i = 0; i < 3; i++) {
    const left = leftStats[i];
    const right = rightStats[i];

    const leftVal = stats[left];
    const rightVal = stats[right];
    const leftBonus = player.getStatBonus(left);
    const rightBonus = player.getStatBonus(right);

    const leftStr = formatStat(STAT_SHORT_NAMES[left], leftVal, leftBonus);
    const rightStr = formatStat(STAT_SHORT_NAMES[right], rightVal, rightBonus);

    ctx.sendLine(`${leftStr}     ${rightStr}`);
  }

  // Luck on its own line
  const luckVal = stats.luck;
  const luckBonus = player.getStatBonus('luck');
  ctx.sendLine(formatStat(STAT_SHORT_NAMES.luck, luckVal, luckBonus));

  ctx.sendLine('');

  // Play time
  ctx.sendLine('{bold}{yellow}── Activity ──{/}');
  ctx.sendLine(`  {bold}Play Time:{/} ${formatPlayTime(player.playTime)}`);
  ctx.sendLine(`  {bold}Status:{/}    ${player.alive ? '{green}Alive{/}' : '{red}Dead{/}'}`);

  ctx.sendLine('');
}

export default { name, description, usage, execute };
