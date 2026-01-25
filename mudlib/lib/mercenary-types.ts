/**
 * Mercenary Types - Type definitions for the mercenary system.
 *
 * Mercenaries are NPC companions that players can hire to assist in combat.
 * They use the behavior system for intelligent combat AI.
 */

import type { BehaviorMode, CombatRole } from '../std/behavior/types.js';
import type { GuildId } from '../std/guild/types.js';

/**
 * Available mercenary types.
 */
export type MercenaryType = 'fighter' | 'mage' | 'thief' | 'cleric';

/**
 * Behavior configuration for mercenaries.
 */
export interface MercenaryBehavior {
  mode: BehaviorMode;
  role: CombatRole;
  guild: GuildId;
}

/**
 * Mercenary template definition.
 * Templates define the base properties and skills for each mercenary type.
 */
export interface MercenaryTemplate {
  type: MercenaryType;
  shortDesc: string;
  longDesc: string;
  behavior: MercenaryBehavior;
  skills: string[];
  baseMana: number;
}

/**
 * Save data for a mercenary.
 * Used to persist mercenaries across player sessions.
 */
export interface MercenarySaveData {
  mercId: string;
  type: MercenaryType;
  mercName: string | null;
  ownerName: string;
  level: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  hiredAt: number;
  /** Behavior system config - preserved for restore */
  behaviorConfig: MercenaryBehavior;
  /** Skills learned by this mercenary */
  skills: Array<{ id: string; level: number }>;
}

/**
 * Default mercenary templates.
 */
export const MERCENARY_TEMPLATES: Record<MercenaryType, MercenaryTemplate> = {
  fighter: {
    type: 'fighter',
    shortDesc: 'a battle-hardened mercenary fighter',
    longDesc: `This seasoned warrior stands ready for combat, clad in well-worn armor
that bears the marks of countless battles. Muscles ripple beneath scarred skin as
they grip their weapon with practiced ease. Their eyes scan constantly for threats,
always ready to protect their employer.`,
    behavior: {
      mode: 'aggressive',
      role: 'tank',
      guild: 'fighter',
    },
    skills: [
      'fighter:bash',
      'fighter:toughness',
      'fighter:parry',
      'fighter:defensive_stance',
      'fighter:taunt',
      'fighter:shield_wall',
    ],
    baseMana: 50,
  },

  mage: {
    type: 'mage',
    shortDesc: 'a robed mercenary mage',
    longDesc: `This arcane practitioner wears flowing robes adorned with mystical
symbols that occasionally shimmer with residual magic. Their staff is topped
with a crystal that pulses with contained energy. An aura of controlled power
surrounds them as they survey their surroundings with calculating eyes.`,
    behavior: {
      mode: 'aggressive',
      role: 'dps_ranged',
      guild: 'mage',
    },
    skills: [
      'mage:magic_missile',
      'mage:fire_bolt',
      'mage:frost_armor',
      'mage:lightning_bolt',
      'mage:arcane_shield',
    ],
    baseMana: 150,
  },

  thief: {
    type: 'thief',
    shortDesc: 'a shadowy mercenary rogue',
    longDesc: `Clad in dark leathers and moving with uncanny silence, this
mercenary blends into shadows as naturally as breathing. Numerous daggers
are concealed about their person, and their eyes miss nothing of value or
danger. A faint smell of poison accompanies their presence.`,
    behavior: {
      mode: 'aggressive',
      role: 'dps_melee',
      guild: 'thief',
    },
    skills: [
      'thief:hide',
      'thief:backstab',
      'thief:poison_blade',
      'thief:evasion',
      'thief:dirty_fighting',
    ],
    baseMana: 75,
  },

  cleric: {
    type: 'cleric',
    shortDesc: 'a devoted mercenary cleric',
    longDesc: `This holy warrior wears blessed vestments and carries a symbol of
their faith prominently displayed. A gentle glow surrounds their hands, ready
to channel divine energy for healing or smiting. Their presence brings a sense
of calm and protection to those they serve.`,
    behavior: {
      mode: 'defensive',
      role: 'healer',
      guild: 'cleric',
    },
    skills: [
      'cleric:heal',
      'cleric:divine_grace',
      'cleric:bless',
      'cleric:cure_poison',
      'cleric:group_heal',
      'cleric:divine_shield',
    ],
    baseMana: 120,
  },
};

/**
 * Base cost for hiring a mercenary.
 */
export const MERCENARY_BASE_COST = 100;

/**
 * Calculate the cost to hire a mercenary.
 *
 * Formula: BaseCost × MercLevel × 10 × DiscountFactor
 * Where:
 * - DiscountFactor = 0.75^(PlayerLevel - MercLevel) if merc is lower level
 * - DiscountFactor = 1.0 if merc equals player level
 *
 * @param mercLevel The level of the mercenary to hire
 * @param playerLevel The player's current level
 * @returns The cost in gold to hire the mercenary
 */
export function calculateMercenaryCost(mercLevel: number, playerLevel: number): number {
  const baseCost = MERCENARY_BASE_COST * mercLevel * 10;

  if (mercLevel >= playerLevel) {
    // Same level or higher - full price
    return baseCost;
  }

  // Lower level - apply discount
  const levelDiff = playerLevel - mercLevel;
  const discountFactor = Math.pow(0.75, levelDiff);

  return Math.ceil(baseCost * discountFactor);
}

/**
 * Get the maximum number of mercenaries a player can have.
 *
 * @param playerLevel The player's current level
 * @returns Maximum mercenaries (1, or 2 at level 30+)
 */
export function getMaxMercenaries(playerLevel: number): number {
  return playerLevel >= 30 ? 2 : 1;
}
