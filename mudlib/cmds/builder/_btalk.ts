/**
 * Btalk command - Builder channel communication.
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

export const name = ['btalk', 'bt'];
export const description = 'Send a message on the builder channel';
export const usage = 'btalk <message>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { args } = ctx;
  const player = ctx.player as ChannelPlayer;
  const daemon = getChannelDaemon();

  if (!args) {
    ctx.sendLine('Say what on the builder channel?');
    return;
  }

  daemon.send(player, 'builder', args);
}

export default { name, description, usage, execute };
