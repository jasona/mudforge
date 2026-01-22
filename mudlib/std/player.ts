/**
 * Player - Base class for player characters.
 *
 * Players are connected to real users via WebSocket connections.
 * They can save/restore their state and have additional capabilities
 * beyond regular Living beings.
 */

import { Living, type Stats, type StatName, MAX_STAT } from './living.js';

/**
 * Maximum player level cap.
 */
export const MAX_PLAYER_LEVEL = 50;
import { MudObject } from './object.js';
import { Item } from './item.js';
import { colorize, stripColors, wordWrap } from '../lib/colors.js';
import { getChannelDaemon } from '../daemons/channels.js';
import { getCombatDaemon } from '../daemons/combat.js';
import { Corpse } from './corpse.js';
import {
  getConfigOption,
  validateConfigValue,
  getDefaultConfig,
  CONFIG_OPTIONS,
  type ConfigOption,
} from '../lib/player-config.js';
import type { PlayerExplorationData, MapMessage } from '../lib/map-types.js';
import type { GUIMessage, GUIClientMessage } from '../lib/gui-types.js';
import type { PlayerGuildData } from './guild/types.js';
import type { QuestPlayer } from './quest/types.js';
import type { RaceId } from './race/types.js';

// Pet save data type (defined here to avoid circular dependency with pet.ts)
export interface PetSaveData {
  petId: string;
  templateType: string;
  petName: string | null;
  ownerName: string;
  health: number;
  maxHealth: number;
  inventory: string[];
  sentAway: boolean;
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
 * STATS protocol message for HP/MP/XP display.
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
 * Connection interface (implemented by driver's Connection class).
 */
export interface Connection {
  send(message: string): void;
  sendMap?(message: MapMessage): void;
  sendStats?(message: StatsMessage): void;
  sendGUI?(message: GUIMessage): void;
  sendCompletion?(message: CompletionMessage): void;
  sendCombat?(message: CombatMessage): void;
  close(): void;
  isConnected(): boolean;
}

/**
 * Equipment save data - which inventory index is equipped in which slot.
 */
export interface EquipmentSaveData {
  slot: string;
  inventoryIndex: number;
}

/**
 * Player save data structure.
 */
export interface PlayerSaveData {
  name: string;
  title: string;
  gender: 'male' | 'female' | 'neutral';
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  stats: Stats;
  location: string;
  inventory: string[];
  equipment?: EquipmentSaveData[];
  properties: Record<string, unknown>;
  createdAt: number;
  lastLogin: number;
  playTime: number;
  monitorEnabled?: boolean;
  displayName?: string | null;
  cwd?: string;
  previousLocation?: string | null; // For link-dead players
  enterMessage?: string; // Custom room enter message
  exitMessage?: string; // Custom room exit message
  exploration?: PlayerExplorationData; // Map exploration data
  gold?: number; // Carried gold (lost on death)
  bankedGold?: number; // Banked gold (safe from death)
  guildData?: PlayerGuildData; // Guild memberships and skills
  avatar?: string; // Avatar portrait ID
  staffVanished?: boolean; // Staff visibility toggle
  race?: RaceId; // Player race
  pets?: PetSaveData[]; // Pet save data
}

/**
 * Base class for players.
 */
export class Player extends Living {
  private _connection: Connection | null = null;
  private _password: string = '';
  private _email: string = '';
  private _createdAt: number = 0;
  private _lastLogin: number = 0;
  private _playTime: number = 0;
  private _sessionStart: number = 0;
  private _inputHandler: ((input: string) => void | Promise<void>) | null = null;
  private _promptEnabled: boolean = true;
  private _prompt: string = '> ';
  private _permissionLevel: number = 0; // 0=player, 1=builder, 2=senior, 3=admin
  private _experience: number = 0;
  private _monitorEnabled: boolean = false;
  private _ipAddress: string = 'unknown';
  private _resolvedHostname: string | null = null;
  private _hasQuit: boolean = false; // True if player quit properly (vs disconnected)
  private _displayName: string | null = null; // Custom display name with colors/formatting
  private _cwd: string = '/'; // Current working directory for file operations (builders+)

  // Ghost mode (death)
  private _isGhost: boolean = false;
  private _corpse: Corpse | null = null;
  private _corpseLocation: MudObject | null = null;
  private _deathLocation: MudObject | null = null;

  // Disconnect state (link-dead handling)
  private _previousLocation: string | null = null; // Path before moving to void
  private _disconnectTime: number = 0; // When disconnected (Unix timestamp)
  private _disconnectTimerId: number | null = null; // Timer for auto-quit

  // Activity tracking (for idle time)
  private _lastActivityTime: number = 0;

  // Map exploration tracking
  private _exploredRooms: Set<string> = new Set();
  private _revealedRooms: Set<string> = new Set();
  private _detectedHiddenExits: Map<string, Set<string>> = new Map();

  // Currency
  private _gold: number = 0; // Carried gold (lost on death)
  private _bankedGold: number = 0; // Banked gold (safe from death)

  // Appearance
  private _avatar: string = 'avatar_m1'; // Avatar portrait ID

  // Staff vanish (visibility system)
  private _staffVanished: boolean = false;

  // Race
  private _race: RaceId = 'human';

  // Pending pet data (stored during restore, applied after entering room)
  private _pendingPetData: PetSaveData[] | null = null;

  constructor() {
    super();
    this.shortDesc = 'a player';
    this.longDesc = 'You see a player.';
  }

  // ========== Connection ==========

  /**
   * Get the player's connection.
   */
  get connection(): Connection | null {
    return this._connection;
  }

  /**
   * Bind a connection to this player.
   * @param connection The connection to bind
   */
  bindConnection(connection: Connection): void {
    this._connection = connection;
    this._sessionStart = typeof efuns !== 'undefined' ? efuns.time() : Math.floor(Date.now() / 1000);
    this._lastLogin = this._sessionStart;
    this._lastActivityTime = this._sessionStart;

    // Always register for heartbeats when connected (for stats panel updates)
    if (typeof efuns !== 'undefined' && efuns.setHeartbeat) {
      efuns.setHeartbeat(this, true);
    }
  }

  /**
   * Unbind the connection from this player.
   */
  unbindConnection(): void {
    if (this._sessionStart > 0) {
      const now = typeof efuns !== 'undefined' ? efuns.time() : Math.floor(Date.now() / 1000);
      this._playTime += now - this._sessionStart;
    }
    this._connection = null;
    this._sessionStart = 0;

    // Unregister from heartbeats when disconnected
    if (typeof efuns !== 'undefined' && efuns.setHeartbeat) {
      efuns.setHeartbeat(this, false);
    }
  }

  /**
   * Check if the player is connected.
   */
  isConnected(): boolean {
    return this._connection !== null && this._connection.isConnected();
  }

  // ========== IP Address / Hostname ==========

  /**
   * Get the player's IP address.
   */
  get ipAddress(): string {
    return this._ipAddress;
  }

  /**
   * Set the player's IP address.
   */
  set ipAddress(value: string) {
    this._ipAddress = value;
  }

  /**
   * Get the resolved hostname for the player's IP.
   * Returns null if not yet resolved or resolution failed.
   */
  get resolvedHostname(): string | null {
    return this._resolvedHostname;
  }

  /**
   * Set the resolved hostname.
   */
  set resolvedHostname(value: string | null) {
    this._resolvedHostname = value;
  }

  /**
   * Get the display address (hostname if available, otherwise IP).
   */
  getDisplayAddress(): string {
    if (this._resolvedHostname && this._resolvedHostname !== this._ipAddress) {
      return `${this._resolvedHostname} (${this._ipAddress})`;
    }
    return this._ipAddress;
  }

  // ========== Display Name ==========

  /**
   * Get the raw display name template (with $N placeholder).
   * Returns null if no custom display name is set.
   */
  get displayName(): string | null {
    return this._displayName;
  }

  /**
   * Set a custom display name template.
   * Use $N as a placeholder for the player's actual name.
   * Use color codes like {blue}, {green}, {bold}, etc.
   * Example: "Sir {blue}$N{/} says {green}NI{/} all the time!"
   * Set to null to clear the custom display name.
   */
  set displayName(value: string | null) {
    this._displayName = value;
  }

  // ========== Current Working Directory ==========

  /**
   * Get the current working directory for file operations.
   * Used by builder commands (ls, cd, cat, etc.)
   */
  get cwd(): string {
    return this._cwd;
  }

  /**
   * Set the current working directory.
   * @param value The new directory path (must be absolute, starting with /)
   */
  set cwd(value: string) {
    // Normalize: ensure starts with / and doesn't end with / (except root)
    let normalized = value.startsWith('/') ? value : '/' + value;
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    this._cwd = normalized;
  }

  // ========== Disconnect State ==========

  /**
   * Get the player's previous location (before being moved to void on disconnect).
   * Returns null if player hasn't disconnected or has already been restored.
   */
  get previousLocation(): string | null {
    return this._previousLocation;
  }

  /**
   * Set the player's previous location.
   * Used when player disconnects to remember where to restore them.
   */
  set previousLocation(value: string | null) {
    this._previousLocation = value;
  }

  /**
   * Get the time when the player disconnected (Unix timestamp).
   * Returns 0 if player hasn't disconnected.
   */
  get disconnectTime(): number {
    return this._disconnectTime;
  }

  /**
   * Set the disconnect time.
   */
  set disconnectTime(value: number) {
    this._disconnectTime = value;
  }

  /**
   * Get the disconnect timer ID.
   */
  get disconnectTimerId(): number | null {
    return this._disconnectTimerId;
  }

  /**
   * Set the disconnect timer ID.
   */
  set disconnectTimerId(value: number | null) {
    this._disconnectTimerId = value;
  }

  /**
   * Clear the disconnect timer (if any).
   * Called when player reconnects to prevent auto-quit.
   */
  clearDisconnectTimer(): void {
    if (this._disconnectTimerId !== null && typeof efuns !== 'undefined') {
      efuns.removeCallOut(this._disconnectTimerId);
      this._disconnectTimerId = null;
    }
    this._disconnectTime = 0;
  }

  /**
   * Check if player is currently link-dead (disconnected but still in game).
   */
  get isLinkDead(): boolean {
    return this._previousLocation !== null && !this.isConnected();
  }

  // ========== Map Exploration ==========

  /**
   * Check if the player has explored a room.
   * @param roomPath The room's object path
   */
  hasExplored(roomPath: string): boolean {
    return this._exploredRooms.has(roomPath);
  }

  /**
   * Mark a room as explored.
   * @param roomPath The room's object path
   * @returns true if this was a new exploration
   */
  markExplored(roomPath: string): boolean {
    if (this._exploredRooms.has(roomPath)) {
      return false;
    }
    this._exploredRooms.add(roomPath);
    // If it was revealed, it's now explored
    this._revealedRooms.delete(roomPath);
    return true;
  }

  /**
   * Get all explored room paths.
   */
  getExploredRooms(): string[] {
    return Array.from(this._exploredRooms);
  }

  /**
   * Check if a room has been revealed (e.g., by treasure map).
   * @param roomPath The room's object path
   */
  hasRevealed(roomPath: string): boolean {
    return this._revealedRooms.has(roomPath);
  }

  /**
   * Mark a room as revealed (visible on map but not visited).
   * @param roomPath The room's object path
   * @returns true if this was a new reveal
   */
  markRevealed(roomPath: string): boolean {
    // Don't reveal if already explored
    if (this._exploredRooms.has(roomPath)) {
      return false;
    }
    if (this._revealedRooms.has(roomPath)) {
      return false;
    }
    this._revealedRooms.add(roomPath);
    return true;
  }

  /**
   * Mark multiple rooms as revealed.
   * @param roomPaths Array of room paths to reveal
   * @returns Number of newly revealed rooms
   */
  revealRooms(roomPaths: string[]): number {
    let count = 0;
    for (const path of roomPaths) {
      if (this.markRevealed(path)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get all revealed room paths.
   */
  getRevealedRooms(): string[] {
    return Array.from(this._revealedRooms);
  }

  /**
   * Check if a hidden exit has been detected.
   * @param roomPath The room's object path
   * @param direction The exit direction
   */
  hasDetectedHiddenExit(roomPath: string, direction: string): boolean {
    const exits = this._detectedHiddenExits.get(roomPath);
    return exits?.has(direction.toLowerCase()) ?? false;
  }

  /**
   * Mark a hidden exit as detected.
   * @param roomPath The room's object path
   * @param direction The exit direction
   */
  markHiddenExitDetected(roomPath: string, direction: string): void {
    let exits = this._detectedHiddenExits.get(roomPath);
    if (!exits) {
      exits = new Set();
      this._detectedHiddenExits.set(roomPath, exits);
    }
    exits.add(direction.toLowerCase());
  }

  /**
   * Get all detected hidden exits for a room.
   * @param roomPath The room's object path
   */
  getDetectedHiddenExits(roomPath: string): string[] {
    const exits = this._detectedHiddenExits.get(roomPath);
    return exits ? Array.from(exits) : [];
  }

  /**
   * Get the exploration data for saving.
   */
  getExplorationData(): PlayerExplorationData {
    const detectedHiddenExits: Record<string, string[]> = {};
    for (const [roomPath, exits] of this._detectedHiddenExits) {
      detectedHiddenExits[roomPath] = Array.from(exits);
    }
    return {
      exploredRooms: Array.from(this._exploredRooms),
      revealedRooms: Array.from(this._revealedRooms),
      detectedHiddenExits,
    };
  }

  /**
   * Restore exploration data from saved data.
   */
  restoreExplorationData(data: PlayerExplorationData): void {
    this._exploredRooms = new Set(data.exploredRooms || []);
    this._revealedRooms = new Set(data.revealedRooms || []);
    this._detectedHiddenExits = new Map();
    if (data.detectedHiddenExits) {
      for (const [roomPath, exits] of Object.entries(data.detectedHiddenExits)) {
        this._detectedHiddenExits.set(roomPath, new Set(exits));
      }
    }
  }

  /**
   * Send a map update to the client.
   * Called after the player moves to a new room.
   * @param fromRoom The room the player left (optional)
   */
  async sendMapUpdate(fromRoom?: MudObject): Promise<void> {
    // Check if connection supports map messages
    if (!this._connection?.sendMap) {
      return;
    }

    const currentRoom = this.environment;
    if (!currentRoom) {
      return;
    }

    try {
      // Dynamic import to avoid circular dependency
      const { getMapDaemon } = await import('../daemons/map.js');
      const mapDaemon = getMapDaemon();

      // Cast rooms to the interface the map daemon expects
      type MapRoom = Parameters<typeof mapDaemon.generateClientRoomData>[0];
      type MapPlayer = Parameters<typeof mapDaemon.generateClientRoomData>[1];

      // Generate and send map message
      if (fromRoom) {
        // Check if we changed areas
        const fromCoords = mapDaemon.getRoomCoordinates(fromRoom as unknown as MapRoom);
        const toCoords = mapDaemon.getRoomCoordinates(currentRoom as unknown as MapRoom);

        if (fromCoords.area !== toCoords.area) {
          // Area changed - send full area data for new area
          const message = mapDaemon.generateAreaMapData(
            this as unknown as MapPlayer,
            currentRoom as unknown as MapRoom
          );
          this._connection.sendMap(message);
        } else {
          // Same area - send move message
          const message = mapDaemon.generateMoveMessage(
            this as unknown as MapPlayer,
            fromRoom as unknown as MapRoom,
            currentRoom as unknown as MapRoom
          );
          this._connection.sendMap(message);
        }
      } else {
        // Player teleported or just logged in - send full area data
        const message = mapDaemon.generateAreaMapData(
          this as unknown as MapPlayer,
          currentRoom as unknown as MapRoom
        );
        this._connection.sendMap(message);
      }
    } catch {
      // Silently fail if map daemon isn't available
    }
  }

  /**
   * Send combat target update to the client.
   * Called when combat starts, damage is dealt, or combat ends.
   * @param target The combat target (null to clear the panel)
   */
  async sendCombatTarget(target: Living | null): Promise<void> {
    // Check if connection supports combat messages
    if (!this._connection?.sendCombat) {
      return;
    }

    // Clear the panel if no target
    if (!target) {
      this._connection.sendCombat({ type: 'target_clear' });
      return;
    }

    try {
      // Dynamic import to avoid circular dependency
      const { getPortraitDaemon } = await import('../daemons/portrait.js');
      const portraitDaemon = getPortraitDaemon();

      // Get portrait for the target
      const portrait = await portraitDaemon.getPortrait(target);

      // Determine if target is a player
      const isPlayer = 'permissionLevel' in target && typeof (target as unknown as { permissionLevel: number }).permissionLevel === 'number';

      // Send target update
      this._connection.sendCombat({
        type: 'target_update',
        target: {
          name: target.name,
          level: target.level,
          portrait,
          health: target.health,
          maxHealth: target.maxHealth,
          healthPercent: target.healthPercent,
          isPlayer,
        },
      });
    } catch {
      // Silently fail if portrait daemon isn't available
    }
  }

  // ========== Player Configuration ==========

  /**
   * Get a configuration value.
   * Returns the player's setting, or the default if not set.
   * @param key The config key
   */
  getConfig<T = unknown>(key: string): T {
    const option = getConfigOption(key);
    if (!option) {
      throw new Error(`Unknown config key: ${key}`);
    }
    const stored = this.getProperty(`config.${key}`);
    if (stored !== undefined) {
      return stored as T;
    }
    return option.default as T;
  }

  /**
   * Set a configuration value.
   * Validates the value before storing.
   * @param key The config key
   * @param value The value to set
   * @returns Object with success status and optional error message
   */
  setConfig(key: string, value: unknown): { success: boolean; error?: string } {
    const result = validateConfigValue(key, value);
    if (!result.valid) {
      return { success: false, error: result.error };
    }
    this.setProperty(`config.${key}`, result.normalizedValue);
    return { success: true };
  }

  /**
   * Reset a configuration to its default value.
   * @param key The config key
   */
  resetConfig(key: string): boolean {
    const option = getConfigOption(key);
    if (!option) {
      return false;
    }
    this.deleteProperty(`config.${key}`);
    return true;
  }

  /**
   * Reset all configurations to defaults.
   */
  resetAllConfig(): void {
    for (const option of CONFIG_OPTIONS) {
      this.deleteProperty(`config.${option.key}`);
    }
  }

  /**
   * Get all configuration values (including defaults).
   */
  getAllConfig(): Record<string, unknown> {
    const config = getDefaultConfig();
    // Override with stored values
    for (const option of CONFIG_OPTIONS) {
      const stored = this.getProperty(`config.${option.key}`);
      if (stored !== undefined) {
        config[option.key] = stored;
      }
    }
    return config;
  }

  /**
   * Get the formatted display name for showing to other players.
   * If a custom display name is set, $N is replaced with the player's name.
   * Otherwise, returns the player's name.
   */
  getDisplayName(): string {
    if (this._displayName) {
      return this._displayName.replace(/\$N/gi, this.name);
    }
    return this.name;
  }

  /**
   * Override shortDesc to return the formatted display name.
   * Shows ghost status if dead.
   * This is what other players see when looking at the room.
   */
  override get shortDesc(): string {
    const baseName = this.getDisplayName();
    if (this._isGhost) {
      return `{dim}the ghost of ${baseName}{/}`;
    }
    return baseName;
  }

  /**
   * Set the short description (still allows direct setting).
   */
  override set shortDesc(value: string) {
    // Store in parent's shortDesc - but getDisplayName will override for display
    super.shortDesc = value;
  }

  // ========== Input/Output ==========

  /**
   * Receive a message (send to connection).
   * Automatically processes color tokens like {red}, {bold}, etc.
   * If color config is disabled, strips color tokens instead.
   * Applies word wrapping based on screenWidth config.
   * @param message The message to receive
   */
  override receive(message: string): void {
    if (this._connection) {
      // Check if color is enabled (default true)
      const colorEnabled = this.getConfig<boolean>('color');
      let processed: string;

      if (colorEnabled) {
        // Process color tokens to ANSI codes
        processed = colorize(message);
      } else {
        // Strip color tokens for plain text
        processed = stripColors(message);
      }

      // Apply word wrapping if screenWidth > 0
      const screenWidth = this.getConfig<number>('screenWidth');
      if (screenWidth > 0) {
        processed = wordWrap(processed, screenWidth);
      }

      this._connection.send(processed);

      // Forward to snoopers via driver efun
      if (typeof efuns !== 'undefined' && efuns.snoopForward) {
        efuns.snoopForward(this, message);
      }
    }
  }

  /**
   * Send a prompt to the player.
   * Expands prompt tokens:
   *   %h - current health
   *   %H - max health
   *   %m - current mana
   *   %M - max mana
   *   %l - current location (room short desc)
   *   %d - current working directory (builders+ only)
   *   %n - player name
   *   %% - literal %
   */
  sendPrompt(): void {
    if (this._promptEnabled && this._connection) {
      const promptTemplate = this.getConfig<string>('prompt');
      const expanded = this.expandPrompt(promptTemplate);
      // Check if color is enabled
      const colorEnabled = this.getConfig<boolean>('color');
      // Add blank line before prompt for visual separation
      this._connection.send('\n');
      if (colorEnabled) {
        this._connection.send(colorize(expanded));
      } else {
        this._connection.send(stripColors(expanded));
      }
    }
  }

  /**
   * Expand prompt tokens to their values.
   */
  private expandPrompt(template: string): string {
    return template.replace(/%([hHmMldnN%])/g, (match, token) => {
      switch (token) {
        case 'h':
          return String(this.health);
        case 'H':
          return String(this.maxHealth);
        case 'm':
          return String(this.mana);
        case 'M':
          return String(this.maxMana);
        case 'l':
          return this.environment?.shortDesc || 'nowhere';
        case 'd':
          // Only show cwd for builders and up
          if (this._permissionLevel >= 1) {
            return this._cwd;
          }
          return '%d'; // Keep literal for non-builders
        case 'n':
          return this.name;
        case 'N':
          return this.name.charAt(0).toUpperCase() + this.name.slice(1);
        case '%':
          return '%';
        default:
          return match;
      }
    });
  }

  /**
   * Set a custom input handler.
   * While set, commands go to this handler instead of normal command parsing.
   * @param handler The input handler function
   */
  setInputHandler(handler: ((input: string) => void | Promise<void>) | null): void {
    this._inputHandler = handler;
  }

  /**
   * Get the current input handler.
   */
  getInputHandler(): ((input: string) => void | Promise<void>) | null {
    return this._inputHandler;
  }

  /**
   * Process input from the player.
   * @param input The input string
   */
  async processInput(input: string): Promise<void> {
    // Update last activity time for idle tracking
    this._lastActivityTime = typeof efuns !== 'undefined' ? efuns.time() : Math.floor(Date.now() / 1000);

    // Forward command to snoopers (if any)
    if (typeof efuns !== 'undefined' && efuns.snoopForward) {
      efuns.snoopForward(this, `{dim}> ${input}{/}\n`);
    }

    // If there's a custom input handler, use it
    if (this._inputHandler) {
      await this._inputHandler(input);
      return;
    }

    // First, try the command manager (cmds/ directory commands)
    // Use getter to get permission level from central permissions system
    if (typeof efuns !== 'undefined' && efuns.executeCommand) {
      const handled = await efuns.executeCommand(this, input, this.permissionLevel);
      if (handled) {
        this.sendPrompt();
        return;
      }
    }

    // Try channel names as commands (e.g., "intermud hello" or "shout hello")
    const channelHandled = await this.tryChannelCommand(input);
    if (channelHandled) {
      this.sendPrompt();
      return;
    }

    // Fall back to object-based actions (addAction system)
    const handled = await this.command(input);
    if (!handled) {
      this.receive("What?\n");
    }

    // Send prompt after command
    this.sendPrompt();
  }

  /**
   * Try to handle input as a channel command.
   * Channel names can be used directly as commands, e.g., "intermud hello world"
   * @param input The full input string
   * @returns true if handled as a channel command, false otherwise
   */
  private async tryChannelCommand(input: string): Promise<boolean> {
    const trimmed = input.trim();
    if (!trimmed) return false;

    // Parse verb and message
    const spaceIndex = trimmed.indexOf(' ');
    const channelName = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
    const message = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1).trim();

    // Get the channel daemon (already imported at top of file)
    const daemon = getChannelDaemon();

    // Check if this is a valid channel name
    const channel = daemon.getChannel(channelName);
    if (!channel) {
      return false;
    }

    // Check access
    if (!daemon.canAccess(this, channelName)) {
      return false;
    }

    // If no message, show usage
    if (!message) {
      this.receive(`Usage: ${channelName} <message>\n`);
      return true;
    }

    // Send the message
    daemon.send(this, channelName, message);
    return true;
  }

  // ========== Settings ==========

  /**
   * Get the prompt string.
   */
  get prompt(): string {
    return this._prompt;
  }

  /**
   * Set the prompt string.
   */
  set prompt(value: string) {
    this._prompt = value;
  }

  /**
   * Check if prompts are enabled.
   */
  get promptEnabled(): boolean {
    return this._promptEnabled;
  }

  /**
   * Enable or disable prompts.
   */
  set promptEnabled(value: boolean) {
    this._promptEnabled = value;
  }

  /**
   * Get the permission level (0=player, 1=builder, 2=senior, 3=admin).
   * Uses the central permissions system as the source of truth.
   */
  get permissionLevel(): number {
    // Use central permissions system if we have a name and efuns is available
    if (this._name && typeof efuns !== 'undefined' && efuns.getPlayerPermissionLevel) {
      return efuns.getPlayerPermissionLevel(this._name);
    }
    // Fall back to local property during initialization or in tests
    return this._permissionLevel;
  }

  /**
   * Set the permission level.
   * Note: This updates the local cache. Use promote/demote commands
   * to update the central permissions system.
   */
  set permissionLevel(value: number) {
    this._permissionLevel = value;
  }

  /**
   * Get the permission level as a method (for driver compatibility).
   * Uses the central permissions system as the source of truth.
   */
  getPermissionLevel(): number {
    if (this._name) {
      return efuns.getPlayerPermissionLevel(this._name);
    }
    return this._permissionLevel;
  }

  /**
   * Get the current working directory as a method (for driver compatibility).
   */
  getCwd(): string {
    return this._cwd;
  }

  // ========== Monitor ==========

  /**
   * Check if the vitals monitor is enabled.
   */
  get monitorEnabled(): boolean {
    return this._monitorEnabled;
  }

  /**
   * Enable or disable the vitals monitor (text-based display).
   * Note: Heartbeats are always active while connected for stats panel updates.
   */
  set monitorEnabled(value: boolean) {
    this._monitorEnabled = value;
  }

  /**
   * Generate a bar visualization for the monitor.
   */
  private _makeBar(current: number, max: number, width: number, color: string): string {
    const percentage = Math.max(0, Math.min(1, current / max));
    const filled = Math.round(percentage * width);
    const empty = width - filled;
    return `{${color}}${'█'.repeat(filled)}{/}{dim}${'░'.repeat(empty)}{/}`;
  }

  /**
   * Called each heartbeat. Sends stats to client and shows vitals monitor if enabled.
   */
  override heartbeat(): void {
    super.heartbeat();

    // Send stats update to client (for graphical display)
    if (this._connection?.sendStats) {
      const profilePortrait = this.getProperty('profilePortrait');

      // Build equipment data from getAllEquipped()
      const equipmentData: Record<string, EquipmentSlotData | null> = {};
      const equipped = this.getAllEquipped();
      const slots = ['head', 'chest', 'hands', 'legs', 'feet', 'cloak', 'main_hand', 'off_hand'];
      for (const slot of slots) {
        const item = equipped.get(slot as 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'cloak' | 'main_hand' | 'off_hand');
        if (item) {
          const isWeapon = 'wield' in item;
          const itemType = isWeapon ? 'weapon' : 'armor';
          const cachedImage = item.getProperty('cachedImage');

          // Build slot data with tooltip info
          const slotData: EquipmentSlotData = {
            name: item.shortDesc,
            image: typeof cachedImage === 'string' ? cachedImage : undefined,
            itemType: itemType as 'weapon' | 'armor',
            description: item.longDesc,
            weight: 'weight' in item ? (item as unknown as { weight: number }).weight : undefined,
            value: 'value' in item ? (item as unknown as { value: number }).value : undefined,
          };

          // Add weapon-specific data
          if (isWeapon) {
            const weapon = item as unknown as {
              minDamage: number;
              maxDamage: number;
              damageType: string;
              handedness: string;
            };
            slotData.minDamage = weapon.minDamage;
            slotData.maxDamage = weapon.maxDamage;
            slotData.damageType = weapon.damageType;
            slotData.handedness = weapon.handedness;
          } else {
            // Armor-specific data
            const armor = item as unknown as {
              armor: number;
              slot: string;
            };
            slotData.armor = armor.armor;
            slotData.slot = armor.slot;
          }

          equipmentData[slot] = slotData;
        } else {
          equipmentData[slot] = null;
        }
      }

      this._connection.sendStats({
        type: 'update',
        hp: this.health,
        maxHp: this.maxHealth,
        mp: this.mana,
        maxMp: this.maxMana,
        level: this.level,
        xp: this._experience,
        xpToLevel: this.xpForNextLevel,
        gold: this._gold,
        bankedGold: this._bankedGold,
        permissionLevel: this._permissionLevel,
        cwd: this._cwd,
        avatar: this._avatar,
        profilePortrait: typeof profilePortrait === 'string' ? profilePortrait : undefined,
        carriedWeight: this.getCarriedWeight(),
        maxCarryWeight: this.getMaxCarryWeight(),
        encumbrancePercent: this.getEncumbrancePercent(),
        encumbranceLevel: this.getEncumbranceLevel(),
        equipment: equipmentData,
      });
    }

    // Show text-based vitals monitor if enabled
    if (!this._monitorEnabled || !this._connection) return;

    // Don't display if both HP and MP are at max
    if (this.health >= this.maxHealth && this.mana >= this.maxMana) return;

    // Determine HP bar color based on percentage
    const hpPercent = this.health / this.maxHealth;
    let hpColor = 'green';
    if (hpPercent <= 0.25) hpColor = 'red';
    else if (hpPercent <= 0.5) hpColor = 'yellow';

    // Determine MP bar color based on percentage
    const mpPercent = this.mana / this.maxMana;
    let mpColor = 'blue';
    if (mpPercent <= 0.25) mpColor = 'BLUE';
    else if (mpPercent <= 0.5) mpColor = 'cyan';

    const hpBar = this._makeBar(this.health, this.maxHealth, 15, hpColor);
    const mpBar = this._makeBar(this.mana, this.maxMana, 15, mpColor);

    this.receive(`HP: ${hpBar} (${this.health}/${this.maxHealth})  MP: ${mpBar} (${this.mana}/${this.maxMana})\n`);
  }

  // ========== Account ==========

  /**
   * Get the email address.
   */
  get email(): string {
    return this._email;
  }

  /**
   * Set the email address.
   */
  set email(value: string) {
    this._email = value;
  }

  /**
   * Set the password (hashed).
   * @param hashedPassword The hashed password
   */
  setPassword(hashedPassword: string): void {
    this._password = hashedPassword;
  }

  /**
   * Verify a password.
   * Note: In a real implementation, this would use bcrypt or similar.
   * @param hashedPassword The hashed password to verify
   */
  verifyPassword(hashedPassword: string): boolean {
    return this._password === hashedPassword;
  }

  /**
   * Get the account creation time.
   */
  get createdAt(): number {
    return this._createdAt;
  }

  /**
   * Get the last login time.
   */
  get lastLogin(): number {
    return this._lastLogin;
  }

  /**
   * Get total play time in seconds.
   */
  get playTime(): number {
    let total = this._playTime;
    if (this._sessionStart > 0) {
      const now = typeof efuns !== 'undefined' ? efuns.time() : Math.floor(Date.now() / 1000);
      total += now - this._sessionStart;
    }
    return total;
  }

  /**
   * Get idle time in seconds (time since last activity).
   * Returns 0 if not connected or no activity recorded.
   */
  get idleTime(): number {
    if (!this._connection || this._lastActivityTime === 0) {
      return 0;
    }
    const now = typeof efuns !== 'undefined' ? efuns.time() : Math.floor(Date.now() / 1000);
    return now - this._lastActivityTime;
  }

  /**
   * Get the timestamp of last activity.
   */
  get lastActivityTime(): number {
    return this._lastActivityTime;
  }

  // ========== Experience & Leveling ==========

  /**
   * Get current experience points.
   */
  get experience(): number {
    return this._experience;
  }

  /**
   * Set experience points.
   */
  set experience(value: number) {
    this._experience = Math.max(0, value);
  }

  /**
   * Calculate XP required for a specific level.
   * Uses a quadratic formula: level^2 * 100
   * Level 2 = 400 XP, Level 3 = 900 XP, Level 10 = 10000 XP, etc.
   * @param level The target level
   */
  static xpForLevel(level: number): number {
    if (level <= 1) return 0;
    return level * level * 100;
  }

  /**
   * Get XP required for the next level.
   */
  get xpForNextLevel(): number {
    return Player.xpForLevel(this.level + 1);
  }

  /**
   * Get XP needed to reach the next level (remaining XP).
   */
  get xpToNextLevel(): number {
    return Math.max(0, this.xpForNextLevel - this._experience);
  }

  /**
   * Override level setter to enforce player level cap.
   */
  override set level(value: number) {
    super.level = Math.max(1, Math.min(MAX_PLAYER_LEVEL, value));
  }

  /**
   * Override level getter to maintain consistent behavior.
   */
  override get level(): number {
    return super.level;
  }

  /**
   * Calculate XP cost to raise a stat by 1 point.
   * Cost increases with current stat value: currentStat * 50
   * @param stat The stat to check
   */
  xpToRaiseStat(stat: StatName): number {
    const currentValue = this.getBaseStat(stat);
    return currentValue * 50;
  }

  /**
   * Gain experience points.
   * @param amount Amount of XP to gain
   */
  gainExperience(amount: number): void {
    if (amount <= 0) return;
    this._experience += amount;
    this.receive(`{yellow}You gain ${amount} experience points!{/}\n`);
  }

  /**
   * Spend XP to level up.
   * @returns true if level up succeeded, false if not enough XP or at max level
   */
  levelUp(): boolean {
    // Check level cap
    if (this.level >= MAX_PLAYER_LEVEL) {
      this.receive(`{yellow}You have reached the maximum level!{/}\n`);
      return false;
    }

    const cost = this.xpForNextLevel;
    if (this._experience < cost) {
      return false;
    }

    this._experience -= cost;
    this.level++;
    this.receive(`{bold}{yellow}Congratulations! You are now level ${this.level}!{/}\n`);

    // Play level up celebration sound
    if (typeof efuns !== 'undefined' && efuns.playSound) {
      efuns.playSound(this, 'celebration', 'levelup', { volume: 0.7 });
    }

    this.onLevelUp();
    return true;
  }

  /**
   * Spend XP to raise a stat by 1 point.
   * @param stat The stat to raise
   * @returns true if stat was raised, false if not enough XP or at max
   */
  raiseStat(stat: StatName): boolean {
    const currentValue = this.getBaseStat(stat);
    if (currentValue >= MAX_STAT) {
      this.receive(`{red}Your ${stat} is already at maximum!{/}\n`);
      return false;
    }

    const cost = this.xpToRaiseStat(stat);
    if (this._experience < cost) {
      this.receive(`{red}You need ${cost} XP to raise ${stat}. You have ${this._experience}.{/}\n`);
      return false;
    }

    this._experience -= cost;
    this.setBaseStat(stat, currentValue + 1);
    this.receive(`{green}You raise your ${stat} to ${currentValue + 1}! (Cost: ${cost} XP){/}\n`);
    return true;
  }

  /**
   * Called when the player levels up.
   * Override for custom level-up behavior (bonus HP, mana, etc.)
   */
  onLevelUp(): void {
    // Default: increase max HP and mana slightly
    this.maxHealth += 10;
    this.health += 10;
    this.maxMana += 5;
    this.mana += 5;
  }

  // ========== Currency ==========

  /**
   * Get the player's carried gold (lost on death).
   */
  get gold(): number {
    return this._gold;
  }

  /**
   * Set the player's carried gold.
   */
  set gold(value: number) {
    this._gold = Math.max(0, Math.floor(value));
  }

  /**
   * Get the player's banked gold (safe from death).
   */
  get bankedGold(): number {
    return this._bankedGold;
  }

  /**
   * Set the player's banked gold.
   */
  set bankedGold(value: number) {
    this._bankedGold = Math.max(0, Math.floor(value));
  }

  /**
   * Get the player's avatar portrait ID.
   */
  get avatar(): string {
    return this._avatar;
  }

  /**
   * Set the player's avatar portrait ID.
   */
  set avatar(value: string) {
    // Valid avatar IDs: avatar_m1-m4, avatar_f1-f4, avatar_a1-a2
    if (/^avatar_[mfa][1-4]$/.test(value) || /^avatar_a[12]$/.test(value)) {
      this._avatar = value;
    }
  }

  // ========== Race ==========

  /**
   * Get the player's race.
   */
  get race(): RaceId {
    return this._race;
  }

  /**
   * Set the player's race.
   * Should only be set during character creation.
   */
  set race(value: RaceId) {
    this._race = value;
  }

  // ========== Staff Vanish (Visibility) ==========

  /**
   * Check if the player is staff vanished.
   * Staff vanish makes the player invisible to lower-rank staff and all players.
   */
  get isStaffVanished(): boolean {
    return this._staffVanished;
  }

  /**
   * Toggle staff vanish mode.
   * Only available to builders and above (permissionLevel >= 1).
   * @returns true if successfully toggled, false if not allowed
   */
  vanish(): boolean {
    const permLevel = this.permissionLevel;

    // Must be builder or above to vanish
    if (permLevel < 1) {
      this.receive("{red}You don't have permission to vanish.{/}\n");
      return false;
    }

    this._staffVanished = !this._staffVanished;

    // Get the room for announcements
    const room = this.environment;

    if (this._staffVanished) {
      this.receive('{cyan}You fade from view.{/}\n');
      // Announce departure to those who can't see us
      if (room && 'broadcast' in room) {
        const roomObj = room as { broadcast: (msg: string, opts?: { filter?: (o: unknown) => boolean }) => void };
        roomObj.broadcast(`{dim}${this.name} vanishes into thin air.{/}\n`, {
          filter: (obj: unknown) => {
            // Only send to those who won't be able to see us anymore
            const viewer = obj as { permissionLevel?: number };
            const viewerLevel = viewer.permissionLevel ?? 0;
            return viewerLevel <= permLevel;
          },
        });
      }
    } else {
      this.receive('{cyan}You fade back into view.{/}\n');
      // Announce arrival to those who couldn't see us
      if (room && 'broadcast' in room) {
        const roomObj = room as { broadcast: (msg: string, opts?: { exclude?: unknown[]; filter?: (o: unknown) => boolean }) => void };
        roomObj.broadcast(`{dim}${this.name} appears out of thin air.{/}\n`, {
          exclude: [this],
          filter: (obj: unknown) => {
            // Only send to those who couldn't see us before
            const viewer = obj as { permissionLevel?: number };
            const viewerLevel = viewer.permissionLevel ?? 0;
            return viewerLevel <= permLevel;
          },
        });
      }
    }

    return true;
  }

  /**
   * Add gold to the player's carried gold.
   * @param amount Amount of gold to add
   */
  addGold(amount: number): void {
    if (amount <= 0) return;
    this._gold += Math.floor(amount);
  }

  /**
   * Remove gold from the player's carried gold.
   * @param amount Amount of gold to remove
   * @returns true if successful, false if not enough gold
   */
  removeGold(amount: number): boolean {
    amount = Math.floor(amount);
    if (amount <= 0) return true;
    if (this._gold < amount) return false;
    this._gold -= amount;
    return true;
  }

  /**
   * Deposit gold into the bank.
   * @param amount Amount to deposit (or 'all')
   * @returns Amount actually deposited, or -1 if failed
   */
  depositGold(amount: number | 'all'): number {
    const toDeposit = amount === 'all' ? this._gold : Math.floor(amount);
    if (toDeposit <= 0) return 0;
    if (this._gold < toDeposit) return -1;

    this._gold -= toDeposit;
    this._bankedGold += toDeposit;
    return toDeposit;
  }

  /**
   * Withdraw gold from the bank.
   * @param amount Amount to withdraw (or 'all')
   * @returns Amount actually withdrawn, or -1 if failed
   */
  withdrawGold(amount: number | 'all'): number {
    const toWithdraw = amount === 'all' ? this._bankedGold : Math.floor(amount);
    if (toWithdraw <= 0) return 0;
    if (this._bankedGold < toWithdraw) return -1;

    this._bankedGold -= toWithdraw;
    this._gold += toWithdraw;
    return toWithdraw;
  }

  // ========== Persistence ==========

  /**
   * Get the save file path for this player.
   */
  getSavePath(): string {
    return `/data/players/${this.name.toLowerCase()}.json`;
  }

  /**
   * Check if an item is savable.
   * Items must have a savable property that is true (default for Item class).
   */
  private _isItemSavable(item: MudObject): boolean {
    if (item instanceof Item) {
      return item.savable;
    }
    // Non-Item objects default to savable
    return true;
  }

  /**
   * Serialize player state for saving.
   */
  save(): PlayerSaveData {
    // Filter inventory to only include savable items
    const savableInventory = this.inventory.filter((item) => this._isItemSavable(item));

    // Build equipment data - map equipped items to their index in savable inventory
    const equipment: EquipmentSaveData[] = [];
    const equipped = this.getAllEquipped();

    for (const [slot, item] of equipped) {
      // Only save equipment if the item is savable
      if (this._isItemSavable(item)) {
        const index = savableInventory.indexOf(item);
        if (index >= 0) {
          equipment.push({ slot, inventoryIndex: index });
        }
      }
    }

    return {
      name: this.name,
      title: this.title,
      gender: this.gender,
      level: this.level,
      experience: this._experience,
      health: this.health,
      maxHealth: this.maxHealth,
      mana: this.mana,
      maxMana: this.maxMana,
      stats: this.getBaseStats(),
      location: this.environment?.objectPath || '/areas/valdoria/aldric/center',
      inventory: savableInventory.map((item) => item.objectPath),
      equipment: equipment.length > 0 ? equipment : undefined,
      properties: this._serializeProperties(),
      createdAt: this._createdAt || Date.now(),
      lastLogin: this._lastLogin,
      playTime: this.playTime,
      monitorEnabled: this._monitorEnabled,
      displayName: this._displayName,
      cwd: this._cwd,
      previousLocation: this._previousLocation,
      enterMessage: this.enterMessage,
      exitMessage: this.exitMessage,
      exploration: this.getExplorationData(),
      gold: this._gold,
      bankedGold: this._bankedGold,
      guildData: this.getProperty<PlayerGuildData>('guildData'),
      avatar: this._avatar,
      staffVanished: this._staffVanished,
      race: this._race,
      pets: this._getPetSaveData(),
    };
  }

  /**
   * Get pet save data from the pet daemon.
   */
  private _getPetSaveData(): PetSaveData[] | undefined {
    try {
      // Dynamically import to avoid circular dependencies
      const { getPetDaemon } = require('../daemons/pet.js');
      const petDaemon = getPetDaemon();
      const petData = petDaemon.getPlayerPetSaveData(this.name);
      return petData.length > 0 ? petData : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Restore player state from saved data.
   * @param data The saved data
   */
  restore(data: PlayerSaveData): void {
    this.name = data.name;
    this.title = data.title;
    this.gender = data.gender;
    this.maxHealth = data.maxHealth;
    this.health = data.health;
    this._createdAt = data.createdAt;
    this._lastLogin = data.lastLogin;
    this._playTime = data.playTime;

    // Restore level and experience (if present - for backwards compatibility)
    if (data.level !== undefined) {
      this.level = data.level;
    }
    if (data.experience !== undefined) {
      this._experience = data.experience;
    }

    // Restore mana (if present - for backwards compatibility)
    if (data.maxMana !== undefined) {
      this.maxMana = data.maxMana;
    }
    if (data.mana !== undefined) {
      this.mana = data.mana;
    }

    // Restore stats (if present - for backwards compatibility)
    if (data.stats) {
      this.setBaseStats(data.stats);
    }

    // Restore properties
    if (data.properties) {
      for (const [key, value] of Object.entries(data.properties)) {
        this.setProperty(key, value);
      }
    }

    // Restore monitor setting (if present - for backwards compatibility)
    if (data.monitorEnabled !== undefined) {
      this.monitorEnabled = data.monitorEnabled;
    }

    // Restore display name (if present)
    if (data.displayName !== undefined) {
      this._displayName = data.displayName;
    }

    // Restore cwd (if present - for backwards compatibility)
    if (data.cwd !== undefined) {
      this._cwd = data.cwd;
    }

    // Restore previousLocation (for link-dead players)
    if (data.previousLocation !== undefined) {
      this._previousLocation = data.previousLocation;
    }

    // Restore custom enter/exit messages
    if (data.enterMessage !== undefined) {
      this.enterMessage = data.enterMessage;
    }
    if (data.exitMessage !== undefined) {
      this.exitMessage = data.exitMessage;
    }

    // Restore exploration data
    if (data.exploration) {
      this.restoreExplorationData(data.exploration);
    }

    // Restore gold (if present - for backwards compatibility)
    if (data.gold !== undefined) {
      this._gold = data.gold;
    }
    if (data.bankedGold !== undefined) {
      this._bankedGold = data.bankedGold;
    }

    // Restore avatar (if present - for backwards compatibility)
    if (data.avatar !== undefined) {
      this._avatar = data.avatar;
    }

    // Restore staff vanished state (if present - for backwards compatibility)
    if (data.staffVanished !== undefined) {
      this._staffVanished = data.staffVanished;
    }

    // Restore race (default to 'human' for existing players without race)
    this._race = data.race || 'human';

    // Apply race latent abilities
    this._applyRaceAbilitiesDeferred();

    // Store equipment data for later restoration (after inventory is loaded)
    if (data.equipment && data.equipment.length > 0) {
      this.setProperty('_pendingEquipment', data.equipment);
    }

    // Restore guild data and apply passive skills
    if (data.guildData) {
      this.setProperty('guildData', data.guildData);
      // Apply passives after a short delay to ensure daemon is loaded
      this._applyGuildPassivesDeferred();
    }

    // Store pet data for deferred restoration (after player enters room)
    if (data.pets && data.pets.length > 0) {
      this._pendingPetData = data.pets;
    }

    // Note: Location and inventory need to be handled by the driver
    // after loading, as they require object references
  }

  /**
   * Restore pets after player has entered a room.
   * Called by the login daemon after player enters the starting room.
   */
  async restorePets(): Promise<void> {
    if (!this._pendingPetData || this._pendingPetData.length === 0) {
      return;
    }

    try {
      const { getPetDaemon } = await import('../daemons/pet.js');
      const petDaemon = getPetDaemon();

      for (const petData of this._pendingPetData) {
        await petDaemon.restorePet(this, petData);
      }
    } catch (error) {
      console.error('[Player] Error restoring pets:', error);
    }

    // Clear pending data
    this._pendingPetData = null;
  }

  /**
   * Apply guild passive skills after a deferred load.
   * This ensures the guild daemon is available.
   */
  private async _applyGuildPassivesDeferred(): Promise<void> {
    try {
      const { getGuildDaemon } = await import('../daemons/guild.js');
      const guildDaemon = getGuildDaemon();
      guildDaemon.applyAllPassives(this);
    } catch {
      // Guild daemon not available yet - passives will be applied on first skill use
    }
  }

  /**
   * Apply race latent abilities after a deferred load.
   * This ensures the race daemon is available.
   */
  private async _applyRaceAbilitiesDeferred(): Promise<void> {
    try {
      const { getRaceDaemon } = await import('../daemons/race.js');
      const raceDaemon = getRaceDaemon();
      raceDaemon.applyLatentAbilities(this, this._race);
    } catch {
      // Race daemon not available yet - abilities will be applied later
    }
  }

  /**
   * Restore equipment after inventory has been loaded.
   * Called by the driver after cloning and moving inventory items.
   */
  restoreEquipment(): void {
    const pending = this.getProperty<EquipmentSaveData[]>('_pendingEquipment');
    if (!pending) return;

    const inventoryList = [...this.inventory];

    for (const { slot, inventoryIndex } of pending) {
      if (inventoryIndex < 0 || inventoryIndex >= inventoryList.length) continue;

      const item = inventoryList[inventoryIndex];
      if (!item) continue;

      // Check if it's a weapon (has wield method)
      if ('wield' in item && (slot === 'main_hand' || slot === 'off_hand')) {
        const weapon = item as import('./weapon.js').Weapon;
        weapon.wield(this, slot as 'main_hand' | 'off_hand');
      }
      // Check if it's armor (has wear method)
      else if ('wear' in item) {
        const armor = item as import('./armor.js').Armor;
        armor.wear(this);
      }
    }

    // Clean up
    this.deleteProperty('_pendingEquipment');
  }

  /**
   * Serialize properties for saving.
   */
  private _serializeProperties(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of this.getPropertyKeys()) {
      // Skip internal/temporary properties (those starting with underscore)
      if (key.startsWith('_')) continue;
      const value = this.getProperty(key);
      // Only save JSON-serializable values
      if (this._isSerializable(value)) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Check if a value is JSON-serializable.
   */
  private _isSerializable(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
      return true;
    }
    if (Array.isArray(value)) {
      return value.every((v) => this._isSerializable(v));
    }
    if (typeof value === 'object') {
      return Object.values(value).every((v) => this._isSerializable(v));
    }
    return false;
  }

  // ========== Ghost Mode (Death) ==========

  /**
   * Check if the player is a ghost (dead).
   */
  get isGhost(): boolean {
    return this._isGhost;
  }

  /**
   * Get the player's corpse (if dead).
   */
  get corpse(): Corpse | null {
    return this._corpse;
  }

  /**
   * Get the location where the corpse is.
   */
  get corpseLocation(): MudObject | null {
    return this._corpseLocation;
  }

  /**
   * Override onDeath to handle player ghost mode.
   */
  override async onDeath(): Promise<void> {
    // End all combat
    const combatDaemon = getCombatDaemon();
    combatDaemon.endAllCombats(this);

    // Remember death location
    this._deathLocation = this.environment;
    this._corpseLocation = this.environment;

    // Create corpse
    const corpse = new Corpse();
    corpse.ownerName = this.name;
    corpse.isPlayerCorpse = true;
    corpse.ownerId = this.objectId || null;

    // Transfer inventory to corpse (equipment will be unequipped automatically)
    // First unequip everything
    const equipped = this.getAllEquipped();
    for (const [, item] of equipped) {
      if ('unwield' in item) {
        (item as import('./weapon.js').Weapon).unwield();
      }
      if ('remove' in item) {
        (item as import('./armor.js').Armor).remove();
      }
    }

    // Now move inventory to corpse
    const items = [...this.inventory];
    for (const item of items) {
      await item.moveTo(corpse);
    }

    // Transfer carried gold to corpse (banked gold is safe)
    if (this._gold > 0) {
      corpse.gold = this._gold;
      this._gold = 0;
    }

    // Move corpse to death location
    if (this._deathLocation) {
      await corpse.moveTo(this._deathLocation);
    }

    this._corpse = corpse;
    this._isGhost = true;

    // Display death message
    this.receive('\n');
    this.receive('{RED}{bold}══════════════════════════════════════{/}\n');
    this.receive('{RED}{bold}           YOU HAVE DIED!             {/}\n');
    this.receive('{RED}{bold}══════════════════════════════════════{/}\n');
    this.receive('\n');
    this.receive('{dim}You are now a ghost. Your corpse lies where you fell.{/}\n');
    this.receive('{dim}You may resurrect at your corpse or at a shrine.{/}\n');
    this.receive('\n');
    this.receive('{yellow}Options:{/}\n');
    this.receive('  {cyan}resurrect corpse{/}  - Return to your corpse and reclaim your items\n');
    this.receive('  {cyan}resurrect shrine{/} - Return to the nearest shrine (no items)\n');
    this.receive('\n');

    // Play death sound
    if (typeof efuns !== 'undefined' && efuns.playSound) {
      efuns.playSound(this, 'alert', 'death', { volume: 0.7 });
    }

    // Notify room
    if (this._deathLocation && 'broadcast' in this._deathLocation) {
      (this._deathLocation as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`{RED}${this.name} has died!{/}\n`, { exclude: [this] });
    }
  }

  /**
   * Resurrect the player at their corpse.
   * Returns true if successful.
   */
  async resurrectAtCorpse(): Promise<boolean> {
    if (!this._isGhost) {
      this.receive("You're not dead!\n");
      return false;
    }

    if (!this._corpse) {
      this.receive("Your corpse is gone! Use 'resurrect shrine' instead.\n");
      return false;
    }

    const corpseRoom = this._corpse.environment;
    if (!corpseRoom) {
      this.receive("Your corpse is in an invalid location. Use 'resurrect shrine' instead.\n");
      return false;
    }

    // Move player to corpse location
    await this.moveTo(corpseRoom);

    // Transfer items back from corpse
    const items = [...this._corpse.inventory];
    for (const item of items) {
      await item.moveTo(this);
    }

    // Get gold back
    if (this._corpse.gold > 0) {
      const recoveredGold = this._corpse.gold;
      this._gold += recoveredGold;
      this.receive(`{yellow}You recover ${recoveredGold} gold coins.{/}\n`);
    }

    // Destroy corpse
    if (typeof efuns !== 'undefined' && efuns.destruct) {
      await efuns.destruct(this._corpse);
    }

    // Reset ghost state
    this._isGhost = false;
    this._corpse = null;
    this._corpseLocation = null;
    this._deathLocation = null;

    // Revive with partial health
    this.revive(Math.ceil(this.maxHealth * 0.25));
    this.mana = Math.ceil(this.maxMana * 0.25);

    this.receive('\n');
    this.receive('{green}{bold}You have been resurrected!{/}\n');
    this.receive('{dim}You feel weak, but alive. Your items have been recovered.{/}\n');
    this.receive('\n');

    // Play resurrection sound
    if (typeof efuns !== 'undefined' && efuns.playSound) {
      efuns.playSound(this, 'alert', 'resurrection', { volume: 0.7 });
    }

    // Notify room
    const room = this.environment;
    if (room && 'broadcast' in room) {
      (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`{green}${this.name} rises from the dead!{/}\n`, { exclude: [this] });
    }

    // Show room
    if (room && 'look' in room) {
      (room as MudObject & { look: (who: MudObject) => void }).look(this);
    }

    return true;
  }

  /**
   * Resurrect the player at a shrine (no items).
   * @param shrineRoom The shrine room to resurrect at
   */
  async resurrectAtShrine(shrineRoom?: MudObject): Promise<boolean> {
    if (!this._isGhost) {
      this.receive("You're not dead!\n");
      return false;
    }

    // Find a shrine room if not provided
    let targetRoom = shrineRoom;
    if (!targetRoom) {
      // Default to town center or a known shrine location
      if (typeof efuns !== 'undefined' && efuns.loadObject) {
        try {
          targetRoom = efuns.loadObject('/areas/valdoria/aldric/center');
        } catch {
          // Fall back to death location
          targetRoom = this._deathLocation || undefined;
        }
      }
    }

    if (!targetRoom) {
      this.receive("Cannot find a resurrection point!\n");
      return false;
    }

    // Move player to shrine
    await this.moveTo(targetRoom);

    // Note: Corpse remains where it is - player must go back to get items

    // Reset ghost state
    this._isGhost = false;
    // Keep corpse reference so they can find it
    this._corpseLocation = this._corpse?.environment || null;

    // Revive with minimal health
    this.revive(Math.ceil(this.maxHealth * 0.1));
    this.mana = Math.ceil(this.maxMana * 0.1);

    this.receive('\n');
    this.receive('{green}{bold}You have been resurrected at the shrine!{/}\n');
    this.receive('{yellow}Your items remain at your corpse. Go retrieve them!{/}\n');
    if (this._corpseLocation) {
      const locationDesc = this._corpseLocation.shortDesc || 'an unknown location';
      this.receive(`{dim}Your corpse is at: ${locationDesc}{/}\n`);
    }
    this.receive('\n');

    // Play resurrection sound
    if (typeof efuns !== 'undefined' && efuns.playSound) {
      efuns.playSound(this, 'alert', 'resurrection', { volume: 0.7 });
    }

    // Notify room
    const room = this.environment;
    if (room && 'broadcast' in room) {
      (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`{green}${this.name} materializes from thin air!{/}\n`, { exclude: [this] });
    }

    // Show room
    if (room && 'look' in room) {
      (room as MudObject & { look: (who: MudObject) => void }).look(this);
    }

    // Clear corpse reference after player is alive (so it can decay normally)
    this._corpse = null;
    this._deathLocation = null;

    return true;
  }

  // ========== Lifecycle ==========

  /**
   * Called when the player connects.
   */
  onConnect(): void | Promise<void> {
    // Default: announce arrival
    this.receive(`Welcome back, ${this.name}!`);
  }

  /**
   * Called when the player disconnects.
   * @param reason Optional disconnect reason
   */
  onDisconnect(reason?: string): void | Promise<void> {
    // Only send disconnect notification if player didn't quit properly
    // (i.e., they closed the client unexpectedly)
    if (!this._hasQuit) {
      const channelDaemon = getChannelDaemon();
      const reasonText = reason ? ` (${reason})` : '';
      channelDaemon.sendNotification(
        'notify',
        `{bold}${this.name}{/} disconnected from ${this.getDisplayAddress()}${reasonText}`
      );
    }

    // Clean up snoop sessions (both as snooper and as target)
    if (typeof efuns !== 'undefined') {
      if (efuns.snoopUnregister) {
        efuns.snoopUnregister(this);
      }
      if (efuns.snoopTargetDisconnected) {
        efuns.snoopTargetDisconnected(this);
      }
    }

    // Notify party system about disconnect
    import('../daemons/party.js')
      .then(({ getPartyDaemon }) => {
        getPartyDaemon().handlePlayerDisconnect(this);
      })
      .catch(() => {
        // Party daemon not available
      });
  }

  /**
   * Called when the player quits.
   */
  async quit(): Promise<void> {
    // Mark as properly quit (prevents disconnect notification)
    this._hasQuit = true;

    // Drop unsavable items to the current room
    await this._dropUnsavableItems();

    // Save the player's current location before quitting
    if (typeof efuns !== 'undefined' && efuns.savePlayer) {
      await efuns.savePlayer(this);
    }

    // Unregister from active players (allows clean login next time)
    if (typeof efuns !== 'undefined' && efuns.unregisterActivePlayer) {
      efuns.unregisterActivePlayer(this);
    }

    this.receive('Goodbye!');

    // Move to void/limbo BEFORE closing connection
    // This ensures the disconnect handler sees environment=null and skips saving
    await this.moveTo(null);

    // Disconnect
    if (this._connection) {
      this._connection.close();
      this.unbindConnection();
    }
  }

  /**
   * Drop all unsavable items to the current room.
   * Called before saving/quitting.
   */
  private async _dropUnsavableItems(): Promise<void> {
    const room = this.environment;
    if (!room) return;

    // Get list of unsavable items (copy array since we'll be modifying inventory)
    const unsavableItems = [...this.inventory].filter((item) => !this._isItemSavable(item));

    if (unsavableItems.length === 0) return;

    for (const item of unsavableItems) {
      // First, unequip if equipped
      if ('unwield' in item) {
        const weapon = item as import('./weapon.js').Weapon;
        if (weapon.isWielded) {
          weapon.unwield();
        }
      }
      if ('remove' in item) {
        const armor = item as import('./armor.js').Armor;
        if (armor.isWorn) {
          armor.remove();
        }
      }

      // Move item to the room
      await item.moveTo(room);
    }

    // Notify player about dropped items
    if (unsavableItems.length === 1) {
      this.receive(`{dim}You drop ${unsavableItems[0].shortDesc} (unsavable).{/}\n`);
    } else {
      this.receive(`{dim}You drop ${unsavableItems.length} unsavable items.{/}\n`);
    }
  }

  // ========== GUI Response Handler ==========

  /**
   * Handle GUI messages from the client.
   * This is the default handler - specific modals may override this via player.onGUIResponse.
   */
  async handleGUIResponse(message: GUIClientMessage): Promise<void> {
    // Handle quest panel click - open quest log modal
    if (message.action === 'quest-panel-click') {
      // Dynamically import to avoid circular dependencies
      const { openQuestLogModal } = await import('../lib/quest-gui.js');
      const { getQuestDaemon } = await import('../daemons/quest.js');
      openQuestLogModal(this as unknown as QuestPlayer, getQuestDaemon());
      return;
    }

    // Handle avatar click - open score modal (character sheet)
    if (message.action === 'avatar-click') {
      // Dynamically import to avoid circular dependencies
      const { openScoreModal } = await import('../lib/score-modal.js');
      openScoreModal(this as unknown as Parameters<typeof openScoreModal>[0]);
      return;
    }

    // Handle equipment panel click - open inventory modal
    if (message.action === 'open-inventory') {
      // Dynamically import to avoid circular dependencies
      const { openInventoryModal } = await import('../lib/inventory-modal.js');
      await openInventoryModal(this as unknown as Parameters<typeof openInventoryModal>[0]);
      return;
    }

    // No default handling for other actions
  }

  // ========== Setup ==========

  /**
   * Create a new player account.
   */
  createAccount(name: string, hashedPassword: string, email?: string): void {
    this.name = name;
    this._password = hashedPassword;
    if (email) this._email = email;
    this._createdAt = typeof efuns !== 'undefined' ? efuns.time() : Math.floor(Date.now() / 1000);
    this._lastLogin = this._createdAt;
    this._playTime = 0;
  }
}

export default Player;
