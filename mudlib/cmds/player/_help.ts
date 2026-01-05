/**
 * Help command - Display available commands.
 */

import type { MudObject } from '../../std/object.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['help', 'commands', '?'];
export const description = 'Display help and available commands';
export const usage = 'help [command]';

export function execute(ctx: CommandContext): void {
  const { args } = ctx;

  if (!args) {
    ctx.sendLine('=== Available Commands ===');
    ctx.sendLine('');
    ctx.sendLine('Communication:');
    ctx.sendLine('  say <message>    - Speak to others in the room');
    ctx.sendLine("  ' <message>      - Short form of say");
    ctx.sendLine('');
    ctx.sendLine('Looking:');
    ctx.sendLine('  look [target]    - Look at your surroundings or something');
    ctx.sendLine('  l                - Short form of look');
    ctx.sendLine('  inventory        - See what you are carrying');
    ctx.sendLine('  i                - Short form of inventory');
    ctx.sendLine('');
    ctx.sendLine('Movement:');
    ctx.sendLine('  go <direction>   - Move in a direction');
    ctx.sendLine('  north, south, east, west, up, down');
    ctx.sendLine('  n, s, e, w, u, d - Short forms');
    ctx.sendLine('');
    ctx.sendLine('System:');
    ctx.sendLine('  help [command]   - Show this help or help for a command');
    ctx.sendLine('  quit             - Disconnect from the game');
    ctx.sendLine('');
    ctx.sendLine('Type "help <command>" for more info on a specific command.');
  } else {
    // Show help for a specific command
    const cmd = args.toLowerCase();
    switch (cmd) {
      case 'look':
      case 'l':
        ctx.sendLine('LOOK - Examine your surroundings');
        ctx.sendLine('Usage: look [target]');
        ctx.sendLine('');
        ctx.sendLine('Without arguments, shows the room description.');
        ctx.sendLine('With a target, examines that object.');
        break;
      case 'say':
      case "'":
        ctx.sendLine('SAY - Speak to others');
        ctx.sendLine("Usage: say <message> or '<message>");
        ctx.sendLine('');
        ctx.sendLine('Everyone in the same room will hear you.');
        break;
      case 'quit':
      case 'logout':
        ctx.sendLine('QUIT - Disconnect from the game');
        ctx.sendLine('Usage: quit');
        ctx.sendLine('');
        ctx.sendLine('Saves your character and disconnects.');
        break;
      case 'inventory':
      case 'i':
        ctx.sendLine('INVENTORY - See what you are carrying');
        ctx.sendLine('Usage: inventory or i');
        break;
      case 'go':
        ctx.sendLine('GO - Move in a direction');
        ctx.sendLine('Usage: go <direction>');
        ctx.sendLine('');
        ctx.sendLine('Directions: north, south, east, west, up, down');
        ctx.sendLine('Or just type the direction name directly.');
        break;
      default:
        ctx.sendLine(`No help available for "${args}".`);
    }
  }
}

export default { name, description, usage, execute };
