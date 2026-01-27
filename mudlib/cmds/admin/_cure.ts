/**
 * Cure command - Remove body part/sense blocking effects.
 *
 * Usage:
 *   cure <target> <effect>    - Remove specific effect
 *   cure <target> all         - Remove all blocking effects
 *
 * Effects:
 *   blind  - Remove blindness
 *   deaf   - Remove deafness
 *   arm    - Remove arm disabled
 *   legs   - Remove leg disabled
 *   all    - Remove all of the above
 *
 * Examples:
 *   cure bob blind    - Remove blindness from Bob
 *   cure bob all      - Remove all blocking effects from Bob
 */

import type { MudObject } from '../../lib/std.js';
import type { Living } from '../../std/living.js';
import type { Effect, EffectType } from '../../std/combat/types.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'cure';
export const description = 'Remove body part/sense blocking effects (admin only)';
export const usage = 'cure <target> <effect|all>';

// Effect types to cure
const BLOCK_EFFECT_TYPES: EffectType[] = ['blind', 'deaf', 'mute', 'arm_disabled', 'leg_disabled'];

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

  // Find target (online player or NPC in room)
  const target = findTarget(ctx.player, targetName);
  if (!target) {
    ctx.sendLine(`{red}Cannot find "${targetName}".{/}`);
    return;
  }

  const living = target as Living;

  // Determine which effects to remove
  let effectsToRemove: EffectType[] = [];

  switch (effectType) {
    case 'blind':
      effectsToRemove = ['blind'];
      break;
    case 'deaf':
      effectsToRemove = ['deaf'];
      break;
    case 'mute':
      effectsToRemove = ['mute'];
      break;
    case 'arm':
    case 'arms':
      effectsToRemove = ['arm_disabled'];
      break;
    case 'leg':
    case 'legs':
      effectsToRemove = ['leg_disabled'];
      break;
    case 'all':
      effectsToRemove = [...BLOCK_EFFECT_TYPES];
      break;
    default:
      ctx.sendLine(`{red}Unknown effect type: ${effectType}{/}`);
      ctx.sendLine('Valid effects: blind, deaf, mute, arm, legs, all');
      return;
  }

  // Get current effects
  const effects = living.getEffects ? living.getEffects() : [];
  let removed = 0;

  // Remove matching effects
  for (const effect of effects) {
    if (effectsToRemove.includes(effect.type as EffectType)) {
      if (living.removeEffect) {
        living.removeEffect(effect.id);
        removed++;
      }
    }
  }

  if (removed > 0) {
    const effectDesc = effectType === 'all' ? 'all blocking effects' : effectType;
    ctx.sendLine(`{green}Removed ${effectDesc} from ${living.name} (${removed} effect${removed > 1 ? 's' : ''}).{/}`);
    living.receive(`{green}You feel better as ${effectDesc === 'all blocking effects' ? 'your afflictions fade' : `your ${effectDesc} fades`}.{/}\n`);
  } else {
    ctx.sendLine(`{yellow}${living.name} does not have that effect.{/}`);
  }
}

function showUsage(ctx: CommandContext): void {
  ctx.sendLine('{yellow}Usage: cure <target> <effect|all>{/}');
  ctx.sendLine('');
  ctx.sendLine('Effects:');
  ctx.sendLine('  {cyan}blind{/}  - Remove blindness');
  ctx.sendLine('  {cyan}deaf{/}   - Remove deafness');
  ctx.sendLine('  {cyan}mute{/}   - Remove mute');
  ctx.sendLine('  {cyan}arm{/}    - Remove arm disabled');
  ctx.sendLine('  {cyan}legs{/}   - Remove leg disabled');
  ctx.sendLine('  {cyan}all{/}    - Remove all blocking effects');
  ctx.sendLine('');
  ctx.sendLine('Examples:');
  ctx.sendLine('  cure bob blind');
  ctx.sendLine('  cure bob mute');
  ctx.sendLine('  cure bob all');
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
