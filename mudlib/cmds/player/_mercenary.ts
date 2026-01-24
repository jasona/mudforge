/**
 * Mercenary command - Manage hired mercenaries.
 *
 * Usage:
 *   merc              - List your current mercenaries
 *   merc list         - List your current mercenaries
 *   merc dismiss <n>  - Dismiss a mercenary by name or type
 *   merc follow       - Toggle follow mode for all mercenaries
 *   merc stay         - Make mercenaries stay in place
 *   merc attack <t>   - Order mercenaries to attack a target
 *   merc name <m> <n> - Give a mercenary a custom name
 */

import type { MudObject } from '../../lib/std.js';
import { getMercenaryDaemon } from '../../daemons/mercenary.js';
import { getCombatDaemon } from '../../daemons/combat.js';

interface CommandContext {
  player: MudObject;
  verb: string;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Player extends MudObject {
  name: string;
  level: number;
  receive(message: string): void;
}

interface Living extends MudObject {
  name?: string;
  level?: number;
  health?: number;
  maxHealth?: number;
}

export const name = ['mercenary', 'merc', 'mercs'];
export const description = 'Manage your hired mercenaries';
export const usage = `mercenary [list|dismiss|follow|stay|attack|name] [args]

Commands:
  merc              - Show your current mercenaries
  merc list         - Show your current mercenaries
  merc dismiss <n>  - Dismiss a mercenary by name or type
  merc follow       - Make all mercenaries follow you
  merc stay         - Make all mercenaries stay in place
  merc attack <t>   - Order mercenaries to attack target
  merc name <m> <n> - Name a mercenary (e.g., merc name fighter Grok)`;

export async function execute(ctx: CommandContext): Promise<boolean> {
  const { player, args } = ctx;
  const playerLiving = player as Player;
  const mercDaemon = getMercenaryDaemon();

  // Parse subcommand
  const parts = args.trim().split(/\s+/);
  const subcommand = parts[0]?.toLowerCase() || 'list';
  const subargs = parts.slice(1).join(' ');

  switch (subcommand) {
    case 'list':
    case '':
      return listMercenaries(ctx, playerLiving, mercDaemon);

    case 'dismiss':
    case 'fire':
    case 'release':
      return dismissMercenary(ctx, playerLiving, mercDaemon, subargs);

    case 'follow':
      return setFollowMode(ctx, playerLiving, mercDaemon, true);

    case 'stay':
    case 'stop':
    case 'wait':
      return setFollowMode(ctx, playerLiving, mercDaemon, false);

    case 'attack':
    case 'kill':
    case 'target':
      return orderAttack(ctx, playerLiving, subargs);

    case 'name':
    case 'rename':
      return nameMercenary(ctx, playerLiving, mercDaemon, subargs);

    default:
      ctx.sendLine(`Unknown mercenary command: ${subcommand}`);
      ctx.sendLine(`Use 'merc help' for usage information.`);
      return true;
  }
}

/**
 * List all mercenaries the player has hired.
 */
function listMercenaries(
  ctx: CommandContext,
  player: Player,
  mercDaemon: ReturnType<typeof getMercenaryDaemon>
): boolean {
  const mercs = mercDaemon.getPlayerMercenaries(player.name);
  const maxMercs = mercDaemon.getMaxMercenaries(player.level);

  if (mercs.length === 0) {
    ctx.sendLine(`{yellow}You have no mercenaries.{/}`);
    ctx.sendLine(`{dim}Visit a mercenary broker to hire companions.{/}`);
    return true;
  }

  ctx.sendLine(`{bold}{yellow}Your Mercenaries ({/}${mercs.length}/${maxMercs}{bold}{yellow}):{/}\n`);

  for (const merc of mercs) {
    const behavior = merc.getBehaviorConfig();
    const roleColor = getRoleColor(behavior?.role || 'generic');
    const healthPct = merc.healthPercent;
    const healthBar = makeHealthBar(healthPct);

    const name = merc.mercName
      ? `{bold}${merc.mercName}{/} (${merc.mercType})`
      : `{bold}${capitalizeFirst(merc.mercType)}{/}`;

    ctx.sendLine(`  ${name} - Level ${merc.level}`);
    ctx.sendLine(`    Role: ${roleColor}${behavior?.role || 'generic'}{/}`);
    ctx.sendLine(`    HP: ${healthBar} (${merc.health}/${merc.maxHealth})`);
    ctx.sendLine(`    Following: ${merc.following ? '{green}Yes{/}' : '{red}No{/}'}`);
    ctx.sendLine('');
  }

  return true;
}

/**
 * Dismiss a mercenary.
 */
function dismissMercenary(
  ctx: CommandContext,
  player: Player,
  mercDaemon: ReturnType<typeof getMercenaryDaemon>,
  mercName: string
): boolean {
  if (!mercName) {
    ctx.sendLine(`{red}Dismiss which mercenary?{/}`);
    ctx.sendLine(`Usage: merc dismiss <name or type>`);
    return true;
  }

  const merc = mercDaemon.getMercenaryByName(player.name, mercName);
  if (!merc) {
    ctx.sendLine(`{red}You don't have a mercenary called '${mercName}'.{/}`);
    return true;
  }

  const displayName = merc.getDisplayName();
  mercDaemon.dismissMercenary(merc);

  ctx.sendLine(`{yellow}You dismiss ${displayName}.{/}`);
  ctx.sendLine(`{dim}They gather their gear and depart.{/}`);

  // Notify room
  const room = player.environment;
  if (room && 'broadcast' in room) {
    (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
      .broadcast(`{dim}${displayName} nods to ${player.name} and leaves.{/}`, { exclude: [player] });
  }

  return true;
}

/**
 * Set follow mode for all mercenaries.
 */
function setFollowMode(
  ctx: CommandContext,
  player: Player,
  mercDaemon: ReturnType<typeof getMercenaryDaemon>,
  follow: boolean
): boolean {
  const mercs = mercDaemon.getPlayerMercenaries(player.name);

  if (mercs.length === 0) {
    ctx.sendLine(`{yellow}You have no mercenaries.{/}`);
    return true;
  }

  for (const merc of mercs) {
    merc.following = follow;
  }

  if (follow) {
    ctx.sendLine(`{green}Your mercenaries will now follow you.{/}`);
  } else {
    ctx.sendLine(`{yellow}Your mercenaries will stay here.{/}`);
  }

  return true;
}

/**
 * Order mercenaries to attack a target.
 */
async function orderAttack(
  ctx: CommandContext,
  player: Player,
  targetName: string
): Promise<boolean> {
  if (!targetName) {
    ctx.sendLine(`{red}Attack what?{/}`);
    ctx.sendLine(`Usage: merc attack <target>`);
    return true;
  }

  // Find target in room
  const room = player.environment;
  if (!room) {
    ctx.sendLine(`{red}There's nothing to attack here.{/}`);
    return true;
  }

  let target: Living | undefined;
  for (const obj of room.inventory) {
    if (obj.id(targetName)) {
      // Check it's a valid combat target (Living)
      if ('health' in obj && typeof (obj as Living).health === 'number') {
        target = obj as Living;
        break;
      }
    }
  }

  if (!target) {
    ctx.sendLine(`{red}You don't see '${targetName}' here.{/}`);
    return true;
  }

  // Can't attack self
  if (target === player) {
    ctx.sendLine(`{red}You can't order your mercenaries to attack you.{/}`);
    return true;
  }

  // Get mercenaries
  const mercDaemon = getMercenaryDaemon();
  const mercs = mercDaemon.getPlayerMercenaries(player.name);

  if (mercs.length === 0) {
    ctx.sendLine(`{yellow}You have no mercenaries.{/}`);
    return true;
  }

  // Order each mercenary to attack
  const combatDaemon = getCombatDaemon();
  let attackCount = 0;

  for (const merc of mercs) {
    // Skip mercenaries not in the same room
    if (merc.environment !== room) {
      continue;
    }

    // Start combat
    combatDaemon.startCombat(merc, target as MudObject & Living);
    attackCount++;
  }

  if (attackCount > 0) {
    const targetName = target.name || target.shortDesc || 'the target';
    ctx.sendLine(`{red}You order your mercenaries to attack ${targetName}!{/}`);

    // Broadcast to room
    if ('broadcast' in room) {
      (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`{red}${player.name} orders their mercenaries to attack!{/}`, { exclude: [player] });
    }
  } else {
    ctx.sendLine(`{yellow}None of your mercenaries are here to attack.{/}`);
  }

  return true;
}

/**
 * Give a mercenary a custom name.
 */
function nameMercenary(
  ctx: CommandContext,
  player: Player,
  mercDaemon: ReturnType<typeof getMercenaryDaemon>,
  nameArgs: string
): boolean {
  const parts = nameArgs.trim().split(/\s+/);

  if (parts.length < 2) {
    ctx.sendLine(`{red}Usage: merc name <mercenary> <new name>{/}`);
    ctx.sendLine(`Example: merc name fighter Grok`);
    return true;
  }

  const mercIdentifier = parts[0];
  const newName = parts.slice(1).join(' ');

  // Validate name
  if (newName.length > 20) {
    ctx.sendLine(`{red}Name is too long (max 20 characters).{/}`);
    return true;
  }

  if (!/^[a-zA-Z][a-zA-Z0-9' -]*$/.test(newName)) {
    ctx.sendLine(`{red}Name must start with a letter and contain only letters, numbers, spaces, hyphens, or apostrophes.{/}`);
    return true;
  }

  const merc = mercDaemon.getMercenaryByName(player.name, mercIdentifier);
  if (!merc) {
    ctx.sendLine(`{red}You don't have a mercenary called '${mercIdentifier}'.{/}`);
    return true;
  }

  const oldName = merc.getDisplayName();
  merc.mercName = newName;

  ctx.sendLine(`{green}You name your ${merc.mercType} '${newName}'.{/}`);
  ctx.sendLine(`{dim}${oldName} is now known as ${merc.getDisplayName()}.{/}`);

  return true;
}

/**
 * Get color for a role.
 */
function getRoleColor(role: string): string {
  switch (role) {
    case 'tank': return '{red}';
    case 'healer': return '{yellow}';
    case 'dps_melee': return '{green}';
    case 'dps_ranged': return '{magenta}';
    default: return '{dim}';
  }
}

/**
 * Create a text health bar.
 */
function makeHealthBar(percent: number): string {
  const width = 10;
  const filled = Math.round(percent / 100 * width);
  const empty = width - filled;

  let color = '{green}';
  if (percent <= 25) color = '{red}';
  else if (percent <= 50) color = '{yellow}';

  return `${color}${'█'.repeat(filled)}{/}{dim}${'░'.repeat(empty)}{/}`;
}

/**
 * Capitalize first letter.
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default { name, description, usage, execute };
