/**
 * Channels command - List and manage communication channels.
 */

import type { MudObject } from '../../lib/std.js';
import { getChannelDaemon } from '../../daemons/channels.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface ChannelPlayer extends MudObject {
  name: string;
  receive(message: string): void;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
  permissionLevel?: number;
}

export const name = ['channels', 'channel', 'chan'];
export const description = 'List and manage communication channels';
export const usage = 'channels [<channel> on|off] | channels history <channel>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { args } = ctx;
  const player = ctx.player as ChannelPlayer;
  const daemon = getChannelDaemon();

  if (!args) {
    // List all channels
    ctx.send(daemon.listChannels(player));
    return;
  }

  const parts = args.split(/\s+/);
  const channelName = parts[0].toLowerCase();

  // Check for history command
  if (channelName === 'history' && parts[1]) {
    const historyChannel = parts[1].toLowerCase();
    const channel = daemon.getChannel(historyChannel);

    if (!channel) {
      ctx.sendLine(`No such channel: ${historyChannel}`);
      return;
    }

    if (!daemon.canAccess(player, historyChannel)) {
      ctx.sendLine(`You don't have access to the ${channel.displayName} channel.`);
      return;
    }

    const history = daemon.getHistory(historyChannel, 10);
    if (history.length === 0) {
      ctx.sendLine(`No recent messages on ${channel.displayName}.`);
      return;
    }

    ctx.sendLine(`Recent messages on ${channel.displayName}:`);
    ctx.sendLine('-'.repeat(50));
    for (const msg of history) {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      ctx.sendLine(`[${time}] ${msg.sender}: ${msg.message}`);
    }
    return;
  }

  // Check if it's a toggle command
  const action = parts[1]?.toLowerCase();

  if (action === 'on') {
    const channel = daemon.getChannel(channelName);
    if (!channel) {
      ctx.sendLine(`No such channel: ${channelName}`);
      return;
    }

    if (!daemon.canAccess(player, channelName)) {
      ctx.sendLine(`You don't have access to the ${channel.displayName} channel.`);
      return;
    }

    if (daemon.turnOn(player, channelName)) {
      ctx.sendLine(`${channel.displayName} channel is now ON.`);
    } else {
      ctx.sendLine(`Could not turn on ${channel.displayName} channel.`);
    }
    return;
  }

  if (action === 'off') {
    const channel = daemon.getChannel(channelName);
    if (!channel) {
      ctx.sendLine(`No such channel: ${channelName}`);
      return;
    }

    if (daemon.turnOff(player, channelName)) {
      ctx.sendLine(`${channel.displayName} channel is now OFF.`);
    } else {
      ctx.sendLine(`Could not turn off ${channel.displayName} channel.`);
    }
    return;
  }

  // Otherwise, treat it as sending a message to the channel
  const channel = daemon.getChannel(channelName);
  if (!channel) {
    ctx.sendLine(`No such channel: ${channelName}`);
    ctx.sendLine('Use "channels" to see available channels.');
    return;
  }

  const message = parts.slice(1).join(' ');
  if (!message) {
    ctx.sendLine(`Usage: ${channelName} <message>`);
    return;
  }

  daemon.send(player, channelName, message);
}

export default { name, description, usage, execute };
