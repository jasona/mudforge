/**
 * Giphy Panel - Display GIF in floating panel for channel sharing.
 *
 * Sends a GIPHY message to display a shared GIF in a non-blocking floating panel
 * below the combat panel. Auto-closes after configurable timeout.
 */

import type { MudObject } from '../std/object.js';

/**
 * Options for opening a Giphy panel.
 */
export interface GiphyModalOptions {
  gifUrl: string;
  senderName: string;
  channelName: string;
  searchQuery: string;
  autoCloseMs: number;
}

/**
 * Giphy message sent to client.
 */
interface GiphyMessage {
  type: 'show' | 'hide';
  gifUrl?: string;
  senderName?: string;
  channelName?: string;
  searchQuery?: string;
  autoCloseMs?: number;
}

/**
 * Send a Giphy message to a player's connection.
 */
function sendGiphyMessage(player: MudObject, message: GiphyMessage): void {
  // Get player's connection for sending
  const playerWithConnection = player as MudObject & {
    connection?: { send: (msg: string) => void };
    _connection?: { send: (msg: string) => void };
  };
  const connection = playerWithConnection.connection || playerWithConnection._connection;

  if (connection?.send) {
    const jsonStr = JSON.stringify(message);
    connection.send(`\x00[GIPHY]${jsonStr}\n`);
  }
}

/**
 * Open a Giphy GIF panel for a player.
 *
 * Displays the GIF in a floating panel that doesn't block gameplay.
 * The panel auto-closes after the specified timeout.
 *
 * @param player The player to show the panel to
 * @param options Panel options including GIF URL, sender, channel, and auto-close time
 */
export function openGiphyModal(player: MudObject, options: GiphyModalOptions): void {
  const { gifUrl, senderName, channelName, searchQuery, autoCloseMs } = options;

  const message: GiphyMessage = {
    type: 'show',
    gifUrl,
    senderName,
    channelName,
    searchQuery,
    autoCloseMs,
  };

  sendGiphyMessage(player, message);
}

/**
 * Close the Giphy panel for a player.
 *
 * @param player The player to close the panel for
 */
export function closeGiphyModal(player: MudObject): void {
  const message: GiphyMessage = {
    type: 'hide',
  };

  sendGiphyMessage(player, message);
}

export default { openGiphyModal, closeGiphyModal };
