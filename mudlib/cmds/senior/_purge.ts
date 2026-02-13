/**
 * purge - Permanently remove a player's persisted records.
 *
 * Usage:
 *   purge <player>
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'purge';
export const description = 'Permanently purge a player save and related records';
export const usage = 'purge <player>';

export async function execute(ctx: CommandContext): Promise<void> {
  const rawTarget = ctx.args.trim().toLowerCase();
  if (!rawTarget) {
    ctx.sendLine('{yellow}Usage: purge <player>{/}');
    return;
  }

  if (!/^[a-z]+$/.test(rawTarget)) {
    ctx.sendLine('{red}Invalid player name. Use alphabetic names only.{/}');
    return;
  }

  const actorName = ((ctx.player as MudObject & { name?: string }).name ?? '').toLowerCase();
  if (rawTarget === actorName) {
    ctx.sendLine('{red}You cannot purge your own character while connected.{/}');
    return;
  }

  const result = await efuns.purgePlayerData(rawTarget);
  if (!result.success) {
    ctx.sendLine(`{red}Purge failed: ${result.error ?? 'Unknown error'}{/}`);
    return;
  }

  const details = result.details;
  ctx.sendLine(`{green}Purge completed for ${efuns.capitalize(rawTarget)}.{/}`);

  if (details) {
    ctx.sendLine(`  Save file: ${details.playerSaveDeleted ? '{green}deleted{/}' : '{dim}not found{/}'}`);
    ctx.sendLine(`  Workspace: ${details.workspaceDeleted ? '{green}deleted{/}' : '{dim}not found{/}'}`);
    ctx.sendLine(`  Active session: ${details.activePlayerCleared ? '{green}cleared{/}' : '{dim}not active{/}'}`);
    ctx.sendLine(`  Permissions: ${details.permissionsReset ? '{green}reset{/}' : '{red}failed{/}'}`);
    ctx.sendLine(`  Reconnect tokens: ${details.sessionsInvalidated ? '{green}invalidated{/}' : '{yellow}not cleared{/}'}`);
  }

  if (result.warnings && result.warnings.length > 0) {
    ctx.sendLine('{yellow}Warnings:{/}');
    for (const warning of result.warnings) {
      ctx.sendLine(`  {yellow}-{/} ${warning}`);
    }
  }
}

export default { name, description, usage, execute };

