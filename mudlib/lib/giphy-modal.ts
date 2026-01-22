/**
 * Giphy Modal - Display GIF popup for channel sharing.
 *
 * Creates a GUI modal showing a shared GIF with sender info,
 * search query, and GIPHY attribution. Auto-closes after configurable timeout.
 */

import type {
  GUIOpenMessage,
  GUICloseMessage,
  LayoutContainer,
  DisplayElement,
} from './gui-types.js';
import type { MudObject } from '../std/object.js';

/**
 * Options for opening a Giphy modal.
 */
export interface GiphyModalOptions {
  gifUrl: string;
  senderName: string;
  channelName: string;
  searchQuery: string;
  autoCloseMs: number;
}

/**
 * Open a Giphy GIF modal for a player.
 *
 * @param player The player to show the modal to
 * @param options Modal options including GIF URL, sender, channel, and auto-close time
 */
export function openGiphyModal(player: MudObject, options: GiphyModalOptions): void {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return;
  }

  const { gifUrl, senderName, channelName, searchQuery, autoCloseMs } = options;

  // Build the modal layout
  const layout: LayoutContainer = {
    type: 'vertical',
    gap: '12px',
    style: {
      padding: '16px',
      alignItems: 'center',
    },
    children: [
      // Header: "SenderName shares on Channel:"
      {
        type: 'text',
        id: 'giphy-header',
        content: `${senderName} shares on ${channelName}:`,
        style: {
          color: '#fbbf24',
          fontSize: '14px',
          fontWeight: 'bold',
          textAlign: 'center',
        },
      } as DisplayElement,
      // GIF image (max 400x300)
      {
        type: 'image',
        id: 'giphy-gif',
        src: gifUrl,
        alt: searchQuery,
        style: {
          maxWidth: '400px',
          maxHeight: '300px',
          borderRadius: '8px',
          border: '2px solid #333',
        },
      } as DisplayElement,
      // Search query in italics
      {
        type: 'text',
        id: 'giphy-query',
        content: `"${searchQuery}"`,
        style: {
          color: '#888',
          fontSize: '13px',
          fontStyle: 'italic',
          textAlign: 'center',
        },
      } as DisplayElement,
      // GIPHY attribution
      {
        type: 'text',
        id: 'giphy-attribution',
        content: 'Powered by GIPHY',
        style: {
          color: '#666',
          fontSize: '11px',
          textAlign: 'center',
          marginTop: '8px',
        },
      } as DisplayElement,
    ],
  };

  // Send the modal
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'giphy-modal',
      title: 'GIF',
      closable: true,
      escapable: true,
      size: 'small',
      width: '450px',
      headerStyle: {
        textAlign: 'center',
      },
    },
    layout,
    buttons: [
      {
        id: 'close',
        label: 'Close',
        action: 'cancel',
        variant: 'secondary',
      },
    ],
  };

  // Get player's connection for sending
  const playerWithConnection = player as MudObject & {
    connection?: { send: (msg: string) => void };
    _connection?: { send: (msg: string) => void };
  };
  const connection = playerWithConnection.connection || playerWithConnection._connection;

  if (connection?.send) {
    // Send GUI open message
    const jsonStr = JSON.stringify(message);
    connection.send(`\x00[GUI]${jsonStr}\n`);
  } else if (efuns.guiSend) {
    // Fallback to efuns.guiSend if available
    efuns.guiSend(message);
  }

  // Schedule auto-close if timeout is set
  if (autoCloseMs > 0 && efuns.callOut) {
    efuns.callOut(() => {
      closeGiphyModal(player);
    }, autoCloseMs);
  }
}

/**
 * Close the Giphy modal for a player.
 *
 * @param player The player to close the modal for
 */
export function closeGiphyModal(player: MudObject): void {
  if (typeof efuns === 'undefined') {
    return;
  }

  const closeMessage: GUICloseMessage = {
    action: 'close',
    modal: {
      id: 'giphy-modal',
    },
  };

  // Get player's connection for sending
  const playerWithConnection = player as MudObject & {
    connection?: { send: (msg: string) => void };
    _connection?: { send: (msg: string) => void };
  };
  const connection = playerWithConnection.connection || playerWithConnection._connection;

  if (connection?.send) {
    const jsonStr = JSON.stringify(closeMessage);
    connection.send(`\x00[GUI]${jsonStr}\n`);
  } else if (efuns.guiSend) {
    efuns.guiSend(closeMessage);
  }
}

export default { openGiphyModal, closeGiphyModal };
