/**
 * Describe command - Write a long-form character description.
 *
 * Usage:
 *   describe              - Open IDE to edit character description
 *   describe view         - View your current description
 *   describe clear        - Clear your description
 */

import type { MudObject } from '../../lib/std.js';

interface PlayerWithIde extends MudObject {
  cwd: string;
  name: string;
  setInputHandler(handler: ((input: string) => void | Promise<void>) | null): void;
  receive(message: string): void;
  connection?: { send: (msg: string) => void };
  _connection?: { send: (msg: string) => void };
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
  deleteProperty(key: string): void;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['describe', 'desc'];
export const description = 'Write a long-form character description';
export const usage = 'describe [view|clear]';

/**
 * Template for new character descriptions.
 */
const DESCRIPTION_TEMPLATE = `# Character Description

Write a detailed description of your character's appearance here.

This description will be shown to other players when they look at you.

## Tips
- Describe physical features: height, build, hair, eyes, etc.
- Include notable characteristics: scars, tattoos, mannerisms
- Mention clothing and equipment style
- Keep it immersive and in-character

---

*Delete this template and write your description below:*

`;

/**
 * Handle IDE input for description editing.
 */
async function handleDescriptionIdeInput(
  player: PlayerWithIde,
  input: string
): Promise<void> {
  // Check if this is an IDE message
  if (!input.startsWith('\x00[IDE]')) {
    const cmd = input.trim().toLowerCase();
    if (cmd === 'close' || cmd === 'cancel' || cmd === 'q' || cmd === 'quit') {
      player.setInputHandler(null);
      player.receive('{cyan}Description editor closed.{/}\n');
      return;
    }
    player.receive('{dim}(Description editor is open in browser. Type "close" to exit.){/}\n');
    return;
  }

  // Parse IDE message
  const jsonStr = input.slice(6);
  let message: { action: string; path?: string; content?: string };

  try {
    message = JSON.parse(jsonStr);
  } catch {
    player.receive('{red}Invalid IDE message{/}\n');
    return;
  }

  if (message.action === 'save') {
    await handleDescriptionSave(player, message.content || '');
  } else if (message.action === 'close') {
    player.setInputHandler(null);
    player.receive('{cyan}Description editor closed.{/}\n');
  }
}

/**
 * Handle save action for description editing.
 */
async function handleDescriptionSave(
  player: PlayerWithIde,
  content: string
): Promise<void> {
  const connection = player.connection || player._connection;
  const trimmedContent = content.trim();

  // Don't save empty or template-only content
  if (!trimmedContent || trimmedContent === DESCRIPTION_TEMPLATE.trim()) {
    if (connection?.send) {
      const resultMsg = JSON.stringify({
        action: 'save-result',
        path: `player-description:${player.name}`,
        success: false,
        message: 'Please write a description before saving',
      });
      connection.send(`\x00[IDE]${resultMsg}\n`);
    }
    player.receive('{yellow}Please write a description before saving.{/}\n');
    return;
  }

  // Save the description
  player.setProperty('characterDescription', trimmedContent);

  // Invalidate portrait cache when description changes
  if (player.getProperty('profilePortrait')) {
    player.deleteProperty('profilePortrait');
    player.deleteProperty('profilePortraitGeneratedAt');
    player.receive('{dim}Your portrait has been cleared since your description changed.{/}\n');
  }

  if (connection?.send) {
    const resultMsg = JSON.stringify({
      action: 'save-result',
      path: `player-description:${player.name}`,
      success: true,
      message: 'Character description saved',
    });
    connection.send(`\x00[IDE]${resultMsg}\n`);
  }

  player.receive('{green}Character description saved successfully.{/}\n');
}

/**
 * Show usage information.
 */
function showUsage(ctx: CommandContext): void {
  ctx.sendLine('Usage: describe [subcommand]');
  ctx.sendLine('');
  ctx.sendLine('Subcommands:');
  ctx.sendLine('  (none)    - Open IDE to edit your character description');
  ctx.sendLine('  view      - View your current description');
  ctx.sendLine('  clear     - Clear your description');
  ctx.sendLine('');
  ctx.sendLine('Your character description is shown when other players look at you.');
}

/**
 * Open IDE to edit description.
 */
function cmdEdit(ctx: CommandContext): void {
  const player = ctx.player as PlayerWithIde;
  const currentDescription = player.getProperty('characterDescription');
  const content = typeof currentDescription === 'string' && currentDescription.trim()
    ? currentDescription
    : DESCRIPTION_TEMPLATE;

  ctx.sendLine('{cyan}Opening description editor...{/}');
  ctx.sendLine('{dim}Edit your character description and save. Press Escape or type "close" to cancel.{/}');

  // Open IDE with markdown
  efuns.ideOpen({
    action: 'open',
    path: `player-description:${player.name}`,
    content: content,
    readOnly: false,
    language: 'markdown',
  });

  // Set up input handler
  player.setInputHandler(async (input: string) => {
    await handleDescriptionIdeInput(player, input);
  });
}

/**
 * View current description.
 */
function cmdView(ctx: CommandContext): void {
  const player = ctx.player as PlayerWithIde;
  const description = player.getProperty('characterDescription');

  if (!description || typeof description !== 'string' || !description.trim()) {
    ctx.sendLine('{dim}You have not written a character description yet.{/}');
    ctx.sendLine('{dim}Use "describe" to open the editor.{/}');
    return;
  }

  ctx.sendLine('{cyan}=== Your Character Description ==={/}');
  ctx.sendLine('');
  ctx.sendLine(description);
}

/**
 * Clear description.
 */
function cmdClear(ctx: CommandContext): void {
  const player = ctx.player as PlayerWithIde;
  const description = player.getProperty('characterDescription');

  if (!description) {
    ctx.sendLine('{dim}You have no character description to clear.{/}');
    return;
  }

  player.deleteProperty('characterDescription');

  // Also clear portrait if set
  if (player.getProperty('profilePortrait')) {
    player.deleteProperty('profilePortrait');
    player.deleteProperty('profilePortraitGeneratedAt');
    ctx.sendLine('{green}Character description and portrait cleared.{/}');
  } else {
    ctx.sendLine('{green}Character description cleared.{/}');
  }
}

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim().toLowerCase();

  switch (args) {
    case '':
      cmdEdit(ctx);
      break;

    case 'view':
      cmdView(ctx);
      break;

    case 'clear':
      cmdClear(ctx);
      break;

    case 'help':
      showUsage(ctx);
      break;

    default:
      ctx.sendLine(`{red}Unknown subcommand: ${args}{/}`);
      showUsage(ctx);
      break;
  }
}

export default { name, description, usage, execute };
