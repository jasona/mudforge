/**
 * Random Loot Generator Quality System
 *
 * Defines quality tiers, their stat multipliers, and selection logic.
 */

import type { QualityTier, QualityConfig } from './types.js';

/**
 * Quality tier configurations.
 */
export const QUALITY_TIERS: Record<QualityTier, QualityConfig> = {
  common: {
    name: 'Common',
    color: '{white}',
    minLevel: 1,
    maxLevel: 15,
    statMultiplier: 1.0,
    valueMultiplier: 1.0,
    weight: 50,
    hasStatBonuses: false,
    hasAbilities: false,
    maxAbilities: 0,
  },
  uncommon: {
    name: 'Uncommon',
    color: '{bold}{green}',
    minLevel: 5,
    maxLevel: 25,
    statMultiplier: 1.1,
    valueMultiplier: 1.5,
    weight: 30,
    hasStatBonuses: true,
    hasAbilities: false,
    maxAbilities: 0,
  },
  rare: {
    name: 'Rare',
    color: '{bold}{blue}',
    minLevel: 10,
    maxLevel: 35,
    statMultiplier: 1.2,
    valueMultiplier: 2.5,
    weight: 15,
    hasStatBonuses: true,
    hasAbilities: true,
    maxAbilities: 1,
  },
  epic: {
    name: 'Epic',
    color: '{bold}{purple}',
    minLevel: 20,
    maxLevel: 45,
    statMultiplier: 1.35,
    valueMultiplier: 5.0,
    weight: 4,
    hasStatBonuses: true,
    hasAbilities: true,
    maxAbilities: 2,
  },
  legendary: {
    name: 'Legendary',
    color: '{bold}{orange}',
    minLevel: 30,
    maxLevel: 50,
    statMultiplier: 1.5,
    valueMultiplier: 10.0,
    weight: 0.9,
    hasStatBonuses: true,
    hasAbilities: true,
    maxAbilities: 3,
  },
  unique: {
    name: 'Unique',
    color: '{bold}{yellow}',
    minLevel: 40,
    maxLevel: 50,
    statMultiplier: 1.6,
    valueMultiplier: 20.0,
    weight: 0.1,
    hasStatBonuses: true,
    hasAbilities: true,
    maxAbilities: 4,
  },
};

/**
 * Order of quality tiers from lowest to highest.
 */
export const QUALITY_ORDER: QualityTier[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'unique',
];

/**
 * Get the numeric index of a quality tier (0 = common, 5 = unique).
 */
export function getQualityIndex(quality: QualityTier): number {
  return QUALITY_ORDER.indexOf(quality);
}

/**
 * Compare two quality tiers.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareQuality(a: QualityTier, b: QualityTier): number {
  return getQualityIndex(a) - getQualityIndex(b);
}

/**
 * Check if a quality tier is at least a certain level.
 */
export function isQualityAtLeast(quality: QualityTier, minimum: QualityTier): boolean {
  return compareQuality(quality, minimum) >= 0;
}

/**
 * Get quality tier configuration.
 */
export function getQualityConfig(quality: QualityTier): QualityConfig {
  return QUALITY_TIERS[quality];
}

/**
 * Get the display color code for a quality tier.
 */
export function getQualityColor(quality: QualityTier): string {
  return QUALITY_TIERS[quality].color;
}

/**
 * Format an item name with quality color.
 */
export function formatItemName(name: string, quality: QualityTier): string {
  const color = getQualityColor(quality);
  return `${color}${name}{/}`;
}

/**
 * Roll for a quality tier based on item level and maximum allowed quality.
 *
 * @param itemLevel The level of the item being generated
 * @param maxQuality Maximum quality tier allowed (caps the result)
 * @param luckBonus Bonus to the roll (from player luck stat, etc.)
 * @param random Random number generator function (returns 0-1)
 * @returns The selected quality tier
 */
export function rollQuality(
  itemLevel: number,
  maxQuality: QualityTier = 'legendary',
  luckBonus: number = 0,
  random: () => number = Math.random
): QualityTier {
  const maxIndex = getQualityIndex(maxQuality);

  // Calculate available tiers based on item level
  const availableTiers: { tier: QualityTier; weight: number }[] = [];

  for (const tier of QUALITY_ORDER) {
    const config = QUALITY_TIERS[tier];
    const tierIndex = getQualityIndex(tier);

    // Skip tiers above max quality
    if (tierIndex > maxIndex) continue;

    // Skip unique tier in random rolls (uniques are special drops)
    if (tier === 'unique') continue;

    // Check if item level is in range for this tier
    if (itemLevel < config.minLevel) continue;

    // Calculate weight based on item level within tier range
    let weight = config.weight;

    // Adjust weight based on how deep into the tier's level range we are
    const levelProgress = Math.min(
      1,
      (itemLevel - config.minLevel) / (config.maxLevel - config.minLevel)
    );

    // Higher level items have better chances at higher quality tiers
    if (tierIndex > 0) {
      weight *= (0.5 + levelProgress * 0.5);
    }

    // Apply luck bonus (increases chance of higher quality)
    if (tierIndex > 0 && luckBonus > 0) {
      weight *= (1 + luckBonus * 0.02); // Each luck point adds 2% to higher tier weights
    }

    availableTiers.push({ tier, weight });
  }

  // If no tiers available, return common
  if (availableTiers.length === 0) {
    return 'common';
  }

  // Calculate total weight
  const totalWeight = availableTiers.reduce((sum, t) => sum + t.weight, 0);

  // Roll for tier
  let roll = random() * totalWeight;

  for (const { tier, weight } of availableTiers) {
    roll -= weight;
    if (roll <= 0) {
      return tier;
    }
  }

  // Fallback to last available tier
  return availableTiers[availableTiers.length - 1].tier;
}

/**
 * Check if an item can be generated at a specific quality tier for a given level.
 */
export function canGenerateAtQuality(itemLevel: number, quality: QualityTier): boolean {
  const config = QUALITY_TIERS[quality];
  return itemLevel >= config.minLevel && itemLevel <= config.maxLevel;
}

/**
 * Get all quality tiers available for a given item level.
 */
export function getAvailableQualities(itemLevel: number): QualityTier[] {
  return QUALITY_ORDER.filter((tier) => {
    const config = QUALITY_TIERS[tier];
    return itemLevel >= config.minLevel;
  });
}

/**
 * Get the recommended quality for an item level (middle of available range).
 */
export function getRecommendedQuality(itemLevel: number): QualityTier {
  const available = getAvailableQualities(itemLevel);
  if (available.length === 0) return 'common';

  // Return the median quality tier
  const midIndex = Math.floor(available.length / 2);
  return available[midIndex];
}

/**
 * Calculate the effective stat multiplier for an item.
 * Combines quality tier multiplier with material multiplier.
 */
export function calculateStatMultiplier(
  quality: QualityTier,
  materialMultiplier: number = 1.0
): number {
  const config = QUALITY_TIERS[quality];
  return config.statMultiplier * materialMultiplier;
}

/**
 * Calculate the gold value multiplier for an item.
 */
export function calculateValueMultiplier(
  quality: QualityTier,
  materialMultiplier: number = 1.0
): number {
  const config = QUALITY_TIERS[quality];
  return config.valueMultiplier * materialMultiplier;
}

/**
 * Determine if a quality tier should have stat bonuses.
 */
export function shouldHaveStatBonuses(quality: QualityTier): boolean {
  return QUALITY_TIERS[quality].hasStatBonuses;
}

/**
 * Determine if a quality tier should have abilities.
 */
export function shouldHaveAbilities(quality: QualityTier): boolean {
  return QUALITY_TIERS[quality].hasAbilities;
}

/**
 * Get the maximum number of abilities for a quality tier.
 */
export function getMaxAbilities(quality: QualityTier): number {
  return QUALITY_TIERS[quality].maxAbilities;
}

/**
 * Get display name for a quality tier.
 */
export function getQualityDisplayName(quality: QualityTier): string {
  return QUALITY_TIERS[quality].name;
}

/**
 * Force a specific quality tier (for admin/testing).
 * This bypasses normal rolling and level requirements.
 * @param targetQuality The quality to force
 * @param maxQuality Maximum allowed quality (caps the result)
 * @returns The forced quality tier (may be capped by maxQuality)
 */
export function forceQuality(targetQuality: QualityTier, maxQuality: QualityTier = 'unique'): QualityTier {
  const targetIndex = getQualityIndex(targetQuality);
  const maxIndex = getQualityIndex(maxQuality);

  if (targetIndex > maxIndex) {
    return maxQuality;
  }
  return targetQuality;
}
