/**
 * i3admin - Administer Intermud 3 connection.
 *
 * Usage:
 *   i3admin status       - Show I3 connection status
 *   i3admin channels     - List subscribed I3 channels
 *   i3admin subscribe <channel>   - Subscribe to a channel
 *   i3admin unsubscribe <channel> - Unsubscribe from a channel
 *   i3admin refresh      - Request fresh mudlist from router
 *
 * Examples:
 *   i3admin status
 *   i3admin subscribe intermud
 *   i3admin refresh
 */

import type { MudObject } from '../../lib/std.js';
import { getIntermudDaemon } from '../../daemons/intermud.js';
import { getChannelDaemon } from '../../daemons/channels.js';

interface CommandContext {
  player: MudObject & {
    name: string;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['i3admin'];
export const description = 'Administer Intermud 3 connection';
export const usage = 'i3admin <status|channels|subscribe|unsubscribe|refresh> [args]';

export async function execute(ctx: CommandContext): Promise<void> {
  const parts = ctx.args.trim().split(/\s+/);
  const subcommand = parts[0]?.toLowerCase();
  const args = parts.slice(1).join(' ');

  if (!subcommand) {
    showHelp(ctx);
    return;
  }

  const intermud = getIntermudDaemon();

  switch (subcommand) {
    case 'status':
      showStatus(ctx, intermud);
      break;
    case 'channels':
      showChannels(ctx, intermud);
      break;
    case 'subscribe':
    case 'sub':
      subscribeChannel(ctx, intermud, args);
      break;
    case 'unsubscribe':
    case 'unsub':
      unsubscribeChannel(ctx, intermud, args);
      break;
    case 'refresh':
      refreshMudlist(ctx, intermud);
      break;
    default:
      ctx.sendLine(`{red}Unknown subcommand: ${subcommand}{/}`);
      showHelp(ctx);
  }
}

function showHelp(ctx: CommandContext): void {
  ctx.sendLine('{bold}I3 Admin Commands:{/}');
  ctx.sendLine('  i3admin status                - Show connection status');
  ctx.sendLine('  i3admin channels              - List subscribed channels');
  ctx.sendLine('  i3admin subscribe <channel>   - Subscribe to a channel');
  ctx.sendLine('  i3admin unsubscribe <channel> - Unsubscribe from a channel');
  ctx.sendLine('  i3admin refresh               - Request fresh mudlist from router');
}

function showStatus(
  ctx: CommandContext,
  intermud: ReturnType<typeof getIntermudDaemon>
): void {
  ctx.sendLine('{bold}Intermud 3 Status{/}');
  ctx.sendLine('{dim}' + '-'.repeat(40) + '{/}');

  const state = intermud.connectionState;
  const stateColor = state === 'connected' ? 'green' : state === 'disconnected' ? 'red' : 'yellow';
  ctx.sendLine(`State:      {${stateColor}}${state}{/}`);
  ctx.sendLine(`Router:     ${intermud.routerName || 'None'}`);

  const mudList = intermud.getMudList();
  const onlineMuds = intermud.getOnlineMuds();
  ctx.sendLine(`MUDs:       ${onlineMuds.length} online / ${mudList.length} total`);

  const channels = intermud.getSubscribedChannels();
  ctx.sendLine(`Channels:   ${channels.length} subscribed`);

  ctx.sendLine(`MudListId:  ${intermud.mudListId}`);
  ctx.sendLine(`ChanListId: ${intermud.chanListId}`);

  ctx.sendLine('{dim}' + '-'.repeat(40) + '{/}');
}

function showChannels(
  ctx: CommandContext,
  intermud: ReturnType<typeof getIntermudDaemon>
): void {
  const subscribed = intermud.getSubscribedChannels();
  const available = intermud.getChannelList();

  ctx.sendLine('{bold}I3 Channels{/}');
  ctx.sendLine('{dim}' + '-'.repeat(50) + '{/}');

  if (available.length === 0) {
    ctx.sendLine('{yellow}No channels available (not connected?){/}');
    return;
  }

  ctx.sendLine('{bold}Subscribed:{/}');
  if (subscribed.length === 0) {
    ctx.sendLine('  {dim}None{/}');
  } else {
    for (const ch of subscribed) {
      ctx.sendLine(`  {green}*{/} ${ch}`);
    }
  }

  ctx.sendLine('');
  ctx.sendLine('{bold}Available:{/}');
  const notSubscribed = available.filter((ch) => !subscribed.includes(ch.name));
  if (notSubscribed.length === 0) {
    ctx.sendLine('  {dim}All channels subscribed{/}');
  } else {
    for (const ch of notSubscribed.slice(0, 20)) {
      ctx.sendLine(`  {dim}-{/} ${ch.name} (hosted by ${ch.host})`);
    }
    if (notSubscribed.length > 20) {
      ctx.sendLine(`  {dim}... and ${notSubscribed.length - 20} more{/}`);
    }
  }

  ctx.sendLine('{dim}' + '-'.repeat(50) + '{/}');
}

function subscribeChannel(
  ctx: CommandContext,
  intermud: ReturnType<typeof getIntermudDaemon>,
  channelName: string
): void {
  if (!channelName) {
    ctx.sendLine('{yellow}Usage: i3admin subscribe <channel>{/}');
    return;
  }

  if (!intermud.isConnected) {
    ctx.sendLine('{red}I3 is not connected.{/}');
    return;
  }

  const lowerName = channelName.toLowerCase();

  if (intermud.isSubscribed(lowerName)) {
    ctx.sendLine(`{yellow}Already subscribed to ${lowerName}{/}`);
    return;
  }

  if (intermud.subscribeChannel(lowerName)) {
    ctx.sendLine(`{green}Subscribed to ${lowerName}{/}`);

    // Register in channel daemon
    const channelDaemon = getChannelDaemon();
    const channelInfo = intermud.getChannelList().find((c) => c.name === lowerName);
    if (channelInfo) {
      channelDaemon.registerI3Channel(lowerName, channelInfo.host);
    }
  } else {
    ctx.sendLine(`{red}Failed to subscribe to ${lowerName}{/}`);
  }
}

function unsubscribeChannel(
  ctx: CommandContext,
  intermud: ReturnType<typeof getIntermudDaemon>,
  channelName: string
): void {
  if (!channelName) {
    ctx.sendLine('{yellow}Usage: i3admin unsubscribe <channel>{/}');
    return;
  }

  if (!intermud.isConnected) {
    ctx.sendLine('{red}I3 is not connected.{/}');
    return;
  }

  const lowerName = channelName.toLowerCase();

  if (!intermud.isSubscribed(lowerName)) {
    ctx.sendLine(`{yellow}Not subscribed to ${lowerName}{/}`);
    return;
  }

  if (intermud.unsubscribeChannel(lowerName)) {
    ctx.sendLine(`{green}Unsubscribed from ${lowerName}{/}`);

    // Unregister from channel daemon
    const channelDaemon = getChannelDaemon();
    channelDaemon.unregisterI3Channel(lowerName);
  } else {
    ctx.sendLine(`{red}Failed to unsubscribe from ${lowerName}{/}`);
  }
}

function refreshMudlist(
  ctx: CommandContext,
  intermud: ReturnType<typeof getIntermudDaemon>
): void {
  if (!intermud.isConnected) {
    ctx.sendLine('{red}I3 is not connected.{/}');
    return;
  }

  const oldCount = intermud.getOnlineMuds().length;
  ctx.sendLine(`{yellow}Requesting fresh mudlist from router...{/}`);
  ctx.sendLine(`{dim}(Previous count: ${oldCount} online MUDs){/}`);

  if (intermud.refreshMudlist()) {
    ctx.sendLine('{green}Request sent. The mudlist will be updated shortly.{/}');
    ctx.sendLine('{dim}Use "i3admin status" to check the new count.{/}');
  } else {
    ctx.sendLine('{red}Failed to send refresh request.{/}');
  }
}
