/**
 * WebSocketClient - Handles WebSocket connection to the MUD server.
 *
 * Provides connection management, auto-reconnect, and message handling.
 */

import type { MapMessage } from './map-renderer.js';

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
  | 'stats-message';

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
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private reconnectTimer: number | null = null;
  private handlers: Map<WebSocketClientEvent, Set<EventHandler>> = new Map();

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
    this.createConnection();
  }

  /**
   * Create a new WebSocket connection.
   */
  private createConnection(): void {
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
      this.emit('connected');
    };

    this.socket.onclose = (event) => {
      const reason = event.reason || `Code ${event.code}`;
      this.emit('disconnected', reason);
      this.socket = null;

      if (event.code !== 1000 && event.code !== 1001) {
        // Not a normal close - try to reconnect
        this.scheduleReconnect();
      }
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
        } else {
          this.emit('message', line);
        }
      }
    };
  }

  /**
   * Schedule a reconnection attempt.
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', 'Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer !== null) {
      return; // Already scheduled
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.createConnection();
    }, delay);
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
   */
  send(message: string): void {
    if (!this.isConnected) {
      this.emit('error', 'Not connected');
      return;
    }

    try {
      this.socket!.send(message + '\n');
    } catch (error) {
      this.emit('error', `Failed to send: ${error}`);
    }
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
   * Disconnect from the server.
   */
  disconnect(): void {
    this.cancelReconnect();

    if (this.socket) {
      try {
        this.socket.close(1000, 'Client disconnect');
      } catch {
        // Ignore close errors
      }
      this.socket = null;
    }
  }

  /**
   * Set reconnection options.
   */
  setReconnectOptions(maxAttempts: number, baseDelay: number): void {
    this.maxReconnectAttempts = maxAttempts;
    this.reconnectDelay = baseDelay;
  }
}

export default WebSocketClient;
