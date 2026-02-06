/**
 * Shared protocol type definitions for server-client communication.
 *
 * These types are the canonical definitions used by both:
 * - Server (src/network/connection.ts)
 * - Client (src/client/websocket-client.ts, src/client/shared-websocket-client.ts)
 *
 * esbuild resolves the import for the client bundle automatically.
 */

/**
 * MAP protocol message type.
 * This is a minimal type - actual messages are defined in mudlib/lib/map-types.ts
 * and src/client/map-renderer.ts (which has the full union type).
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
 * STATS delta message - contains only fields that changed since last send.
 * Sent between full snapshots to reduce bandwidth.
 * Client merges delta into its cached full StatsMessage before rendering.
 */
export interface StatsDeltaMessage {
  type: 'delta';
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
  level?: number;
  xp?: number;
  xpToLevel?: number;
  gold?: number;
  bankedGold?: number;
  permissionLevel?: number;
  cwd?: string;
  avatar?: string;
  profilePortrait?: string;
  carriedWeight?: number;
  maxCarryWeight?: number;
  encumbrancePercent?: number;
  encumbranceLevel?: 'none' | 'light' | 'medium' | 'heavy';
  equipment?: {
    [slot: string]: EquipmentSlotData | null;
  };
}

/**
 * Union of full stats snapshot and delta update.
 * Clients should check `type` to determine how to process.
 */
export type StatsUpdate = StatsMessage | StatsDeltaMessage;

/**
 * EQUIPMENT protocol message type for equipment image updates.
 * Sent separately from STATS to avoid sending large images every heartbeat.
 * Only sent when equipment actually changes.
 */
export interface EquipmentMessage {
  type: 'equipment_update';
  /** Map of slot name to image data (only changed slots are included) */
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
 * GUI protocol message type for modal dialogs.
 * Full message types are defined in mudlib/lib/gui-types.ts
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
 * AUTH protocol message type for launcher authentication responses.
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
 * COMM protocol message type for say/tell/channel messages.
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
  gifId?: string;        // GIF ID for clickable [View GIF] links
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
 * Lightweight health-only update for combat rounds.
 * Avoids resending the portrait (which can be 50-200KB) every round.
 */
export interface CombatHealthUpdateMessage {
  type: 'health_update';
  health: number;
  maxHealth: number;
  healthPercent: number;
}

/**
 * Combat target clear message.
 */
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
 * Giphy message for floating GIF display.
 */
export interface GiphyMessage {
  type: 'show' | 'hide';
  gifUrl?: string;
  senderName?: string;
  channelName?: string;
  searchQuery?: string;
  autoCloseMs?: number;
}

/**
 * Session token message from server.
 */
export interface SessionTokenMessage {
  type: 'session_token';
  token: string;
  expiresAt: number;
}

/**
 * Session resume response from server.
 */
export interface SessionResumeMessage {
  type: 'session_resume' | 'session_invalid';
  success?: boolean;
  error?: string;
}

/**
 * Time message from server for clock display.
 */
export interface TimeMessage {
  timestamp: number;
  timezone: { name: string; abbreviation: string; offset: string };
  gameVersion?: string;
  /** Calculated round-trip latency in milliseconds (added by client) */
  latencyMs?: number;
}
