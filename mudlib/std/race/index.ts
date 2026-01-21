/**
 * Race System
 *
 * Barrel exports for the race system.
 */

// Types
export type {
  RaceId,
  LatentAbility,
  LatentAbilityEffect,
  RaceAppearance,
  RaceDefinition,
  PlayerRaceData,
} from './types.js';

// Definitions
export {
  RACE_DEFINITIONS,
  getAllRaceDefinitions,
  getPlayableRaces,
  getRaceDefinition,
  isValidRaceId,
} from './definitions.js';

// Abilities
export {
  ABILITY_EFFECTS,
  applyLatentAbility,
  removeLatentAbility,
  applyLatentAbilities,
  removeLatentAbilities,
  hasLatentAbility,
  canSeeInDarkness,
  hasInfravision,
  getDamageResistance,
  getHealingBonus,
  getPerceptionBonus,
  getActiveAbilities,
  getAbilityEffect,
} from './abilities.js';
