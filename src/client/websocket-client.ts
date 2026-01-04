/**
 * WebSocketClient - Handles WebSocket connection to the MUD server.
 *
 * Provides connection management, auto-reconnect, and message handling.
 */

/**
 * Event types for the WebSocket client.
 */
type WebSocketClientEvent =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'message';

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
      for (const line of lines) {
        if (line.length > 0 || lines.length === 1) {
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
   * Disconnect from the server.
   */
  disconnect(): void {
    this.cancelReconnect();

    if (this.socket) {
      try {
        this.socket.close(1000, 'Client disconnect');
      } catch (error) {
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
