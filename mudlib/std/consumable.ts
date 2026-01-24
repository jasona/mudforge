/**
 * Consumable - Base class for food, drinks, and potions.
 *
 * Consumables can heal HP/MP instantly, apply regeneration effects,
 * and grant stat buffs. They track portions and are destroyed when depleted.
 */

import { Item } from './item.js';
import { Living, type StatName } from './living.js';
import type { Effect } from './combat/types.js';

/**
 * Consumable types.
 */
export type ConsumableType = 'food' | 'drink' | 'potion';

/**
 * Regeneration effect configuration.
 */
export interface RegenEffect {
  /** Duration in milliseconds */
  duration: number;
  /** HP healed per tick */
  healPerTick: number;
  /** Tick interval in milliseconds (default 3000ms) */
  tickInterval?: number;
}

/**
 * Stat buff configuration.
 */
export interface StatBuff {
  /** The stat to modify */
  stat: StatName;
  /** Amount to add (can be negative) */
  amount: number;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Consumable configuration options.
 */
export interface ConsumableConfig {
  /** Type of consumable */
  type: ConsumableType;
  /** Instant HP healing */
  healHp?: number;
  /** Instant MP restoration */
  healMp?: number;
  /** Regeneration effect over time */
  regenEffect?: RegenEffect;
  /** Stat buffs to apply */
  statBuffs?: StatBuff[];
  /** Number of portions (-1 = infinite, default 1) */
  portions?: number;
  /** Message shown to the consumer */
  consumeMessage?: string;
  /** Message shown to others in the room */
  roomMessage?: string;
}

/**
 * Base class for consumable items.
 */
export class Consumable extends Item {
  private _consumableType: ConsumableType = 'food';
  private _healHp: number = 0;
  private _healMp: number = 0;
  private _regenEffect: RegenEffect | null = null;
  private _statBuffs: StatBuff[] = [];
  private _portions: number = 1;
  private _maxPortions: number = 1;
  private _consumeMessage: string = '';
  private _roomMessage: string = '';

  constructor() {
    super();
    this.shortDesc = 'a consumable item';
    this.longDesc = 'This item can be consumed.';
    this.size = 'small';
  }

  // ========== Configuration ==========

  /**
   * Configure the consumable with options.
   */
  setConsumable(config: ConsumableConfig): void {
    this._consumableType = config.type;
    if (config.healHp !== undefined) this._healHp = config.healHp;
    if (config.healMp !== undefined) this._healMp = config.healMp;
    if (config.regenEffect) this._regenEffect = config.regenEffect;
    if (config.statBuffs) this._statBuffs = config.statBuffs;
    if (config.portions !== undefined) {
      this._portions = config.portions;
      this._maxPortions = config.portions;
    }
    if (config.consumeMessage) this._consumeMessage = config.consumeMessage;
    if (config.roomMessage) this._roomMessage = config.roomMessage;

    // Set up appropriate actions based on type
    this.setupActions();
  }

  /**
   * Set up eat/drink actions based on consumable type.
   */
  private setupActions(): void {
    if (this._consumableType === 'food') {
      this.addAction('eat', async (args) => this.consume(this.getConsumer()));
      this.addAction('consume', async (args) => this.consume(this.getConsumer()));
    } else {
      // drink or potion
      this.addAction('drink', async (args) => this.consume(this.getConsumer()));
      this.addAction('quaff', async (args) => this.consume(this.getConsumer()));
    }
  }

  /**
   * Get the living that is holding this item.
   */
  private getConsumer(): Living | null {
    const env = this.environment;
    if (env && 'isLiving' in env && (env as Living).isLiving) {
      return env as Living;
    }
    return null;
  }

  // ========== Properties ==========

  /**
   * Get the consumable type.
   */
  get consumableType(): ConsumableType {
    return this._consumableType;
  }

  /**
   * Get remaining portions.
   */
  get portions(): number {
    return this._portions;
  }

  /**
   * Get max portions.
   */
  get maxPortions(): number {
    return this._maxPortions;
  }

  /**
   * Get instant HP heal amount.
   */
  get healHp(): number {
    return this._healHp;
  }

  /**
   * Get instant MP heal amount.
   */
  get healMp(): number {
    return this._healMp;
  }

  // ========== Consumption ==========

  /**
   * Consume the item, applying effects to the consumer.
   * @param consumer The living consuming the item
   * @returns true if consumption was successful
   */
  async consume(consumer: Living | null): Promise<boolean> {
    if (!consumer) {
      return false;
    }

    // Check if any portions remaining
    if (this._portions === 0) {
      consumer.receive(`The ${this.shortDesc} is all gone.\n`);
      return false;
    }

    // Check if consumer is alive
    if (!consumer.alive) {
      consumer.receive("You can't do that while dead.\n");
      return false;
    }

    // Apply instant heals
    if (this._healHp > 0) {
      consumer.heal(this._healHp);
    }
    if (this._healMp > 0) {
      consumer.restoreMana(this._healMp);
    }

    // Apply regeneration effect
    if (this._regenEffect) {
      const regenEffect: Effect = {
        id: `regen_${this.objectId}_${Date.now()}`,
        name: 'Regeneration',
        type: 'heal_over_time',
        duration: this._regenEffect.duration,
        tickInterval: this._regenEffect.tickInterval || 3000,
        nextTick: this._regenEffect.tickInterval || 3000,
        magnitude: this._regenEffect.healPerTick,
        category: 'buff',
        description: `+${this._regenEffect.healPerTick} HP every ${(this._regenEffect.tickInterval || 3000) / 1000}s`,
      };
      consumer.addEffect(regenEffect);
    }

    // Apply stat buffs
    for (const buff of this._statBuffs) {
      const statEffect: Effect = {
        id: `${buff.stat}_buff_${this.objectId}_${Date.now()}`,
        name: `${buff.stat.charAt(0).toUpperCase() + buff.stat.slice(1)} Boost`,
        type: 'stat_modifier',
        duration: buff.duration,
        magnitude: buff.amount,
        stat: buff.stat,
        category: buff.amount > 0 ? 'buff' : 'debuff',
        description: `${buff.amount > 0 ? '+' : ''}${buff.amount} ${buff.stat}`,
      };
      consumer.addEffect(statEffect);
    }

    // Show consumption messages
    const verb = this._consumableType === 'food' ? 'eat' : 'drink';
    const defaultMessage = `You ${verb} ${this.shortDesc}.`;
    consumer.receive(`${this._consumeMessage || defaultMessage}\n`);

    // Show effects applied
    if (this._healHp > 0) {
      consumer.receive(`{green}You feel restored. (+${this._healHp} HP){/}\n`);
    }
    if (this._healMp > 0) {
      consumer.receive(`{cyan}You feel energized. (+${this._healMp} MP){/}\n`);
    }
    if (this._regenEffect) {
      consumer.receive(`{green}You feel a warm sensation as your wounds begin to mend.{/}\n`);
    }
    for (const buff of this._statBuffs) {
      const statName = buff.stat.charAt(0).toUpperCase() + buff.stat.slice(1);
      consumer.receive(`{yellow}Your ${statName} ${buff.amount > 0 ? 'increases' : 'decreases'}!{/}\n`);
    }

    // Broadcast to room
    const room = consumer.environment;
    if (room && 'broadcast' in room && this._roomMessage) {
      const name = typeof efuns !== 'undefined' ? efuns.capitalize(consumer.name) : consumer.name;
      const msg = this._roomMessage.replace(/\$N/g, name).replace(/\$n/g, consumer.name);
      (room as { broadcast: (msg: string, opts?: { exclude?: Living[] }) => void })
        .broadcast(msg + '\n', { exclude: [consumer] });
    }

    // Reduce portions
    if (this._portions > 0) {
      this._portions--;
    }

    // Destroy if depleted (unless infinite)
    if (this._portions === 0) {
      if (typeof efuns !== 'undefined' && efuns.destruct) {
        await efuns.destruct(this);
      }
    }

    return true;
  }

  /**
   * Override onExamine to show portion info.
   */
  override onExamine(): string {
    let desc = this.longDesc;
    if (this._maxPortions > 1 && this._portions >= 0) {
      desc += `\nPortions remaining: ${this._portions}/${this._maxPortions}`;
    }
    return desc;
  }
}

/**
 * Factory for creating common effects.
 */
export const Effects = {
  /**
   * Create a regeneration effect.
   */
  regeneration(
    duration: number,
    healPerTick: number,
    tickInterval: number = 3000
  ): RegenEffect {
    return { duration, healPerTick, tickInterval };
  },

  /**
   * Create a stat buff.
   */
  statBuff(stat: StatName, amount: number, duration: number): StatBuff {
    return { stat, amount, duration };
  },
};

export default Consumable;
