/**
 * Random Loot Generator Tables
 *
 * Contains all name generation data: materials, prefixes, suffixes,
 * and unique item configurations.
 */

import type {
  WeaponType,
  ArmorType,
  BaubleType,
  QualityTier,
  MaterialConfig,
  SuffixConfig,
  UniqueItemConfig,
  WeaponTypeConfig,
  ArmorTypeConfig,
  BaubleTypeConfig,
} from './types.js';

// ============================================================================
// Weapon Type Configurations
// ============================================================================

export const WEAPON_TYPES: Record<WeaponType, WeaponTypeConfig> = {
  // One-handed weapons
  sword: {
    baseName: 'Sword',
    handedness: 'one_handed',
    damageType: 'slashing',
    damageMultiplier: 1.0,
    attackSpeed: 0,
    size: 'medium',
  },
  longsword: {
    baseName: 'Longsword',
    handedness: 'one_handed',
    damageType: 'slashing',
    damageMultiplier: 1.1,
    attackSpeed: -0.1,
    size: 'medium',
  },
  axe: {
    baseName: 'Axe',
    handedness: 'one_handed',
    damageType: 'slashing',
    damageMultiplier: 1.15,
    attackSpeed: -0.15,
    size: 'medium',
  },
  mace: {
    baseName: 'Mace',
    handedness: 'one_handed',
    damageType: 'bludgeoning',
    damageMultiplier: 1.1,
    attackSpeed: -0.1,
    size: 'medium',
  },
  hammer: {
    baseName: 'Hammer',
    handedness: 'one_handed',
    damageType: 'bludgeoning',
    damageMultiplier: 1.2,
    attackSpeed: -0.2,
    size: 'medium',
  },
  flail: {
    baseName: 'Flail',
    handedness: 'one_handed',
    damageType: 'bludgeoning',
    damageMultiplier: 1.1,
    attackSpeed: -0.15,
    size: 'medium',
  },
  scimitar: {
    baseName: 'Scimitar',
    handedness: 'one_handed',
    damageType: 'slashing',
    damageMultiplier: 0.95,
    attackSpeed: 0.1,
    size: 'medium',
  },

  // Light weapons (dual-wield capable)
  shortsword: {
    baseName: 'Shortsword',
    handedness: 'light',
    damageType: 'slashing',
    damageMultiplier: 0.85,
    attackSpeed: 0.15,
    size: 'small',
  },
  dagger: {
    baseName: 'Dagger',
    handedness: 'light',
    damageType: 'piercing',
    damageMultiplier: 0.7,
    attackSpeed: 0.25,
    size: 'small',
  },
  knife: {
    baseName: 'Knife',
    handedness: 'light',
    damageType: 'piercing',
    damageMultiplier: 0.6,
    attackSpeed: 0.3,
    size: 'small',
  },
  hatchet: {
    baseName: 'Hatchet',
    handedness: 'light',
    damageType: 'slashing',
    damageMultiplier: 0.8,
    attackSpeed: 0.1,
    size: 'small',
  },
  rapier: {
    baseName: 'Rapier',
    handedness: 'light',
    damageType: 'piercing',
    damageMultiplier: 0.9,
    attackSpeed: 0.15,
    size: 'small',
  },

  // Two-handed weapons
  greatsword: {
    baseName: 'Greatsword',
    handedness: 'two_handed',
    damageType: 'slashing',
    damageMultiplier: 1.5,
    attackSpeed: -0.25,
    size: 'large',
  },
  greataxe: {
    baseName: 'Greataxe',
    handedness: 'two_handed',
    damageType: 'slashing',
    damageMultiplier: 1.6,
    attackSpeed: -0.3,
    size: 'large',
  },
  warhammer: {
    baseName: 'Warhammer',
    handedness: 'two_handed',
    damageType: 'bludgeoning',
    damageMultiplier: 1.7,
    attackSpeed: -0.35,
    size: 'large',
  },
  staff: {
    baseName: 'Staff',
    handedness: 'two_handed',
    damageType: 'bludgeoning',
    damageMultiplier: 1.0,
    attackSpeed: 0,
    size: 'large',
  },
  quarterstaff: {
    baseName: 'Quarterstaff',
    handedness: 'two_handed',
    damageType: 'bludgeoning',
    damageMultiplier: 1.1,
    attackSpeed: 0.1,
    size: 'large',
  },
  spear: {
    baseName: 'Spear',
    handedness: 'two_handed',
    damageType: 'piercing',
    damageMultiplier: 1.3,
    attackSpeed: -0.1,
    size: 'large',
  },
  halberd: {
    baseName: 'Halberd',
    handedness: 'two_handed',
    damageType: 'slashing',
    damageMultiplier: 1.55,
    attackSpeed: -0.3,
    size: 'large',
  },
  bow: {
    baseName: 'Bow',
    handedness: 'two_handed',
    damageType: 'piercing',
    damageMultiplier: 1.2,
    attackSpeed: 0,
    size: 'medium',
  },
  crossbow: {
    baseName: 'Crossbow',
    handedness: 'two_handed',
    damageType: 'piercing',
    damageMultiplier: 1.4,
    attackSpeed: -0.3,
    size: 'medium',
  },
};

// ============================================================================
// Armor Type Configurations
// ============================================================================

export const ARMOR_TYPES: Record<ArmorType, ArmorTypeConfig> = {
  // Head
  helm: {
    baseName: 'Helm',
    slot: 'head',
    armorMultiplier: 1.0,
    weightClass: 'heavy',
    size: 'medium',
  },
  cap: {
    baseName: 'Cap',
    slot: 'head',
    armorMultiplier: 0.6,
    weightClass: 'light',
    size: 'small',
  },
  hood: {
    baseName: 'Hood',
    slot: 'head',
    armorMultiplier: 0.4,
    weightClass: 'light',
    size: 'small',
  },
  crown: {
    baseName: 'Crown',
    slot: 'head',
    armorMultiplier: 0.5,
    weightClass: 'light',
    size: 'small',
  },

  // Chest
  plate: {
    baseName: 'Plate',
    slot: 'chest',
    armorMultiplier: 1.0,
    weightClass: 'heavy',
    size: 'large',
  },
  chainmail: {
    baseName: 'Chainmail',
    slot: 'chest',
    armorMultiplier: 0.75,
    weightClass: 'medium',
    size: 'medium',
  },
  leather: {
    baseName: 'Leather Armor',
    slot: 'chest',
    armorMultiplier: 0.5,
    weightClass: 'light',
    size: 'medium',
  },
  robe: {
    baseName: 'Robe',
    slot: 'chest',
    armorMultiplier: 0.25,
    weightClass: 'light',
    size: 'medium',
  },

  // Hands
  gauntlets: {
    baseName: 'Gauntlets',
    slot: 'hands',
    armorMultiplier: 1.0,
    weightClass: 'heavy',
    size: 'small',
  },
  gloves: {
    baseName: 'Gloves',
    slot: 'hands',
    armorMultiplier: 0.5,
    weightClass: 'light',
    size: 'small',
  },
  bracers: {
    baseName: 'Bracers',
    slot: 'hands',
    armorMultiplier: 0.7,
    weightClass: 'medium',
    size: 'small',
  },

  // Legs
  greaves: {
    baseName: 'Greaves',
    slot: 'legs',
    armorMultiplier: 1.0,
    weightClass: 'heavy',
    size: 'medium',
  },
  pants: {
    baseName: 'Pants',
    slot: 'legs',
    armorMultiplier: 0.4,
    weightClass: 'light',
    size: 'medium',
  },
  legguards: {
    baseName: 'Legguards',
    slot: 'legs',
    armorMultiplier: 0.7,
    weightClass: 'medium',
    size: 'medium',
  },

  // Feet
  boots: {
    baseName: 'Boots',
    slot: 'feet',
    armorMultiplier: 1.0,
    weightClass: 'medium',
    size: 'small',
  },
  sandals: {
    baseName: 'Sandals',
    slot: 'feet',
    armorMultiplier: 0.3,
    weightClass: 'light',
    size: 'small',
  },
  shoes: {
    baseName: 'Shoes',
    slot: 'feet',
    armorMultiplier: 0.5,
    weightClass: 'light',
    size: 'small',
  },

  // Cloak
  cloak: {
    baseName: 'Cloak',
    slot: 'cloak',
    armorMultiplier: 0.5,
    weightClass: 'light',
    size: 'medium',
  },
  cape: {
    baseName: 'Cape',
    slot: 'cloak',
    armorMultiplier: 0.3,
    weightClass: 'light',
    size: 'small',
  },
  mantle: {
    baseName: 'Mantle',
    slot: 'cloak',
    armorMultiplier: 0.6,
    weightClass: 'light',
    size: 'medium',
  },

  // Shield
  shield: {
    baseName: 'Shield',
    slot: 'shield',
    armorMultiplier: 1.0,
    weightClass: 'medium',
    size: 'medium',
  },
  buckler: {
    baseName: 'Buckler',
    slot: 'shield',
    armorMultiplier: 0.6,
    weightClass: 'light',
    size: 'small',
  },
  tower_shield: {
    baseName: 'Tower Shield',
    slot: 'shield',
    armorMultiplier: 1.4,
    weightClass: 'heavy',
    size: 'large',
  },
};

// ============================================================================
// Bauble Type Configurations
// ============================================================================

export const BAUBLE_TYPES: Record<BaubleType, BaubleTypeConfig> = {
  // Jewelry
  ring: {
    baseName: 'Ring',
    valueMultiplier: 2.0,
    size: 'tiny',
  },
  amulet: {
    baseName: 'Amulet',
    valueMultiplier: 2.5,
    size: 'tiny',
  },
  necklace: {
    baseName: 'Necklace',
    valueMultiplier: 2.3,
    size: 'tiny',
  },
  pendant: {
    baseName: 'Pendant',
    valueMultiplier: 2.2,
    size: 'tiny',
  },

  // Gems
  gem: {
    baseName: 'Gem',
    valueMultiplier: 3.0,
    size: 'tiny',
  },
  gemstone: {
    baseName: 'Gemstone',
    valueMultiplier: 3.5,
    size: 'tiny',
  },
  jewel: {
    baseName: 'Jewel',
    valueMultiplier: 4.0,
    size: 'tiny',
  },

  // Trinkets
  trinket: {
    baseName: 'Trinket',
    valueMultiplier: 1.5,
    size: 'small',
  },
  charm: {
    baseName: 'Charm',
    valueMultiplier: 1.8,
    size: 'tiny',
  },
  token: {
    baseName: 'Token',
    valueMultiplier: 1.3,
    size: 'tiny',
  },
  figurine: {
    baseName: 'Figurine',
    valueMultiplier: 2.0,
    size: 'small',
  },
};

// ============================================================================
// Materials by Quality Tier
// ============================================================================

export const MATERIALS: MaterialConfig[] = [
  // Common materials
  { name: 'Iron', quality: 'common', statMultiplier: 1.0, valueMultiplier: 1.0 },
  { name: 'Bronze', quality: 'common', statMultiplier: 0.9, valueMultiplier: 0.9 },
  { name: 'Copper', quality: 'common', statMultiplier: 0.85, valueMultiplier: 0.8 },
  { name: 'Wooden', quality: 'common', statMultiplier: 0.7, valueMultiplier: 0.6 },
  { name: 'Bone', quality: 'common', statMultiplier: 0.75, valueMultiplier: 0.7 },

  // Uncommon materials
  { name: 'Steel', quality: 'uncommon', statMultiplier: 1.1, valueMultiplier: 1.5 },
  { name: 'Hardened', quality: 'uncommon', statMultiplier: 1.15, valueMultiplier: 1.4 },
  { name: 'Tempered', quality: 'uncommon', statMultiplier: 1.1, valueMultiplier: 1.3 },
  { name: 'Refined', quality: 'uncommon', statMultiplier: 1.05, valueMultiplier: 1.2 },
  { name: 'Reinforced', quality: 'uncommon', statMultiplier: 1.1, valueMultiplier: 1.35 },

  // Rare materials
  { name: 'Mithril', quality: 'rare', statMultiplier: 1.2, valueMultiplier: 2.0 },
  { name: 'Elven', quality: 'rare', statMultiplier: 1.15, valueMultiplier: 2.2 },
  { name: 'Dwarven', quality: 'rare', statMultiplier: 1.25, valueMultiplier: 2.1 },
  { name: 'Silver', quality: 'rare', statMultiplier: 1.1, valueMultiplier: 2.5 },
  { name: 'Enchanted', quality: 'rare', statMultiplier: 1.2, valueMultiplier: 2.3 },

  // Epic materials
  { name: 'Dragonbone', quality: 'epic', statMultiplier: 1.35, valueMultiplier: 3.0 },
  { name: 'Adamantine', quality: 'epic', statMultiplier: 1.4, valueMultiplier: 3.5 },
  { name: 'Orichalcum', quality: 'epic', statMultiplier: 1.35, valueMultiplier: 3.2 },
  { name: 'Runesteel', quality: 'epic', statMultiplier: 1.3, valueMultiplier: 3.3 },
  { name: 'Starmetal', quality: 'epic', statMultiplier: 1.35, valueMultiplier: 3.4 },

  // Legendary materials
  { name: 'Celestial', quality: 'legendary', statMultiplier: 1.5, valueMultiplier: 5.0 },
  { name: 'Voidforged', quality: 'legendary', statMultiplier: 1.55, valueMultiplier: 5.5 },
  { name: 'Primordial', quality: 'legendary', statMultiplier: 1.5, valueMultiplier: 5.2 },
  { name: 'Divine', quality: 'legendary', statMultiplier: 1.6, valueMultiplier: 6.0 },
  { name: 'Ethereal', quality: 'legendary', statMultiplier: 1.45, valueMultiplier: 4.8 },
];

// ============================================================================
// Suffixes for Rare+ Items
// ============================================================================

export const STAT_SUFFIXES: SuffixConfig[] = [
  // Strength
  { name: 'of Might', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { strength: 3 } },
  { name: 'of the Bear', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { strength: 2, constitution: 1 } },
  { name: 'of the Giant', qualityTiers: ['epic', 'legendary'], statBonuses: { strength: 5 } },

  // Dexterity
  { name: 'of Agility', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { dexterity: 3 } },
  { name: 'of the Cat', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { dexterity: 2, luck: 1 } },
  { name: 'of the Wind', qualityTiers: ['epic', 'legendary'], statBonuses: { dexterity: 5 } },

  // Intelligence
  { name: 'of Intellect', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { intelligence: 3 } },
  { name: 'of the Sage', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { intelligence: 2, wisdom: 1 } },
  { name: 'of the Mind', qualityTiers: ['epic', 'legendary'], statBonuses: { intelligence: 5 } },

  // Wisdom
  { name: 'of Insight', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { wisdom: 3 } },
  { name: 'of the Owl', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { wisdom: 2, intelligence: 1 } },
  { name: 'of Enlightenment', qualityTiers: ['epic', 'legendary'], statBonuses: { wisdom: 5 } },

  // Constitution
  { name: 'of Vitality', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { constitution: 3 } },
  { name: 'of the Ox', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { constitution: 2, strength: 1 } },
  { name: 'of Fortitude', qualityTiers: ['epic', 'legendary'], statBonuses: { constitution: 5 } },

  // Charisma
  { name: 'of Charm', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { charisma: 3 } },
  { name: 'of Leadership', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { charisma: 2, wisdom: 1 } },
  { name: 'of the King', qualityTiers: ['epic', 'legendary'], statBonuses: { charisma: 5 } },

  // Luck
  { name: 'of Fortune', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { luck: 3 } },
  { name: 'of the Gambler', qualityTiers: ['rare', 'epic', 'legendary'], statBonuses: { luck: 2, charisma: 1 } },
  { name: 'of Destiny', qualityTiers: ['epic', 'legendary'], statBonuses: { luck: 5 } },

  // Multi-stat
  { name: 'of the Warrior', qualityTiers: ['epic', 'legendary'], statBonuses: { strength: 2, constitution: 2, dexterity: 1 } },
  { name: 'of the Mage', qualityTiers: ['epic', 'legendary'], statBonuses: { intelligence: 2, wisdom: 2, charisma: 1 } },
  { name: 'of the Rogue', qualityTiers: ['epic', 'legendary'], statBonuses: { dexterity: 2, luck: 2, charisma: 1 } },
  { name: 'of Balance', qualityTiers: ['legendary'], statBonuses: { strength: 1, dexterity: 1, intelligence: 1, wisdom: 1, constitution: 1, charisma: 1, luck: 1 } },
];

export const EFFECT_SUFFIXES: SuffixConfig[] = [
  // Combat bonuses
  { name: 'of Precision', qualityTiers: ['rare', 'epic', 'legendary'], combatBonuses: { toHit: 5 } },
  { name: 'of Evasion', qualityTiers: ['rare', 'epic', 'legendary'], combatBonuses: { toDodge: 5 } },
  { name: 'of Swiftness', qualityTiers: ['rare', 'epic', 'legendary'], combatBonuses: { attackSpeed: 0.1 } },
  { name: 'of Warding', qualityTiers: ['rare', 'epic', 'legendary'], combatBonuses: { armorBonus: 3 } },
  { name: 'of Blocking', qualityTiers: ['rare', 'epic', 'legendary'], combatBonuses: { toBlock: 5 } },
  { name: 'of Striking', qualityTiers: ['rare', 'epic', 'legendary'], combatBonuses: { damageBonus: 3 } },
  { name: 'of Devastation', qualityTiers: ['epic', 'legendary'], combatBonuses: { toCritical: 5 } },

  // Strong versions
  { name: 'of the Assassin', qualityTiers: ['epic', 'legendary'], combatBonuses: { toHit: 8, toCritical: 5 } },
  { name: 'of the Duelist', qualityTiers: ['epic', 'legendary'], combatBonuses: { toDodge: 8, attackSpeed: 0.1 } },
  { name: 'of the Guardian', qualityTiers: ['epic', 'legendary'], combatBonuses: { toBlock: 10, armorBonus: 5 } },
];

// ============================================================================
// Unique Items
// ============================================================================

export const UNIQUE_ITEMS: UniqueItemConfig[] = [
  // Unique Weapons
  {
    title: 'Shadowfang',
    subtitle: 'Blade of the Void',
    type: 'weapon',
    subtype: 'dagger',
    itemLevel: 45,
    description: 'A dagger forged from crystallized shadow, it seems to drink in light around it.',
    statBonuses: { dexterity: 5, luck: 3 },
    combatBonuses: { toCritical: 10, attackSpeed: 0.2 },
    abilities: [
      {
        id: 'shadow_strike',
        name: 'Shadow Strike',
        trigger: 'on_hit',
        description: '20% chance to deal bonus dark damage',
        chance: 20,
        magnitude: 15,
        damageType: 'dark',
      },
    ],
  },
  {
    title: 'Doombringer',
    subtitle: 'Sledgehammer of Darkness',
    type: 'weapon',
    subtype: 'warhammer',
    itemLevel: 48,
    description: 'This massive hammer pulses with malevolent energy. Those struck by it feel their soul being crushed.',
    statBonuses: { strength: 7, constitution: 3 },
    combatBonuses: { damageBonus: 8, toCritical: 5 },
    abilities: [
      {
        id: 'doom',
        name: 'Doom',
        trigger: 'on_hit',
        description: '15% chance to terrify the enemy, reducing their damage',
        chance: 15,
        magnitude: 20,
        duration: 10000,
        effectType: 'debuff',
      },
    ],
  },
  {
    title: 'Sunblade',
    subtitle: 'Sword of the Dawn',
    type: 'weapon',
    subtype: 'longsword',
    itemLevel: 46,
    description: 'This radiant blade glows with holy light, anathema to the undead and creatures of darkness.',
    statBonuses: { strength: 4, charisma: 4 },
    combatBonuses: { toHit: 5, damageBonus: 5 },
    abilities: [
      {
        id: 'radiant_strike',
        name: 'Radiant Strike',
        trigger: 'on_hit',
        description: '25% chance to deal holy damage and blind enemies briefly',
        chance: 25,
        magnitude: 12,
        damageType: 'holy',
      },
    ],
  },
  {
    title: 'Frostmourne',
    subtitle: 'Blade of the Frozen Throne',
    type: 'weapon',
    subtype: 'greatsword',
    itemLevel: 50,
    description: 'An ancient blade encased in eternal ice. Its touch brings the cold of death itself.',
    statBonuses: { strength: 6, intelligence: 4 },
    combatBonuses: { damageBonus: 10 },
    abilities: [
      {
        id: 'frost_strike',
        name: 'Frozen Strike',
        trigger: 'on_hit',
        description: '30% chance to slow enemy and deal ice damage',
        chance: 30,
        magnitude: 10,
        duration: 5000,
        damageType: 'ice',
        effectType: 'slow',
      },
    ],
  },

  // Unique Armor
  {
    title: 'Aegis of the Immortal',
    subtitle: 'Shield of Eternal Defense',
    type: 'armor',
    subtype: 'tower_shield',
    itemLevel: 47,
    description: 'Legends say this shield was wielded by an immortal guardian who never fell in battle.',
    statBonuses: { constitution: 6, strength: 2 },
    combatBonuses: { toBlock: 15, armorBonus: 8 },
    abilities: [
      {
        id: 'immortal_guard',
        name: 'Immortal Guard',
        trigger: 'on_equip',
        description: 'Occasionally absorbs lethal damage',
        magnitude: 1,
      },
    ],
  },
  {
    title: 'Nightshroud',
    subtitle: 'Cloak of Shadows',
    type: 'armor',
    subtype: 'cloak',
    itemLevel: 44,
    description: 'Woven from threads of pure darkness, this cloak makes the wearer nearly invisible.',
    statBonuses: { dexterity: 5, luck: 3 },
    combatBonuses: { toDodge: 12 },
    abilities: [
      {
        id: 'shadow_veil',
        name: 'Shadow Veil',
        trigger: 'on_equip',
        description: 'Increases stealth effectiveness',
        magnitude: 20,
      },
    ],
  },
  {
    title: 'Dragonheart Plate',
    subtitle: 'Armor of the Dragon Kings',
    type: 'armor',
    subtype: 'plate',
    itemLevel: 49,
    description: 'Forged from the scales of an ancient dragon, this armor radiates primal power.',
    statBonuses: { strength: 4, constitution: 6 },
    combatBonuses: { armorBonus: 12, damageBonus: 4 },
    abilities: [
      {
        id: 'dragon_scales',
        name: 'Dragon Scales',
        trigger: 'on_equip',
        description: 'Grants resistance to fire and physical damage',
        magnitude: 15,
      },
    ],
  },

  // Unique Baubles
  {
    title: 'Heart of the Mountain',
    subtitle: 'Gem of Dwarven Kings',
    type: 'bauble',
    subtype: 'gem',
    itemLevel: 45,
    description: 'A massive gem that pulses with the heartbeat of the earth itself.',
    statBonuses: { constitution: 8, strength: 4 },
  },
  {
    title: 'Serpent\'s Eye',
    subtitle: 'Amulet of Venom',
    type: 'bauble',
    subtype: 'amulet',
    itemLevel: 43,
    description: 'A jade serpent coils around a glowing emerald. Its gaze brings death.',
    statBonuses: { dexterity: 4, luck: 4 },
    abilities: [
      {
        id: 'venom_touch',
        name: 'Venom Touch',
        trigger: 'on_hit',
        description: '20% chance to poison enemies on attack',
        chance: 20,
        magnitude: 8,
        duration: 8000,
        damageType: 'poison',
        effectType: 'poison',
      },
    ],
  },
  {
    title: 'Luck of the Fool',
    subtitle: 'Ring of Fortune',
    type: 'bauble',
    subtype: 'ring',
    itemLevel: 40,
    description: 'This seemingly worthless brass ring has an uncanny ability to turn luck in the wearer\'s favor.',
    statBonuses: { luck: 10, charisma: 2 },
    combatBonuses: { toCritical: 8 },
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get materials for a specific quality tier.
 */
export function getMaterialsForQuality(quality: QualityTier): MaterialConfig[] {
  return MATERIALS.filter((m) => m.quality === quality);
}

/**
 * Get a random material for a quality tier.
 */
export function getRandomMaterial(quality: QualityTier, random: () => number): MaterialConfig {
  const materials = getMaterialsForQuality(quality);
  if (materials.length === 0) {
    // Fallback to common if no materials for this tier
    const commonMaterials = getMaterialsForQuality('common');
    return commonMaterials[Math.floor(random() * commonMaterials.length)];
  }
  return materials[Math.floor(random() * materials.length)];
}

/**
 * Get suffixes available for a quality tier.
 */
export function getSuffixesForQuality(quality: QualityTier, effectBased: boolean = false): SuffixConfig[] {
  const suffixes = effectBased ? EFFECT_SUFFIXES : STAT_SUFFIXES;
  return suffixes.filter((s) => s.qualityTiers.includes(quality));
}

/**
 * Get a random suffix for a quality tier.
 */
export function getRandomSuffix(quality: QualityTier, effectBased: boolean, random: () => number): SuffixConfig | null {
  const suffixes = getSuffixesForQuality(quality, effectBased);
  if (suffixes.length === 0) return null;
  return suffixes[Math.floor(random() * suffixes.length)];
}

/**
 * Get a random unique item matching criteria.
 */
export function getRandomUniqueItem(
  type?: 'weapon' | 'armor' | 'bauble',
  random: () => number = Math.random
): UniqueItemConfig | null {
  let candidates = UNIQUE_ITEMS;
  if (type) {
    candidates = candidates.filter((u) => u.type === type);
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(random() * candidates.length)];
}

/**
 * Get weapon types by handedness.
 */
export function getWeaponTypesByHandedness(handedness: 'one_handed' | 'light' | 'two_handed'): WeaponType[] {
  return (Object.entries(WEAPON_TYPES) as [WeaponType, WeaponTypeConfig][])
    .filter(([, config]) => config.handedness === handedness)
    .map(([type]) => type);
}

/**
 * Get armor types by slot.
 */
export function getArmorTypesBySlot(slot: 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'cloak' | 'shield'): ArmorType[] {
  return (Object.entries(ARMOR_TYPES) as [ArmorType, ArmorTypeConfig][])
    .filter(([, config]) => config.slot === slot)
    .map(([type]) => type);
}
