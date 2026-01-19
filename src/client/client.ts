/**
 * MudForge Web Client
 *
 * Browser-based client that connects to the MUD server via WebSocket.
 */

import { Terminal } from './terminal.js';
import {
  WebSocketClient,
  IdeMessage,
  StatsMessage,
  GUIMessage,
  QuestMessage,
  CompletionMessage,
  CommMessage,
  CombatMessage,
} from './websocket-client.js';
import { InputHandler } from './input-handler.js';
import { IdeEditor } from './ide-editor.js';
import { MapPanel } from './map-panel.js';
import { StatsPanel } from './stats-panel.js';
import { QuestPanel } from './quest-panel.js';
import { CommPanel } from './comm-panel.js';
import { CombatPanel } from './combat-panel.js';
import { GUIModal } from './gui/gui-modal.js';
import { Launcher } from './launcher.js';
import type { MapMessage } from './map-renderer.js';
import type { GUIServerMessage, GUIClientMessage } from './gui/gui-types.js';

/**
 * Main client application.
 */
class MudClient {
  private terminal: Terminal;
  private wsClient: WebSocketClient;
  private inputHandler: InputHandler;
  private ideEditor: IdeEditor;
  private mapPanel: MapPanel;
  private statsPanel: StatsPanel;
  private questPanel: QuestPanel;
  private commPanel: CommPanel;
  private combatPanel: CombatPanel;
  private guiModal: GUIModal;
  private launcher: Launcher;
  private statusElement: HTMLElement;
  private permissionLevel: number = 0;
  private cwd: string = '/';
  private isLoggedIn: boolean = false;

  constructor() {
    // Get DOM elements
    const terminalEl = document.getElementById('terminal');
    const inputEl = document.getElementById('input') as HTMLInputElement;
    const sendBtn = document.getElementById('send-btn');
    const statusEl = document.getElementById('status');

    if (!terminalEl || !inputEl || !sendBtn || !statusEl) {
      throw new Error('Required DOM elements not found');
    }

    this.statusElement = statusEl;

    // Initialize components
    this.terminal = new Terminal(terminalEl);
    this.inputHandler = new InputHandler(inputEl, sendBtn);
    this.wsClient = new WebSocketClient();
    this.ideEditor = new IdeEditor();
    this.mapPanel = new MapPanel('map-container', {
      onRoomClick: (roomPath) => {
        // Could implement auto-walk in the future
        console.log('Room clicked:', roomPath);
      },
    });
    this.statsPanel = new StatsPanel('stats-container');
    this.questPanel = new QuestPanel('quest-container', {
      onQuestClick: (questId: string) => {
        // Send request to server to open quest log GUI
        this.wsClient.sendGUIMessage({
          action: 'quest-panel-click',
          questId,
        });
      },
    });
    this.commPanel = new CommPanel('comm-container');
    this.combatPanel = new CombatPanel('combat-container');
    this.guiModal = new GUIModal((message: GUIClientMessage) => {
      this.wsClient.sendGUIMessage(message);
    });

    // Initialize launcher - handles login before showing terminal
    this.launcher = new Launcher(this.wsClient, () => {
      this.onLoginSuccess();
    });

    this.setupEventHandlers();
  }

  /**
   * Called when login is successful and game terminal should be shown.
   */
  private onLoginSuccess(): void {
    this.isLoggedIn = true;
    this.inputHandler.focus();
  }

  /**
   * Set up event handlers.
   */
  private setupEventHandlers(): void {
    // WebSocket events
    this.wsClient.on('connecting', () => {
      this.setStatus('connecting', 'Connecting...');
      this.terminal.addSystemLine('Connecting to server...');
    });

    this.wsClient.on('connected', () => {
      this.setStatus('connected', 'Connected');
      this.terminal.addSystemLine('Connected!');
    });

    this.wsClient.on('disconnected', (reason: string) => {
      this.setStatus('disconnected', 'Disconnected');
      this.terminal.addSystemLine(`Disconnected: ${reason}`);
    });

    this.wsClient.on('error', (error: string) => {
      this.terminal.addErrorLine(`Error: ${error}`);
    });

    this.wsClient.on('message', (data: string) => {
      this.terminal.addLine(data);
    });

    // IDE events
    this.wsClient.on('ide-message', (message: IdeMessage) => {
      this.handleIdeMessage(message);
    });

    // Map events
    this.wsClient.on('map-message', (message: MapMessage) => {
      this.mapPanel.handleMessage(message);
    });

    // Stats events
    this.wsClient.on('stats-message', (message: StatsMessage) => {
      this.statsPanel.handleMessage(message);
      // Track permission level and cwd for tab completion
      this.permissionLevel = message.permissionLevel ?? 0;
      this.cwd = message.cwd ?? '/';
    });

    // GUI events
    this.wsClient.on('gui-message', (message: GUIMessage) => {
      this.guiModal.handleMessage(message as GUIServerMessage);
    });

    // Quest events
    this.wsClient.on('quest-message', (message: QuestMessage) => {
      this.questPanel.handleMessage(message);
    });

    // Comm panel events
    this.wsClient.on('comm-message', (message: CommMessage) => {
      this.commPanel.handleMessage(message);
    });

    // Combat panel events
    this.wsClient.on('combat-message', (message: CombatMessage) => {
      this.combatPanel.handleMessage(message);
    });

    // Completion events
    this.wsClient.on('completion-message', (message: CompletionMessage) => {
      this.inputHandler.setCompletions(message.prefix, message.completions);
    });

    // Input events
    this.inputHandler.on('submit', (command: string) => {
      this.sendCommand(command);
    });

    // Tab completion handler - only active for builders+
    this.inputHandler.setTabCompleteHandler((prefix: string) => {
      if (this.permissionLevel >= 1) {
        this.wsClient.sendCompletionRequest(prefix);
      }
    });
  }

  /**
   * Handle IDE messages from server.
   */
  private handleIdeMessage(message: IdeMessage): void {
    if (message.action === 'open') {
      this.ideEditor.open(message, {
        onSave: (path, content) => {
          this.wsClient.sendIdeMessage({
            action: 'save',
            path,
            content,
          });
        },
        onClose: () => {
          this.wsClient.sendIdeMessage({ action: 'close' });
          this.inputHandler.focus();
        },
      });
    } else if (message.action === 'save-result') {
      this.ideEditor.handleSaveResult(message);
    }
  }

  /**
   * Send a command to the server.
   */
  private sendCommand(command: string): void {
    if (!this.wsClient.isConnected) {
      this.terminal.addErrorLine('Not connected to server');
      return;
    }

    // Echo the command locally
    this.terminal.addInputLine(command);

    // Send to server
    this.wsClient.send(command);
  }

  /**
   * Set the connection status display.
   */
  private setStatus(state: 'connecting' | 'connected' | 'disconnected', text: string): void {
    this.statusElement.className = state;
    this.statusElement.textContent = text;
  }

  /**
   * Connect to the server.
   */
  connect(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.wsClient.connect(wsUrl);
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    this.wsClient.disconnect();
  }
}

// Initialize the client when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const client = new MudClient();
  client.connect();

  // Expose for debugging
  (window as unknown as { mudClient: MudClient }).mudClient = client;
});
