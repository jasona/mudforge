/**
 * Discord command - Send messages to the Discord bridge channel.
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

export const name = 'discord';
export const description = 'Send a message to the Discord channel';
export const usage = 'discord <message>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { args } = ctx;
  const player = ctx.player as ChannelPlayer;
  const daemon = getChannelDaemon();

  // Check if Discord channel exists
  const channel = daemon.getChannel('discord');
  if (!channel) {
    ctx.sendLine('{yellow}The Discord channel is not currently available.{/}');
    ctx.sendLine('{dim}An administrator needs to enable Discord integration.{/}');
    return;
  }

  if (!args) {
    ctx.sendLine('Discord what?');
    return;
  }

  daemon.send(player, 'discord', args);
}

export default { name, description, usage, execute };
