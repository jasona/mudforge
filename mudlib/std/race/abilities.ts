/**
 * Race Abilities
 *
 * Defines and applies latent racial abilities to players.
 */

import type { Living, StatName } from '../living.js';
import type { CombatStatName } from '../combat/types.js';
import type { LatentAbility, LatentAbilityEffect } from './types.js';

/**
 * Effect ID prefix for race abilities.
 */
const RACE_EFFECT_PREFIX = 'race:';

/**
 * Definitions for all latent abilities.
 */
export const ABILITY_EFFECTS: Record<LatentAbility, LatentAbilityEffect> = {
  nightVision: {
    ability: 'nightVision',
    name: 'Night Vision',
    description: 'You can see in darkness as if it were dim light.',
    type: 'perception',
    magnitude: 100, // Full vision in darkness
  },
  infravision: {
    ability: 'infravision',
    name: 'Infravision',
    description: 'You can see heat signatures, allowing vision in complete darkness.',
    type: 'perception',
    magnitude: 100, // Full vision in darkness + heat signatures
  },
  poisonResistance: {
    ability: 'poisonResistance',
    name: 'Poison Resistance',
    description: 'You take 50% less damage from poison.',
    type: 'resistance',
    magnitude: 50, // 50% reduction
    damageType: 'poison',
  },
  magicResistance: {
    ability: 'magicResistance',
    name: 'Magic Resistance',
    description: 'You take 25% less damage from magical attacks.',
    type: 'resistance',
    magnitude: 25, // 25% reduction
    damageType: 'magic',
  },
  fireResistance: {
    ability: 'fireResistance',
    name: 'Fire Resistance',
    description: 'You take 50% less damage from fire.',
    type: 'resistance',
    magnitude: 50, // 50% reduction
    damageType: 'fire',
  },
  coldResistance: {
    ability: 'coldResistance',
    name: 'Cold Resistance',
    description: 'You take 50% less damage from cold.',
    type: 'resistance',
    magnitude: 50, // 50% reduction
    damageType: 'cold',
  },
  naturalArmor: {
    ability: 'naturalArmor',
    name: 'Natural Armor',
    description: 'Your tough hide provides +2 armor.',
    type: 'combat',
    magnitude: 2,
    combatStatModifier: 'armorBonus',
  },
  fastHealing: {
    ability: 'fastHealing',
    name: 'Fast Healing',
    description: 'You regenerate health 25% faster.',
    type: 'passive',
    magnitude: 25, // 25% faster regen
  },
  naturalStealth: {
    ability: 'naturalStealth',
    name: 'Natural Stealth',
    description: 'Your natural agility grants +5 to dodge.',
    type: 'combat',
    magnitude: 5,
    combatStatModifier: 'toDodge',
  },
  keenSenses: {
    ability: 'keenSenses',
    name: 'Keen Senses',
    description: 'Your heightened senses grant +10 to perception checks.',
    type: 'perception',
    magnitude: 10,
  },
};

/**
 * Player interface for applying race abilities.
 */
interface RacePlayer extends Living {
  setProperty(key: string, value: unknown): void;
  getProperty(key: string): unknown;
}

/**
 * Apply a single latent ability to a player.
 * Creates a hidden, permanent effect.
 */
export function applyLatentAbility(player: RacePlayer, ability: LatentAbility): void {
  const effect = ABILITY_EFFECTS[ability];
  if (!effect) return;

  const effectId = `${RACE_EFFECT_PREFIX}${ability}`;

  // Check if already applied
  if (player.hasEffect(effectId)) {
    return;
  }

  // Apply based on effect type
  switch (effect.type) {
    case 'combat':
      if (effect.combatStatModifier) {
        player.addCombatStatModifier(effect.combatStatModifier as CombatStatName, effect.magnitude);
      }
      break;

    case 'resistance':
      // Store resistance in properties for damage calculation
      const resistances = (player.getProperty('raceResistances') as Record<string, number>) || {};
      if (effect.damageType) {
        resistances[effect.damageType] = effect.magnitude;
        player.setProperty('raceResistances', resistances);
      }
      break;

    case 'perception':
      // Store perception abilities for visibility checks
      const perceptionAbilities = (player.getProperty('racePerceptionAbilities') as string[]) || [];
      if (!perceptionAbilities.includes(ability)) {
        perceptionAbilities.push(ability);
        player.setProperty('racePerceptionAbilities', perceptionAbilities);
      }
      break;

    case 'passive':
      // Store passive bonuses for various systems to check
      const passiveBonuses = (player.getProperty('racePassiveBonuses') as Record<string, number>) || {};
      passiveBonuses[ability] = effect.magnitude;
      player.setProperty('racePassiveBonuses', passiveBonuses);
      break;
  }

  // Mark ability as applied using a hidden effect
  player.addEffect({
    id: effectId,
    name: effect.name,
    description: effect.description,
    type: 'race_ability',
    category: 'buff',
    duration: Infinity, // Permanent
    magnitude: effect.magnitude,
    hidden: true, // Don't show in effect list
  });
}

/**
 * Remove a single latent ability from a player.
 */
export function removeLatentAbility(player: RacePlayer, ability: LatentAbility): void {
  const effect = ABILITY_EFFECTS[ability];
  if (!effect) return;

  const effectId = `${RACE_EFFECT_PREFIX}${ability}`;

  // Check if applied
  if (!player.hasEffect(effectId)) {
    return;
  }

  // Remove based on effect type
  switch (effect.type) {
    case 'combat':
      if (effect.combatStatModifier) {
        player.addCombatStatModifier(effect.combatStatModifier as CombatStatName, -effect.magnitude);
      }
      break;

    case 'resistance':
      const resistances = (player.getProperty('raceResistances') as Record<string, number>) || {};
      if (effect.damageType && effect.damageType in resistances) {
        delete resistances[effect.damageType];
        player.setProperty('raceResistances', resistances);
      }
      break;

    case 'perception':
      const perceptionAbilities = (player.getProperty('racePerceptionAbilities') as string[]) || [];
      const index = perceptionAbilities.indexOf(ability);
      if (index !== -1) {
        perceptionAbilities.splice(index, 1);
        player.setProperty('racePerceptionAbilities', perceptionAbilities);
      }
      break;

    case 'passive':
      const passiveBonuses = (player.getProperty('racePassiveBonuses') as Record<string, number>) || {};
      if (ability in passiveBonuses) {
        delete passiveBonuses[ability];
        player.setProperty('racePassiveBonuses', passiveBonuses);
      }
      break;
  }

  // Remove the effect marker
  player.removeEffect(effectId);
}

/**
 * Apply all latent abilities for a set of abilities.
 */
export function applyLatentAbilities(player: RacePlayer, abilities: LatentAbility[]): void {
  for (const ability of abilities) {
    applyLatentAbility(player, ability);
  }
}

/**
 * Remove all latent abilities for a set of abilities.
 */
export function removeLatentAbilities(player: RacePlayer, abilities: LatentAbility[]): void {
  for (const ability of abilities) {
    removeLatentAbility(player, ability);
  }
}

/**
 * Check if a player has a specific latent ability.
 */
export function hasLatentAbility(player: RacePlayer, ability: LatentAbility): boolean {
  return player.hasEffect(`${RACE_EFFECT_PREFIX}${ability}`);
}

/**
 * Check if a player can see in darkness (has nightVision or infravision).
 */
export function canSeeInDarkness(player: RacePlayer): boolean {
  const perceptionAbilities = (player.getProperty('racePerceptionAbilities') as string[]) || [];
  return perceptionAbilities.includes('nightVision') || perceptionAbilities.includes('infravision');
}

/**
 * Check if a player has infravision (can see heat signatures).
 */
export function hasInfravision(player: RacePlayer): boolean {
  const perceptionAbilities = (player.getProperty('racePerceptionAbilities') as string[]) || [];
  return perceptionAbilities.includes('infravision');
}

/**
 * Get the damage resistance percentage for a damage type.
 * Returns 0 if no resistance.
 */
export function getDamageResistance(player: RacePlayer, damageType: string): number {
  const resistances = (player.getProperty('raceResistances') as Record<string, number>) || {};
  return resistances[damageType] || 0;
}

/**
 * Get the healing rate bonus percentage.
 * Returns 0 if no fast healing.
 */
export function getHealingBonus(player: RacePlayer): number {
  const passiveBonuses = (player.getProperty('racePassiveBonuses') as Record<string, number>) || {};
  return passiveBonuses['fastHealing'] || 0;
}

/**
 * Get the perception bonus for keen senses.
 * Returns 0 if no keen senses.
 */
export function getPerceptionBonus(player: RacePlayer): number {
  const passiveBonuses = (player.getProperty('racePassiveBonuses') as Record<string, number>) || {};
  return passiveBonuses['keenSenses'] || 0;
}

/**
 * Get all active latent abilities for a player.
 */
export function getActiveAbilities(player: RacePlayer): LatentAbility[] {
  const abilities: LatentAbility[] = [];
  for (const ability of Object.keys(ABILITY_EFFECTS) as LatentAbility[]) {
    if (hasLatentAbility(player, ability)) {
      abilities.push(ability);
    }
  }
  return abilities;
}

/**
 * Get ability effect information.
 */
export function getAbilityEffect(ability: LatentAbility): LatentAbilityEffect | undefined {
  return ABILITY_EFFECTS[ability];
}
