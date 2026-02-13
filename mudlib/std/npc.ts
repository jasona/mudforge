/**
 * NPC - Base class for non-player characters.
 *
 * NPCs are computer-controlled living beings. They can have
 * chat messages, respond to triggers, and perform autonomous actions.
 */

import { Living, type StatName } from './living.js';
import { MudObject } from './object.js';
import { Room } from './room.js';
import { Corpse } from './corpse.js';
import { getCombatDaemon } from '../daemons/combat.js';
import type { NPCCombatConfig, LootEntry, GoldDrop, NaturalAttack, ThreatEntry } from './combat/types.js';
import { NATURAL_ATTACKS } from './combat/types.js';
import { getAggroDaemon } from '../daemons/aggro.js';
import type { QuestId, QuestDefinition, PlayerQuestState, QuestPlayer } from './quest/types.js';
import { getQuestDaemon } from '../daemons/quest.js';
import type { NPCAIContext, ConversationMessage } from '../lib/ai-types.js';
import type { NPCRandomLootConfig } from './loot/types.js';
import type { BehaviorConfig, BehaviorMode, CombatRole } from './behavior/types.js';
import { BEHAVIOR_DEFAULTS, GUILD_ROLE_MAP } from './behavior/types.js';
import type { GuildId } from './guild/types.js';

// Re-export AI types for convenience
export type { NPCAIContext, ConversationMessage } from '../lib/ai-types.js';

// Re-export behavior types for convenience
export type { BehaviorConfig, BehaviorMode, CombatRole } from './behavior/types.js';

/**
 * NPC type for auto-balance multipliers.
 */
export type NPCType = 'normal' | 'elite' | 'boss' | 'miniboss';

/**
 * Multipliers for different NPC types.
 */
export const NPC_TYPE_MULTIPLIERS: Record<NPCType, { hp: number; damage: number; xp: number; gold: number }> = {
  normal:   { hp: 1.0,  damage: 1.0,  xp: 1.0, gold: 1.0 },
  miniboss: { hp: 1.5,  damage: 1.15, xp: 1.5, gold: 1.5 },
  elite:    { hp: 2.0,  damage: 1.25, xp: 2.0, gold: 2.0 },
  boss:     { hp: 3.0,  damage: 1.5,  xp: 5.0, gold: 5.0 },
};

// Quest daemon accessor functions
function getQuestDaemonLazy() {
  return Promise.resolve(getQuestDaemon());
}
function getQuestDaemonSync() {
  return getQuestDaemon();
}

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
  response: string | ((speaker: Living, message: string) => string | void);
  type: 'say' | 'emote';
}

/**
 * Base class for NPCs.
 */
export class NPC extends Living {
  readonly isNPC: boolean = true;
  private _autoNameIds: Set<string> = new Set();
  private _chats: ChatMessage[] = [];
  private _chatChance: number = 20; // % chance per heartbeat
  private _responses: ResponseTrigger[] = [];
  private _aggressiveTo: ((target: Living) => boolean) | null = null;
  private _wandering: boolean = false;
  private _wanderChance: number = 10; // % chance per heartbeat
  private _wanderDirections: string[] = [];
  private _respawnTime: number = 0; // 0 = no respawn
  private _spawnRoom: Room | null = null;
  private _wanderAreaPath: string | null = null;
  private _wanderAreaRestricted: boolean = false;

  // Combat configuration
  private _combatConfig: NPCCombatConfig | null = null;
  private _gold: number = 0;

  // Quest giver configuration
  private _questsOffered: QuestId[] = [];
  private _questsTurnedIn: QuestId[] = [];

  // AI dialogue configuration
  private _aiContext: NPCAIContext | null = null;
  private _aiEnabled: boolean = false;
  private _conversationHistory: Map<string, ConversationMessage[]> = new Map();
  private _maxHistoryLength: number = 10;

  // Items to spawn on this NPC
  private _spawnItems: string[] = [];

  // Sound to play when someone looks at this NPC
  private _lookSound: string | null = null;

  // Random loot configuration
  private _randomLootConfig: NPCRandomLootConfig | null = null;

  // Natural attacks for this NPC (bite, claw, etc.)
  private _naturalAttacks: NaturalAttack[] = [];

  // Threat table for aggro management
  private _threatTable: Map<string, ThreatEntry> = new Map();

  // Threat decay rates (percentage per second)
  private static readonly THREAT_DECAY_IN_COMBAT = 0.01; // 1% per second
  private static readonly THREAT_DECAY_OUT_OF_COMBAT = 0.05; // 5% per second
  private static readonly THREAT_MINIMUM = 1; // Below this, entry is removed

  // Behavior/AI configuration
  private _behaviorConfig: BehaviorConfig | null = null;

  constructor() {
    super();
    this.shortDesc = 'an NPC';
    this.longDesc = 'You see a non-player character.';
  }

  /**
   * Set NPC name and keep object IDs in sync with the current name.
   * This lets commands like "look vorn" match NPCs named "Master Vorn".
   */
  override get name(): string {
    return super.name;
  }

  override set name(value: string) {
    // Remove previously auto-generated name IDs before adding new ones.
    for (const id of this._autoNameIds) {
      this.removeId(id);
    }
    this._autoNameIds.clear();

    super.name = value;

    const cleaned = value.trim().toLowerCase();
    if (!cleaned) {
      return;
    }

    const tokens = cleaned.split(/[^a-z0-9']+/).filter(Boolean);
    const ids = new Set<string>([cleaned, ...tokens]);
    for (const id of ids) {
      this.addId(id);
      this._autoNameIds.add(id);
    }
  }

  // ========== Lifecycle ==========

  /**
   * Called when the NPC is created.
   * Spawns initial items.
   */
  override async onCreate(): Promise<void> {
    await super.onCreate();
    await this.spawnItems();
  }

  // ========== Item Spawning ==========

  /**
   * Set items to spawn on this NPC when created.
   * @param itemPaths Array of item paths to clone
   */
  setSpawnItems(itemPaths: string[]): void {
    this._spawnItems = [...itemPaths];
  }

  /**
   * Get the list of item paths to spawn on this NPC.
   */
  getSpawnItems(): string[] {
    return [...this._spawnItems];
  }

  /**
   * Spawn all configured items into this NPC's inventory.
   * Automatically wields weapons and wears armor.
   */
  async spawnItems(): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.cloneObject || this._spawnItems.length === 0) {
      return;
    }

    for (const itemPath of this._spawnItems) {
      try {
        const item = await efuns.cloneObject(itemPath);
        if (item) {
          await item.moveTo(this);

          // Try to wield if it's a weapon
          if ('wield' in item && typeof (item as { wield: (wielder: Living) => { success: boolean } }).wield === 'function') {
            try {
              (item as { wield: (wielder: Living) => { success: boolean } }).wield(this);
            } catch {
              // Wield failed - item stays in inventory
            }
          }
          // Try to wear if it's armor
          else if ('wear' in item && typeof (item as { wear: (wearer: Living) => { success: boolean } }).wear === 'function') {
            try {
              (item as { wear: (wearer: Living) => { success: boolean } }).wear(this);
            } catch {
              // Wear failed - item stays in inventory
            }
          }
        }
      } catch (error) {
        console.error(`[NPC] Failed to clone item ${itemPath}:`, error);
      }
    }
  }

  // ========== Look Sound ==========

  /**
   * Get the sound to play when someone looks at this NPC.
   * @returns The sound identifier/filename, or null if none set
   */
  get lookSound(): string | null {
    return this._lookSound;
  }

  /**
   * Set a sound to play when someone looks at this NPC.
   *
   * The sound will be played in the 'ambient' category.
   * Sound resolution follows the standard pattern:
   * - Predefined sounds (e.g., 'growl')
   * - Custom filename with .mp3 (e.g., 'dragon-roar.mp3')
   * - Path-style (e.g., 'npc/dragon-roar')
   * - Default pattern (e.g., 'growl' -> 'sounds/ambient-growl.mp3')
   *
   * @param sound Sound identifier, filename, or path (null to disable)
   */
  setLookSound(sound: string | null): void {
    this._lookSound = sound;
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
    response: string | ((speaker: Living, message: string) => string | void),
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

  // ========== AI Dialogue System ==========

  /**
   * Enable AI-powered dialogue for this NPC.
   * @param context The NPC's AI context/personality configuration
   */
  setAIContext(context: NPCAIContext): void {
    this._aiContext = context;
    this._aiEnabled = true;
  }

  /**
   * Get the AI context for this NPC.
   */
  getAIContext(): NPCAIContext | null {
    return this._aiContext;
  }

  /**
   * Check if this NPC has AI dialogue enabled.
   */
  isAIEnabled(): boolean {
    return this._aiEnabled && this._aiContext !== null;
  }

  /**
   * Enable or disable AI dialogue.
   */
  setAIEnabled(enabled: boolean): void {
    this._aiEnabled = enabled;
  }

  /**
   * Get conversation history with a specific player.
   */
  getConversationHistory(playerName: string): ConversationMessage[] {
    return this._conversationHistory.get(playerName.toLowerCase()) || [];
  }

  /**
   * Clear conversation history with a specific player (or all players).
   */
  clearConversationHistory(playerName?: string): void {
    if (playerName) {
      this._conversationHistory.delete(playerName.toLowerCase());
    } else {
      this._conversationHistory.clear();
    }
  }

  /**
   * Set the maximum conversation history length per player.
   */
  setMaxHistoryLength(length: number): void {
    this._maxHistoryLength = Math.max(1, length);
  }

  /**
   * Handle AI-powered response to a player message.
   * @returns true if AI responded, false if fallback needed
   */
  private async handleAIResponse(speaker: Living, message: string): Promise<boolean> {
    if (!this._aiContext || typeof efuns === 'undefined' || !efuns.aiAvailable?.()) {
      return false;
    }

    const playerName = speaker.name?.toLowerCase() || 'unknown';
    const history = this.getConversationHistory(playerName);

    try {
      const result = await efuns.aiNpcResponse(
        this._aiContext,
        message,
        history
      );

      if (result.fallback || !result.success) {
        // AI unavailable or failed - fall back to static responses
        return false;
      }

      if (result.response) {
        // Update conversation history
        history.push({ role: 'player', content: message });
        history.push({ role: 'npc', content: result.response });

        // Trim history if too long
        while (history.length > this._maxHistoryLength * 2) {
          history.shift();
        }
        this._conversationHistory.set(playerName, history);

        // Deliver the response
        this.say(result.response);
        return true;
      }

      return false;
    } catch {
      // Error occurred - fall back to static responses
      return false;
    }
  }

  /**
   * Try static response patterns.
   * @returns true if a response was triggered
   */
  private tryStaticResponse(speaker: Living, message: string): boolean {
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

        return true; // Only respond once
      }
    }

    return false;
  }

  /**
   * Process a message and potentially respond.
   * Uses AI if enabled and available, otherwise falls back to static responses.
   * @param speaker Who said the message
   * @param message What was said
   */
  hearSay(speaker: Living, message: string): void {
    if (speaker === this) return;

    // Quest integration: track talk objectives when a player talks to this NPC
    if ('getProperty' in speaker) {
      import('../daemons/quest.js')
        .then(({ getQuestDaemon }) => {
          try {
            const questDaemon = getQuestDaemon();
            const npcPath = this.objectPath || '';
            type QuestPlayerType = Parameters<typeof questDaemon.updateTalkObjective>[0];
            questDaemon.updateTalkObjective(speaker as QuestPlayerType, npcPath);
          } catch {
            // Quest daemon may not be initialized yet
          }
        })
        .catch(() => {
          // Ignore import errors
        });
    }

    // Try AI response first if enabled
    if (this._aiEnabled && this._aiContext) {
      this.handleAIResponse(speaker, message).then((handled) => {
        if (!handled) {
          // AI failed or unavailable, try static responses
          this.tryStaticResponse(speaker, message);
        }
      }).catch(() => {
        // Error in AI handling, fall back to static
        this.tryStaticResponse(speaker, message);
      });
      return;
    }

    // No AI - use static responses
    this.tryStaticResponse(speaker, message);
  }

  // ========== Aggression ==========

  /**
   * Set a function to determine if this NPC is aggressive to a target.
   * @param fn Function returning true if aggressive
   */
  setAggressive(fn: ((target: Living) => boolean) | null): void {
    this._aggressiveTo = fn;
  }

  /**
   * Check if this NPC is aggressive to a target.
   * @param target The potential target
   */
  isAggressiveTo(target: Living): boolean {
    if (!this._aggressiveTo) return false;
    return this._aggressiveTo(target);
  }

  // ========== Wandering ==========

  /**
   * Enable wandering behavior.
   * @param directions Allowed directions, or empty for all exits
   * @param areaRestricted If true, restrict wandering to spawn room's area
   */
  enableWandering(directions: string[] = [], areaRestricted: boolean = false): void {
    this._wandering = true;
    this._wanderDirections = directions;
    this._wanderAreaRestricted = areaRestricted;
    if (areaRestricted) {
      this.setWanderAreaFromSpawnRoom();
    }
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

    // Lazily derive area path from current environment if area-restricted but path not set
    if (this._wanderAreaRestricted && !this._wanderAreaPath && env.objectPath) {
      const lastSlash = env.objectPath.lastIndexOf('/');
      if (lastSlash > 0) {
        this._wanderAreaPath = env.objectPath.substring(0, lastSlash + 1);
      }
    }

    // Filter by area path if restricted
    if (this._wanderAreaPath && typeof env.getExit === 'function') {
      directions = directions.filter((d) => {
        const exit = env.getExit(d);
        if (!exit) return false;
        const destPath = typeof exit.destination === 'string'
          ? exit.destination
          : (exit.destination as { objectPath?: string })?.objectPath;
        return destPath?.startsWith(this._wanderAreaPath!) ?? false;
      });
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

  // ========== Wander Area ==========

  /**
   * Get the area path restriction for wandering.
   */
  get wanderAreaPath(): string | null {
    return this._wanderAreaPath;
  }

  /**
   * Set the area path restriction for wandering.
   */
  set wanderAreaPath(path: string | null) {
    this._wanderAreaPath = path;
  }

  /**
   * Set the wander area path from the spawn room's location.
   * This extracts the directory path from the spawn room's object path.
   */
  setWanderAreaFromSpawnRoom(): void {
    if (!this._spawnRoom?.objectPath) return;
    const lastSlash = this._spawnRoom.objectPath.lastIndexOf('/');
    if (lastSlash > 0) {
      this._wanderAreaPath = this._spawnRoom.objectPath.substring(0, lastSlash + 1);
    }
  }

  // ========== Combat Configuration ==========

  /**
   * Get the combat configuration.
   */
  get combatConfig(): NPCCombatConfig | null {
    return this._combatConfig;
  }

  /**
   * Set the combat configuration.
   */
  set combatConfig(config: NPCCombatConfig | null) {
    this._combatConfig = config;
  }

  /**
   * Get gold amount.
   */
  get gold(): number {
    return this._gold;
  }

  /**
   * Set gold amount.
   */
  set gold(value: number) {
    this._gold = Math.max(0, value);
  }

  /**
   * Configure combat settings for this NPC.
   */
  setCombat(options: {
    level?: number;
    baseXP?: number;
    lootTable?: LootEntry[];
    goldDrop?: GoldDrop;
    specialAttackChance?: number;
    gold?: number;
  }): void {
    if (!this._combatConfig) {
      this._combatConfig = {
        baseXP: 10,
        level: 1,
        lootTable: [],
      };
    }

    if (options.level !== undefined) {
      this._combatConfig.level = options.level;
      this.level = options.level;
    }
    if (options.baseXP !== undefined) {
      this._combatConfig.baseXP = options.baseXP;
    }
    if (options.lootTable !== undefined) {
      this._combatConfig.lootTable = options.lootTable;
    }
    if (options.goldDrop !== undefined) {
      this._combatConfig.goldDrop = options.goldDrop;
    }
    if (options.specialAttackChance !== undefined) {
      this._combatConfig.specialAttackChance = options.specialAttackChance;
    }
    if (options.gold !== undefined) {
      this._gold = options.gold;
    }
  }

  /**
   * Configure random loot generation for this NPC.
   * When enabled, this NPC will drop randomly generated items instead of
   * (or in addition to) static loot table items.
   *
   * @param config Random loot configuration, or null to disable
   *
   * @example
   * ```typescript
   * this.setRandomLoot({
   *   enabled: true,
   *   itemLevel: 20,
   *   maxQuality: 'epic',
   *   dropChance: 80,
   *   maxDrops: 2,
   *   allowedTypes: ['weapon', 'armor'],
   * });
   * ```
   */
  setRandomLoot(config: NPCRandomLootConfig | null): void {
    this._randomLootConfig = config;

    // If enabled, register with the loot daemon
    if (config?.enabled && this.objectPath) {
      import('../daemons/loot.js')
        .then(({ getLootDaemon }) => {
          try {
            const lootDaemon = getLootDaemon();
            lootDaemon.registerNPC(this.objectPath!, config);
          } catch {
            // Loot daemon may not be initialized yet
          }
        })
        .catch(() => {
          // Ignore import errors
        });
    } else if (!config?.enabled && this.objectPath) {
      // Unregister if disabling
      import('../daemons/loot.js')
        .then(({ getLootDaemon }) => {
          try {
            const lootDaemon = getLootDaemon();
            lootDaemon.unregisterNPC(this.objectPath!);
          } catch {
            // Loot daemon may not be initialized yet
          }
        })
        .catch(() => {
          // Ignore import errors
        });
    }
  }

  /**
   * Get the random loot configuration.
   */
  getRandomLootConfig(): NPCRandomLootConfig | null {
    return this._randomLootConfig;
  }

  /**
   * Check if this NPC has random loot enabled.
   */
  hasRandomLoot(): boolean {
    return this._randomLootConfig?.enabled ?? false;
  }

  // ========== Natural Attacks ==========

  /**
   * Set the natural attacks for this NPC.
   * Accepts an array of attack names (resolved from NATURAL_ATTACKS) or NaturalAttack objects.
   *
   * @param attacks Array of attack names (e.g., ['bite', 'claw']) or NaturalAttack objects
   *
   * @example
   * ```typescript
   * // Using predefined attack names
   * this.setNaturalAttacks(['bite', 'claw']);
   *
   * // Using custom attack objects
   * this.setNaturalAttacks([
   *   { name: 'venomous fangs', damageType: 'piercing', hitVerb: 'bites', missVerb: 'snaps at', damageBonus: 2 },
   * ]);
   * ```
   */
  setNaturalAttacks(attacks: (string | NaturalAttack)[]): void {
    this._naturalAttacks = [];
    for (const attack of attacks) {
      this.addNaturalAttack(attack);
    }
  }

  /**
   * Add a single natural attack to this NPC.
   *
   * @param attack Attack name (e.g., 'bite') or NaturalAttack object
   */
  addNaturalAttack(attack: string | NaturalAttack): void {
    if (typeof attack === 'string') {
      const predefined = NATURAL_ATTACKS[attack];
      if (predefined) {
        this._naturalAttacks.push({ ...predefined });
      } else {
        console.warn(`[NPC] Unknown natural attack type: ${attack}`);
      }
    } else {
      this._naturalAttacks.push(attack);
    }
  }

  /**
   * Get a random natural attack from this NPC's attack list.
   * Uses weighted random selection if weights are specified.
   *
   * @returns A natural attack, or null if none configured
   */
  getNaturalAttack(): NaturalAttack | null {
    if (this._naturalAttacks.length === 0) {
      return null;
    }

    // Calculate total weight
    let totalWeight = 0;
    for (const attack of this._naturalAttacks) {
      totalWeight += attack.weight ?? 1;
    }

    // Pick a random weighted attack
    const random = typeof efuns !== 'undefined'
      ? efuns.random(totalWeight)
      : Math.floor(Math.random() * totalWeight);

    let cumulative = 0;
    for (const attack of this._naturalAttacks) {
      cumulative += attack.weight ?? 1;
      if (random < cumulative) {
        return attack;
      }
    }

    // Fallback to first attack
    return this._naturalAttacks[0];
  }

  /**
   * Get all natural attacks configured for this NPC.
   */
  getNaturalAttacks(): NaturalAttack[] {
    return [...this._naturalAttacks];
  }

  // ========== Threat Management ==========

  /**
   * Add threat from a source.
   * @param source The living being generating threat
   * @param amount The amount of threat to add
   */
  addThreat(source: Living, amount: number): void {
    if (amount <= 0) return;

    const sourceId = source.objectId;
    const now = Date.now();
    const existing = this._threatTable.get(sourceId);

    if (existing) {
      existing.threat += amount;
      existing.lastUpdated = now;
    } else {
      this._threatTable.set(sourceId, {
        sourceId,
        threat: amount,
        lastUpdated: now,
        isTaunted: false,
        tauntExpires: 0,
      });
    }
  }

  /**
   * Get current threat level for a source.
   * @param source The living being to check
   * @returns Current threat value, or 0 if not on threat table
   */
  getThreat(source: Living): number {
    const entry = this._threatTable.get(source.objectId);
    return entry?.threat ?? 0;
  }

  /**
   * Clear threat from a specific source or all sources.
   * @param source Optional source to clear; if omitted, clears all threat
   */
  clearThreat(source?: Living): void {
    if (source) {
      this._threatTable.delete(source.objectId);
    } else {
      this._threatTable.clear();
    }
  }

  /**
   * Get the target with highest threat that is valid (alive, in room).
   * Applies time-based decay before checking.
   * @returns The highest threat target, or null if none valid
   */
  getHighestThreatTarget(): Living | null {
    if (this._threatTable.size === 0) return null;

    const room = this.environment;
    if (!room) return null;

    const now = Date.now();
    const decayRate = this.inCombat
      ? NPC.THREAT_DECAY_IN_COMBAT
      : NPC.THREAT_DECAY_OUT_OF_COMBAT;

    let highestThreat = 0;
    let highestTarget: Living | null = null;
    let tauntedTarget: Living | null = null;
    const toRemove: string[] = [];

    for (const [sourceId, entry] of this._threatTable) {
      // Apply decay
      const secondsElapsed = (now - entry.lastUpdated) / 1000;
      const decayMultiplier = Math.pow(1 - decayRate, secondsElapsed);
      entry.threat *= decayMultiplier;
      entry.lastUpdated = now;

      // Check if taunt expired
      if (entry.isTaunted && entry.tauntExpires > 0 && now > entry.tauntExpires) {
        entry.isTaunted = false;
        entry.tauntExpires = 0;
      }

      // Remove if threat too low
      if (entry.threat < NPC.THREAT_MINIMUM) {
        toRemove.push(sourceId);
        continue;
      }

      // Find the source living
      const source = this.findLivingById(sourceId, room);
      if (!source || !source.alive) {
        toRemove.push(sourceId);
        continue;
      }

      // Track taunted target (takes priority)
      if (entry.isTaunted) {
        tauntedTarget = source;
      }

      // Track highest threat
      if (entry.threat > highestThreat) {
        highestThreat = entry.threat;
        highestTarget = source;
      }
    }

    // Cleanup expired entries
    for (const id of toRemove) {
      this._threatTable.delete(id);
    }

    // Taunted target takes priority
    return tauntedTarget ?? highestTarget;
  }

  /**
   * Apply a taunt effect, forcing this NPC to target the source.
   * @param source The taunter
   * @param duration Duration in milliseconds
   */
  applyTaunt(source: Living, duration: number): void {
    const sourceId = source.objectId;
    const now = Date.now();
    const entry = this._threatTable.get(sourceId);

    if (entry) {
      entry.isTaunted = true;
      entry.tauntExpires = now + duration;
    } else {
      // Add to threat table if not present
      this._threatTable.set(sourceId, {
        sourceId,
        threat: 1, // Minimal threat, but taunted
        lastUpdated: now,
        isTaunted: true,
        tauntExpires: now + duration,
      });
    }
  }

  /**
   * Get the full threat table (for debugging/display).
   */
  getThreatTable(): Map<string, ThreatEntry> {
    return new Map(this._threatTable);
  }

  /**
   * Check if a specific source is currently taunting this NPC.
   */
  isTauntedBy(source: Living): boolean {
    const entry = this._threatTable.get(source.objectId);
    if (!entry) return false;
    if (!entry.isTaunted) return false;
    return Date.now() < entry.tauntExpires;
  }

  /**
   * Find a living by objectId in the current room.
   */
  private findLivingById(objectId: string, room: MudObject): Living | null {
    if (!('getLivings' in room)) return null;
    const getLivings = (room as MudObject & { getLivings: () => Living[] }).getLivings;
    const livings = getLivings.call(room);
    return livings.find(l => l.objectId === objectId) ?? null;
  }

  // ========== Behavior/AI System ==========

  /**
   * Configure AI behavior for this NPC.
   * Enables intelligent combat decisions based on role and guild.
   *
   * @param options Behavior configuration options
   *
   * @example
   * ```typescript
   * // Cleric healer NPC
   * this.setBehavior({
   *   mode: 'defensive',
   *   role: 'healer',
   *   guild: 'cleric',
   *   healSelfThreshold: 60,
   *   healAllyThreshold: 50,
   * });
   *
   * // Fighter tank NPC
   * this.setBehavior({
   *   mode: 'aggressive',
   *   role: 'tank',
   *   guild: 'fighter',
   * });
   * ```
   */
  setBehavior(options: Partial<BehaviorConfig> & { mode: BehaviorMode; role?: CombatRole }): void {
    // Infer role from guild if not specified
    const guild = options.guild;
    let role = options.role;
    if (!role && guild) {
      role = GUILD_ROLE_MAP[guild] || 'generic';
    }

    this._behaviorConfig = {
      mode: options.mode,
      role: role || 'generic',
      guild: options.guild,
      wimpyThreshold: options.wimpyThreshold ?? BEHAVIOR_DEFAULTS.wimpyThreshold,
      healSelfThreshold: options.healSelfThreshold ?? BEHAVIOR_DEFAULTS.healSelfThreshold,
      healAllyThreshold: options.healAllyThreshold ?? BEHAVIOR_DEFAULTS.healAllyThreshold,
      criticalAllyThreshold: options.criticalAllyThreshold ?? BEHAVIOR_DEFAULTS.criticalAllyThreshold,
      criticalSelfThreshold: options.criticalSelfThreshold ?? BEHAVIOR_DEFAULTS.criticalSelfThreshold,
      willTaunt: options.willTaunt ?? BEHAVIOR_DEFAULTS.willTaunt,
      willHealAllies: options.willHealAllies ?? BEHAVIOR_DEFAULTS.willHealAllies,
      willBuffAllies: options.willBuffAllies ?? BEHAVIOR_DEFAULTS.willBuffAllies,
      willDebuffEnemies: options.willDebuffEnemies ?? BEHAVIOR_DEFAULTS.willDebuffEnemies,
    };
  }

  /**
   * Get the current behavior configuration.
   */
  getBehaviorConfig(): BehaviorConfig | null {
    return this._behaviorConfig;
  }

  /**
   * Clear behavior configuration (disable AI behavior).
   */
  clearBehavior(): void {
    this._behaviorConfig = null;
  }

  /**
   * Learn specific skills for this NPC.
   * NPCs don't need to meet prerequisites or pay costs.
   *
   * @param skillIds Array of skill IDs to learn (e.g., ['fighter:bash', 'fighter:taunt'])
   * @param level Skill level to set (default 1)
   */
  learnSkills(skillIds: string[], level: number = 1): void {
    // Get or create guild data
    let guildData = this.getProperty('guildData') as {
      guilds: Array<{ guildId: GuildId; guildLevel: number; guildXP: number; joinedAt: number }>;
      skills: Array<{ skillId: string; level: number; xpInvested: number }>;
      cooldowns: Array<{ skillId: string; expiresAt: number }>;
    } | undefined;

    if (!guildData) {
      guildData = {
        guilds: [],
        skills: [],
        cooldowns: [],
      };
    }

    for (const skillId of skillIds) {
      // Check if already learned
      const existingIdx = guildData.skills.findIndex(s => s.skillId === skillId);
      if (existingIdx >= 0) {
        // Update level if higher
        if (level > guildData.skills[existingIdx].level) {
          guildData.skills[existingIdx].level = level;
        }
      } else {
        // Add new skill
        guildData.skills.push({
          skillId,
          level,
          xpInvested: 0,
        });
      }

      // Auto-add guild membership if needed
      const guildId = skillId.split(':')[0] as GuildId;
      if (guildId && !guildData.guilds.some(g => g.guildId === guildId)) {
        guildData.guilds.push({
          guildId,
          guildLevel: 20, // NPCs get max guild level
          guildXP: 0,
          joinedAt: Date.now(),
        });
      }
    }

    this.setProperty('guildData', guildData);
  }

  /**
   * Learn default skills for the configured guild based on NPC level.
   * Automatically learns skills the NPC's level qualifies for.
   */
  learnDefaultGuildSkills(): void {
    if (!this._behaviorConfig?.guild) return;

    const guild = this._behaviorConfig.guild;
    const npcLevel = this.level;

    // Map NPC level to guild level (rough approximation)
    // Guild level 1 at NPC level 1, guild level 20 at NPC level 60
    const guildLevel = Math.min(20, Math.max(1, Math.floor((npcLevel / 60) * 20) + 1));

    // Get skills available at this guild level
    import('./guild/definitions.js')
      .then(({ getSkillsForGuild }) => {
        const allGuildSkills = getSkillsForGuild(guild);
        const availableSkills = allGuildSkills.filter(s => s.guildLevelRequired <= guildLevel);
        const skillIds = availableSkills.map(s => s.id);

        // Learn with skill level based on NPC level (1-50)
        const skillLevel = Math.min(50, Math.max(1, Math.floor(npcLevel / 2)));
        this.learnSkills(skillIds, skillLevel);
      })
      .catch(() => {
        // Guild definitions not available
      });
  }

  /**
   * Auto-balance NPC based on level. Sets HP, stats, XP, gold, and damage.
   * All values can be overridden after calling this method.
   * @param level The NPC level (1-60)
   * @param type The NPC type for multipliers (default: 'normal')
   */
  setLevel(level: number, type: NPCType = 'normal'): this {
    const mult = NPC_TYPE_MULTIPLIERS[type];

    // Set level (NPCs can go up to 60)
    this.level = Math.max(1, Math.min(60, level));

    // Auto-calculate HP: 50 + level * 15
    const baseHP = 50 + (level * 15);
    this.maxHealth = Math.round(baseHP * mult.hp);
    this.health = this.maxHealth;

    // Auto-calculate MP: 50 + level * 10
    const baseMP = 50 + (level * 10);
    this.maxMana = Math.round(baseMP * mult.hp);
    this.mana = this.maxMana;

    // Auto-calculate stats: max(1, floor(level / 2) + 1) - matches player starting stats
    const baseStat = Math.max(1, Math.floor(level / 2) + 1);
    const stats: StatName[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'luck'];
    for (const stat of stats) {
      this.setBaseStat(stat, baseStat);
    }

    // Auto-calculate combat config
    const baseXP = level * 10;
    const baseGoldMin = level * 2;
    const baseGoldMax = level * 5;

    this.setCombat({
      level: this.level,
      baseXP: Math.round(baseXP * mult.xp),
      goldDrop: {
        min: Math.round(baseGoldMin * mult.gold),
        max: Math.round(baseGoldMax * mult.gold),
      },
    });

    // Add natural armor based on level (scales with NPC type multiplier)
    // Formula: floor(level / 4) + 1, then multiply by HP multiplier
    const baseArmor = Math.floor(level / 4) + 1;
    this.addCombatStatModifier('armorBonus', Math.round(baseArmor * mult.hp));

    // Add natural dodge based on level
    // Formula: floor(level / 5) - higher level NPCs are harder to hit
    const baseDodge = Math.floor(level / 5);
    if (baseDodge > 0) {
      this.addCombatStatModifier('toDodge', baseDodge);
    }

    // Store type for reference
    this.setProperty('npcType', type);

    return this;
  }

  /**
   * Get the base unarmed damage range for this NPC based on level.
   * Used when NPC has no weapon equipped.
   */
  getBaseDamageRange(): { min: number; max: number } {
    const type = (this.getProperty('npcType') as NPCType) || 'normal';
    const mult = NPC_TYPE_MULTIPLIERS[type] || NPC_TYPE_MULTIPLIERS.normal;
    const level = this.level || 1;
    const minDmg = Math.max(1, Math.floor(level / 2));
    const maxDmg = Math.max(2, level);
    return {
      min: Math.round(minDmg * mult.damage) || 1,
      max: Math.round(maxDmg * mult.damage) || 2,
    };
  }

  /**
   * Add an item to the loot table.
   */
  addLoot(itemPath: string, chance: number, minQty: number = 1, maxQty: number = 1): void {
    if (!this._combatConfig) {
      this._combatConfig = {
        baseXP: 10,
        level: 1,
        lootTable: [],
      };
    }
    this._combatConfig.lootTable.push({
      itemPath,
      chance,
      minQuantity: minQty,
      maxQuantity: maxQty,
    });
  }

  /**
   * Calculate XP reward for a killer.
   * Formula: baseXP * levelDiffMultiplier
   */
  calculateXPReward(killerLevel: number): number {
    const config = this._combatConfig;
    const baseXP = config?.baseXP || this.level * 10;
    const npcLevel = config?.level || this.level;

    const levelDiff = npcLevel - killerLevel;

    let multiplier: number;
    if (levelDiff > 0) {
      // NPC is higher level - bonus XP
      multiplier = 1 + (levelDiff * 0.10);
    } else {
      // NPC is lower level - reduced XP
      multiplier = Math.max(0.1, 1 + (levelDiff * 0.15));
    }

    return Math.max(1, Math.round(baseXP * multiplier));
  }

  /**
   * Generate gold drop amount.
   */
  generateGoldDrop(): number {
    // If NPC has explicit gold, use that
    if (this._gold > 0) {
      return this._gold;
    }

    // Otherwise use combat config's goldDrop range
    const goldDrop = this._combatConfig?.goldDrop;
    if (!goldDrop) return 0;

    const range = goldDrop.max - goldDrop.min;
    const random = typeof efuns !== 'undefined'
      ? efuns.random(range + 1)
      : Math.floor(Math.random() * (range + 1));

    return goldDrop.min + random;
  }

  /**
   * Generate loot from loot table.
   * @returns Array of item paths that dropped
   */
  async generateLoot(corpse: Corpse): Promise<string[]> {
    const droppedItems: string[] = [];

    // Generate random loot if enabled
    if (this._randomLootConfig?.enabled) {
      try {
        const { getLootDaemon } = await import('../daemons/loot.js');
        const lootDaemon = getLootDaemon();
        const randomItems = await lootDaemon.generateNPCLoot(this, corpse);

        // Track generated items by their type
        for (const item of randomItems) {
          droppedItems.push(`/generated/${item.shortDesc || 'item'}`);
        }
      } catch {
        // Loot daemon not available, fall through to static loot
      }
    }

    // Also generate static loot table items (they stack with random loot)
    const lootTable = this._combatConfig?.lootTable || [];

    for (const entry of lootTable) {
      const roll = typeof efuns !== 'undefined'
        ? efuns.random(100)
        : Math.floor(Math.random() * 100);

      if (roll < entry.chance) {
        // Determine quantity
        const minQty = entry.minQuantity || 1;
        const maxQty = entry.maxQuantity || 1;
        const qtyRange = maxQty - minQty;
        const quantity = minQty + (typeof efuns !== 'undefined'
          ? efuns.random(qtyRange + 1)
          : Math.floor(Math.random() * (qtyRange + 1)));

        // Clone items
        for (let i = 0; i < quantity; i++) {
          try {
            if (typeof efuns !== 'undefined' && efuns.cloneObject) {
              const item = await efuns.cloneObject(entry.itemPath);
              if (item) {
                await item.moveTo(corpse);
                droppedItems.push(entry.itemPath);
              }
            }
          } catch {
            // Skip failed clones
          }
        }
      }
    }

    return droppedItems;
  }

  // ========== Heartbeat ==========

  /**
   * Heartbeat handler.
   * Processes chat, wandering, aggression, and other periodic behaviors.
   */
  override async heartbeat(): Promise<void> {
    // Call parent heartbeat for effect ticking
    super.heartbeat();

    if (!this.alive) return;

    const random = typeof efuns !== 'undefined' ? efuns.random : (max: number) =>
      Math.floor(Math.random() * max);

    // Aggression check: if not in combat, look for targets (threat-based first)
    if (!this.inCombat) {
      const combatDaemon = getCombatDaemon();

      // First priority: check threat table for remembered targets
      const threatTarget = this.getHighestThreatTarget();
      if (threatTarget && threatTarget.alive) {
        combatDaemon.initiateCombat(this, threatTarget);
      } else if (this._aggressiveTo) {
        // Second priority: normal aggression check
        const room = this.environment;
        if (room && 'getLivings' in room) {
          const getLivings = (room as MudObject & { getLivings: () => Living[] }).getLivings;
          const livings = getLivings.call(room);
          for (const target of livings) {
            if (target !== this && target.alive && this.isAggressiveTo(target)) {
              // Attack this target
              combatDaemon.initiateCombat(this, target);
              break; // Only attack one target per heartbeat
            }
          }
        }
      }
    }

    // Behavior AI: execute intelligent actions when in combat with behavior configured
    if (this.inCombat && this._behaviorConfig) {
      import('../daemons/behavior.js')
        .then(({ getBehaviorDaemon }) => {
          const behaviorDaemon = getBehaviorDaemon();
          behaviorDaemon.executeAction(this).catch((error) => {
            console.error(`[NPC] Behavior execution failed for ${this.name}:`, error);
          });
        })
        .catch((error) => {
          console.error(`[NPC] Failed to load behavior daemon for ${this.name}:`, error);
        });
    }

    // Chat
    if (this._chats.length > 0 && random(100) < this._chatChance) {
      this.doChat();
    }

    // Wander (skip if in combat)
    if (this._wandering && !this.inCombat && random(100) < this._wanderChance) {
      await this.doWander();
    }
  }

  // ========== Lifecycle ==========

  /**
   * Called when a living being enters the room this NPC is in.
   * Override in subclasses to react to newcomers.
   * Loads grudges for players this NPC remembers (even if not normally aggressive).
   * @param who The living being that entered
   * @param from The room they came from (if any)
   */
  onEnter(who: Living, from?: Room): void | Promise<void> {
    // Always check for grudges - NPCs remember players who attacked them
    try {
      const aggroDaemon = getAggroDaemon();
      const playerName = who.name?.toLowerCase();
      const npcPath = this.objectPath;

      if (playerName && npcPath) {
        const grudges = aggroDaemon.getGrudges(npcPath, playerName);
        for (const grudge of grudges) {
          // Add threat from grudge - this will cause the NPC to attack
          // even if it's not normally aggressive
          this.addThreat(who, grudge.intensity);
        }
      }
    } catch {
      // Aggro daemon may not be initialized yet
    }
  }

  /**
   * Called when the NPC dies.
   */
  override async onDeath(): Promise<void> {
    let deathRoom: typeof this.environment;
    let attackers: Living[] = [];

    try {
      deathRoom = this.environment;

      // End all combat
      const combatDaemon = getCombatDaemon();

      // Get attackers before ending combat (for XP distribution)
      attackers = [...this.attackers];
      combatDaemon.endAllCombats(this);
    } catch (error) {
      console.error(`[NPC] Error in onDeath sync section for ${this.name}:`, error);
      return;
    }

    // Remove dead NPC from room immediately - the corpse will be the visible
    // representation. This must happen before async operations (loot generation,
    // item transfer) to prevent "kill deer" from matching the dead NPC when
    // a live one is present. The NPC object stays alive in memory for the
    // rest of onDeath (XP, loot, respawn scheduling).
    this.moveTo(null);

    // Create corpse and handle loot
    let corpse: Corpse;
    let goldAmount = 0;
    try {
      corpse = new Corpse();
      corpse.ownerName = this.name;
      corpse.isPlayerCorpse = false;
      corpse.level = this.level;

      // Transfer NPC's inventory to corpse
      const items = [...this.inventory];
      for (const item of items) {
        await item.moveTo(corpse);
      }

      // Generate gold
      goldAmount = this.generateGoldDrop();
      if (goldAmount > 0) {
        corpse.gold = goldAmount;
      }

      // Generate loot drops
      await this.generateLoot(corpse);

      // Move corpse to death location
      if (deathRoom) {
        await corpse.moveTo(deathRoom);
      }

      // Start decay timer
      corpse.startDecay();
    } catch (error) {
      console.error(`[NPC] Error creating corpse/loot for ${this.name}:`, error);
      return;
    }

    // Distribute XP to all attackers (with party XP sharing support)
    for (const attacker of attackers) {
      // Check if attacker has gainExperience method (is a Player)
      if ('gainExperience' in attacker && typeof (attacker as Living & { gainExperience: (xp: number) => void }).gainExperience === 'function') {
        const xp = this.calculateXPReward(attacker.level);

        // Check if attacker is in a party for XP sharing
        import('../daemons/party.js')
          .then(({ getPartyDaemon }) => {
            try {
              const partyDaemon = getPartyDaemon();
              type PartyPlayer = Parameters<typeof partyDaemon.getPlayerParty>[0];
              const party = partyDaemon.getPlayerParty(attacker as PartyPlayer);

              if (party) {
                // Distribute XP via party daemon (splits among members in room)
                partyDaemon.awardPartyXP(party.id, xp, this.name, deathRoom);
                // Record the kill for the attacker who landed the killing blow
                partyDaemon.recordKill(attacker as PartyPlayer, this.name);
              } else {
                // Solo player - direct award
                (attacker as Living & { gainExperience: (xp: number) => void }).gainExperience(xp);
              }
            } catch {
              // Party daemon not available - award directly
              (attacker as Living & { gainExperience: (xp: number) => void }).gainExperience(xp);
            }
          })
          .catch((error) => {
            console.error(`[NPC] Party daemon import failed during XP award for ${this.name}:`, error);
            // Award directly as fallback
            (attacker as Living & { gainExperience: (xp: number) => void }).gainExperience(xp);
          });
      }
    }

    // Handle party auto-split for gold
    let goldWasAutoSplit = false;
    if (goldAmount > 0 && attackers.length > 0) {
      const primaryAttacker = attackers[0];
      import('../daemons/party.js')
        .then(({ getPartyDaemon }) => {
          try {
            const partyDaemon = getPartyDaemon();
            type PartyPlayer = Parameters<typeof partyDaemon.handleAutoSplit>[0];
            goldWasAutoSplit = partyDaemon.handleAutoSplit(
              primaryAttacker as PartyPlayer,
              corpse,
              goldAmount,
              deathRoom
            );
          } catch {
            // Party daemon not available
          }
        })
        .catch((error) => {
          console.error(`[NPC] Party daemon import failed during gold auto-split for ${this.name}:`, error);
        });
    }

    // Notify room about death and loot
    if (deathRoom && 'broadcast' in deathRoom) {
      const broadcast = (deathRoom as MudObject & { broadcast: (msg: string) => void }).broadcast.bind(deathRoom);

      const name = typeof efuns !== 'undefined' ? efuns.capitalize(this.name) : this.name;
      broadcast(`{red}${name} has been slain!{/}\n`);

      // Announce corpse (check if gold is still on corpse - may have been auto-split)
      const corpseGold = corpse.gold || 0;
      if (corpse.inventory.length > 0 || corpseGold > 0) {
        const lootDesc: string[] = [];
        if (corpseGold > 0) {
          lootDesc.push(`${corpseGold} gold`);
        }
        if (corpse.inventory.length > 0) {
          lootDesc.push(`${corpse.inventory.length} item${corpse.inventory.length > 1 ? 's' : ''}`);
        }
        broadcast(`{yellow}The corpse of ${this.name} contains: ${lootDesc.join(', ')}.{/}\n`);
      }
    }

    // Schedule respawn if enabled
    if (this._respawnTime > 0 && this._spawnRoom) {
      const spawnRoom = this._spawnRoom;
      const npcPath = this.objectPath;
      const selfId = this.objectId;

      if (typeof efuns !== 'undefined' && efuns.callOut) {
        efuns.callOut(() => {
          // Wrap async logic in an immediately invoked async function with error handling
          (async () => {
            // Get room's spawn tracking (if available)
            const roomWithTracking = spawnRoom as Room & {
              _spawnedNpcIds?: Set<string>;
            };

            // Clone a new NPC instead of reviving (cleaner approach)
            try {
              if (typeof efuns !== 'undefined' && efuns.cloneObject) {
                const newNpc = await efuns.cloneObject(npcPath);
                if (newNpc) {
                  // Update room's spawn tracking
                  if (roomWithTracking._spawnedNpcIds) {
                    roomWithTracking._spawnedNpcIds.delete(selfId);
                    roomWithTracking._spawnedNpcIds.add(newNpc.objectId);
                  }

                  // Set spawn room on new NPC
                  const newNpcWithSpawn = newNpc as NPC & {
                    _spawnRoom?: Room;
                    setWanderAreaFromSpawnRoom?: () => void;
                  };
                  newNpcWithSpawn._spawnRoom = spawnRoom;

                  // Set wander area path for area-restricted wandering
                  if (typeof newNpcWithSpawn.setWanderAreaFromSpawnRoom === 'function') {
                    newNpcWithSpawn.setWanderAreaFromSpawnRoom();
                  }

                  await newNpc.moveTo(spawnRoom);
                  if ('broadcast' in spawnRoom) {
                    const spawnName = (newNpc as NPC).name;
                    const name = typeof efuns !== 'undefined' ? efuns.capitalize(spawnName) : spawnName;
                    (spawnRoom as MudObject & { broadcast: (msg: string) => void })
                      .broadcast(`{dim}${name} appears.{/}\n`);
                  }
                }
              }
            } catch (error) {
              // Respawn failed - remove from tracking so room reset can retry
              console.error('[NPC] Respawn failed:', error);
              if (roomWithTracking._spawnedNpcIds) {
                roomWithTracking._spawnedNpcIds.delete(selfId);
              }
            }

            // Destroy the old NPC
            try {
              if (typeof efuns !== 'undefined' && efuns.destruct) {
                await efuns.destruct(this);
              }
            } catch (error) {
              console.error('[NPC] Failed to destruct old NPC:', error);
            }
          })().catch((error) => {
            console.error('[NPC] Unhandled error in respawn callback:', error);
          });
        }, this._respawnTime * 1000);
      }
    } else {
      // No respawn - destroy after a delay to allow for any final operations
      if (typeof efuns !== 'undefined' && efuns.callOut) {
        efuns.callOut(() => {
          (async () => {
            if (typeof efuns !== 'undefined' && efuns.destruct) {
              await efuns.destruct(this);
            }
          })().catch((error) => {
            console.error('[NPC] Failed to destruct NPC:', error);
          });
        }, 1000);
      }
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
    level?: number;
    chats?: Array<{ message: string; type?: 'say' | 'emote'; chance?: number }>;
    chatChance?: number;
    wandering?: boolean;
    wanderChance?: number;
    wanderDirections?: string[];
    wanderAreaRestricted?: boolean;
    respawnTime?: number;
    // Combat options
    baseXP?: number;
    gold?: number;
    goldDrop?: GoldDrop;
    lootTable?: LootEntry[];
    // Natural attacks for creature-appropriate combat messages
    naturalAttacks?: (string | NaturalAttack)[];
    // Sound options
    lookSound?: string;
  }): void {
    if (options.name) this.name = options.name;
    if (options.title) this.title = options.title;
    if (options.shortDesc) this.shortDesc = options.shortDesc;
    if (options.longDesc) this.longDesc = options.longDesc;
    if (options.gender) this.gender = options.gender;
    if (options.maxHealth) this.maxHealth = options.maxHealth;
    if (options.health !== undefined) this.health = options.health;
    if (options.level !== undefined) this.level = options.level;

    if (options.chats) {
      this.clearChats();
      for (const chat of options.chats) {
        this.addChat(chat.message, chat.type || 'say', chat.chance);
      }
    }

    if (options.chatChance !== undefined) this._chatChance = options.chatChance;
    if (options.wandering) {
      this.enableWandering(options.wanderDirections || [], options.wanderAreaRestricted || false);
    } else if (options.wandering === false) {
      this._wandering = false;
    }
    if (options.wanderChance !== undefined) this._wanderChance = options.wanderChance;
    if (options.respawnTime !== undefined) this._respawnTime = options.respawnTime;

    // Sound configuration
    if (options.lookSound !== undefined) this._lookSound = options.lookSound;

    // Natural attacks configuration
    if (options.naturalAttacks) {
      this.setNaturalAttacks(options.naturalAttacks);
    }

    // Combat configuration
    if (options.baseXP !== undefined || options.gold !== undefined ||
        options.goldDrop !== undefined || options.lootTable !== undefined ||
        options.level !== undefined) {
      this.setCombat({
        level: options.level,
        baseXP: options.baseXP,
        gold: options.gold,
        goldDrop: options.goldDrop,
        lootTable: options.lootTable,
      });
    }
  }

  // ========== Quest Giver System ==========

  /**
   * Get the list of quests this NPC offers.
   */
  get questsOffered(): QuestId[] {
    return [...this._questsOffered];
  }

  /**
   * Get the list of quests this NPC accepts turn-ins for.
   */
  get questsTurnedIn(): QuestId[] {
    return [...this._questsTurnedIn];
  }

  /**
   * Set the quests this NPC offers.
   */
  setQuestsOffered(questIds: QuestId[]): void {
    this._questsOffered = [...questIds];
  }

  /**
   * Set the quests this NPC accepts turn-ins for.
   */
  setQuestsTurnedIn(questIds: QuestId[]): void {
    this._questsTurnedIn = [...questIds];
  }

  /**
   * Add a quest to offer.
   */
  addQuestOffered(questId: QuestId): void {
    if (!this._questsOffered.includes(questId)) {
      this._questsOffered.push(questId);
    }
  }

  /**
   * Add a quest to accept turn-ins for.
   */
  addQuestTurnedIn(questId: QuestId): void {
    if (!this._questsTurnedIn.includes(questId)) {
      this._questsTurnedIn.push(questId);
    }
  }

  /**
   * Check if this NPC is a quest giver.
   */
  isQuestGiver(): boolean {
    return this._questsOffered.length > 0 || this._questsTurnedIn.length > 0;
  }

  /**
   * Get available quests for a player (quests they can accept).
   */
  async getAvailableQuests(player: QuestPlayer): Promise<QuestDefinition[]> {
    const questDaemon = await getQuestDaemonLazy();
    if (!questDaemon) return [];

    const available: QuestDefinition[] = [];

    for (const questId of this._questsOffered) {
      const quest = questDaemon.getQuest(questId);
      if (!quest) continue;

      // Skip hidden quests - they don't appear in NPC quest lists
      if (quest.hidden) continue;

      // Check if player can accept this quest
      const canAccept = await questDaemon.canAcceptQuest(player, questId);
      if (canAccept.canAccept) {
        available.push(quest);
      }
    }

    return available;
  }

  /**
   * Get quests ready for turn-in at this NPC.
   */
  getCompletedQuests(player: QuestPlayer): PlayerQuestState[] {
    const questDaemon = getQuestDaemonSync();
    if (!questDaemon) return [];

    const activeQuests = questDaemon.getActiveQuests(player);

    return activeQuests.filter((state) => {
      // Only completed quests
      if (state.status !== 'completed') return false;

      // Check if this NPC accepts this quest
      if (!this._questsTurnedIn.includes(state.questId)) return false;

      return true;
    });
  }

  /**
   * Get all quests this NPC is associated with for a player.
   * Returns { available, inProgress, completed }
   */
  async getQuestsForPlayer(player: QuestPlayer): Promise<{
    available: QuestDefinition[];
    inProgress: PlayerQuestState[];
    completed: PlayerQuestState[];
  }> {
    const questDaemon = await getQuestDaemonLazy();
    if (!questDaemon) return { available: [], inProgress: [], completed: [] };

    const available = await this.getAvailableQuests(player);
    const completed = this.getCompletedQuests(player);

    // Get in-progress quests that this NPC is the giver or turn-in for
    const activeQuests = questDaemon.getActiveQuests(player);
    const inProgress = activeQuests.filter((state) => {
      if (state.status !== 'active') return false;
      return (
        this._questsOffered.includes(state.questId) ||
        this._questsTurnedIn.includes(state.questId)
      );
    });

    return { available, inProgress, completed };
  }

  /**
   * Check if there's a quest indicator for this NPC (for display purposes).
   * Returns:
   * - '!' if there are available quests
   * - '?' if there are quests ready for turn-in
   * - null if no quest activity
   */
  async getQuestIndicator(player: QuestPlayer): Promise<'!' | '?' | null> {
    const completed = this.getCompletedQuests(player);
    if (completed.length > 0) return '?';

    const available = await this.getAvailableQuests(player);
    if (available.length > 0) return '!';

    return null;
  }

  /**
   * Synchronous quest indicator check for room descriptions.
   * This is a simplified check that shows '?' for turn-ins (sync check)
   * and '!' for NPCs that offer quests (without full prerequisite check).
   * For accurate indicator, use the async getQuestIndicator().
   */
  getQuestIndicatorSync(player: QuestPlayer): '!' | '?' | null {
    // Check for quests ready for turn-in first (sync check)
    const completed = this.getCompletedQuests(player);
    if (completed.length > 0) return '?';

    // Check if this NPC offers any quests the player might be able to accept
    // We can't do full prerequisite check synchronously, so just check if
    // they have quests offered and the player isn't already on them
    if (this._questsOffered.length > 0) {
      const questDaemon = getQuestDaemonSync();
      if (questDaemon) {
        // Check if any offered quest is available (not active, not completed or repeatable)
        for (const questId of this._questsOffered) {
          const quest = questDaemon.getQuest(questId);
          if (!quest || quest.hidden) continue;

          // Skip if already active
          if (questDaemon.isQuestActive(player, questId)) continue;

          // Skip if completed and not repeatable
          if (questDaemon.hasCompletedQuest(player, questId) && !quest.repeatable) continue;

          // There's at least one potentially available quest
          return '!';
        }
      }
    }

    return null;
  }
}

export default NPC;
