/**
 * colors - Customize colors for chat messages.
 *
 * Usage:
 *   colors                     - Show current color settings
 *   colors <type> <color>      - Set color for a message type
 *   colors reset               - Reset all colors to defaults
 *
 * Types:
 *   say      - Room chat messages
 *   tell     - Private tell messages
 *   remote   - Remote emote messages
 *
 * Available colors:
 *   red, green, yellow, blue, magenta, cyan, white, gray/grey
 *   bold versions: boldred, boldgreen, etc.
 *
 * Examples:
 *   colors say cyan
 *   colors tell boldmagenta
 *   colors remote yellow
 */

import type { MudObject } from '../../lib/std.js';
import {
  getPlayerColor,
  formatWithColor,
  DEFAULT_CHAT_COLORS,
} from '../../lib/chat-colors.js';

// Re-export for use by other commands
export { getPlayerColor, formatWithColor };
export const DEFAULT_COLORS = DEFAULT_CHAT_COLORS;

interface CommandContext {
  player: MudObject & {
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['colors', 'colour', 'colours', 'chatcolors'];
export const description = 'Customize colors for chat messages';
export const usage = 'colors [type] [color]';

// Valid color names
const VALID_COLORS = [
  'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'grey',
  'boldred', 'boldgreen', 'boldyellow', 'boldblue', 'boldmagenta', 'boldcyan', 'boldwhite',
  'dim', 'bold',
];

// Color display samples
const COLOR_SAMPLES: Record<string, string> = {
  red: '{red}Sample text{/}',
  green: '{green}Sample text{/}',
  yellow: '{yellow}Sample text{/}',
  blue: '{blue}Sample text{/}',
  magenta: '{magenta}Sample text{/}',
  cyan: '{cyan}Sample text{/}',
  white: '{white}Sample text{/}',
  gray: '{dim}Sample text{/}',
  grey: '{dim}Sample text{/}',
  boldred: '{bold}{red}Sample text{/}',
  boldgreen: '{bold}{green}Sample text{/}',
  boldyellow: '{bold}{yellow}Sample text{/}',
  boldblue: '{bold}{blue}Sample text{/}',
  boldmagenta: '{bold}{magenta}Sample text{/}',
  boldcyan: '{bold}{cyan}Sample text{/}',
  boldwhite: '{bold}{white}Sample text{/}',
  dim: '{dim}Sample text{/}',
  bold: '{bold}Sample text{/}',
};

function displayCurrentColors(ctx: CommandContext): void {
  const colors = ctx.player.getProperty('chatColors') as Record<string, string> | undefined || {};

  ctx.sendLine('{cyan}╔═══════════════════════════════════════════╗{/}');
  ctx.sendLine('{cyan}║{/}         {bold}Chat Color Settings{/}              {cyan}║{/}');
  ctx.sendLine('{cyan}╠═══════════════════════════════════════════╣{/}');

  for (const [type, defaultColor] of Object.entries(DEFAULT_COLORS)) {
    const currentColor = colors[type] || defaultColor;
    const sample = formatWithColor(currentColor, `${type} message`);
    const colorName = currentColor.padEnd(12);
    ctx.sendLine(`{cyan}║{/}  {bold}${type.padEnd(8)}{/} ${colorName} ${sample.padEnd(20)} {cyan}║{/}`);
  }

  ctx.sendLine('{cyan}╟───────────────────────────────────────────╢{/}');
  ctx.sendLine('{cyan}║{/} {dim}Use "colors <type> <color>" to change{/}     {cyan}║{/}');
  ctx.sendLine('{cyan}║{/} {dim}Use "colors list" to see available colors{/} {cyan}║{/}');
  ctx.sendLine('{cyan}╚═══════════════════════════════════════════╝{/}');
}

function displayAvailableColors(ctx: CommandContext): void {
  ctx.sendLine('{cyan}Available colors:{/}');
  ctx.sendLine('');

  ctx.sendLine('{bold}Basic colors:{/}');
  const basicColors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray'];
  for (const color of basicColors) {
    ctx.sendLine(`  ${color.padEnd(12)} ${COLOR_SAMPLES[color]}`);
  }

  ctx.sendLine('');
  ctx.sendLine('{bold}Bold colors:{/}');
  const boldColors = ['boldred', 'boldgreen', 'boldyellow', 'boldblue', 'boldmagenta', 'boldcyan', 'boldwhite'];
  for (const color of boldColors) {
    ctx.sendLine(`  ${color.padEnd(12)} ${COLOR_SAMPLES[color]}`);
  }
}

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim().toLowerCase();

  // No args - show current settings
  if (!args) {
    displayCurrentColors(ctx);
    return;
  }

  // List available colors
  if (args === 'list') {
    displayAvailableColors(ctx);
    return;
  }

  // Reset to defaults
  if (args === 'reset') {
    ctx.player.setProperty('chatColors', {});
    ctx.sendLine('{green}Chat colors reset to defaults.{/}');
    displayCurrentColors(ctx);
    return;
  }

  // Parse type and color
  const parts = args.split(/\s+/);
  if (parts.length < 2) {
    ctx.sendLine('{yellow}Usage: colors <type> <color>{/}');
    ctx.sendLine('{dim}Types: say, tell, remote{/}');
    ctx.sendLine('{dim}Use "colors list" to see available colors.{/}');
    return;
  }

  const type = parts[0]!;
  const color = parts[1]!;

  // Validate type
  if (!DEFAULT_COLORS[type]) {
    ctx.sendLine(`{yellow}Unknown message type: ${type}{/}`);
    ctx.sendLine('{dim}Valid types: say, tell, remote{/}');
    return;
  }

  // Validate color
  if (!VALID_COLORS.includes(color)) {
    ctx.sendLine(`{yellow}Unknown color: ${color}{/}`);
    ctx.sendLine('{dim}Use "colors list" to see available colors.{/}');
    return;
  }

  // Save the color
  const colors = ctx.player.getProperty('chatColors') as Record<string, string> | undefined || {};
  colors[type] = color;
  ctx.player.setProperty('chatColors', colors);

  const sample = formatWithColor(color, `Sample ${type} message`);
  ctx.sendLine(`{green}${type} color set to ${color}:{/} ${sample}`);
}

export default { name, description, usage, execute, getPlayerColor, formatWithColor, DEFAULT_COLORS };
