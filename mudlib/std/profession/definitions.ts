/**
 * Profession Definitions
 *
 * Configuration for all professions including crafting, gathering, and movement skills.
 */

import type {
  ProfessionDefinition,
  ProfessionId,
  TerrainRequirement,
  TerrainType,
} from './types.js';

/**
 * All profession definitions.
 */
export const PROFESSION_DEFINITIONS: Record<ProfessionId, ProfessionDefinition> = {
  // ========== Crafting Professions ==========

  alchemy: {
    id: 'alchemy',
    name: 'Alchemy',
    description: 'Create potions, elixirs, and poisons from herbs and reagents.',
    category: 'crafting',
    primaryStat: 'intelligence',
    baseXPPerUse: 25,
    stationRequired: 'alchemy_table',
  },

  blacksmithing: {
    id: 'blacksmithing',
    name: 'Blacksmithing',
    description: 'Forge weapons and metal armor from ores and ingots.',
    category: 'crafting',
    primaryStat: 'strength',
    baseXPPerUse: 25,
    stationRequired: 'forge',
  },

  woodworking: {
    id: 'woodworking',
    name: 'Woodworking',
    description: 'Craft bows, staves, shields, and wooden items.',
    category: 'crafting',
    primaryStat: 'dexterity',
    baseXPPerUse: 25,
    stationRequired: 'workbench',
  },

  leatherworking: {
    id: 'leatherworking',
    name: 'Leatherworking',
    description: 'Create leather armor, bags, and accessories from hides.',
    category: 'crafting',
    primaryStat: 'dexterity',
    baseXPPerUse: 25,
    stationRequired: 'tanning_rack',
  },

  cooking: {
    id: 'cooking',
    name: 'Cooking',
    description: 'Prepare food and drinks that provide temporary buffs.',
    category: 'crafting',
    primaryStat: 'wisdom',
    baseXPPerUse: 20,
    stationRequired: 'cooking_fire',
  },

  jeweling: {
    id: 'jeweling',
    name: 'Jeweling',
    description: 'Craft rings, amulets, and enchanted accessories from gems.',
    category: 'crafting',
    primaryStat: 'intelligence',
    baseXPPerUse: 30,
    stationRequired: 'jeweler_bench',
  },

  // ========== Gathering Professions ==========

  mining: {
    id: 'mining',
    name: 'Mining',
    description: 'Extract ore, gems, and stone from veins and deposits.',
    category: 'gathering',
    primaryStat: 'strength',
    baseXPPerUse: 15,
    toolRequired: 'pickaxe',
  },

  herbalism: {
    id: 'herbalism',
    name: 'Herbalism',
    description: 'Gather herbs, flowers, and alchemical reagents.',
    category: 'gathering',
    primaryStat: 'wisdom',
    baseXPPerUse: 15,
    toolRequired: 'herbalism_kit',
  },

  logging: {
    id: 'logging',
    name: 'Logging',
    description: 'Fell trees and gather wood, bark, and sap.',
    category: 'gathering',
    primaryStat: 'strength',
    baseXPPerUse: 15,
    toolRequired: 'logging_axe',
  },

  fishing: {
    id: 'fishing',
    name: 'Fishing',
    description: 'Catch fish, shells, and underwater salvage.',
    category: 'gathering',
    primaryStat: 'dexterity',
    baseXPPerUse: 15,
    toolRequired: 'fishing_rod',
  },

  skinning: {
    id: 'skinning',
    name: 'Skinning',
    description: 'Harvest leather, hides, and fur from creature corpses.',
    category: 'gathering',
    primaryStat: 'dexterity',
    baseXPPerUse: 15,
    toolRequired: 'skinning_knife',
  },

  // ========== Movement Skills ==========

  swimming: {
    id: 'swimming',
    name: 'Swimming',
    description: 'Navigate through water, from shallow streams to deep oceans.',
    category: 'movement',
    primaryStat: 'constitution',
    baseXPPerUse: 5,
  },

  climbing: {
    id: 'climbing',
    name: 'Climbing',
    description: 'Scale walls, cliffs, and mountains safely.',
    category: 'movement',
    primaryStat: 'strength',
    baseXPPerUse: 5,
  },

  flying: {
    id: 'flying',
    name: 'Flying',
    description: 'Navigate aerial terrain using mounts or magic.',
    category: 'movement',
    primaryStat: 'intelligence',
    baseXPPerUse: 5,
  },
};

/**
 * Swimming terrain requirements.
 */
export const SWIMMING_REQUIREMENTS: Record<string, TerrainRequirement> = {
  water_shallow: {
    terrain: 'water_shallow',
    levelRequired: 1,
    costPerRoom: 5,
    failMessage: 'You wade through the shallow water.',
  },
  water_deep: {
    terrain: 'water_deep',
    levelRequired: 20,
    costPerRoom: 10,
    failMessage: 'The water is too deep for your swimming ability.',
    failDamage: 5,
  },
  water_ocean: {
    terrain: 'water_ocean',
    levelRequired: 50,
    costPerRoom: 15,
    failMessage: 'The ocean currents are too strong for you.',
    failDamage: 15,
  },
};

/**
 * Climbing terrain requirements.
 */
export const CLIMBING_REQUIREMENTS: Record<string, TerrainRequirement> = {
  climb_easy: {
    terrain: 'climb_easy',
    levelRequired: 1,
    costPerRoom: 5,
    failMessage: 'The slope is gentle enough to climb.',
  },
  climb_moderate: {
    terrain: 'climb_moderate',
    levelRequired: 30,
    costPerRoom: 10,
    failMessage: 'The rocks are too steep for your climbing skill.',
    failDamage: 10,
  },
  climb_hard: {
    terrain: 'climb_hard',
    levelRequired: 50,
    costPerRoom: 15,
    failMessage: 'The cliff face is beyond your climbing ability.',
    failDamage: 20,
  },
  climb_sheer: {
    terrain: 'climb_sheer',
    levelRequired: 80,
    costPerRoom: 20,
    failMessage: 'The sheer wall is nearly impossible for you to climb.',
    failDamage: 30,
  },
};

/**
 * Flying terrain requirements.
 */
export const FLYING_REQUIREMENTS: Record<string, TerrainRequirement> = {
  air_low: {
    terrain: 'air_low',
    levelRequired: 30,
    costPerRoom: 10,
    failMessage: 'You cannot maintain flight at this altitude.',
    failDamage: 15,
  },
  air_high: {
    terrain: 'air_high',
    levelRequired: 60,
    costPerRoom: 15,
    failMessage: 'The high altitude is beyond your flying ability.',
    failDamage: 25,
  },
};

/**
 * Get terrain requirement by type.
 */
export function getTerrainRequirement(terrain: TerrainType): TerrainRequirement | undefined {
  return {
    ...SWIMMING_REQUIREMENTS,
    ...CLIMBING_REQUIREMENTS,
    ...FLYING_REQUIREMENTS,
  }[terrain];
}

/**
 * Get profession by ID.
 */
export function getProfession(id: ProfessionId): ProfessionDefinition | undefined {
  return PROFESSION_DEFINITIONS[id];
}

/**
 * Get all professions by category.
 */
export function getProfessionsByCategory(category: 'crafting' | 'gathering' | 'movement'): ProfessionDefinition[] {
  return Object.values(PROFESSION_DEFINITIONS).filter((p) => p.category === category);
}
