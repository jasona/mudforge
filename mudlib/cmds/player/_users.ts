/**
 * Users command - Quick one-line list of online players.
 *
 * Usage:
 *   users   - Show all visible online players
 */

import type { MudObject } from '../../lib/std.js';
import { canSee } from '../../std/visibility/index.js';
import type { Living } from '../../std/living.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'users';
export const description = 'Show a quick list of online players';
export const usage = 'users';

export function execute(ctx: CommandContext): void {
  let allPlayers: MudObject[] = [];
  if (typeof efuns !== 'undefined' && efuns.allPlayers) {
    allPlayers = efuns.allPlayers();
  }

  // Filter by visibility and collect names
  const viewer = ctx.player as Living;
  const names: string[] = [];

  for (const obj of allPlayers) {
    const target = obj as Living;
    const vis = canSee(viewer, target);
    if (!vis.canSee) continue;

    const name = typeof efuns !== 'undefined'
      ? efuns.capitalize(target.name)
      : target.name;
    names.push(vis.isPartiallyVisible ? `{dim}${name}{/}` : `{green}${name}{/}`);
  }

  // Sort alphabetically (strip color codes for comparison)
  names.sort((a, b) => {
    const stripA = a.replace(/\{[^}]+\}/g, '');
    const stripB = b.replace(/\{[^}]+\}/g, '');
    return stripA.localeCompare(stripB);
  });

  if (names.length === 0) {
    ctx.sendLine('{dim}No players are currently online.{/}');
    return;
  }

  // Build Oxford comma list: "A, B, and C"
  let list: string;
  if (names.length === 1) {
    list = names[0];
  } else if (names.length === 2) {
    list = `${names[0]} {white}and{/} ${names[1]}`;
  } else {
    list = names.slice(0, -1).join('{white},{/} ') + '{white}, and{/} ' + names[names.length - 1];
  }

  const count = names.length;
  ctx.sendLine(`{cyan}(${count} User${count !== 1 ? 's' : ''} Online){/}{white}:{/} ${list}{white}.{/}`);
}

export default { name, description, usage, execute };
