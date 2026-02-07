/**
 * Weapon - Base class for weapon items.
 *
 * Weapons can be wielded by Living beings and affect combat.
 */

import { Item, ItemSize } from './item.js';
import { MudObject } from './object.js';
import { Living } from './living.js';
import type { EquipResult, CanEquipResult, WeaponHandedness } from './equipment.js';

// Re-export the type for convenience
export type { WeaponHandedness } from './equipment.js';

/**
 * Damage type for weapons.
 */
export type DamageType =
  | 'slashing'
  | 'piercing'
  | 'bludgeoning'
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'poison'
  | 'holy'
  | 'dark'
  | 'physical'; // Legacy, maps to bludgeoning

/**
 * Special attack callback type.
 */
export type SpecialAttackCallback = (attacker: Living, defender: Living) => {
  triggered: boolean;
  message?: string;
  damage?: number;
  effect?: import('./combat/types.js').Effect;
} | null;

/**
 * Weapon slot (where it's actually equipped).
 */
export type WeaponSlot = 'main_hand' | 'off_hand';

/**
 * Base class for weapons.
 */
export class Weapon extends Item {
  readonly isWeapon: boolean = true;
  private _minDamage: number = 1;
  private _maxDamage: number = 3;
  private _damageType: DamageType = 'bludgeoning';
  private _handedness: WeaponHandedness = 'one_handed';
  private _slot: WeaponSlot = 'main_hand';
  private _wielder: Living | null = null;
  private _skillRequired: string | null = null;
  private _skillLevel: number = 0;

  // Combat extensions
  private _attackSpeed: number = 0; // -0.5 (slow) to +0.5 (fast), 0 is normal
  private _specialAttackChance: number = 0; // 0-100 percentage per round
  private _specialAttack: SpecialAttackCallback | null = null;
  private _toHit: number = 0; // Accuracy bonus from weapon quality

  // Parry/riposte properties
  private _toParry: number = 0; // Parry bonus when wielded
  private _toRiposte: number = 0; // Riposte bonus when wielded
  private _canParry: boolean = true; // Whether weapon can parry (false for ranged)

  // Auto-balance item level
  private _itemLevel: number = 1;

  constructor() {
    super();
    this.shortDesc = 'a weapon';
    this.longDesc = 'This is a weapon.';
    // Default weapons are medium size (swords, etc.)
    this.size = 'medium';
  }

  // ========== Properties ==========

  /**
   * Get minimum damage.
   */
  get minDamage(): number {
    return this._minDamage;
  }

  /**
   * Set minimum damage.
   */
  set minDamage(value: number) {
    this._minDamage = Math.max(0, value);
  }

  /**
   * Get maximum damage.
   */
  get maxDamage(): number {
    return this._maxDamage;
  }

  /**
   * Set maximum damage.
   */
  set maxDamage(value: number) {
    this._maxDamage = Math.max(this._minDamage, value);
  }

  /**
   * Get damage type.
   */
  get damageType(): DamageType {
    return this._damageType;
  }

  /**
   * Set damage type.
   */
  set damageType(value: DamageType) {
    this._damageType = value;
  }

  /**
   * Get weapon handedness.
   */
  get handedness(): WeaponHandedness {
    return this._handedness;
  }

  /**
   * Set weapon handedness.
   * Also updates size: light weapons default to 'small', two-handed to 'large'.
   */
  set handedness(value: WeaponHandedness) {
    this._handedness = value;
    // Update default size based on handedness (unless explicitly set)
    if (value === 'light') {
      this.size = 'small';
    } else if (value === 'two_handed') {
      this.size = 'large';
    }
  }

  /**
   * Get weapon slot (the slot it's currently in, or default slot).
   */
  get slot(): WeaponSlot {
    return this._slot;
  }

  /**
   * Set weapon slot.
   */
  set slot(value: WeaponSlot) {
    this._slot = value;
  }

  /**
   * Check if this weapon can be used in off-hand for dual-wielding.
   */
  get canOffHand(): boolean {
    return this._handedness === 'light';
  }

  /**
   * Check if this is a two-handed weapon.
   */
  get isTwoHanded(): boolean {
    return this._handedness === 'two_handed';
  }

  /**
   * Get the current wielder.
   */
  get wielder(): Living | null {
    return this._wielder;
  }

  /**
   * Check if the weapon is wielded.
   */
  get isWielded(): boolean {
    return this._wielder !== null;
  }

  /**
   * Get required skill name.
   */
  get skillRequired(): string | null {
    return this._skillRequired;
  }

  /**
   * Set required skill.
   * @param skill Skill name
   * @param level Required level
   */
  setSkillRequired(skill: string | null, level: number = 0): void {
    this._skillRequired = skill;
    this._skillLevel = level;
  }

  /**
   * Get required skill level.
   */
  get skillLevel(): number {
    return this._skillLevel;
  }

  // ========== Attack Speed ==========

  /**
   * Get attack speed modifier.
   * Positive = faster (-0.5 to +0.5 typical range)
   */
  get attackSpeed(): number {
    return this._attackSpeed;
  }

  /**
   * Set attack speed modifier.
   */
  set attackSpeed(value: number) {
    this._attackSpeed = Math.max(-0.5, Math.min(0.5, value));
  }

  /**
   * Get accuracy (toHit) bonus from weapon quality.
   * Higher quality weapons are more accurate.
   */
  get toHit(): number {
    return this._toHit;
  }

  /**
   * Set accuracy (toHit) bonus.
   */
  set toHit(value: number) {
    this._toHit = value;
  }

  // ========== Parry/Riposte ==========

  /**
   * Get parry bonus from this weapon.
   */
  get toParry(): number {
    return this._toParry;
  }

  /**
   * Set parry bonus.
   */
  set toParry(value: number) {
    this._toParry = value;
  }

  /**
   * Get riposte bonus from this weapon.
   */
  get toRiposte(): number {
    return this._toRiposte;
  }

  /**
   * Set riposte bonus.
   */
  set toRiposte(value: number) {
    this._toRiposte = value;
  }

  /**
   * Check if this weapon can be used to parry.
   * Most melee weapons can parry, but ranged weapons typically cannot.
   */
  get canParry(): boolean {
    return this._canParry;
  }

  /**
   * Set whether this weapon can parry.
   */
  set canParry(value: boolean) {
    this._canParry = value;
  }

  // ========== Special Attacks ==========

  /**
   * Get special attack chance (0-100).
   */
  get specialAttackChance(): number {
    return this._specialAttackChance;
  }

  /**
   * Set special attack chance.
   */
  set specialAttackChance(value: number) {
    this._specialAttackChance = Math.max(0, Math.min(100, value));
  }

  /**
   * Get the special attack callback.
   */
  get specialAttack(): SpecialAttackCallback | null {
    return this._specialAttack;
  }

  /**
   * Set a special attack for this weapon.
   * @param chance Chance per round (0-100)
   * @param callback The special attack function
   */
  setSpecialAttack(chance: number, callback: SpecialAttackCallback): void {
    this._specialAttackChance = Math.max(0, Math.min(100, chance));
    this._specialAttack = callback;
  }

  /**
   * Clear the special attack.
   */
  clearSpecialAttack(): void {
    this._specialAttackChance = 0;
    this._specialAttack = null;
  }

  /**
   * Try to trigger a special attack.
   * @param attacker The attacker
   * @param defender The defender
   * @returns Special attack result, or null if not triggered
   */
  trySpecialAttack(attacker: Living, defender: Living): ReturnType<SpecialAttackCallback> {
    if (!this._specialAttack || this._specialAttackChance <= 0) {
      return null;
    }

    const roll = Math.random() * 100;
    if (roll >= this._specialAttackChance) {
      return null;
    }

    return this._specialAttack(attacker, defender);
  }

  // ========== Item Level Auto-Balance ==========

  /**
   * Get the item level.
   */
  get itemLevel(): number {
    return this._itemLevel;
  }

  /**
   * Auto-balance weapon based on item level. Sets damage, accuracy, and value.
   * Handedness affects damage (two-handed +50%, light -25%).
   * All values can be overridden after calling this method.
   * @param level The item level (1-50)
   */
  setItemLevel(level: number): this {
    this._itemLevel = Math.max(1, Math.min(50, level));

    // Base damage formula: min = 2 + level*0.5, max = 4 + level
    let minDmg = Math.round(2 + (level * 0.5));
    let maxDmg = Math.round(4 + level);

    // Apply handedness multiplier
    if (this._handedness === 'two_handed') {
      minDmg = Math.round(minDmg * 1.5);
      maxDmg = Math.round(maxDmg * 1.5);
    } else if (this._handedness === 'light') {
      minDmg = Math.round(minDmg * 0.75);
      maxDmg = Math.round(maxDmg * 0.75);
    }

    this._minDamage = Math.max(1, minDmg);
    this._maxDamage = Math.max(this._minDamage + 1, maxDmg);

    // toHit formula: +1 per 5 levels (level 5 = +1, level 50 = +10)
    this._toHit = Math.floor(level / 5);

    // Value formula: level * 15
    this._value = level * 15;

    return this;
  }

  // ========== Combat ==========

  /**
   * Roll damage (random between min and max).
   * Used by the combat system.
   */
  rollDamage(): number {
    const range = this._maxDamage - this._minDamage;
    const roll = Math.floor(Math.random() * (range + 1));
    return this._minDamage + roll;
  }

  /**
   * Calculate damage for an attack.
   * Override this for custom damage calculation.
   * @param attacker The attacker
   * @param defender The defender
   */
  calculateDamage(attacker: Living, defender: MudObject): number {
    return this.rollDamage();
  }

  // ========== Wield/Unwield ==========

  /**
   * Check if a living can wield this weapon.
   * @param wielder The potential wielder
   * @param preferredSlot Optional preferred slot (main_hand or off_hand)
   * @returns Object with canEquip, reason, and slot info
   */
  canWield(wielder: Living, preferredSlot?: WeaponSlot): CanEquipResult & { slot?: WeaponSlot } {
    // Already wielded
    if (this._wielder) {
      return { canEquip: false, reason: 'This weapon is already wielded.' };
    }

    // Must be in wielder's inventory
    if (this.environment !== wielder) {
      return { canEquip: false, reason: 'You must be carrying the weapon to wield it.' };
    }

    // Two-handed weapons always use main_hand (and occupy both)
    if (this._handedness === 'two_handed') {
      // Check both slots are free
      if (wielder.isSlotOccupied('main_hand') || wielder.isSlotOccupied('off_hand')) {
        return { canEquip: false, reason: 'You need both hands free to wield this weapon.' };
      }
      return { canEquip: true, slot: 'main_hand' };
    }

    // Determine target slot
    let targetSlot: WeaponSlot = preferredSlot || 'main_hand';

    // Light weapons can go in off-hand, one-handed cannot
    if (targetSlot === 'off_hand' && this._handedness !== 'light') {
      return { canEquip: false, reason: 'This weapon is too heavy for your off-hand.' };
    }

    // Check if target slot is available
    if (wielder.isSlotOccupied(targetSlot)) {
      // Try alternate slot if light weapon
      if (this._handedness === 'light') {
        const altSlot: WeaponSlot = targetSlot === 'main_hand' ? 'off_hand' : 'main_hand';
        if (!wielder.isSlotOccupied(altSlot)) {
          return { canEquip: true, slot: altSlot };
        }
      }
      return { canEquip: false, reason: `Your ${targetSlot.replace('_', ' ')} is already occupied.` };
    }

    // Check skill requirement (placeholder for extensibility)

    return { canEquip: true, slot: targetSlot };
  }

  /**
   * Wield this weapon.
   * @param wielder The living wielding the weapon
   * @param preferredSlot Optional preferred slot
   * @returns Result with success and message
   */
  wield(wielder: Living, preferredSlot?: WeaponSlot): EquipResult {
    const check = this.canWield(wielder, preferredSlot);
    if (!check.canEquip) {
      return { success: false, message: check.reason || 'Cannot wield this weapon.' };
    }

    // Set the slot used
    this._slot = check.slot!;
    this._wielder = wielder;

    // Register with living's equipment system
    const occupiesBoth = this._handedness === 'two_handed';
    wielder.equipToSlot(this._slot, this, occupiesBoth);

    // Apply toHit combat modifier from weapon quality
    if (this._toHit !== 0) {
      wielder.addCombatStatModifier('toHit', this._toHit);
    }

    // Apply parry modifier
    if (this._toParry !== 0) {
      wielder.addCombatStatModifier('toParry', this._toParry);
    }

    // Apply riposte modifier
    if (this._toRiposte !== 0) {
      wielder.addCombatStatModifier('toRiposte', this._toRiposte);
    }

    this.onWield(wielder);
    return { success: true, message: `You wield ${this.shortDesc}.` };
  }

  /**
   * Unwield this weapon.
   * @returns Result with success and message
   */
  unwield(): EquipResult {
    if (!this._wielder) {
      return { success: false, message: 'This weapon is not wielded.' };
    }

    const previousWielder = this._wielder;
    const desc = this.shortDesc;

    // Remove toHit combat modifier
    if (this._toHit !== 0) {
      previousWielder.addCombatStatModifier('toHit', -this._toHit);
    }

    // Remove parry modifier
    if (this._toParry !== 0) {
      previousWielder.addCombatStatModifier('toParry', -this._toParry);
    }

    // Remove riposte modifier
    if (this._toRiposte !== 0) {
      previousWielder.addCombatStatModifier('toRiposte', -this._toRiposte);
    }

    // Unregister from living's equipment system
    previousWielder.unequipFromSlot(this._slot);

    this._wielder = null;
    this.onUnwield(previousWielder);

    return { success: true, message: `You stop wielding ${desc}.` };
  }

  // ========== Hooks ==========

  /**
   * Called when the weapon is wielded.
   * @param wielder The living wielding the weapon
   */
  onWield(wielder: Living): void | Promise<void> {
    // Default: do nothing
  }

  /**
   * Called when the weapon is unwielded.
   * @param wielder The living who was wielding the weapon
   */
  onUnwield(wielder: Living): void | Promise<void> {
    // Default: do nothing
  }

  /**
   * Called when an attack is made with this weapon.
   * @param attacker The attacker
   * @param defender The defender
   * @param damage The damage dealt
   */
  onAttack(attacker: Living, defender: MudObject, damage: number): void | Promise<void> {
    // Default: do nothing
  }

  /**
   * Called when this weapon breaks (durability system).
   * @param wielder The wielder when the weapon broke
   */
  onBreak(wielder: Living): void | Promise<void> {
    // Default: do nothing
  }

  // ========== Lifecycle ==========

  /**
   * Prevent dropping while wielded.
   */
  override onDrop(dropper: MudObject): boolean | Promise<boolean> {
    if (this._wielder) {
      return false;
    }
    return super.onDrop(dropper);
  }

  /**
   * Clean up when destroyed.
   */
  override async onDestroy(): Promise<void> {
    if (this._wielder) {
      this.unwield();
    }
    await super.onDestroy();
  }

  // ========== Setup ==========

  /**
   * Configure the weapon.
   */
  setWeapon(options: {
    shortDesc?: string;
    longDesc?: string;
    size?: ItemSize;
    weight?: number;
    value?: number;
    minDamage?: number;
    maxDamage?: number;
    damageType?: DamageType;
    handedness?: WeaponHandedness;
    slot?: WeaponSlot;
    skillRequired?: string;
    skillLevel?: number;
    attackSpeed?: number;
    specialAttackChance?: number;
    itemLevel?: number;
    toHit?: number;
    toParry?: number;
    toRiposte?: number;
    canParry?: boolean;
  }): void {
    // Set handedness first (it may adjust size)
    if (options.handedness) this.handedness = options.handedness;
    // Then set size explicitly if provided
    if (options.size !== undefined) this.size = options.size;
    if (options.shortDesc) this.shortDesc = options.shortDesc;
    if (options.longDesc) this.longDesc = options.longDesc;
    if (options.weight !== undefined) this.weight = options.weight;
    if (options.value !== undefined) this.value = options.value;
    // If itemLevel is set, use auto-balance (unless damage is explicitly provided)
    if (options.itemLevel !== undefined) {
      this.setItemLevel(options.itemLevel);
    }
    // Explicit damage values override itemLevel
    if (options.minDamage !== undefined) this.minDamage = options.minDamage;
    if (options.maxDamage !== undefined) this.maxDamage = options.maxDamage;
    // Explicit value overrides itemLevel
    if (options.value !== undefined) this.value = options.value;
    if (options.damageType) this.damageType = options.damageType;
    if (options.slot) this.slot = options.slot;
    if (options.skillRequired !== undefined) {
      this.setSkillRequired(options.skillRequired, options.skillLevel || 0);
    }
    if (options.attackSpeed !== undefined) this.attackSpeed = options.attackSpeed;
    if (options.specialAttackChance !== undefined) this.specialAttackChance = options.specialAttackChance;
    // Explicit toHit overrides itemLevel
    if (options.toHit !== undefined) this.toHit = options.toHit;
    if (options.toParry !== undefined) this.toParry = options.toParry;
    if (options.toRiposte !== undefined) this.toRiposte = options.toRiposte;
    if (options.canParry !== undefined) this.canParry = options.canParry;
  }
}


export default Weapon;
