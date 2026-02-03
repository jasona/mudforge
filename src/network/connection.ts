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
 * AUTH protocol message type for launcher authentication responses.
 */
export interface AuthResponseMessage {
  success: boolean;
  error?: string;
  errorCode?: 'invalid_credentials' | 'user_not_found' | 'name_taken' | 'validation_error';
  requiresRegistration?: boolean;
}

/**
 * COMBAT protocol message types for combat target display.
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

export interface CombatTargetClearMessage {
  type: 'target_clear';
}

export type CombatMessage = CombatTargetUpdateMessage | CombatTargetClearMessage;

/**
 * Sound category types.
 */
export type SoundCategory = 'combat' | 'spell' | 'skill' | 'potion' | 'quest' | 'celebration' | 'discussion' | 'alert' | 'ambient' | 'ui';

/**
 * SOUND protocol message type for audio playback.
 */
export interface SoundMessage {
  type: 'play' | 'loop' | 'stop';
  category: SoundCategory;
  sound: string;
  volume?: number;
  id?: string;
}

/**
 * SESSION protocol message for session token.
 */
export interface SessionTokenMessage {
  type: 'session_token';
  token: string;
  expiresAt: number;
}

/**
 * SESSION protocol message for session resume response.
 */
export interface SessionResumeResponse {
  type: 'session_resume' | 'session_invalid';
  success?: boolean;
  error?: string;
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

/** Backpressure threshold in bytes (64KB) */
const BACKPRESSURE_THRESHOLD = 64 * 1024;

/** Maximum send buffer size before dropping messages (256KB) */
const MAX_BUFFER_SIZE = 256 * 1024;

/** Maximum number of messages to buffer for session resume replay */
const MAX_MESSAGE_BUFFER_SIZE = 50;

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
  private _missedPongs: number = 0;
  private _lastActivityTime: number = Date.now();
  private _backpressureWarned: boolean = false;
  private _pendingMessages: string[] = [];
  private _drainScheduled: boolean = false;

  // Message buffer for session resume replay
  private _messageBuffer: string[] = [];

  constructor(socket: WebSocket, id: string, remoteAddress: string = 'unknown') {
    super();
    this.socket = socket;
    this._id = id;
    this._remoteAddress = remoteAddress;
    this._connectedAt = new Date();

    console.log(`[WS-CONNECT] New connection ${id} from ${remoteAddress}`);
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
      const reasonStr = reason.toString();
      const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'no-player';
      console.log(`[WS-CLOSE] Connection ${this._id} (${playerName}) closed - code: ${code}, reason: "${reasonStr}"`);
      console.log(`[WS-CLOSE] Close code meanings: 1000=normal, 1001=going-away, 1005=no-status, 1006=abnormal, 1011=server-error`);
      console.log(`[WS-CLOSE] Connection was open for ${Date.now() - this._connectedAt.getTime()}ms, missed pongs: ${this._missedPongs}`);
      // Capture stack trace to see what triggered the close
      console.log(`[WS-CLOSE] Stack trace:`, new Error('Close event trace').stack);
      this._state = 'closed';
      this.emit('close', code, reason.toString());
    });

    this.socket.on('error', (error: Error) => {
      const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'no-player';
      console.error(`[WS-ERROR] Connection ${this._id} (${playerName}) error:`, error.message);
      console.error(`[WS-ERROR] Stack:`, error.stack);
      this.emit('error', error);
    });

    // Handle pong responses for keepalive
    this.socket.on('pong', () => {
      this._missedPongs = 0;
      this._lastActivityTime = Date.now();
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
    // Any message activity means connection is alive
    this._lastActivityTime = Date.now();
    this._missedPongs = 0;

    // Handle line-buffered input
    this._inputBuffer += data;

    // Process complete lines
    const lines = this._inputBuffer.split(/\r?\n/);
    this._inputBuffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.length > 0) {
        // Handle TIME_ACK keepalive messages - echo timestamp for RTT measurement
        if (line.startsWith('\x00[TIME_ACK]')) {
          const timestamp = line.slice(11); // Extract timestamp after prefix
          if (timestamp) {
            // Echo the timestamp back so client can calculate RTT
            try {
              this.socket.send(`\x00[TIME_PONG]${timestamp}`);
            } catch {
              // Ignore send errors
            }
          }
          continue;
        }
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
    const playerName = (player as { name?: string })?.name || 'unknown';
    console.log(`[WS-BIND] Player "${playerName}" bound to connection ${this._id}`);
    this._player = player;
  }

  /**
   * Unbind the player object.
   */
  unbindPlayer(): void {
    const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'none';
    console.log(`[WS-UNBIND] Player "${playerName}" unbound from connection ${this._id}`);
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
   * Implements backpressure handling to prevent memory exhaustion.
   * @param message The message to send
   */
  send(message: string): void {
    if (this._state !== 'open') {
      return;
    }

    const bufferedAmount = this.socket.bufferedAmount || 0;

    // Check for backpressure
    if (bufferedAmount > BACKPRESSURE_THRESHOLD) {
      // Warn once per backpressure episode
      if (!this._backpressureWarned) {
        this._backpressureWarned = true;
        this.emit('backpressure', bufferedAmount);
      }

      // If buffer is critically full, queue the message
      if (bufferedAmount > MAX_BUFFER_SIZE) {
        // Queue message for later (limited queue size)
        if (this._pendingMessages.length < 100) {
          this._pendingMessages.push(message);
          this.scheduleDrain();
        }
        // Drop message if queue is also full (prevents memory exhaustion)
        return;
      }
    } else {
      // Backpressure cleared
      this._backpressureWarned = false;
    }

    try {
      this.socket.send(message);

      // Buffer messages for session resume replay (only if player is bound)
      if (this._player) {
        this.bufferMessage(message);
      }
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Add a message to the replay buffer.
   * Maintains a circular buffer of recent messages.
   */
  private bufferMessage(message: string): void {
    this._messageBuffer.push(message);
    if (this._messageBuffer.length > MAX_MESSAGE_BUFFER_SIZE) {
      this._messageBuffer.shift();
    }
  }

  /**
   * Get buffered messages for session resume replay.
   * Returns a copy of the message buffer.
   */
  getBufferedMessages(): string[] {
    return [...this._messageBuffer];
  }

  /**
   * Clear the message buffer.
   * Called after successful session transfer to new connection.
   */
  clearMessageBuffer(): void {
    this._messageBuffer = [];
  }

  /**
   * Schedule draining of pending messages.
   */
  private scheduleDrain(): void {
    if (this._drainScheduled || this._pendingMessages.length === 0) {
      return;
    }

    this._drainScheduled = true;

    // Check again after a short delay
    setTimeout(() => {
      this._drainScheduled = false;
      this.drainPendingMessages();
    }, 50);
  }

  /**
   * Drain pending messages when buffer has space.
   */
  private drainPendingMessages(): void {
    if (this._state !== 'open' || this._pendingMessages.length === 0) {
      return;
    }

    const bufferedAmount = this.socket.bufferedAmount || 0;

    // Only drain if we have room
    while (this._pendingMessages.length > 0 && bufferedAmount < BACKPRESSURE_THRESHOLD) {
      const message = this._pendingMessages.shift()!;
      try {
        this.socket.send(message);
      } catch (error) {
        this.emit('error', error as Error);
        break;
      }
    }

    // Schedule another drain if we still have messages
    if (this._pendingMessages.length > 0) {
      this.scheduleDrain();
    }
  }

  /**
   * Get the current socket buffer size.
   */
  get bufferedAmount(): number {
    return this.socket.bufferedAmount || 0;
  }

  /**
   * Check if the connection is experiencing backpressure.
   */
  get hasBackpressure(): boolean {
    return (this.socket.bufferedAmount || 0) > BACKPRESSURE_THRESHOLD;
  }

  /**
   * Get the number of pending messages waiting to be sent.
   */
  get pendingMessageCount(): number {
    return this._pendingMessages.length;
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
   * Send an AUTH protocol message to the client.
   * AUTH messages are prefixed with \x00[AUTH] to distinguish them from regular text.
   * Used for launcher authentication responses.
   * @param message The auth response message to send
   */
  sendAuthResponse(message: AuthResponseMessage): void {
    if (this._state !== 'open') {
      return;
    }

    try {
      const json = JSON.stringify(message);
      this.socket.send(`\x00[AUTH]${json}`);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Send a COMBAT protocol message to the client.
   * COMBAT messages are prefixed with \x00[COMBAT] to distinguish them from regular text.
   * Used for combat target panel display.
   * @param message The combat message to send
   */
  sendCombat(message: CombatMessage): void {
    if (this._state !== 'open') {
      return;
    }

    try {
      const json = JSON.stringify(message);
      this.socket.send(`\x00[COMBAT]${json}`);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Send a SOUND protocol message to the client.
   * SOUND messages are prefixed with \x00[SOUND] to distinguish them from regular text.
   * Used for triggering audio playback on the client.
   * @param message The sound message to send
   */
  sendSound(message: SoundMessage): void {
    if (this._state !== 'open') {
      return;
    }

    try {
      const json = JSON.stringify(message);
      this.socket.send(`\x00[SOUND]${json}`);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Send a SESSION protocol message to the client.
   * SESSION messages are prefixed with \x00[SESSION] to distinguish them from regular text.
   * Used for session token delivery and session resume responses.
   * @param message The session message to send
   */
  sendSession(message: SessionTokenMessage | SessionResumeResponse): void {
    if (this._state !== 'open') {
      return;
    }

    try {
      const json = JSON.stringify(message);
      this.socket.send(`\x00[SESSION]${json}`);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Get the number of missed pong responses.
   */
  get missedPongs(): number {
    return this._missedPongs;
  }

  /**
   * Increment the missed pong counter and return the new value.
   * Called before sending each ping.
   */
  incrementMissedPongs(): number {
    return ++this._missedPongs;
  }

  /**
   * Get the timestamp of last activity (message or pong received).
   */
  get lastActivityTime(): number {
    return this._lastActivityTime;
  }

  /**
   * Get connection health metrics for debugging/logging.
   */
  getHealthMetrics(): {
    uptime: number;
    lastActivity: number;
    missedPongs: number;
    state: ConnectionState;
  } {
    return {
      uptime: this.getUptime(),
      lastActivity: Date.now() - this._lastActivityTime,
      missedPongs: this._missedPongs,
      state: this._state,
    };
  }

  /**
   * Send a ping frame to the client.
   * The client's browser will automatically respond with a pong.
   */
  ping(): void {
    if (this._state !== 'open') {
      return;
    }

    try {
      this.socket.ping();
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Send a time data frame to the client.
   * This sends actual WebSocket data (not just ping/pong frames) which
   * load balancers and proxies recognize as "activity", preventing
   * idle connection timeouts that ignore ping/pong frames.
   * The client displays this as a clock in the header.
   * @param gameVersion Optional game version to include for cache invalidation
   */
  sendTime(gameVersion?: string): void {
    if (this._state !== 'open') {
      return;
    }

    try {
      const now = new Date();
      const name = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const abbreviation =
        now.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop() || '';
      const offsetMinutes = now.getTimezoneOffset();
      const sign = offsetMinutes <= 0 ? '+' : '-';
      const hours = Math.floor(Math.abs(offsetMinutes) / 60)
        .toString()
        .padStart(2, '0');
      const minutes = (Math.abs(offsetMinutes) % 60).toString().padStart(2, '0');

      const message: {
        timestamp: number;
        timezone: { name: string; abbreviation: string; offset: string };
        gameVersion?: string;
      } = {
        timestamp: Math.floor(now.getTime() / 1000),
        timezone: { name, abbreviation, offset: `${sign}${hours}:${minutes}` },
      };

      // Include game version if provided (for cache invalidation)
      if (gameVersion) {
        message.gameVersion = gameVersion;
      }

      this.socket.send(`\x00[TIME]${JSON.stringify(message)}`);
    } catch {
      // Don't emit error for time failures - ping will catch dead connections
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

    const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'no-player';
    const closeCode = code || 1000;
    const closeReason = reason || 'Connection closed';
    console.log(`[WS-CLOSE-CALL] Closing connection ${this._id} (${playerName}) - code: ${closeCode}, reason: "${closeReason}"`);
    console.log(`[WS-CLOSE-CALL] Called from:`, new Error('close() call trace').stack);

    this._state = 'closing';

    try {
      this.socket.close(closeCode, closeReason);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Forcefully terminate the connection.
   */
  terminate(): void {
    const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'no-player';
    console.log(`[WS-TERMINATE] Terminating connection ${this._id} (${playerName}) forcefully`);
    console.log(`[WS-TERMINATE] Missed pongs at termination: ${this._missedPongs}`);
    console.log(`[WS-TERMINATE] Called from:`, new Error('terminate() call trace').stack);

    try {
      this.socket.terminate();
      this._state = 'closed';
    } catch (error) {
      this.emit('error', error as Error);
    }
  }
}

export default Connection;
