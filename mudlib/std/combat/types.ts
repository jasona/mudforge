/**
 * Combat System Types
 *
 * Core interfaces and types for the combat system.
 */

import type { Living } from '../living.js';
import type { Weapon, DamageType } from '../weapon.js';
import type { StatName } from '../living.js';

/**
 * Combat stats that can be modified by equipment, buffs, etc.
 */
export interface CombatStats {
  /** Accuracy bonus (added to hit rolls) */
  toHit: number;
  /** Critical hit chance bonus (percentage, 0-100) */
  toCritical: number;
  /** Block chance bonus (percentage, 0-100, requires shield) */
  toBlock: number;
  /** Dodge/evasion chance bonus (percentage, 0-100) */
  toDodge: number;
  /** Attack speed modifier (1.0 = normal, higher = faster) */
  attackSpeed: number;
  /** Damage bonus (flat addition to all damage) */
  damageBonus: number;
  /** Armor class bonus (reduces incoming damage) */
  armorBonus: number;
}

/**
 * Default combat stats.
 */
export const DEFAULT_COMBAT_STATS: CombatStats = {
  toHit: 0,
  toCritical: 5, // Base 5% crit chance
  toBlock: 0,
  toDodge: 0,
  attackSpeed: 1.0,
  damageBonus: 0,
  armorBonus: 0,
};

/**
 * Result of a single attack within a combat round.
 */
export interface AttackResult {
  /** The attacker */
  attacker: Living;
  /** The defender */
  defender: Living;
  /** Weapon used (null for unarmed) */
  weapon: Weapon | null;

  /** Whether the attack hit */
  hit: boolean;
  /** Whether the attack missed */
  miss: boolean;
  /** Whether the attack was a critical hit */
  critical: boolean;
  /** Whether the attack was blocked */
  blocked: boolean;
  /** Whether the attack was dodged */
  dodged: boolean;

  /** Damage before reductions */
  baseDamage: number;
  /** Damage after armor and resistances */
  finalDamage: number;
  /** Type of damage dealt */
  damageType: DamageType;

  /** Message shown to the attacker */
  attackerMessage: string;
  /** Message shown to the defender */
  defenderMessage: string;
  /** Message shown to others in the room */
  roomMessage: string;
}

/**
 * Result of a full combat round.
 */
export interface RoundResult {
  /** The attacker */
  attacker: Living;
  /** The defender */
  defender: Living;
  /** All attacks made this round */
  attacks: AttackResult[];
  /** Total damage dealt to defender */
  totalDamage: number;
  /** Whether the defender died this round */
  defenderDied: boolean;
  /** Whether the attacker died this round (from thorns/retaliation) */
  attackerDied: boolean;
}

/**
 * Active combat entry tracking a combatant pair.
 */
export interface CombatEntry {
  /** The attacker in this combat pair */
  attacker: Living;
  /** The defender in this combat pair */
  defender: Living;
  /** When combat started */
  startTime: number;
  /** Number of rounds elapsed */
  roundCount: number;
  /** When the next round is scheduled */
  nextRoundTime: number;
  /** CallOut ID for the next round */
  callOutId: number;
}

/**
 * Buff/Debuff effect types.
 */
export type EffectType =
  | 'stat_modifier' // Modifies a core stat
  | 'combat_modifier' // Modifies combat stats
  | 'damage_over_time' // Periodic damage (poison, burn)
  | 'heal_over_time' // Periodic healing (regen)
  | 'damage_shield' // Absorbs incoming damage
  | 'thorns' // Reflects damage to attackers
  | 'stun' // Cannot attack
  | 'slow' // Reduced attack speed
  | 'haste' // Increased attack speed
  | 'invulnerable'; // Cannot take damage

/**
 * A buff or debuff effect applied to a Living.
 */
export interface Effect {
  /** Unique effect ID */
  id: string;
  /** Display name */
  name: string;
  /** Effect type */
  type: EffectType;
  /** Remaining duration in milliseconds */
  duration: number;
  /** Tick interval for DoT/HoT effects */
  tickInterval?: number;
  /** Time until next tick */
  nextTick?: number;
  /** Effect strength/magnitude */
  magnitude: number;
  /** Who applied this effect */
  source?: Living;
  /** Current stack count */
  stacks?: number;
  /** Maximum stacks */
  maxStacks?: number;

  /** Stat modification (for stat_modifier type) */
  stat?: StatName;

  /** Combat stat modification (for combat_modifier type) */
  combatStat?: keyof CombatStats;

  /** Damage type for DoT effects */
  damageType?: DamageType;

  /** Custom tick callback */
  onTick?: (target: Living, effect: Effect) => void;

  /** Called when effect expires */
  onExpire?: (target: Living, effect: Effect) => void;

  /** Called when effect is removed early */
  onRemove?: (target: Living, effect: Effect) => void;
}

/**
 * Loot table entry for NPC drops.
 */
export interface LootEntry {
  /** Item path to clone */
  itemPath: string;
  /** Drop chance (0-100) */
  chance: number;
  /** Min quantity (default 1) */
  minQuantity?: number;
  /** Max quantity (default 1) */
  maxQuantity?: number;
}

/**
 * Gold drop configuration.
 */
export interface GoldDrop {
  /** Minimum gold */
  min: number;
  /** Maximum gold */
  max: number;
}

/**
 * NPC combat configuration.
 */
export interface NPCCombatConfig {
  /** Base XP reward */
  baseXP: number;
  /** Level for scaling */
  level: number;
  /** Loot table */
  lootTable: LootEntry[];
  /** Gold drop range */
  goldDrop?: GoldDrop;
  /** Special attack chance per round (0-100) */
  specialAttackChance?: number;
  /** Custom special attack callback */
  specialAttack?: (self: Living, target: Living) => AttackResult | null;
}

/**
 * Combat stat name type for type safety.
 */
export type CombatStatName = keyof CombatStats;

// Re-export for convenience
export type { DamageType, StatName };
