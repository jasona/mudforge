/**
 * Area Builder Types - Type definitions for the area building system.
 *
 * These types define the structure for draft areas, rooms, NPCs, and items
 * that are managed by the AreaDaemon before being published as .ts files.
 */

import type { TerrainType } from './terrain.js';
import type { NPCAIContext } from './ai-types.js';

/**
 * NPC type for auto-balance multipliers.
 */
export type NPCType = 'normal' | 'elite' | 'boss' | 'miniboss';

/**
 * Area lifecycle status.
 */
export type AreaStatus = 'draft' | 'review' | 'published';

/**
 * Layout style for AI-generated areas.
 */
export type LayoutStyle = 'linear' | 'hub' | 'maze' | 'open';

/**
 * Mood/atmosphere for area theming.
 */
export type AreaMood =
  | 'peaceful'
  | 'mysterious'
  | 'dangerous'
  | 'cheerful'
  | 'dark'
  | 'sacred'
  | 'abandoned'
  | 'bustling';

/**
 * A block of custom code preserved from an imported area.
 * These blocks are re-injected when the area is published.
 */
export interface CustomCodeBlock {
  /** Type of code block */
  type: 'import' | 'property' | 'constructor-tail' | 'method';

  /** Name identifier (method name, property name, import module) */
  name?: string;

  /** The actual code content */
  code: string;

  /** Position hint for ordering (lower = earlier) */
  position?: number;
}

/**
 * A room within a draft area.
 */
export interface DraftRoom {
  /** Unique ID within the area (e.g., "entrance", "room_001") */
  id: string;

  /** Short description (3-8 words) */
  shortDesc: string;

  /** Long description (2-4 sentences) */
  longDesc: string;

  /** Terrain type affecting movement and display */
  terrain: TerrainType;

  /** Grid coordinates */
  x: number;
  y: number;
  z: number;

  /** Exits mapping direction to target room ID within this area */
  exits: Record<string, string>;

  /** NPC IDs (from this area's npcs array) or external paths */
  npcs: string[];

  /** Item IDs (from this area's items array) or external paths */
  items: string[];

  /** Map icon override for POI markers */
  mapIcon?: string;

  /** Whether this is the area entrance */
  isEntrance?: boolean;

  /** External exit (connects to another area) */
  externalExits?: Record<string, string>;

  /** Custom room actions */
  actions?: Array<{
    verb: string;
    description: string;
    response: string;
  }>;

  /** Spawn chance for random NPCs (0-100) */
  npcSpawnChance?: number;

  /** Unix timestamp of last modification (for incremental publishing) */
  updatedAt?: number;

  /** Custom code that couldn't be parsed into standard fields (for imported areas) */
  customCode?: string;

  /** Preserved custom code blocks that will be re-injected on publish */
  customCodeBlocks?: CustomCodeBlock[];
}

/**
 * Chat message for NPCs.
 */
export interface NPCChat {
  /** The message content */
  message: string;

  /** How to deliver: say, emote, or yell */
  type: 'say' | 'emote' | 'yell';

  /** Percentage chance to trigger (default 100) */
  chance?: number;
}

/**
 * Response trigger for NPCs.
 */
export interface NPCResponse {
  /** Regex pattern to match player input */
  pattern: string;

  /** Response message (can include {speaker} placeholder) */
  response: string;

  /** How to deliver */
  type: 'say' | 'emote';
}

/**
 * NPC subclass type for specialized NPCs.
 */
export type NPCSubclass = 'npc' | 'merchant' | 'trainer' | 'petMerchant';

/**
 * Merchant shop stock item.
 */
export interface MerchantStockItem {
  /** Path to item blueprint (relative to area or absolute) */
  itemPath: string;
  /** Display name in shop */
  name: string;
  /** Price in gold */
  price: number;
  /** Stock quantity (-1 for unlimited) */
  quantity: number;
  /** Item category for filtering */
  category?: string;
}

/**
 * Merchant configuration for shop NPCs.
 */
export interface MerchantConfig {
  /** Shop display name */
  shopName: string;
  /** Shop description/flavor text */
  shopDescription?: string;
  /** Rate merchant pays when buying from players (0-1, e.g., 0.5 = 50%) */
  buyRate: number;
  /** Sell price multiplier (1.0 = normal price) */
  sellRate: number;
  /** Item types merchant will buy (empty = all) */
  acceptedTypes?: string[];
  /** Gold available for buying from players */
  shopGold: number;
  /** Price modifier per charisma point (default 0.01 = 1%) */
  charismaEffect?: number;
  /** Enable automatic restocking over time */
  restockEnabled?: boolean;
}

/**
 * Stat names for trainer configuration.
 */
export type StatName = 'strength' | 'intelligence' | 'wisdom' | 'charisma' | 'dexterity' | 'constitution' | 'luck';

/**
 * Trainer configuration for training NPCs.
 */
export interface TrainerConfig {
  /** Whether trainer can level up players (default: true) */
  canTrainLevel?: boolean;
  /** Which stats can be trained (default: all) */
  trainableStats?: StatName[];
  /** XP cost multiplier (default: 1.0) */
  costMultiplier?: number;
  /** Custom greeting message */
  greeting?: string;
}

/**
 * Base stats configuration for NPCs.
 */
export interface BaseStats {
  strength?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  dexterity?: number;
  constitution?: number;
  luck?: number;
}

/**
 * Pet stock entry for pet merchants.
 */
export interface PetStockEntry {
  /** Pet type identifier (e.g., 'horse', 'dog') */
  type: string;
  /** Price override (uses template cost if not set) */
  priceOverride?: number;
  /** Custom description for this shop */
  description?: string;
}

/**
 * Pet merchant configuration.
 */
export interface PetMerchantConfig {
  /** Shop display name */
  shopName: string;
  /** Shop description/flavor text */
  shopDescription?: string;
}

/**
 * Combat configuration for NPCs.
 */
export interface NPCCombatConfig {
  /** Base XP reward */
  baseXP: number;

  /** Fixed gold drop amount */
  gold?: number;

  /** Random gold drop range */
  goldDrop?: {
    min: number;
    max: number;
  };

  /** Loot table with drop chances */
  lootTable?: Array<{
    /** Item ID or external path */
    itemId: string;
    /** Drop chance (0-100) */
    chance: number;
  }>;

  /** Attack damage range */
  damage?: {
    min: number;
    max: number;
  };

  /** Armor/defense rating */
  armor?: number;
}

/**
 * An NPC within a draft area.
 */
export interface DraftNPC {
  /** Unique ID within the area */
  id: string;

  /** NPC's display name */
  name: string;

  /** Short description */
  shortDesc: string;

  /** Long description */
  longDesc: string;

  /** Gender for pronouns */
  gender?: 'male' | 'female' | 'neutral';

  /** NPC level affecting stats */
  level: number;

  /** NPC type for auto-balance multipliers (default: 'normal') */
  npcType?: NPCType;

  /** Maximum health (auto-calculated if not set and level is provided) */
  maxHealth: number;

  /** Starting health (defaults to maxHealth) */
  health?: number;

  /** Keyword identifiers for targeting */
  keywords?: string[];

  /** Chance per heartbeat to speak (0-100) */
  chatChance?: number;

  /** Chat messages */
  chats?: NPCChat[];

  /** Response triggers */
  responses?: NPCResponse[];

  /** Combat configuration */
  combatConfig?: NPCCombatConfig;

  /** AI dialogue context */
  aiContext?: NPCAIContext;

  /** Enable AI-powered responses */
  aiEnabled?: boolean;

  /** Quest IDs this NPC offers */
  questsOffered?: string[];

  /** Quest IDs this NPC accepts turn-in for */
  questsTurnedIn?: string[];

  /** Whether NPC wanders between rooms */
  wandering?: boolean;

  /** Respawn time in seconds (0 = no respawn) */
  respawnTime?: number;

  /** Item IDs that spawn on this NPC */
  items?: string[];

  /** Unix timestamp of last modification (for incremental publishing) */
  updatedAt?: number;

  /** Custom code that couldn't be parsed into standard fields (for imported areas) */
  customCode?: string;

  /** Preserved custom code blocks that will be re-injected on publish */
  customCodeBlocks?: CustomCodeBlock[];

  // === Specialized NPC Type Configuration ===

  /** NPC subclass (npc, merchant, trainer, petMerchant) */
  subclass?: NPCSubclass;

  /** Merchant configuration (when subclass is 'merchant') */
  merchantConfig?: MerchantConfig;

  /** Merchant stock items (when subclass is 'merchant') */
  merchantStock?: MerchantStockItem[];

  /** Trainer configuration (when subclass is 'trainer') */
  trainerConfig?: TrainerConfig;

  /** Base stats for NPC (used by trainers and others) */
  baseStats?: BaseStats;

  /** Pet merchant configuration (when subclass is 'petMerchant') */
  petMerchantConfig?: PetMerchantConfig;

  /** Pet stock entries (when subclass is 'petMerchant') */
  petStock?: PetStockEntry[];
}

/**
 * Item type categories.
 */
export type ItemType =
  | 'weapon'
  | 'armor'
  | 'consumable'
  | 'container'
  | 'key'
  | 'quest'
  | 'misc';

/**
 * Weapon-specific properties for DraftItem.
 */
export interface WeaponProperties {
  /** Item level for auto-balance (1-50) */
  itemLevel?: number;
  /** Minimum damage (overrides itemLevel calculation) */
  minDamage?: number;
  /** Maximum damage (overrides itemLevel calculation) */
  maxDamage?: number;
  /** Damage type: slashing, piercing, bludgeoning, fire, ice, lightning, poison, holy, dark */
  damageType?: string;
  /** Handedness: one_handed, two_handed, light */
  handedness?: string;
  /** Attack speed modifier (-0.5 to +0.5) */
  attackSpeed?: number;
  /** Accuracy bonus (overrides itemLevel calculation) */
  toHit?: number;
}

/**
 * Armor-specific properties for DraftItem.
 */
export interface ArmorProperties {
  /** Item level for auto-balance (1-50) */
  itemLevel?: number;
  /** Armor value (overrides itemLevel calculation) */
  armor?: number;
  /** Armor slot: head, chest, hands, legs, feet, cloak, shield */
  slot?: string;
  /** Armor size: tiny, small, medium, large, huge (affects dodge bonus) */
  size?: string;
  /** Dodge bonus/penalty (overrides itemLevel calculation) */
  toDodge?: number;
  /** Block bonus for shields (overrides itemLevel calculation) */
  toBlock?: number;
}

/**
 * An item within a draft area.
 */
export interface DraftItem {
  /** Unique ID within the area */
  id: string;

  /** Item display name */
  name: string;

  /** Short description */
  shortDesc: string;

  /** Long description */
  longDesc: string;

  /** Item category */
  type: ItemType;

  /** Keyword identifiers */
  keywords?: string[];

  /** Item weight */
  weight?: number;

  /** Item value in gold */
  value?: number;

  /**
   * Type-specific properties.
   * - For weapons: WeaponProperties (itemLevel, minDamage, maxDamage, damageType, handedness, attackSpeed, toHit)
   * - For armor: ArmorProperties (itemLevel, armor, slot, size, toDodge, toBlock)
   */
  properties?: Record<string, unknown>;

  /** Unix timestamp of last modification (for incremental publishing) */
  updatedAt?: number;

  /** Custom code that couldn't be parsed into standard fields (for imported areas) */
  customCode?: string;

  /** Preserved custom code blocks that will be re-injected on publish */
  customCodeBlocks?: CustomCodeBlock[];
}

/**
 * Grid size configuration.
 */
export interface GridSize {
  /** Width (x-axis) */
  width: number;

  /** Height (y-axis) */
  height: number;

  /** Depth (z-axis / floors) */
  depth: number;
}

/**
 * Options for creating a new area.
 */
export interface CreateAreaOptions {
  /** Display name */
  name: string;

  /** Region folder (e.g., "valdoria") */
  region: string;

  /** Subregion folder (e.g., "dark_caves") */
  subregion: string;

  /** Area description for builders */
  description?: string;

  /** Theme keywords for AI generation */
  theme?: string;

  /** Grid dimensions */
  gridSize?: GridSize;
}

/**
 * Options for the AI area generation wizard.
 */
export interface AreaWizardOptions {
  /** Area name */
  name: string;

  /** Region */
  region: string;

  /** Subregion */
  subregion: string;

  /** Theme keywords (comma-separated) */
  theme: string;

  /** Mood/atmosphere */
  mood: AreaMood;

  /** Grid dimensions */
  gridSize: GridSize;

  /** Layout style */
  layoutStyle: LayoutStyle;

  /** Target room count */
  roomCount: number;

  /** Lore entry IDs for context */
  loreReferences: string[];

  /** Key features to include */
  features: {
    hasEntrance: boolean;
    hasBossRoom: boolean;
    hasTreasureRoom: boolean;
    hasSecretRoom: boolean;
    hasShop: boolean;
  };

  /** NPC density (0-100) */
  npcDensity: number;

  /** Include environmental hazards */
  hasHazards: boolean;
}

/**
 * Complete area definition stored in the AreaDaemon.
 */
export interface AreaDefinition {
  /** Unique ID in format "region:subregion" */
  id: string;

  /** Display name */
  name: string;

  /** Region folder name */
  region: string;

  /** Subregion folder name */
  subregion: string;

  /** Builder-facing description */
  description: string;

  /** Theme keywords */
  theme: string;

  /** Mood/atmosphere */
  mood?: AreaMood;

  /** Primary owner (builder username) */
  owner: string;

  /** Additional builders with edit access */
  collaborators: string[];

  /** Lifecycle status */
  status: AreaStatus;

  /** Version number (increments on publish) */
  version: number;

  /** Grid dimensions */
  gridSize: GridSize;

  /** All rooms in the area */
  rooms: DraftRoom[];

  /** All NPCs defined for the area */
  npcs: DraftNPC[];

  /** All items defined for the area */
  items: DraftItem[];

  /** Tags for categorization */
  tags: string[];

  /** Lore entry IDs used for context */
  loreReferences: string[];

  /** Unix timestamp of creation */
  createdAt: number;

  /** Unix timestamp of last update */
  updatedAt: number;

  /** Unix timestamp of last publish (if published) */
  publishedAt?: number;

  /** Path where published (e.g., "/areas/valdoria/dark_caves") */
  publishedPath?: string;
}

/**
 * Result from area validation.
 */
export interface ValidationResult {
  /** Whether the area is valid for publishing */
  valid: boolean;

  /** Error messages */
  errors: string[];

  /** Warning messages (non-blocking) */
  warnings: string[];
}

/**
 * Result from publishing an area.
 */
export interface PublishResult {
  /** Whether publish succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Path where files were created */
  path?: string;

  /** List of files created (new entities) */
  filesCreated?: string[];

  /** List of files updated (changed entities) */
  filesUpdated?: string[];

  /** Number of files skipped (unchanged entities) */
  filesSkipped?: number;

  /** List of files deleted (when republishing) */
  filesDeleted?: string[];

  /** Number of rooms published */
  roomCount?: number;

  /** Number of NPCs published */
  npcCount?: number;

  /** Number of items published */
  itemCount?: number;
}

/**
 * Generated layout from AI wizard.
 */
export interface GeneratedLayout {
  /** Generated rooms */
  rooms: DraftRoom[];

  /** Suggested NPCs */
  npcs?: DraftNPC[];

  /** Generation metadata */
  metadata?: {
    /** Prompt used */
    prompt?: string;
    /** Tokens used */
    tokensUsed?: number;
  };
}

/**
 * Area list entry for selector UI.
 */
export interface AreaListEntry {
  /** Area ID */
  id: string;

  /** Display name */
  name: string;

  /** Status */
  status: AreaStatus;

  /** Room count */
  roomCount: number;

  /** Last updated */
  updatedAt: number;

  /** Whether current user is owner */
  isOwner: boolean;
}
