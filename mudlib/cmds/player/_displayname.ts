/**
 * Display Name command - Set a custom display name with colors and formatting.
 *
 * Players can create fun, colorful display names that other players see
 * when looking at a room. The actual player name (used for login, tells, etc.)
 * remains unchanged.
 *
 * Use $N as a placeholder for your actual name.
 * Use color codes like {red}, {blue}, {green}, {bold}, etc.
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
  savePlayer(): Promise<void>;
}

interface PlayerWithDisplayName extends MudObject {
  name: string;
  displayName: string | null;
  getDisplayName(): string;
}

export const name = ['displayname', 'dname'];
export const description = 'Set a custom display name with colors';
export const usage = 'displayname <template> | displayname clear | displayname';

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithDisplayName;
  const args = ctx.args.trim();

  // No args - show current display name
  if (!args) {
    if (player.displayName) {
      ctx.sendLine('Your current display name template:');
      ctx.sendLine(`  ${player.displayName}`);
      ctx.sendLine('');
      ctx.sendLine('Which displays as:');
      ctx.sendLine(`  ${player.getDisplayName()}`);
    } else {
      ctx.sendLine(`You have no custom display name set. Others see you as: ${player.name}`);
    }
    ctx.sendLine('');
    ctx.sendLine('Usage: displayname <template>');
    ctx.sendLine('       displayname clear');
    ctx.sendLine('');
    ctx.sendLine('Use $N as a placeholder for your name.');
    ctx.sendLine('Use color codes like {red}, {blue}, {green}, {bold}, {/} (reset).');
    ctx.sendLine('');
    ctx.sendLine('Example: displayname Sir {blue}$N{/} says {green}NI{/}!');
    return;
  }

  // Clear display name
  if (args.toLowerCase() === 'clear') {
    player.displayName = null;
    await ctx.savePlayer();
    ctx.sendLine('Display name cleared. Others will now see you as: ' + player.name);
    return;
  }

  // Validate the template
  if (args.length > 100) {
    ctx.sendLine('Display name is too long (max 100 characters).');
    return;
  }

  // Check if it contains the player's name or $N
  const hasNamePlaceholder = /\$N/i.test(args);
  const containsActualName = args.toLowerCase().includes(player.name.toLowerCase());

  if (!hasNamePlaceholder && !containsActualName) {
    ctx.sendLine('Your display name must include either $N or your actual name.');
    ctx.sendLine('This helps other players identify you.');
    return;
  }

  // Set the display name
  player.displayName = args;
  await ctx.savePlayer();

  ctx.sendLine('Display name set!');
  ctx.sendLine('');
  ctx.sendLine('Template: ' + args);
  ctx.sendLine('Displays as: ' + player.getDisplayName());
}

export default { name, description, usage, execute };
