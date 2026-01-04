/**
 * Living - Base class for living beings (players and NPCs).
 *
 * Living beings can move, communicate, and execute commands.
 */

import { MudObject } from './object.js';
import { Room } from './room.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  findObject(pathOrId: string): MudObject | undefined;
  send(target: MudObject, message: string): void;
  move(object: MudObject, destination: MudObject | null): Promise<boolean>;
  capitalize(str: string): string;
};

/**
 * Command parser result.
 */
export interface ParsedCommand {
  verb: string;
  args: string;
  words: string[];
}

/**
 * Base class for living beings.
 */
export class Living extends MudObject {
  private _name: string = 'someone';
  private _title: string = '';
  private _gender: 'male' | 'female' | 'neutral' = 'neutral';
  private _commandHistory: string[] = [];
  private _maxHistory: number = 50;

  // Combat stats (basic implementation)
  private _health: number = 100;
  private _maxHealth: number = 100;
  private _alive: boolean = true;

  constructor() {
    super();
    this.shortDesc = 'a being';
    this.longDesc = 'You see a living being.';
  }

  // ========== Identity ==========

  /**
   * Get the living's name.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Set the living's name.
   */
  set name(value: string) {
    this._name = value;
    this.shortDesc = this.getDisplayName();
  }

  /**
   * Get the living's title.
   */
  get title(): string {
    return this._title;
  }

  /**
   * Set the living's title.
   */
  set title(value: string) {
    this._title = value;
    this.shortDesc = this.getDisplayName();
  }

  /**
   * Get the living's gender.
   */
  get gender(): 'male' | 'female' | 'neutral' {
    return this._gender;
  }

  /**
   * Set the living's gender.
   */
  set gender(value: 'male' | 'female' | 'neutral') {
    this._gender = value;
  }

  /**
   * Get the display name (name + title).
   */
  getDisplayName(): string {
    if (this._title) {
      return `${this._name} ${this._title}`;
    }
    return this._name;
  }

  /**
   * Get subjective pronoun (he/she/they).
   */
  get subjective(): string {
    switch (this._gender) {
      case 'male':
        return 'he';
      case 'female':
        return 'she';
      default:
        return 'they';
    }
  }

  /**
   * Get objective pronoun (him/her/them).
   */
  get objective(): string {
    switch (this._gender) {
      case 'male':
        return 'him';
      case 'female':
        return 'her';
      default:
        return 'them';
    }
  }

  /**
   * Get possessive pronoun (his/her/their).
   */
  get possessive(): string {
    switch (this._gender) {
      case 'male':
        return 'his';
      case 'female':
        return 'her';
      default:
        return 'their';
    }
  }

  // ========== Health ==========

  /**
   * Get current health.
   */
  get health(): number {
    return this._health;
  }

  /**
   * Set current health.
   */
  set health(value: number) {
    this._health = Math.max(0, Math.min(value, this._maxHealth));
    if (this._health <= 0 && this._alive) {
      this._alive = false;
      this.onDeath();
    }
  }

  /**
   * Get maximum health.
   */
  get maxHealth(): number {
    return this._maxHealth;
  }

  /**
   * Set maximum health.
   */
  set maxHealth(value: number) {
    this._maxHealth = Math.max(1, value);
    if (this._health > this._maxHealth) {
      this._health = this._maxHealth;
    }
  }

  /**
   * Check if alive.
   */
  get alive(): boolean {
    return this._alive;
  }

  /**
   * Heal the living.
   * @param amount Amount to heal
   */
  heal(amount: number): void {
    if (this._alive) {
      this.health = Math.min(this._health + amount, this._maxHealth);
    }
  }

  /**
   * Damage the living.
   * @param amount Amount of damage
   */
  damage(amount: number): void {
    if (this._alive) {
      this.health -= amount;
    }
  }

  // ========== Communication ==========

  /**
   * Receive a message (output to this living).
   * Override this in Player to send to connection.
   * @param message The message to receive
   */
  receive(message: string): void {
    // Default: do nothing (NPCs don't display messages)
  }

  /**
   * Say something to the room.
   * @param message What to say
   */
  say(message: string): void {
    const env = this.environment as Room | null;
    if (!env) return;

    const name =
      typeof efuns !== 'undefined' ? efuns.capitalize(this._name) : this._name;

    // Message to the speaker
    this.receive(`You say: ${message}`);

    // Message to others in the room
    if (typeof env.broadcast === 'function') {
      env.broadcast(`${name} says: ${message}`, { exclude: [this] });
    }
  }

  /**
   * Emote an action.
   * @param action The action to emote
   */
  emote(action: string): void {
    const env = this.environment as Room | null;
    if (!env) return;

    const name =
      typeof efuns !== 'undefined' ? efuns.capitalize(this._name) : this._name;
    const message = `${name} ${action}`;

    // Message to everyone including the emoter
    if (typeof env.broadcast === 'function') {
      env.broadcast(message);
    }
  }

  /**
   * Whisper to a specific target.
   * @param target The target to whisper to
   * @param message The message to whisper
   */
  whisper(target: Living, message: string): void {
    const name =
      typeof efuns !== 'undefined' ? efuns.capitalize(this._name) : this._name;

    this.receive(`You whisper to ${target.name}: ${message}`);
    target.receive(`${name} whispers: ${message}`);
  }

  // ========== Commands ==========

  /**
   * Parse a command string into verb and args.
   * @param input The command string
   */
  parseCommand(input: string): ParsedCommand {
    const trimmed = input.trim();
    const words = trimmed.split(/\s+/);
    const verb = words[0]?.toLowerCase() || '';
    const args = words.slice(1).join(' ');

    return { verb, args, words };
  }

  /**
   * Execute a command.
   * @param input The command string
   * @returns true if command was handled
   */
  async command(input: string): Promise<boolean> {
    if (!input.trim()) {
      return false;
    }

    // Add to history
    this._commandHistory.push(input);
    if (this._commandHistory.length > this._maxHistory) {
      this._commandHistory.shift();
    }

    const parsed = this.parseCommand(input);

    // Try actions on self
    const selfAction = this.getAction(parsed.verb);
    if (selfAction) {
      const result = await selfAction.handler(parsed.args);
      if (result) return true;
    }

    // Try actions on items in inventory
    for (const item of this.inventory) {
      const action = item.getAction(parsed.verb);
      if (action) {
        const result = await action.handler(parsed.args);
        if (result) return true;
      }
    }

    // Try actions on items in environment
    if (this.environment) {
      // Check the room itself
      const roomAction = this.environment.getAction(parsed.verb);
      if (roomAction) {
        const result = await roomAction.handler(parsed.args);
        if (result) return true;
      }

      // Check items in the room
      for (const item of this.environment.inventory) {
        if (item === this) continue;
        const action = item.getAction(parsed.verb);
        if (action) {
          const result = await action.handler(parsed.args);
          if (result) return true;
        }
      }
    }

    return false;
  }

  /**
   * Get command history.
   */
  getHistory(): string[] {
    return [...this._commandHistory];
  }

  /**
   * Clear command history.
   */
  clearHistory(): void {
    this._commandHistory = [];
  }

  // ========== Movement ==========

  /**
   * Move in a direction.
   * @param direction The direction to move
   * @returns true if movement succeeded
   */
  async moveDirection(direction: string): Promise<boolean> {
    const env = this.environment as Room | null;
    if (!env || typeof env.getExit !== 'function') {
      this.receive("You can't go that way.");
      return false;
    }

    const exit = env.getExit(direction);
    if (!exit) {
      this.receive("You can't go that way.");
      return false;
    }

    // Check if we can pass
    if (exit.canPass) {
      const canPass = await exit.canPass(this);
      if (!canPass) {
        this.receive("You can't go that way.");
        return false;
      }
    }

    // Get destination room
    const dest = env.resolveExit(exit);
    if (!dest) {
      this.receive("That exit leads nowhere.");
      return false;
    }

    // Notify current room
    const name =
      typeof efuns !== 'undefined' ? efuns.capitalize(this._name) : this._name;
    env.broadcast(`${name} leaves ${direction}.`, { exclude: [this] });
    if (typeof env.onLeave === 'function') {
      await env.onLeave(this, dest);
    }

    // Move
    await this.moveTo(dest);

    // Notify new room
    const newEnv = this.environment as Room | null;
    if (newEnv) {
      newEnv.broadcast(`${name} arrives.`, { exclude: [this] });
      if (typeof newEnv.onEnter === 'function') {
        await newEnv.onEnter(this, env);
      }
      // Show room description
      if (typeof newEnv.look === 'function') {
        newEnv.look(this);
      }
    }

    return true;
  }

  // ========== Lifecycle Hooks ==========

  /**
   * Called when the living dies.
   * Override this for death handling.
   */
  onDeath(): void | Promise<void> {
    const env = this.environment as Room | null;
    if (env && typeof env.broadcast === 'function') {
      const name =
        typeof efuns !== 'undefined' ? efuns.capitalize(this._name) : this._name;
      env.broadcast(`${name} has died!`);
    }
  }

  /**
   * Revive the living.
   * @param health Health to restore (defaults to max)
   */
  revive(health?: number): void {
    this._alive = true;
    this._health = health !== undefined ? health : this._maxHealth;
  }

  // ========== Setup ==========

  /**
   * Configure the living.
   */
  setLiving(options: {
    name?: string;
    title?: string;
    gender?: 'male' | 'female' | 'neutral';
    health?: number;
    maxHealth?: number;
  }): void {
    if (options.name) this.name = options.name;
    if (options.title) this.title = options.title;
    if (options.gender) this.gender = options.gender;
    if (options.maxHealth) this.maxHealth = options.maxHealth;
    if (options.health !== undefined) this.health = options.health;
  }
}

export default Living;
