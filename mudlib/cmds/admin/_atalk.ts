/**
 * Atalk command - Admin channel communication.
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

export const name = ['atalk', 'at'];
export const description = 'Send a message on the admin channel';
export const usage = 'atalk <message>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { args } = ctx;
  const player = ctx.player as ChannelPlayer;
  const daemon = getChannelDaemon();

  if (!args) {
    ctx.sendLine('Say what on the admin channel?');
    return;
  }

  daemon.send(player, 'admin', args);
}

export default { name, description, usage, execute };
