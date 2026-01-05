/**
 * Player - Base class for player characters.
 *
 * Players are connected to real users via WebSocket connections.
 * They can save/restore their state and have additional capabilities
 * beyond regular Living beings.
 */

import { Living, type Stats, type StatName, MAX_STAT } from './living.js';
import { MudObject } from './object.js';
import { colorize } from '../lib/colors.js';
import { getChannelDaemon } from '../daemons/channels.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  send(target: MudObject, message: string): void;
  time(): number;
  executeCommand(player: MudObject, input: string, level: number): Promise<boolean>;
  savePlayer(player: MudObject): Promise<void>;
  setHeartbeat(object: MudObject, enable: boolean): void;
  unregisterActivePlayer(player: MudObject): void;
};

/**
 * Connection interface (implemented by driver's Connection class).
 */
export interface Connection {
  send(message: string): void;
  close(): void;
  isConnected(): boolean;
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
  properties: Record<string, unknown>;
  createdAt: number;
  lastLogin: number;
  playTime: number;
  monitorEnabled?: boolean;
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

  // ========== Input/Output ==========

  /**
   * Receive a message (send to connection).
   * Automatically processes color tokens like {red}, {bold}, etc.
   * @param message The message to receive
   */
  override receive(message: string): void {
    if (this._connection) {
      // Process color tokens to ANSI codes
      this._connection.send(colorize(message));
    }
  }

  /**
   * Send a prompt to the player.
   */
  sendPrompt(): void {
    if (this._promptEnabled && this._connection) {
      this._connection.send(this._prompt);
    }
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
    // If there's a custom input handler, use it
    if (this._inputHandler) {
      await this._inputHandler(input);
      return;
    }

    // First, try the command manager (cmds/ directory commands)
    if (typeof efuns !== 'undefined' && efuns.executeCommand) {
      const handled = await efuns.executeCommand(this, input, this._permissionLevel);
      if (handled) {
        this.sendPrompt();
        return;
      }
    }

    // Fall back to object-based actions (addAction system)
    const handled = await this.command(input);
    if (!handled) {
      this.receive("What?\n");
    }

    // Send prompt after command
    this.sendPrompt();
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
   */
  get permissionLevel(): number {
    return this._permissionLevel;
  }

  /**
   * Set the permission level.
   */
  set permissionLevel(value: number) {
    this._permissionLevel = value;
  }

  // ========== Monitor ==========

  /**
   * Check if the vitals monitor is enabled.
   */
  get monitorEnabled(): boolean {
    return this._monitorEnabled;
  }

  /**
   * Enable or disable the vitals monitor.
   * Automatically registers/unregisters for heartbeats.
   */
  set monitorEnabled(value: boolean) {
    this._monitorEnabled = value;
    // Register/unregister for heartbeats
    if (typeof efuns !== 'undefined' && efuns.setHeartbeat) {
      efuns.setHeartbeat(this, value);
    }
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
   * Called each heartbeat. Shows vitals monitor if enabled.
   */
  override heartbeat(): void {
    super.heartbeat();

    // Show vitals monitor if enabled
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
   * @returns true if level up succeeded, false if not enough XP
   */
  levelUp(): boolean {
    const cost = this.xpForNextLevel;
    if (this._experience < cost) {
      return false;
    }

    this._experience -= cost;
    this.level++;
    this.receive(`{bold}{yellow}Congratulations! You are now level ${this.level}!{/}\n`);
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

  // ========== Persistence ==========

  /**
   * Get the save file path for this player.
   */
  getSavePath(): string {
    return `/data/players/${this.name.toLowerCase()}.json`;
  }

  /**
   * Serialize player state for saving.
   */
  save(): PlayerSaveData {
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
      location: this.environment?.objectPath || '/areas/town/center',
      inventory: this.inventory.map((item) => item.objectPath),
      properties: this._serializeProperties(),
      createdAt: this._createdAt || Date.now(),
      lastLogin: this._lastLogin,
      playTime: this.playTime,
      monitorEnabled: this._monitorEnabled,
    };
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

    // Note: Location and inventory need to be handled by the driver
    // after loading, as they require object references
  }

  /**
   * Serialize properties for saving.
   */
  private _serializeProperties(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of this.getPropertyKeys()) {
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
  }

  /**
   * Called when the player quits.
   */
  async quit(): Promise<void> {
    // Mark as properly quit (prevents disconnect notification)
    this._hasQuit = true;

    // Save the player's current location before quitting
    if (typeof efuns !== 'undefined' && efuns.savePlayer) {
      await efuns.savePlayer(this);
    }

    // Unregister from active players (allows clean login next time)
    if (typeof efuns !== 'undefined' && efuns.unregisterActivePlayer) {
      efuns.unregisterActivePlayer(this);
    }

    this.receive('Goodbye!');

    // Disconnect
    if (this._connection) {
      this._connection.close();
      this.unbindConnection();
    }

    // Move to void/limbo
    await this.moveTo(null);
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
