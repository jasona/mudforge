/**
 * nohassle - Toggle NPC combat immunity for builders.
 *
 * Usage:
 *   nohassle           - Show current status
 *   nohassle on        - Enable nohassle (NPCs can't attack you, you can't attack NPCs)
 *   nohassle off       - Disable nohassle (normal NPC combat)
 *
 * When nohassle is enabled:
 *   - NPCs cannot initiate combat with you
 *   - You cannot initiate combat with NPCs
 *   - If enabled while in combat with an NPC, combat ends immediately
 *
 * Nohassle is ON by default for all builder+ accounts.
 * This setting is saved to your character.
 */

import type { MudObject, Living } from '../../lib/std.js';
import { getCombatDaemon } from '../../daemons/combat.js';

interface CommandContext {
  player: MudObject & Living & {
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'nohassle';
export const description = 'Toggle NPC combat immunity';
export const usage = 'nohassle [on|off]';

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim().toLowerCase();

  // Get current setting (default to true/on for builder+)
  const currentSetting = ctx.player.getProperty('nohassle');
  const isEnabled = currentSetting !== false;

  // Show current status
  if (!args) {
    if (isEnabled) {
      ctx.sendLine('{cyan}Nohassle is currently {bold}ON{/}{cyan}.{/}');
      ctx.sendLine('{dim}NPCs cannot attack you, and you cannot attack NPCs.{/}');
    } else {
      ctx.sendLine('{cyan}Nohassle is currently {bold}OFF{/}{cyan}.{/}');
      ctx.sendLine('{dim}Normal NPC combat is enabled.{/}');
    }
    ctx.sendLine('{dim}Use "nohassle on" or "nohassle off" to change.{/}');
    return;
  }

  // Enable nohassle
  if (args === 'on' || args === 'true' || args === '1' || args === 'enable') {
    if (isEnabled) {
      ctx.sendLine('{yellow}Nohassle is already enabled.{/}');
      return;
    }

    ctx.player.setProperty('nohassle', true);
    ctx.sendLine('{green}Nohassle enabled. NPCs will no longer attack you.{/}');

    // If currently in combat, end it
    if (ctx.player.inCombat) {
      const combatDaemon = getCombatDaemon();
      const target = ctx.player.combatTarget;

      // Check if the combat target is an NPC (not a player)
      const targetAsPlayer = target as Living & { permissionLevel?: number };
      const isNPCTarget = typeof targetAsPlayer?.permissionLevel !== 'number';

      if (isNPCTarget) {
        combatDaemon.endAllCombats(ctx.player);
        ctx.sendLine('{yellow}Your combat with NPCs has ended.{/}');
      }
    }
    return;
  }

  // Disable nohassle
  if (args === 'off' || args === 'false' || args === '0' || args === 'disable') {
    if (!isEnabled) {
      ctx.sendLine('{yellow}Nohassle is already disabled.{/}');
      return;
    }

    ctx.player.setProperty('nohassle', false);
    ctx.sendLine('{green}Nohassle disabled. You can now engage in NPC combat.{/}');
    ctx.sendLine('{dim}Be careful - NPCs may attack you!{/}');
    return;
  }

  // Invalid argument
  ctx.sendLine('{yellow}Usage: nohassle [on|off]{/}');
  ctx.sendLine('{dim}Use "nohassle" without arguments to see current status.{/}');
}

export default { name, description, usage, execute };
