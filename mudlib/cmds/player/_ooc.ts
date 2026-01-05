/**
 * OOC command - Out-of-character chat.
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

export const name = 'ooc';
export const description = 'Send an out-of-character message';
export const usage = 'ooc <message>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { args } = ctx;
  const player = ctx.player as ChannelPlayer;
  const daemon = getChannelDaemon();

  if (!args) {
    ctx.sendLine('OOC what?');
    return;
  }

  daemon.send(player, 'ooc', args);
}

export default { name, description, usage, execute };
