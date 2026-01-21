/**
 * bug - Submit a bug report to GitHub Issues.
 *
 * Usage:
 *   bug <short description>   - Open editor to write a detailed bug report
 *
 * Opens an IDE-style editor where you can provide details about the bug.
 * Once submitted, the bug report is created as a GitHub Issue.
 */

import type { MudObject } from '../../lib/std.js';

interface PlayerWithConnection extends MudObject {
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

export const name = ['bug'];
export const description = 'Submit a bug report to GitHub Issues';
export const usage = 'bug <short description>';

/**
 * Bug report template shown in the IDE editor.
 */
const BUG_TEMPLATE = `## Steps to Reproduce
1.

## Expected Behavior


## Actual Behavior


## Additional Context

`;

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithConnection;

  // Check if GitHub is configured
  if (!efuns.githubAvailable()) {
    ctx.sendLine('{yellow}Bug reporting is not configured. Please contact an administrator.{/}');
    return;
  }

  // Require a short description
  const shortDesc = ctx.args.trim();
  if (!shortDesc) {
    ctx.sendLine(`{yellow}Usage: bug <short description>{/}`);
    ctx.sendLine(`{dim}Example: bug The door in the tavern doesn't open{/}`);
    return;
  }

  // Get player's current location
  const env = ctx.player.environment;
  const location = env?.objectPath || 'Unknown';

  // Get current timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

  ctx.sendLine(`{cyan}Opening bug report editor...{/}`);
  ctx.sendLine(`{dim}Short description: ${shortDesc}{/}`);

  // Open IDE editor with bug template
  efuns.ideOpen({
    action: 'open',
    path: `Bug Report: ${shortDesc}`,
    content: BUG_TEMPLATE,
    readOnly: false,
    language: 'markdown',
    mode: 'bug',
  });

  // Set up input handler for IDE responses
  player.setInputHandler(async (input: string) => {
    await handleBugInput(player, shortDesc, location, timestamp, input);
  });
}

/**
 * Handle IDE input (save messages from client).
 */
async function handleBugInput(
  player: PlayerWithConnection,
  shortDesc: string,
  location: string,
  timestamp: string,
  input: string
): Promise<void> {
  // Check if this is an IDE message
  if (!input.startsWith('\x00[IDE]')) {
    // Regular input - might be "close" or escape
    const cmd = input.trim().toLowerCase();
    if (cmd === 'close' || cmd === 'cancel' || cmd === 'q' || cmd === 'quit') {
      player.setInputHandler(null);
      player.receive('{cyan}Bug report cancelled.{/}\n');
      return;
    }
    // Show reminder that IDE is open
    player.receive('{dim}(Bug report editor is open in browser. Type "close" to cancel.){/}\n');
    return;
  }

  // Parse IDE message
  const jsonStr = input.slice(6); // Remove \x00[IDE] prefix
  let message: { action: string; path?: string; content?: string };

  try {
    message = JSON.parse(jsonStr);
  } catch {
    player.receive('{red}Invalid IDE message{/}\n');
    return;
  }

  if (message.action === 'save') {
    await submitBugReport(player, shortDesc, location, timestamp, message.content || '');
  } else if (message.action === 'close') {
    player.setInputHandler(null);
    player.receive('{cyan}Bug report cancelled.{/}\n');
  }
}

/**
 * Submit the bug report to GitHub.
 */
async function submitBugReport(
  player: PlayerWithConnection,
  shortDesc: string,
  location: string,
  timestamp: string,
  details: string
): Promise<void> {
  // Build the issue body
  const body = `**Reported by:** ${player.name}
**Location:** ${location}
**Time:** ${timestamp}

## Description
${shortDesc}

## Details
${details.trim() || '_No additional details provided._'}

---
*Submitted via in-game bug command*`;

  player.receive('{cyan}Submitting bug report...{/}\n');

  // Submit to GitHub
  const result = await efuns.githubCreateIssue(shortDesc, body, ['bug', 'in-game-report']);

  // Send result to client via connection
  const connection = player.connection || player._connection;

  if (result.success) {
    // Send success result to IDE for auto-close
    if (connection?.send) {
      const resultMsg = JSON.stringify({
        action: 'save-result',
        success: true,
        message: 'Bug report submitted successfully',
      });
      connection.send(`\x00[IDE]${resultMsg}\n`);
    }

    player.receive(`{green}Bug report submitted successfully!{/}\n`);
    if (result.url) {
      player.receive(`{cyan}Issue URL: ${result.url}{/}\n`);
    }
    if (result.issueNumber) {
      player.receive(`{dim}Issue #${result.issueNumber}{/}\n`);
    }

    // Clear input handler
    player.setInputHandler(null);
  } else {
    // Send error result to IDE
    if (connection?.send) {
      const resultMsg = JSON.stringify({
        action: 'save-result',
        success: false,
        message: result.error || 'Failed to submit bug report',
      });
      connection.send(`\x00[IDE]${resultMsg}\n`);
    }

    player.receive(`{red}Failed to submit bug report: ${result.error}{/}\n`);
    player.receive('{dim}You can try again or type "close" to cancel.{/}\n');
  }
}

export default { name, description, usage, execute };
