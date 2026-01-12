/**
 * Quest System Types
 *
 * Core interfaces and types for the quest system.
 */

import type { Living } from '../living.js';

/**
 * Quest identifier - globally unique quest ID.
 * Format: "area:quest_name" (e.g., "aldric:rat_problem")
 */
export type QuestId = string;

/**
 * Quest objective types.
 */
export type ObjectiveType = 'kill' | 'fetch' | 'deliver' | 'escort' | 'explore' | 'talk' | 'custom';

/**
 * Quest status in player's quest log.
 */
export type QuestStatus = 'available' | 'active' | 'completed' | 'turned_in' | 'failed';

// ==================== Objective Configurations ====================

/**
 * Kill objective - defeat X creatures of a type.
 */
export interface KillObjective {
  type: 'kill';
  /** NPC blueprint paths or NPC IDs to track */
  targets: string[];
  /** Display name for the target (e.g., "Giant Rat") */
  targetName: string;
  /** Number required to kill */
  required: number;
}

/**
 * Fetch objective - collect X items.
 */
export interface FetchObjective {
  type: 'fetch';
  /** Item blueprint paths to collect */
  itemPaths: string[];
  /** Display name for the item */
  itemName: string;
  /** Number required */
  required: number;
  /** If true, items are removed on turn-in */
  consumeOnComplete: boolean;
}

/**
 * Deliver objective - take item to NPC.
 */
export interface DeliverObjective {
  type: 'deliver';
  /** Item to deliver (path or id) */
  itemPath: string;
  /** Item display name */
  itemName: string;
  /** Target NPC path or id */
  targetNpc: string;
  /** Target NPC display name */
  targetName: string;
}

/**
 * Escort objective - escort NPC to destination.
 */
export interface EscortObjective {
  type: 'escort';
  /** NPC to escort (will be spawned) */
  npcPath: string;
  /** NPC display name */
  npcName: string;
  /** Destination room path */
  destination: string;
  /** Destination display name */
  destinationName: string;
  /** If true, NPC follows player; if false, player guides NPC */
  npcFollows: boolean;
}

/**
 * Explore objective - visit location(s).
 */
export interface ExploreObjective {
  type: 'explore';
  /** Room paths to visit */
  locations: string[];
  /** Display name for location(s) */
  locationName: string;
}

/**
 * Talk objective - speak with NPC.
 */
export interface TalkObjective {
  type: 'talk';
  /** NPC to talk to */
  npcPath: string;
  /** NPC display name */
  npcName: string;
  /** Optional keyword to say */
  keyword?: string;
}

/**
 * Custom objective - handled by custom function.
 */
export interface CustomObjective {
  type: 'custom';
  /** Description shown to player */
  description: string;
  /** Custom handler function name (registered with daemon) */
  handler: string;
  /** Required count (for progress display) */
  required: number;
}

/**
 * Union type for all objectives.
 */
export type QuestObjective =
  | KillObjective
  | FetchObjective
  | DeliverObjective
  | EscortObjective
  | ExploreObjective
  | TalkObjective
  | CustomObjective;

// ==================== Rewards & Prerequisites ====================

/**
 * Quest reward configuration.
 */
export interface QuestRewards {
  /** Experience points */
  experience?: number;
  /** Quest points (special currency) */
  questPoints?: number;
  /** Gold amount */
  gold?: number;
  /** Item paths to create and give */
  items?: string[];
  /** Guild XP rewards { guildId: amount } */
  guildXP?: Record<string, number>;
  /** Custom reward handler name */
  customHandler?: string;
}

/**
 * Quest prerequisites.
 */
export interface QuestPrerequisites {
  /** Minimum player level */
  level?: number;
  /** Quest IDs that must be completed first */
  quests?: QuestId[];
  /** Guild memberships required { guildId: minLevel } */
  guilds?: Record<string, number>;
  /** Items player must have */
  items?: string[];
  /** Custom check handler name */
  customHandler?: string;
}

// ==================== Quest Definition ====================

/**
 * Quest definition (static data).
 */
export interface QuestDefinition {
  /** Unique quest ID (format: "area:quest_name") */
  id: QuestId;
  /** Display name */
  name: string;
  /** Brief description for quest log */
  description: string;
  /** Full story/lore text shown when accepting */
  storyText: string;
  /** Objectives (can have multiple) */
  objectives: QuestObjective[];
  /** Rewards on completion */
  rewards: QuestRewards;
  /** Prerequisites to accept */
  prerequisites?: QuestPrerequisites;
  /** Quest giver NPC path */
  giverNpc: string;
  /** Turn-in NPC path (defaults to giverNpc) */
  turnInNpc?: string;
  /** Area/zone this quest belongs to */
  area: string;
  /** Is this quest repeatable? */
  repeatable?: boolean;
  /** Cooldown in ms before repeatable (if repeatable) */
  repeatCooldown?: number;
  /** Part of a chain? Next quest ID */
  nextQuest?: QuestId;
  /** Part of a chain? Previous quest ID */
  previousQuest?: QuestId;
  /** Time limit in ms (0 = no limit) */
  timeLimit?: number;
  /** Recommended level for scaling/display */
  recommendedLevel?: number;
  /** If true, quest is hidden from NPC quest lists */
  hidden?: boolean;
}

// ==================== Player Quest State ====================

/**
 * Single objective progress tracking.
 */
export interface ObjectiveProgress {
  /** Objective index in quest definition */
  index: number;
  /** Current count/progress */
  current: number;
  /** Required amount (copied from definition) */
  required: number;
  /** Is this objective complete? */
  complete: boolean;
  /** Additional tracking data (e.g., visited locations for explore) */
  data?: Record<string, unknown>;
}

/**
 * Player's active quest state.
 */
export interface PlayerQuestState {
  /** Quest ID */
  questId: QuestId;
  /** Current status */
  status: QuestStatus;
  /** Progress on each objective */
  objectives: ObjectiveProgress[];
  /** When quest was accepted (timestamp) */
  acceptedAt: number;
  /** When quest was completed (timestamp) */
  completedAt?: number;
  /** Deadline if time-limited */
  deadline?: number;
}

/**
 * Complete quest data stored on player.
 */
export interface PlayerQuestData {
  /** Currently active quests */
  active: PlayerQuestState[];
  /** Completed quest IDs with completion timestamps */
  completed: Record<QuestId, number>;
  /** Quest points earned */
  questPoints: number;
  /** Failed quest IDs (for non-repeatable quests) */
  failed?: QuestId[];
  /** Last completion time for repeatable quests */
  repeatableTimestamps?: Record<QuestId, number>;
}

/**
 * Default player quest data.
 */
export const DEFAULT_PLAYER_QUEST_DATA: PlayerQuestData = {
  active: [],
  completed: {},
  questPoints: 0,
};

// ==================== Result Types ====================

/**
 * Result of accepting a quest.
 */
export interface AcceptQuestResult {
  success: boolean;
  message: string;
  quest?: PlayerQuestState;
}

/**
 * Result of abandoning a quest.
 */
export interface AbandonQuestResult {
  success: boolean;
  message: string;
}

/**
 * Result of turning in a quest.
 */
export interface TurnInQuestResult {
  success: boolean;
  message: string;
  rewards?: QuestRewards;
  nextQuest?: QuestId;
}

/**
 * Result of updating an objective.
 */
export interface UpdateObjectiveResult {
  success: boolean;
  message: string;
  questId: QuestId;
  objectiveIndex: number;
  objectiveComplete?: boolean;
  questComplete?: boolean;
}

/**
 * Result of checking quest eligibility.
 */
export interface CanAcceptQuestResult {
  canAccept: boolean;
  reason?: string;
}

/**
 * Result of checking turn-in eligibility.
 */
export interface CanTurnInQuestResult {
  canTurnIn: boolean;
  reason?: string;
}

// ==================== Constants ====================

/**
 * Quest system constants.
 */
export const QUEST_CONSTANTS = {
  /** Maximum active quests per player */
  MAX_ACTIVE_QUESTS: 25,
  /** Maximum completed quests to track in history */
  MAX_COMPLETED_HISTORY: 200,
  /** Property key for player quest data */
  PLAYER_DATA_KEY: 'questData',
} as const;

// ==================== Quest Player Interface ====================

/**
 * Interface for players interacting with the quest system.
 */
export interface QuestPlayer extends Living {
  name: string;
  level: number;
  receive(message: string): void;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
  gainExperience(amount: number): void;
  addGold(amount: number): void;
}
