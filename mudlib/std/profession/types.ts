/**
 * Profession System Types
 *
 * Core interfaces and types for the use-based profession system
 * including crafting, gathering, and movement skills.
 */

import type { StatName } from '../living.js';

/**
 * All profession identifiers.
 */
export type ProfessionId =
  // Crafting professions
  | 'alchemy'
  | 'blacksmithing'
  | 'woodworking'
  | 'leatherworking'
  | 'cooking'
  | 'jeweling'
  // Gathering professions
  | 'mining'
  | 'herbalism'
  | 'logging'
  | 'fishing'
  | 'skinning'
  // Movement skills
  | 'swimming'
  | 'climbing'
  | 'flying';

/**
 * Profession category types.
 */
export type ProfessionCategory = 'crafting' | 'gathering' | 'movement';

/**
 * Material quality tiers (matches loot system).
 */
export type MaterialQuality = 'poor' | 'common' | 'fine' | 'superior' | 'exceptional' | 'legendary';

/**
 * Material types for crafting inputs.
 */
export type MaterialType = 'ore' | 'ingot' | 'gem' | 'wood' | 'plank' | 'herb' | 'leather' | 'fish' | 'reagent' | 'cloth' | 'food';

/**
 * Node types for gathering.
 */
export type NodeType = 'ore_vein' | 'herb_patch' | 'fishing_spot' | 'tree' | 'corpse';

/**
 * Terrain types for movement skills.
 */
export type TerrainType = 'water_shallow' | 'water_deep' | 'water_ocean' | 'climb_easy' | 'climb_moderate' | 'climb_hard' | 'climb_sheer' | 'air_low' | 'air_high';

/**
 * Tool types required for gathering.
 */
export type ToolType = 'pickaxe' | 'herbalism_kit' | 'fishing_rod' | 'logging_axe' | 'skinning_knife';

/**
 * Station types required for crafting.
 */
export type StationType = 'forge' | 'alchemy_table' | 'workbench' | 'tanning_rack' | 'cooking_fire' | 'jeweler_bench';

/**
 * Result types for crafted items.
 */
export type CraftResultType = 'weapon' | 'armor' | 'consumable' | 'material' | 'tool' | 'container' | 'accessory';

/**
 * Player's skill in a single profession.
 */
export interface ProfessionSkill {
  /** Profession ID */
  professionId: ProfessionId;
  /** Current skill level (1-100) */
  level: number;
  /** Experience toward next level */
  experience: number;
  /** Total uses (lifetime statistic) */
  totalUses: number;
}

/**
 * Complete profession data stored on a player.
 */
export interface PlayerProfessionData {
  /** All profession skills */
  skills: ProfessionSkill[];
  /** Unlocked recipe IDs */
  unlockedRecipes: string[];
  /** Discovered resource node IDs */
  discoveredNodes: string[];
}

/**
 * Definition of a profession.
 */
export interface ProfessionDefinition {
  /** Unique profession ID */
  id: ProfessionId;
  /** Display name */
  name: string;
  /** Full description */
  description: string;
  /** Category (crafting/gathering/movement) */
  category: ProfessionCategory;
  /** Primary stat affecting success/quality */
  primaryStat: StatName;
  /** Base XP gained per use */
  baseXPPerUse: number;
  /** Tool required (for gathering professions) */
  toolRequired?: ToolType;
  /** Station required (for crafting professions) */
  stationRequired?: StationType;
}

/**
 * Definition of a crafting material.
 */
export interface MaterialDefinition {
  /** Unique material ID (e.g., 'iron_ore') */
  id: string;
  /** Display name */
  name: string;
  /** Material type */
  type: MaterialType;
  /** Quality tier */
  quality: MaterialQuality;
  /** Tier level (1-10) for recipe compatibility */
  tier: number;
  /** Profession required to gather this material */
  gatherProfession?: ProfessionId;
  /** Minimum skill level to gather */
  gatherLevelRequired?: number;
  /** Whether material can stack in inventory */
  stackable: boolean;
  /** Maximum stack size */
  maxStack: number;
  /** Weight per unit */
  weight: number;
  /** Base gold value */
  value: number;
  /** Short description for display */
  shortDesc: string;
  /** Long description when examined */
  longDesc: string;
}

/**
 * Ingredient requirement for a recipe.
 */
export interface RecipeIngredient {
  /** Material ID */
  materialId: string;
  /** Quantity required */
  quantity: number;
  /** Minimum quality (optional) */
  qualityMinimum?: MaterialQuality;
}

/**
 * Definition of a crafting recipe.
 */
export interface RecipeDefinition {
  /** Unique recipe ID */
  id: string;
  /** Display name */
  name: string;
  /** Profession required */
  profession: ProfessionId;
  /** Minimum skill level to craft */
  levelRequired: number;
  /** Required ingredients */
  ingredients: RecipeIngredient[];
  /** Tool required (e.g., blacksmith hammer) */
  toolRequired?: string;
  /** Station required (e.g., forge) */
  stationRequired?: StationType;
  /** Time to craft in seconds */
  craftTime: number;
  /** Type of result item */
  resultType: CraftResultType;
  /** Configuration for the created item */
  resultConfig: Record<string, unknown>;
  /** Number of items produced */
  resultQuantity: number;
  /** Whether output quality is affected by skill */
  qualityAffected: boolean;
  /** XP reward for crafting */
  xpReward: number;
  /** Description shown in recipe list */
  description: string;
  /** Whether recipe must be discovered/learned first */
  requiresLearning: boolean;
}

/**
 * Material drop configuration for resource nodes.
 */
export interface NodeMaterialDrop {
  /** Material ID */
  materialId: string;
  /** Relative probability weight */
  weight: number;
  /** Minimum quantity per gather */
  minQuantity: number;
  /** Maximum quantity per gather */
  maxQuantity: number;
}

/**
 * Bonus material drop (rare finds).
 */
export interface NodeBonusDrop {
  /** Material ID */
  materialId: string;
  /** Percent chance (0-100) */
  chance: number;
  /** Minimum skill level for this bonus */
  levelRequired: number;
}

/**
 * Definition of a gatherable resource node.
 */
export interface ResourceNodeDefinition {
  /** Unique node definition ID */
  id: string;
  /** Display name */
  name: string;
  /** Node type */
  nodeType: NodeType;
  /** Profession required to gather */
  gatherProfession: ProfessionId;
  /** Minimum skill level to gather */
  levelRequired: number;
  /** Materials that can be gathered */
  materials: NodeMaterialDrop[];
  /** Rare bonus materials */
  bonusMaterials?: NodeBonusDrop[];
  /** Capacity (gathers before depleted) */
  capacity: number;
  /** Respawn time per capacity point in seconds */
  respawnTime: number;
  /** Tool required to gather */
  toolRequired?: ToolType;
  /** Whether node is hidden (requires skill to discover) */
  hidden: boolean;
  /** Short description */
  shortDesc: string;
  /** Long description when examined */
  longDesc: string;
  /** Skill level needed to see hidden node */
  discoverLevel?: number;
}

/**
 * Tool definition with durability.
 */
export interface ToolDefinition {
  /** Unique tool ID */
  id: string;
  /** Display name */
  name: string;
  /** Tool type */
  toolType: ToolType;
  /** Tier (1-4) affecting bonus */
  tier: number;
  /** Gathering bonus percentage */
  gatherBonus: number;
  /** Maximum durability */
  maxDurability: number;
  /** Weight */
  weight: number;
  /** Base gold value */
  value: number;
  /** Short description */
  shortDesc: string;
  /** Long description */
  longDesc: string;
}

/**
 * Crafting station definition.
 */
export interface StationDefinition {
  /** Unique station ID */
  id: string;
  /** Display name */
  name: string;
  /** Station type */
  stationType: StationType;
  /** Tier (1-4) affecting quality bonus */
  tier: number;
  /** Quality bonus percentage */
  qualityBonus: number;
  /** Short description */
  shortDesc: string;
  /** Long description */
  longDesc: string;
}

/**
 * Movement skill terrain requirement.
 */
export interface TerrainRequirement {
  /** Terrain type */
  terrain: TerrainType;
  /** Minimum skill level required */
  levelRequired: number;
  /** Stamina/mana cost per room */
  costPerRoom: number;
  /** Failure message if skill too low */
  failMessage: string;
  /** Damage on failure (for climbing/drowning) */
  failDamage?: number;
}

/**
 * Skill-gated exit configuration.
 */
export interface SkillGatedExit {
  /** Profession required */
  profession: ProfessionId;
  /** Minimum skill level */
  level: number;
  /** Message shown when skill is too low */
  failMessage: string;
  /** Stamina/mana cost to use this exit */
  cost?: number;
  /** Damage on failure (e.g., falling) */
  failDamage?: number;
}

// ========== Result Types ==========

/**
 * Result of attempting to gather.
 */
export interface GatherResult {
  success: boolean;
  message: string;
  /** Materials gathered */
  materials?: Array<{ materialId: string; quantity: number; quality: MaterialQuality }>;
  /** Bonus material found */
  bonusMaterial?: { materialId: string; quantity: number };
  /** XP gained */
  xpGained?: number;
  /** Tool durability lost */
  durabilityLost?: number;
  /** Whether this was a critical gather */
  critical?: boolean;
}

/**
 * Result of attempting to craft.
 */
export interface CraftResult {
  success: boolean;
  message: string;
  /** Created item path (for cloning) */
  itemPath?: string;
  /** Created item config */
  itemConfig?: Record<string, unknown>;
  /** Resulting quality tier */
  quality?: MaterialQuality;
  /** XP gained */
  xpGained?: number;
  /** Whether this was first time crafting this recipe */
  firstCraft?: boolean;
}

/**
 * Result of attempting skill-gated movement.
 */
export interface MovementResult {
  success: boolean;
  message: string;
  /** XP gained if successful */
  xpGained?: number;
  /** Resource cost (stamina/mana) */
  resourceCost?: number;
  /** Damage taken on failure */
  damageTaken?: number;
}

/**
 * Result of leveling up a profession.
 */
export interface LevelUpResult {
  success: boolean;
  oldLevel: number;
  newLevel: number;
  profession: ProfessionId;
  /** New recipes unlocked at this level */
  unlockedRecipes?: string[];
  /** New terrain accessible at this level (movement skills) */
  unlockedTerrain?: TerrainType[];
}

// ========== Constants ==========

/**
 * Profession system constants.
 */
export const PROFESSION_CONSTANTS = {
  /** Maximum profession skill level */
  MAX_SKILL_LEVEL: 100,
  /** Default starting level for all professions */
  PROFESSION_STARTING_LEVEL: 1,
  /** Default starting level for movement skills */
  MOVEMENT_STARTING_LEVEL: 1,
  /** XP bonus for challenging content (node/recipe above skill level) */
  CHALLENGE_XP_BONUS: 0.5,
  /** XP penalty for trivial content (10+ levels below skill) */
  TRIVIAL_XP_PENALTY: 0.67,
  /** XP bonus for first craft of a recipe */
  FIRST_CRAFT_XP_BONUS: 0.5,
  /** XP bonus for critical gathers */
  CRITICAL_GATHER_XP_BONUS: 0.5,
  /** XP bonus for discovering hidden nodes (one-time) */
  DISCOVERY_XP_BONUS: 2.0,
  /** Levels below skill for content to be trivial */
  TRIVIAL_LEVEL_THRESHOLD: 10,
  /** Base success rate for gathering */
  BASE_GATHER_SUCCESS_RATE: 0.5,
  /** Success rate bonus per skill level over requirement */
  GATHER_SUCCESS_PER_LEVEL: 0.02,
  /** Tool tier bonuses */
  TOOL_TIER_BONUS: [0, 0.1, 0.2, 0.3],
  /** Station tier bonuses */
  STATION_TIER_BONUS: [0, 0.1, 0.2, 0.3],
} as const;

/**
 * Quality numeric values for calculations.
 */
export const QUALITY_VALUES: Record<MaterialQuality, number> = {
  poor: 1,
  common: 2,
  fine: 3,
  superior: 4,
  exceptional: 5,
  legendary: 6,
};

/**
 * Quality tier names for display.
 */
export const QUALITY_NAMES: Record<MaterialQuality, string> = {
  poor: 'Poor',
  common: 'Common',
  fine: 'Fine',
  superior: 'Superior',
  exceptional: 'Exceptional',
  legendary: 'Legendary',
};

/**
 * Quality colors for display.
 */
export const QUALITY_COLORS: Record<MaterialQuality, string> = {
  poor: 'dim',
  common: 'white',
  fine: 'green',
  superior: 'blue',
  exceptional: 'MAGENTA',
  legendary: 'YELLOW',
};

/**
 * Calculate XP required for next level.
 * Formula: level * 100 + level^2 * 10
 */
export function getXPRequired(level: number): number {
  return level * 100 + Math.pow(level, 2) * 10;
}

/**
 * Calculate cumulative XP for a given level.
 */
export function getTotalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXPRequired(i);
  }
  return total;
}

/**
 * Default player profession data for new players.
 */
export const DEFAULT_PLAYER_PROFESSION_DATA: PlayerProfessionData = {
  skills: [],
  unlockedRecipes: [],
  discoveredNodes: [],
};

// Re-export for convenience
export type { StatName };
