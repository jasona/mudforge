/**
 * Grapevine WebSocket Client - Manages persistent WebSocket connection to Grapevine chat network.
 *
 * Features:
 * - Persistent WebSocket connection with auto-reconnect
 * - JSON message framing
 * - Automatic heartbeat response (required by Grapevine protocol)
 * - Event-based interface for message handling
 * - Connection state machine
 *
 * Protocol: https://grapevine.haus/docs
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import type { Logger } from 'pino';

/**
 * Grapevine client configuration.
 */
export interface GrapevineClientConfig {
  /** Client ID from Grapevine registration */
  clientId: string;
  /** Client secret from Grapevine registration */
  clientSecret: string;
  /** Initial channels to subscribe on connect */
  channels: string[];
  /** Game name for display */
  gameName?: string;
  /** Version string for user agent */
  version?: string;
  /** Reconnect delay in ms (default: 30000) */
  reconnectDelay?: number;
  /** Max reconnect attempts before giving up (default: 0 = infinite) */
  maxReconnectAttempts?: number;
  /** Connection timeout in ms (default: 30000) */
  connectionTimeout?: number;
  /** Logger instance */
  logger?: Logger;
  /** Function to get online player names for heartbeat */
  getOnlinePlayers?: () => string[];
}

/**
 * Connection states.
 */
export type GrapevineConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'reconnecting';

/**
 * Grapevine event message structure.
 */
export interface GrapevineEvent {
  event: string;
  ref?: string;
  status?: string;
  error?: string;
  payload?: Record<string, unknown>;
}

export interface GrapevineClientEvents {
  authenticated: () => void;
  disconnect: (reason: string) => void;
  error: (error: Error) => void;
  message: (event: GrapevineEvent) => void;
  stateChange: (state: GrapevineConnectionState) => void;
}

type EventArgs<T, K extends keyof T> = T[K] extends (...args: infer A) => void ? A : never;

/**
 * Channel broadcast payload.
 */
export interface ChannelBroadcast {
  channel: string;
  message: string;
  game: string;
  name: string;
}

/**
 * Pending request for tracking responses.
 */
interface PendingRequest {
  resolve: (result: boolean) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Grapevine WebSocket Client for chat channels.
 */
export class GrapevineClient extends EventEmitter {
  private config: Required<Omit<GrapevineClientConfig, 'logger' | 'getOnlinePlayers'>> & {
    logger: Logger | undefined;
    getOnlinePlayers: (() => string[]) | undefined;
  };
  private ws: WebSocket | null = null;
  private _state: GrapevineConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private pendingRequests: Map<string, PendingRequest> = new Map();

  onEvent<K extends keyof GrapevineClientEvents>(
    event: K,
    listener: (...args: EventArgs<GrapevineClientEvents, K>) => void
  ): this {
    this.on(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  emitEvent<K extends keyof GrapevineClientEvents>(
    event: K,
    ...args: EventArgs<GrapevineClientEvents, K>
  ): boolean {
    return this.emit(event as string, ...args);
  }

  private static readonly GRAPEVINE_URL = 'wss://grapevine.haus/socket';
  private static readonly REQUEST_TIMEOUT = 10000;

  constructor(config: GrapevineClientConfig) {
    super();
    this.config = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      channels: config.channels,
      gameName: config.gameName ?? 'MudForge',
      version: config.version ?? '1.0.0',
      reconnectDelay: config.reconnectDelay ?? 30000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 0,
      connectionTimeout: config.connectionTimeout ?? 30000,
      logger: config.logger,
      getOnlinePlayers: config.getOnlinePlayers,
    };
  }

  /**
   * Get current connection state.
   */
  get state(): GrapevineConnectionState {
    return this._state;
  }

  /**
   * Check if connected and authenticated.
   */
  get isConnected(): boolean {
    return this._state === 'connected';
  }

  /**
   * Connect to Grapevine.
   */
  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting' || this._state === 'authenticating') {
      return;
    }

    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    await this.doConnect();
  }

  /**
   * Disconnect from Grapevine.
   */
  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    this.clearTimers();
    this.clearPendingRequests('Disconnected');

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setState('disconnected');
    this.emitEvent('disconnect', 'Manual disconnect');
  }

  /**
   * Subscribe to a channel.
   */
  async subscribeChannel(channel: string): Promise<boolean> {
    if (this._state !== 'connected') {
      this.log('warn', `Cannot subscribe to channel ${channel}: not connected`);
      return false;
    }

    const ref = randomUUID();
    return this.sendWithResponse(
      {
        event: 'channels/subscribe',
        ref,
        payload: { channel },
      },
      ref
    );
  }

  /**
   * Unsubscribe from a channel.
   */
  async unsubscribeChannel(channel: string): Promise<boolean> {
    if (this._state !== 'connected') {
      this.log('warn', `Cannot unsubscribe from channel ${channel}: not connected`);
      return false;
    }

    const ref = randomUUID();
    return this.sendWithResponse(
      {
        event: 'channels/unsubscribe',
        ref,
        payload: { channel },
      },
      ref
    );
  }

  /**
   * Send a message to a channel.
   */
  sendChannelMessage(channel: string, playerName: string, message: string): boolean {
    if (this._state !== 'connected') {
      this.log('warn', `Cannot send message to channel ${channel}: not connected`);
      return false;
    }

    return this.send({
      event: 'channels/send',
      ref: randomUUID(),
      payload: {
        channel,
        name: playerName,
        message,
      },
    });
  }

  /**
   * Set the function to get online player names for heartbeat.
   */
  setGetOnlinePlayers(fn: () => string[]): void {
    this.config.getOnlinePlayers = fn;
  }

  /**
   * Internal connect implementation.
   */
  private async doConnect(): Promise<void> {
    this.setState('connecting');
    this.log('info', `Connecting to Grapevine at ${GrapevineClient.GRAPEVINE_URL}`);

    return new Promise<void>((resolve) => {
      this.ws = new WebSocket(GrapevineClient.GRAPEVINE_URL);

      // Set up connection timeout
      this.connectionTimer = setTimeout(() => {
        if (this._state === 'connecting') {
          this.log('warn', 'Connection timeout to Grapevine');
          this.ws?.close();
          this.handleConnectionFailure();
        }
      }, this.config.connectionTimeout);

      this.ws.on('open', () => {
        this.clearTimers();
        this.setState('authenticating');
        this.log('info', 'WebSocket connected, authenticating...');
        this.sendAuthentication();

        // Set authentication timeout
        this.connectionTimer = setTimeout(() => {
          if (this._state === 'authenticating') {
            this.log('warn', 'Authentication timeout - no response received');
            this.ws?.close();
            this.handleConnectionFailure();
          }
        }, 30000); // 30 second auth timeout

        resolve();
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        this.handleMessage(data);
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        const reasonStr = reason.toString() || `code ${code}`;
        this.log('info', `Connection closed: ${reasonStr}`);
        this.clearPendingRequests('Connection closed');

        if (this.shouldReconnect && (this._state === 'connected' || this._state === 'authenticating')) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (error: Error) => {
        this.log('error', `WebSocket error: ${error.message}`);
        this.emitEvent('error', error);
        if (this._state === 'connecting') {
          this.handleConnectionFailure();
          resolve();
        }
      });
    });
  }

  /**
   * Send authentication message.
   */
  private sendAuthentication(): void {
    this.send({
      event: 'authenticate',
      payload: {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        supports: ['channels'],
        channels: this.config.channels,
        version: this.config.version,
        user_agent: `${this.config.gameName} ${this.config.version}`,
      },
    });
  }

  /**
   * Handle incoming WebSocket message.
   */
  private handleMessage(data: WebSocket.RawData): void {
    try {
      const rawData = data.toString();
      this.log('debug', `Raw message received: ${rawData.substring(0, 500)}`);
      const message = JSON.parse(rawData) as GrapevineEvent;
      this.log('debug', `Parsed event: ${message.event}, status: ${message.status}`);

      // Handle authentication response
      if (message.event === 'authenticate') {
        this.clearTimers(); // Clear auth timeout
        // Success is indicated by absence of error, OR explicit status: 'success'
        if (!message.error && (message.status === 'success' || message.status === undefined)) {
          this.setState('connected');
          this.reconnectAttempts = 0;
          this.log('info', 'Authenticated with Grapevine');
          this.emitEvent('authenticated');
          // Also emit as message so daemon can handle channel registration
          this.emitEvent('message', message);
        } else {
          this.log('error', `Authentication failed: ${message.error || message.status || 'unknown error'}`);
          this.emitEvent('error', new Error(`Authentication failed: ${message.error || message.status}`));
          this.shouldReconnect = false;
          this.ws?.close();
        }
        return;
      }

      // Handle heartbeat - CRITICAL: must respond or get disconnected
      if (message.event === 'heartbeat') {
        this.handleHeartbeat();
        return;
      }

      // Handle responses to pending requests
      if (message.ref && this.pendingRequests.has(message.ref)) {
        const pending = this.pendingRequests.get(message.ref)!;
        this.pendingRequests.delete(message.ref);
        clearTimeout(pending.timeout);
        pending.resolve(message.status === 'success');
        return;
      }

      // Emit for daemon to handle
      this.emitEvent('message', message);
    } catch (error) {
      this.log('error', `Failed to parse message: ${error}`);
    }
  }

  /**
   * Handle heartbeat from server - must respond with player list.
   */
  private handleHeartbeat(): void {
    const players = this.config.getOnlinePlayers?.() ?? [];
    this.log('debug', `Heartbeat response with ${players.length} players`);

    this.send({
      event: 'heartbeat',
      payload: { players },
    });
  }

  /**
   * Send a message and wait for response.
   */
  private sendWithResponse(message: GrapevineEvent, ref: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(ref);
        reject(new Error('Request timeout'));
      }, GrapevineClient.REQUEST_TIMEOUT);

      this.pendingRequests.set(ref, { resolve, reject, timeout });

      if (!this.send(message)) {
        this.pendingRequests.delete(ref);
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }

  /**
   * Send a message to Grapevine.
   */
  private send(message: GrapevineEvent): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('warn', 'Cannot send message: WebSocket not open');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.log('debug', `Sent: ${message.event}`);
      return true;
    } catch (error) {
      this.log('error', `Failed to send message: ${error}`);
      return false;
    }
  }

  /**
   * Handle connection failure.
   */
  private handleConnectionFailure(): void {
    this.clearTimers();
    this.ws?.close();
    this.ws = null;
    this.clearPendingRequests('Connection failed');

    if (!this.shouldReconnect) {
      this.setState('disconnected');
      return;
    }

    this.reconnectAttempts++;

    if (
      this.config.maxReconnectAttempts > 0 &&
      this.reconnectAttempts >= this.config.maxReconnectAttempts
    ) {
      this.log('error', 'Max reconnect attempts reached');
      this.setState('disconnected');
      this.emitEvent('disconnect', 'Max reconnect attempts reached');
      return;
    }

    this.scheduleReconnect();
  }

  /**
   * Schedule a reconnection attempt.
   */
  private scheduleReconnect(): void {
    if (!this.shouldReconnect) {
      return;
    }

    this.setState('reconnecting');
    const delay = this.config.reconnectDelay;
    this.log('info', `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.doConnect();
    }, delay);
  }

  /**
   * Update connection state.
   */
  private setState(state: GrapevineConnectionState): void {
    if (this._state !== state) {
      this._state = state;
      this.emitEvent('stateChange', state);
    }
  }

  /**
   * Clear all timers.
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  /**
   * Clear all pending requests with an error.
   */
  private clearPendingRequests(reason: string): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }

  /**
   * Log a message.
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (this.config.logger) {
      this.config.logger[level]({ component: 'GrapevineClient' }, message);
    }
  }
}

/**
 * Singleton instance management.
 */
let grapevineClient: GrapevineClient | null = null;

export function getGrapevineClient(): GrapevineClient | null {
  return grapevineClient;
}

export function createGrapevineClient(config: GrapevineClientConfig): GrapevineClient {
  if (grapevineClient) {
    grapevineClient.disconnect();
  }
  grapevineClient = new GrapevineClient(config);
  return grapevineClient;
}

export function destroyGrapevineClient(): void {
  if (grapevineClient) {
    grapevineClient.disconnect();
    grapevineClient = null;
  }
}
