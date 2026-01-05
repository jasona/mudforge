/**
 * Shout command - Broadcast a message to everyone.
 */

import type { MudObject } from '../../std/object.js';
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

export const name = ['shout', 'yell'];
export const description = 'Shout a message to everyone in the game';
export const usage = 'shout <message>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { args } = ctx;
  const player = ctx.player as ChannelPlayer;
  const daemon = getChannelDaemon();

  if (!args) {
    ctx.sendLine('Shout what?');
    return;
  }

  daemon.send(player, 'shout', args);
}

export default { name, description, usage, execute };
