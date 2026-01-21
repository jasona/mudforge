/**
 * Effect Factories
 *
 * Convenient factory functions for creating common buff/debuff effects.
 */

import type { Effect, EffectType, EffectCategory, CombatStatName, DamageType, StatName } from './types.js';
import { MAX_STAT_MODIFIER, MAX_COMBAT_MODIFIER, MAX_DOT_MAGNITUDE, MAX_BUFF_STACKS } from '../living.js';

/**
 * Generate a unique effect ID.
 */
function generateId(baseName: string): string {
  return `${baseName}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

/**
 * Clamp effect magnitude based on effect type.
 * @param type The effect type
 * @param magnitude The raw magnitude
 * @returns The clamped magnitude
 */
function clampMagnitude(type: EffectType, magnitude: number): number {
  switch (type) {
    case 'stat_modifier':
      return Math.max(-MAX_STAT_MODIFIER, Math.min(MAX_STAT_MODIFIER, magnitude));
    case 'combat_modifier':
      return Math.max(-MAX_COMBAT_MODIFIER, Math.min(MAX_COMBAT_MODIFIER, magnitude));
    case 'damage_over_time':
    case 'heal_over_time':
      return Math.max(1, Math.min(MAX_DOT_MAGNITUDE, magnitude));
    default:
      return magnitude;
  }
}

/**
 * Clamp max stacks to the system maximum.
 * @param stacks The requested max stacks
 * @returns The clamped max stacks
 */
function clampMaxStacks(stacks: number): number {
  return Math.min(stacks, MAX_BUFF_STACKS);
}

/**
 * Effects factory namespace.
 */
export const Effects = {
  /**
   * Create a poison effect (damage over time).
   * @param duration Duration in milliseconds
   * @param damagePerTick Damage per tick
   * @param tickInterval Tick interval in ms (default 2000)
   * @param maxStacks Maximum stacks (default 5)
   */
  poison(
    duration: number,
    damagePerTick: number,
    tickInterval: number = 2000,
    maxStacks: number = 5
  ): Effect {
    const clampedMagnitude = clampMagnitude('damage_over_time', damagePerTick);
    const clampedStacks = clampMaxStacks(maxStacks);
    return {
      id: generateId('poison'),
      name: 'Poison',
      type: 'damage_over_time',
      duration,
      magnitude: clampedMagnitude,
      tickInterval,
      nextTick: tickInterval,
      damageType: 'poison',
      maxStacks: clampedStacks,
      stacks: 1,
      category: 'debuff',
      description: `${clampedMagnitude} poison dmg/tick`,
    };
  },

  /**
   * Create a burn effect (fire damage over time).
   * @param duration Duration in milliseconds
   * @param damagePerTick Damage per tick
   * @param tickInterval Tick interval in ms (default 1500)
   */
  burn(
    duration: number,
    damagePerTick: number,
    tickInterval: number = 1500
  ): Effect {
    const clampedMagnitude = clampMagnitude('damage_over_time', damagePerTick);
    return {
      id: generateId('burn'),
      name: 'Burning',
      type: 'damage_over_time',
      duration,
      magnitude: clampedMagnitude,
      tickInterval,
      nextTick: tickInterval,
      damageType: 'fire',
      maxStacks: clampMaxStacks(3),
      stacks: 1,
      category: 'debuff',
      description: `${clampedMagnitude} fire dmg/tick`,
    };
  },

  /**
   * Create a bleed effect (physical damage over time).
   * @param duration Duration in milliseconds
   * @param damagePerTick Damage per tick
   * @param tickInterval Tick interval in ms (default 3000)
   */
  bleed(
    duration: number,
    damagePerTick: number,
    tickInterval: number = 3000
  ): Effect {
    const clampedMagnitude = clampMagnitude('damage_over_time', damagePerTick);
    return {
      id: generateId('bleed'),
      name: 'Bleeding',
      type: 'damage_over_time',
      duration,
      magnitude: clampedMagnitude,
      tickInterval,
      nextTick: tickInterval,
      damageType: 'slashing',
      maxStacks: clampMaxStacks(5),
      stacks: 1,
      category: 'debuff',
      description: `${clampedMagnitude} bleed dmg/tick`,
    };
  },

  /**
   * Create a regeneration effect (heal over time).
   * @param duration Duration in milliseconds
   * @param healPerTick HP healed per tick
   * @param tickInterval Tick interval in ms (default 2000)
   */
  regeneration(
    duration: number,
    healPerTick: number,
    tickInterval: number = 2000
  ): Effect {
    const clampedMagnitude = clampMagnitude('heal_over_time', healPerTick);
    return {
      id: generateId('regen'),
      name: 'Regeneration',
      type: 'heal_over_time',
      duration,
      magnitude: clampedMagnitude,
      tickInterval,
      nextTick: tickInterval,
      category: 'buff',
      description: `+${clampedMagnitude} HP/tick`,
    };
  },

  /**
   * Create a stat buff effect.
   * @param stat The stat to modify
   * @param amount Amount to add (can be negative for debuff)
   * @param duration Duration in milliseconds
   * @param name Display name (default: "Stat Buff")
   */
  statModifier(
    stat: StatName,
    amount: number,
    duration: number,
    name?: string
  ): Effect {
    const clampedAmount = clampMagnitude('stat_modifier', amount);
    const effectName = name || (clampedAmount >= 0 ? `${stat} Buff` : `${stat} Debuff`);
    const category: EffectCategory = clampedAmount >= 0 ? 'buff' : 'debuff';
    const sign = clampedAmount >= 0 ? '+' : '';
    return {
      id: generateId(`stat_${stat}`),
      name: effectName,
      type: 'stat_modifier',
      duration,
      magnitude: clampedAmount,
      stat,
      category,
      description: `${sign}${clampedAmount} ${stat}`,
    };
  },

  /**
   * Create a strength buff.
   */
  strengthBuff(duration: number, amount: number): Effect {
    return Effects.statModifier('strength', amount, duration, 'Strength');
  },

  /**
   * Create a dexterity buff.
   */
  dexterityBuff(duration: number, amount: number): Effect {
    return Effects.statModifier('dexterity', amount, duration, 'Agility');
  },

  /**
   * Create an intelligence buff.
   */
  intelligenceBuff(duration: number, amount: number): Effect {
    return Effects.statModifier('intelligence', amount, duration, 'Intellect');
  },

  /**
   * Create a constitution buff.
   */
  constitutionBuff(duration: number, amount: number): Effect {
    return Effects.statModifier('constitution', amount, duration, 'Fortitude');
  },

  /**
   * Create a combat stat modifier effect.
   * @param stat The combat stat to modify
   * @param amount Amount to add (can be negative)
   * @param duration Duration in milliseconds
   * @param name Display name
   */
  combatModifier(
    stat: CombatStatName,
    amount: number,
    duration: number,
    name?: string
  ): Effect {
    const clampedAmount = clampMagnitude('combat_modifier', amount);
    const effectName = name || `${stat} Modifier`;
    const category: EffectCategory = clampedAmount >= 0 ? 'buff' : 'debuff';
    const sign = clampedAmount >= 0 ? '+' : '';
    return {
      id: generateId(`combat_${stat}`),
      name: effectName,
      type: 'combat_modifier',
      duration,
      magnitude: clampedAmount,
      combatStat: stat,
      category,
      description: `${sign}${clampedAmount} ${stat}`,
    };
  },

  /**
   * Create an accuracy buff.
   */
  accuracy(duration: number, amount: number): Effect {
    return Effects.combatModifier('toHit', amount, duration, 'Accuracy');
  },

  /**
   * Create an evasion buff.
   */
  evasion(duration: number, amount: number): Effect {
    return Effects.combatModifier('toDodge', amount, duration, 'Evasion');
  },

  /**
   * Create a haste effect (attack speed increase).
   * @param duration Duration in milliseconds
   * @param speedBonus Attack speed bonus (0.1 = 10% faster)
   */
  haste(duration: number, speedBonus: number): Effect {
    return {
      id: generateId('haste'),
      name: 'Haste',
      type: 'haste',
      duration,
      magnitude: speedBonus,
      combatStat: 'attackSpeed',
      category: 'buff',
      description: `+${Math.round(speedBonus * 100)}% speed`,
    };
  },

  /**
   * Create a slow effect (attack speed reduction).
   * @param duration Duration in milliseconds
   * @param speedPenalty Attack speed penalty (0.2 = 20% slower)
   */
  slow(duration: number, speedPenalty: number): Effect {
    return {
      id: generateId('slow'),
      name: 'Slowed',
      type: 'slow',
      duration,
      magnitude: -speedPenalty,
      combatStat: 'attackSpeed',
      category: 'debuff',
      description: `-${Math.round(speedPenalty * 100)}% speed`,
    };
  },

  /**
   * Create a stun effect (cannot attack).
   * @param duration Duration in milliseconds
   */
  stun(duration: number): Effect {
    return {
      id: generateId('stun'),
      name: 'Stunned',
      type: 'stun',
      duration,
      magnitude: 1,
      category: 'debuff',
      description: 'Cannot attack',
    };
  },

  /**
   * Create an invulnerability effect.
   * @param duration Duration in milliseconds
   */
  invulnerable(duration: number): Effect {
    return {
      id: generateId('invuln'),
      name: 'Invulnerable',
      type: 'invulnerable',
      duration,
      magnitude: 1,
      category: 'buff',
      description: 'Immune to damage',
    };
  },

  /**
   * Create a thorns effect (reflect damage to attackers).
   * @param duration Duration in milliseconds
   * @param reflectDamage Damage reflected per hit
   */
  thorns(duration: number, reflectDamage: number): Effect {
    return {
      id: generateId('thorns'),
      name: 'Thorns',
      type: 'thorns',
      duration,
      magnitude: reflectDamage,
      category: 'buff',
      description: `Reflect ${reflectDamage} damage`,
    };
  },

  /**
   * Create a damage shield (absorb damage).
   * @param amount Amount of damage to absorb
   * @param duration Max duration in milliseconds (default: 60 seconds)
   */
  damageShield(amount: number, duration: number = 60000): Effect {
    return {
      id: generateId('shield'),
      name: 'Damage Shield',
      type: 'damage_shield',
      duration,
      magnitude: amount,
      category: 'buff',
      description: `${amount} absorption`,
    };
  },

  /**
   * Create a damage bonus effect.
   * @param duration Duration in milliseconds
   * @param bonusDamage Flat damage bonus
   */
  damageBonus(duration: number, bonusDamage: number): Effect {
    return Effects.combatModifier('damageBonus', bonusDamage, duration, 'Damage Bonus');
  },

  /**
   * Create a critical chance buff.
   * @param duration Duration in milliseconds
   * @param critBonus Critical chance bonus (percentage points)
   */
  criticalChance(duration: number, critBonus: number): Effect {
    return Effects.combatModifier('toCritical', critBonus, duration, 'Critical Strike');
  },

  /**
   * Create an armor buff.
   * @param duration Duration in milliseconds
   * @param armorBonus Armor class bonus
   */
  armorBonus(duration: number, armorBonus: number): Effect {
    return Effects.combatModifier('armorBonus', armorBonus, duration, 'Armor');
  },

  /**
   * Create a weakness effect (reduce strength).
   * @param duration Duration in milliseconds
   * @param amount Amount to reduce strength by
   */
  weakness(duration: number, amount: number): Effect {
    const clampedAmount = clampMagnitude('stat_modifier', -amount);
    return {
      id: generateId('weakness'),
      name: 'Weakness',
      type: 'stat_modifier',
      duration,
      magnitude: clampedAmount,
      stat: 'strength',
      category: 'debuff',
      description: `${clampedAmount} strength`,
    };
  },

  /**
   * Create a custom effect.
   * @param config Effect configuration
   */
  custom(config: Partial<Effect> & { name: string; type: EffectType; duration: number }): Effect {
    return {
      id: config.id || generateId('custom'),
      name: config.name,
      type: config.type,
      duration: config.duration,
      magnitude: config.magnitude || 0,
      tickInterval: config.tickInterval,
      nextTick: config.tickInterval,
      stat: config.stat,
      combatStat: config.combatStat,
      damageType: config.damageType,
      maxStacks: config.maxStacks,
      stacks: config.stacks || (config.maxStacks ? 1 : undefined),
      category: config.category,
      description: config.description,
      hidden: config.hidden,
      onTick: config.onTick,
      onExpire: config.onExpire,
      onRemove: config.onRemove,
    };
  },

  /**
   * Create a generic stat buff.
   */
  statBuff(stat: StatName, amount: number, duration: number, name?: string): Effect {
    return Effects.statModifier(stat, Math.abs(amount), duration, name);
  },

  /**
   * Create a generic stat debuff.
   */
  statDebuff(stat: StatName, amount: number, duration: number, name?: string): Effect {
    return Effects.statModifier(stat, -Math.abs(amount), duration, name);
  },

  /**
   * Create a generic combat stat buff.
   */
  combatBuff(stat: CombatStatName, amount: number, duration: number, name?: string): Effect {
    return Effects.combatModifier(stat, Math.abs(amount), duration, name);
  },

  /**
   * Create a generic combat stat debuff.
   */
  combatDebuff(stat: CombatStatName, amount: number, duration: number, name?: string): Effect {
    return Effects.combatModifier(stat, -Math.abs(amount), duration, name);
  },

  // ========== Visibility Effects ==========

  /**
   * Create a hide effect (thief hide - stationary stealth).
   * @param duration Duration in milliseconds
   * @param skillLevel Skill level (affects visibility level, 0-100)
   */
  hide(duration: number, skillLevel: number = 50): Effect {
    const magnitude = Math.max(50, Math.min(100, skillLevel)); // 50-100 for hidden
    return {
      id: generateId('hide'),
      name: 'Hidden',
      type: 'stealth',
      duration,
      magnitude,
      category: 'buff',
      description: 'You are hidden from view',
      effectType: 'stealth',
    };
  },

  /**
   * Create a sneak effect (thief sneak - moving stealth).
   * @param duration Duration in milliseconds
   * @param skillLevel Skill level (affects visibility level, 0-100)
   */
  sneak(duration: number, skillLevel: number = 30): Effect {
    const magnitude = Math.max(1, Math.min(49, skillLevel)); // 1-49 for sneaking
    return {
      id: generateId('sneak'),
      name: 'Sneaking',
      type: 'stealth',
      duration,
      magnitude,
      category: 'buff',
      description: 'You are moving quietly',
      effectType: 'stealth',
    };
  },

  /**
   * Create an invisibility effect (mage spell).
   * @param duration Duration in milliseconds
   * @param spellPower Spell power (affects duration/quality)
   */
  invisibility(duration: number, spellPower: number = 70): Effect {
    return {
      id: generateId('invis'),
      name: 'Invisibility',
      type: 'invisibility',
      duration,
      magnitude: Math.min(100, spellPower),
      category: 'buff',
      description: 'You are invisible',
      effectType: 'invisibility',
    };
  },

  /**
   * Create a see invisible effect (detection buff).
   * @param duration Duration in milliseconds
   */
  seeInvisible(duration: number): Effect {
    return {
      id: generateId('see_invis'),
      name: 'See Invisible',
      type: 'see_invisible',
      duration,
      magnitude: 1,
      category: 'buff',
      description: 'You can see invisible creatures',
      effectType: 'see_invisible',
    };
  },

  /**
   * Create a detect hidden effect (perception buff).
   * @param duration Duration in milliseconds
   * @param skillLevel Skill level (adds to perception, 0-100)
   */
  detectHidden(duration: number, skillLevel: number = 30): Effect {
    return {
      id: generateId('detect_hidden'),
      name: 'Detect Hidden',
      type: 'detect_hidden',
      duration,
      magnitude: skillLevel,
      category: 'buff',
      description: `+${skillLevel} perception`,
      effectType: 'detect_hidden',
    };
  },
};

/**
 * Common effect durations in milliseconds.
 */
export const EffectDurations = {
  /** 5 seconds */
  veryShort: 5000,
  /** 10 seconds */
  short: 10000,
  /** 30 seconds */
  medium: 30000,
  /** 1 minute */
  long: 60000,
  /** 2 minutes */
  veryLong: 120000,
  /** 5 minutes */
  extended: 300000,
  /** 10 minutes */
  permanent: 600000,
};

export default Effects;
