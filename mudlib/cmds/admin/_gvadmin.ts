/**
 * gvadmin - Administer Grapevine chat connection.
 *
 * Usage:
 *   gvadmin status       - Show Grapevine connection status
 *   gvadmin channels     - List subscribed channels
 *   gvadmin subscribe <channel>   - Subscribe to a channel
 *   gvadmin unsubscribe <channel> - Unsubscribe from a channel
 *
 * Examples:
 *   gvadmin status
 *   gvadmin subscribe testing
 *   gvadmin channels
 */

import type { MudObject } from '../../lib/std.js';
import { getGrapevineDaemon } from '../../daemons/grapevine.js';
import { getChannelDaemon } from '../../daemons/channels.js';

interface CommandContext {
  player: MudObject & {
    name: string;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['gvadmin', 'grapevineadmin'];
export const description = 'Administer Grapevine chat connection';
export const usage = 'gvadmin <status|channels|subscribe|unsubscribe> [args]';

export async function execute(ctx: CommandContext): Promise<void> {
  const parts = ctx.args.trim().split(/\s+/);
  const subcommand = parts[0]?.toLowerCase();
  const args = parts.slice(1).join(' ');

  if (!subcommand) {
    showHelp(ctx);
    return;
  }

  const grapevine = getGrapevineDaemon();

  switch (subcommand) {
    case 'status':
      showStatus(ctx, grapevine);
      break;
    case 'channels':
      showChannels(ctx, grapevine);
      break;
    case 'subscribe':
    case 'sub':
      await subscribeChannel(ctx, grapevine, args);
      break;
    case 'unsubscribe':
    case 'unsub':
      await unsubscribeChannel(ctx, grapevine, args);
      break;
    default:
      ctx.sendLine(`{red}Unknown subcommand: ${subcommand}{/}`);
      showHelp(ctx);
  }
}

function showHelp(ctx: CommandContext): void {
  ctx.sendLine('{bold}Grapevine Admin Commands:{/}');
  ctx.sendLine('  gvadmin status                - Show connection status');
  ctx.sendLine('  gvadmin channels              - List subscribed channels');
  ctx.sendLine('  gvadmin subscribe <channel>   - Subscribe to a channel');
  ctx.sendLine('  gvadmin unsubscribe <channel> - Unsubscribe from a channel');
}

function showStatus(
  ctx: CommandContext,
  grapevine: ReturnType<typeof getGrapevineDaemon>
): void {
  ctx.sendLine('{bold}Grapevine Status{/}');
  ctx.sendLine('{dim}' + '-'.repeat(40) + '{/}');

  const state = grapevine.connectionState;
  const stateColor =
    state === 'connected' ? 'green' : state === 'disconnected' ? 'red' : 'yellow';
  ctx.sendLine(`State:      {${stateColor}}${state}{/}`);

  const channels = grapevine.getSubscribedChannels();
  ctx.sendLine(`Channels:   ${channels.length} subscribed`);

  if (channels.length > 0) {
    ctx.sendLine(`            ${channels.join(', ')}`);
  }

  ctx.sendLine('{dim}' + '-'.repeat(40) + '{/}');
}

function showChannels(
  ctx: CommandContext,
  grapevine: ReturnType<typeof getGrapevineDaemon>
): void {
  const subscribed = grapevine.getSubscribedChannels();

  ctx.sendLine('{bold}Grapevine Channels{/}');
  ctx.sendLine('{dim}' + '-'.repeat(50) + '{/}');

  ctx.sendLine('{bold}Subscribed:{/}');
  if (subscribed.length === 0) {
    ctx.sendLine('  {dim}None{/}');
  } else {
    for (const ch of subscribed) {
      ctx.sendLine(`  {green}*{/} ${ch}`);
    }
  }

  ctx.sendLine('');
  ctx.sendLine('{bold}Standard Grapevine Channels:{/}');
  ctx.sendLine('  {dim}-{/} gossip (general chat)');
  ctx.sendLine('  {dim}-{/} testing (for testing)');
  ctx.sendLine('  {dim}-{/} moo (general purpose)');
  ctx.sendLine('');
  ctx.sendLine('{dim}Custom channels (3-15 chars) can be created dynamically.{/}');

  ctx.sendLine('{dim}' + '-'.repeat(50) + '{/}');
}

async function subscribeChannel(
  ctx: CommandContext,
  grapevine: ReturnType<typeof getGrapevineDaemon>,
  channelName: string
): Promise<void> {
  if (!channelName) {
    ctx.sendLine('{yellow}Usage: gvadmin subscribe <channel>{/}');
    return;
  }

  if (!grapevine.isConnected) {
    ctx.sendLine('{red}Grapevine is not connected.{/}');
    return;
  }

  const lowerName = channelName.toLowerCase();

  if (grapevine.isSubscribed(lowerName)) {
    ctx.sendLine(`{yellow}Already subscribed to ${lowerName}{/}`);
    return;
  }

  ctx.sendLine(`{yellow}Subscribing to ${lowerName}...{/}`);

  const success = await grapevine.subscribeChannel(lowerName);
  if (success) {
    ctx.sendLine(`{green}Subscribed to ${lowerName}{/}`);

    // Register in channel daemon
    const channelDaemon = getChannelDaemon();
    channelDaemon.registerGrapevineChannel(lowerName);
  } else {
    ctx.sendLine(`{red}Failed to subscribe to ${lowerName}{/}`);
  }
}

async function unsubscribeChannel(
  ctx: CommandContext,
  grapevine: ReturnType<typeof getGrapevineDaemon>,
  channelName: string
): Promise<void> {
  if (!channelName) {
    ctx.sendLine('{yellow}Usage: gvadmin unsubscribe <channel>{/}');
    return;
  }

  if (!grapevine.isConnected) {
    ctx.sendLine('{red}Grapevine is not connected.{/}');
    return;
  }

  const lowerName = channelName.toLowerCase();

  if (!grapevine.isSubscribed(lowerName)) {
    ctx.sendLine(`{yellow}Not subscribed to ${lowerName}{/}`);
    return;
  }

  ctx.sendLine(`{yellow}Unsubscribing from ${lowerName}...{/}`);

  const success = await grapevine.unsubscribeChannel(lowerName);
  if (success) {
    ctx.sendLine(`{green}Unsubscribed from ${lowerName}{/}`);

    // Unregister from channel daemon
    const channelDaemon = getChannelDaemon();
    channelDaemon.unregisterGrapevineChannel(lowerName);
  } else {
    ctx.sendLine(`{red}Failed to unsubscribe from ${lowerName}{/}`);
  }
}
