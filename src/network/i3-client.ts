/**
 * I3 TCP Client - Manages persistent TCP connection to Intermud 3 routers.
 *
 * Features:
 * - Persistent TCP connection with auto-reconnect
 * - MudMode framing (4-byte length header)
 * - Event-based interface for packet handling
 * - Connection state machine
 */

import { EventEmitter } from 'events';
import { Socket } from 'net';
import { encodePacket, decodePacket, MudModeReader, type LPCValue } from './lpc-codec.js';
import type { Logger } from 'pino';

/**
 * I3 router configuration.
 */
export interface I3Router {
  name: string;
  host: string;
  port: number;
}

/**
 * I3 client configuration.
 */
export interface I3ClientConfig {
  /** MUD name as registered on I3 network */
  mudName: string;
  /** Router list with name, host, port */
  routers: I3Router[];
  /** Reconnect delay in ms (default: 30000) */
  reconnectDelay?: number;
  /** Max reconnect attempts before giving up (default: 10, 0 = infinite) */
  maxReconnectAttempts?: number;
  /** Connection timeout in ms (default: 30000) */
  connectionTimeout?: number;
  /** Logger instance */
  logger?: Logger;
}

/**
 * Connection states.
 */
export type I3ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * I3 client events.
 */
export interface I3ClientEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
  error: (error: Error) => void;
  packet: (packet: LPCValue[]) => void;
  stateChange: (state: I3ConnectionState) => void;
}

/**
 * I3 TCP Client for Intermud 3 protocol.
 */
export class I3Client extends EventEmitter {
  private config: Required<Omit<I3ClientConfig, 'logger'>> & { logger: Logger | undefined };
  private socket: Socket | null = null;
  private reader: MudModeReader = new MudModeReader();
  private _state: I3ConnectionState = 'disconnected';
  private currentRouterIndex = 0;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  constructor(config: I3ClientConfig) {
    super();
    this.config = {
      mudName: config.mudName,
      routers: config.routers,
      reconnectDelay: config.reconnectDelay ?? 30000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      connectionTimeout: config.connectionTimeout ?? 30000,
      logger: config.logger,
    };
  }

  /**
   * Get current connection state.
   */
  get state(): I3ConnectionState {
    return this._state;
  }

  /**
   * Check if connected.
   */
  get isConnected(): boolean {
    return this._state === 'connected';
  }

  /**
   * Get the current router being used.
   */
  get currentRouter(): I3Router | undefined {
    return this.config.routers[this.currentRouterIndex];
  }

  /**
   * Connect to the I3 network.
   */
  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') {
      return;
    }

    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    await this.doConnect();
  }

  /**
   * Disconnect from the I3 network.
   */
  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    this.clearTimers();

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.setState('disconnected');
    this.emit('disconnect', 'Manual disconnect');
  }

  /**
   * Get all configured routers.
   */
  getRouters(): I3Router[] {
    return [...this.config.routers];
  }

  /**
   * Get the current router index.
   */
  get currentRouterIdx(): number {
    return this.currentRouterIndex;
  }

  /**
   * Switch to a different router by index.
   * Disconnects from current router and connects to the new one.
   */
  async switchRouter(index: number): Promise<boolean> {
    if (index < 0 || index >= this.config.routers.length) {
      this.log('error', `Invalid router index: ${index}`);
      return false;
    }

    const newRouter = this.config.routers[index];
    if (!newRouter) {
      return false;
    }

    this.log('info', `Switching to router ${newRouter.name} (${newRouter.host}:${newRouter.port})`);

    // Disconnect from current router
    this.clearTimers();
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.setState('disconnected');

    // Set new router index and reconnect
    this.currentRouterIndex = index;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;

    await this.doConnect();
    return true;
  }

  /**
   * Switch to a router by name.
   */
  async switchRouterByName(name: string): Promise<boolean> {
    const index = this.config.routers.findIndex(
      (r) => r.name.toLowerCase() === name.toLowerCase()
    );

    if (index === -1) {
      this.log('error', `Router not found: ${name}`);
      return false;
    }

    return this.switchRouter(index);
  }

  /**
   * Send a packet to the router.
   */
  send(packet: LPCValue[]): boolean {
    if (!this.socket || this._state !== 'connected') {
      this.log('warn', 'Cannot send packet: not connected');
      return false;
    }

    try {
      const buffer = encodePacket(packet);
      this.socket.write(buffer);
      this.log('debug', `Sent packet: ${packet[0]}`);
      return true;
    } catch (error) {
      this.log('error', `Failed to send packet: ${error}`);
      return false;
    }
  }

  /**
   * Internal connect implementation.
   */
  private async doConnect(): Promise<void> {
    const router = this.config.routers[this.currentRouterIndex];
    if (!router) {
      this.log('error', 'No routers configured');
      this.emit('error', new Error('No routers configured'));
      return;
    }

    this.setState('connecting');
    this.log('info', `Connecting to ${router.name} (${router.host}:${router.port})`);

    return new Promise<void>((resolve) => {
      this.socket = new Socket();

      // Set up connection timeout
      this.connectionTimer = setTimeout(() => {
        if (this._state === 'connecting') {
          this.log('warn', `Connection timeout to ${router.name}`);
          this.socket?.destroy();
          this.handleConnectionFailure();
        }
      }, this.config.connectionTimeout);

      this.socket.on('connect', () => {
        this.clearTimers();
        this.setState('connected');
        this.reconnectAttempts = 0;
        this.reader.reset();
        this.log('info', `Connected to ${router.name}`);
        this.emit('connect');
        resolve();
      });

      this.socket.on('data', (data: Buffer) => {
        this.handleData(data);
      });

      this.socket.on('close', () => {
        this.log('info', `Connection closed to ${router.name}`);
        if (this.shouldReconnect && this._state === 'connected') {
          this.scheduleReconnect();
        }
      });

      this.socket.on('error', (error: Error) => {
        this.log('error', `Socket error: ${error.message}`);
        this.emit('error', error);
        if (this._state === 'connecting') {
          this.handleConnectionFailure();
          resolve();
        }
      });

      this.socket.connect(router.port, router.host);
    });
  }

  /**
   * Handle incoming data.
   */
  private handleData(data: Buffer): void {
    const packets = this.reader.addData(data);

    for (const packetData of packets) {
      try {
        const packet = decodePacket(packetData);
        if (packet.length > 0) {
          this.log('debug', `Received packet: ${packet[0]}`);
          this.emit('packet', packet);
        }
      } catch (error) {
        this.log('error', `Failed to decode packet: ${error}`);
      }
    }
  }

  /**
   * Handle connection failure.
   */
  private handleConnectionFailure(): void {
    this.clearTimers();
    this.socket?.destroy();
    this.socket = null;

    if (!this.shouldReconnect) {
      this.setState('disconnected');
      return;
    }

    // Try next router
    this.currentRouterIndex = (this.currentRouterIndex + 1) % this.config.routers.length;
    this.reconnectAttempts++;

    if (
      this.config.maxReconnectAttempts > 0 &&
      this.reconnectAttempts >= this.config.maxReconnectAttempts
    ) {
      this.log('error', 'Max reconnect attempts reached');
      this.setState('disconnected');
      this.emit('disconnect', 'Max reconnect attempts reached');
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
  private setState(state: I3ConnectionState): void {
    if (this._state !== state) {
      this._state = state;
      this.emit('stateChange', state);
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
   * Log a message.
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (this.config.logger) {
      this.config.logger[level]({ component: 'I3Client' }, message);
    }
  }
}

/**
 * Singleton instance management.
 */
let i3Client: I3Client | null = null;

export function getI3Client(): I3Client | null {
  return i3Client;
}

export function createI3Client(config: I3ClientConfig): I3Client {
  if (i3Client) {
    i3Client.disconnect();
  }
  i3Client = new I3Client(config);
  return i3Client;
}

export function destroyI3Client(): void {
  if (i3Client) {
    i3Client.disconnect();
    i3Client = null;
  }
}
