/**
 * Player - Base class for player characters.
 *
 * Players are connected to real users via WebSocket connections.
 * They can save/restore their state and have additional capabilities
 * beyond regular Living beings.
 */

import { Living } from './living.js';
import { MudObject } from './object.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  send(target: MudObject, message: string): void;
  time(): number;
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
  health: number;
  maxHealth: number;
  location: string;
  inventory: string[];
  properties: Record<string, unknown>;
  createdAt: number;
  lastLogin: number;
  playTime: number;
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

  // ========== Input/Output ==========

  /**
   * Receive a message (send to connection).
   * @param message The message to receive
   */
  override receive(message: string): void {
    if (this._connection) {
      this._connection.send(message);
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

    // Otherwise, process as a command
    const handled = await this.command(input);
    if (!handled) {
      this.receive("What?");
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
      health: this.health,
      maxHealth: this.maxHealth,
      location: this.environment?.objectPath || '/areas/void/void',
      inventory: this.inventory.map((item) => item.objectPath),
      properties: this._serializeProperties(),
      createdAt: this._createdAt || Date.now(),
      lastLogin: this._lastLogin,
      playTime: this.playTime,
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

    // Restore properties
    if (data.properties) {
      for (const [key, value] of Object.entries(data.properties)) {
        this.setProperty(key, value);
      }
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
    // Default: do nothing
  }

  /**
   * Called when the player quits.
   */
  async quit(): Promise<void> {
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
