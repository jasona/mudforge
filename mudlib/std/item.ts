/**
 * Item - Base class for all item objects.
 *
 * Items are objects that can be picked up, dropped, and manipulated.
 * They have weight and value properties.
 */

import { MudObject } from './object.js';

/**
 * Base class for items.
 */
export class Item extends MudObject {
  private _weight: number = 1;
  private _value: number = 0;
  private _takeable: boolean = true;
  private _dropable: boolean = true;
  private _savable: boolean = true;

  constructor() {
    super();
    this.shortDesc = 'an item';
    this.longDesc = 'This is a nondescript item.';
  }

  // ========== Properties ==========

  /**
   * Get the item's weight.
   */
  get weight(): number {
    return this._weight;
  }

  /**
   * Set the item's weight.
   */
  set weight(value: number) {
    this._weight = Math.max(0, value);
  }

  /**
   * Get the item's value in currency.
   */
  get value(): number {
    return this._value;
  }

  /**
   * Set the item's value in currency.
   */
  set value(amount: number) {
    this._value = Math.max(0, amount);
  }

  /**
   * Check if this item can be taken.
   */
  get takeable(): boolean {
    return this._takeable;
  }

  /**
   * Set whether this item can be taken.
   */
  set takeable(value: boolean) {
    this._takeable = value;
  }

  /**
   * Check if this item can be dropped.
   */
  get dropable(): boolean {
    return this._dropable;
  }

  /**
   * Set whether this item can be dropped.
   */
  set dropable(value: boolean) {
    this._dropable = value;
  }

  /**
   * Check if this item can be saved with a player.
   * Unsavable items are dropped when the player quits.
   */
  get savable(): boolean {
    return this._savable;
  }

  /**
   * Set whether this item can be saved with a player.
   * Set to false for temporary items, quest items that shouldn't persist, etc.
   */
  set savable(value: boolean) {
    this._savable = value;
  }

  // ========== Lifecycle Hooks ==========

  /**
   * Called when someone attempts to take this item.
   * Return false to prevent the take.
   * @param taker The object trying to take this item
   */
  onTake(taker: MudObject): boolean | Promise<boolean> {
    if (!this._takeable) {
      return false;
    }
    return true;
  }

  /**
   * Called when someone attempts to drop this item.
   * Return false to prevent the drop.
   * @param dropper The object trying to drop this item
   */
  onDrop(dropper: MudObject): boolean | Promise<boolean> {
    if (!this._dropable) {
      return false;
    }
    return true;
  }

  /**
   * Called when this item is examined closely.
   * Override this to provide additional details.
   * @param examiner The object examining this item
   */
  onExamine(examiner: MudObject): string {
    return this.longDesc;
  }

  // ========== Utility ==========

  /**
   * Set basic item properties all at once.
   */
  setItem(short: string, long: string, weight?: number, value?: number): void {
    this.shortDesc = short;
    this.longDesc = long;
    if (weight !== undefined) {
      this.weight = weight;
    }
    if (value !== undefined) {
      this.value = value;
    }
  }
}

export default Item;
