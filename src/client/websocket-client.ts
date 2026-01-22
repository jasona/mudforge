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
  | 'stats-message'
  | 'gui-message'
  | 'quest-message'
  | 'completion-message'
  | 'comm-message'
  | 'combat-message'
  | 'sound-message'
  | 'auth-response';

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
  permissionLevel: number;
  cwd: string;
  avatar: string;
  profilePortrait?: string; // AI-generated portrait data URI
  carriedWeight: number;
  maxCarryWeight: number;
  encumbrancePercent: number;
  encumbranceLevel: 'none' | 'light' | 'medium' | 'heavy';
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
  /** Mode for custom button text: 'bug' shows "Submit Bug" instead of "Save" */
  mode?: 'bug';
}

/**
 * GUI message structure for modal dialogs.
 * Full types are in mudlib/lib/gui-types.ts
 */
export interface GUIMessage {
  action: string;
  modalId?: string;
  modal?: unknown;
  layout?: unknown;
  buttons?: unknown[];
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Auth request message for launcher login/registration.
 */
export interface AuthRequest {
  type: 'login' | 'register';
  name?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  gender?: string;
  avatar?: string;
}

/**
 * Auth response message from server.
 */
export interface AuthResponseMessage {
  success: boolean;
  error?: string;
  errorCode?: 'invalid_credentials' | 'user_not_found' | 'name_taken' | 'validation_error';
  requiresRegistration?: boolean;
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
 * Communication message types.
 */
export type CommType = 'say' | 'tell' | 'channel';

/**
 * Communication panel message.
 */
export interface CommMessage {
  type: 'comm';
  commType: CommType;
  sender: string;
  message: string;
  channel?: string;
  recipients?: string[];
  timestamp: number;
  isSender?: boolean;    // True if recipient is the one who sent this message
}

/**
 * Combat target update message.
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
 * Combat target clear message.
 */
export interface CombatTargetClearMessage {
  type: 'target_clear';
}

export type CombatMessage = CombatTargetUpdateMessage | CombatTargetClearMessage;

/**
 * Sound category types.
 */
export type SoundCategory = 'combat' | 'spell' | 'skill' | 'potion' | 'quest' | 'celebration' | 'discussion' | 'alert' | 'ambient' | 'ui';

/**
 * Sound message for audio playback.
 */
export interface SoundMessage {
  type: 'play' | 'loop' | 'stop';
  category: SoundCategory;
  sound: string;
  volume?: number;
  id?: string;
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
        } else if (line.startsWith('\x00[GUI]')) {
          const jsonStr = line.slice(6); // Remove \x00[GUI] prefix
          try {
            const guiMessage = JSON.parse(jsonStr) as GUIMessage;
            this.emit('gui-message', guiMessage);
          } catch (error) {
            console.error('Failed to parse GUI message:', error);
          }
        } else if (line.startsWith('\x00[QUEST]')) {
          const jsonStr = line.slice(8); // Remove \x00[QUEST] prefix
          try {
            const questMessage = JSON.parse(jsonStr) as QuestMessage;
            this.emit('quest-message', questMessage);
          } catch (error) {
            console.error('Failed to parse QUEST message:', error);
          }
        } else if (line.startsWith('\x00[COMPLETE]')) {
          const jsonStr = line.slice(11); // Remove \x00[COMPLETE] prefix
          try {
            const completionMessage = JSON.parse(jsonStr) as CompletionMessage;
            this.emit('completion-message', completionMessage);
          } catch (error) {
            console.error('Failed to parse COMPLETE message:', error);
          }
        } else if (line.startsWith('\x00[COMM]')) {
          const jsonStr = line.slice(7); // Remove \x00[COMM] prefix
          try {
            const commMessage = JSON.parse(jsonStr) as CommMessage;
            this.emit('comm-message', commMessage);
          } catch (error) {
            console.error('Failed to parse COMM message:', error);
          }
        } else if (line.startsWith('\x00[AUTH]')) {
          const jsonStr = line.slice(7); // Remove \x00[AUTH] prefix
          try {
            const authMessage = JSON.parse(jsonStr) as AuthResponseMessage;
            this.emit('auth-response', authMessage);
          } catch (error) {
            console.error('Failed to parse AUTH message:', error);
          }
        } else if (line.startsWith('\x00[COMBAT]')) {
          const jsonStr = line.slice(9); // Remove \x00[COMBAT] prefix
          try {
            const combatMessage = JSON.parse(jsonStr) as CombatMessage;
            this.emit('combat-message', combatMessage);
          } catch (error) {
            console.error('Failed to parse COMBAT message:', error);
          }
        } else if (line.startsWith('\x00[SOUND]')) {
          const jsonStr = line.slice(8); // Remove \x00[SOUND] prefix
          try {
            const soundMessage = JSON.parse(jsonStr) as SoundMessage;
            this.emit('sound-message', soundMessage);
          } catch (error) {
            console.error('Failed to parse SOUND message:', error);
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
