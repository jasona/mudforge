/**
 * SharedWorkerWebSocketClient - WebSocket client using SharedWorker for connection persistence.
 *
 * This class provides the same interface as WebSocketClient but uses a SharedWorker
 * to maintain the WebSocket connection. The SharedWorker runs in a separate thread
 * that is NOT subject to browser throttling when tabs are backgrounded.
 *
 * Benefits:
 * - Connection survives tab backgrounding (Chrome throttles to 1 request/minute after 5 min)
 * - Server heartbeats continue working
 * - Multiple tabs share a single connection
 *
 * Fallback:
 * - On browsers without SharedWorker support (mobile browsers), this exports the
 *   regular WebSocketClient instead.
 */

// Re-export all types from websocket-client for consumers
export type { ConnectionState, ReconnectProgress } from './websocket-client.js';
export type {
  MapMessage,
  SessionTokenMessage,
  SessionResumeMessage,
  TimeMessage,
  EquipmentSlotData,
  StatsMessage,
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
  CombatTargetClearMessage,
  CombatMessage,
  SoundCategory,
  SoundMessage,
  GiphyMessage,
} from './websocket-client.js';

import type {
  ConnectionState,
  ReconnectProgress,
} from './websocket-client.js';

import type {
  SessionTokenMessage,
  SessionResumeMessage,
  TimeMessage,
  IdeMessage,
  GUIMessage,
} from '../shared/protocol-types.js';

import { parseProtocolMessage } from './protocol-parser.js';

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
  | 'connection-stale'
  | 'latency-update';

/**
 * Event handler type.
 */
type EventHandler = (...args: unknown[]) => void;

/**
 * Message from the SharedWorker.
 */
interface WorkerMessage {
  type: string;
  tabId?: string;
  state?: ConnectionState;
  code?: number;
  reason?: string;
  data?: string;
  error?: string;
  attempt?: number;
  maxAttempts?: number;
  delayMs?: number;
}

/**
 * Check if SharedWorker is supported.
 */
function isSharedWorkerSupported(): boolean {
  return typeof SharedWorker !== 'undefined';
}

/**
 * SharedWorker-based WebSocket client.
 * Provides the same API as WebSocketClient but delegates to a SharedWorker.
 */
export class SharedWorkerWebSocketClient {
  private worker: SharedWorker | null = null;
  private port: MessagePort | null = null;
  private url: string = '';
  private handlers: Map<WebSocketClientEvent, Set<EventHandler>> = new Map();
  private _connectionState: ConnectionState = 'disconnected';
  private tabId: string = '';

  // Message queue for commands sent while disconnected
  private messageQueue: string[] = [];
  private maxQueueSize: number = 50;

  // Session token for reconnection without re-auth
  private sessionToken: string | null = null;
  private sessionExpiresAt: number = 0;

  // Latency measurement
  private lastMeasuredLatency: number = 0;

  // Track last TIME message for heartbeat info
  private lastTimeReceived: number = Date.now();

  // Track whether handlers are set up
  private visibilityHandlerSetup: boolean = false;

  // Worker health check
  private _workerPongReceived: boolean = false;

  /**
   * Check if connected.
   */
  get isConnected(): boolean {
    return this._connectionState === 'connected';
  }

  /**
   * Check if connecting.
   */
  get isConnecting(): boolean {
    return this._connectionState === 'connecting';
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
      console.log(`[SharedWS] State: ${oldState} -> ${newState}`);
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
   */
  private setupVisibilityHandler(): void {
    document.addEventListener('visibilitychange', () => {
      const isHidden = document.hidden;
      console.log(`[SharedWS] Visibility: ${isHidden ? 'hidden' : 'visible'}`);

      // Notify the worker of visibility change
      this.sendToWorker({ type: 'visibility', visible: !isHidden });

      // Also send to server via the connection
      if (this.isConnected) {
        this.sendVisibilityState(!isHidden);
      }

      // When tab becomes visible, verify the worker is alive
      // If the worker died (browser killed it during sleep), we need to recreate it
      if (!isHidden) {
        this.verifyWorkerAlive();
      }
    });
  }

  /**
   * Verify the SharedWorker is still alive by pinging it.
   * If no response within 3 seconds, recreate the worker.
   */
  private verifyWorkerAlive(): void {
    this._workerPongReceived = false;
    this.sendToWorker({ type: 'ping' });

    setTimeout(() => {
      if (!this._workerPongReceived) {
        console.warn('[SharedWS] Worker not responding, recreating');
        this.setConnectionState('disconnected');
        this.recreateWorker();
      }
    }, 3000);
  }

  /**
   * Recreate the SharedWorker if it died.
   */
  private recreateWorker(): void {
    console.log('[SharedWS] Recreating SharedWorker');

    // Clean up old port
    if (this.port) {
      this.port.onmessage = null;
      this.port = null;
    }

    // Create new worker using same params as connect()
    try {
      this.worker = new SharedWorker(new URL('./shared-websocket-worker.js', import.meta.url), {
        type: 'module',
        name: 'mudforge-websocket',
      });
      this.port = this.worker.port;
      this.setupWorkerHandlers();
      this.port.start();

      // Reconnect if we had a URL
      if (this.url) {
        this.sendToWorker({ type: 'connect', url: this.url });
      }
    } catch (error) {
      console.error('[SharedWS] Failed to recreate worker:', error);
    }
  }

  /**
   * Send visibility state to server.
   */
  private sendVisibilityState(visible: boolean): void {
    if (!this.isConnected) return;

    try {
      const message = JSON.stringify({ visible });
      this.sendToWorker({ type: 'send', data: `\x00[VISIBILITY]${message}\n` });
    } catch {
      // Ignore
    }
  }

  /**
   * Send a message to the SharedWorker.
   */
  private sendToWorker(message: object): void {
    if (this.port) {
      this.port.postMessage(JSON.stringify(message));
    }
  }

  /**
   * Connect to the server.
   */
  connect(url: string): void {
    this.url = url;
    this.lastTimeReceived = Date.now();

    // Set up visibility handler
    if (!this.visibilityHandlerSetup) {
      this.setupVisibilityHandler();
      this.visibilityHandlerSetup = true;
    }

    // Create the SharedWorker
    try {
      // The worker script URL - built by esbuild to dist/client/
      this.worker = new SharedWorker(new URL('./shared-websocket-worker.js', import.meta.url), {
        type: 'module',
        name: 'mudforge-websocket',
      });

      this.port = this.worker.port;
      this.setupWorkerHandlers();
      this.port.start();

      // Tell the worker to connect
      this.sendToWorker({ type: 'connect', url });
    } catch (error) {
      console.error('[SharedWS] Failed to create SharedWorker:', error);
      this.emit('error', `Failed to create SharedWorker: ${error}`);
    }
  }

  /**
   * Set up handlers for messages from the SharedWorker.
   */
  private setupWorkerHandlers(): void {
    if (!this.port) return;

    this.port.onmessage = (event) => {
      try {
        const message: WorkerMessage = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        switch (message.type) {
          case 'tabId':
            this.tabId = message.tabId || '';
            console.log(`[SharedWS] Assigned tabId: ${this.tabId}`);
            break;

          case 'state':
            if (message.state) {
              this.setConnectionState(message.state);
            }
            break;

          case 'connecting':
            this.emit('connecting');
            break;

          case 'open':
            this.emit('connected');
            // If we have a valid session token, attempt to resume
            if (this.hasValidSession) {
              this.sendSessionResume();
            } else {
              this.flushMessageQueue();
            }
            break;

          case 'close':
            this.emit('disconnected', message.reason || `Code ${message.code}`);
            break;

          case 'error':
            this.emit('error', message.error || 'Unknown error');
            break;

          case 'message':
            if (message.data) {
              this.handleServerMessage(message.data);
            }
            break;

          case 'queue':
            // Worker says we should queue this message
            if (message.data) {
              this.queueMessage(message.data);
            }
            break;

          case 'reconnect-progress':
            this.emit('reconnect-progress', {
              attempt: message.attempt,
              maxAttempts: message.maxAttempts,
              delayMs: message.delayMs,
            } as ReconnectProgress);
            break;

          case 'reconnect-failed':
            this.emit('reconnect-failed', {
              attempt: message.attempt,
              maxAttempts: message.maxAttempts,
              reason: message.reason,
            } as ReconnectProgress);
            this.emit('error', 'Max reconnection attempts reached');
            break;

          case 'connection-stale':
            this.emit('connection-stale');
            break;

          case 'pong':
            this._workerPongReceived = true;
            break;
        }
      } catch (error) {
        console.error('[SharedWS] Error handling worker message:', error);
      }
    };

    this.port.onmessageerror = (error) => {
      console.error('[SharedWS] Worker message error:', error);
    };
  }

  /**
   * Handle a message from the server (forwarded by the worker).
   */
  private handleServerMessage(data: string): void {
    const lines = data.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === lines.length - 1 && line.length === 0) continue;

      const parsed = parseProtocolMessage(line);

      if (!parsed) {
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
  }

  /**
   * Send a message to the server.
   */
  send(message: string): boolean {
    if (!this.isConnected) {
      if (this._connectionState === 'reconnecting' || this._connectionState === 'connecting') {
        this.queueMessage(message);
        return false;
      }
      this.emit('error', 'Not connected');
      return false;
    }

    this.sendToWorker({ type: 'send', data: message + '\n' });
    return true;
  }

  /**
   * Queue a message for later delivery.
   */
  private queueMessage(message: string): void {
    console.log(`[SharedWS] Queueing message (${this.messageQueue.length + 1} in queue)`);
    if (this.messageQueue.length >= this.maxQueueSize) {
      this.messageQueue.shift();
      console.warn('[SharedWS] Queue full, dropping oldest');
    }
    this.messageQueue.push(message);
    this.emit('message-queued', message, this.messageQueue.length);
  }

  /**
   * Flush all queued messages.
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    const count = this.messageQueue.length;
    console.log(`[SharedWS] Flushing ${count} queued messages`);

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.sendToWorker({ type: 'send', data: message + '\n' });
    }

    this.emit('queue-flushed', count);
  }

  /**
   * Send an IDE message.
   */
  sendIdeMessage(message: IdeMessage): void {
    if (!this.isConnected) {
      this.emit('error', 'Not connected');
      return;
    }
    const jsonStr = JSON.stringify(message);
    this.sendToWorker({ type: 'send', data: `\x00[IDE]${jsonStr}\n` });
  }

  /**
   * Send a GUI message.
   */
  sendGUIMessage(message: GUIMessage): void {
    if (!this.isConnected) {
      this.emit('error', 'Not connected');
      return;
    }
    const jsonStr = JSON.stringify(message);
    this.sendToWorker({ type: 'send', data: `\x00[GUI]${jsonStr}\n` });
  }

  /**
   * Send a completion request.
   */
  sendCompletionRequest(prefix: string): void {
    if (!this.isConnected) return;
    const message = { prefix };
    const jsonStr = JSON.stringify(message);
    this.sendToWorker({ type: 'send', data: `\x00[COMPLETE]${jsonStr}\n` });
  }

  /**
   * Send an auth request.
   */
  sendAuthRequest(request: { type: string; name?: string; password?: string; confirmPassword?: string; email?: string; gender?: string; avatar?: string }): void {
    if (!this.isConnected) {
      this.emit('error', 'Not connected');
      return;
    }
    const jsonStr = JSON.stringify(request);
    this.sendToWorker({ type: 'send', data: `\x00[AUTH_REQ]${jsonStr}\n` });
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    this.sendToWorker({ type: 'disconnect' });
    this.setConnectionState('disconnected');
    this.clearSession();
  }

  /**
   * Manually trigger reconnection.
   */
  reconnect(): void {
    this.sendToWorker({ type: 'reconnect' });
  }

  /**
   * Set reconnection options.
   * Note: These are handled by the SharedWorker, so this is a no-op for now.
   */
  setReconnectOptions(_maxAttempts: number, _baseDelay: number, _maxDelay?: number): void {
    // Reconnection is handled by the SharedWorker
    // Could add a message to configure the worker if needed
  }

  /**
   * Set the maximum message queue size.
   */
  setMaxQueueSize(size: number): void {
    this.maxQueueSize = Math.max(1, size);
  }

  /**
   * Handle session token from server.
   */
  private handleSessionToken(message: SessionTokenMessage): void {
    this.sessionToken = message.token;
    this.sessionExpiresAt = message.expiresAt;

    try {
      sessionStorage.setItem('mudforge_session_token', message.token);
      sessionStorage.setItem('mudforge_session_expires', String(message.expiresAt));
    } catch {
      // Ignore
    }

    this.emit('session-token', message);
  }

  /**
   * Handle session resume response.
   */
  private handleSessionResume(message: SessionResumeMessage): void {
    if (message.type === 'session_invalid') {
      this.clearSession();
    }
    this.emit('session-resume', message);
    this.flushMessageQueue();
  }

  /**
   * Send session resume request.
   */
  private sendSessionResume(): void {
    if (!this.sessionToken || !this.isConnected) return;

    const message = JSON.stringify({
      type: 'session_resume',
      token: this.sessionToken,
    });
    this.sendToWorker({ type: 'send', data: `\x00[SESSION]${message}\n` });
  }

  /**
   * Clear stored session.
   */
  private clearSession(): void {
    this.sessionToken = null;
    this.sessionExpiresAt = 0;

    try {
      sessionStorage.removeItem('mudforge_session_token');
      sessionStorage.removeItem('mudforge_session_expires');
    } catch {
      // Ignore
    }
  }

  /**
   * Load session from storage.
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
          this.clearSession();
        }
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Send TIME acknowledgment for RTT measurement.
   */
  private sendTimeAck(): void {
    if (!this.isConnected) return;
    this.sendToWorker({ type: 'send', data: `\x00[TIME_ACK]${Date.now()}\n` });
  }
}

// Import the standard WebSocketClient for fallback
import { WebSocketClient as StandardWebSocketClient } from './websocket-client.js';

// Export the appropriate client based on browser support
// If SharedWorker is supported, use SharedWorkerWebSocketClient
// Otherwise, fall back to the regular WebSocketClient
const WebSocketClient: typeof SharedWorkerWebSocketClient | typeof StandardWebSocketClient =
  isSharedWorkerSupported() ? SharedWorkerWebSocketClient : StandardWebSocketClient;

// Log which implementation is being used (at runtime when module loads)
if (typeof window !== 'undefined') {
  if (isSharedWorkerSupported()) {
    console.log('[WebSocket] Using SharedWorker-based client for background persistence');
  } else {
    console.log('[WebSocket] SharedWorker not supported, using standard WebSocketClient');
  }
}

export { WebSocketClient };
export default WebSocketClient;
