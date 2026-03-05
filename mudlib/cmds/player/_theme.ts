/**
 * theme - Open client color theme customization modal.
 */

import type { MudObject } from '../../lib/std.js';
import { openThemeModal } from '../../lib/theme-modal.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['theme'];
export const description = 'Customize your client color theme';
export const usage = 'theme';

export async function execute(ctx: CommandContext): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    ctx.sendLine('{red}GUI is not available.{/}');
    return;
  }

  const isAdmin = typeof efuns.isAdmin === 'function' ? efuns.isAdmin() : false;
  await openThemeModal(ctx.player, isAdmin, (message: string) => ctx.sendLine(message));
}

export default { name, description, usage, execute };
