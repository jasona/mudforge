/**
 * Snoop Modal Helpers
 *
 * Functions to open, update, and close the snoop modal for builders.
 * Message forwarding is handled by driver efuns - this just manages the modal UI.
 */

import type { Player } from '../std/player.js';
import type { Living } from '../std/living.js';
import type {
  GUIOpenMessage,
  GUICloseMessage,
  GUIUpdateMessage,
  LayoutContainer,
  ModalButton,
  GUIClientMessage,
} from './gui-types.js';
import { stripColors } from './colors.js';

/** Modal ID constant */
const SNOOP_MODAL_ID = 'snoop-modal';

/**
 * Open the snoop modal for a snooper.
 */
export function openSnoopModal(
  snooper: Player,
  target: Living,
  _initialMessages: string[] = []
): void {
  // Determine target type and info
  const isPlayer = 'permissionLevel' in target;
  const targetType = isPlayer ? 'Player' : 'NPC';
  const targetLevel = isPlayer ? (target as Player).permissionLevel : 0;
  const levelStr = isPlayer ? ` (Level ${targetLevel})` : '';

  // Get location with color codes stripped for clean display
  const locationName = stripColors(target.environment?.shortDesc || 'Unknown location');

  // Build the modal layout
  const layout: LayoutContainer = {
    type: 'vertical',
    gap: '8px',
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    },
    children: [
      // Target info header
      {
        type: 'horizontal',
        gap: '8px',
        style: {
          padding: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '4px',
        },
        children: [
          {
            type: 'text',
            id: 'target-type',
            content: `[${targetType}]${levelStr}`,
            style: {
              color: isPlayer ? '#66c2ff' : '#ff9966',
              fontWeight: 'bold',
            },
          },
          {
            type: 'text',
            id: 'target-location',
            content: locationName,
            style: {
              color: '#888888',
              fontStyle: 'italic',
            },
          },
        ],
      },
      // Message display area
      {
        type: 'vertical',
        id: 'message-container',
        style: {
          flex: '1',
          backgroundColor: '#0d0d0f',
          borderRadius: '4px',
          padding: '8px',
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '13px',
          lineHeight: '1.4',
          minHeight: '300px',
          maxHeight: '400px',
        },
        children: [
          {
            type: 'html',
            id: 'message-display',
            content: '<div style="white-space: pre-wrap; word-break: break-word;"><span style="color: #666;">Waiting for messages...</span></div>',
          },
        ],
      },
      // Command input area
      {
        type: 'form',
        id: 'command-form',
        style: {
          padding: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '4px',
        },
        children: [
          // Execute as target
          {
            type: 'horizontal',
            gap: '8px',
            style: {
              marginBottom: '8px',
            },
            children: [
              {
                type: 'text',
                id: 'command-input',
                name: 'command',
                label: '',
                placeholder: `Execute command as ${target.name}...`,
                style: {
                  flex: '1',
                },
              },
              {
                type: 'button',
                id: 'execute-btn',
                name: 'execute-btn',
                label: 'Execute',
                action: 'submit',
                variant: 'primary',
              },
            ],
          },
          // Execute as self
          {
            type: 'horizontal',
            gap: '8px',
            children: [
              {
                type: 'text',
                id: 'self-command-input',
                name: 'selfCommand',
                label: '',
                placeholder: 'Execute command as yourself...',
                style: {
                  flex: '1',
                },
              },
              {
                type: 'button',
                id: 'self-execute-btn',
                name: 'self-execute-btn',
                label: 'Execute',
                action: 'custom',
                customAction: 'self-execute',
                variant: 'primary',
              },
            ],
          },
        ],
      },
    ],
  };

  // Footer buttons
  const buttons: ModalButton[] = [
    {
      id: 'stop-snoop-btn',
      label: 'Stop Snooping',
      action: 'custom',
      customAction: 'stop-snoop',
      variant: 'danger',
    },
  ];

  // Build the message
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: SNOOP_MODAL_ID,
      title: `Snooping: ${target.name}`,
      subtitle: `Observing ${targetType.toLowerCase()} activity`,
      size: 'large',
      closable: true,
      escapable: true,
      headerStyle: {
        backgroundColor: '#2d1f1f',
      },
      bodyStyle: {
        backgroundColor: '#1f1f1f',
        padding: '12px',
      },
    },
    layout,
    buttons,
  };

  // Send to player
  sendGUI(snooper, message);

  // Set up the GUI response handler
  setupSnoopHandler(snooper);
}

/**
 * Close the snoop modal.
 */
export function closeSnoopModal(snooper: Player, reason?: string): void {
  // Clean up handler
  const playerWithHandler = snooper as Player & {
    onGUIResponse?: (msg: GUIClientMessage) => void | Promise<void>;
    _snoopOriginalHandler?: (msg: GUIClientMessage) => void | Promise<void>;
  };
  if (playerWithHandler._snoopOriginalHandler) {
    playerWithHandler.onGUIResponse = playerWithHandler._snoopOriginalHandler;
    delete playerWithHandler._snoopOriginalHandler;
  } else {
    delete playerWithHandler.onGUIResponse;
  }

  const message: GUICloseMessage = {
    action: 'close',
    modalId: SNOOP_MODAL_ID,
    reason,
  };

  sendGUI(snooper, message);
}

/**
 * Set up the GUI response handler for the snoop modal.
 */
function setupSnoopHandler(snooper: Player): void {
  const playerWithHandler = snooper as Player & {
    onGUIResponse?: (msg: GUIClientMessage) => void | Promise<void>;
    _snoopOriginalHandler?: (msg: GUIClientMessage) => void | Promise<void>;
  };

  // Store original handler if not already stored
  if (playerWithHandler.onGUIResponse && !playerWithHandler._snoopOriginalHandler) {
    playerWithHandler._snoopOriginalHandler = playerWithHandler.onGUIResponse;
  }

  // Create our handler
  playerWithHandler.onGUIResponse = async (message: GUIClientMessage): Promise<void> => {
    // Handle other modals with original handler
    if (message.modalId !== SNOOP_MODAL_ID) {
      if (playerWithHandler._snoopOriginalHandler) {
        await playerWithHandler._snoopOriginalHandler(message);
      }
      return;
    }

    // Handle submit (execute command)
    if (message.action === 'submit') {
      const command = (message.data?.command as string) || '';
      if (command.trim()) {
        const { getSnoopDaemon } = await import('../daemons/snoop.js');
        await getSnoopDaemon().executeAsTarget(snooper, command.trim());
      }
      // Clear the command input
      clearCommandInput(snooper);
      return;
    }

    // Handle button clicks
    if (message.action === 'button') {
      if (message.customAction === 'stop-snoop') {
        const { getSnoopDaemon } = await import('../daemons/snoop.js');
        getSnoopDaemon().stopSnoop(snooper);
        snooper.receive('{green}Snoop session ended.{/}\n');
      } else if (message.customAction === 'self-execute') {
        const selfCommand = (message.data?.selfCommand as string) || '';
        if (selfCommand.trim()) {
          await snooper.processInput(selfCommand.trim());
        }
        // Clear the self-command input
        clearSelfCommandInput(snooper);
      }
      return;
    }
  };
}

/**
 * Send a GUI message to a player.
 */
function sendGUI(player: Player, message: GUIOpenMessage | GUICloseMessage | GUIUpdateMessage): void {
  const playerWithConnection = player as Player & {
    connection?: { send: (msg: string) => void };
    _connection?: { send: (msg: string) => void };
  };

  const connection = playerWithConnection.connection || playerWithConnection._connection;
  if (!connection?.send) {
    return;
  }

  const jsonStr = JSON.stringify(message);
  connection.send(`\x00[GUI]${jsonStr}\n`);
}

/**
 * Clear the command input in the snoop modal.
 */
function clearCommandInput(player: Player): void {
  const message: GUIUpdateMessage = {
    action: 'update',
    modalId: SNOOP_MODAL_ID,
    updates: {
      data: {
        command: '',
      },
    },
  };
  sendGUI(player, message);
}

/**
 * Clear the self-command input in the snoop modal.
 */
function clearSelfCommandInput(player: Player): void {
  const message: GUIUpdateMessage = {
    action: 'update',
    modalId: SNOOP_MODAL_ID,
    updates: {
      data: {
        selfCommand: '',
      },
    },
  };
  sendGUI(player, message);
}
