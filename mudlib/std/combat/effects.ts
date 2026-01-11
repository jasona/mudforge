/**
 * Effect Factories
 *
 * Convenient factory functions for creating common buff/debuff effects.
 */

import type { Effect, EffectType, EffectCategory, CombatStatName, DamageType, StatName } from './types.js';

/**
 * Generate a unique effect ID.
 */
function generateId(baseName: string): string {
  return `${baseName}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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
    return {
      id: generateId('poison'),
      name: 'Poison',
      type: 'damage_over_time',
      duration,
      magnitude: damagePerTick,
      tickInterval,
      nextTick: tickInterval,
      damageType: 'poison',
      maxStacks,
      stacks: 1,
      category: 'debuff',
      description: `${damagePerTick} poison dmg/tick`,
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
    return {
      id: generateId('burn'),
      name: 'Burning',
      type: 'damage_over_time',
      duration,
      magnitude: damagePerTick,
      tickInterval,
      nextTick: tickInterval,
      damageType: 'fire',
      maxStacks: 3,
      stacks: 1,
      category: 'debuff',
      description: `${damagePerTick} fire dmg/tick`,
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
    return {
      id: generateId('bleed'),
      name: 'Bleeding',
      type: 'damage_over_time',
      duration,
      magnitude: damagePerTick,
      tickInterval,
      nextTick: tickInterval,
      damageType: 'slashing',
      maxStacks: 5,
      stacks: 1,
      category: 'debuff',
      description: `${damagePerTick} bleed dmg/tick`,
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
    return {
      id: generateId('regen'),
      name: 'Regeneration',
      type: 'heal_over_time',
      duration,
      magnitude: healPerTick,
      tickInterval,
      nextTick: tickInterval,
      category: 'buff',
      description: `+${healPerTick} HP/tick`,
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
    const effectName = name || (amount >= 0 ? `${stat} Buff` : `${stat} Debuff`);
    const category: EffectCategory = amount >= 0 ? 'buff' : 'debuff';
    const sign = amount >= 0 ? '+' : '';
    return {
      id: generateId(`stat_${stat}`),
      name: effectName,
      type: 'stat_modifier',
      duration,
      magnitude: amount,
      stat,
      category,
      description: `${sign}${amount} ${stat}`,
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
    const effectName = name || `${stat} Modifier`;
    const category: EffectCategory = amount >= 0 ? 'buff' : 'debuff';
    const sign = amount >= 0 ? '+' : '';
    return {
      id: generateId(`combat_${stat}`),
      name: effectName,
      type: 'combat_modifier',
      duration,
      magnitude: amount,
      combatStat: stat,
      category,
      description: `${sign}${amount} ${stat}`,
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
    return {
      id: generateId('weakness'),
      name: 'Weakness',
      type: 'stat_modifier',
      duration,
      magnitude: -amount,
      stat: 'strength',
      category: 'debuff',
      description: `-${amount} strength`,
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
