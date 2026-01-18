/**
 * Connection - Abstraction for a single client connection.
 *
 * Wraps a WebSocket connection and provides methods for
 * sending/receiving messages and managing connection lifecycle.
 */

import type { WebSocket } from 'ws';
import { EventEmitter } from 'events';

/**
 * MAP protocol message type.
 * This is a minimal type - actual messages are defined in mudlib/lib/map-types.ts
 */
export interface MapMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * STATS protocol message type for HP/MP/XP display.
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
 * GUI protocol message type for modal dialogs.
 * Full message types are defined in mudlib/lib/gui-types.ts
 */
export interface GUIMessage {
  action: string;
  [key: string]: unknown;
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
 * Communication message types for the comm panel.
 */
export type CommType = 'say' | 'tell' | 'channel';

/**
 * COMM protocol message type for say/tell/channel messages.
 */
export interface CommMessage {
  type: 'comm';
  commType: CommType;
  sender: string;
  message: string;
  channel?: string;      // For channel messages
  recipients?: string[]; // For group tells
  timestamp: number;
  isSender?: boolean;    // True if recipient is the one who sent this message
}

/**
 * Connection state.
 */
export type ConnectionState = 'connecting' | 'open' | 'closing' | 'closed';

/**
 * Connection events.
 */
export interface ConnectionEvents {
  message: (data: string) => void;
  close: (code: number, reason: string) => void;
  error: (error: Error) => void;
}

/**
 * A single client connection.
 */
export class Connection extends EventEmitter {
  private socket: WebSocket;
  private _id: string;
  private _state: ConnectionState = 'connecting';
  private _remoteAddress: string;
  private _connectedAt: Date;
  private _player: unknown = null;
  private _inputBuffer: string = '';

  constructor(socket: WebSocket, id: string, remoteAddress: string = 'unknown') {
    super();
    this.socket = socket;
    this._id = id;
    this._remoteAddress = remoteAddress;
    this._connectedAt = new Date();

    this.setupEventHandlers();
  }

  /**
   * Set up WebSocket event handlers.
   */
  private setupEventHandlers(): void {
    this.socket.on('open', () => {
      this._state = 'open';
    });

    this.socket.on('message', (data: Buffer | string) => {
      const message = data.toString();
      this.handleMessage(message);
    });

    this.socket.on('close', (code: number, reason: Buffer) => {
      this._state = 'closed';
      this.emit('close', code, reason.toString());
    });

    this.socket.on('error', (error: Error) => {
      this.emit('error', error);
    });

    // Mark as open if socket is already open
    if (this.socket.readyState === this.socket.OPEN) {
      this._state = 'open';
    }
  }

  /**
   * Handle an incoming message.
   */
  private handleMessage(data: string): void {
    // Handle line-buffered input
    this._inputBuffer += data;

    // Process complete lines
    const lines = this._inputBuffer.split(/\r?\n/);
    this._inputBuffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.length > 0) {
        this.emit('message', line);
      }
    }
  }

  /**
   * Get connection ID.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get connection state.
   */
  get state(): ConnectionState {
    return this._state;
  }

  /**
   * Get remote address.
   */
  getRemoteAddress(): string {
    return this._remoteAddress;
  }

  /**
   * Get connection time.
   */
  get connectedAt(): Date {
    return this._connectedAt;
  }

  /**
   * Get connection uptime in seconds.
   */
  getUptime(): number {
    return Math.floor((Date.now() - this._connectedAt.getTime()) / 1000);
  }

  /**
   * Get the bound player object.
   */
  get player(): unknown {
    return this._player;
  }

  /**
   * Bind a player object to this connection.
   */
  bindPlayer(player: unknown): void {
    this._player = player;
  }

  /**
   * Unbind the player object.
   */
  unbindPlayer(): void {
    this._player = null;
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this._state === 'open';
  }

  /**
   * Send a message to the client.
   * @param message The message to send
   */
  send(message: string): void {
    if (this._state !== 'open') {
      return;
    }

    try {
      this.socket.send(message);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Send a line (with newline appended).
   * @param line The line to send
   */
  sendLine(line: string): void {
    this.send(line + '\n');
  }

  /**
   * Send a MAP protocol message to the client.
   * MAP messages are prefixed with \x00[MAP] to distinguish them from regular text.
   * @param message The map message to send
   */
  sendMap(message: MapMessage): void {
    if (this._state !== 'open') {
      return;
    }

    try {
      const json = JSON.stringify(message);
      this.socket.send(`\x00[MAP]${json}`);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Send a STATS protocol message to the client.
   * STATS messages are prefixed with \x00[STATS] to distinguish them from regular text.
   * @param message The stats message to send
   */
  sendStats(message: StatsMessage): void {
    if (this._state !== 'open') {
      return;
    }

    try {
      const json = JSON.stringify(message);
      this.socket.send(`\x00[STATS]${json}`);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Send a GUI protocol message to the client.
   * GUI messages are prefixed with \x00[GUI] to distinguish them from regular text.
   * @param message The GUI message to send
   */
  sendGUI(message: GUIMessage): void {
    if (this._state !== 'open') {
      return;
    }

    try {
      const json = JSON.stringify(message);
      this.socket.send(`\x00[GUI]${json}`);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Send a QUEST protocol message to the client.
   * QUEST messages are prefixed with \x00[QUEST] to distinguish them from regular text.
   * @param message The quest message to send
   */
  sendQuest(message: QuestMessage): void {
    if (this._state !== 'open') {
      return;
    }

    try {
      const json = JSON.stringify(message);
      this.socket.send(`\x00[QUEST]${json}`);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Send a tab completion response to the client.
   * COMPLETE messages are prefixed with \x00[COMPLETE] to distinguish them from regular text.
   * @param message The completion message to send
   */
  sendCompletion(message: CompletionMessage): void {
    if (this._state !== 'open') {
      return;
    }

    try {
      const json = JSON.stringify(message);
      this.socket.send(`\x00[COMPLETE]${json}`);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Send a COMM protocol message to the client.
   * COMM messages are prefixed with \x00[COMM] to distinguish them from regular text.
   * Used for say/tell/channel messages to populate the communications panel.
   * @param message The comm message to send
   */
  sendComm(message: CommMessage): void {
    if (this._state !== 'open') {
      return;
    }

    try {
      const json = JSON.stringify(message);
      this.socket.send(`\x00[COMM]${json}`);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Close the connection.
   * @param code Optional close code
   * @param reason Optional close reason
   */
  close(code?: number, reason?: string): void {
    if (this._state === 'closed' || this._state === 'closing') {
      return;
    }

    this._state = 'closing';

    try {
      this.socket.close(code || 1000, reason || 'Connection closed');
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Forcefully terminate the connection.
   */
  terminate(): void {
    try {
      this.socket.terminate();
      this._state = 'closed';
    } catch (error) {
      this.emit('error', error as Error);
    }
  }
}

export default Connection;
