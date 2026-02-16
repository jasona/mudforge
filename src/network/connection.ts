/**
 * Connection - Abstraction for a single client connection.
 *
 * Wraps a WebSocket connection and provides methods for
 * sending/receiving messages and managing connection lifecycle.
 */

import type { WebSocket } from 'ws';
import { EventEmitter } from 'events';

// Protocol message types - canonical definitions in shared module
import type {
  MapMessage,
  EquipmentSlotData,
  StatsMessage,
  StatsDeltaMessage,
  StatsUpdate,
  EquipmentMessage,
  CompletionMessage,
  GUIMessage,
  QuestMessage,
  CommType,
  CommMessage,
  AuthResponseMessage,
  CombatTargetUpdateMessage,
  CombatHealthUpdateMessage,
  CombatTargetClearMessage,
  CombatMessage,
  EngageMessage,
  SoundCategory,
  SoundMessage,
  SessionTokenMessage,
  SessionResumeMessage,
  GameTimeMessage,
} from '../shared/protocol-types.js';

// Re-export all protocol types so existing imports from connection.ts continue to work
export type {
  MapMessage,
  EquipmentSlotData,
  StatsMessage,
  StatsDeltaMessage,
  StatsUpdate,
  EquipmentMessage,
  CompletionMessage,
  GUIMessage,
  QuestMessage,
  CommType,
  CommMessage,
  AuthResponseMessage,
  CombatTargetUpdateMessage,
  CombatHealthUpdateMessage,
  CombatTargetClearMessage,
  CombatMessage,
  EngageMessage,
  SoundCategory,
  SoundMessage,
  SessionTokenMessage,
  GameTimeMessage,
};

/** @deprecated Use SessionResumeMessage from shared/protocol-types instead */
export type SessionResumeResponse = SessionResumeMessage;

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
  backpressure: (bufferedAmount: number) => void;
}

type EventArgs<T, K extends keyof T> = T[K] extends (...args: infer A) => void ? A : never;

/**
 * Minimal player shape required by Connection logging/binding.
 */
export interface ConnectionPlayer {
  name?: string;
  objectId?: string;
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

/** Hard cap for a single protocol frame (512KB) to prevent runaway socket buffers. */
const MAX_PROTOCOL_MESSAGE_SIZE = 512 * 1024;
/** ENGAGE can include large portrait payloads; allow a larger cap for this protocol only. */
const MAX_ENGAGE_PROTOCOL_MESSAGE_SIZE = 3 * 1024 * 1024;

/** Maximum number of messages to buffer for session resume replay */
const MAX_MESSAGE_BUFFER_SIZE = 50;
const BUFFER_LOG_INTERVAL_MS = 1000;
const TCP_DRAIN_LOG_INTERVAL_MS = 1000;
const BACKPRESSURE_WARN_INTERVAL_MS = 10_000;

/**
 * A single client connection.
 */
export class Connection extends EventEmitter {
  private socket: WebSocket;
  private _id: string;
  private _state: ConnectionState = 'connecting';
  private _remoteAddress: string;
  private _connectedAt: Date;
  private _player: ConnectionPlayer | null = null;
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
  private _lastBufferHighLog: number = 0;
  private _bufferHighActive: boolean = false;
  private _lastTcpDrainLog: number = 0;
  private _lastBackpressureWarnLog: number = 0;

  // Message buffer for session resume replay
  private _messageBuffer: string[] = [];

  /**
   * Typed event subscription helper.
   */
  onEvent<K extends keyof ConnectionEvents>(
    event: K,
    listener: (...args: EventArgs<ConnectionEvents, K>) => void
  ): this {
    this.on(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Typed event emit helper.
   */
  emitEvent<K extends keyof ConnectionEvents>(
    event: K,
    ...args: EventArgs<ConnectionEvents, K>
  ): boolean {
    return this.emit(event as string, ...args);
  }

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
      type RawSocketLike = {
        setKeepAlive?: (enabled: boolean, initialDelay?: number) => void;
        on: (event: string, listener: (...args: unknown[]) => void) => void;
      };
      const rawSocket = (this.socket as WebSocket & { _socket?: RawSocketLike })._socket;
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

        rawSocket.on('error', (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[CONN-TCP] ${this._id} TCP socket error: ${message}`);
        });

        // Log when data stops flowing (could indicate network issues)
        rawSocket.on('drain', () => {
          const now = Date.now();
          if (now - this._lastTcpDrainLog >= TCP_DRAIN_LOG_INTERVAL_MS) {
            this._lastTcpDrainLog = now;
            console.log(`[CONN-TCP] ${this._id} TCP socket drained (write buffer empty)`);
          }
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
      const playerName = this.getPlayerName('no-player');
      console.log(`[CONN-SOCKET-CLOSE] ${this._id} (${playerName}) socket closed: code=${code}, reason="${reasonStr}"`);
      console.log(`[CONN-SOCKET-CLOSE] Close code meanings: 1000=normal, 1001=going-away, 1005=no-status, 1006=abnormal, 1011=server-error`);
      console.log(`[CONN-SOCKET-CLOSE] Connection was open for ${Date.now() - this._connectedAt.getTime()}ms, missed pongs: ${this._missedPongs}`);
      // Capture stack trace to see what triggered the close
      console.log(`[CONN-SOCKET-CLOSE] Stack trace:`, new Error('Close event trace').stack);
      this.setState('closed');
      this.emitEvent('close', code, reason.toString());
    });

    this.socket.on('error', (error: Error) => {
      const playerName = this.getPlayerName('no-player');
      console.error(`[CONN-ERROR] ${this._id} (${playerName}) socket error:`, error.message);
      console.error(`[CONN-ERROR] Stack:`, error.stack);
      this.emitEvent('error', error);
    });

    // Handle pong responses for keepalive
    this.socket.on('pong', () => {
      // Only log pong if we had actual missed pongs (missedPongs > 1 means previous ping had no response)
      if (this._missedPongs > 1) {
        const playerName = this.getPlayerName('no-player');
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
        this.emitEvent('message', line);
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
  get player(): ConnectionPlayer | null {
    return this._player;
  }

  /**
   * Bind a player object to this connection.
   */
  bindPlayer(player: ConnectionPlayer): void {
    const playerName = player.name || 'unknown';
    console.log(`[WS-BIND] Player "${playerName}" bound to connection ${this._id}`);
    this._player = player;
  }

  /**
   * Unbind the player object.
   */
  unbindPlayer(): void {
    const playerName = this.getPlayerName('none');
    console.log(`[WS-UNBIND] Player "${playerName}" unbound from connection ${this._id}`);
    this._player = null;
  }

  /**
   * Get the bound player name with fallback.
   */
  private getPlayerName(fallback: string = 'unknown'): string {
    return this._player?.name || fallback;
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
      const playerName = this.getPlayerName('no-player');
      console.warn(
        `[CONN-BUFFER-GROWTH] ${this._id} (${playerName}) NEW MAX buffer=${(bufferedAmount / 1024).toFixed(0)}KB msgSize=${messageSize}B`
      );
      this._maxBufferSeen = threshold100KB;
    }

    // DIAGNOSTIC: Log whenever buffer exceeds 1MB to catch the growth pattern
    if (bufferedAmount > 1024 * 1024) {
      const playerName = this.getPlayerName('no-player');
      console.error(
        `[CONN-BUFFER-ALERT] ${this._id} (${playerName}) buffer=${(bufferedAmount / 1024).toFixed(0)}KB (OVER 1MB!) msgSize=${messageSize}B`
      );
    }

    // HARD STOP: If buffer is very large, queue instead of sending
    // This prevents runaway buffer growth between heartbeat checks
    if (bufferedAmount > HARD_STOP_BUFFER_SIZE) {
      const playerName = this.getPlayerName('no-player');
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
    if (bufferedAmount > BACKPRESSURE_THRESHOLD) {
      const now = Date.now();
      if (!this._bufferHighActive || now - this._lastBufferHighLog >= BUFFER_LOG_INTERVAL_MS) {
        const playerName = this.getPlayerName('no-player');
        this._bufferHighActive = true;
        this._lastBufferHighLog = now;
        console.log(`[CONN-BUFFER] ${this._id} (${playerName}) bufferedAmount=${bufferedAmount} (threshold: ${BACKPRESSURE_THRESHOLD})`);
      }
    } else if (this._bufferHighActive) {
      this._bufferHighActive = false;
      const playerName = this.getPlayerName('no-player');
      console.log(
        `[CONN-BUFFER] ${this._id} (${playerName}) recovered bufferedAmount=${bufferedAmount} (threshold: ${BACKPRESSURE_THRESHOLD})`
      );
    }

    // Check for backpressure
    if (bufferedAmount > BACKPRESSURE_THRESHOLD) {
      // Warn once per backpressure episode
      if (!this._backpressureWarned) {
        this._backpressureWarned = true;
        const now = Date.now();
        if (!this._lastBackpressureWarnLog || now - this._lastBackpressureWarnLog >= BACKPRESSURE_WARN_INTERVAL_MS) {
          this._lastBackpressureWarnLog = now;
          const playerName = this.getPlayerName('no-player');
          console.warn(`[CONN-BACKPRESSURE] ${this._id} (${playerName}) hit backpressure threshold, queueing messages`);
          this.emitEvent('backpressure', bufferedAmount);
        }
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
      this.emitEvent('error', error as Error);
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
        this.emitEvent('error', error as Error);
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
    const messageSize = Buffer.byteLength(message, 'utf8');

    // When tab is hidden, only send COMM (chat) and TIME messages
    // COMM: chat events need history preservation
    // TIME: data-frame keepalive that prevents load balancer/proxy idle timeouts
    //       (proxies often ignore WebSocket ping/pong protocol frames)
    // All other protocol messages are state updates - skip until visible
    if (!this._tabVisible && protoType !== 'COMM' && protoType !== 'TIME') {
      return false; // Silently skip - will refresh when visible
    }

    const bufferedAmount = this.socket.bufferedAmount || 0;

    // Guardrail: never send oversized protocol frames.
    // ENGAGE overlays can legitimately carry larger image payloads.
    const sizeCap = protoType === 'ENGAGE' ? MAX_ENGAGE_PROTOCOL_MESSAGE_SIZE : MAX_PROTOCOL_MESSAGE_SIZE;
    if (messageSize > sizeCap) {
      const playerName = this.getPlayerName('no-player');
      console.error(
        `[CONN-PROTO-DROP] ${this._id} (${playerName}) proto=${protoType} msgSize=${messageSize}B exceeds max=${sizeCap}B`
      );
      return false;
    }

    // DIAGNOSTIC: Log whenever buffer exceeds 1MB
    if (bufferedAmount > 1024 * 1024) {
      const playerName = this.getPlayerName('no-player');
      console.error(
        `[CONN-PROTO-BUFFER-ALERT] ${this._id} (${playerName}) proto=${protoType} buffer=${(bufferedAmount / 1024).toFixed(0)}KB (OVER 1MB!) msgSize=${messageSize}B`
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
      const playerName = this.getPlayerName('no-player');
      console.warn(
        `[CONN-BACKPRESSURE] ${this._id} (${playerName}) buffer=${bufferedAmount} exceeds threshold`
      );
      this.emitEvent('backpressure', bufferedAmount);
    } else if (bufferedAmount <= BACKPRESSURE_THRESHOLD) {
      this._backpressureWarned = false;
    }

    try {
      this.socket.send(message);
      return true;
    } catch (error) {
      this.emitEvent('error', error as Error);
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
   * Accepts both full snapshots (type: 'update') and deltas (type: 'delta').
   * @param message The stats message to send
   */
  sendStats(message: StatsUpdate): void {
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
   * Send an ENGAGE protocol message to the client.
   * ENGAGE messages are prefixed with \x00[ENGAGE] to distinguish them from regular text.
   * Used for NPC dialogue overlays shown by the engage command.
   * @param message The engage message to send
   */
  sendEngage(message: EngageMessage): void {
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[ENGAGE]${json}`);
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
  sendSession(message: SessionTokenMessage | SessionResumeMessage): void {
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[SESSION]${json}`);
  }

  /**
   * Send an EQUIPMENT protocol message to the client.
   * EQUIPMENT messages are prefixed with \x00[EQUIPMENT] to distinguish them from regular text.
   * Used for equipment image updates (sent only when equipment changes, not every heartbeat).
   * @param message The equipment message to send
   */
  sendEquipment(message: EquipmentMessage): boolean {
    if (this._state !== 'open' || !this._tabVisible) {
      return false;
    }
    const json = JSON.stringify(message);
    this.send(`\x00[EQUIPMENT]${json}`);
    return true;
  }

  /**
   * Send a GAMETIME protocol message to the client.
   * GAMETIME messages are prefixed with \x00[GAMETIME] to distinguish them from regular text.
   * Used for the in-game day/night cycle clock display.
   * @param message The game time message to send
   */
  sendGameTime(message: GameTimeMessage): void {
    const json = JSON.stringify(message);
    this.sendProtocolMessage(`\x00[GAMETIME]${json}`);
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
   * Set tab visibility state and drain queued messages on hidden→visible transition.
   * Called by the driver when it receives a VISIBILITY protocol message.
   */
  setTabVisible(visible: boolean): void {
    const wasHidden = !this._tabVisible;
    this._tabVisible = visible;
    const playerName = this.getPlayerName('no-player');
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
  }

  /**
   * Send a TIME_PONG response for RTT measurement.
   * Called by the driver when it receives a TIME_ACK protocol message.
   * Checks buffer before sending to avoid adding to an already full buffer.
   */
  sendTimePong(timestamp: string): void {
    const bufferedAmount = this.socket.bufferedAmount || 0;
    if (bufferedAmount > HARD_STOP_BUFFER_SIZE) {
      return; // Don't add to buffer if it's already too full
    }
    try {
      this.socket.send(`\x00[TIME_PONG]${timestamp}`);
    } catch {
      // Ignore send errors
    }
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
    const playerName = this.getPlayerName('no-player');

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
      const playerName = this.getPlayerName('no-player');
      console.log(`[CONN-PING] ${this._id} (${playerName}) sending ping (missedPongs: ${this._missedPongs})`);
    }

    try {
      this.socket.ping();
    } catch (error) {
      this.emitEvent('error', error as Error);
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

    const playerName = this.getPlayerName('no-player');
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
      this.emitEvent('error', error as Error);
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
    const playerName = this.getPlayerName('no-player');
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
