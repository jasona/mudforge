/**
 * Combat System Types
 *
 * Core interfaces and types for the combat system.
 */

import type { Living } from '../living.js';
import type { Weapon, DamageType } from '../weapon.js';
import type { StatName } from '../living.js';

/**
 * Natural attack for NPCs (bite, claw, gore, etc.)
 */
export interface NaturalAttack {
  /** Name of the natural weapon (e.g., "fangs", "claws", "tusks") */
  name: string;
  /** Type of damage dealt */
  damageType: DamageType;
  /** Verb used when attack hits (e.g., "bites", "claws", "gores") */
  hitVerb: string;
  /** Verb used when attack misses (e.g., "snaps at", "swipes at", "charges") */
  missVerb: string;
  /** Optional bonus damage for this attack type */
  damageBonus?: number;
  /** Weight for random selection (default 1) */
  weight?: number;
}

/**
 * Predefined natural attack templates.
 */
export const NATURAL_ATTACKS: Record<string, NaturalAttack> = {
  bite: { name: 'fangs', damageType: 'piercing', hitVerb: 'bites', missVerb: 'snaps at' },
  claw: { name: 'claws', damageType: 'slashing', hitVerb: 'claws', missVerb: 'swipes at' },
  gore: { name: 'tusks', damageType: 'piercing', hitVerb: 'gores', missVerb: 'charges' },
  sting: { name: 'stinger', damageType: 'piercing', hitVerb: 'stings', missVerb: 'jabs at' },
  slam: { name: 'body', damageType: 'bludgeoning', hitVerb: 'slams into', missVerb: 'lunges at' },
  peck: { name: 'beak', damageType: 'piercing', hitVerb: 'pecks', missVerb: 'snaps at' },
  tail: { name: 'tail', damageType: 'bludgeoning', hitVerb: 'lashes', missVerb: 'swings its tail at' },
  fists: { name: 'fists', damageType: 'bludgeoning', hitVerb: 'punches', missVerb: 'swings at' },
};

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
  /** Natural attack used (for NPCs without weapons) */
  naturalAttack?: NaturalAttack;

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
 * Threat table entry for NPC aggro management.
 */
export interface ThreatEntry {
  /** Living's objectId who generated the threat */
  sourceId: string;
  /** Current threat value */
  threat: number;
  /** Timestamp for decay calculation */
  lastUpdated: number;
  /** Whether this target is being taunted (forced targeting) */
  isTaunted: boolean;
  /** When the taunt effect expires (0 = not taunted) */
  tauntExpires: number;
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
  | 'invulnerable' // Cannot take damage
  | 'stealth' // Thief hide/sneak (visibility reduction)
  | 'invisibility' // Mage invisibility (true invisible)
  | 'see_invisible' // Detection buff (see invisible entities)
  | 'detect_hidden' // Perception buff (detect hidden/sneaking)
  | 'threat_modifier' // Modifies threat generation (e.g., +50% threat)
  | 'taunt' // Forces NPC target selection
  | 'blind' // Cannot see (blocks look, targeting)
  | 'deaf' // Cannot hear (blocks say/tell/channel messages)
  | 'mute' // Cannot speak (blocks say/tell/channels/spells)
  | 'arm_disabled' // Arm(s) disabled (blocks wield/unwield/attack)
  | 'leg_disabled'; // Legs disabled (blocks movement, fleeing)

/**
 * Effect category for display grouping.
 */
export type EffectCategory = 'buff' | 'debuff' | 'neutral';

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

  /** Effect category for display (buff/debuff/neutral) */
  category?: EffectCategory;

  /** Short description for display (e.g., "+10 Strength") */
  description?: string;

  /** If true, effect is hidden from the buffs command */
  hidden?: boolean;

  /** Effect subtype for visibility system (stealth, invisibility, see_invisible, detect_hidden) */
  effectType?: string;

  /** Affected body part for arm_disabled effect (left, right, or both) */
  affectedPart?: 'left' | 'right' | 'both';

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
