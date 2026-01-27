/**
 * Afflict command - Apply body part/sense blocking effects for testing.
 *
 * Usage:
 *   afflict <target> <effect> [duration] [arm]
 *
 * Effects:
 *   blind    - Cannot see (blocks look, targeting)
 *   deaf     - Cannot hear (blocks say/tell/channel messages)
 *   arm      - Arm disabled (blocks wield/unwield/attack)
 *   legs     - Legs disabled (blocks movement, fleeing)
 *
 * Examples:
 *   afflict bob blind 10      - Blind Bob for 10 seconds
 *   afflict bob arm 20 left   - Disable Bob's left arm for 20 seconds
 *   afflict bob arm 30 both   - Disable both of Bob's arms for 30 seconds
 *   afflict bob legs 30       - Disable Bob's legs for 30 seconds
 *   afflict bob deaf 15       - Deafen Bob for 15 seconds
 */

import type { MudObject } from '../../lib/std.js';
import type { Living } from '../../std/living.js';
import { Effects } from '../../std/combat/effects.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'afflict';
export const description = 'Apply body part/sense blocking effects for testing (admin only)';
export const usage = 'afflict <target> <effect> [duration] [arm]';

const DEFAULT_DURATION = 10; // seconds

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim();

  if (!args) {
    showUsage(ctx);
    return;
  }

  const parts = args.split(/\s+/);
  if (parts.length < 2) {
    showUsage(ctx);
    return;
  }

  const targetName = parts[0].toLowerCase();
  const effectType = parts[1].toLowerCase();
  const durationSec = parts[2] ? parseInt(parts[2], 10) : DEFAULT_DURATION;
  const armSide = parts[3]?.toLowerCase() as 'left' | 'right' | 'both' | undefined;

  if (isNaN(durationSec) || durationSec <= 0) {
    ctx.sendLine('{red}Invalid duration. Must be a positive number of seconds.{/}');
    return;
  }

  // Find target (online player or NPC in room)
  const target = findTarget(ctx.player, targetName);
  if (!target) {
    ctx.sendLine(`{red}Cannot find "${targetName}".{/}`);
    return;
  }

  const living = target as Living;
  const durationMs = durationSec * 1000;

  // Apply the effect
  switch (effectType) {
    case 'blind':
      living.addEffect(Effects.blind(durationMs));
      ctx.sendLine(`{green}Applied blindness to ${living.name} for ${durationSec} seconds.{/}`);
      living.receive(`{red}You have been blinded!{/}\n`);
      break;

    case 'deaf':
      living.addEffect(Effects.deaf(durationMs));
      ctx.sendLine(`{green}Applied deafness to ${living.name} for ${durationSec} seconds.{/}`);
      living.receive(`{red}You have been deafened!{/}\n`);
      break;

    case 'mute':
      living.addEffect(Effects.mute(durationMs));
      ctx.sendLine(`{green}Applied mute to ${living.name} for ${durationSec} seconds.{/}`);
      living.receive(`{red}You have been muted!{/}\n`);
      break;

    case 'arm':
    case 'arms': {
      const arm = armSide || 'both';
      if (arm !== 'left' && arm !== 'right' && arm !== 'both') {
        ctx.sendLine('{red}Invalid arm. Use: left, right, or both{/}');
        return;
      }
      living.addEffect(Effects.armDisabled(durationMs, arm));
      const armDesc = arm === 'both' ? 'both arms' : `${arm} arm`;
      ctx.sendLine(`{green}Disabled ${living.name}'s ${armDesc} for ${durationSec} seconds.{/}`);
      living.receive(`{red}Your ${armDesc} ${arm === 'both' ? 'have' : 'has'} been disabled!{/}\n`);
      break;
    }

    case 'leg':
    case 'legs':
      living.addEffect(Effects.legDisabled(durationMs));
      ctx.sendLine(`{green}Disabled ${living.name}'s legs for ${durationSec} seconds.{/}`);
      living.receive(`{red}Your legs have been disabled!{/}\n`);
      break;

    default:
      ctx.sendLine(`{red}Unknown effect type: ${effectType}{/}`);
      ctx.sendLine('Valid effects: blind, deaf, arm, legs');
      return;
  }
}

function showUsage(ctx: CommandContext): void {
  ctx.sendLine('{yellow}Usage: afflict <target> <effect> [duration] [arm]{/}');
  ctx.sendLine('');
  ctx.sendLine('Effects:');
  ctx.sendLine('  {cyan}blind{/}  - Cannot see (blocks look, targeting)');
  ctx.sendLine('  {cyan}deaf{/}   - Cannot hear (blocks say/tell/channel messages)');
  ctx.sendLine('  {cyan}mute{/}   - Cannot speak (blocks say/tell/channels/spells)');
  ctx.sendLine('  {cyan}arm{/}    - Arm disabled (blocks wield/unwield/attack)');
  ctx.sendLine('  {cyan}legs{/}   - Legs disabled (blocks movement, fleeing)');
  ctx.sendLine('');
  ctx.sendLine('Duration is in seconds (default: 10)');
  ctx.sendLine('For arm, specify: left, right, or both (default: both)');
  ctx.sendLine('');
  ctx.sendLine('Examples:');
  ctx.sendLine('  afflict bob blind 10');
  ctx.sendLine('  afflict bob mute 15');
  ctx.sendLine('  afflict bob arm 20 left');
  ctx.sendLine('  afflict bob legs 30');
}

function findTarget(player: MudObject, name: string): MudObject | undefined {
  // First check online players
  if (typeof efuns !== 'undefined' && efuns.allPlayers) {
    const players = efuns.allPlayers() as Array<MudObject & { name: string }>;
    for (const p of players) {
      if (p.name.toLowerCase() === name || p.name.toLowerCase().startsWith(name)) {
        return p;
      }
    }
  }

  // Then check NPCs in the same room
  const room = player.environment;
  if (room) {
    for (const obj of room.inventory) {
      if (obj !== player && obj.id && obj.id(name)) {
        return obj;
      }
    }
  }

  return undefined;
}

export default { name, description, usage, execute };
