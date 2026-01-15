/**
 * NPC - Base class for non-player characters.
 *
 * NPCs are computer-controlled living beings. They can have
 * chat messages, respond to triggers, and perform autonomous actions.
 */

import { Living } from './living.js';
import { MudObject } from './object.js';
import { Room } from './room.js';
import { Corpse } from './corpse.js';
import { getCombatDaemon } from '../daemons/combat.js';
import type { NPCCombatConfig, LootEntry, GoldDrop } from './combat/types.js';
import type { QuestId, QuestDefinition, PlayerQuestState, QuestPlayer } from './quest/types.js';
import { getQuestDaemon } from '../daemons/quest.js';
import type { NPCAIContext, ConversationMessage } from '../lib/ai-types.js';

// Re-export AI types for convenience
export type { NPCAIContext, ConversationMessage } from '../lib/ai-types.js';

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
  private _chats: ChatMessage[] = [];
  private _chatChance: number = 20; // % chance per heartbeat
  private _responses: ResponseTrigger[] = [];
  private _aggressiveTo: ((target: Living) => boolean) | null = null;
  private _wandering: boolean = false;
  private _wanderChance: number = 10; // % chance per heartbeat
  private _wanderDirections: string[] = [];
  private _respawnTime: number = 0; // 0 = no respawn
  private _spawnRoom: Room | null = null;

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
    const lootTable = this._combatConfig?.lootTable || [];
    const droppedItems: string[] = [];

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
   * Called when a living being enters the room this NPC is in.
   * Override in subclasses to react to newcomers.
   * @param who The living being that entered
   * @param from The room they came from (if any)
   */
  onEnter(who: Living, from?: Room): void | Promise<void> {
    // Default: do nothing
  }

  /**
   * Called when the NPC dies.
   */
  override async onDeath(): Promise<void> {
    const deathRoom = this.environment;

    // End all combat
    const combatDaemon = getCombatDaemon();

    // Get attackers before ending combat (for XP distribution)
    const attackers = [...this.attackers];
    combatDaemon.endAllCombats(this);

    // Create corpse
    const corpse = new Corpse();
    corpse.ownerName = this.name;
    corpse.isPlayerCorpse = false;

    // Transfer NPC's inventory to corpse
    const items = [...this.inventory];
    for (const item of items) {
      await item.moveTo(corpse);
    }

    // Generate gold
    const goldAmount = this.generateGoldDrop();
    if (goldAmount > 0) {
      corpse.gold = goldAmount;
    }

    // Generate loot drops
    await this.generateLoot(corpse);

    // Move corpse to death location
    if (deathRoom) {
      await corpse.moveTo(deathRoom);
    }

    // Distribute XP to all attackers
    for (const attacker of attackers) {
      // Check if attacker has gainExperience method (is a Player)
      if ('gainExperience' in attacker && typeof (attacker as Living & { gainExperience: (xp: number) => void }).gainExperience === 'function') {
        const xp = this.calculateXPReward(attacker.level);
        (attacker as Living & { gainExperience: (xp: number) => void }).gainExperience(xp);
      }
    }

    // Notify room about death and loot
    if (deathRoom && 'broadcast' in deathRoom) {
      const broadcast = (deathRoom as MudObject & { broadcast: (msg: string) => void }).broadcast.bind(deathRoom);

      const name = typeof efuns !== 'undefined' ? efuns.capitalize(this.name) : this.name;
      broadcast(`{red}${name} has been slain!{/}\n`);

      // Announce corpse
      if (corpse.inventory.length > 0 || goldAmount > 0) {
        const lootDesc: string[] = [];
        if (goldAmount > 0) {
          lootDesc.push(`${goldAmount} gold`);
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

      if (typeof efuns !== 'undefined' && efuns.callOut) {
        efuns.callOut(async () => {
          // Clone a new NPC instead of reviving (cleaner approach)
          try {
            if (typeof efuns !== 'undefined' && efuns.cloneObject) {
              const newNpc = await efuns.cloneObject(npcPath);
              if (newNpc) {
                await newNpc.moveTo(spawnRoom);
                if ('broadcast' in spawnRoom) {
                  const spawnName = (newNpc as NPC).name;
                  const name = typeof efuns !== 'undefined' ? efuns.capitalize(spawnName) : spawnName;
                  (spawnRoom as MudObject & { broadcast: (msg: string) => void })
                    .broadcast(`{dim}${name} appears.{/}\n`);
                }
              }
            }
          } catch {
            // Respawn failed - log if possible
          }

          // Destroy the old NPC
          if (typeof efuns !== 'undefined' && efuns.destruct) {
            await efuns.destruct(this);
          }
        }, this._respawnTime * 1000);
      }
    } else {
      // No respawn - destroy after a delay to allow for any final operations
      if (typeof efuns !== 'undefined' && efuns.callOut) {
        efuns.callOut(async () => {
          if (typeof efuns !== 'undefined' && efuns.destruct) {
            await efuns.destruct(this);
          }
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
    respawnTime?: number;
    // Combat options
    baseXP?: number;
    gold?: number;
    goldDrop?: GoldDrop;
    lootTable?: LootEntry[];
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
    if (options.wandering !== undefined) this._wandering = options.wandering;
    if (options.wanderChance !== undefined) this._wanderChance = options.wanderChance;
    if (options.wanderDirections) this._wanderDirections = options.wanderDirections;
    if (options.respawnTime !== undefined) this._respawnTime = options.respawnTime;

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
