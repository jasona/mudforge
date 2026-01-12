/**
 * Quest Daemon - Manages the quest system.
 *
 * Provides quest registration, acceptance, progress tracking, completion,
 * and integration hooks for combat/item/exploration systems.
 *
 * Usage:
 *   const daemon = getQuestDaemon();
 *   daemon.acceptQuest(player, 'aldric:rat_problem');
 *   daemon.updateKillObjective(player, '/areas/valdoria/aldric/rat');
 */

import { MudObject } from '../lib/std.js';
import {
  type QuestId,
  type QuestDefinition,
  type QuestObjective,
  type PlayerQuestData,
  type PlayerQuestState,
  type ObjectiveProgress,
  type AcceptQuestResult,
  type AbandonQuestResult,
  type TurnInQuestResult,
  type UpdateObjectiveResult,
  type CanAcceptQuestResult,
  type CanTurnInQuestResult,
  type QuestPlayer,
  type QuestRewards,
  QUEST_CONSTANTS,
  DEFAULT_PLAYER_QUEST_DATA,
} from '../std/quest/types.js';
import { getAllQuestDefinitions } from '../std/quest/definitions/index.js';

/**
 * Quest Daemon class.
 */
export class QuestDaemon extends MudObject {
  private _quests: Map<QuestId, QuestDefinition> = new Map();
  private _customHandlers: Map<string, Function> = new Map();
  private _loaded: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Quest Daemon';
    this.longDesc = 'The quest daemon manages all quests in the game.';
  }

  /**
   * Load and initialize all quests from definitions.
   * Called after module initialization is complete.
   */
  async load(): Promise<void> {
    if (this._loaded) return;
    this.loadSync();
  }

  /**
   * Synchronously load all quests from definitions.
   * Used to ensure quests are available immediately on first access.
   */
  loadSync(): void {
    if (this._loaded) return;

    try {
      const quests = getAllQuestDefinitions();
      let registered = 0;

      for (const quest of quests) {
        if (this.registerQuest(quest)) {
          registered++;
        }
      }

      console.log(`[QuestDaemon] Initialized ${registered} quests`);
      this._loaded = true;
    } catch (error) {
      console.error('[QuestDaemon] Failed to load quests:', error);
    }
  }

  // ==================== Quest Registration ====================

  /**
   * Register a quest definition.
   */
  registerQuest(quest: QuestDefinition): boolean {
    if (this._quests.has(quest.id)) {
      console.warn(`[QuestDaemon] Quest ${quest.id} already registered`);
      return false;
    }

    // Validate quest
    if (!quest.objectives || quest.objectives.length === 0) {
      console.error(`[QuestDaemon] Quest ${quest.id} has no objectives`);
      return false;
    }

    this._quests.set(quest.id, quest);
    return true;
  }

  /**
   * Get a quest definition by ID.
   */
  getQuest(id: QuestId): QuestDefinition | undefined {
    return this._quests.get(id);
  }

  /**
   * Get all registered quests.
   */
  getAllQuests(): QuestDefinition[] {
    return Array.from(this._quests.values());
  }

  /**
   * Get all quests for a specific area.
   */
  getQuestsByArea(area: string): QuestDefinition[] {
    return this.getAllQuests().filter((q) => q.area === area);
  }

  /**
   * Register a custom handler for custom objectives/rewards/prerequisites.
   */
  registerCustomHandler(name: string, handler: Function): void {
    this._customHandlers.set(name, handler);
  }

  /**
   * Get a registered custom handler.
   */
  getCustomHandler(name: string): Function | undefined {
    return this._customHandlers.get(name);
  }

  // ==================== Player Quest Data ====================

  /**
   * Get player's quest data (creates default if not exists).
   */
  getPlayerQuestData(player: QuestPlayer): PlayerQuestData {
    const data = player.getProperty(QUEST_CONSTANTS.PLAYER_DATA_KEY) as PlayerQuestData | undefined;
    if (!data) {
      const newData = { ...DEFAULT_PLAYER_QUEST_DATA };
      player.setProperty(QUEST_CONSTANTS.PLAYER_DATA_KEY, newData);
      return newData;
    }
    return data;
  }

  /**
   * Save player's quest data.
   */
  private savePlayerQuestData(player: QuestPlayer, data: PlayerQuestData): void {
    player.setProperty(QUEST_CONSTANTS.PLAYER_DATA_KEY, data);
  }

  // ==================== Quest State Queries ====================

  /**
   * Check if player has completed a quest.
   */
  hasCompletedQuest(player: QuestPlayer, questId: QuestId): boolean {
    const data = this.getPlayerQuestData(player);
    return questId in data.completed;
  }

  /**
   * Get a player's active quest state.
   */
  getActiveQuest(player: QuestPlayer, questId: QuestId): PlayerQuestState | undefined {
    const data = this.getPlayerQuestData(player);
    return data.active.find((q) => q.questId === questId);
  }

  /**
   * Check if quest is currently active.
   */
  isQuestActive(player: QuestPlayer, questId: QuestId): boolean {
    return this.getActiveQuest(player, questId) !== undefined;
  }

  /**
   * Get all active quests for a player.
   */
  getActiveQuests(player: QuestPlayer): PlayerQuestState[] {
    const data = this.getPlayerQuestData(player);
    return data.active;
  }

  /**
   * Get player's quest points.
   */
  getQuestPoints(player: QuestPlayer): number {
    const data = this.getPlayerQuestData(player);
    return data.questPoints;
  }

  // ==================== Quest Lifecycle ====================

  /**
   * Check if player can accept a quest.
   */
  canAcceptQuest(player: QuestPlayer, questId: QuestId): CanAcceptQuestResult {
    const quest = this.getQuest(questId);
    if (!quest) {
      return { canAccept: false, reason: 'Quest not found.' };
    }

    // Check if already active
    if (this.isQuestActive(player, questId)) {
      return { canAccept: false, reason: 'You are already on this quest.' };
    }

    // Check if already completed (and not repeatable)
    if (this.hasCompletedQuest(player, questId)) {
      if (!quest.repeatable) {
        return { canAccept: false, reason: 'You have already completed this quest.' };
      }

      // Check repeatable cooldown
      if (quest.repeatCooldown) {
        const data = this.getPlayerQuestData(player);
        const lastTime = data.repeatableTimestamps?.[questId] || 0;
        const now = Date.now();
        if (now - lastTime < quest.repeatCooldown) {
          const remaining = Math.ceil((quest.repeatCooldown - (now - lastTime)) / 1000 / 60);
          return { canAccept: false, reason: `Quest on cooldown (${remaining} minutes remaining).` };
        }
      }
    }

    // Check max active quests
    const data = this.getPlayerQuestData(player);
    if (data.active.length >= QUEST_CONSTANTS.MAX_ACTIVE_QUESTS) {
      return { canAccept: false, reason: 'You have too many active quests.' };
    }

    // Check prerequisites
    const prereqResult = this.checkPrerequisites(player, quest);
    if (!prereqResult.met) {
      return { canAccept: false, reason: prereqResult.reason };
    }

    return { canAccept: true };
  }

  /**
   * Accept a quest.
   */
  acceptQuest(player: QuestPlayer, questId: QuestId): AcceptQuestResult {
    const canAccept = this.canAcceptQuest(player, questId);
    if (!canAccept.canAccept) {
      return { success: false, message: canAccept.reason || 'Cannot accept quest.' };
    }

    const quest = this.getQuest(questId)!;
    const data = this.getPlayerQuestData(player);

    // Create objective progress
    const objectives: ObjectiveProgress[] = quest.objectives.map((obj, index) => ({
      index,
      current: 0,
      required: this.getObjectiveRequired(obj),
      complete: false,
      data: obj.type === 'explore' ? { visited: [] } : undefined,
    }));

    // Create quest state
    const questState: PlayerQuestState = {
      questId,
      status: 'active',
      objectives,
      acceptedAt: Date.now(),
      deadline: quest.timeLimit ? Date.now() + quest.timeLimit : undefined,
    };

    data.active.push(questState);
    this.savePlayerQuestData(player, data);

    // Notify player
    player.receive(`\n{bold}{yellow}=== Quest Accepted: ${quest.name} ==={/}\n`);
    player.receive(`{cyan}${quest.storyText}{/}\n\n`);
    this.showQuestObjectives(player, quest, questState);

    return { success: true, message: `Quest accepted: ${quest.name}`, quest: questState };
  }

  /**
   * Abandon a quest.
   */
  abandonQuest(player: QuestPlayer, questId: QuestId): AbandonQuestResult {
    const data = this.getPlayerQuestData(player);
    const index = data.active.findIndex((q) => q.questId === questId);

    if (index === -1) {
      return { success: false, message: 'You are not on that quest.' };
    }

    const quest = this.getQuest(questId);
    data.active.splice(index, 1);
    this.savePlayerQuestData(player, data);

    player.receive(`{yellow}You have abandoned the quest: ${quest?.name || questId}{/}\n`);

    return { success: true, message: `Quest abandoned: ${quest?.name || questId}` };
  }

  /**
   * Check if player can turn in a quest.
   */
  canTurnInQuest(player: QuestPlayer, questId: QuestId): CanTurnInQuestResult {
    const state = this.getActiveQuest(player, questId);
    if (!state) {
      return { canTurnIn: false, reason: 'You are not on that quest.' };
    }

    if (state.status !== 'completed') {
      return { canTurnIn: false, reason: 'Quest objectives are not complete.' };
    }

    return { canTurnIn: true };
  }

  /**
   * Turn in a completed quest and grant rewards.
   */
  async turnInQuest(player: QuestPlayer, questId: QuestId): Promise<TurnInQuestResult> {
    const canTurnIn = this.canTurnInQuest(player, questId);
    if (!canTurnIn.canTurnIn) {
      return { success: false, message: canTurnIn.reason || 'Cannot turn in quest.' };
    }

    const quest = this.getQuest(questId)!;
    const data = this.getPlayerQuestData(player);
    const stateIndex = data.active.findIndex((q) => q.questId === questId);

    // Remove from active
    data.active.splice(stateIndex, 1);

    // Add to completed
    data.completed[questId] = Date.now();

    // Track repeatable timestamp
    if (quest.repeatable) {
      if (!data.repeatableTimestamps) {
        data.repeatableTimestamps = {};
      }
      data.repeatableTimestamps[questId] = Date.now();
    }

    // Consume quest items if needed
    this.consumeQuestItems(player, quest);

    // Grant rewards
    await this.grantRewards(player, quest);

    this.savePlayerQuestData(player, data);

    player.receive(`\n{bold}{green}=== Quest Complete: ${quest.name} ==={/}\n`);

    // Show next quest if in chain
    if (quest.nextQuest) {
      const nextQuest = this.getQuest(quest.nextQuest);
      if (nextQuest) {
        player.receive(`{yellow}New quest available: ${nextQuest.name}{/}\n`);
      }
    }

    return {
      success: true,
      message: `Quest complete: ${quest.name}`,
      rewards: quest.rewards,
      nextQuest: quest.nextQuest,
    };
  }

  // ==================== Objective Progress ====================

  /**
   * Update kill objectives when an NPC is killed.
   */
  updateKillObjective(player: QuestPlayer, npcPath: string, npcId?: string): UpdateObjectiveResult[] {
    const results: UpdateObjectiveResult[] = [];
    const data = this.getPlayerQuestData(player);

    for (const state of data.active) {
      if (state.status !== 'active') continue;

      const quest = this.getQuest(state.questId);
      if (!quest) continue;

      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        if (obj.type !== 'kill') continue;

        // Check if this NPC matches the objective targets
        const matches = obj.targets.some(
          (target) => npcPath.includes(target) || target === npcId || npcPath === target
        );
        if (!matches) continue;

        const progress = state.objectives[i];
        if (progress.complete) continue;

        // Increment progress
        progress.current = Math.min(progress.current + 1, progress.required);
        progress.complete = progress.current >= progress.required;

        // Notify player
        player.receive(`{yellow}[${quest.name}] ${obj.targetName}: ${progress.current}/${progress.required}{/}\n`);

        const questComplete = this.checkQuestComplete(state);
        if (questComplete) {
          state.status = 'completed';
          state.completedAt = Date.now();
          player.receive(`{bold}{green}[Quest Complete] ${quest.name} - Return to turn in your quest!{/}\n`);
        }

        results.push({
          success: true,
          message: `${obj.targetName}: ${progress.current}/${progress.required}`,
          questId: state.questId,
          objectiveIndex: i,
          objectiveComplete: progress.complete,
          questComplete,
        });
      }
    }

    if (results.length > 0) {
      this.savePlayerQuestData(player, data);
    }

    return results;
  }

  /**
   * Update fetch objectives when an item is picked up.
   */
  updateFetchObjective(player: QuestPlayer, itemPath: string): UpdateObjectiveResult[] {
    const results: UpdateObjectiveResult[] = [];
    const data = this.getPlayerQuestData(player);

    for (const state of data.active) {
      if (state.status !== 'active') continue;

      const quest = this.getQuest(state.questId);
      if (!quest) continue;

      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        if (obj.type !== 'fetch') continue;

        // Check if this item matches
        const matches = obj.itemPaths.some((path) => itemPath.includes(path) || itemPath === path);
        if (!matches) continue;

        const progress = state.objectives[i];
        if (progress.complete) continue;

        // Increment progress
        progress.current = Math.min(progress.current + 1, progress.required);
        progress.complete = progress.current >= progress.required;

        // Notify player
        player.receive(`{yellow}[${quest.name}] ${obj.itemName}: ${progress.current}/${progress.required}{/}\n`);

        const questComplete = this.checkQuestComplete(state);
        if (questComplete) {
          state.status = 'completed';
          state.completedAt = Date.now();
          player.receive(`{bold}{green}[Quest Complete] ${quest.name} - Return to turn in your quest!{/}\n`);
        }

        results.push({
          success: true,
          message: `${obj.itemName}: ${progress.current}/${progress.required}`,
          questId: state.questId,
          objectiveIndex: i,
          objectiveComplete: progress.complete,
          questComplete,
        });
      }
    }

    if (results.length > 0) {
      this.savePlayerQuestData(player, data);
    }

    return results;
  }

  /**
   * Update explore objectives when player enters a room.
   */
  updateExploreObjective(player: QuestPlayer, roomPath: string): UpdateObjectiveResult[] {
    const results: UpdateObjectiveResult[] = [];
    const data = this.getPlayerQuestData(player);

    for (const state of data.active) {
      if (state.status !== 'active') continue;

      const quest = this.getQuest(state.questId);
      if (!quest) continue;

      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        if (obj.type !== 'explore') continue;

        const progress = state.objectives[i];
        if (progress.complete) continue;

        // Check if this room is in the locations list
        const matchedLocation = obj.locations.find(
          (loc) => roomPath.includes(loc) || roomPath === loc
        );
        if (!matchedLocation) continue;

        // Check if already visited
        const visited = (progress.data?.visited as string[]) || [];
        if (visited.includes(matchedLocation)) continue;

        // Add to visited
        visited.push(matchedLocation);
        if (!progress.data) progress.data = {};
        progress.data.visited = visited;

        // Update progress
        progress.current = visited.length;
        progress.complete = progress.current >= progress.required;

        // Notify player
        player.receive(`{yellow}[${quest.name}] Explored: ${progress.current}/${progress.required} locations{/}\n`);

        const questComplete = this.checkQuestComplete(state);
        if (questComplete) {
          state.status = 'completed';
          state.completedAt = Date.now();
          player.receive(`{bold}{green}[Quest Complete] ${quest.name} - Return to turn in your quest!{/}\n`);
        }

        results.push({
          success: true,
          message: `Explored: ${progress.current}/${progress.required}`,
          questId: state.questId,
          objectiveIndex: i,
          objectiveComplete: progress.complete,
          questComplete,
        });
      }
    }

    if (results.length > 0) {
      this.savePlayerQuestData(player, data);
    }

    return results;
  }

  /**
   * Update talk objectives when player talks to NPC.
   */
  updateTalkObjective(player: QuestPlayer, npcPath: string, keyword?: string): UpdateObjectiveResult[] {
    const results: UpdateObjectiveResult[] = [];
    const data = this.getPlayerQuestData(player);

    for (const state of data.active) {
      if (state.status !== 'active') continue;

      const quest = this.getQuest(state.questId);
      if (!quest) continue;

      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        if (obj.type !== 'talk') continue;

        const progress = state.objectives[i];
        if (progress.complete) continue;

        // Check if this NPC matches
        if (!npcPath.includes(obj.npcPath) && npcPath !== obj.npcPath) continue;

        // Check keyword if required
        if (obj.keyword && keyword?.toLowerCase() !== obj.keyword.toLowerCase()) continue;

        // Mark complete
        progress.current = 1;
        progress.complete = true;

        // Notify player
        player.receive(`{yellow}[${quest.name}] Spoke with ${obj.npcName}{/}\n`);

        const questComplete = this.checkQuestComplete(state);
        if (questComplete) {
          state.status = 'completed';
          state.completedAt = Date.now();
          player.receive(`{bold}{green}[Quest Complete] ${quest.name} - Return to turn in your quest!{/}\n`);
        }

        results.push({
          success: true,
          message: `Spoke with ${obj.npcName}`,
          questId: state.questId,
          objectiveIndex: i,
          objectiveComplete: true,
          questComplete,
        });
      }
    }

    if (results.length > 0) {
      this.savePlayerQuestData(player, data);
    }

    return results;
  }

  /**
   * Update deliver objectives when player delivers item to NPC.
   */
  updateDeliverObjective(player: QuestPlayer, itemPath: string, npcPath: string): UpdateObjectiveResult[] {
    const results: UpdateObjectiveResult[] = [];
    const data = this.getPlayerQuestData(player);

    for (const state of data.active) {
      if (state.status !== 'active') continue;

      const quest = this.getQuest(state.questId);
      if (!quest) continue;

      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        if (obj.type !== 'deliver') continue;

        const progress = state.objectives[i];
        if (progress.complete) continue;

        // Check if item and NPC match
        const itemMatches = itemPath.includes(obj.itemPath) || itemPath === obj.itemPath;
        const npcMatches = npcPath.includes(obj.targetNpc) || npcPath === obj.targetNpc;

        if (!itemMatches || !npcMatches) continue;

        // Mark complete
        progress.current = 1;
        progress.complete = true;

        // Notify player
        player.receive(`{yellow}[${quest.name}] Delivered ${obj.itemName} to ${obj.targetName}{/}\n`);

        const questComplete = this.checkQuestComplete(state);
        if (questComplete) {
          state.status = 'completed';
          state.completedAt = Date.now();
          player.receive(`{bold}{green}[Quest Complete] ${quest.name} - Return to turn in your quest!{/}\n`);
        }

        results.push({
          success: true,
          message: `Delivered ${obj.itemName} to ${obj.targetName}`,
          questId: state.questId,
          objectiveIndex: i,
          objectiveComplete: true,
          questComplete,
        });
      }
    }

    if (results.length > 0) {
      this.savePlayerQuestData(player, data);
    }

    return results;
  }

  /**
   * Update escort objectives when escort NPC reaches destination.
   */
  updateEscortObjective(player: QuestPlayer, npcPath: string, roomPath: string): UpdateObjectiveResult[] {
    const results: UpdateObjectiveResult[] = [];
    const data = this.getPlayerQuestData(player);

    for (const state of data.active) {
      if (state.status !== 'active') continue;

      const quest = this.getQuest(state.questId);
      if (!quest) continue;

      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        if (obj.type !== 'escort') continue;

        const progress = state.objectives[i];
        if (progress.complete) continue;

        // Check if NPC and destination match
        const npcMatches = npcPath.includes(obj.npcPath) || npcPath === obj.npcPath;
        const destMatches = roomPath.includes(obj.destination) || roomPath === obj.destination;

        if (!npcMatches || !destMatches) continue;

        // Mark complete
        progress.current = 1;
        progress.complete = true;

        // Notify player
        player.receive(`{yellow}[${quest.name}] ${obj.npcName} arrived at ${obj.destinationName}{/}\n`);

        const questComplete = this.checkQuestComplete(state);
        if (questComplete) {
          state.status = 'completed';
          state.completedAt = Date.now();
          player.receive(`{bold}{green}[Quest Complete] ${quest.name} - Return to turn in your quest!{/}\n`);
        }

        results.push({
          success: true,
          message: `${obj.npcName} arrived at ${obj.destinationName}`,
          questId: state.questId,
          objectiveIndex: i,
          objectiveComplete: true,
          questComplete,
        });
      }
    }

    if (results.length > 0) {
      this.savePlayerQuestData(player, data);
    }

    return results;
  }

  // ==================== Internal Helpers ====================

  /**
   * Get required count for an objective.
   */
  private getObjectiveRequired(obj: QuestObjective): number {
    switch (obj.type) {
      case 'kill':
        return obj.required;
      case 'fetch':
        return obj.required;
      case 'explore':
        return obj.locations.length;
      case 'deliver':
      case 'escort':
      case 'talk':
        return 1;
      case 'custom':
        return obj.required;
      default:
        return 1;
    }
  }

  /**
   * Check if all objectives are complete.
   */
  private checkQuestComplete(state: PlayerQuestState): boolean {
    return state.objectives.every((obj) => obj.complete);
  }

  /**
   * Check quest prerequisites.
   */
  private checkPrerequisites(
    player: QuestPlayer,
    quest: QuestDefinition
  ): { met: boolean; reason?: string } {
    const prereqs = quest.prerequisites;
    if (!prereqs) return { met: true };

    // Check level
    if (prereqs.level && player.level < prereqs.level) {
      return { met: false, reason: `Requires level ${prereqs.level}.` };
    }

    // Check completed quests
    if (prereqs.quests) {
      for (const reqQuestId of prereqs.quests) {
        if (!this.hasCompletedQuest(player, reqQuestId)) {
          const reqQuest = this.getQuest(reqQuestId);
          return { met: false, reason: `Requires completing "${reqQuest?.name || reqQuestId}" first.` };
        }
      }
    }

    // Check guilds (TODO: integrate with guild daemon)

    // Check items (TODO: integrate with inventory)

    // Check custom handler
    if (prereqs.customHandler) {
      const handler = this.getCustomHandler(prereqs.customHandler);
      if (handler) {
        const result = handler(player, quest);
        if (result && !result.met) {
          return { met: false, reason: result.reason || 'Prerequisites not met.' };
        }
      }
    }

    return { met: true };
  }

  /**
   * Grant quest rewards to player.
   */
  private async grantRewards(player: QuestPlayer, quest: QuestDefinition): Promise<void> {
    const rewards = quest.rewards;
    const rewardLines: string[] = [];

    // Experience
    if (rewards.experience) {
      player.gainExperience(rewards.experience);
      rewardLines.push(`  {cyan}+${rewards.experience} XP{/}`);
    }

    // Quest points
    if (rewards.questPoints) {
      const data = this.getPlayerQuestData(player);
      data.questPoints += rewards.questPoints;
      this.savePlayerQuestData(player, data);
      rewardLines.push(`  {magenta}+${rewards.questPoints} Quest Points{/}`);
    }

    // Gold
    if (rewards.gold) {
      player.addGold(rewards.gold);
      rewardLines.push(`  {yellow}+${rewards.gold} gold{/}`);
    }

    // Items
    if (rewards.items && rewards.items.length > 0 && typeof efuns !== 'undefined' && efuns.cloneObject) {
      for (const itemPath of rewards.items) {
        try {
          const item = await efuns.cloneObject(itemPath);
          if (item && 'moveTo' in item) {
            (item as { moveTo: (target: unknown) => void }).moveTo(player);
            const itemName = (item as { shortDesc?: string }).shortDesc || 'an item';
            rewardLines.push(`  {green}Received: ${itemName}{/}`);
          }
        } catch (e) {
          console.error(`[QuestDaemon] Failed to grant item ${itemPath}:`, e);
        }
      }
    }

    // Guild XP (TODO: integrate with guild daemon)

    // Custom handler
    if (rewards.customHandler) {
      const handler = this.getCustomHandler(rewards.customHandler);
      if (handler) {
        handler(player, quest);
      }
    }

    // Display rewards
    if (rewardLines.length > 0) {
      player.receive(`{bold}Rewards:{/}\n`);
      player.receive(rewardLines.join('\n') + '\n');
    }
  }

  /**
   * Consume quest items on turn-in.
   */
  private consumeQuestItems(player: QuestPlayer, quest: QuestDefinition): void {
    for (const obj of quest.objectives) {
      if (obj.type === 'fetch' && obj.consumeOnComplete) {
        // TODO: Find and remove items from player inventory
        // This requires integration with inventory system
      }
    }
  }

  /**
   * Show quest objectives to player.
   */
  private showQuestObjectives(
    player: QuestPlayer,
    quest: QuestDefinition,
    state: PlayerQuestState
  ): void {
    player.receive(`{bold}Objectives:{/}\n`);
    for (let i = 0; i < quest.objectives.length; i++) {
      const obj = quest.objectives[i];
      const progress = state.objectives[i];
      const status = progress.complete ? '{green}[COMPLETE]{/}' : `${progress.current}/${progress.required}`;

      player.receive(`  ${this.getObjectiveDescription(obj)} - ${status}\n`);
    }
    player.receive('\n');
  }

  /**
   * Get human-readable objective description.
   */
  private getObjectiveDescription(obj: QuestObjective): string {
    switch (obj.type) {
      case 'kill':
        return `Kill ${obj.targetName}`;
      case 'fetch':
        return `Collect ${obj.itemName}`;
      case 'deliver':
        return `Deliver ${obj.itemName} to ${obj.targetName}`;
      case 'escort':
        return `Escort ${obj.npcName} to ${obj.destinationName}`;
      case 'explore':
        return `Explore ${obj.locationName}`;
      case 'talk':
        return `Talk to ${obj.npcName}`;
      case 'custom':
        return obj.description;
      default:
        return 'Complete objective';
    }
  }

  // ==================== Quest Display Helpers ====================

  /**
   * Get formatted quest log entry for a single quest.
   */
  getQuestLogEntry(player: QuestPlayer, questId: QuestId): string {
    const state = this.getActiveQuest(player, questId);
    if (!state) return '';

    const quest = this.getQuest(questId);
    if (!quest) return '';

    const lines: string[] = [];
    const statusColor = state.status === 'completed' ? 'green' : 'yellow';
    const statusText = state.status === 'completed' ? '(Ready to Turn In!)' : '(In Progress)';

    lines.push(`{bold}{${statusColor}}${quest.name}{/} ${statusText}`);
    lines.push(`  {dim}${quest.description}{/}`);

    for (let i = 0; i < quest.objectives.length; i++) {
      const obj = quest.objectives[i];
      const progress = state.objectives[i];
      const progressColor = progress.complete ? 'green' : 'white';
      const checkmark = progress.complete ? '[X]' : '[ ]';

      lines.push(`  ${checkmark} {${progressColor}}${this.getObjectiveDescription(obj)}: ${progress.current}/${progress.required}{/}`);
    }

    return lines.join('\n');
  }

  /**
   * Get formatted full quest log.
   */
  getFullQuestLog(player: QuestPlayer): string {
    const data = this.getPlayerQuestData(player);

    if (data.active.length === 0) {
      return '{dim}You have no active quests.{/}';
    }

    const lines: string[] = [];
    lines.push('{bold}{cyan}=== Quest Log ==={/}\n');

    // Completed quests first
    const completed = data.active.filter((q) => q.status === 'completed');
    const inProgress = data.active.filter((q) => q.status === 'active');

    if (completed.length > 0) {
      for (const state of completed) {
        lines.push(this.getQuestLogEntry(player, state.questId));
        lines.push('');
      }
    }

    if (inProgress.length > 0) {
      for (const state of inProgress) {
        lines.push(this.getQuestLogEntry(player, state.questId));
        lines.push('');
      }
    }

    lines.push(`{dim}${data.active.length} active quest${data.active.length !== 1 ? 's' : ''} | ${data.questPoints} quest points{/}`);

    return lines.join('\n');
  }
}

// ==================== Singleton ====================

let questDaemon: QuestDaemon | null = null;

/**
 * Get the quest daemon singleton.
 */
export function getQuestDaemon(): QuestDaemon {
  if (!questDaemon) {
    questDaemon = new QuestDaemon();
    // Load synchronously to ensure quests are available immediately
    questDaemon.loadSync();
  }
  return questDaemon;
}

/**
 * Reset the quest daemon (for testing).
 */
export function resetQuestDaemon(): void {
  questDaemon = null;
}

/**
 * Get the quest daemon instance if it exists (for use by other modules).
 * Returns null if daemon hasn't been initialized yet.
 */
export function getQuestDaemonInstance(): QuestDaemon | null {
  return questDaemon;
}

export default QuestDaemon;
