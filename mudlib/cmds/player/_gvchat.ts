/**
 * Grapevine chat commands - gossip, testing, moo channels.
 */

import type { MudObject } from '../../lib/std.js';
import { getChannelDaemon } from '../../daemons/channels.js';

interface CommandContext {
  player: MudObject;
  args: string;
  verb: string; // The actual command used (gossip, testing, moo)
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

export const name = ['gossip', 'gos', 'testing', 'test', 'moo'];
export const description = 'Send a message on Grapevine channels';
export const usage = 'gossip <message> | testing <message> | moo <message>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { args, verb } = ctx;
  const player = ctx.player as ChannelPlayer;
  const daemon = getChannelDaemon();

  // Map command aliases to channel names
  const channelMap: Record<string, string> = {
    gossip: 'gossip',
    gos: 'gossip',
    testing: 'testing',
    test: 'testing',
    moo: 'moo',
  };

  const channelName = channelMap[verb.toLowerCase()] || verb.toLowerCase();

  if (!args) {
    ctx.sendLine(`${channelName.charAt(0).toUpperCase() + channelName.slice(1)} what?`);
    return;
  }

  const channel = daemon.getChannel(channelName);
  if (!channel) {
    ctx.sendLine(`The ${channelName} channel is not available.`);
    ctx.sendLine('Make sure Grapevine is connected (gvadmin status).');
    return;
  }

  daemon.send(player, channelName, args);
}

export default { name, description, usage, execute };
