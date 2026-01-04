/**
 * NPC - Base class for non-player characters.
 *
 * NPCs are computer-controlled living beings. They can have
 * chat messages, respond to triggers, and perform autonomous actions.
 */

import { Living } from './living.js';
import { MudObject } from './object.js';
import { Room } from './room.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  random(max: number): number;
  capitalize(str: string): string;
};

/**
 * Chat message definition.
 */
export interface ChatMessage {
  message: string;
  type: 'say' | 'emote';
  chance?: number; // Probability 0-100, default 100
}

/**
 * Response trigger definition.
 */
export interface ResponseTrigger {
  pattern: string | RegExp;
  response: string | ((speaker: MudObject, message: string) => string | void);
  type: 'say' | 'emote';
}

/**
 * Base class for NPCs.
 */
export class NPC extends Living {
  private _chats: ChatMessage[] = [];
  private _chatChance: number = 20; // % chance per heartbeat
  private _responses: ResponseTrigger[] = [];
  private _aggressiveTo: ((target: MudObject) => boolean) | null = null;
  private _wandering: boolean = false;
  private _wanderChance: number = 10; // % chance per heartbeat
  private _wanderDirections: string[] = [];
  private _respawnTime: number = 0; // 0 = no respawn
  private _spawnRoom: Room | null = null;

  constructor() {
    super();
    this.shortDesc = 'an NPC';
    this.longDesc = 'You see a non-player character.';
  }

  // ========== Chat System ==========

  /**
   * Add a chat message.
   * @param message The message to say/emote
   * @param type Whether to say or emote
   * @param chance Probability (0-100) this message will be selected
   */
  addChat(message: string, type: 'say' | 'emote' = 'say', chance: number = 100): void {
    this._chats.push({ message, type, chance });
  }

  /**
   * Clear all chat messages.
   */
  clearChats(): void {
    this._chats = [];
  }

  /**
   * Set chat chance per heartbeat.
   * @param chance Percentage chance (0-100)
   */
  setChatChance(chance: number): void {
    this._chatChance = Math.max(0, Math.min(100, chance));
  }

  /**
   * Perform a random chat.
   */
  doChat(): void {
    if (this._chats.length === 0) return;

    // Select a random chat
    const random = typeof efuns !== 'undefined' ? efuns.random(100) : Math.random() * 100;
    const availableChats = this._chats.filter(
      (chat) => chat.chance === undefined || random < chat.chance
    );

    if (availableChats.length === 0) return;

    const idx = typeof efuns !== 'undefined'
      ? efuns.random(availableChats.length)
      : Math.floor(Math.random() * availableChats.length);
    const chat = availableChats[idx];

    if (chat.type === 'say') {
      this.say(chat.message);
    } else {
      this.emote(chat.message);
    }
  }

  // ========== Response System ==========

  /**
   * Add a response trigger.
   * @param pattern String or regex to match
   * @param response Response message or function
   * @param type Whether to say or emote
   */
  addResponse(
    pattern: string | RegExp,
    response: string | ((speaker: MudObject, message: string) => string | void),
    type: 'say' | 'emote' = 'say'
  ): void {
    this._responses.push({ pattern, response, type });
  }

  /**
   * Clear all responses.
   */
  clearResponses(): void {
    this._responses = [];
  }

  /**
   * Process a message and potentially respond.
   * @param speaker Who said the message
   * @param message What was said
   */
  hearSay(speaker: MudObject, message: string): void {
    if (speaker === this) return;

    for (const trigger of this._responses) {
      const match =
        typeof trigger.pattern === 'string'
          ? message.toLowerCase().includes(trigger.pattern.toLowerCase())
          : trigger.pattern.test(message);

      if (match) {
        let responseText: string | void;

        if (typeof trigger.response === 'function') {
          responseText = trigger.response(speaker, message);
        } else {
          responseText = trigger.response;
        }

        if (responseText) {
          if (trigger.type === 'say') {
            this.say(responseText);
          } else {
            this.emote(responseText);
          }
        }

        break; // Only respond once
      }
    }
  }

  // ========== Aggression ==========

  /**
   * Set a function to determine if this NPC is aggressive to a target.
   * @param fn Function returning true if aggressive
   */
  setAggressive(fn: ((target: MudObject) => boolean) | null): void {
    this._aggressiveTo = fn;
  }

  /**
   * Check if this NPC is aggressive to a target.
   * @param target The potential target
   */
  isAggressiveTo(target: MudObject): boolean {
    if (!this._aggressiveTo) return false;
    return this._aggressiveTo(target);
  }

  // ========== Wandering ==========

  /**
   * Enable wandering behavior.
   * @param directions Allowed directions, or empty for all exits
   */
  enableWandering(directions: string[] = []): void {
    this._wandering = true;
    this._wanderDirections = directions;
  }

  /**
   * Disable wandering behavior.
   */
  disableWandering(): void {
    this._wandering = false;
  }

  /**
   * Set wander chance per heartbeat.
   * @param chance Percentage chance (0-100)
   */
  setWanderChance(chance: number): void {
    this._wanderChance = Math.max(0, Math.min(100, chance));
  }

  /**
   * Perform a random wander.
   */
  async doWander(): Promise<void> {
    const env = this.environment as Room | null;
    if (!env || typeof env.getExitDirections !== 'function') return;

    let directions = env.getExitDirections();
    if (this._wanderDirections.length > 0) {
      directions = directions.filter((d) => this._wanderDirections.includes(d));
    }

    if (directions.length === 0) return;

    const idx = typeof efuns !== 'undefined'
      ? efuns.random(directions.length)
      : Math.floor(Math.random() * directions.length);
    const direction = directions[idx];

    await this.moveDirection(direction);
  }

  // ========== Respawn ==========

  /**
   * Set respawn time and spawn room.
   * @param seconds Time until respawn (0 = no respawn)
   * @param room Optional spawn room
   */
  setRespawn(seconds: number, room?: Room): void {
    this._respawnTime = seconds;
    if (room) this._spawnRoom = room;
  }

  /**
   * Get spawn room.
   */
  get spawnRoom(): Room | null {
    return this._spawnRoom;
  }

  // ========== Heartbeat ==========

  /**
   * Heartbeat handler.
   * Processes chat, wandering, and other periodic behaviors.
   */
  override async heartbeat(): Promise<void> {
    if (!this.alive) return;

    const random = typeof efuns !== 'undefined' ? efuns.random : (max: number) =>
      Math.floor(Math.random() * max);

    // Chat
    if (this._chats.length > 0 && random(100) < this._chatChance) {
      this.doChat();
    }

    // Wander
    if (this._wandering && random(100) < this._wanderChance) {
      await this.doWander();
    }
  }

  // ========== Lifecycle ==========

  /**
   * Called when the NPC dies.
   */
  override async onDeath(): Promise<void> {
    await super.onDeath();

    // Schedule respawn if enabled
    if (this._respawnTime > 0) {
      this.callOut(async () => {
        this.revive();
        if (this._spawnRoom) {
          await this.moveTo(this._spawnRoom);
          const env = this.environment as Room | null;
          if (env && typeof env.broadcast === 'function') {
            const name =
              typeof efuns !== 'undefined'
                ? efuns.capitalize(this.name)
                : this.name;
            env.broadcast(`${name} appears.`);
          }
        }
      }, this._respawnTime * 1000);
    }
  }

  // ========== Setup ==========

  /**
   * Configure the NPC.
   */
  setNPC(options: {
    name?: string;
    title?: string;
    shortDesc?: string;
    longDesc?: string;
    gender?: 'male' | 'female' | 'neutral';
    health?: number;
    maxHealth?: number;
    chats?: Array<{ message: string; type?: 'say' | 'emote'; chance?: number }>;
    chatChance?: number;
    wandering?: boolean;
    wanderChance?: number;
    wanderDirections?: string[];
    respawnTime?: number;
  }): void {
    if (options.name) this.name = options.name;
    if (options.title) this.title = options.title;
    if (options.shortDesc) this.shortDesc = options.shortDesc;
    if (options.longDesc) this.longDesc = options.longDesc;
    if (options.gender) this.gender = options.gender;
    if (options.maxHealth) this.maxHealth = options.maxHealth;
    if (options.health !== undefined) this.health = options.health;

    if (options.chats) {
      this.clearChats();
      for (const chat of options.chats) {
        this.addChat(chat.message, chat.type || 'say', chat.chance);
      }
    }

    if (options.chatChance !== undefined) this._chatChance = options.chatChance;
    if (options.wandering !== undefined) this._wandering = options.wandering;
    if (options.wanderChance !== undefined) this._wanderChance = options.wanderChance;
    if (options.wanderDirections) this._wanderDirections = options.wanderDirections;
    if (options.respawnTime !== undefined) this._respawnTime = options.respawnTime;
  }
}

export default NPC;
