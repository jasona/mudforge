/**
 * MaterialItem - Stackable crafting material items
 *
 * Materials are gathered from resource nodes and used in crafting recipes.
 * They can stack in inventory up to their defined maximum.
 */

import { Item } from '../item.js';
import type { MaterialQuality, MaterialType } from './types.js';
import { QUALITY_COLORS, QUALITY_NAMES } from './types.js';
import { getMaterial } from './materials.js';

/**
 * MaterialItem class for gatherable/craftable materials.
 */
export class MaterialItem extends Item {
  constructor() {
    super();
    this.shortDesc = 'a crafting material';
    this.longDesc = 'This is a crafting material.';
  }

  override get shortDesc(): string {
    const matDef = getMaterial(this.materialId);
    if (!matDef) {
      return super.shortDesc;
    }

    const qty = this.quantity;
    const qual = this.quality;
    const qualityPrefix = qual !== 'common' ? `${QUALITY_NAMES[qual].toLowerCase()} ` : '';
    const color = QUALITY_COLORS[qual];

    if (qty > 1) {
      return `{${color}}${qty} ${qualityPrefix}${matDef.name}{/}`;
    }

    const article = /^[aeiou]/i.test(qualityPrefix || matDef.name) ? 'an' : 'a';
    return `{${color}}${article} ${qualityPrefix}${matDef.name}{/}`;
  }

  override set shortDesc(value: string) {
    super.shortDesc = value;
  }

  override get longDesc(): string {
    const matDef = getMaterial(this.materialId);
    if (!matDef) {
      return super.longDesc;
    }
    return matDef.longDesc;
  }

  override set longDesc(value: string) {
    super.longDesc = value;
  }

  override id(name: string): boolean {
    if (super.id(name)) {
      return true;
    }

    const matDef = getMaterial(this.materialId);
    if (!matDef) {
      return false;
    }

    const normalize = (value: string): string =>
      value
        .toLowerCase()
        .replace(/\{[^}]*\}/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const pluralize = (word: string): string => {
      if (word.endsWith('s')) return word;
      if (word.endsWith('x') || word.endsWith('z') || word.endsWith('ch') || word.endsWith('sh')) {
        return `${word}es`;
      }
      return `${word}s`;
    };

    const baseName = normalize(matDef.name);
    const words = baseName.split(' ');
    const lastWord = words[words.length - 1] || baseName;
    const pluralLastWord = pluralize(lastWord);
    const basePlural = baseName.endsWith(lastWord)
      ? `${baseName.slice(0, baseName.length - lastWord.length)}${pluralLastWord}`.trim()
      : pluralLastWord;
    const qualityWord = this.quality !== 'common' ? QUALITY_NAMES[this.quality].toLowerCase() : '';

    const candidates = new Set<string>([
      baseName,
      basePlural,
      lastWord,
      pluralLastWord,
    ]);

    if (qualityWord) {
      candidates.add(`${qualityWord} ${baseName}`);
      candidates.add(`${qualityWord} ${basePlural}`);
      candidates.add(`${qualityWord} ${lastWord}`);
      candidates.add(`${qualityWord} ${pluralLastWord}`);
    }

    if (this.quantity > 1) {
      const qty = String(this.quantity);
      for (const candidate of [...candidates]) {
        candidates.add(`${qty} ${candidate}`);
      }
    }

    const target = normalize(name);
    if (candidates.has(target)) {
      return true;
    }

    // Tolerate optional quantity + adjective prefixes, e.g. "3 crude logs".
    let relaxed = target.replace(/^(\d+)\s+/, '');
    relaxed = relaxed.replace(/^(poor|common|fine|superior|exceptional|legendary|crude)\s+/, '');
    return candidates.has(relaxed);
  }

  override onCreate(): void {
    super.onCreate();
    this.syncFromProperties();
  }

  override setProperty(key: string, value: unknown): void {
    super.setProperty(key, value);

    if (key === 'materialId' || key === 'quality' || key === 'quantity') {
      this.syncFromProperties();
    }
  }

  /**
   * Get the material definition ID.
   */
  get materialId(): string {
    return this.getProperty<string>('materialId') || '';
  }

  /**
   * Get the material quantity (for stacks).
   */
  get quantity(): number {
    return this.getProperty<number>('quantity') || 1;
  }

  /**
   * Set the material quantity.
   */
  set quantity(value: number) {
    const matDef = getMaterial(this.materialId);
    const maxStack = matDef?.maxStack || 1;
    super.setProperty('quantity', Math.min(Math.max(1, value), maxStack));
    this.updateDescription();
  }

  /**
   * Get the material quality.
   */
  get quality(): MaterialQuality {
    return this.getProperty<MaterialQuality>('quality') || 'common';
  }

  /**
   * Get the material type.
   */
  get materialType(): MaterialType | undefined {
    const matDef = getMaterial(this.materialId);
    return matDef?.type;
  }

  /**
   * Get the material tier.
   */
  get tier(): number {
    const matDef = getMaterial(this.materialId);
    return matDef?.tier || 1;
  }

  /**
   * Check if this material can stack with another.
   */
  canStackWith(other: MaterialItem): boolean {
    if (this.materialId !== other.materialId) return false;
    if (this.quality !== other.quality) return false;

    const matDef = getMaterial(this.materialId);
    if (!matDef?.stackable) return false;

    return this.quantity + other.quantity <= matDef.maxStack;
  }

  /**
   * Merge another material stack into this one.
   * Returns the amount that couldn't be merged (overflow).
   */
  merge(other: MaterialItem): number {
    if (!this.canStackWith(other)) return other.quantity;

    const matDef = getMaterial(this.materialId);
    const maxStack = matDef?.maxStack || 1;
    const total = this.quantity + other.quantity;

    if (total <= maxStack) {
      this.quantity = total;
      return 0;
    } else {
      this.quantity = maxStack;
      return total - maxStack;
    }
  }

  /**
   * Split off a portion of this stack.
   * Returns null if the full amount can't be split.
   */
  split(amount: number): MaterialItem | null {
    if (amount <= 0 || amount >= this.quantity) return null;

    // Create a new material item with the split amount
    const newItem = new MaterialItem();
    newItem.setProperty('materialId', this.materialId);
    newItem.setProperty('quality', this.quality);
    newItem.quantity = amount;

    // Reduce this stack
    this.quantity = this.quantity - amount;

    return newItem;
  }

  /**
   * Update the description based on quantity and quality.
   */
  updateDescription(): void {
    const matDef = getMaterial(this.materialId);
    if (!matDef) return;

    const qty = this.quantity;
    const qual = this.quality;

    // Quality prefix (skip for common)
    const qualityPrefix = qual !== 'common' ? `${QUALITY_NAMES[qual].toLowerCase()} ` : '';
    const color = QUALITY_COLORS[qual];

    if (qty > 1) {
      this.shortDesc = `{${color}}${qty} ${qualityPrefix}${matDef.name}{/}`;
    } else {
      const article = /^[aeiou]/i.test(qualityPrefix || matDef.name) ? 'an' : 'a';
      this.shortDesc = `{${color}}${article} ${qualityPrefix}${matDef.name}{/}`;
    }

    // Update weight based on quantity
    this.weight = matDef.weight * qty;
  }

  /**
   * Initialize from a material definition.
   */
  initFromMaterial(materialId: string, quantity: number = 1, quality: MaterialQuality = 'common'): void {
    const matDef = getMaterial(materialId);
    if (!matDef) {
      throw new Error(`Unknown material: ${materialId}`);
    }

    this.setProperty('materialId', materialId);
    this.setProperty('quality', quality);
    this.name = matDef.name.toLowerCase();
    this.longDesc = matDef.longDesc;
    this.ids = [materialId, matDef.name.toLowerCase(), ...matDef.name.toLowerCase().split(' ')];

    // Set quantity last (triggers description update)
    this.quantity = quantity;
  }

  private syncFromProperties(): void {
    const materialId = this.getProperty<string>('materialId');
    if (!materialId) {
      return;
    }

    const matDef = getMaterial(materialId);
    if (!matDef) {
      return;
    }

    this.name = matDef.name.toLowerCase();
    this.longDesc = matDef.longDesc;
    this.ids = [materialId, matDef.name.toLowerCase(), ...matDef.name.toLowerCase().split(' ')];
    this.updateDescription();
  }

  /**
   * Override look to show material details.
   */
  override look(viewer: MudObject): void {
    const matDef = getMaterial(this.materialId);

    viewer.receive(`${this.longDesc}\n`);

    if (matDef) {
      const color = QUALITY_COLORS[this.quality];
      viewer.receive(`Quality: {${color}}${QUALITY_NAMES[this.quality]}{/}\n`);
      viewer.receive(`Type: ${matDef.type}\n`);
      viewer.receive(`Tier: ${matDef.tier}\n`);

      if (this.quantity > 1) {
        viewer.receive(`Quantity: ${this.quantity}\n`);
      }

      viewer.receive(`Weight: ${this.weight.toFixed(1)} lbs\n`);
      viewer.receive(`Value: ${matDef.value * this.quantity} gold\n`);
    }
  }
}

// Import MudObject type for look method
import type { MudObject } from '../object.js';

export default MaterialItem;
