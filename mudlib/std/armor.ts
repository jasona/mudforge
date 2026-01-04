/**
 * Armor - Base class for armor items.
 *
 * Armor can be worn by Living beings and provides protection.
 */

import { Item } from './item.js';
import { MudObject } from './object.js';
import { Living } from './living.js';
import type { DamageType } from './weapon.js';

/**
 * Armor slot.
 */
export type ArmorSlot = 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'cloak' | 'shield';

/**
 * Base class for armor.
 */
export class Armor extends Item {
  private _armor: number = 1;
  private _slot: ArmorSlot = 'chest';
  private _wearer: Living | null = null;
  private _resistances: Map<DamageType, number> = new Map();

  constructor() {
    super();
    this.shortDesc = 'a piece of armor';
    this.longDesc = 'This is a piece of armor.';
    this.weight = 3;
  }

  // ========== Properties ==========

  /**
   * Get armor value.
   */
  get armor(): number {
    return this._armor;
  }

  /**
   * Set armor value.
   */
  set armor(value: number) {
    this._armor = Math.max(0, value);
  }

  /**
   * Get armor slot.
   */
  get slot(): ArmorSlot {
    return this._slot;
  }

  /**
   * Set armor slot.
   */
  set slot(value: ArmorSlot) {
    this._slot = value;
  }

  /**
   * Get the current wearer.
   */
  get wearer(): Living | null {
    return this._wearer;
  }

  /**
   * Check if the armor is worn.
   */
  get isWorn(): boolean {
    return this._wearer !== null;
  }

  // ========== Resistances ==========

  /**
   * Set resistance to a damage type.
   * @param type Damage type
   * @param value Resistance value (positive = resistance, negative = vulnerability)
   */
  setResistance(type: DamageType, value: number): void {
    this._resistances.set(type, value);
  }

  /**
   * Get resistance to a damage type.
   * @param type Damage type
   */
  getResistance(type: DamageType): number {
    return this._resistances.get(type) || 0;
  }

  /**
   * Get all resistances.
   */
  getResistances(): Map<DamageType, number> {
    return new Map(this._resistances);
  }

  // ========== Combat ==========

  /**
   * Calculate damage reduction.
   * @param incomingDamage The incoming damage
   * @param damageType The type of damage
   */
  reduceDamage(incomingDamage: number, damageType: DamageType): number {
    // Base armor reduction
    let reduction = this._armor;

    // Add resistance for this damage type
    const resistance = this.getResistance(damageType);
    reduction += resistance;

    // Can't reduce below 0
    return Math.max(0, incomingDamage - reduction);
  }

  // ========== Wear/Remove ==========

  /**
   * Check if a living can wear this armor.
   * @param wearer The potential wearer
   */
  canWear(wearer: Living): boolean {
    // Already worn
    if (this._wearer) return false;

    // Could add class/level restrictions here

    return true;
  }

  /**
   * Wear this armor.
   * @param wearer The living wearing the armor
   * @returns true if successfully worn
   */
  wear(wearer: Living): boolean {
    if (!this.canWear(wearer)) {
      return false;
    }

    this._wearer = wearer;
    this.onWear(wearer);
    return true;
  }

  /**
   * Remove this armor.
   * @returns true if successfully removed
   */
  remove(): boolean {
    if (!this._wearer) {
      return false;
    }

    const previousWearer = this._wearer;
    this._wearer = null;
    this.onRemove(previousWearer);
    return true;
  }

  // ========== Hooks ==========

  /**
   * Called when the armor is worn.
   * @param wearer The living wearing the armor
   */
  onWear(wearer: Living): void | Promise<void> {
    // Default: do nothing
  }

  /**
   * Called when the armor is removed.
   * @param wearer The living who was wearing the armor
   */
  onRemove(wearer: Living): void | Promise<void> {
    // Default: do nothing
  }

  /**
   * Called when the armor absorbs damage.
   * @param wearer The wearer
   * @param damage Original damage
   * @param reduced Reduced damage
   */
  onAbsorb(wearer: Living, damage: number, reduced: number): void | Promise<void> {
    // Default: do nothing
  }

  /**
   * Called when the armor breaks (durability system).
   * @param wearer The wearer when the armor broke
   */
  onBreak(wearer: Living): void | Promise<void> {
    // Default: do nothing
  }

  // ========== Lifecycle ==========

  /**
   * Prevent dropping while worn.
   */
  override onDrop(dropper: MudObject): boolean | Promise<boolean> {
    if (this._wearer) {
      return false;
    }
    return super.onDrop(dropper);
  }

  /**
   * Clean up when destroyed.
   */
  override async onDestroy(): Promise<void> {
    if (this._wearer) {
      this.remove();
    }
    await super.onDestroy();
  }

  // ========== Setup ==========

  /**
   * Configure the armor.
   */
  setArmor(options: {
    shortDesc?: string;
    longDesc?: string;
    weight?: number;
    value?: number;
    armor?: number;
    slot?: ArmorSlot;
    resistances?: Partial<Record<DamageType, number>>;
  }): void {
    if (options.shortDesc) this.shortDesc = options.shortDesc;
    if (options.longDesc) this.longDesc = options.longDesc;
    if (options.weight !== undefined) this.weight = options.weight;
    if (options.value !== undefined) this.value = options.value;
    if (options.armor !== undefined) this.armor = options.armor;
    if (options.slot) this.slot = options.slot;
    if (options.resistances) {
      for (const [type, value] of Object.entries(options.resistances)) {
        this.setResistance(type as DamageType, value);
      }
    }
  }
}

export default Armor;
