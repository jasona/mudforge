/**
 * Prompt command - Set your command prompt.
 *
 * Allows customizing the prompt with tokens that expand to dynamic values.
 */

import type { MudObject } from '../../lib/std.js';

interface Player extends MudObject {
  getConfig<T = unknown>(key: string): T;
  setConfig(key: string, value: unknown): { success: boolean; error?: string };
  permissionLevel: number;
}

interface CommandContext {
  player: Player;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['prompt'];
export const description = 'Set your command prompt';
export const usage = `prompt              - Show current prompt and available tokens
prompt <string>     - Set a new prompt
prompt reset        - Reset to default prompt

Available tokens:
  %h - current health       %H - max health
  %m - current mana         %M - max mana
  %l - current location     %n - your name
  %d - working directory (builders only)
  %% - literal %

Color codes can also be used: {red}, {green}, {bold}, etc.

Examples:
  prompt [%h/%H] >      - Shows "[50/100] > "
  prompt {cyan}%l{/} >  - Shows location in cyan
  prompt %d >           - Shows cwd for builders`;

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const trimmed = args.trim();

  // No args - show current prompt and help
  if (!trimmed) {
    const current = player.getConfig<string>('prompt');
    ctx.sendLine('{bold}Current prompt:{/}');
    ctx.sendLine(`  Template: {yellow}"${current}"{/}`);
    ctx.sendLine('');
    ctx.sendLine('{bold}Available tokens:{/}');
    ctx.sendLine('  %h - current health       %H - max health');
    ctx.sendLine('  %m - current mana         %M - max mana');
    ctx.sendLine('  %l - current location     %n - your name');
    if (player.permissionLevel >= 1) {
      ctx.sendLine('  %d - working directory    %% - literal %');
    } else {
      ctx.sendLine('  %% - literal %');
    }
    ctx.sendLine('');
    ctx.sendLine('{dim}Use "prompt <string>" to set, "prompt reset" to restore default.{/}');
    return;
  }

  // Reset command
  if (trimmed.toLowerCase() === 'reset') {
    player.setConfig('prompt', '> ');
    ctx.sendLine('{green}Prompt reset to default.{/}');
    return;
  }

  // Set new prompt
  const result = player.setConfig('prompt', trimmed);
  if (result.success) {
    ctx.sendLine(`{green}Prompt set to:{/} {yellow}"${trimmed}"{/}`);
  } else {
    ctx.sendLine(`{red}${result.error}{/}`);
  }
}

export default { name, description, usage, execute };
