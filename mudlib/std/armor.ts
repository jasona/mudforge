/**
 * Armor - Base class for armor items.
 *
 * Armor can be worn by Living beings and provides protection.
 */

import { Item, ItemSize } from './item.js';
import { MudObject } from './object.js';
import { Living } from './living.js';
import type { DamageType } from './weapon.js';
import type { EquipResult, CanEquipResult, EquipmentSlot } from './equipment.js';

/**
 * Armor slot.
 */
export type ArmorSlot = 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'cloak' | 'shield';

/**
 * Base class for armor.
 */
/**
 * Slot multipliers for armor value distribution.
 */
const SLOT_ARMOR_MULTIPLIER: Record<ArmorSlot, number> = {
  chest: 1.0,
  head: 0.6,
  legs: 0.75,
  hands: 0.4,
  feet: 0.5,
  cloak: 0.3,
  shield: 0.6,
};

export class Armor extends Item {
  private _armor: number = 1;
  private _slot: ArmorSlot = 'chest';
  private _wearer: Living | null = null;
  private _resistances: Map<DamageType, number> = new Map();
  private _itemLevel: number = 1;
  private _toDodge: number = 0; // Dodge bonus/penalty from armor weight
  private _toBlock: number = 0; // Block bonus for shields

  constructor() {
    super();
    this.shortDesc = 'a piece of armor';
    this.longDesc = 'This is a piece of armor.';
    // Armor is generally large/heavy
    this.size = 'large';
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

  /**
   * Check if this is a shield.
   */
  get isShield(): boolean {
    return this._slot === 'shield';
  }

  /**
   * Get dodge bonus/penalty from this armor.
   * Light armor gives positive values, heavy armor may give negative.
   */
  get toDodge(): number {
    return this._toDodge;
  }

  /**
   * Set dodge bonus/penalty.
   */
  set toDodge(value: number) {
    this._toDodge = value;
  }

  /**
   * Get block bonus for shields.
   */
  get toBlock(): number {
    return this._toBlock;
  }

  /**
   * Set block bonus.
   */
  set toBlock(value: number) {
    this._toBlock = value;
  }

  /**
   * Get the actual equipment slot this armor uses.
   * Shield uses off_hand, other armor uses its designated slot.
   */
  getEquipmentSlot(): EquipmentSlot {
    return this._slot === 'shield' ? 'off_hand' : this._slot;
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

  // ========== Item Level Auto-Balance ==========

  /**
   * Get the item level.
   */
  get itemLevel(): number {
    return this._itemLevel;
  }

  /**
   * Auto-balance armor based on item level and slot. Sets armor value, dodge/block, and gold value.
   * Slot affects armor distribution (chest = 100%, head = 60%, etc.).
   * Size affects dodge: small = light armor (+dodge), large = heavy armor (no dodge bonus).
   * All values can be overridden after calling this method.
   * @param level The item level (1-50)
   */
  setItemLevel(level: number): this {
    this._itemLevel = Math.max(1, Math.min(50, level));

    // Base armor formula: 1 + floor(level / 3)
    const baseArmor = 1 + Math.floor(level / 3);

    // Apply slot multiplier
    const slotMult = SLOT_ARMOR_MULTIPLIER[this._slot] || 1.0;
    this._armor = Math.max(1, Math.round(baseArmor * slotMult));

    // Dodge bonus based on armor size (weight class)
    // Light armor (small/medium) grants dodge; heavy armor (large+) doesn't
    // toDodge formula: +1 per 10 levels for light armor, +1 per 15 for medium, 0 for heavy
    if (this.size === 'small' || this.size === 'tiny') {
      // Light armor: +1 dodge per 10 levels (max +5)
      this._toDodge = Math.floor(level / 10);
    } else if (this.size === 'medium') {
      // Medium armor: +1 dodge per 15 levels (max +3)
      this._toDodge = Math.floor(level / 15);
    } else {
      // Heavy armor (large/huge): no dodge bonus
      this._toDodge = 0;
    }

    // Shields get block bonus: +2 per 10 levels
    if (this._slot === 'shield') {
      this._toBlock = Math.max(5, Math.floor(level / 5) + 3);
    }

    // Value formula: level * 10, adjusted by slot
    const valueMultiplier = this._slot === 'chest' ? 1.5 :
                            (this._slot === 'hands' || this._slot === 'feet') ? 0.5 : 1.0;
    this._value = Math.round(level * 10 * valueMultiplier);

    return this;
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
   * @returns Object with canEquip, reason info
   */
  canWear(wearer: Living): CanEquipResult {
    // Already worn
    if (this._wearer) {
      return { canEquip: false, reason: 'This armor is already worn.' };
    }

    // Must be in wearer's inventory
    if (this.environment !== wearer) {
      return { canEquip: false, reason: 'You must be carrying the armor to wear it.' };
    }

    // Get the actual equipment slot
    const equipSlot = this.getEquipmentSlot();

    // Shield special case - uses off_hand
    if (this._slot === 'shield') {
      if (!wearer.isOffHandAvailable()) {
        return { canEquip: false, reason: 'Your off-hand is not available for a shield.' };
      }
    } else {
      // Check if slot is occupied
      if (wearer.isSlotOccupied(equipSlot)) {
        return { canEquip: false, reason: `You are already wearing something on your ${this._slot}.` };
      }
    }

    // Could add class/level restrictions here

    return { canEquip: true, slot: equipSlot };
  }

  /**
   * Wear this armor.
   * @param wearer The living wearing the armor
   * @returns Result with success and message
   */
  wear(wearer: Living): EquipResult {
    const check = this.canWear(wearer);
    if (!check.canEquip) {
      return { success: false, message: check.reason || 'Cannot wear this armor.' };
    }

    this._wearer = wearer;

    // Register with living's equipment system
    const equipSlot = this.getEquipmentSlot();
    wearer.equipToSlot(equipSlot, this);

    // Apply combat stat modifiers
    if (this._toDodge !== 0) {
      wearer.addCombatStatModifier('toDodge', this._toDodge);
    }
    if (this._toBlock !== 0) {
      wearer.addCombatStatModifier('toBlock', this._toBlock);
    }

    this.onWear(wearer);
    return { success: true, message: `You wear ${this.shortDesc}.` };
  }

  /**
   * Remove this armor.
   * @returns Result with success and message
   */
  remove(): EquipResult {
    if (!this._wearer) {
      return { success: false, message: 'This armor is not worn.' };
    }

    const previousWearer = this._wearer;
    const desc = this.shortDesc;

    // Remove combat stat modifiers
    if (this._toDodge !== 0) {
      previousWearer.addCombatStatModifier('toDodge', -this._toDodge);
    }
    if (this._toBlock !== 0) {
      previousWearer.addCombatStatModifier('toBlock', -this._toBlock);
    }

    // Unregister from living's equipment system
    const equipSlot = this.getEquipmentSlot();
    previousWearer.unequipFromSlot(equipSlot);

    this._wearer = null;
    this.onRemove(previousWearer);

    return { success: true, message: `You remove ${desc}.` };
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
    size?: ItemSize;
    weight?: number;
    value?: number;
    armor?: number;
    slot?: ArmorSlot;
    resistances?: Partial<Record<DamageType, number>>;
    itemLevel?: number;
    toDodge?: number;
    toBlock?: number;
  }): void {
    // Set slot first (needed for itemLevel calculation)
    if (options.slot) this.slot = options.slot;
    // Set size so weight can override
    if (options.size !== undefined) this.size = options.size;
    if (options.shortDesc) this.shortDesc = options.shortDesc;
    if (options.longDesc) this.longDesc = options.longDesc;
    if (options.weight !== undefined) this.weight = options.weight;
    // If itemLevel is set, use auto-balance (unless armor/value is explicitly provided)
    if (options.itemLevel !== undefined) {
      this.setItemLevel(options.itemLevel);
    }
    // Explicit armor value overrides itemLevel
    if (options.armor !== undefined) this.armor = options.armor;
    // Explicit value overrides itemLevel
    if (options.value !== undefined) this.value = options.value;
    if (options.resistances) {
      for (const [type, value] of Object.entries(options.resistances)) {
        this.setResistance(type as DamageType, value);
      }
    }
    // Explicit combat stats override itemLevel
    if (options.toDodge !== undefined) this.toDodge = options.toDodge;
    if (options.toBlock !== undefined) this.toBlock = options.toBlock;
  }
}

export default Armor;
