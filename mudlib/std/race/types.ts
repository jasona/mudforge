/**
 * Race System Types
 *
 * Core interfaces and types for the player race system.
 */

import type { Stats, StatName } from '../living.js';
import type { CombatStats } from '../combat/types.js';

/**
 * Available playable race identifiers.
 */
export type RaceId =
  | 'human'
  | 'elf'
  | 'dwarf'
  | 'orc'
  | 'halfling'
  | 'gnome'
  | 'tiefling'
  | 'dragonborn';

/**
 * Latent abilities that races may possess.
 * These are permanent passive effects based on race.
 */
export type LatentAbility =
  | 'nightVision'       // Can see in darkness
  | 'infravision'       // See heat signatures (also bypasses darkness)
  | 'poisonResistance'  // 50% poison damage reduction
  | 'magicResistance'   // 25% magic damage reduction
  | 'fireResistance'    // 50% fire damage reduction
  | 'coldResistance'    // 50% cold damage reduction
  | 'naturalArmor'      // +2 armor
  | 'fastHealing'       // 25% faster HP regen
  | 'naturalStealth'    // Stealth bonus
  | 'keenSenses';       // Perception bonus

/**
 * Effect definitions for latent abilities.
 */
export interface LatentAbilityEffect {
  /** The ability ID */
  ability: LatentAbility;
  /** Display name */
  name: string;
  /** Description of the effect */
  description: string;
  /** Type of effect */
  type: 'perception' | 'resistance' | 'combat' | 'passive';
  /** Magnitude of the effect (percentage or flat bonus) */
  magnitude: number;
  /** Damage type for resistance effects */
  damageType?: string;
  /** Stat to modify for passive effects */
  statModifier?: StatName;
  /** Combat stat to modify */
  combatStatModifier?: keyof CombatStats;
}

/**
 * Race appearance configuration for portrait generation.
 */
export interface RaceAppearance {
  /** Possible skin tones for this race */
  skinTones: string[];
  /** Possible hair colors */
  hairColors: string[];
  /** Possible eye colors */
  eyeColors: string[];
  /** Distinctive features (e.g., 'pointed ears', 'tusks') */
  distinctiveFeatures: string[];
  /** Height range description */
  heightRange: string;
  /** Build description */
  buildDescription: string;
  /** Hints to add to portrait generation prompt */
  portraitStyleHints: string;
}

/**
 * Complete race definition.
 */
export interface RaceDefinition {
  /** Unique race identifier */
  id: RaceId;
  /** Display name */
  name: string;
  /** Short description for race picker */
  shortDescription: string;
  /** Full lore description */
  longDescription: string;
  /** Stat bonuses/penalties (can be negative) */
  statBonuses: Partial<Stats>;
  /** Combat stat bonuses */
  combatBonuses?: Partial<CombatStats>;
  /** Latent abilities this race possesses */
  latentAbilities: LatentAbility[];
  /** Appearance configuration for portraits */
  appearance: RaceAppearance;
  /** Reference to lore entry ID */
  loreEntryId: string;
  /** Guild IDs this race cannot join */
  forbiddenGuilds?: string[];
  /** Whether this race is available for player selection */
  playable: boolean;
  /** Order in race picker (lower = first) */
  displayOrder: number;
}

/**
 * Serializable race data stored on player.
 */
export interface PlayerRaceData {
  /** The race ID */
  raceId: RaceId;
  /** When the race was chosen (for new characters) */
  chosenAt: number;
}

// Re-export for convenience
export type { Stats, StatName };
