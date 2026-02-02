/**
 * WebSocketClient - Handles WebSocket connection to the MUD server.
 *
 * Provides connection management, auto-reconnect, and message handling.
 */

/* global sessionStorage */

import type { MapMessage } from './map-renderer.js';

/**
 * Connection state machine states.
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

/**
 * Reconnection progress information.
 */
export interface ReconnectProgress {
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  reason?: string;
}

/**
 * Session token message from server.
 */
export interface SessionTokenMessage {
  type: 'session_token';
  token: string;
  expiresAt: number;
}

/**
 * Session resume response from server.
 */
export interface SessionResumeMessage {
  type: 'session_resume' | 'session_invalid';
  success?: boolean;
  error?: string;
}

/**
 * Time message from server for clock display.
 */
export interface TimeMessage {
  timestamp: number;
  timezone: { name: string; abbreviation: string; offset: string };
  gameVersion?: string;
  /** Calculated round-trip latency in milliseconds (added by client) */
  latencyMs?: number;
}

/**
 * Event types for the WebSocket client.
 */
type WebSocketClientEvent =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'message'
  | 'ide-message'
  | 'map-message'
  | 'stats-message'
  | 'gui-message'
  | 'quest-message'
  | 'completion-message'
  | 'comm-message'
  | 'combat-message'
  | 'sound-message'
  | 'giphy-message'
  | 'auth-response'
  | 'state-change'
  | 'reconnect-progress'
  | 'reconnect-failed'
  | 'message-queued'
  | 'queue-flushed'
  | 'session-token'
  | 'session-resume'
  | 'time-message';

/**
 * Equipment slot data for stats display.
 */
export interface EquipmentSlotData {
  name: string;
  image?: string;
  itemType: 'weapon' | 'armor';
  // Tooltip data
  description?: string;
  weight?: number;
  value?: number;
  // Weapon-specific
  minDamage?: number;
  maxDamage?: number;
  damageType?: string;
  handedness?: string;
  // Armor-specific
  armor?: number;
  slot?: string;
}

/**
 * Stats message structure for HP/MP/XP display.
 */
export interface StatsMessage {
  type: 'update';
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  xp: number;
  xpToLevel: number;
  gold: number;
  bankedGold: number;
  permissionLevel: number;
  cwd: string;
  avatar: string;
  profilePortrait?: string; // AI-generated portrait data URI
  carriedWeight: number;
  maxCarryWeight: number;
  encumbrancePercent: number;
  encumbranceLevel: 'none' | 'light' | 'medium' | 'heavy';
  equipment?: {
    [slot: string]: EquipmentSlotData | null;
  };
}

/**
 * Tab completion response message.
 */
export interface CompletionMessage {
  type: 'completion';
  prefix: string;
  completions: string[];
}

/**
 * IDE message structure.
 */
export interface IdeMessage {
  action: string;
  path?: string;
  content?: string;
  readOnly?: boolean;
  language?: string;
  success?: boolean;
  errors?: Array<{ line: number; column: number; message: string }>;
  message?: string;
  /** Mode for custom button text: 'bug' shows "Submit Bug" instead of "Save" */
  mode?: 'bug';
}

/**
 * GUI message structure for modal dialogs.
 * Full types are in mudlib/lib/gui-types.ts
 */
export interface GUIMessage {
  action: string;
  modalId?: string;
  modal?: unknown;
  layout?: unknown;
  buttons?: unknown[];
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Auth request message for launcher login/registration.
 */
export interface AuthRequest {
  type: 'login' | 'register';
  name?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  gender?: string;
  avatar?: string;
}

/**
 * Auth response message from server.
 */
export interface AuthResponseMessage {
  success: boolean;
  error?: string;
  errorCode?: 'invalid_credentials' | 'user_not_found' | 'name_taken' | 'validation_error';
  requiresRegistration?: boolean;
}

/**
 * Quest panel update message.
 */
export interface QuestMessage {
  type: 'update';
  quests: Array<{
    questId: string;
    name: string;
    progress: number;
    progressText: string;
    status: 'active' | 'completed';
  }>;
}

/**
 * Communication message types.
 */
export type CommType = 'say' | 'tell' | 'channel';

/**
 * Communication panel message.
 */
export interface CommMessage {
  type: 'comm';
  commType: CommType;
  sender: string;
  message: string;
  channel?: string;
  recipients?: string[];
  timestamp: number;
  isSender?: boolean;    // True if recipient is the one who sent this message
  gifId?: string;        // GIF ID for clickable [View GIF] links
}

/**
 * Combat target update message.
 */
export interface CombatTargetUpdateMessage {
  type: 'target_update';
  target: {
    name: string;
    level: number;
    portrait: string;      // SVG markup or avatar ID
    health: number;
    maxHealth: number;
    healthPercent: number;
    isPlayer: boolean;
  };
}

/**
 * Combat target clear message.
 */
export interface CombatTargetClearMessage {
  type: 'target_clear';
}

export type CombatMessage = CombatTargetUpdateMessage | CombatTargetClearMessage;

/**
 * Sound category types.
 */
export type SoundCategory = 'combat' | 'spell' | 'skill' | 'potion' | 'quest' | 'celebration' | 'discussion' | 'alert' | 'ambient' | 'ui';

/**
 * Sound message for audio playback.
 */
export interface SoundMessage {
  type: 'play' | 'loop' | 'stop';
  category: SoundCategory;
  sound: string;
  volume?: number;
  id?: string;
}

/**
 * Giphy message for floating GIF display.
 */
export interface GiphyMessage {
  type: 'show' | 'hide';
  gifUrl?: string;
  senderName?: string;
  channelName?: string;
  searchQuery?: string;
  autoCloseMs?: number;
}

/**
 * Event handler type.
 */
type EventHandler = (...args: unknown[]) => void;

/**
 * WebSocket client for connecting to the MUD server.
 */
export class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private maxReconnectDelay: number = 30000;
  private reconnectTimer: number | null = null;
  private handlers: Map<WebSocketClientEvent, Set<EventHandler>> = new Map();

  // Message queue for commands sent while disconnected
  private messageQueue: string[] = [];
  private maxQueueSize: number = 50;

  // Connection state machine
  private _connectionState: ConnectionState = 'disconnected';

  // Track intentional disconnects (don't reconnect if user explicitly disconnected)
  private intentionalDisconnect: boolean = false;

  // Session token for reconnection without re-auth
  private sessionToken: string | null = null;
  private sessionExpiresAt: number = 0;

  // Latency measurement (updated via TIME_PONG responses)
  private lastMeasuredLatency: number = 0;


  /**
   * Check if connected.
   */
  get isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Check if connecting.
   */
  get isConnecting(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.CONNECTING;
  }

  /**
   * Get the current connection state.
   */
  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  /**
   * Get the number of queued messages.
   */
  get queuedMessageCount(): number {
    return this.messageQueue.length;
  }

  /**
   * Check if there's a valid session token for reconnection.
   */
  get hasValidSession(): boolean {
    return this.sessionToken !== null && Date.now() < this.sessionExpiresAt;
  }

  /**
   * Set the connection state and emit state-change event.
   */
  private setConnectionState(newState: ConnectionState): void {
    const oldState = this._connectionState;
    if (oldState !== newState) {
      this._connectionState = newState;
      this.emit('state-change', newState, oldState);
    }
  }

  /**
   * Add an event listener.
   */
  on(event: WebSocketClientEvent, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  /**
   * Remove an event listener.
   */
  off(event: WebSocketClientEvent, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event.
   */
  private emit(event: WebSocketClientEvent, ...args: unknown[]): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      }
    }
  }

  /**
   * Connect to the server.
   */
  connect(url: string): void {
    if (this.socket) {
      this.disconnect();
    }

    this.url = url;
    this.reconnectAttempts = 0;
    this.intentionalDisconnect = false;
    this.setConnectionState('connecting');
    this.createConnection();
  }

  /**
   * Create a new WebSocket connection.
   */
  private createConnection(): void {
    // Set state based on whether this is initial connect or reconnect
    if (this.reconnectAttempts > 0) {
      this.setConnectionState('reconnecting');
    } else {
      this.setConnectionState('connecting');
    }
    this.emit('connecting');

    try {
      this.socket = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      this.emit('error', `Failed to create connection: ${error}`);
      this.scheduleReconnect();
    }
  }

  /**
   * Set up WebSocket event handlers.
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setConnectionState('connected');
      this.emit('connected');

      // If we have a valid session token, attempt to resume
      if (this.hasValidSession) {
        this.sendSessionResume();
      }

      // Flush any queued messages
      this.flushMessageQueue();
    };

    this.socket.onclose = (event) => {
      const reason = event.reason || `Code ${event.code}`;
      this.emit('disconnected', reason);
      this.socket = null;

      // Only skip reconnect if the user explicitly called disconnect()
      if (this.intentionalDisconnect) {
        this.setConnectionState('disconnected');
        return;
      }

      // Reconnect for all close codes:
      // - 1000: Normal close (server restart, maintenance)
      // - 1001: Going away (server shutdown, browser navigation)
      // - 1005: No status code (server crash, network issue)
      // - 1006: Abnormal closure (network error)
      // - Any other code: unexpected disconnect
      this.scheduleReconnect(reason);
    };

    this.socket.onerror = () => {
      this.emit('error', 'WebSocket error');
    };

    this.socket.onmessage = (event) => {
      const data = event.data.toString();
      // Split on newlines to handle multiple messages
      const lines = data.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip the last empty line (trailing newline) but keep empty lines in the middle
        if (i === lines.length - 1 && line.length === 0) {
          continue;
        }
        // Check for IDE message prefix
        if (line.startsWith('\x00[IDE]')) {
          const jsonStr = line.slice(6); // Remove \x00[IDE] prefix
          try {
            const ideMessage = JSON.parse(jsonStr) as IdeMessage;
            this.emit('ide-message', ideMessage);
          } catch (error) {
            console.error('Failed to parse IDE message:', error);
          }
        } else if (line.startsWith('\x00[MAP]')) {
          const jsonStr = line.slice(6); // Remove \x00[MAP] prefix
          try {
            const mapMessage = JSON.parse(jsonStr) as MapMessage;
            this.emit('map-message', mapMessage);
          } catch (error) {
            console.error('Failed to parse MAP message:', error);
          }
        } else if (line.startsWith('\x00[STATS]')) {
          const jsonStr = line.slice(8); // Remove \x00[STATS] prefix
          try {
            const statsMessage = JSON.parse(jsonStr) as StatsMessage;
            this.emit('stats-message', statsMessage);
          } catch (error) {
            console.error('Failed to parse STATS message:', error);
          }
        } else if (line.startsWith('\x00[GUI]')) {
          const jsonStr = line.slice(6); // Remove \x00[GUI] prefix
          try {
            const guiMessage = JSON.parse(jsonStr) as GUIMessage;
            this.emit('gui-message', guiMessage);
          } catch (error) {
            console.error('Failed to parse GUI message:', error);
          }
        } else if (line.startsWith('\x00[QUEST]')) {
          const jsonStr = line.slice(8); // Remove \x00[QUEST] prefix
          try {
            const questMessage = JSON.parse(jsonStr) as QuestMessage;
            this.emit('quest-message', questMessage);
          } catch (error) {
            console.error('Failed to parse QUEST message:', error);
          }
        } else if (line.startsWith('\x00[COMPLETE]')) {
          const jsonStr = line.slice(11); // Remove \x00[COMPLETE] prefix
          try {
            const completionMessage = JSON.parse(jsonStr) as CompletionMessage;
            this.emit('completion-message', completionMessage);
          } catch (error) {
            console.error('Failed to parse COMPLETE message:', error);
          }
        } else if (line.startsWith('\x00[COMM]')) {
          const jsonStr = line.slice(7); // Remove \x00[COMM] prefix
          try {
            const commMessage = JSON.parse(jsonStr) as CommMessage;
            this.emit('comm-message', commMessage);
          } catch (error) {
            console.error('Failed to parse COMM message:', error);
          }
        } else if (line.startsWith('\x00[AUTH]')) {
          const jsonStr = line.slice(7); // Remove \x00[AUTH] prefix
          try {
            const authMessage = JSON.parse(jsonStr) as AuthResponseMessage;
            this.emit('auth-response', authMessage);
          } catch (error) {
            console.error('Failed to parse AUTH message:', error);
          }
        } else if (line.startsWith('\x00[COMBAT]')) {
          const jsonStr = line.slice(9); // Remove \x00[COMBAT] prefix
          try {
            const combatMessage = JSON.parse(jsonStr) as CombatMessage;
            this.emit('combat-message', combatMessage);
          } catch (error) {
            console.error('Failed to parse COMBAT message:', error);
          }
        } else if (line.startsWith('\x00[SOUND]')) {
          const jsonStr = line.slice(8); // Remove \x00[SOUND] prefix
          try {
            const soundMessage = JSON.parse(jsonStr) as SoundMessage;
            this.emit('sound-message', soundMessage);
          } catch (error) {
            console.error('Failed to parse SOUND message:', error);
          }
        } else if (line.startsWith('\x00[GIPHY]')) {
          const jsonStr = line.slice(8); // Remove \x00[GIPHY] prefix
          try {
            const giphyMessage = JSON.parse(jsonStr) as GiphyMessage;
            this.emit('giphy-message', giphyMessage);
          } catch (error) {
            console.error('Failed to parse GIPHY message:', error);
          }
        } else if (line.startsWith('\x00[SESSION]')) {
          const jsonStr = line.slice(10); // Remove \x00[SESSION] prefix
          try {
            const sessionMessage = JSON.parse(jsonStr);
            if (sessionMessage.type === 'session_token') {
              this.handleSessionToken(sessionMessage as SessionTokenMessage);
            } else if (sessionMessage.type === 'session_resume' || sessionMessage.type === 'session_invalid') {
              this.handleSessionResume(sessionMessage as SessionResumeMessage);
            }
          } catch (error) {
            console.error('Failed to parse SESSION message:', error);
          }
        } else if (line.startsWith('\x00[TIME]')) {
          const jsonStr = line.slice(7); // Remove \x00[TIME] prefix
          try {
            const timeMessage = JSON.parse(jsonStr) as TimeMessage;
            // Use the last measured RTT latency (from TIME_PONG responses)
            timeMessage.latencyMs = this.lastMeasuredLatency;
            this.emit('time-message', timeMessage);

            // Send ACK with timestamp for RTT measurement
            this.sendTimeAck();
          } catch {
            // Ignore parse errors - still serves as keepalive
          }
        } else if (line.startsWith('\x00[TIME_PONG]')) {
          // Server echoed our timestamp - calculate RTT
          const timestampStr = line.slice(12); // Remove \x00[TIME_PONG] prefix
          const sentTime = parseInt(timestampStr, 10);
          if (!isNaN(sentTime)) {
            this.lastMeasuredLatency = Date.now() - sentTime;
          }
        } else {
          this.emit('message', line);
        }
      }
    };
  }

  /**
   * Schedule a reconnection attempt.
   * Uses exponential backoff with jitter, capped at maxReconnectDelay.
   */
  private scheduleReconnect(reason?: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setConnectionState('failed');
      this.emit('reconnect-failed', {
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
        reason: reason || 'Max reconnection attempts reached',
      } as ReconnectProgress);
      this.emit('error', 'Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer !== null) {
      return; // Already scheduled
    }

    // Calculate delay with exponential backoff, capped at max
    const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    const cappedDelay = Math.min(baseDelay, this.maxReconnectDelay);

    // Add jitter (±20%) to prevent thundering herd
    const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);
    const finalDelay = Math.round(cappedDelay + jitter);

    this.reconnectAttempts++;
    this.setConnectionState('reconnecting');

    // Emit progress event so UI can show feedback
    this.emit('reconnect-progress', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delayMs: finalDelay,
      reason,
    } as ReconnectProgress);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.createConnection();
    }, finalDelay);
  }

  /**
   * Cancel any pending reconnection.
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Send a message to the server.
   * If disconnected but reconnecting, queues the message for later delivery.
   */
  send(message: string): void {
    if (!this.isConnected) {
      // Queue the message if we're trying to reconnect
      if (this._connectionState === 'reconnecting' || this._connectionState === 'connecting') {
        this.queueMessage(message);
      } else {
        this.emit('error', 'Not connected');
      }
      return;
    }

    try {
      this.socket!.send(message + '\n');
    } catch (error) {
      this.emit('error', `Failed to send: ${error}`);
      // Queue the message in case we reconnect
      this.queueMessage(message);
    }
  }

  /**
   * Queue a message for later delivery when reconnected.
   */
  private queueMessage(message: string): void {
    if (this.messageQueue.length >= this.maxQueueSize) {
      // Remove oldest message to make room
      this.messageQueue.shift();
      console.warn('Message queue full, dropping oldest message');
    }
    this.messageQueue.push(message);
    this.emit('message-queued', message, this.messageQueue.length);
  }

  /**
   * Flush all queued messages after reconnection.
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) {
      return;
    }

    const count = this.messageQueue.length;
    console.log(`Flushing ${count} queued messages`);

    // Send all queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      try {
        this.socket!.send(message + '\n');
      } catch (error) {
        console.error('Failed to send queued message:', error);
        // Put it back if send failed
        this.messageQueue.unshift(message);
        break;
      }
    }

    this.emit('queue-flushed', count);
  }

  /**
   * Send an IDE message to the server.
   */
  sendIdeMessage(message: IdeMessage): void {
    if (!this.isConnected) {
      this.emit('error', 'Not connected');
      return;
    }

    try {
      const jsonStr = JSON.stringify(message);
      this.socket!.send(`\x00[IDE]${jsonStr}\n`);
    } catch (error) {
      this.emit('error', `Failed to send IDE message: ${error}`);
    }
  }

  /**
   * Send a GUI message to the server.
   */
  sendGUIMessage(message: GUIMessage): void {
    if (!this.isConnected) {
      this.emit('error', 'Not connected');
      return;
    }

    try {
      const jsonStr = JSON.stringify(message);
      this.socket!.send(`\x00[GUI]${jsonStr}\n`);
    } catch (error) {
      this.emit('error', `Failed to send GUI message: ${error}`);
    }
  }

  /**
   * Send a completion request to the server.
   */
  sendCompletionRequest(prefix: string): void {
    if (!this.isConnected) {
      return; // Silently fail - not an error condition
    }

    try {
      const message = { prefix };
      const jsonStr = JSON.stringify(message);
      this.socket!.send(`\x00[COMPLETE]${jsonStr}\n`);
    } catch (error) {
      console.error('Failed to send completion request:', error);
    }
  }

  /**
   * Send an authentication request to the server (for launcher login/registration).
   */
  sendAuthRequest(request: AuthRequest): void {
    if (!this.isConnected) {
      this.emit('error', 'Not connected');
      return;
    }

    try {
      const jsonStr = JSON.stringify(request);
      this.socket!.send(`\x00[AUTH_REQ]${jsonStr}\n`);
    } catch (error) {
      this.emit('error', `Failed to send auth request: ${error}`);
    }
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    // Set intentional disconnect flag BEFORE closing
    // This prevents the close handler from trying to reconnect
    this.intentionalDisconnect = true;
    this.cancelReconnect();

    if (this.socket) {
      try {
        this.socket.close(1000, 'Client disconnect');
      } catch {
        // Ignore close errors
      }
      this.socket = null;
    }

    this.setConnectionState('disconnected');

    // Clear session on intentional disconnect
    this.clearSession();
  }

  /**
   * Manually trigger a reconnection attempt.
   * Useful when the user wants to retry after max attempts.
   */
  reconnect(): void {
    if (this.socket) {
      this.disconnect();
    }

    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this._connectionState = 'disconnected';
    this.createConnection();
  }

  /**
   * Set reconnection options.
   */
  setReconnectOptions(maxAttempts: number, baseDelay: number, maxDelay?: number): void {
    this.maxReconnectAttempts = maxAttempts;
    this.reconnectDelay = baseDelay;
    if (maxDelay !== undefined) {
      this.maxReconnectDelay = maxDelay;
    }
  }

  /**
   * Set the maximum message queue size.
   */
  setMaxQueueSize(size: number): void {
    this.maxQueueSize = Math.max(1, size);
  }

  /**
   * Handle a session token message from the server.
   * Stores the token for use during reconnection.
   */
  private handleSessionToken(message: SessionTokenMessage): void {
    this.sessionToken = message.token;
    this.sessionExpiresAt = message.expiresAt;

    // Store in sessionStorage for page refresh recovery
    try {
      sessionStorage.setItem('mudforge_session_token', message.token);
      sessionStorage.setItem('mudforge_session_expires', String(message.expiresAt));
    } catch {
      // sessionStorage might not be available (private browsing, etc.)
    }

    this.emit('session-token', message);
  }

  /**
   * Handle a session resume response from the server.
   */
  private handleSessionResume(message: SessionResumeMessage): void {
    if (message.type === 'session_invalid') {
      // Session was invalid, clear it
      this.clearSession();
    }
    this.emit('session-resume', message);
  }

  /**
   * Send a session resume request to the server.
   * Called automatically on reconnection if we have a valid session.
   */
  private sendSessionResume(): void {
    if (!this.sessionToken || !this.isConnected) {
      return;
    }

    try {
      const message = JSON.stringify({
        type: 'session_resume',
        token: this.sessionToken,
      });
      this.socket!.send(`\x00[SESSION]${message}\n`);
    } catch (error) {
      console.error('Failed to send session resume:', error);
    }
  }

  /**
   * Clear the stored session token.
   */
  private clearSession(): void {
    this.sessionToken = null;
    this.sessionExpiresAt = 0;

    try {
      sessionStorage.removeItem('mudforge_session_token');
      sessionStorage.removeItem('mudforge_session_expires');
    } catch {
      // Ignore sessionStorage errors
    }
  }

  /**
   * Load session token from sessionStorage (for page refresh recovery).
   * Called during initialization if needed.
   */
  loadSessionFromStorage(): void {
    try {
      const token = sessionStorage.getItem('mudforge_session_token');
      const expires = sessionStorage.getItem('mudforge_session_expires');

      if (token && expires) {
        const expiresAt = parseInt(expires, 10);
        if (Date.now() < expiresAt) {
          this.sessionToken = token;
          this.sessionExpiresAt = expiresAt;
        } else {
          // Expired, clear it
          this.clearSession();
        }
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }

  /**
   * Send a TIME acknowledgment to the server.
   * Includes current timestamp for RTT measurement.
   */
  private sendTimeAck(): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    try {
      // Include timestamp so server can echo it back for RTT calculation
      this.socket.send(`\x00[TIME_ACK]${Date.now()}\n`);
    } catch {
      // Ignore send errors - if socket is dead, close event will handle it
    }
  }

}

export default WebSocketClient;
