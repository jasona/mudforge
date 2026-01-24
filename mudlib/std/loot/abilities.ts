/**
 * Random Loot Generator Abilities System
 *
 * Defines special abilities that can be applied to generated items.
 * Includes on-hit effects (burn, poison, etc.) and on-equip bonuses.
 */

import type { GeneratedAbility, QualityTier } from './types.js';
import type { DamageType } from '../weapon.js';

/**
 * Ability template for generation.
 */
interface AbilityTemplate {
  id: string;
  name: string;
  trigger: 'on_hit' | 'on_equip' | 'on_use';
  description: (magnitude: number, chance?: number) => string;
  baseChance?: number; // For on_hit abilities
  baseMagnitude: number;
  magnitudeScale: number; // Multiplied by item level
  duration?: number; // For timed effects
  damageType?: DamageType;
  effectType?: string;
  qualityRequired: QualityTier[];
  itemTypes: ('weapon' | 'armor' | 'bauble')[];
  weight: number; // Selection weight
}

/**
 * Available ability templates.
 */
export const ABILITY_TEMPLATES: AbilityTemplate[] = [
  // ============================================================================
  // On-Hit Abilities (Weapons primarily)
  // ============================================================================

  // Elemental damage procs
  {
    id: 'burning_strike',
    name: 'Burning Strike',
    trigger: 'on_hit',
    description: (mag, chance) => `${chance}% chance to burn enemies for ${mag} fire damage over 5s`,
    baseChance: 15,
    baseMagnitude: 5,
    magnitudeScale: 0.3,
    duration: 5000,
    damageType: 'fire',
    effectType: 'burn',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['weapon'],
    weight: 10,
  },
  {
    id: 'venomous_strike',
    name: 'Venomous Strike',
    trigger: 'on_hit',
    description: (mag, chance) => `${chance}% chance to poison enemies for ${mag} damage over 8s`,
    baseChance: 12,
    baseMagnitude: 4,
    magnitudeScale: 0.25,
    duration: 8000,
    damageType: 'poison',
    effectType: 'poison',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['weapon'],
    weight: 10,
  },
  {
    id: 'chilling_strike',
    name: 'Chilling Strike',
    trigger: 'on_hit',
    description: (mag, chance) => `${chance}% chance to slow enemies by ${mag}% for 4s`,
    baseChance: 10,
    baseMagnitude: 15,
    magnitudeScale: 0.5,
    duration: 4000,
    damageType: 'ice',
    effectType: 'slow',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['weapon'],
    weight: 8,
  },
  {
    id: 'shocking_strike',
    name: 'Shocking Strike',
    trigger: 'on_hit',
    description: (mag, chance) => `${chance}% chance to deal ${mag} lightning damage`,
    baseChance: 18,
    baseMagnitude: 8,
    magnitudeScale: 0.4,
    damageType: 'lightning',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['weapon'],
    weight: 9,
  },
  {
    id: 'holy_strike',
    name: 'Holy Strike',
    trigger: 'on_hit',
    description: (mag, chance) => `${chance}% chance to deal ${mag} holy damage to undead and demons`,
    baseChance: 20,
    baseMagnitude: 10,
    magnitudeScale: 0.5,
    damageType: 'holy',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['weapon'],
    weight: 6,
  },
  {
    id: 'dark_strike',
    name: 'Shadowbite',
    trigger: 'on_hit',
    description: (mag, chance) => `${chance}% chance to deal ${mag} dark damage`,
    baseChance: 15,
    baseMagnitude: 7,
    magnitudeScale: 0.35,
    damageType: 'dark',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['weapon'],
    weight: 7,
  },

  // Utility on-hit abilities
  {
    id: 'life_drain',
    name: 'Life Drain',
    trigger: 'on_hit',
    description: (mag, chance) => `${chance}% chance to heal for ${mag}% of damage dealt`,
    baseChance: 10,
    baseMagnitude: 10,
    magnitudeScale: 0.3,
    effectType: 'lifesteal',
    qualityRequired: ['epic', 'legendary'],
    itemTypes: ['weapon'],
    weight: 5,
  },
  {
    id: 'mana_drain',
    name: 'Mana Siphon',
    trigger: 'on_hit',
    description: (mag, chance) => `${chance}% chance to restore ${mag} mana on hit`,
    baseChance: 12,
    baseMagnitude: 5,
    magnitudeScale: 0.2,
    effectType: 'manadrain',
    qualityRequired: ['epic', 'legendary'],
    itemTypes: ['weapon'],
    weight: 4,
  },
  {
    id: 'stunning_blow',
    name: 'Stunning Blow',
    trigger: 'on_hit',
    description: (mag, chance) => `${chance}% chance to stun enemies for ${mag / 1000}s`,
    baseChance: 5,
    baseMagnitude: 1500,
    magnitudeScale: 50,
    duration: 1500,
    effectType: 'stun',
    qualityRequired: ['epic', 'legendary'],
    itemTypes: ['weapon'],
    weight: 3,
  },

  // ============================================================================
  // On-Equip Abilities (Armor and some weapons)
  // ============================================================================

  // Offensive bonuses
  {
    id: 'swift',
    name: 'Swift',
    trigger: 'on_equip',
    description: (mag) => `Increases attack speed by ${mag}%`,
    baseMagnitude: 5,
    magnitudeScale: 0.15,
    effectType: 'haste',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['weapon', 'armor'],
    weight: 8,
  },
  {
    id: 'savage',
    name: 'Savage',
    trigger: 'on_equip',
    description: (mag) => `Increases critical hit chance by ${mag}%`,
    baseMagnitude: 3,
    magnitudeScale: 0.1,
    effectType: 'critical',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['weapon', 'armor'],
    weight: 7,
  },
  {
    id: 'precise',
    name: 'Precise',
    trigger: 'on_equip',
    description: (mag) => `Increases accuracy by ${mag}`,
    baseMagnitude: 3,
    magnitudeScale: 0.15,
    effectType: 'accuracy',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['weapon'],
    weight: 6,
  },

  // Defensive bonuses
  {
    id: 'thorns',
    name: 'Thorns',
    trigger: 'on_equip',
    description: (mag) => `Reflects ${mag} damage to attackers`,
    baseMagnitude: 3,
    magnitudeScale: 0.2,
    effectType: 'thorns',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['armor'],
    weight: 6,
  },
  {
    id: 'regeneration',
    name: 'Regeneration',
    trigger: 'on_equip',
    description: (mag) => `Regenerate ${mag} health every 5 seconds`,
    baseMagnitude: 2,
    magnitudeScale: 0.1,
    effectType: 'regen',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['armor'],
    weight: 7,
  },
  {
    id: 'mana_regen',
    name: 'Arcane Recovery',
    trigger: 'on_equip',
    description: (mag) => `Regenerate ${mag} mana every 5 seconds`,
    baseMagnitude: 1,
    magnitudeScale: 0.08,
    effectType: 'manaregen',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['armor', 'bauble'],
    weight: 5,
  },
  {
    id: 'fortified',
    name: 'Fortified',
    trigger: 'on_equip',
    description: (mag) => `Increases armor by ${mag}`,
    baseMagnitude: 2,
    magnitudeScale: 0.15,
    effectType: 'armor',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['armor'],
    weight: 8,
  },
  {
    id: 'evasive',
    name: 'Evasive',
    trigger: 'on_equip',
    description: (mag) => `Increases dodge chance by ${mag}%`,
    baseMagnitude: 3,
    magnitudeScale: 0.1,
    effectType: 'dodge',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['armor'],
    weight: 6,
  },
  {
    id: 'stalwart',
    name: 'Stalwart',
    trigger: 'on_equip',
    description: (mag) => `Increases block chance by ${mag}%`,
    baseMagnitude: 4,
    magnitudeScale: 0.15,
    effectType: 'block',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['armor'],
    weight: 5,
  },

  // Special bauble abilities
  {
    id: 'lucky',
    name: 'Lucky',
    trigger: 'on_equip',
    description: (mag) => `Increases luck by ${mag}`,
    baseMagnitude: 2,
    magnitudeScale: 0.1,
    effectType: 'luck',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['bauble'],
    weight: 8,
  },
  {
    id: 'wise',
    name: 'Wise',
    trigger: 'on_equip',
    description: (mag) => `Increases wisdom by ${mag}`,
    baseMagnitude: 2,
    magnitudeScale: 0.1,
    effectType: 'wisdom',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['bauble'],
    weight: 6,
  },
  {
    id: 'scholarly',
    name: 'Scholarly',
    trigger: 'on_equip',
    description: (mag) => `Increases intelligence by ${mag}`,
    baseMagnitude: 2,
    magnitudeScale: 0.1,
    effectType: 'intelligence',
    qualityRequired: ['rare', 'epic', 'legendary'],
    itemTypes: ['bauble'],
    weight: 6,
  },
];

/**
 * Get available abilities for an item type and quality tier.
 */
export function getAvailableAbilities(
  itemType: 'weapon' | 'armor' | 'bauble',
  quality: QualityTier
): AbilityTemplate[] {
  return ABILITY_TEMPLATES.filter((template) =>
    template.itemTypes.includes(itemType) &&
    template.qualityRequired.includes(quality)
  );
}

/**
 * Select random abilities for an item.
 *
 * @param itemType The type of item
 * @param quality The quality tier
 * @param itemLevel The item level (affects magnitude)
 * @param maxAbilities Maximum abilities to select
 * @param random Random number generator
 * @returns Array of generated abilities
 */
export function selectAbilities(
  itemType: 'weapon' | 'armor' | 'bauble',
  quality: QualityTier,
  itemLevel: number,
  maxAbilities: number,
  random: () => number = Math.random
): GeneratedAbility[] {
  const available = getAvailableAbilities(itemType, quality);
  if (available.length === 0 || maxAbilities === 0) {
    return [];
  }

  // Calculate total weight
  const totalWeight = available.reduce((sum, t) => sum + t.weight, 0);

  const selected: GeneratedAbility[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < maxAbilities && available.length > 0; i++) {
    // Roll for whether to add an ability (50% base chance per slot after first)
    if (i > 0 && random() > 0.5) {
      continue;
    }

    // Select by weight
    let roll = random() * totalWeight;
    let selectedTemplate: AbilityTemplate | null = null;

    for (const template of available) {
      if (usedIds.has(template.id)) continue;

      roll -= template.weight;
      if (roll <= 0) {
        selectedTemplate = template;
        break;
      }
    }

    if (!selectedTemplate) continue;

    // Mark as used to prevent duplicates
    usedIds.add(selectedTemplate.id);

    // Calculate magnitude based on item level
    const magnitude = Math.round(
      selectedTemplate.baseMagnitude +
      (itemLevel * selectedTemplate.magnitudeScale)
    );

    // Calculate chance for on-hit abilities
    const chance = selectedTemplate.baseChance
      ? Math.round(selectedTemplate.baseChance + (itemLevel * 0.1))
      : undefined;

    // Create the ability
    const ability: GeneratedAbility = {
      id: selectedTemplate.id,
      name: selectedTemplate.name,
      trigger: selectedTemplate.trigger,
      description: selectedTemplate.description(magnitude, chance),
      magnitude,
      chance,
      duration: selectedTemplate.duration,
      damageType: selectedTemplate.damageType,
      effectType: selectedTemplate.effectType,
    };

    selected.push(ability);
  }

  return selected;
}

/**
 * Create a specific ability with custom parameters.
 */
export function createAbility(
  templateId: string,
  itemLevel: number,
  customMagnitude?: number,
  customChance?: number
): GeneratedAbility | null {
  const template = ABILITY_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const magnitude = customMagnitude ?? Math.round(
    template.baseMagnitude +
    (itemLevel * template.magnitudeScale)
  );

  const chance = customChance ?? (template.baseChance
    ? Math.round(template.baseChance + (itemLevel * 0.1))
    : undefined);

  return {
    id: template.id,
    name: template.name,
    trigger: template.trigger,
    description: template.description(magnitude, chance),
    magnitude,
    chance,
    duration: template.duration,
    damageType: template.damageType,
    effectType: template.effectType,
  };
}

/**
 * Get an ability template by ID.
 */
export function getAbilityTemplate(id: string): AbilityTemplate | undefined {
  return ABILITY_TEMPLATES.find((t) => t.id === id);
}

/**
 * Format ability description for display.
 */
export function formatAbilityDescription(ability: GeneratedAbility): string {
  return `{cyan}${ability.name}{/}: ${ability.description}`;
}

/**
 * Get all abilities of a specific trigger type.
 */
export function getAbilitiesByTrigger(
  abilities: GeneratedAbility[],
  trigger: 'on_hit' | 'on_equip' | 'on_use'
): GeneratedAbility[] {
  return abilities.filter((a) => a.trigger === trigger);
}
