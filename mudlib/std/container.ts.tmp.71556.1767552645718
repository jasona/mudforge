/**
 * Container - Base class for container items.
 *
 * Containers can hold other items, with optional capacity and weight limits.
 */

import { Item } from './item.js';
import { MudObject } from './object.js';

/**
 * Base class for containers.
 */
export class Container extends Item {
  private _maxItems: number = 10;
  private _maxWeight: number = 100;
  private _open: boolean = true;
  private _locked: boolean = false;
  private _keyId: string | null = null;

  constructor() {
    super();
    this.shortDesc = 'a container';
    this.longDesc = 'This is a container that can hold items.';
    // Containers typically can't be picked up
    this.takeable = false;
  }

  // ========== Capacity ==========

  /**
   * Get the maximum number of items this container can hold.
   */
  get maxItems(): number {
    return this._maxItems;
  }

  /**
   * Set the maximum number of items.
   */
  set maxItems(value: number) {
    this._maxItems = Math.max(0, value);
  }

  /**
   * Get the maximum weight this container can hold.
   */
  get maxWeight(): number {
    return this._maxWeight;
  }

  /**
   * Set the maximum weight.
   */
  set maxWeight(value: number) {
    this._maxWeight = Math.max(0, value);
  }

  /**
   * Get the current number of items in the container.
   */
  get itemCount(): number {
    return this.inventory.length;
  }

  /**
   * Get the current total weight of items in the container.
   */
  get currentWeight(): number {
    let total = 0;
    for (const obj of this.inventory) {
      const item = obj as Item;
      if (typeof item.weight === 'number') {
        total += item.weight;
      }
    }
    return total;
  }

  /**
   * Get remaining item capacity.
   */
  get remainingItems(): number {
    return Math.max(0, this._maxItems - this.itemCount);
  }

  /**
   * Get remaining weight capacity.
   */
  get remainingWeight(): number {
    return Math.max(0, this._maxWeight - this.currentWeight);
  }

  // ========== Open/Close/Lock ==========

  /**
   * Check if the container is open.
   */
  get isOpen(): boolean {
    return this._open;
  }

  /**
   * Check if the container is locked.
   */
  get isLocked(): boolean {
    return this._locked;
  }

  /**
   * Get the key ID required to unlock this container.
   */
  get keyId(): string | null {
    return this._keyId;
  }

  /**
   * Set the key ID required to unlock this container.
   */
  set keyId(id: string | null) {
    this._keyId = id;
  }

  /**
   * Open the container.
   * @returns true if successfully opened
   */
  open(): boolean {
    if (this._locked) {
      return false;
    }
    this._open = true;
    return true;
  }

  /**
   * Close the container.
   * @returns true if successfully closed
   */
  close(): boolean {
    this._open = false;
    return true;
  }

  /**
   * Lock the container.
   * @param key Optional key object to verify
   * @returns true if successfully locked
   */
  lock(key?: MudObject): boolean {
    if (this._open) {
      return false; // Can't lock an open container
    }
    if (this._keyId && key) {
      if (!key.id(this._keyId)) {
        return false; // Wrong key
      }
    }
    this._locked = true;
    return true;
  }

  /**
   * Unlock the container.
   * @param key Optional key object to verify
   * @returns true if successfully unlocked
   */
  unlock(key?: MudObject): boolean {
    if (this._keyId && key) {
      if (!key.id(this._keyId)) {
        return false; // Wrong key
      }
    }
    this._locked = false;
    return true;
  }

  // ========== Item Management ==========

  /**
   * Check if an item can be placed in this container.
   * @param item The item to check
   */
  canHold(item: MudObject): boolean {
    if (!this._open) {
      return false;
    }

    if (this.itemCount >= this._maxItems) {
      return false;
    }

    const itemObj = item as Item;
    if (typeof itemObj.weight === 'number') {
      if (this.currentWeight + itemObj.weight > this._maxWeight) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the reason why an item can't be placed in this container.
   * @param item The item to check
   */
  getCannotHoldReason(item: MudObject): string | null {
    if (!this._open) {
      return 'The container is closed.';
    }

    if (this.itemCount >= this._maxItems) {
      return 'The container is full.';
    }

    const itemObj = item as Item;
    if (typeof itemObj.weight === 'number') {
      if (this.currentWeight + itemObj.weight > this._maxWeight) {
        return 'The container cannot hold that much weight.';
      }
    }

    return null;
  }

  // ========== Hooks ==========

  /**
   * Called when an item is placed in this container.
   * @param item The item being placed
   * @param who Who is placing the item
   */
  onPut(item: MudObject, who: MudObject): void | Promise<void> {
    // Default: do nothing
  }

  /**
   * Called when an item is removed from this container.
   * @param item The item being removed
   * @param who Who is removing the item
   */
  onGet(item: MudObject, who: MudObject): void | Promise<void> {
    // Default: do nothing
  }

  // ========== Description ==========

  /**
   * Get description including contents if open.
   */
  getFullDescription(): string {
    const lines: string[] = [this.longDesc];

    if (this._open) {
      if (this.inventory.length === 0) {
        lines.push('It is empty.');
      } else {
        lines.push('It contains:');
        for (const item of this.inventory) {
          lines.push(`  ${item.shortDesc}`);
        }
      }
    } else {
      lines.push('It is closed.');
    }

    return lines.join('\n');
  }

  /**
   * Configure the container.
   */
  setContainer(
    short: string,
    long: string,
    options?: {
      maxItems?: number;
      maxWeight?: number;
      open?: boolean;
      locked?: boolean;
      keyId?: string;
    }
  ): void {
    this.shortDesc = short;
    this.longDesc = long;

    if (options) {
      if (options.maxItems !== undefined) this.maxItems = options.maxItems;
      if (options.maxWeight !== undefined) this.maxWeight = options.maxWeight;
      if (options.open !== undefined) this._open = options.open;
      if (options.locked !== undefined) this._locked = options.locked;
      if (options.keyId !== undefined) this._keyId = options.keyId;
    }
  }
}

export default Container;
