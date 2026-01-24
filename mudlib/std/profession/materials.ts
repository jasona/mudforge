/**
 * Material Definitions
 *
 * All gatherable and craftable materials for the profession system.
 */

import type { MaterialDefinition, MaterialType, MaterialQuality } from './types.js';

/**
 * All material definitions indexed by ID.
 */
export const MATERIAL_DEFINITIONS: Record<string, MaterialDefinition> = {
  // ========== Ores (Mining) ==========

  copper_ore: {
    id: 'copper_ore',
    name: 'Copper Ore',
    type: 'ore',
    quality: 'common',
    tier: 1,
    gatherProfession: 'mining',
    gatherLevelRequired: 1,
    stackable: true,
    maxStack: 50,
    weight: 2,
    value: 5,
    shortDesc: 'a chunk of copper ore',
    longDesc: 'A rough chunk of reddish-brown copper ore, veined with traces of green.',
  },

  tin_ore: {
    id: 'tin_ore',
    name: 'Tin Ore',
    type: 'ore',
    quality: 'common',
    tier: 1,
    gatherProfession: 'mining',
    gatherLevelRequired: 1,
    stackable: true,
    maxStack: 50,
    weight: 2,
    value: 5,
    shortDesc: 'a chunk of tin ore',
    longDesc: 'A dull gray chunk of tin ore with a slight metallic sheen.',
  },

  iron_ore: {
    id: 'iron_ore',
    name: 'Iron Ore',
    type: 'ore',
    quality: 'common',
    tier: 2,
    gatherProfession: 'mining',
    gatherLevelRequired: 20,
    stackable: true,
    maxStack: 50,
    weight: 3,
    value: 10,
    shortDesc: 'a chunk of iron ore',
    longDesc: 'A heavy chunk of dark iron ore with rust-colored streaks.',
  },

  silver_ore: {
    id: 'silver_ore',
    name: 'Silver Ore',
    type: 'ore',
    quality: 'fine',
    tier: 3,
    gatherProfession: 'mining',
    gatherLevelRequired: 35,
    stackable: true,
    maxStack: 50,
    weight: 2,
    value: 25,
    shortDesc: 'a chunk of silver ore',
    longDesc: 'A lustrous chunk of silver ore that catches the light.',
  },

  gold_ore: {
    id: 'gold_ore',
    name: 'Gold Ore',
    type: 'ore',
    quality: 'superior',
    tier: 4,
    gatherProfession: 'mining',
    gatherLevelRequired: 50,
    stackable: true,
    maxStack: 50,
    weight: 4,
    value: 50,
    shortDesc: 'a chunk of gold ore',
    longDesc: 'A heavy chunk of ore glittering with flecks of pure gold.',
  },

  mithril_ore: {
    id: 'mithril_ore',
    name: 'Mithril Ore',
    type: 'ore',
    quality: 'exceptional',
    tier: 5,
    gatherProfession: 'mining',
    gatherLevelRequired: 70,
    stackable: true,
    maxStack: 50,
    weight: 1,
    value: 100,
    shortDesc: 'a chunk of mithril ore',
    longDesc: 'A silvery-blue chunk of precious mithril, lighter than it looks.',
  },

  // ========== Ingots (Refined from ore) ==========

  copper_ingot: {
    id: 'copper_ingot',
    name: 'Copper Ingot',
    type: 'ingot',
    quality: 'common',
    tier: 1,
    stackable: true,
    maxStack: 20,
    weight: 3,
    value: 15,
    shortDesc: 'a copper ingot',
    longDesc: 'A refined bar of copper, ready for smithing.',
  },

  bronze_ingot: {
    id: 'bronze_ingot',
    name: 'Bronze Ingot',
    type: 'ingot',
    quality: 'common',
    tier: 1,
    stackable: true,
    maxStack: 20,
    weight: 3,
    value: 20,
    shortDesc: 'a bronze ingot',
    longDesc: 'An alloy of copper and tin, stronger than either alone.',
  },

  iron_ingot: {
    id: 'iron_ingot',
    name: 'Iron Ingot',
    type: 'ingot',
    quality: 'common',
    tier: 2,
    stackable: true,
    maxStack: 20,
    weight: 4,
    value: 30,
    shortDesc: 'an iron ingot',
    longDesc: 'A sturdy bar of smelted iron.',
  },

  steel_ingot: {
    id: 'steel_ingot',
    name: 'Steel Ingot',
    type: 'ingot',
    quality: 'fine',
    tier: 3,
    stackable: true,
    maxStack: 20,
    weight: 4,
    value: 50,
    shortDesc: 'a steel ingot',
    longDesc: 'A bar of refined steel, harder and more flexible than iron.',
  },

  silver_ingot: {
    id: 'silver_ingot',
    name: 'Silver Ingot',
    type: 'ingot',
    quality: 'fine',
    tier: 3,
    stackable: true,
    maxStack: 20,
    weight: 3,
    value: 75,
    shortDesc: 'a silver ingot',
    longDesc: 'A gleaming bar of pure silver.',
  },

  gold_ingot: {
    id: 'gold_ingot',
    name: 'Gold Ingot',
    type: 'ingot',
    quality: 'superior',
    tier: 4,
    stackable: true,
    maxStack: 20,
    weight: 5,
    value: 150,
    shortDesc: 'a gold ingot',
    longDesc: 'A heavy bar of pure gold, warm to the touch.',
  },

  mithril_ingot: {
    id: 'mithril_ingot',
    name: 'Mithril Ingot',
    type: 'ingot',
    quality: 'exceptional',
    tier: 5,
    stackable: true,
    maxStack: 20,
    weight: 2,
    value: 300,
    shortDesc: 'a mithril ingot',
    longDesc: 'A silvery-blue bar of mithril, prized for its strength and lightness.',
  },

  // ========== Gems (Mining bonus drops) ==========

  rough_quartz: {
    id: 'rough_quartz',
    name: 'Rough Quartz',
    type: 'gem',
    quality: 'common',
    tier: 1,
    gatherProfession: 'mining',
    gatherLevelRequired: 1,
    stackable: true,
    maxStack: 20,
    weight: 0.5,
    value: 10,
    shortDesc: 'a rough quartz crystal',
    longDesc: 'An uncut crystal of clear quartz.',
  },

  rough_amethyst: {
    id: 'rough_amethyst',
    name: 'Rough Amethyst',
    type: 'gem',
    quality: 'fine',
    tier: 2,
    gatherProfession: 'mining',
    gatherLevelRequired: 20,
    stackable: true,
    maxStack: 20,
    weight: 0.5,
    value: 25,
    shortDesc: 'a rough amethyst',
    longDesc: 'An uncut purple amethyst crystal.',
  },

  rough_ruby: {
    id: 'rough_ruby',
    name: 'Rough Ruby',
    type: 'gem',
    quality: 'superior',
    tier: 3,
    gatherProfession: 'mining',
    gatherLevelRequired: 40,
    stackable: true,
    maxStack: 20,
    weight: 0.5,
    value: 75,
    shortDesc: 'a rough ruby',
    longDesc: 'An uncut ruby glowing with deep crimson fire.',
  },

  rough_sapphire: {
    id: 'rough_sapphire',
    name: 'Rough Sapphire',
    type: 'gem',
    quality: 'superior',
    tier: 3,
    gatherProfession: 'mining',
    gatherLevelRequired: 40,
    stackable: true,
    maxStack: 20,
    weight: 0.5,
    value: 75,
    shortDesc: 'a rough sapphire',
    longDesc: 'An uncut sapphire the color of a clear sky.',
  },

  rough_diamond: {
    id: 'rough_diamond',
    name: 'Rough Diamond',
    type: 'gem',
    quality: 'exceptional',
    tier: 5,
    gatherProfession: 'mining',
    gatherLevelRequired: 70,
    stackable: true,
    maxStack: 20,
    weight: 0.5,
    value: 200,
    shortDesc: 'a rough diamond',
    longDesc: 'An uncut diamond, cloudy but with hints of brilliant fire within.',
  },

  // ========== Herbs (Herbalism) ==========

  silverleaf: {
    id: 'silverleaf',
    name: 'Silverleaf',
    type: 'herb',
    quality: 'common',
    tier: 1,
    gatherProfession: 'herbalism',
    gatherLevelRequired: 1,
    stackable: true,
    maxStack: 50,
    weight: 0.1,
    value: 3,
    shortDesc: 'a sprig of silverleaf',
    longDesc: 'A common herb with silvery leaves, used in basic healing potions.',
  },

  peacebloom: {
    id: 'peacebloom',
    name: 'Peacebloom',
    type: 'herb',
    quality: 'common',
    tier: 1,
    gatherProfession: 'herbalism',
    gatherLevelRequired: 1,
    stackable: true,
    maxStack: 50,
    weight: 0.1,
    value: 3,
    shortDesc: 'a peacebloom flower',
    longDesc: 'A delicate white flower with calming properties.',
  },

  earthroot: {
    id: 'earthroot',
    name: 'Earthroot',
    type: 'herb',
    quality: 'common',
    tier: 1,
    gatherProfession: 'herbalism',
    gatherLevelRequired: 10,
    stackable: true,
    maxStack: 50,
    weight: 0.2,
    value: 5,
    shortDesc: 'an earthroot tuber',
    longDesc: 'A gnarled root vegetable with restorative properties.',
  },

  mageroyal: {
    id: 'mageroyal',
    name: 'Mageroyal',
    type: 'herb',
    quality: 'fine',
    tier: 2,
    gatherProfession: 'herbalism',
    gatherLevelRequired: 25,
    stackable: true,
    maxStack: 50,
    weight: 0.1,
    value: 10,
    shortDesc: 'a mageroyal bloom',
    longDesc: 'A purple flower prized by alchemists for its magical properties.',
  },

  kingsblood: {
    id: 'kingsblood',
    name: 'Kingsblood',
    type: 'herb',
    quality: 'fine',
    tier: 2,
    gatherProfession: 'herbalism',
    gatherLevelRequired: 35,
    stackable: true,
    maxStack: 50,
    weight: 0.1,
    value: 15,
    shortDesc: 'a kingsblood stem',
    longDesc: 'A red-flowering plant that enhances strength potions.',
  },

  fadeleaf: {
    id: 'fadeleaf',
    name: 'Fadeleaf',
    type: 'herb',
    quality: 'superior',
    tier: 3,
    gatherProfession: 'herbalism',
    gatherLevelRequired: 50,
    stackable: true,
    maxStack: 50,
    weight: 0.1,
    value: 25,
    shortDesc: 'a fadeleaf sprig',
    longDesc: 'A ghostly pale herb used in invisibility potions.',
  },

  goldthorn: {
    id: 'goldthorn',
    name: 'Goldthorn',
    type: 'herb',
    quality: 'superior',
    tier: 3,
    gatherProfession: 'herbalism',
    gatherLevelRequired: 60,
    stackable: true,
    maxStack: 50,
    weight: 0.1,
    value: 30,
    shortDesc: 'a goldthorn flower',
    longDesc: 'A golden-petaled flower with powerful restorative magic.',
  },

  // ========== Wood (Logging) ==========

  oak_log: {
    id: 'oak_log',
    name: 'Oak Log',
    type: 'wood',
    quality: 'common',
    tier: 1,
    gatherProfession: 'logging',
    gatherLevelRequired: 1,
    stackable: true,
    maxStack: 20,
    weight: 5,
    value: 5,
    shortDesc: 'an oak log',
    longDesc: 'A sturdy log of oak wood, good for general carpentry.',
  },

  ash_log: {
    id: 'ash_log',
    name: 'Ash Log',
    type: 'wood',
    quality: 'fine',
    tier: 2,
    gatherProfession: 'logging',
    gatherLevelRequired: 25,
    stackable: true,
    maxStack: 20,
    weight: 4,
    value: 12,
    shortDesc: 'an ash log',
    longDesc: 'A flexible ash log, prized for making bows and tool handles.',
  },

  ironwood_log: {
    id: 'ironwood_log',
    name: 'Ironwood Log',
    type: 'wood',
    quality: 'superior',
    tier: 3,
    gatherProfession: 'logging',
    gatherLevelRequired: 50,
    stackable: true,
    maxStack: 20,
    weight: 7,
    value: 30,
    shortDesc: 'an ironwood log',
    longDesc: 'An extremely dense hardwood, nearly as strong as metal.',
  },

  oak_plank: {
    id: 'oak_plank',
    name: 'Oak Plank',
    type: 'plank',
    quality: 'common',
    tier: 1,
    stackable: true,
    maxStack: 20,
    weight: 2,
    value: 10,
    shortDesc: 'an oak plank',
    longDesc: 'A planed board of oak wood, ready for crafting.',
  },

  ash_plank: {
    id: 'ash_plank',
    name: 'Ash Plank',
    type: 'plank',
    quality: 'fine',
    tier: 2,
    stackable: true,
    maxStack: 20,
    weight: 1.5,
    value: 25,
    shortDesc: 'an ash plank',
    longDesc: 'A smooth plank of ash wood, flexible yet strong.',
  },

  ironwood_plank: {
    id: 'ironwood_plank',
    name: 'Ironwood Plank',
    type: 'plank',
    quality: 'superior',
    tier: 3,
    stackable: true,
    maxStack: 20,
    weight: 3,
    value: 60,
    shortDesc: 'an ironwood plank',
    longDesc: 'A board of ironwood so dense it might dent an anvil.',
  },

  // ========== Leather (Skinning) ==========

  ruined_leather: {
    id: 'ruined_leather',
    name: 'Ruined Leather',
    type: 'leather',
    quality: 'poor',
    tier: 1,
    gatherProfession: 'skinning',
    gatherLevelRequired: 1,
    stackable: true,
    maxStack: 50,
    weight: 0.5,
    value: 1,
    shortDesc: 'a scrap of ruined leather',
    longDesc: 'A damaged piece of hide, barely usable.',
  },

  light_leather: {
    id: 'light_leather',
    name: 'Light Leather',
    type: 'leather',
    quality: 'common',
    tier: 1,
    gatherProfession: 'skinning',
    gatherLevelRequired: 1,
    stackable: true,
    maxStack: 50,
    weight: 0.5,
    value: 5,
    shortDesc: 'a piece of light leather',
    longDesc: 'Soft leather from small creatures, good for light armor.',
  },

  medium_leather: {
    id: 'medium_leather',
    name: 'Medium Leather',
    type: 'leather',
    quality: 'common',
    tier: 2,
    gatherProfession: 'skinning',
    gatherLevelRequired: 25,
    stackable: true,
    maxStack: 50,
    weight: 1,
    value: 12,
    shortDesc: 'a piece of medium leather',
    longDesc: 'Standard leather from common beasts.',
  },

  heavy_leather: {
    id: 'heavy_leather',
    name: 'Heavy Leather',
    type: 'leather',
    quality: 'fine',
    tier: 3,
    gatherProfession: 'skinning',
    gatherLevelRequired: 40,
    stackable: true,
    maxStack: 50,
    weight: 1.5,
    value: 25,
    shortDesc: 'a piece of heavy leather',
    longDesc: 'Thick, durable leather from large predators.',
  },

  thick_leather: {
    id: 'thick_leather',
    name: 'Thick Leather',
    type: 'leather',
    quality: 'superior',
    tier: 4,
    gatherProfession: 'skinning',
    gatherLevelRequired: 55,
    stackable: true,
    maxStack: 50,
    weight: 2,
    value: 40,
    shortDesc: 'a piece of thick leather',
    longDesc: 'Exceptionally thick hide from powerful creatures.',
  },

  // ========== Fish (Fishing) ==========

  small_fish: {
    id: 'small_fish',
    name: 'Small Fish',
    type: 'fish',
    quality: 'common',
    tier: 1,
    gatherProfession: 'fishing',
    gatherLevelRequired: 1,
    stackable: true,
    maxStack: 20,
    weight: 0.5,
    value: 3,
    shortDesc: 'a small fish',
    longDesc: 'A common freshwater fish, edible but plain.',
  },

  trout: {
    id: 'trout',
    name: 'River Trout',
    type: 'fish',
    quality: 'common',
    tier: 1,
    gatherProfession: 'fishing',
    gatherLevelRequired: 10,
    stackable: true,
    maxStack: 20,
    weight: 1,
    value: 8,
    shortDesc: 'a river trout',
    longDesc: 'A spotted trout from cold mountain streams.',
  },

  salmon: {
    id: 'salmon',
    name: 'Salmon',
    type: 'fish',
    quality: 'fine',
    tier: 2,
    gatherProfession: 'fishing',
    gatherLevelRequired: 25,
    stackable: true,
    maxStack: 20,
    weight: 2,
    value: 15,
    shortDesc: 'a salmon',
    longDesc: 'A large pink-fleshed fish, prized for cooking.',
  },

  lobster: {
    id: 'lobster',
    name: 'Lobster',
    type: 'fish',
    quality: 'superior',
    tier: 3,
    gatherProfession: 'fishing',
    gatherLevelRequired: 45,
    stackable: true,
    maxStack: 10,
    weight: 1.5,
    value: 30,
    shortDesc: 'a lobster',
    longDesc: 'A large crustacean with succulent meat.',
  },

  // ========== Reagents (Alchemy ingredients) ==========

  empty_vial: {
    id: 'empty_vial',
    name: 'Empty Vial',
    type: 'reagent',
    quality: 'common',
    tier: 1,
    stackable: true,
    maxStack: 50,
    weight: 0.1,
    value: 2,
    shortDesc: 'an empty vial',
    longDesc: 'A small glass vial for holding potions.',
  },

  crystal_vial: {
    id: 'crystal_vial',
    name: 'Crystal Vial',
    type: 'reagent',
    quality: 'fine',
    tier: 2,
    stackable: true,
    maxStack: 50,
    weight: 0.1,
    value: 10,
    shortDesc: 'a crystal vial',
    longDesc: 'A high-quality crystal vial that preserves potions longer.',
  },

  coal: {
    id: 'coal',
    name: 'Coal',
    type: 'reagent',
    quality: 'common',
    tier: 1,
    gatherProfession: 'mining',
    gatherLevelRequired: 1,
    stackable: true,
    maxStack: 50,
    weight: 1,
    value: 2,
    shortDesc: 'a chunk of coal',
    longDesc: 'Black coal used as fuel for forges.',
  },
};

/**
 * Get material by ID.
 */
export function getMaterial(id: string): MaterialDefinition | undefined {
  return MATERIAL_DEFINITIONS[id];
}

/**
 * Get all materials of a specific type.
 */
export function getMaterialsByType(type: MaterialType): MaterialDefinition[] {
  return Object.values(MATERIAL_DEFINITIONS).filter((m) => m.type === type);
}

/**
 * Get all materials gatherable by a profession.
 */
export function getMaterialsByProfession(profession: string): MaterialDefinition[] {
  return Object.values(MATERIAL_DEFINITIONS).filter((m) => m.gatherProfession === profession);
}

/**
 * Get all materials of at least a certain quality.
 */
export function getMaterialsByMinQuality(minQuality: MaterialQuality): MaterialDefinition[] {
  const qualityOrder: MaterialQuality[] = ['poor', 'common', 'fine', 'superior', 'exceptional', 'legendary'];
  const minIndex = qualityOrder.indexOf(minQuality);
  return Object.values(MATERIAL_DEFINITIONS).filter(
    (m) => qualityOrder.indexOf(m.quality) >= minIndex
  );
}
