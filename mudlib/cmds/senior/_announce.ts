/**
 * Announce command - Manage game announcements.
 *
 * Usage:
 *   announce list             - List all announcements
 *   announce show <id>        - Show a specific announcement
 *   announce create <title>   - Create new announcement (opens IDE)
 *   announce edit <id>        - Edit existing announcement (opens IDE)
 *   announce delete <id>      - Delete an announcement
 */

import type { MudObject } from '../../lib/std.js';
import {
  getAnnouncementDaemon,
  type Announcement,
} from '../../daemons/announcement.js';

interface PlayerWithIde extends MudObject {
  cwd: string;
  name: string;
  setInputHandler(handler: ((input: string) => void | Promise<void>) | null): void;
  receive(message: string): void;
  connection?: { send: (msg: string) => void };
  _connection?: { send: (msg: string) => void };
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['announce'];
export const description = 'Manage game announcements';
export const usage = 'announce <list|show|create|edit|delete> [args]';

/**
 * Parse arguments with quoted strings.
 */
function parseArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
      if (current) {
        args.push(current);
        current = '';
      }
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    args.push(current);
  }

  return args;
}

/**
 * Format a timestamp for display.
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Handle IDE input for announcement editing.
 */
async function handleAnnouncementIdeInput(
  player: PlayerWithIde,
  announcementId: string | null,
  title: string,
  input: string
): Promise<void> {
  // Check if this is an IDE message
  if (!input.startsWith('\x00[IDE]')) {
    const cmd = input.trim().toLowerCase();
    if (cmd === 'close' || cmd === 'cancel' || cmd === 'q' || cmd === 'quit') {
      player.setInputHandler(null);
      player.receive('{cyan}Announcement editor closed.{/}\n');
      return;
    }
    player.receive('{dim}(Announcement editor is open in browser. Type "close" to exit.){/}\n');
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
    await handleAnnouncementSave(player, announcementId, title, message.content || '');
  } else if (message.action === 'close') {
    player.setInputHandler(null);
    player.receive('{cyan}Announcement editor closed.{/}\n');
  }
}

/**
 * Handle save action for announcement editing.
 */
async function handleAnnouncementSave(
  player: PlayerWithIde,
  announcementId: string | null,
  title: string,
  content: string
): Promise<void> {
  const daemon = getAnnouncementDaemon();
  const connection = player.connection || player._connection;

  // Validate content
  if (!content.trim()) {
    if (connection?.send) {
      const resultMsg = JSON.stringify({
        action: 'save-result',
        path: 'announcement',
        success: false,
        errors: [{ line: 1, column: 1, message: 'Announcement content cannot be empty.' }],
        message: 'Content cannot be empty',
      });
      connection.send(`\x00[IDE]${resultMsg}\n`);
    }
    player.receive('{red}Announcement content cannot be empty.{/}\n');
    return;
  }

  let resultId: string;

  if (announcementId) {
    // Update existing announcement
    const existing = daemon.getById(announcementId);
    if (!existing) {
      if (connection?.send) {
        const resultMsg = JSON.stringify({
          action: 'save-result',
          path: 'announcement',
          success: false,
          message: 'Announcement not found',
        });
        connection.send(`\x00[IDE]${resultMsg}\n`);
      }
      player.receive(`{red}Announcement not found: ${announcementId}{/}\n`);
      return;
    }

    if (daemon.update(announcementId, title, content)) {
      resultId = announcementId;
    } else {
      if (connection?.send) {
        const resultMsg = JSON.stringify({
          action: 'save-result',
          path: 'announcement',
          success: false,
          message: 'Failed to update announcement',
        });
        connection.send(`\x00[IDE]${resultMsg}\n`);
      }
      player.receive('{red}Failed to update announcement.{/}\n');
      return;
    }
  } else {
    // Create new announcement
    const announcement = daemon.create(title, content, player.name);
    resultId = announcement.id;
  }

  await daemon.save();

  if (connection?.send) {
    const resultMsg = JSON.stringify({
      action: 'save-result',
      path: 'announcement',
      success: true,
      message: 'Announcement saved successfully',
    });
    connection.send(`\x00[IDE]${resultMsg}\n`);
  }

  const action = announcementId ? 'Updated' : 'Created';
  player.receive(`{green}${action} announcement: ${resultId}{/}\n`);
}

/**
 * Show usage information.
 */
function showUsage(ctx: CommandContext): void {
  ctx.sendLine('Usage: announce <subcommand> [args]');
  ctx.sendLine('');
  ctx.sendLine('Subcommands:');
  ctx.sendLine('  list                   - List all announcements');
  ctx.sendLine('  show <id>              - Show a specific announcement');
  ctx.sendLine('  create <title>         - Create new announcement (opens IDE)');
  ctx.sendLine('  edit <id>              - Edit existing announcement (opens IDE)');
  ctx.sendLine('  delete <id>            - Delete an announcement');
  ctx.sendLine('');
  ctx.sendLine('Examples:');
  ctx.sendLine('  announce list');
  ctx.sendLine('  announce create "Welcome Update"');
  ctx.sendLine('  announce edit ann_1706123456789');
  ctx.sendLine('  announce delete ann_1706123456789');
}

/**
 * List all announcements.
 */
function cmdList(ctx: CommandContext): void {
  const daemon = getAnnouncementDaemon();
  const announcements = daemon.getAll();

  ctx.sendLine('{cyan}=== Announcements ==={/}');
  ctx.sendLine('');

  if (announcements.length === 0) {
    ctx.sendLine('{dim}No announcements found.{/}');
    return;
  }

  for (const ann of announcements) {
    const updated = ann.updatedAt ? ' {dim}(edited){/}' : '';
    ctx.sendLine(`  {yellow}${ann.id}{/} - ${ann.title}${updated}`);
    ctx.sendLine(`    {dim}by ${ann.author} on ${formatDate(ann.createdAt)}{/}`);
  }

  ctx.sendLine('');
  ctx.sendLine(`{dim}Total: ${announcements.length} announcement${announcements.length === 1 ? '' : 's'}{/}`);
}

/**
 * Show a specific announcement.
 */
function cmdShow(ctx: CommandContext, args: string[]): void {
  if (!args[0]) {
    ctx.sendLine('{red}Usage: announce show <id>{/}');
    return;
  }

  const daemon = getAnnouncementDaemon();
  const announcement = daemon.getById(args[0]);

  if (!announcement) {
    ctx.sendLine(`{red}Announcement not found: ${args[0]}{/}`);
    return;
  }

  ctx.sendLine('{cyan}=== Announcement ==={/}');
  ctx.sendLine('');
  ctx.sendLine(`{bold}ID:{/} ${announcement.id}`);
  ctx.sendLine(`{bold}Title:{/} ${announcement.title}`);
  ctx.sendLine(`{bold}Author:{/} ${announcement.author}`);
  ctx.sendLine(`{bold}Created:{/} ${formatDate(announcement.createdAt)}`);
  if (announcement.updatedAt) {
    ctx.sendLine(`{bold}Updated:{/} ${formatDate(announcement.updatedAt)}`);
  }
  ctx.sendLine('');
  ctx.sendLine('{bold}Content:{/}');
  const lines = announcement.content.split('\n');
  for (const line of lines) {
    ctx.sendLine(`  ${line}`);
  }
}

/**
 * Create a new announcement using IDE.
 */
async function cmdCreate(ctx: CommandContext, args: string[]): Promise<void> {
  if (!args[0]) {
    ctx.sendLine('{red}Usage: announce create <title>{/}');
    ctx.sendLine('{dim}Opens IDE to enter the announcement content.{/}');
    return;
  }

  const title = args.join(' ');
  const player = ctx.player as PlayerWithIde;

  // Default content template
  const template = `# ${title}

Write your announcement content here using markdown.

## Features
- Use **bold** and *italic* for emphasis
- Create lists and headings
- Keep it concise and informative

---
*Posted by the game team*
`;

  ctx.sendLine(`{cyan}Opening IDE to create announcement: ${title}{/}`);
  ctx.sendLine('{dim}Edit the markdown content and save. Press Escape or type "close" to cancel.{/}');

  // Open IDE with template
  efuns.ideOpen({
    action: 'open',
    path: `announcement:new`,
    content: template,
    readOnly: false,
    language: 'markdown',
  });

  // Set up input handler
  player.setInputHandler(async (input: string) => {
    await handleAnnouncementIdeInput(player, null, title, input);
  });
}

/**
 * Edit an existing announcement using IDE.
 */
async function cmdEdit(ctx: CommandContext, args: string[]): Promise<void> {
  if (!args[0]) {
    ctx.sendLine('{red}Usage: announce edit <id>{/}');
    return;
  }

  const daemon = getAnnouncementDaemon();
  const id = args[0];
  const announcement = daemon.getById(id);

  if (!announcement) {
    ctx.sendLine(`{red}Announcement not found: ${id}{/}`);
    ctx.sendLine('{dim}Use "announce list" to see available announcements.{/}');
    return;
  }

  const player = ctx.player as PlayerWithIde;

  ctx.sendLine(`{cyan}Opening IDE to edit announcement: ${id}{/}`);
  ctx.sendLine('{dim}Edit the markdown content and save. Press Escape or type "close" to cancel.{/}');

  // Open IDE with existing content
  efuns.ideOpen({
    action: 'open',
    path: `announcement:${id}`,
    content: announcement.content,
    readOnly: false,
    language: 'markdown',
  });

  // Set up input handler
  player.setInputHandler(async (input: string) => {
    await handleAnnouncementIdeInput(player, id, announcement.title, input);
  });
}

/**
 * Delete an announcement.
 */
async function cmdDelete(ctx: CommandContext, args: string[]): Promise<void> {
  if (!args[0]) {
    ctx.sendLine('{red}Usage: announce delete <id>{/}');
    return;
  }

  const daemon = getAnnouncementDaemon();
  const id = args[0];

  const announcement = daemon.getById(id);
  if (!announcement) {
    ctx.sendLine(`{red}Announcement not found: ${id}{/}`);
    return;
  }

  if (daemon.delete(id)) {
    await daemon.save();
    ctx.sendLine(`{green}Deleted announcement: ${id} (${announcement.title}){/}`);
  } else {
    ctx.sendLine(`{red}Failed to delete announcement: ${id}{/}`);
  }
}

export async function execute(ctx: CommandContext): Promise<void> {
  const args = parseArgs(ctx.args.trim());
  const subcommand = args[0]?.toLowerCase() || '';
  const subArgs = args.slice(1);

  switch (subcommand) {
    case 'list':
    case 'ls':
      cmdList(ctx);
      break;

    case 'show':
    case 'view':
      cmdShow(ctx, subArgs);
      break;

    case 'create':
    case 'new':
    case 'add':
      await cmdCreate(ctx, subArgs);
      break;

    case 'edit':
    case 'modify':
      await cmdEdit(ctx, subArgs);
      break;

    case 'delete':
    case 'remove':
    case 'rm':
      await cmdDelete(ctx, subArgs);
      break;

    default:
      showUsage(ctx);
      break;
  }
}

export default { name, description, usage, execute };
