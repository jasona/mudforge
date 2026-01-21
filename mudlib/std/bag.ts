/**
 * Bag - A portable container with weight reduction.
 *
 * Bags are containers that can be picked up and carried.
 * They can reduce the effective weight of their contents for encumbrance calculations.
 */

import { Container } from './container.js';
import { Item, ItemSize, SIZE_WEIGHTS } from './item.js';

/**
 * A portable container with optional weight reduction.
 */
export class Bag extends Container {
  private _weightReduction: number = 0; // 0-100 percentage

  constructor() {
    super();
    this.shortDesc = 'a bag';
    this.longDesc = 'This is a bag that can hold items.';
    // Bags can be picked up, unlike regular containers
    this.takeable = true;
    // Default size for bags
    this.size = 'small' as ItemSize;
  }

  /**
   * Get the weight reduction percentage (0-100).
   * Items inside the bag contribute less to encumbrance.
   */
  get weightReduction(): number {
    return this._weightReduction;
  }

  /**
   * Set the weight reduction percentage.
   * @param value Percentage from 0-100 (0 = no reduction, 100 = weightless contents)
   */
  set weightReduction(value: number) {
    this._weightReduction = Math.max(0, Math.min(100, value));
  }

  /**
   * Get the total weight of contents after applying weight reduction.
   */
  getContentsEffectiveWeight(): number {
    let total = 0;
    for (const obj of this.inventory) {
      if (obj instanceof Item) {
        total += obj.getEffectiveWeight();
      }
    }
    // Apply weight reduction
    const reduction = this._weightReduction / 100;
    return total * (1 - reduction);
  }

  /**
   * Override getEffectiveWeight to include the bag's own weight plus reduced contents.
   */
  override getEffectiveWeight(): number {
    // Bag's own weight plus reduced contents weight
    return this.weight + this.getContentsEffectiveWeight();
  }

  /**
   * Configure the bag.
   */
  setBag(options: {
    shortDesc?: string;
    longDesc?: string;
    size?: ItemSize;
    weight?: number;
    value?: number;
    maxItems?: number;
    maxWeight?: number;
    weightReduction?: number;
    open?: boolean;
  }): void {
    if (options.size !== undefined) this.size = options.size;
    if (options.shortDesc) this.shortDesc = options.shortDesc;
    if (options.longDesc) this.longDesc = options.longDesc;
    if (options.weight !== undefined) this.weight = options.weight;
    if (options.value !== undefined) this.value = options.value;
    if (options.maxItems !== undefined) this.maxItems = options.maxItems;
    if (options.maxWeight !== undefined) this.maxWeight = options.maxWeight;
    if (options.weightReduction !== undefined) this.weightReduction = options.weightReduction;
    // Note: open state is handled in Container constructor (defaults to true)
  }
}

export default Bag;
