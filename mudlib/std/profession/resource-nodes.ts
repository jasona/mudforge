/**
 * Resource Node Definitions
 *
 * All gatherable resource node configurations for the profession system.
 */

import type { ResourceNodeDefinition } from './types.js';

/**
 * All resource node definitions indexed by ID.
 */
export const RESOURCE_NODE_DEFINITIONS: Record<string, ResourceNodeDefinition> = {
  // ========== Mining Nodes ==========

  copper_vein: {
    id: 'copper_vein',
    name: 'Copper Vein',
    nodeType: 'ore_vein',
    gatherProfession: 'mining',
    levelRequired: 1,
    materials: [
      { materialId: 'copper_ore', weight: 80, minQuantity: 1, maxQuantity: 3 },
      { materialId: 'coal', weight: 20, minQuantity: 1, maxQuantity: 2 },
    ],
    bonusMaterials: [{ materialId: 'rough_quartz', chance: 5, levelRequired: 1 }],
    capacity: 5,
    respawnTime: 300, // 5 minutes
    toolRequired: 'pickaxe',
    hidden: false,
    shortDesc: 'a vein of copper ore',
    longDesc: 'Reddish-brown copper ore is visible in this rock formation.',
  },

  tin_vein: {
    id: 'tin_vein',
    name: 'Tin Vein',
    nodeType: 'ore_vein',
    gatherProfession: 'mining',
    levelRequired: 1,
    materials: [
      { materialId: 'tin_ore', weight: 85, minQuantity: 1, maxQuantity: 3 },
      { materialId: 'coal', weight: 15, minQuantity: 1, maxQuantity: 1 },
    ],
    capacity: 5,
    respawnTime: 300,
    toolRequired: 'pickaxe',
    hidden: false,
    shortDesc: 'a vein of tin ore',
    longDesc: 'Dull gray tin ore streaks through this rock.',
  },

  iron_deposit: {
    id: 'iron_deposit',
    name: 'Iron Deposit',
    nodeType: 'ore_vein',
    gatherProfession: 'mining',
    levelRequired: 20,
    materials: [
      { materialId: 'iron_ore', weight: 75, minQuantity: 1, maxQuantity: 3 },
      { materialId: 'coal', weight: 25, minQuantity: 1, maxQuantity: 2 },
    ],
    bonusMaterials: [{ materialId: 'rough_amethyst', chance: 3, levelRequired: 25 }],
    capacity: 4,
    respawnTime: 420, // 7 minutes
    toolRequired: 'pickaxe',
    hidden: false,
    shortDesc: 'an iron ore deposit',
    longDesc: 'Dark iron ore with rust-colored streaks is embedded in the stone.',
  },

  silver_vein: {
    id: 'silver_vein',
    name: 'Silver Vein',
    nodeType: 'ore_vein',
    gatherProfession: 'mining',
    levelRequired: 35,
    materials: [{ materialId: 'silver_ore', weight: 100, minQuantity: 1, maxQuantity: 2 }],
    bonusMaterials: [
      { materialId: 'rough_amethyst', chance: 5, levelRequired: 35 },
      { materialId: 'rough_sapphire', chance: 2, levelRequired: 45 },
    ],
    capacity: 3,
    respawnTime: 600, // 10 minutes
    toolRequired: 'pickaxe',
    hidden: false,
    shortDesc: 'a silver vein',
    longDesc: 'Lustrous silver glimmers within the rock face.',
  },

  gold_vein: {
    id: 'gold_vein',
    name: 'Gold Vein',
    nodeType: 'ore_vein',
    gatherProfession: 'mining',
    levelRequired: 50,
    materials: [{ materialId: 'gold_ore', weight: 100, minQuantity: 1, maxQuantity: 2 }],
    bonusMaterials: [
      { materialId: 'rough_ruby', chance: 3, levelRequired: 55 },
      { materialId: 'rough_sapphire', chance: 3, levelRequired: 55 },
    ],
    capacity: 3,
    respawnTime: 900, // 15 minutes
    toolRequired: 'pickaxe',
    hidden: true,
    discoverLevel: 45,
    shortDesc: 'a gold vein',
    longDesc: 'Precious gold glitters enticingly within the rock.',
  },

  mithril_deposit: {
    id: 'mithril_deposit',
    name: 'Mithril Deposit',
    nodeType: 'ore_vein',
    gatherProfession: 'mining',
    levelRequired: 70,
    materials: [{ materialId: 'mithril_ore', weight: 100, minQuantity: 1, maxQuantity: 2 }],
    bonusMaterials: [{ materialId: 'rough_diamond', chance: 2, levelRequired: 80 }],
    capacity: 2,
    respawnTime: 1800, // 30 minutes
    toolRequired: 'pickaxe',
    hidden: true,
    discoverLevel: 65,
    shortDesc: 'a mithril deposit',
    longDesc: 'Rare silvery-blue mithril ore gleams with an inner light.',
  },

  coal_seam: {
    id: 'coal_seam',
    name: 'Coal Seam',
    nodeType: 'ore_vein',
    gatherProfession: 'mining',
    levelRequired: 1,
    materials: [{ materialId: 'coal', weight: 100, minQuantity: 2, maxQuantity: 5 }],
    capacity: 8,
    respawnTime: 180, // 3 minutes
    toolRequired: 'pickaxe',
    hidden: false,
    shortDesc: 'a seam of coal',
    longDesc: 'Black coal is exposed in this rocky surface.',
  },

  // ========== Herbalism Nodes ==========

  silverleaf_patch: {
    id: 'silverleaf_patch',
    name: 'Silverleaf Patch',
    nodeType: 'herb_patch',
    gatherProfession: 'herbalism',
    levelRequired: 1,
    materials: [{ materialId: 'silverleaf', weight: 100, minQuantity: 1, maxQuantity: 3 }],
    capacity: 4,
    respawnTime: 240, // 4 minutes
    toolRequired: 'herbalism_kit',
    hidden: false,
    shortDesc: 'a patch of silverleaf',
    longDesc: 'Delicate herbs with silvery leaves grow here.',
  },

  peacebloom_cluster: {
    id: 'peacebloom_cluster',
    name: 'Peacebloom Cluster',
    nodeType: 'herb_patch',
    gatherProfession: 'herbalism',
    levelRequired: 1,
    materials: [{ materialId: 'peacebloom', weight: 100, minQuantity: 1, maxQuantity: 3 }],
    capacity: 4,
    respawnTime: 240,
    toolRequired: 'herbalism_kit',
    hidden: false,
    shortDesc: 'a cluster of peacebloom',
    longDesc: 'Small white flowers with a calming fragrance bloom here.',
  },

  earthroot_growth: {
    id: 'earthroot_growth',
    name: 'Earthroot Growth',
    nodeType: 'herb_patch',
    gatherProfession: 'herbalism',
    levelRequired: 10,
    materials: [{ materialId: 'earthroot', weight: 100, minQuantity: 1, maxQuantity: 2 }],
    capacity: 3,
    respawnTime: 360, // 6 minutes
    toolRequired: 'herbalism_kit',
    hidden: false,
    shortDesc: 'some earthroot',
    longDesc: 'Gnarled brown roots protrude from the soil here.',
  },

  mageroyal_bloom: {
    id: 'mageroyal_bloom',
    name: 'Mageroyal Bloom',
    nodeType: 'herb_patch',
    gatherProfession: 'herbalism',
    levelRequired: 25,
    materials: [{ materialId: 'mageroyal', weight: 100, minQuantity: 1, maxQuantity: 2 }],
    capacity: 3,
    respawnTime: 480, // 8 minutes
    toolRequired: 'herbalism_kit',
    hidden: false,
    shortDesc: 'a mageroyal plant',
    longDesc: 'Purple flowers with magical properties grow here.',
  },

  kingsblood_bush: {
    id: 'kingsblood_bush',
    name: 'Kingsblood Bush',
    nodeType: 'herb_patch',
    gatherProfession: 'herbalism',
    levelRequired: 35,
    materials: [{ materialId: 'kingsblood', weight: 100, minQuantity: 1, maxQuantity: 2 }],
    capacity: 2,
    respawnTime: 600, // 10 minutes
    toolRequired: 'herbalism_kit',
    hidden: false,
    shortDesc: 'a kingsblood bush',
    longDesc: 'Red-flowering plants reputed to enhance strength grow here.',
  },

  fadeleaf_shroud: {
    id: 'fadeleaf_shroud',
    name: 'Fadeleaf Shroud',
    nodeType: 'herb_patch',
    gatherProfession: 'herbalism',
    levelRequired: 50,
    materials: [{ materialId: 'fadeleaf', weight: 100, minQuantity: 1, maxQuantity: 2 }],
    capacity: 2,
    respawnTime: 720, // 12 minutes
    toolRequired: 'herbalism_kit',
    hidden: true,
    discoverLevel: 45,
    shortDesc: 'some fadeleaf',
    longDesc: 'Ghostly pale herbs that seem to shimmer and fade from view.',
  },

  goldthorn_thicket: {
    id: 'goldthorn_thicket',
    name: 'Goldthorn Thicket',
    nodeType: 'herb_patch',
    gatherProfession: 'herbalism',
    levelRequired: 60,
    materials: [{ materialId: 'goldthorn', weight: 100, minQuantity: 1, maxQuantity: 2 }],
    capacity: 2,
    respawnTime: 900, // 15 minutes
    toolRequired: 'herbalism_kit',
    hidden: true,
    discoverLevel: 55,
    shortDesc: 'a goldthorn thicket',
    longDesc: 'Golden-petaled flowers with thorny stems grow in a small thicket.',
  },

  // ========== Logging Nodes ==========

  oak_tree: {
    id: 'oak_tree',
    name: 'Oak Tree',
    nodeType: 'tree',
    gatherProfession: 'logging',
    levelRequired: 1,
    materials: [{ materialId: 'oak_log', weight: 100, minQuantity: 2, maxQuantity: 4 }],
    capacity: 3,
    respawnTime: 600, // 10 minutes
    toolRequired: 'logging_axe',
    hidden: false,
    shortDesc: 'an oak tree',
    longDesc: 'A sturdy oak tree with a thick trunk.',
  },

  ash_tree: {
    id: 'ash_tree',
    name: 'Ash Tree',
    nodeType: 'tree',
    gatherProfession: 'logging',
    levelRequired: 25,
    materials: [{ materialId: 'ash_log', weight: 100, minQuantity: 2, maxQuantity: 4 }],
    capacity: 3,
    respawnTime: 720, // 12 minutes
    toolRequired: 'logging_axe',
    hidden: false,
    shortDesc: 'an ash tree',
    longDesc: 'A tall ash tree with smooth gray bark.',
  },

  ironwood_tree: {
    id: 'ironwood_tree',
    name: 'Ironwood Tree',
    nodeType: 'tree',
    gatherProfession: 'logging',
    levelRequired: 50,
    materials: [{ materialId: 'ironwood_log', weight: 100, minQuantity: 1, maxQuantity: 3 }],
    capacity: 2,
    respawnTime: 1200, // 20 minutes
    toolRequired: 'logging_axe',
    hidden: false,
    shortDesc: 'an ironwood tree',
    longDesc: 'A dark-barked ironwood tree, its wood nearly as hard as metal.',
  },

  // ========== Fishing Nodes ==========

  pond_fishing: {
    id: 'pond_fishing',
    name: 'Quiet Pond',
    nodeType: 'fishing_spot',
    gatherProfession: 'fishing',
    levelRequired: 1,
    materials: [{ materialId: 'small_fish', weight: 100, minQuantity: 1, maxQuantity: 2 }],
    capacity: 10,
    respawnTime: 120, // 2 minutes
    toolRequired: 'fishing_rod',
    hidden: false,
    shortDesc: 'a quiet pond',
    longDesc: 'A calm pond where small fish can be seen swimming.',
  },

  river_fishing: {
    id: 'river_fishing',
    name: 'River Bend',
    nodeType: 'fishing_spot',
    gatherProfession: 'fishing',
    levelRequired: 10,
    materials: [
      { materialId: 'small_fish', weight: 40, minQuantity: 1, maxQuantity: 2 },
      { materialId: 'trout', weight: 60, minQuantity: 1, maxQuantity: 1 },
    ],
    capacity: 8,
    respawnTime: 180, // 3 minutes
    toolRequired: 'fishing_rod',
    hidden: false,
    shortDesc: 'a river bend',
    longDesc: 'A bend in the river where fish gather in the slower current.',
  },

  deep_pool_fishing: {
    id: 'deep_pool_fishing',
    name: 'Deep Pool',
    nodeType: 'fishing_spot',
    gatherProfession: 'fishing',
    levelRequired: 25,
    materials: [
      { materialId: 'trout', weight: 50, minQuantity: 1, maxQuantity: 2 },
      { materialId: 'salmon', weight: 50, minQuantity: 1, maxQuantity: 1 },
    ],
    capacity: 6,
    respawnTime: 300, // 5 minutes
    toolRequired: 'fishing_rod',
    hidden: false,
    shortDesc: 'a deep pool',
    longDesc: 'A deep pool of clear water, home to larger fish.',
  },

  coastal_fishing: {
    id: 'coastal_fishing',
    name: 'Coastal Waters',
    nodeType: 'fishing_spot',
    gatherProfession: 'fishing',
    levelRequired: 45,
    materials: [
      { materialId: 'salmon', weight: 60, minQuantity: 1, maxQuantity: 2 },
      { materialId: 'lobster', weight: 40, minQuantity: 1, maxQuantity: 1 },
    ],
    capacity: 5,
    respawnTime: 420, // 7 minutes
    toolRequired: 'fishing_rod',
    hidden: false,
    shortDesc: 'coastal waters',
    longDesc: 'The waters near the coast teem with marine life.',
  },

  // ========== Skinning Nodes (Corpse-based) ==========
  // Note: Skinning nodes are typically created dynamically from corpses
  // These are templates for what can be skinned from different creature types

  small_beast_corpse: {
    id: 'small_beast_corpse',
    name: 'Small Beast',
    nodeType: 'corpse',
    gatherProfession: 'skinning',
    levelRequired: 1,
    materials: [
      { materialId: 'ruined_leather', weight: 30, minQuantity: 1, maxQuantity: 1 },
      { materialId: 'light_leather', weight: 70, minQuantity: 1, maxQuantity: 2 },
    ],
    capacity: 1,
    respawnTime: 0, // Corpses don't respawn
    toolRequired: 'skinning_knife',
    hidden: false,
    shortDesc: 'a small beast corpse',
    longDesc: 'The corpse of a small beast that can be skinned for leather.',
  },

  medium_beast_corpse: {
    id: 'medium_beast_corpse',
    name: 'Medium Beast',
    nodeType: 'corpse',
    gatherProfession: 'skinning',
    levelRequired: 25,
    materials: [
      { materialId: 'light_leather', weight: 30, minQuantity: 1, maxQuantity: 2 },
      { materialId: 'medium_leather', weight: 70, minQuantity: 1, maxQuantity: 3 },
    ],
    capacity: 1,
    respawnTime: 0,
    toolRequired: 'skinning_knife',
    hidden: false,
    shortDesc: 'a medium beast corpse',
    longDesc: 'The corpse of a medium-sized beast with usable hide.',
  },

  large_beast_corpse: {
    id: 'large_beast_corpse',
    name: 'Large Beast',
    nodeType: 'corpse',
    gatherProfession: 'skinning',
    levelRequired: 40,
    materials: [
      { materialId: 'medium_leather', weight: 40, minQuantity: 1, maxQuantity: 2 },
      { materialId: 'heavy_leather', weight: 60, minQuantity: 1, maxQuantity: 3 },
    ],
    capacity: 1,
    respawnTime: 0,
    toolRequired: 'skinning_knife',
    hidden: false,
    shortDesc: 'a large beast corpse',
    longDesc: 'The corpse of a large beast with thick, valuable hide.',
  },

  elite_beast_corpse: {
    id: 'elite_beast_corpse',
    name: 'Elite Beast',
    nodeType: 'corpse',
    gatherProfession: 'skinning',
    levelRequired: 55,
    materials: [
      { materialId: 'heavy_leather', weight: 40, minQuantity: 2, maxQuantity: 3 },
      { materialId: 'thick_leather', weight: 60, minQuantity: 1, maxQuantity: 2 },
    ],
    capacity: 1,
    respawnTime: 0,
    toolRequired: 'skinning_knife',
    hidden: false,
    shortDesc: 'an elite beast corpse',
    longDesc: 'The corpse of a powerful beast with exceptional hide.',
  },
};

/**
 * Get resource node definition by ID.
 */
export function getResourceNode(id: string): ResourceNodeDefinition | undefined {
  return RESOURCE_NODE_DEFINITIONS[id];
}

/**
 * Get all resource nodes for a profession.
 */
export function getResourceNodesByProfession(professionId: string): ResourceNodeDefinition[] {
  return Object.values(RESOURCE_NODE_DEFINITIONS).filter(
    (n) => n.gatherProfession === professionId
  );
}

/**
 * Get all resource nodes of a specific type.
 */
export function getResourceNodesByType(nodeType: string): ResourceNodeDefinition[] {
  return Object.values(RESOURCE_NODE_DEFINITIONS).filter((n) => n.nodeType === nodeType);
}
