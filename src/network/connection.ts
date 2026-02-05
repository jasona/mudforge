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
 * NOTE: Equipment images and profile portraits are sent via separate
 * EQUIPMENT protocol messages to avoid sending large images every heartbeat.
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
  avatar?: string;            // Avatar ID (small, OK to send every heartbeat)
  profilePortrait?: string;   // Only sent on login/change, not every heartbeat
  equipment?: {
    [slot: string]: EquipmentSlotData | null;
  };
}

/**
 * EQUIPMENT protocol message type for equipment image updates.
 * Sent separately from STATS to avoid sending large images every heartbeat.
 * Only sent when equipment actually changes.
 */
export interface EquipmentMessage {
  type: 'equipment_update';
  /** Map of slot name to image data URI (or null if empty/no image) */
  slots: {
    [slot: string]: {
      image: string | null;
      name: string;
    } | null;
  };
  /** Optional profile portrait update (only included when portrait changes) */
  profilePortrait?: string;
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

/**
 * Lightweight health-only update for combat rounds.
 * Avoids resending the portrait (which can be 50-200KB) every round.
 */
export interface CombatHealthUpdateMessage {
  type: 'health_update';
  health: number;
  maxHealth: number;
  healthPercent: number;
}

export interface CombatTargetClearMessage {
  type: 'target_clear';
}

export type CombatMessage = CombatTargetUpdateMessage | CombatHealthUpdateMessage | CombatTargetClearMessage;

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

/** Backpressure threshold in bytes (64KB) - start warning and slow down */
const BACKPRESSURE_THRESHOLD = 64 * 1024;

/** Maximum send buffer size before queuing messages (256KB) */
const MAX_BUFFER_SIZE = 256 * 1024;

/**
 * Hard stop threshold (512KB).
 * If buffer exceeds this, stop sending entirely to let it drain.
 * This prevents runaway buffer growth between heartbeat checks.
 */
const HARD_STOP_BUFFER_SIZE = 512 * 1024;

/**
 * Critical buffer size threshold (1MB).
 * If buffer exceeds this, the connection is considered broken - likely the client
 * can't receive data but TCP hasn't detected it yet. We should terminate to avoid
 * accumulating unbounded data and to allow the player to reconnect.
 * Lowered from 2MB to catch stuck connections faster.
 */
const CRITICAL_BUFFER_SIZE = 1 * 1024 * 1024;

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
  private _lastHardStopLog: number = 0;
  private _pendingMessages: string[] = [];
  private _drainScheduled: boolean = false;
  private _drainTimeout: ReturnType<typeof setTimeout> | null = null;
  private _tabVisible: boolean = true; // Client tab visibility (for pausing updates)
  private _maxBufferSeen: number = 0; // Track max buffer for debugging

  // Message buffer for session resume replay
  private _messageBuffer: string[] = [];

  constructor(socket: WebSocket, id: string, remoteAddress: string = 'unknown') {
    super();
    this.socket = socket;
    this._id = id;
    this._remoteAddress = remoteAddress;
    this._connectedAt = new Date();

    console.log(`[CONN-CREATE] ${id} created at ${new Date().toISOString()} from ${remoteAddress}`);

    // Enable TCP keepalive on the underlying socket to detect dead connections at OS level
    // This helps catch half-open connections that WebSocket ping/pong might miss
    this.enableTcpKeepalive();

    this.setupEventHandlers();
  }

  /**
   * Enable TCP keepalive on the underlying socket and monitor TCP-level events.
   * This helps detect dead connections at the OS level, complementing WebSocket ping/pong.
   */
  private enableTcpKeepalive(): void {
    try {
      // Access the underlying net.Socket from the ws WebSocket
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawSocket = (this.socket as any)._socket;
      if (rawSocket && typeof rawSocket.setKeepAlive === 'function') {
        // Enable keepalive with 30 second initial delay
        rawSocket.setKeepAlive(true, 30000);
        console.log(`[CONN-KEEPALIVE] ${this._id} TCP keepalive enabled (30s delay)`);

        // Monitor TCP-level events for debugging connection issues
        rawSocket.on('timeout', () => {
          console.warn(`[CONN-TCP] ${this._id} TCP socket timeout`);
        });

        rawSocket.on('end', () => {
          console.log(`[CONN-TCP] ${this._id} TCP socket received FIN (remote end closed)`);
        });

        rawSocket.on('error', (err: Error) => {
          console.error(`[CONN-TCP] ${this._id} TCP socket error: ${err.message}`);
        });

        // Log when data stops flowing (could indicate network issues)
        rawSocket.on('drain', () => {
          console.log(`[CONN-TCP] ${this._id} TCP socket drained (write buffer empty)`);
        });
      } else {
        console.log(`[CONN-KEEPALIVE] ${this._id} Could not access underlying socket for keepalive`);
      }
    } catch (error) {
      console.warn(`[CONN-KEEPALIVE] ${this._id} Failed to enable TCP keepalive:`, error);
    }
  }

  /**
   * Set the connection state and log the change.
   */
  private setState(newState: ConnectionState): void {
    const oldState = this._state;
    if (oldState !== newState) {
      this._state = newState;
      console.log(`[CONN-STATE] ${this._id}: ${oldState} -> ${newState}`);
    }
  }

  /**
   * Set up WebSocket event handlers.
   */
  private setupEventHandlers(): void {
    this.socket.on('open', () => {
      this.setState('open');
    });

    this.socket.on('message', (data: Buffer | string) => {
      const message = data.toString();
      this.handleMessage(message);
    });

    this.socket.on('close', (code: number, reason: Buffer) => {
      const reasonStr = reason.toString();
      const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'no-player';
      console.log(`[CONN-SOCKET-CLOSE] ${this._id} (${playerName}) socket closed: code=${code}, reason="${reasonStr}"`);
      console.log(`[CONN-SOCKET-CLOSE] Close code meanings: 1000=normal, 1001=going-away, 1005=no-status, 1006=abnormal, 1011=server-error`);
      console.log(`[CONN-SOCKET-CLOSE] Connection was open for ${Date.now() - this._connectedAt.getTime()}ms, missed pongs: ${this._missedPongs}`);
      // Capture stack trace to see what triggered the close
      console.log(`[CONN-SOCKET-CLOSE] Stack trace:`, new Error('Close event trace').stack);
      this.setState('closed');
      this.emit('close', code, reason.toString());
    });

    this.socket.on('error', (error: Error) => {
      const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'no-player';
      console.error(`[CONN-ERROR] ${this._id} (${playerName}) socket error:`, error.message);
      console.error(`[CONN-ERROR] Stack:`, error.stack);
      this.emit('error', error);
    });

    // Handle pong responses for keepalive
    this.socket.on('pong', () => {
      // Only log pong if we had actual missed pongs (missedPongs > 1 means previous ping had no response)
      if (this._missedPongs > 1) {
        const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'no-player';
        console.log(`[CONN-PONG] ${this._id} (${playerName}) received pong, resetting missedPongs from ${this._missedPongs} to 0`);
      }
      this._missedPongs = 0;
      this._lastActivityTime = Date.now();
    });

    // Handle unexpected responses (shouldn't happen with WebSocket, but log if it does)
    this.socket.on('unexpected-response', (_req: unknown, res: { statusCode?: number }) => {
      console.error(`[CONN-UNEXPECTED] ${this._id} unexpected response: ${res.statusCode}`);
    });

    // Mark as open if socket is already open
    if (this.socket.readyState === this.socket.OPEN) {
      this.setState('open');
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
            // Check buffer before sending (same as other send methods)
            const bufferedAmount = this.socket.bufferedAmount || 0;
            if (bufferedAmount > HARD_STOP_BUFFER_SIZE) {
              // Don't add to buffer if it's already too full
              continue;
            }
            // Echo the timestamp back so client can calculate RTT
            try {
              this.socket.send(`\x00[TIME_PONG]${timestamp}`);
            } catch {
              // Ignore send errors
            }
          }
          continue;
        }

        // Handle VISIBILITY messages - client tab hidden/visible state
        // Plain prefix (no null byte) for better WebSocket compatibility
        if (line.startsWith('[VISIBILITY]')) {
          const json = line.slice(12); // Extract JSON after "[VISIBILITY]"
          try {
            const { visible } = JSON.parse(json) as { visible: boolean };
            const wasHidden = !this._tabVisible;
            this._tabVisible = visible;
            const playerName = this._player
              ? ((this._player as { name?: string }).name || 'unknown')
              : 'no-player';
            console.log(
              `[CONN-VISIBILITY] ${this._id} (${playerName}) tab ${visible ? 'visible' : 'hidden'}`
            );

            // When tab becomes visible, flush any queued messages to catch up
            if (visible && wasHidden && this._pendingMessages.length > 0) {
              console.log(
                `[CONN-VISIBILITY] ${this._id} (${playerName}) flushing ${this._pendingMessages.length} queued messages`
              );
              this.drainPendingMessages();
            }
          } catch (e) {
            console.error(`[CONN-VISIBILITY] Failed to parse: "${json}", error:`, e);
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
   * When tab is hidden, messages are queued instead of sent to prevent buffer growth.
   * @param message The message to send
   */
  send(message: string): void {
    if (this._state !== 'open') {
      return;
    }

    // When tab is hidden, queue messages instead of sending
    // This prevents buffer growth while the browser isn't reading
    // Messages will be flushed when tab becomes visible
    if (!this._tabVisible) {
      this._pendingMessages.push(message);
      while (this._pendingMessages.length > 100) {
        this._pendingMessages.shift(); // Drop oldest, keep newest
      }
      return;
    }

    const bufferedAmount = this.socket.bufferedAmount || 0;
    const messageSize = Buffer.byteLength(message, 'utf8');

    // Track max buffer and log at every 100KB threshold crossed
    const threshold100KB = Math.floor(bufferedAmount / (100 * 1024)) * 100 * 1024;
    if (bufferedAmount > this._maxBufferSeen && threshold100KB > this._maxBufferSeen) {
      const playerName = this._player
        ? ((this._player as { name?: string }).name || 'unknown')
        : 'no-player';
      console.warn(
        `[CONN-BUFFER-GROWTH] ${this._id} (${playerName}) NEW MAX buffer=${(bufferedAmount / 1024).toFixed(0)}KB msgSize=${messageSize}B`
      );
      this._maxBufferSeen = threshold100KB;
    }

    // DIAGNOSTIC: Log whenever buffer exceeds 1MB to catch the growth pattern
    if (bufferedAmount > 1024 * 1024) {
      const playerName = this._player
        ? ((this._player as { name?: string }).name || 'unknown')
        : 'no-player';
      console.error(
        `[CONN-BUFFER-ALERT] ${this._id} (${playerName}) buffer=${(bufferedAmount / 1024).toFixed(0)}KB (OVER 1MB!) msgSize=${messageSize}B`
      );
    }

    // HARD STOP: If buffer is very large, queue instead of sending
    // This prevents runaway buffer growth between heartbeat checks
    if (bufferedAmount > HARD_STOP_BUFFER_SIZE) {
      const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'no-player';
      // Only log once per second to avoid log spam
      const now = Date.now();
      if (!this._lastHardStopLog || now - this._lastHardStopLog > 1000) {
        this._lastHardStopLog = now;
        console.error(`[CONN-HARD-STOP] ${this._id} (${playerName}) buffer=${(bufferedAmount / 1024).toFixed(0)}KB msgSize=${messageSize}B - queueing, waiting for drain`);
      }
      // Queue the new message - drop oldest if queue is full (keep newest)
      this._pendingMessages.push(message);
      while (this._pendingMessages.length > 100) {
        this._pendingMessages.shift(); // Drop oldest
      }
      this.scheduleDrain();
      return;
    }

    // Log when buffer is getting full (approaching threshold)
    if (bufferedAmount > BACKPRESSURE_THRESHOLD / 2) {
      const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'no-player';
      console.log(`[CONN-BUFFER] ${this._id} (${playerName}) bufferedAmount=${bufferedAmount} (threshold: ${BACKPRESSURE_THRESHOLD})`);
    }

    // Check for backpressure
    if (bufferedAmount > BACKPRESSURE_THRESHOLD) {
      // Warn once per backpressure episode
      if (!this._backpressureWarned) {
        this._backpressureWarned = true;
        const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'no-player';
        console.warn(`[CONN-BACKPRESSURE] ${this._id} (${playerName}) hit backpressure threshold, queueing messages`);
        this.emit('backpressure', bufferedAmount);
      }

      // If buffer is critically full, queue the message
      if (bufferedAmount > MAX_BUFFER_SIZE) {
        // Queue new message, drop oldest if queue is full (keep newest)
        this._pendingMessages.push(message);
        while (this._pendingMessages.length > 100) {
          this._pendingMessages.shift(); // Drop oldest
        }
        this.scheduleDrain();
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

    // Check again after a short delay (store handle for cleanup)
    this._drainTimeout = setTimeout(() => {
      this._drainTimeout = null;
      this._drainScheduled = false;
      this.drainPendingMessages();
    }, 50);
  }

  /**
   * Clear the drain timeout if pending.
   */
  private clearDrainTimeout(): void {
    if (this._drainTimeout !== null) {
      clearTimeout(this._drainTimeout);
      this._drainTimeout = null;
      this._drainScheduled = false;
    }
  }

  /**
   * Drain pending messages when buffer has space.
   */
  private drainPendingMessages(): void {
    if (this._state !== 'open' || this._pendingMessages.length === 0) {
      return;
    }

    // Drain regular messages
    while (
      this._pendingMessages.length > 0 &&
      (this.socket.bufferedAmount || 0) < BACKPRESSURE_THRESHOLD
    ) {
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
   * Check if the connection has a critically large buffer.
   * This indicates the client likely can't receive data (network issue,
   * suspended tab, etc.) but TCP hasn't detected it yet.
   */
  get hasCriticalBackpressure(): boolean {
    return (this.socket.bufferedAmount || 0) > CRITICAL_BUFFER_SIZE;
  }

  /**
   * Internal method for sending protocol messages with backpressure awareness.
   * When tab is hidden, only COMM (chat) and TIME messages are sent.
   * COMM preserves chat history; TIME keeps load balancer/proxy connections alive.
   * All other protocol messages (STATS, MAP, COMBAT) are state updates that
   * will be refreshed when the tab becomes visible again.
   * @returns true if message was sent, false if dropped
   */
  private sendProtocolMessage(message: string): boolean {
    if (this._state !== 'open') {
      return false;
    }

    // Extract protocol type from message (e.g., "\x00[STATS]..." -> "STATS")
    const typeMatch = message.match(/^\x00\[([A-Z_]+)\]/);
    const protoType = typeMatch?.[1] ?? 'UNKNOWN';

    // When tab is hidden, only send COMM (chat) and TIME messages
    // COMM: chat events need history preservation
    // TIME: data-frame keepalive that prevents load balancer/proxy idle timeouts
    //       (proxies often ignore WebSocket ping/pong protocol frames)
    // All other protocol messages are state updates - skip until visible
    if (!this._tabVisible && protoType !== 'COMM' && protoType !== 'TIME') {
      return false; // Silently skip - will refresh when visible
    }

    const bufferedAmount = this.socket.bufferedAmount || 0;

    // DIAGNOSTIC: Log whenever buffer exceeds 1MB
    if (bufferedAmount > 1024 * 1024) {
      const playerName = this._player
        ? ((this._player as { name?: string }).name || 'unknown')
        : 'no-player';
      const messageSize = Buffer.byteLength(message, 'utf8');
      console.error(
        `[CONN-PROTO-BUFFER-ALERT] ${this._id} (${playerName}) buffer=${(bufferedAmount / 1024).toFixed(0)}KB (OVER 1MB!) msgSize=${messageSize}B`
      );
    }

    // If buffer is too full, skip this protocol message entirely
    // Protocol messages are state snapshots - missing one doesn't matter
    if (bufferedAmount > MAX_BUFFER_SIZE) {
      return false;
    }

    // Log when buffer is high (but not on every message)
    if (bufferedAmount > BACKPRESSURE_THRESHOLD && !this._backpressureWarned) {
      this._backpressureWarned = true;
      const playerName = this._player
        ? ((this._player as { name?: string }).name || 'unknown')
        : 'no-player';
      console.warn(
        `[CONN-BACKPRESSURE] ${this._id} (${playerName}) buffer=${bufferedAmount} exceeds threshold`
      );
      this.emit('backpressure', bufferedAmount);
    } else if (bufferedAmount <= BACKPRESSURE_THRESHOLD) {
      this._backpressureWarned = false;
    }

    try {
      this.socket.send(message);
      return true;
    } catch (error) {
      this.emit('error', error as Error);
      return false;
    }
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
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[MAP]${json}`);
  }

  /**
   * Send a STATS protocol message to the client.
   * STATS messages are prefixed with \x00[STATS] to distinguish them from regular text.
   * @param message The stats message to send
   */
  sendStats(message: StatsMessage): void {
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[STATS]${json}`);
  }

  /**
   * Send a GUI protocol message to the client.
   * GUI messages are prefixed with \x00[GUI] to distinguish them from regular text.
   * @param message The GUI message to send
   */
  sendGUI(message: GUIMessage): void {
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[GUI]${json}`);
  }

  /**
   * Send a QUEST protocol message to the client.
   * QUEST messages are prefixed with \x00[QUEST] to distinguish them from regular text.
   * @param message The quest message to send
   */
  sendQuest(message: QuestMessage): void {
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[QUEST]${json}`);
  }

  /**
   * Send a tab completion response to the client.
   * COMPLETE messages are prefixed with \x00[COMPLETE] to distinguish them from regular text.
   * @param message The completion message to send
   */
  sendCompletion(message: CompletionMessage): void {
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[COMPLETE]${json}`);
  }

  /**
   * Send a COMM protocol message to the client.
   * COMM messages are prefixed with \x00[COMM] to distinguish them from regular text.
   * Used for say/tell/channel messages to populate the communications panel.
   * @param message The comm message to send
   */
  sendComm(message: CommMessage): void {
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[COMM]${json}`);
  }

  /**
   * Send an AUTH protocol message to the client.
   * AUTH messages are prefixed with \x00[AUTH] to distinguish them from regular text.
   * Used for launcher authentication responses.
   * @param message The auth response message to send
   */
  sendAuthResponse(message: AuthResponseMessage): void {
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[AUTH]${json}`);
  }

  /**
   * Send a COMBAT protocol message to the client.
   * COMBAT messages are prefixed with \x00[COMBAT] to distinguish them from regular text.
   * Used for combat target panel display.
   * @param message The combat message to send
   */
  sendCombat(message: CombatMessage): void {
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[COMBAT]${json}`);
  }

  /**
   * Send a SOUND protocol message to the client.
   * SOUND messages are prefixed with \x00[SOUND] to distinguish them from regular text.
   * Used for triggering audio playback on the client.
   * @param message The sound message to send
   */
  sendSound(message: SoundMessage): void {
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[SOUND]${json}`);
  }

  /**
   * Send a SESSION protocol message to the client.
   * SESSION messages are prefixed with \x00[SESSION] to distinguish them from regular text.
   * Used for session token delivery and session resume responses.
   * @param message The session message to send
   */
  sendSession(message: SessionTokenMessage | SessionResumeResponse): void {
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[SESSION]${json}`);
  }

  /**
   * Send an EQUIPMENT protocol message to the client.
   * EQUIPMENT messages are prefixed with \x00[EQUIPMENT] to distinguish them from regular text.
   * Used for equipment image updates (sent only when equipment changes, not every heartbeat).
   * @param message The equipment message to send
   */
  sendEquipment(message: EquipmentMessage): void {
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[EQUIPMENT]${json}`);
  }

  /**
   * Get the number of missed pong responses.
   */
  get missedPongs(): number {
    return this._missedPongs;
  }

  /**
   * Check if the client's browser tab is visible.
   * Used to pause high-frequency updates when tab is backgrounded.
   */
  get tabVisible(): boolean {
    return this._tabVisible;
  }

  /**
   * Increment the missed pong counter and return the new value.
   * Called before sending each ping.
   *
   * Note: Counter going 0→1 is normal (incremented before ping, reset on pong).
   * Counter going 1→2 means the previous ping got no response - that's concerning.
   */
  incrementMissedPongs(): number {
    const previousCount = this._missedPongs;
    const newCount = ++this._missedPongs;
    const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'no-player';

    // Only log when we're actually missing pongs (previous ping had no response)
    // 0→1 is normal (pre-ping increment), 1→2 means first actual missed pong
    if (previousCount >= 1) {
      if (previousCount === 1) {
        // First ACTUAL missed pong - previous ping never got a response
        console.warn(`[CONN-MISSED] ${this._id} (${playerName}) FIRST MISSED PONG - connection may be going stale`);
        console.warn(`[CONN-MISSED] ${this._id} socket.readyState=${this.socket.readyState} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)`);
        console.warn(`[CONN-MISSED] ${this._id} socket.bufferedAmount=${this.socket.bufferedAmount}`);
        console.warn(`[CONN-MISSED] ${this._id} lastActivityTime was ${Date.now() - this._lastActivityTime}ms ago`);
      } else {
        // Subsequent missed pongs
        console.warn(`[CONN-MISSED] ${this._id} (${playerName}) missedPongs=${newCount} (no response to last ${previousCount} pings)`);
      }
    }
    // Don't log 0→1 transitions - that's just the normal pre-ping increment

    return newCount;
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

    // Only log pings when there are already missed pongs (potential issue)
    if (this._missedPongs > 1) {
      const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'no-player';
      console.log(`[CONN-PING] ${this._id} (${playerName}) sending ping (missedPongs: ${this._missedPongs})`);
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

    // Use protocol message handling for backpressure awareness
    this.sendProtocolMessage(`\x00[TIME]${JSON.stringify(message)}`);
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
    console.log(`[CONN-CLOSE] ${this._id} (${playerName}) closing with code=${closeCode}, reason="${closeReason}"`);
    console.log(`[CONN-CLOSE] Called from:`, new Error('close() call trace').stack);

    this.setState('closing');

    // Clean up resources
    this.cleanup();

    try {
      this.socket.close(closeCode, closeReason);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Clean up connection resources.
   * Removes event listeners and clears buffers to prevent memory leaks.
   */
  private cleanup(): void {
    // Clear pending drain timeout
    this.clearDrainTimeout();

    // Remove all listeners from the socket to prevent memory leaks
    this.socket.removeAllListeners();

    // Remove all listeners from this EventEmitter
    this.removeAllListeners();

    // Clear message buffers
    this._messageBuffer = [];
    this._pendingMessages = [];
    this._inputBuffer = '';
  }

  /**
   * Forcefully terminate the connection.
   */
  terminate(): void {
    const playerName = this._player ? (this._player as { name?: string }).name || 'unknown' : 'no-player';
    console.log(`[CONN-TERMINATE] ${this._id} (${playerName}) terminated forcefully, missedPongs=${this._missedPongs}`);
    console.log(`[CONN-TERMINATE] Called from:`, new Error('terminate() call trace').stack);

    // Clean up resources before terminating
    this.cleanup();

    try {
      this.socket.terminate();
      this._state = 'closed';
      console.log(`[CONN-STATE] ${this._id}: closing -> closed (terminated)`);
    } catch (error) {
      // Can't emit error after cleanup removed listeners, just log it
      console.error(`[CONN-TERMINATE] Error terminating connection ${this._id}:`, error);
    }
  }
}

export default Connection;
