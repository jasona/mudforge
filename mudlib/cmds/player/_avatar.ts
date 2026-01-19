/**
 * Avatar command - View or change your avatar portrait.
 *
 * Players can choose from 10 different avatar options:
 * - 4 masculine (m1-m4): varying skin tones
 * - 4 feminine (f1-f4): varying skin tones
 * - 2 androgynous (a1-a2): medium skin tones
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
  savePlayer(): Promise<void>;
}

interface PlayerWithAvatar extends MudObject {
  avatar: string;
}

// Valid avatar IDs
const VALID_AVATARS: Record<string, string> = {
  avatar_m1: 'Masculine - Light',
  avatar_m2: 'Masculine - Medium',
  avatar_m3: 'Masculine - Tan',
  avatar_m4: 'Masculine - Dark',
  avatar_f1: 'Feminine - Light',
  avatar_f2: 'Feminine - Medium',
  avatar_f3: 'Feminine - Tan',
  avatar_f4: 'Feminine - Dark',
  avatar_a1: 'Androgynous - Light',
  avatar_a2: 'Androgynous - Dark',
};

export const name = ['avatar', 'portrait'];
export const description = 'View or change your avatar portrait';
export const usage = 'avatar [list | set <id>]';

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithAvatar;
  const args = ctx.args.trim().toLowerCase();
  const parts = args.split(/\s+/);
  const subcommand = parts[0] || '';

  // No args - show current avatar
  if (!subcommand) {
    const currentDescription = VALID_AVATARS[player.avatar] || 'Unknown';
    ctx.sendLine(`Your current avatar: {cyan}${player.avatar}{/} (${currentDescription})`);
    ctx.sendLine('');
    ctx.sendLine('Use {yellow}avatar list{/} to see all available avatars.');
    ctx.sendLine('Use {yellow}avatar set <id>{/} to change your avatar.');
    return;
  }

  // List all avatars
  if (subcommand === 'list') {
    ctx.sendLine('{bold}Available Avatars:{/}');
    ctx.sendLine('');

    ctx.sendLine('{cyan}Masculine:{/}');
    ctx.sendLine('  avatar_m1 - Light skin');
    ctx.sendLine('  avatar_m2 - Medium skin');
    ctx.sendLine('  avatar_m3 - Tan skin');
    ctx.sendLine('  avatar_m4 - Dark skin');
    ctx.sendLine('');

    ctx.sendLine('{magenta}Feminine:{/}');
    ctx.sendLine('  avatar_f1 - Light skin');
    ctx.sendLine('  avatar_f2 - Medium skin');
    ctx.sendLine('  avatar_f3 - Tan skin');
    ctx.sendLine('  avatar_f4 - Dark skin');
    ctx.sendLine('');

    ctx.sendLine('{green}Androgynous:{/}');
    ctx.sendLine('  avatar_a1 - Light skin');
    ctx.sendLine('  avatar_a2 - Dark skin');
    ctx.sendLine('');

    ctx.sendLine(`Your current avatar: {yellow}${player.avatar}{/}`);
    ctx.sendLine('');
    ctx.sendLine('Use {yellow}avatar set <id>{/} to change your avatar.');
    return;
  }

  // Set avatar
  if (subcommand === 'set') {
    const avatarId = parts[1];

    if (!avatarId) {
      ctx.sendLine('Usage: avatar set <id>');
      ctx.sendLine('Example: avatar set avatar_f2');
      return;
    }

    // Normalize the avatar ID
    let normalizedId = avatarId;
    if (!avatarId.startsWith('avatar_')) {
      normalizedId = 'avatar_' + avatarId;
    }

    if (!VALID_AVATARS[normalizedId]) {
      ctx.sendLine(`{red}Invalid avatar ID: ${avatarId}{/}`);
      ctx.sendLine('Use {yellow}avatar list{/} to see available avatars.');
      return;
    }

    player.avatar = normalizedId;
    await ctx.savePlayer();

    const description = VALID_AVATARS[normalizedId];
    ctx.sendLine(`Avatar changed to {cyan}${normalizedId}{/} (${description})`);
    ctx.sendLine('Your portrait will update in the stats panel.');
    return;
  }

  // Unknown subcommand
  ctx.sendLine('Usage: avatar [list | set <id>]');
  ctx.sendLine('');
  ctx.sendLine('  avatar       - Show your current avatar');
  ctx.sendLine('  avatar list  - List all available avatars');
  ctx.sendLine('  avatar set <id> - Change your avatar');
}

export default { name, description, usage, execute };
