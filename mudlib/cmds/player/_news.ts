/**
 * News command - View game announcements.
 *
 * Usage:
 *   news          - Open announcements list modal
 *   news latest   - Show latest announcement
 */

import type { MudObject } from '../../lib/std.js';
import type { Living } from '../../std/living.js';
import {
  openAnnouncementListModal,
  openLatestAnnouncementModal,
} from '../../lib/announcement-modal.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['news', 'announcements'];
export const description = 'View game announcements';
export const usage = 'news [latest]';

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim().toLowerCase();
  const player = ctx.player as Living;

  if (args === 'latest' || args === 'last') {
    openLatestAnnouncementModal(player);
  } else {
    openAnnouncementListModal(player);
  }
}

export default { name, description, usage, execute };
