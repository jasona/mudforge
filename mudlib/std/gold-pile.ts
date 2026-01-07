/**
 * GoldPile - A pile of gold coins that can be dropped/picked up.
 *
 * When players drop gold, it creates a GoldPile in the room.
 * Multiple gold piles in the same room can be merged.
 * When picked up, the gold is added to the player's gold.
 */

import { Item } from './item.js';
import type { MudObject } from './object.js';

export class GoldPile extends Item {
  private _amount: number = 0;

  constructor(amount: number = 0) {
    super();
    this._amount = Math.max(0, Math.floor(amount));
    this.updateDescription();
  }

  /**
   * Get the amount of gold in this pile.
   */
  get amount(): number {
    return this._amount;
  }

  /**
   * Set the amount of gold in this pile.
   */
  set amount(value: number) {
    this._amount = Math.max(0, Math.floor(value));
    this.updateDescription();
  }

  /**
   * Add gold to this pile.
   */
  addGold(amount: number): void {
    this._amount += Math.max(0, Math.floor(amount));
    this.updateDescription();
  }

  /**
   * Remove gold from this pile.
   */
  removeGold(amount: number): number {
    const toRemove = Math.min(this._amount, Math.max(0, Math.floor(amount)));
    this._amount -= toRemove;
    this.updateDescription();
    return toRemove;
  }

  /**
   * Update the description based on amount.
   */
  private updateDescription(): void {
    if (this._amount === 1) {
      this._shortDesc = 'a gold coin';
      this._longDesc = 'A single gold coin lies here, glinting in the light.';
    } else if (this._amount < 10) {
      this._shortDesc = `${this._amount} gold coins`;
      this._longDesc = `A small pile of ${this._amount} gold coins lies here.`;
    } else if (this._amount < 100) {
      this._shortDesc = `${this._amount} gold coins`;
      this._longDesc = `A pile of ${this._amount} gold coins lies here, glittering invitingly.`;
    } else if (this._amount < 1000) {
      this._shortDesc = `${this._amount} gold coins`;
      this._longDesc = `A substantial pile of ${this._amount} gold coins lies here, gleaming brightly.`;
    } else {
      this._shortDesc = `${this._amount.toLocaleString()} gold coins`;
      this._longDesc = `A massive hoard of ${this._amount.toLocaleString()} gold coins lies here, dazzling your eyes.`;
    }
  }

  /**
   * Check if this object matches a given ID.
   */
  override id(str: string): boolean {
    const lower = str.toLowerCase();
    return (
      lower === 'gold' ||
      lower === 'coins' ||
      lower === 'coin' ||
      lower === 'gold coins' ||
      lower === 'gold coin' ||
      lower === 'pile' ||
      lower === 'gold pile' ||
      super.id(str)
    );
  }

  /**
   * Override moveTo to merge with existing gold piles in the destination.
   */
  override async moveTo(destination: MudObject | null): Promise<boolean> {
    if (destination) {
      // Check for existing gold pile in destination
      for (const item of destination.inventory) {
        if (item instanceof GoldPile && item !== this) {
          // Merge into existing pile
          item.addGold(this._amount);
          // Destroy this pile
          if (typeof efuns !== 'undefined' && efuns.destruct) {
            efuns.destruct(this);
          }
          return true;
        }
      }
    }
    // No existing pile, move normally
    return super.moveTo(destination);
  }

  /**
   * Gold piles are always takeable.
   */
  override get takeable(): boolean {
    return true;
  }

  /**
   * Gold piles are always droppable.
   */
  override get dropable(): boolean {
    return true;
  }
}

export default GoldPile;
