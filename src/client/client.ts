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
  SoundMessage,
  GiphyMessage,
  TimeMessage,
  ReconnectProgress,
  ConnectionState,
} from './shared-websocket-client.js';
import { InputHandler } from './input-handler.js';
import { IdeEditorLoader } from './ide-editor-loader.js';
import { MapPanel } from './map-panel.js';
import { StatsPanel } from './stats-panel.js';
import { EquipmentPanel } from './equipment-panel.js';
import { QuestPanel } from './quest-panel.js';
import { CommPanel } from './comm-panel.js';
import { CombatPanel } from './combat-panel.js';
import { GiphyPanel } from './giphy-panel.js';
import { ClockPanel } from './clock-panel.js';
import { SoundManager } from './sound-manager.js';
import { SoundPanel } from './sound-panel.js';
import { GUIModal } from './gui/gui-modal.js';
import { Launcher } from './launcher.js';
import { DebugPanel } from './debug-panel.js';
import { logger } from './logger.js';
import type { MapMessage } from './map-renderer.js';
import type { GUIServerMessage, GUIClientMessage } from './gui/gui-types.js';

/**
 * Game/driver configuration from /api/config.
 */
interface GameConfig {
  game: {
    name: string;
    tagline: string;
    version: string;
    description: string;
    establishedYear: number;
    website: string;
  };
  driver: {
    name: string;
    version: string;
  };
  hasBugReports?: boolean;
}

/**
 * Main client application.
 */
class MudClient {
  private terminal: Terminal;
  private wsClient: WebSocketClient;
  private inputHandler: InputHandler;
  private ideEditor: IdeEditorLoader;
  private mapPanel: MapPanel;
  private statsPanel: StatsPanel;
  private equipmentPanel: EquipmentPanel;
  private questPanel: QuestPanel;
  private commPanel: CommPanel;
  private combatPanel: CombatPanel;
  private giphyPanel: GiphyPanel;
  private clockPanel: ClockPanel;
  private soundManager: SoundManager;
  private soundPanel: SoundPanel;
  private guiModal: GUIModal;
  private launcher: Launcher;
  private debugPanel: DebugPanel;
  private statusElement: HTMLElement;
  private updateBanner: HTMLElement;
  private permissionLevel: number = 0;
  private cwd: string = '/';
  private isLoggedIn: boolean = false;
  private gameConfig: GameConfig | null = null;
  private serverVersion: string | null = null;
  private versionMismatchShown: boolean = false;

  constructor() {
    // Get DOM elements
    const terminalEl = document.getElementById('terminal');
    const inputEl = document.getElementById('input') as HTMLInputElement;
    const sendBtn = document.getElementById('send-btn');
    const statusEl = document.getElementById('status');
    const updateBanner = document.getElementById('update-banner');
    const debugToggle = document.getElementById('debug-toggle');

    if (!terminalEl || !inputEl || !sendBtn || !statusEl || !updateBanner) {
      throw new Error('Required DOM elements not found');
    }

    this.statusElement = statusEl;
    this.updateBanner = updateBanner;

    // Initialize components
    this.terminal = new Terminal(terminalEl);
    this.inputHandler = new InputHandler(inputEl, sendBtn);
    this.wsClient = new WebSocketClient();
    this.ideEditor = new IdeEditorLoader();
    this.mapPanel = new MapPanel('map-container', {
      onRoomClick: (roomPath) => {
        // Could implement auto-walk in the future
        console.log('Room clicked:', roomPath);
      },
    });
    this.statsPanel = new StatsPanel('stats-container', {
      onAvatarClick: () => {
        // Send request to server to open score modal
        this.wsClient.sendGUIMessage({
          action: 'avatar-click',
        });
      },
    });
    this.equipmentPanel = new EquipmentPanel('equipment-container', {
      onSlotClick: () => {
        // Send request to server to open inventory modal
        this.wsClient.sendGUIMessage({
          action: 'open-inventory',
        });
      },
    });
    this.questPanel = new QuestPanel('quest-container', {
      onQuestClick: (questId: string) => {
        // Send request to server to open quest log GUI
        this.wsClient.sendGUIMessage({
          action: 'quest-panel-click',
          questId,
        });
      },
    });
    this.commPanel = new CommPanel('comm-container', {
      onGifClick: (gifId) => {
        // Send gif command to server to re-open the GIF modal
        if (this.wsClient.isConnected) {
          this.wsClient.send(`gif ${gifId}`);
        }
      },
    });
    this.combatPanel = new CombatPanel('combat-container');
    this.giphyPanel = new GiphyPanel('giphy-container');
    this.clockPanel = new ClockPanel('clock-container');
    this.soundManager = new SoundManager();
    this.soundPanel = new SoundPanel('sound-container', this.soundManager);
    this.guiModal = new GUIModal((message: GUIClientMessage) => {
      this.wsClient.sendGUIMessage(message);
    });

    // Initialize launcher - handles login before showing terminal
    this.launcher = new Launcher(this.wsClient, () => {
      this.onLoginSuccess();
    });

    // Initialize debug panel
    this.debugPanel = new DebugPanel('debug-container', {
      onSendBugReport: (report) => this.sendBugReport(report),
    });

    // Debug toggle button
    if (debugToggle) {
      debugToggle.addEventListener('click', () => {
        this.debugPanel.toggle();
      });
    }

    // Keyboard shortcut for debug panel (Ctrl+`)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        this.debugPanel.toggle();
      }
    });

    // Update banner buttons
    const updateRefresh = document.getElementById('update-refresh');
    const updateDismiss = document.getElementById('update-dismiss');
    if (updateRefresh) {
      updateRefresh.addEventListener('click', () => {
        window.location.reload();
      });
    }
    if (updateDismiss) {
      updateDismiss.addEventListener('click', () => {
        this.updateBanner.classList.add('hidden');
      });
    }

    this.setupEventHandlers();

    // Load game config
    this.loadGameConfig();
  }

  /**
   * Called when login is successful and game terminal should be shown.
   */
  private onLoginSuccess(): void {
    this.isLoggedIn = true;
    this.inputHandler.focus();
  }

  /**
   * Load game configuration from the server.
   */
  private async loadGameConfig(): Promise<void> {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }
      this.gameConfig = await response.json();

      if (this.gameConfig) {
        // Store initial version for comparison
        this.serverVersion = this.gameConfig.game.version;

        // Update debug panel with config info
        this.debugPanel.setConfig(this.gameConfig);

        logger.info(`Loaded game config: ${this.gameConfig.game.name} v${this.gameConfig.game.version}`);
      }
    } catch (error) {
      logger.error('Failed to load game config:', error);
    }
  }

  /**
   * Check for version mismatch and show update banner if needed.
   */
  private checkVersionMismatch(serverVersion: string): void {
    if (this.versionMismatchShown) {
      return; // Already shown
    }

    if (this.serverVersion && serverVersion !== this.serverVersion) {
      logger.warn(`Version mismatch detected: client=${this.serverVersion}, server=${serverVersion}`);
      this.updateBanner.classList.remove('hidden');
      this.versionMismatchShown = true;
    }
  }

  /**
   * Send a bug report to the server.
   */
  private sendBugReport(report: unknown): void {
    if (!this.wsClient.isConnected) {
      logger.error('Cannot send bug report: not connected');
      return;
    }

    try {
      const jsonStr = JSON.stringify(report);
      this.wsClient.send(`\x00[BUG_REPORT]${jsonStr}`);
      logger.info('Bug report sent to server');
    } catch (error) {
      logger.error('Failed to send bug report:', error);
    }
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

    // Reconnection progress feedback
    this.wsClient.on('reconnect-progress', (p: ReconnectProgress) => {
      const statusText = `Reconnecting (${p.attempt}/${p.maxAttempts})...`;
      this.setStatus('reconnecting', statusText);
      this.terminal.addSystemLine(`Reconnecting in ${Math.round(p.delayMs / 1000)}s (attempt ${p.attempt}/${p.maxAttempts})...`);
    });

    // Connection stale detection feedback
    this.wsClient.on('connection-stale', () => {
      this.terminal.addSystemLine('{yellow}Connection appears stale, reconnecting...{/}');
    });

    // Latency updates for connection quality indicator
    this.wsClient.on('latency-update', (latencyMs: number) => {
      this.updateConnectionIndicator(latencyMs);
    });

    this.wsClient.on('reconnect-failed', (_progress: ReconnectProgress) => {
      this.setStatus('disconnected', 'Connection Failed');
      this.terminal.addErrorLine('Connection failed after maximum retry attempts.');
      this.terminal.addSystemLine('Click the status indicator or type /reconnect to try again.');
    });

    // Connection state changes
    this.wsClient.on('state-change', (newState: ConnectionState, _oldState: ConnectionState) => {
      // Update status element with click handler for manual reconnect
      if (newState === 'failed') {
        this.statusElement.style.cursor = 'pointer';
        this.statusElement.onclick = () => this.wsClient.reconnect();
      } else {
        this.statusElement.style.cursor = 'default';
        this.statusElement.onclick = null;
      }
    });

    // Message queue feedback
    this.wsClient.on('message-queued', (message: string, queueSize: number) => {
      // Only show feedback for first queued message
      if (queueSize === 1) {
        this.terminal.addSystemLine('{dim}Commands will be sent when reconnected...{/}');
      }
    });

    this.wsClient.on('queue-flushed', (count: number) => {
      if (count > 0) {
        this.terminal.addSystemLine(`{green}Sent ${count} queued command${count > 1 ? 's' : ''}.{/}`);
      }
    });

    // Session events
    this.wsClient.on('session-resume', (message: { type: string; success?: boolean; error?: string }) => {
      if (message.type === 'session_resume' && message.success) {
        this.terminal.addSystemLine('{green}Session restored successfully.{/}');
      } else if (message.type === 'session_invalid') {
        this.terminal.addSystemLine('{yellow}Session expired. Please log in again.{/}');
      }
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
      this.equipmentPanel.handleMessage(message);
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

    // Sound panel events
    this.wsClient.on('sound-message', (message: SoundMessage) => {
      this.soundPanel.handleSoundMessage(message);
    });

    // Giphy panel events
    this.wsClient.on('giphy-message', (message: GiphyMessage) => {
      this.giphyPanel.handleMessage(message);
    });

    // Time/clock events
    this.wsClient.on('time-message', (message: TimeMessage) => {
      this.clockPanel.handleMessage(message);

      // Update debug panel latency display
      if (message.latencyMs !== undefined) {
        this.debugPanel.updateLatency(message.latencyMs);
      }

      // Check for version mismatch (server sends gameVersion in TIME messages)
      if (message.gameVersion) {
        this.checkVersionMismatch(message.gameVersion);
      }
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
  private async handleIdeMessage(message: IdeMessage): Promise<void> {
    if (message.action === 'open') {
      await this.ideEditor.open(message, {
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
  private setStatus(state: 'connecting' | 'connected' | 'disconnected' | 'warning' | 'reconnecting', text: string): void {
    this.statusElement.className = state;
    this.statusElement.textContent = text;
    // Update tooltip with latency info if available
    if (state === 'connected' || state === 'warning') {
      const latency = this.wsClient.latency;
      if (latency > 0) {
        this.statusElement.title = `Latency: ${latency}ms`;
      }
    } else {
      this.statusElement.title = '';
    }
  }

  /**
   * Update connection indicator based on latency.
   */
  private updateConnectionIndicator(latencyMs: number): void {
    if (this.wsClient.connectionState !== 'connected') {
      return; // Only update when connected
    }

    if (latencyMs > 500) {
      this.setStatus('warning', `High Latency (${latencyMs}ms)`);
    } else {
      this.setStatus('connected', 'Connected');
    }
  }

  /**
   * Connect to the server.
   */
  connect(): void {
    // Try to load existing session for page refresh recovery
    this.wsClient.loadSessionFromStorage();

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
