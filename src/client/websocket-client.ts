/**
 * WebSocketClient - Handles WebSocket connection to the MUD server.
 *
 * Provides connection management, auto-reconnect, and message handling.
 */

/* global sessionStorage */

// Protocol message types - canonical definitions in shared module
// Re-exported for consumers that import from websocket-client.ts
export type {
  MapMessage,
  EquipmentSlotData,
  StatsMessage,
  StatsDeltaMessage,
  StatsUpdate,
  EquipmentMessage,
  CompletionMessage,
  IdeMessage,
  GUIMessage,
  AuthRequest,
  AuthResponseMessage,
  QuestMessage,
  CommType,
  CommMessage,
  CombatTargetUpdateMessage,
  CombatHealthUpdateMessage,
  CombatTargetClearMessage,
  CombatMessage,
  SoundCategory,
  SoundMessage,
  GiphyMessage,
  SessionTokenMessage,
  SessionResumeMessage,
  TimeMessage,
  GameTimeMessage,
} from '../shared/protocol-types.js';

import type {
  SessionTokenMessage,
  SessionResumeMessage,
  TimeMessage,
} from '../shared/protocol-types.js';

import { parseProtocolMessage } from './protocol-parser.js';

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
  | 'equipment-message'
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
  | 'time-message'
  | 'gametime-message'
  | 'connection-stale'
  | 'latency-update';

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
  private reconnectDelay: number = 1000;
  private maxReconnectDelay: number = 300000; // 5 minutes max backoff
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

  // Track when we last received a TIME message (informational only, not used for stale detection)
  // Note: Client-side stale detection via timers is unreliable due to browser timer throttling
  // when tabs are backgrounded. We trust the server's RFC 6455 ping/pong mechanism instead.
  private lastTimeReceived: number = Date.now();

  // Track whether browser event handlers have been set up (to prevent duplicates on reconnect)
  private visibilityHandlerSetup: boolean = false;
  private networkHandlerSetup: boolean = false;


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
   * Get the current measured latency in milliseconds.
   */
  get latency(): number {
    return this.lastMeasuredLatency;
  }

  /**
   * Get milliseconds since last TIME message was received.
   */
  get timeSinceLastHeartbeat(): number {
    return Date.now() - this.lastTimeReceived;
  }

  /**
   * Set the connection state and emit state-change event.
   */
  private setConnectionState(newState: ConnectionState): void {
    const oldState = this._connectionState;
    if (oldState !== newState) {
      console.log(`[WS-STATE] ${oldState} -> ${newState} at ${new Date().toISOString()}`);
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
   * Set up visibility change handler.
   * - Notifies server when tab is hidden/visible so it can pause/resume updates
   * - Speeds up reconnection when tab becomes visible if already disconnected
   */
  private setupVisibilityHandler(): void {
    document.addEventListener('visibilitychange', () => {
      const isHidden = document.hidden;
      console.log(`[WS-VISIBILITY] Document visibility: ${isHidden ? 'hidden' : 'visible'}, state=${this._connectionState}`);

      if (isHidden) {
        // Tab became hidden - tell server to pause high-frequency updates
        // This prevents buffer buildup while the tab is backgrounded
        this.sendVisibilityState(false);
      } else {
        // Tab became visible
        this.sendVisibilityState(true);

        // Mobile stale detection: if we haven't received a TIME message in >30s,
        // the connection is likely dead. Close and reconnect immediately.
        // This avoids reliance on throttled timers (which don't run on mobile when backgrounded).
        if (this._connectionState === 'connected') {
          const timeSinceHeartbeat = Date.now() - this.lastTimeReceived;
          if (timeSinceHeartbeat > 30000) {
            console.warn(`[WS-VISIBILITY] Stale connection detected: ${timeSinceHeartbeat}ms since last heartbeat, forcing reconnect`);
            this.emit('connection-stale');
            if (this.socket) {
              try { this.socket.close(4000, 'Stale after visibility change'); } catch { /* ignore */ }
              this.socket = null;
            }
            this.reconnectAttempts = 0;
            this.createConnection();
            return;
          }
        }

        // If we're not connected, try to reconnect immediately
        if (this._connectionState !== 'connected' && this._connectionState !== 'connecting' && !this.intentionalDisconnect) {
          console.log(`[WS-VISIBILITY] Tab visible while ${this._connectionState}, attempting reconnect`);
          this.reconnectAttempts = 0;
          this.cancelReconnect();
          this.createConnection();
        }
      }
    });
  }

  /**
   * Send visibility state to server.
   * Server uses this to pause/resume high-frequency updates like STATS.
   */
  private sendVisibilityState(visible: boolean): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    try {
      const message = JSON.stringify({ visible });
      this.socket.send(`\x00[VISIBILITY]${message}\n`);
      console.log(`[WS-VISIBILITY] Sent visibility state: ${visible ? 'visible' : 'hidden'}`);
    } catch {
      // Ignore send errors - connection might be closing
    }
  }

  /**
   * Set up network change handler.
   * Only triggers reconnect if already in a bad state.
   * Does NOT proactively kill connections - trust server's ping/pong.
   */
  private setupNetworkHandler(): void {
    // Navigator.connection is experimental and not available in all browsers
    const nav = navigator as Navigator & {
      connection?: EventTarget & {
        addEventListener: (type: string, listener: () => void) => void;
      };
    };
    const connection = nav.connection;
    if (connection) {
      connection.addEventListener('change', () => {
        console.log(`[WS-NETWORK] Network changed, online=${navigator.onLine}, state=${this._connectionState}`);
        // Network changed - only act if already disconnected
        if (this._connectionState === 'reconnecting' || this._connectionState === 'failed') {
          console.log('[WS-NETWORK] Network changed, attempting reconnect');
          this.reconnectAttempts = 0;
          this.cancelReconnect();
          this.createConnection();
        }
        // DO NOT proactively kill connections - trust server's ping/pong
      });
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
    this.lastTimeReceived = Date.now(); // Reset on new connection
    this.setConnectionState('connecting');

    // Set up browser event handlers (only once per WebSocketClient instance)
    if (!this.visibilityHandlerSetup) {
      this.setupVisibilityHandler();
      this.visibilityHandlerSetup = true;
    }
    if (!this.networkHandlerSetup) {
      this.setupNetworkHandler();
      this.networkHandlerSetup = true;
    }

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
      console.log(`[WS-OPEN] Connected at ${new Date().toISOString()}`);
      this.reconnectAttempts = 0;
      this.lastTimeReceived = Date.now(); // Reset heartbeat tracking
      this.setConnectionState('connected');
      this.emit('connected');

      // If we have a valid session token, attempt to resume
      // Don't flush queue here - wait for session resume response
      if (this.hasValidSession) {
        this.sendSessionResume();
      } else {
        // No session to resume, flush immediately
        this.flushMessageQueue();
      }
    };

    this.socket.onclose = (event) => {
      console.log(`[WS-CLOSE] code=${event.code}, reason="${event.reason}", wasClean=${event.wasClean} at ${new Date().toISOString()}`);
      console.log(`[WS-CLOSE] Close code meanings: 1000=normal, 1001=going-away, 1005=no-status, 1006=abnormal`);
      const reason = event.reason || `Code ${event.code}`;
      this.emit('disconnected', reason);
      this.socket = null;

      // Only skip reconnect if the user explicitly called disconnect()
      if (this.intentionalDisconnect) {
        console.log(`[WS-CLOSE] Intentional disconnect, not reconnecting`);
        this.setConnectionState('disconnected');
        return;
      }

      // Reconnect for all close codes:
      // - 1000: Normal close (server restart, maintenance)
      // - 1001: Going away (server shutdown, browser navigation)
      // - 1005: No status code (server crash, network issue)
      // - 1006: Abnormal closure (network error)
      // - 4000: Client-detected stale connection
      // - Any other code: unexpected disconnect
      this.scheduleReconnect(reason);
    };

    this.socket.onerror = (event) => {
      console.error(`[WS-ERROR] Error at ${new Date().toISOString()}:`, event);
      this.emit('error', 'WebSocket error');
    };

    this.socket.onmessage = (event) => {
      const data = event.data.toString();
      const lines = data.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === lines.length - 1 && line.length === 0) continue;

        const parsed = parseProtocolMessage(line);

        if (!parsed) {
          // Plain text message
          this.emit('message', line);
          continue;
        }

        // Special handling for messages that need more than parse-and-emit
        if (parsed.event === 'session-message' && parsed.data) {
          const sessionMessage = parsed.data as { type: string };
          if (sessionMessage.type === 'session_token') {
            this.handleSessionToken(sessionMessage as SessionTokenMessage);
          } else if (sessionMessage.type === 'session_resume' || sessionMessage.type === 'session_invalid') {
            this.handleSessionResume(sessionMessage as SessionResumeMessage);
          }
        } else if (parsed.event === 'time-message') {
          const now = Date.now();
          const timeSinceLast = now - this.lastTimeReceived;
          console.log(`[WS-TIME] Received TIME message, ${timeSinceLast}ms since last`);
          if (timeSinceLast > 60000) {
            console.warn(`[WS-TIME-GAP] Large gap: ${timeSinceLast}ms since last TIME message`);
          }
          this.lastTimeReceived = now;
          if (parsed.data) {
            const timeMessage = parsed.data as TimeMessage;
            timeMessage.latencyMs = this.lastMeasuredLatency;
            this.emit('time-message', timeMessage);
          }
          this.sendTimeAck();
        } else if (parsed.event === 'time-pong') {
          const sentTime = parseInt(parsed.raw, 10);
          if (!isNaN(sentTime)) {
            this.lastMeasuredLatency = Date.now() - sentTime;
            this.emit('latency-update', this.lastMeasuredLatency);
          }
        } else if (parsed.data) {
          // Standard protocol messages: just emit
          this.emit(parsed.event as WebSocketClientEvent, parsed.data);
        }
      }
    };
  }

  /**
   * Schedule a reconnection attempt.
   * Uses exponential backoff with jitter, capped at maxReconnectDelay.
   * Reconnects indefinitely for network issues -- 'failed' state is reserved
   * for server-side rejection (e.g., auth failure).
   */
  private scheduleReconnect(reason?: string): void {
    console.log(`[WS-RECONNECT] Scheduling reconnect #${this.reconnectAttempts + 1}, reason: ${reason}`);

    if (this.reconnectTimer !== null) {
      console.log(`[WS-RECONNECT] Reconnect already scheduled, skipping`);
      return; // Already scheduled
    }

    // Calculate delay with exponential backoff, capped at max
    const baseDelay = this.reconnectDelay * Math.pow(2, Math.min(this.reconnectAttempts, 20));
    const cappedDelay = Math.min(baseDelay, this.maxReconnectDelay);

    // Add jitter (±20%) to prevent thundering herd
    const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);
    const finalDelay = Math.round(cappedDelay + jitter);

    this.reconnectAttempts++;
    this.setConnectionState('reconnecting');

    console.log(`[WS-RECONNECT] Attempt #${this.reconnectAttempts} scheduled in ${finalDelay}ms`);

    // Emit progress event so UI can show feedback
    this.emit('reconnect-progress', {
      attempt: this.reconnectAttempts,
      maxAttempts: Infinity,
      delayMs: finalDelay,
      reason,
    } as ReconnectProgress);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      console.log(`[WS-RECONNECT] Attempting reconnect #${this.reconnectAttempts}`);
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
   * @returns true if sent immediately, false if queued or failed
   */
  send(message: string): boolean {
    if (!this.isConnected) {
      // Queue the message if we're trying to reconnect
      if (this._connectionState === 'reconnecting' || this._connectionState === 'connecting') {
        this.queueMessage(message);
        return false;
      } else {
        this.emit('error', 'Not connected');
        return false;
      }
    }

    try {
      this.socket!.send(message + '\n');
      return true;
    } catch (error) {
      this.emit('error', `Failed to send: ${error}`);
      // Queue the message in case we reconnect
      this.queueMessage(message);
      return false;
    }
  }

  /**
   * Queue a message for later delivery when reconnected.
   */
  private queueMessage(message: string): void {
    console.log(`[WS-QUEUE] Queueing message (${this.messageQueue.length + 1} in queue)`);
    if (this.messageQueue.length >= this.maxQueueSize) {
      // Remove oldest message to make room
      this.messageQueue.shift();
      console.warn(`[WS-QUEUE-FULL] Message queue full, dropping oldest message`);
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
    console.log(`[WS-QUEUE] Flushing ${count} queued messages`);

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
    this.setConnectionState('disconnected'); // Use setter to emit state-change event
    this.createConnection();
  }

  /**
   * Set reconnection options.
   */
  setReconnectOptions(_maxAttempts: number, baseDelay: number, maxDelay?: number): void {
    // maxAttempts is ignored -- reconnection is now indefinite
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

    // Flush queue after session resume completes (success or failure)
    // This ensures queued commands execute AFTER authentication is resolved
    this.flushMessageQueue();
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
