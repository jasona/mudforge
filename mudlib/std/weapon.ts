/**
 * Weapon - Base class for weapon items.
 *
 * Weapons can be wielded by Living beings and affect combat.
 */

import { Item } from './item.js';
import { MudObject } from './object.js';
import { Living } from './living.js';

/**
 * Damage type for weapons.
 */
export type DamageType = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'holy' | 'dark';

/**
 * Weapon slot.
 */
export type WeaponSlot = 'main_hand' | 'off_hand' | 'two_hand';

/**
 * Base class for weapons.
 */
export class Weapon extends Item {
  private _minDamage: number = 1;
  private _maxDamage: number = 3;
  private _damageType: DamageType = 'physical';
  private _slot: WeaponSlot = 'main_hand';
  private _wielder: Living | null = null;
  private _skillRequired: string | null = null;
  private _skillLevel: number = 0;

  constructor() {
    super();
    this.shortDesc = 'a weapon';
    this.longDesc = 'This is a weapon.';
    this.weight = 2;
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
   * Get weapon slot.
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

  // ========== Combat ==========

  /**
   * Calculate damage for an attack.
   * Override this for custom damage calculation.
   * @param attacker The attacker
   * @param defender The defender
   */
  calculateDamage(attacker: Living, defender: MudObject): number {
    const range = this._maxDamage - this._minDamage;
    const roll = Math.floor(Math.random() * (range + 1));
    return this._minDamage + roll;
  }

  // ========== Wield/Unwield ==========

  /**
   * Check if a living can wield this weapon.
   * @param wielder The potential wielder
   */
  canWield(wielder: Living): boolean {
    // Already wielded
    if (this._wielder) return false;

    // Check skill requirement (would need skill system)
    // This is a placeholder for extensibility

    return true;
  }

  /**
   * Wield this weapon.
   * @param wielder The living wielding the weapon
   * @returns true if successfully wielded
   */
  wield(wielder: Living): boolean {
    if (!this.canWield(wielder)) {
      return false;
    }

    this._wielder = wielder;
    this.onWield(wielder);
    return true;
  }

  /**
   * Unwield this weapon.
   * @returns true if successfully unwielded
   */
  unwield(): boolean {
    if (!this._wielder) {
      return false;
    }

    const previousWielder = this._wielder;
    this._wielder = null;
    this.onUnwield(previousWielder);
    return true;
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
    weight?: number;
    value?: number;
    minDamage?: number;
    maxDamage?: number;
    damageType?: DamageType;
    slot?: WeaponSlot;
    skillRequired?: string;
    skillLevel?: number;
  }): void {
    if (options.shortDesc) this.shortDesc = options.shortDesc;
    if (options.longDesc) this.longDesc = options.longDesc;
    if (options.weight !== undefined) this.weight = options.weight;
    if (options.value !== undefined) this.value = options.value;
    if (options.minDamage !== undefined) this.minDamage = options.minDamage;
    if (options.maxDamage !== undefined) this.maxDamage = options.maxDamage;
    if (options.damageType) this.damageType = options.damageType;
    if (options.slot) this.slot = options.slot;
    if (options.skillRequired !== undefined) {
      this.setSkillRequired(options.skillRequired, options.skillLevel || 0);
    }
  }
}

export default Weapon;
