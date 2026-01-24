/**
 * Random Loot Generator Types
 *
 * Core interfaces and types for the random loot generation system.
 */

import type { DamageType } from '../weapon.js';
import type { ArmorSlot } from '../armor.js';
import type { StatName } from '../living.js';
import type { CombatStatName } from '../combat/types.js';

/**
 * Quality tiers for generated items.
 * Each tier provides different stat multipliers and possible features.
 */
export type QualityTier =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'unique';

/**
 * Weapon type categories for generation.
 */
export type WeaponType =
  // One-handed
  | 'sword'
  | 'longsword'
  | 'axe'
  | 'mace'
  | 'hammer'
  | 'flail'
  | 'scimitar'
  // Light (dual-wield capable)
  | 'shortsword'
  | 'dagger'
  | 'knife'
  | 'hatchet'
  | 'rapier'
  // Two-handed
  | 'greatsword'
  | 'greataxe'
  | 'warhammer'
  | 'staff'
  | 'quarterstaff'
  | 'spear'
  | 'halberd'
  | 'bow'
  | 'crossbow';

/**
 * Armor type categories for generation (by slot).
 */
export type ArmorType =
  // Head
  | 'helm'
  | 'cap'
  | 'hood'
  | 'crown'
  // Chest
  | 'plate'
  | 'chainmail'
  | 'leather'
  | 'robe'
  // Hands
  | 'gauntlets'
  | 'gloves'
  | 'bracers'
  // Legs
  | 'greaves'
  | 'pants'
  | 'legguards'
  // Feet
  | 'boots'
  | 'sandals'
  | 'shoes'
  // Cloak
  | 'cloak'
  | 'cape'
  | 'mantle'
  // Shield
  | 'shield'
  | 'buckler'
  | 'tower_shield';

/**
 * Bauble type categories for generation.
 */
export type BaubleType =
  // Jewelry
  | 'ring'
  | 'amulet'
  | 'necklace'
  | 'pendant'
  // Gems
  | 'gem'
  | 'gemstone'
  | 'jewel'
  // Trinkets
  | 'trinket'
  | 'charm'
  | 'token'
  | 'figurine';

/**
 * Generated item type for persistence detection.
 */
export type GeneratedItemType = 'weapon' | 'armor' | 'bauble';

/**
 * Ability trigger type.
 */
export type AbilityTrigger = 'on_hit' | 'on_equip' | 'on_use';

/**
 * Generated ability definition.
 */
export interface GeneratedAbility {
  id: string;
  name: string;
  trigger: AbilityTrigger;
  description: string;
  chance?: number; // For on_hit abilities, percentage chance
  magnitude: number; // Effect strength
  duration?: number; // Duration in milliseconds (for effects)
  damageType?: DamageType; // For damage abilities
  effectType?: string; // Combat effect type (burn, poison, slow, etc.)
}

/**
 * Complete data for a generated item (used for persistence).
 * Contains all information needed to recreate the item.
 */
export interface GeneratedItemData {
  /** Type of generated item */
  generatedType: GeneratedItemType;

  /** Random seed used for generation (for reproducibility) */
  seed: string;

  /** Base item name (e.g., "Iron Sword") */
  baseName: string;

  /** Full display name with quality colors and affixes */
  fullName: string;

  /** Unique title for unique items (e.g., "Doombringer, Sledgehammer of Darkness") */
  uniqueTitle?: string;

  /** Quality tier */
  quality: QualityTier;

  /** Long description */
  description: string;

  /** Item level (affects stats) */
  itemLevel: number;

  /** Gold value */
  value: number;

  /** Weight */
  weight: number;

  // Weapon-specific properties
  weaponType?: WeaponType;
  minDamage?: number;
  maxDamage?: number;
  damageType?: DamageType;
  handedness?: 'one_handed' | 'light' | 'two_handed';
  toHit?: number;
  attackSpeed?: number;

  // Armor-specific properties
  armorType?: ArmorType;
  armorSlot?: ArmorSlot;
  armor?: number;
  toDodge?: number;
  toBlock?: number;

  // Bauble-specific properties
  baubleType?: BaubleType;

  // Bonuses (all item types)
  statBonuses?: Partial<Record<StatName, number>>;
  combatBonuses?: Partial<Record<CombatStatName, number>>;

  // Special abilities
  abilities?: GeneratedAbility[];
}

/**
 * Configuration for NPC random loot drops.
 */
export interface NPCRandomLootConfig {
  /** Whether random loot is enabled for this NPC */
  enabled: boolean;

  /** Base item level for generated items */
  itemLevel: number;

  /** Maximum quality tier that can drop */
  maxQuality: QualityTier;

  /** Chance for any loot to drop (0-100) */
  dropChance: number;

  /** Maximum number of items that can drop */
  maxDrops: number;

  /** Allowed item types (defaults to all) */
  allowedTypes?: GeneratedItemType[];

  /** Allowed weapon types (if weapons are allowed) */
  allowedWeaponTypes?: WeaponType[];

  /** Allowed armor slots (if armor is allowed) */
  allowedArmorSlots?: ArmorSlot[];
}

/**
 * Quality tier configuration.
 */
export interface QualityConfig {
  /** Display name */
  name: string;

  /** Color code for display */
  color: string;

  /** Minimum item level for this quality */
  minLevel: number;

  /** Maximum item level for this quality */
  maxLevel: number;

  /** Stat multiplier */
  statMultiplier: number;

  /** Value multiplier for gold price */
  valueMultiplier: number;

  /** Weight of this tier in random selection */
  weight: number;

  /** Whether items can have stat bonuses */
  hasStatBonuses: boolean;

  /** Whether items can have abilities */
  hasAbilities: boolean;

  /** Max number of abilities */
  maxAbilities: number;
}

/**
 * Weapon type configuration.
 */
export interface WeaponTypeConfig {
  /** Base name for display */
  baseName: string;

  /** Handedness */
  handedness: 'one_handed' | 'light' | 'two_handed';

  /** Primary damage type */
  damageType: DamageType;

  /** Base damage multiplier (1.0 = normal) */
  damageMultiplier: number;

  /** Attack speed modifier (-0.5 to +0.5) */
  attackSpeed: number;

  /** Item size for weight calculation */
  size: 'tiny' | 'small' | 'medium' | 'large';

  /** Skill category (for future skill system) */
  skillCategory?: string;
}

/**
 * Armor type configuration.
 */
export interface ArmorTypeConfig {
  /** Base name for display */
  baseName: string;

  /** Equipment slot */
  slot: ArmorSlot;

  /** Armor class multiplier */
  armorMultiplier: number;

  /** Weight class affects dodge */
  weightClass: 'light' | 'medium' | 'heavy';

  /** Item size */
  size: 'tiny' | 'small' | 'medium' | 'large';
}

/**
 * Bauble type configuration.
 */
export interface BaubleTypeConfig {
  /** Base name for display */
  baseName: string;

  /** Value multiplier (baubles are valuable) */
  valueMultiplier: number;

  /** Item size */
  size: 'tiny' | 'small';
}

/**
 * Material configuration for name generation.
 */
export interface MaterialConfig {
  /** Material name */
  name: string;

  /** Quality tier association */
  quality: QualityTier;

  /** Stat multiplier for this material */
  statMultiplier: number;

  /** Value multiplier */
  valueMultiplier: number;
}

/**
 * Suffix configuration (for rare+ items).
 */
export interface SuffixConfig {
  /** Suffix name (e.g., "of Might") */
  name: string;

  /** Quality tiers this suffix can appear on */
  qualityTiers: QualityTier[];

  /** Stat bonuses granted */
  statBonuses?: Partial<Record<StatName, number>>;

  /** Combat bonuses granted */
  combatBonuses?: Partial<Record<CombatStatName, number>>;
}

/**
 * Unique item configuration.
 */
export interface UniqueItemConfig {
  /** Unique item title */
  title: string;

  /** Subtitle (e.g., "Blade of the Void") */
  subtitle: string;

  /** Item type */
  type: GeneratedItemType;

  /** Weapon/armor/bauble subtype */
  subtype: WeaponType | ArmorType | BaubleType;

  /** Fixed item level */
  itemLevel: number;

  /** Long description */
  description: string;

  /** Fixed stat bonuses */
  statBonuses?: Partial<Record<StatName, number>>;

  /** Fixed combat bonuses */
  combatBonuses?: Partial<Record<CombatStatName, number>>;

  /** Fixed abilities */
  abilities?: GeneratedAbility[];
}

/**
 * Result of loot generation for an NPC.
 */
export interface LootGenerationResult {
  /** Generated item data */
  items: GeneratedItemData[];

  /** Whether generation was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;
}
