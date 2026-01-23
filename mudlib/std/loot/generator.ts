/**
 * Random Loot Generator Core
 *
 * Main generator class that creates random weapons, armor, and baubles
 * based on quality tiers, item level, and special abilities.
 */

import type {
  QualityTier,
  WeaponType,
  ArmorType,
  BaubleType,
  GeneratedItemData,
  GeneratedItemType,
  MaterialConfig,
  SuffixConfig,
  UniqueItemConfig,
} from './types.js';
import type { StatName } from '../living.js';
import type { CombatStatName } from '../combat/types.js';
import type { ArmorSlot } from '../armor.js';

import { rollQuality, getQualityConfig, formatItemName, forceQuality } from './quality.js';
import {
  WEAPON_TYPES,
  ARMOR_TYPES,
  BAUBLE_TYPES,
  getRandomMaterial,
  getRandomSuffix,
  getRandomUniqueItem,
} from './tables.js';
import { selectAbilities } from './abilities.js';

/**
 * Seeded random number generator using a simple LCG.
 */
class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    // Convert string seed to number using simple hash
    this.seed = 0;
    for (let i = 0; i < seed.length; i++) {
      this.seed = ((this.seed << 5) - this.seed + seed.charCodeAt(i)) | 0;
    }
    if (this.seed === 0) this.seed = 1;
  }

  next(): number {
    // LCG parameters
    this.seed = (this.seed * 1664525 + 1013904223) | 0;
    return (this.seed >>> 0) / 0x100000000;
  }
}

/**
 * Generate a unique seed string.
 */
export function generateSeed(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Loot Generator class.
 * Handles all random item generation logic.
 */
export class LootGenerator {
  private random: () => number;
  private seed: string;

  constructor(seed?: string) {
    this.seed = seed || generateSeed();
    const seededRandom = new SeededRandom(this.seed);
    this.random = () => seededRandom.next();
  }

  /**
   * Get the seed used for this generator.
   */
  getSeed(): string {
    return this.seed;
  }

  /**
   * Generate a random weapon.
   * @param itemLevel The level of the item
   * @param maxQuality Maximum quality tier (or forced quality if forcedQuality is true)
   * @param weaponType Optional specific weapon type
   * @param forcedQuality If true, maxQuality becomes the exact quality (for admin testing)
   */
  generateWeapon(
    itemLevel: number,
    maxQuality: QualityTier = 'legendary',
    weaponType?: WeaponType,
    forcedQuality: boolean = false
  ): GeneratedItemData {
    // Roll or force quality
    const quality = forcedQuality
      ? forceQuality(maxQuality)
      : rollQuality(itemLevel, maxQuality, 0, this.random);
    const qualityConfig = getQualityConfig(quality);

    // Check for unique roll
    if (quality === 'legendary' && this.random() < 0.01) {
      const unique = getRandomUniqueItem('weapon', this.random);
      if (unique && unique.subtype && unique.subtype in WEAPON_TYPES) {
        return this.createUniqueWeapon(unique);
      }
    }

    // Select weapon type if not specified
    const selectedType = weaponType || this.selectRandomWeaponType();
    const typeConfig = WEAPON_TYPES[selectedType];

    // Get material for this quality
    const material = getRandomMaterial(quality, this.random);

    // Calculate base stats
    const baseDamage = this.calculateWeaponDamage(itemLevel, typeConfig.damageMultiplier);
    const statMultiplier = qualityConfig.statMultiplier * material.statMultiplier;

    const minDamage = Math.round(baseDamage * 0.8 * statMultiplier);
    const maxDamage = Math.round(baseDamage * 1.2 * statMultiplier);

    // Calculate other stats
    const toHit = Math.round(itemLevel * 0.2 * statMultiplier);
    const attackSpeed = typeConfig.attackSpeed;

    // Generate name
    const baseName = `${material.name} ${typeConfig.baseName}`;

    // Get suffix for rare+ items
    let suffix: SuffixConfig | null = null;
    let statBonuses: Partial<Record<StatName, number>> | undefined;
    let combatBonuses: Partial<Record<CombatStatName, number>> | undefined;

    if (qualityConfig.hasStatBonuses) {
      const useEffectSuffix = this.random() < 0.5;
      suffix = getRandomSuffix(quality, useEffectSuffix, this.random);
      if (suffix) {
        if (suffix.statBonuses) {
          statBonuses = { ...suffix.statBonuses };
        }
        if (suffix.combatBonuses) {
          combatBonuses = { ...suffix.combatBonuses };
        }
      }
    }

    // Generate full name
    const fullName = suffix
      ? `${baseName} ${suffix.name}`
      : baseName;

    // Select abilities
    const abilities = qualityConfig.hasAbilities
      ? selectAbilities('weapon', quality, itemLevel, qualityConfig.maxAbilities, this.random)
      : [];

    // Calculate value
    const baseValue = this.calculateBaseValue(itemLevel, 'weapon');
    const value = Math.round(
      baseValue * qualityConfig.valueMultiplier * material.valueMultiplier
    );

    // Calculate weight
    const weight = this.calculateWeight(typeConfig.size);

    // Generate description
    const description = this.generateWeaponDescription(
      fullName,
      quality,
      typeConfig,
      minDamage,
      maxDamage
    );

    return {
      generatedType: 'weapon',
      seed: this.seed,
      baseName,
      fullName: formatItemName(fullName, quality),
      quality,
      description,
      itemLevel,
      value,
      weight,
      weaponType: selectedType,
      minDamage,
      maxDamage,
      damageType: typeConfig.damageType,
      handedness: typeConfig.handedness,
      toHit,
      attackSpeed,
      statBonuses,
      combatBonuses,
      abilities,
    };
  }

  /**
   * Generate a random armor piece.
   * @param itemLevel The level of the item
   * @param maxQuality Maximum quality tier (or forced quality if forcedQuality is true)
   * @param armorType Optional specific armor type
   * @param targetSlot Optional specific armor slot
   * @param forcedQuality If true, maxQuality becomes the exact quality (for admin testing)
   */
  generateArmor(
    itemLevel: number,
    maxQuality: QualityTier = 'legendary',
    armorType?: ArmorType,
    targetSlot?: ArmorSlot,
    forcedQuality: boolean = false
  ): GeneratedItemData {
    // Roll or force quality
    const quality = forcedQuality
      ? forceQuality(maxQuality)
      : rollQuality(itemLevel, maxQuality, 0, this.random);
    const qualityConfig = getQualityConfig(quality);

    // Check for unique roll
    if (quality === 'legendary' && this.random() < 0.01) {
      const unique = getRandomUniqueItem('armor', this.random);
      if (unique && unique.subtype && unique.subtype in ARMOR_TYPES) {
        return this.createUniqueArmor(unique);
      }
    }

    // Select armor type if not specified
    const selectedType = armorType || this.selectRandomArmorType(targetSlot);
    const typeConfig = ARMOR_TYPES[selectedType];

    // Get material for this quality
    const material = getRandomMaterial(quality, this.random);

    // Calculate stats
    const statMultiplier = qualityConfig.statMultiplier * material.statMultiplier;
    const baseArmor = this.calculateBaseArmor(itemLevel, typeConfig.slot);
    const armor = Math.round(baseArmor * typeConfig.armorMultiplier * statMultiplier);

    // Calculate dodge/block bonuses based on weight class
    let toDodge = 0;
    let toBlock = 0;

    if (typeConfig.slot === 'shield') {
      toBlock = Math.round(5 + itemLevel * 0.2 * typeConfig.armorMultiplier);
    } else if (typeConfig.weightClass === 'light') {
      toDodge = Math.round(2 + itemLevel * 0.1);
    }

    // Generate name
    const baseName = `${material.name} ${typeConfig.baseName}`;

    // Get suffix for rare+ items
    let suffix: SuffixConfig | null = null;
    let statBonuses: Partial<Record<StatName, number>> | undefined;
    let combatBonuses: Partial<Record<CombatStatName, number>> | undefined;

    if (qualityConfig.hasStatBonuses) {
      const useEffectSuffix = this.random() < 0.5;
      suffix = getRandomSuffix(quality, useEffectSuffix, this.random);
      if (suffix) {
        if (suffix.statBonuses) {
          statBonuses = { ...suffix.statBonuses };
        }
        if (suffix.combatBonuses) {
          combatBonuses = { ...suffix.combatBonuses };
        }
      }
    }

    // Generate full name
    const fullName = suffix
      ? `${baseName} ${suffix.name}`
      : baseName;

    // Select abilities
    const abilities = qualityConfig.hasAbilities
      ? selectAbilities('armor', quality, itemLevel, qualityConfig.maxAbilities, this.random)
      : [];

    // Calculate value
    const baseValue = this.calculateBaseValue(itemLevel, 'armor');
    const value = Math.round(
      baseValue * qualityConfig.valueMultiplier * material.valueMultiplier
    );

    // Calculate weight
    const weight = this.calculateWeight(typeConfig.size);

    // Generate description
    const description = this.generateArmorDescription(
      fullName,
      quality,
      typeConfig,
      armor
    );

    return {
      generatedType: 'armor',
      seed: this.seed,
      baseName,
      fullName: formatItemName(fullName, quality),
      quality,
      description,
      itemLevel,
      value,
      weight,
      armorType: selectedType,
      armorSlot: typeConfig.slot,
      armor,
      toDodge: toDodge > 0 ? toDodge : undefined,
      toBlock: toBlock > 0 ? toBlock : undefined,
      statBonuses,
      combatBonuses,
      abilities,
    };
  }

  /**
   * Generate a random bauble.
   * @param itemLevel The level of the item
   * @param maxQuality Maximum quality tier (or forced quality if forcedQuality is true)
   * @param baubleType Optional specific bauble type
   * @param forcedQuality If true, maxQuality becomes the exact quality (for admin testing)
   */
  generateBauble(
    itemLevel: number,
    maxQuality: QualityTier = 'legendary',
    baubleType?: BaubleType,
    forcedQuality: boolean = false
  ): GeneratedItemData {
    // Roll or force quality
    const quality = forcedQuality
      ? forceQuality(maxQuality)
      : rollQuality(itemLevel, maxQuality, 0, this.random);
    const qualityConfig = getQualityConfig(quality);

    // Check for unique roll
    if (quality === 'legendary' && this.random() < 0.02) {
      const unique = getRandomUniqueItem('bauble', this.random);
      if (unique && unique.subtype && unique.subtype in BAUBLE_TYPES) {
        return this.createUniqueBauble(unique);
      }
    }

    // Select bauble type if not specified
    const selectedType = baubleType || this.selectRandomBaubleType();
    const typeConfig = BAUBLE_TYPES[selectedType];

    // Get material for this quality
    const material = getRandomMaterial(quality, this.random);

    // Generate name based on quality
    const baseName = this.generateBaubleName(selectedType, material, quality);

    // Get suffix for rare+ items
    let suffix: SuffixConfig | null = null;
    let statBonuses: Partial<Record<StatName, number>> | undefined;
    let combatBonuses: Partial<Record<CombatStatName, number>> | undefined;

    if (qualityConfig.hasStatBonuses) {
      // Baubles tend toward stat suffixes
      const useEffectSuffix = this.random() < 0.3;
      suffix = getRandomSuffix(quality, useEffectSuffix, this.random);
      if (suffix) {
        if (suffix.statBonuses) {
          statBonuses = { ...suffix.statBonuses };
        }
        if (suffix.combatBonuses) {
          combatBonuses = { ...suffix.combatBonuses };
        }
      }
    }

    // Generate full name
    const fullName = suffix
      ? `${baseName} ${suffix.name}`
      : baseName;

    // Select abilities (baubles can have passive abilities)
    const abilities = qualityConfig.hasAbilities
      ? selectAbilities('bauble', quality, itemLevel, qualityConfig.maxAbilities, this.random)
      : [];

    // Calculate value (baubles are valuable)
    const baseValue = this.calculateBaseValue(itemLevel, 'bauble');
    const value = Math.round(
      baseValue * qualityConfig.valueMultiplier * material.valueMultiplier * typeConfig.valueMultiplier
    );

    // Calculate weight
    const weight = this.calculateWeight(typeConfig.size);

    // Generate description
    const description = this.generateBaubleDescription(fullName, quality, typeConfig);

    return {
      generatedType: 'bauble',
      seed: this.seed,
      baseName,
      fullName: formatItemName(fullName, quality),
      quality,
      description,
      itemLevel,
      value,
      weight,
      baubleType: selectedType,
      statBonuses,
      combatBonuses,
      abilities,
    };
  }

  /**
   * Generate a random item of any type.
   * @param itemLevel The level of the item
   * @param maxQuality Maximum quality tier (or forced quality if forcedQuality is true)
   * @param allowedTypes Optional array of allowed item types
   * @param forcedQuality If true, maxQuality becomes the exact quality (for admin testing)
   */
  generateRandomItem(
    itemLevel: number,
    maxQuality: QualityTier = 'legendary',
    allowedTypes?: GeneratedItemType[],
    forcedQuality: boolean = false
  ): GeneratedItemData {
    const types: GeneratedItemType[] = allowedTypes || ['weapon', 'armor', 'bauble'];
    const selectedType = types[Math.floor(this.random() * types.length)];

    switch (selectedType) {
      case 'weapon':
        return this.generateWeapon(itemLevel, maxQuality, undefined, forcedQuality);
      case 'armor':
        return this.generateArmor(itemLevel, maxQuality, undefined, undefined, forcedQuality);
      case 'bauble':
        return this.generateBauble(itemLevel, maxQuality, undefined, forcedQuality);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private selectRandomWeaponType(): WeaponType {
    const types = Object.keys(WEAPON_TYPES) as WeaponType[];
    return types[Math.floor(this.random() * types.length)];
  }

  private selectRandomArmorType(targetSlot?: ArmorSlot): ArmorType {
    const types = Object.entries(ARMOR_TYPES) as [ArmorType, { slot: ArmorSlot }][];
    const filtered = targetSlot
      ? types.filter(([, config]) => config.slot === targetSlot)
      : types;

    if (filtered.length === 0) {
      return 'leather'; // Fallback
    }

    const [type] = filtered[Math.floor(this.random() * filtered.length)];
    return type;
  }

  private selectRandomBaubleType(): BaubleType {
    const types = Object.keys(BAUBLE_TYPES) as BaubleType[];
    return types[Math.floor(this.random() * types.length)];
  }

  private calculateWeaponDamage(itemLevel: number, multiplier: number): number {
    // Base damage scales with level: 5 + level * 2
    return Math.round((5 + itemLevel * 2) * multiplier);
  }

  private calculateBaseArmor(itemLevel: number, slot: ArmorSlot): number {
    // Armor value by slot
    const slotMultipliers: Record<ArmorSlot, number> = {
      head: 0.8,
      chest: 1.5,
      hands: 0.5,
      legs: 1.0,
      feet: 0.6,
      cloak: 0.3,
      shield: 1.2,
    };

    const base = 2 + itemLevel * 0.8;
    return Math.round(base * (slotMultipliers[slot] || 1.0));
  }

  private calculateBaseValue(itemLevel: number, itemType: GeneratedItemType): number {
    const typeMultipliers: Record<GeneratedItemType, number> = {
      weapon: 1.2,
      armor: 1.0,
      bauble: 1.5,
    };

    // Base value: 10 + level^1.5
    const base = 10 + Math.pow(itemLevel, 1.5);
    return Math.round(base * typeMultipliers[itemType]);
  }

  private calculateWeight(size: 'tiny' | 'small' | 'medium' | 'large'): number {
    const weights: Record<string, number> = {
      tiny: 0.1,
      small: 1,
      medium: 3,
      large: 6,
    };
    return weights[size] || 1;
  }

  private generateWeaponDescription(
    name: string,
    quality: QualityTier,
    _typeConfig: { baseName: string; damageType: string },
    minDamage: number,
    maxDamage: number
  ): string {
    const qualityDescriptors: Record<QualityTier, string> = {
      common: 'a serviceable',
      uncommon: 'a well-crafted',
      rare: 'a finely-crafted',
      epic: 'an exceptional',
      legendary: 'a legendary',
      unique: 'a unique and powerful',
    };

    return `${qualityDescriptors[quality]} ${name.toLowerCase()} that deals ${minDamage}-${maxDamage} damage.`;
  }

  private generateArmorDescription(
    name: string,
    quality: QualityTier,
    _typeConfig: { baseName: string; weightClass: string },
    armor: number
  ): string {
    const qualityDescriptors: Record<QualityTier, string> = {
      common: 'A basic piece of',
      uncommon: 'A sturdy piece of',
      rare: 'A fine piece of',
      epic: 'An exceptional piece of',
      legendary: 'A legendary piece of',
      unique: 'A unique and powerful piece of',
    };

    return `${qualityDescriptors[quality]} ${name.toLowerCase()} providing ${armor} armor.`;
  }

  private generateBaubleDescription(
    name: string,
    quality: QualityTier,
    _typeConfig: { baseName: string }
  ): string {
    const qualityDescriptors: Record<QualityTier, string> = {
      common: 'A simple',
      uncommon: 'A well-made',
      rare: 'A beautiful',
      epic: 'An exquisite',
      legendary: 'A legendary',
      unique: 'A unique and powerful',
    };

    return `${qualityDescriptors[quality]} ${name.toLowerCase()} that radiates faint magical energy.`;
  }

  private generateBaubleName(
    type: BaubleType,
    material: MaterialConfig,
    _quality: QualityTier
  ): string {
    const typeConfig = BAUBLE_TYPES[type];
    return `${material.name} ${typeConfig.baseName}`;
  }

  private createUniqueWeapon(unique: UniqueItemConfig): GeneratedItemData {
    const typeConfig = WEAPON_TYPES[unique.subtype as WeaponType];
    const baseDamage = this.calculateWeaponDamage(unique.itemLevel, typeConfig.damageMultiplier);
    const statMultiplier = 1.6; // Unique multiplier

    const minDamage = Math.round(baseDamage * 0.85 * statMultiplier);
    const maxDamage = Math.round(baseDamage * 1.25 * statMultiplier);

    const uniqueTitle = `${unique.title}, ${unique.subtitle}`;

    return {
      generatedType: 'weapon',
      seed: this.seed,
      baseName: unique.title,
      fullName: formatItemName(uniqueTitle, 'unique'),
      uniqueTitle,
      quality: 'unique',
      description: unique.description,
      itemLevel: unique.itemLevel,
      value: Math.round(this.calculateBaseValue(unique.itemLevel, 'weapon') * 25),
      weight: this.calculateWeight(typeConfig.size),
      weaponType: unique.subtype as WeaponType,
      minDamage,
      maxDamage,
      damageType: typeConfig.damageType,
      handedness: typeConfig.handedness,
      toHit: Math.round(unique.itemLevel * 0.3),
      attackSpeed: typeConfig.attackSpeed,
      statBonuses: unique.statBonuses,
      combatBonuses: unique.combatBonuses,
      abilities: unique.abilities,
    };
  }

  private createUniqueArmor(unique: UniqueItemConfig): GeneratedItemData {
    const typeConfig = ARMOR_TYPES[unique.subtype as ArmorType];
    const baseArmor = this.calculateBaseArmor(unique.itemLevel, typeConfig.slot);
    const armor = Math.round(baseArmor * typeConfig.armorMultiplier * 1.6);

    const uniqueTitle = `${unique.title}, ${unique.subtitle}`;

    let toBlock: number | undefined;
    let toDodge: number | undefined;

    if (typeConfig.slot === 'shield') {
      toBlock = Math.round(8 + unique.itemLevel * 0.25);
    } else if (typeConfig.weightClass === 'light') {
      toDodge = Math.round(3 + unique.itemLevel * 0.15);
    }

    return {
      generatedType: 'armor',
      seed: this.seed,
      baseName: unique.title,
      fullName: formatItemName(uniqueTitle, 'unique'),
      uniqueTitle,
      quality: 'unique',
      description: unique.description,
      itemLevel: unique.itemLevel,
      value: Math.round(this.calculateBaseValue(unique.itemLevel, 'armor') * 25),
      weight: this.calculateWeight(typeConfig.size),
      armorType: unique.subtype as ArmorType,
      armorSlot: typeConfig.slot,
      armor,
      toDodge,
      toBlock,
      statBonuses: unique.statBonuses,
      combatBonuses: unique.combatBonuses,
      abilities: unique.abilities,
    };
  }

  private createUniqueBauble(unique: UniqueItemConfig): GeneratedItemData {
    const typeConfig = BAUBLE_TYPES[unique.subtype as BaubleType];
    const uniqueTitle = `${unique.title}, ${unique.subtitle}`;

    return {
      generatedType: 'bauble',
      seed: this.seed,
      baseName: unique.title,
      fullName: formatItemName(uniqueTitle, 'unique'),
      uniqueTitle,
      quality: 'unique',
      description: unique.description,
      itemLevel: unique.itemLevel,
      value: Math.round(this.calculateBaseValue(unique.itemLevel, 'bauble') * 30),
      weight: this.calculateWeight(typeConfig.size),
      baubleType: unique.subtype as BaubleType,
      statBonuses: unique.statBonuses,
      combatBonuses: unique.combatBonuses,
      abilities: unique.abilities,
    };
  }
}

/**
 * Create a new loot generator with a random seed.
 */
export function createLootGenerator(seed?: string): LootGenerator {
  return new LootGenerator(seed);
}
