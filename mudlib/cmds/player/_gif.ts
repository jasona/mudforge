/**
 * gif - Re-open a previously shared GIF modal.
 *
 * Usage:
 *   gif <id>  - Open the GIF modal for a cached GIF
 *
 * This command is primarily used by clicking [View GIF] links in the comm panel.
 */

import type { MudObject } from '../../lib/std.js';
import { openGiphyModal } from '../../lib/giphy-modal.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'gif';
export const description = 'Re-open a previously shared GIF';
export const usage = 'gif <id>';

export function execute(ctx: CommandContext): void {
  const gifId = ctx.args.trim();

  if (!gifId) {
    ctx.sendLine('{yellow}Usage: gif <id>{/}');
    return;
  }

  // Check if Giphy is available
  if (!efuns.giphyAvailable()) {
    ctx.sendLine('{red}GIF sharing is currently disabled.{/}');
    return;
  }

  // Look up the cached GIF
  const gifData = efuns.giphyGetCachedGif(gifId);

  if (!gifData) {
    ctx.sendLine('{yellow}That GIF is no longer available.{/}');
    return;
  }

  // Get auto-close time from config
  const autoCloseSeconds = efuns.getMudConfig<number>('giphy.autoCloseSeconds') ?? 5;
  const autoCloseMs = autoCloseSeconds * 1000;

  // Open the modal for this player
  openGiphyModal(ctx.player, {
    gifUrl: gifData.url,
    senderName: gifData.senderName,
    channelName: gifData.channelName,
    searchQuery: gifData.query,
    autoCloseMs,
  });
}

export default { name, description, usage, execute };
