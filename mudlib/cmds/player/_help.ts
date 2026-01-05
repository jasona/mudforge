/**
 * Help command - Access the in-game help system.
 *
 * Usage:
 *   help              - Show help index
 *   help <topic>      - View help on a specific topic
 *   help <category>   - List topics in a category
 *   help search <term> - Search for help topics
 *   help commands     - List available commands
 */

import type { MudObject } from '../../std/object.js';
import { getHelpDaemon, CATEGORY_INFO, type HelpCategory } from '../../daemons/help.js';

interface HelpPlayer extends MudObject {
  name: string;
  receive(message: string): void;
  getProperty(key: string): unknown;
  permissionLevel?: number;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['help', 'commands', '?'];
export const description = 'Access the in-game help system';
export const usage = 'help [topic|category|search <term>]';

export function execute(ctx: CommandContext): void {
  const { args } = ctx;
  const helpDaemon = getHelpDaemon();
  const player = ctx.player as HelpPlayer;
  const parts = args.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase() || '';

  // No arguments - show index
  if (!command) {
    ctx.send('\n' + helpDaemon.formatIndex(player));
    return;
  }

  // Search command
  if (command === 'search') {
    const query = parts.slice(1).join(' ');
    if (!query) {
      ctx.sendLine('\n{red}Usage: help search <term>{/}');
      return;
    }

    const results = helpDaemon.searchTopics(player, query);
    ctx.send('\n' + helpDaemon.formatSearchResults(results, query));
    return;
  }

  // Check if it's a category name
  const categoryNames = Object.keys(CATEGORY_INFO) as HelpCategory[];
  const matchedCategory = categoryNames.find(cat => {
    const info = CATEGORY_INFO[cat];
    return cat === command || info.name.toLowerCase() === command;
  });

  if (matchedCategory) {
    ctx.send('\n' + helpDaemon.formatCategory(player, matchedCategory));
    return;
  }

  // Try to find a topic
  const topicName = parts.join(' ');
  const topic = helpDaemon.getTopic(topicName);

  if (topic) {
    // Check access
    if (!helpDaemon.canAccess(player, topic)) {
      ctx.sendLine('\n{red}You do not have access to that help topic.{/}');
      return;
    }

    ctx.send('\n' + helpDaemon.formatTopic(topic));
    return;
  }

  // No match found - suggest search
  ctx.sendLine(`\n{yellow}No help found for "${topicName}".{/}`);
  ctx.sendLine(`Try {cyan}help search ${topicName}{/} to search for related topics.`);

  // Show suggestions if we got close matches
  const suggestions = helpDaemon.searchTopics(player, command);
  if (suggestions.length > 0 && suggestions.length <= 5) {
    ctx.sendLine('\n{dim}Did you mean:{/}');
    for (const s of suggestions) {
      ctx.sendLine(`  {yellow}${s.name}{/} - ${s.title}`);
    }
  }
}

export default { name, description, usage, execute };
