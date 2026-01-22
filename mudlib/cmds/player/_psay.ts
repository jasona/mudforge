/**
 * Psay command - Quick party chat shortcut.
 *
 * Usage: psay <message>
 *
 * This is a shortcut for "party say <message>".
 */

import type { MudObject } from '../../lib/std.js';
import { getPartyDaemon } from '../../daemons/party.js';
import type { Living } from '../../std/living.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface PartyPlayer extends Living {
  name: string;
  receive(message: string): void;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
}

export const name = 'psay';
export const description = 'Send a message to your party';
export const usage = 'psay <message>';

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const partyDaemon = getPartyDaemon();
  const partyPlayer = player as PartyPlayer;

  if (!args.trim()) {
    ctx.sendLine('Say what? Usage: psay <message>');
    return;
  }

  const result = partyDaemon.partySay(partyPlayer, args);
  if (!result.success) {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
  // Note: Success message is sent by partySay to all party members
}

export default { name, description, usage, execute };
