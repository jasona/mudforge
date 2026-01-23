/**
 * GeneratedBauble - A dynamically generated bauble from the random loot system.
 *
 * Baubles are valuable items that can be sold for gold. Higher quality baubles
 * may also provide stat bonuses or special abilities.
 */

import { Item } from '../item.js';
import type { Living } from '../living.js';
import type { GeneratedItemData, GeneratedAbility } from '../loot/types.js';
import { generateItemDescription, getPlaceholderDescription } from '../loot/description.js';

/**
 * A bauble created by the random loot generator.
 * Baubles are primarily meant to be sold for gold, but rare+ baubles
 * may provide passive bonuses when carried.
 */
export class GeneratedBauble extends Item {
  /** Stored generation data for persistence */
  private _generatedItemData: GeneratedItemData;

  /** Whether bonuses have been applied to carrier */
  private _bonusesApplied: boolean = false;

  /** Reference to carrier for bonus tracking */
  private _bonusCarrier: Living | null = null;

  constructor(data: GeneratedItemData) {
    super();

    this._generatedItemData = data;

    // Configure the item from generated data
    // Use placeholder description initially - AI will update it async
    this.shortDesc = data.fullName;
    this.longDesc = getPlaceholderDescription(data);
    this.value = data.value;
    this.weight = data.weight;

    // Generate AI description asynchronously (non-blocking)
    generateItemDescription(this, data).catch(() => {
      // Silently ignore errors - placeholder description will remain
    });

    // Set size based on bauble type (usually tiny or small)
    this.size = data.weight < 0.5 ? 'tiny' : 'small';

    // Mark as generated item
    this.setProperty('_generatedItemData', data);

    // Add IDs for matching (baseName is without color codes)
    // e.g., "Golden Ring of Wisdom" -> adds "golden", "ring", "wisdom", "golden ring of wisdom"
    this.addId(data.baseName);
    const words = data.baseName.toLowerCase().split(/\s+/);
    for (const word of words) {
      // Skip common filler words
      if (word !== 'of' && word !== 'the' && word !== 'a' && word !== 'an') {
        this.addId(word);
      }
    }
    // Also add the bauble type if available
    if (data.baubleType) {
      this.addId(data.baubleType);
    }
  }

  /**
   * Get the generated item data for persistence.
   */
  getGeneratedItemData(): GeneratedItemData {
    return this._generatedItemData;
  }

  /**
   * Check if this is a generated item.
   */
  isGenerated(): boolean {
    return true;
  }

  /**
   * Check if this bauble provides passive bonuses.
   * Only rare+ quality baubles with abilities provide bonuses.
   */
  hasPassiveBonuses(): boolean {
    const data = this._generatedItemData;
    return (
      (data.statBonuses && Object.keys(data.statBonuses).length > 0) ||
      (data.combatBonuses && Object.keys(data.combatBonuses).length > 0) ||
      (data.abilities && data.abilities.filter((a) => a.trigger === 'on_equip').length > 0)
    );
  }

  /**
   * Override onPickup to apply passive bonuses when picked up by a Living.
   */
  override async onPickup(picker: unknown): Promise<boolean> {
    const result = await super.onPickup(picker);
    if (!result) return false;

    // Apply bonuses if picker is a Living
    if (this.isLiving(picker) && this.hasPassiveBonuses()) {
      this.applyBonuses(picker);
    }

    return true;
  }

  /**
   * Override onDrop to remove passive bonuses when dropped.
   */
  override onDrop(dropper: unknown): boolean | Promise<boolean> {
    // Remove bonuses before dropping
    if (this._bonusesApplied && this._bonusCarrier) {
      this.removeBonuses(this._bonusCarrier);
    }

    return super.onDrop(dropper);
  }

  /**
   * Type guard to check if something is a Living.
   */
  private isLiving(obj: unknown): obj is Living {
    return (
      obj !== null &&
      typeof obj === 'object' &&
      'addStatModifier' in obj &&
      'addCombatStatModifier' in obj &&
      typeof (obj as Living).addStatModifier === 'function'
    );
  }

  /**
   * Apply passive bonuses to carrier.
   */
  private applyBonuses(carrier: Living): void {
    if (this._bonusesApplied) return;

    const data = this._generatedItemData;

    // Apply stat bonuses
    if (data.statBonuses) {
      for (const [stat, value] of Object.entries(data.statBonuses)) {
        if (value) {
          carrier.addStatModifier(
            stat as 'strength' | 'dexterity' | 'intelligence' | 'wisdom' | 'constitution' | 'charisma' | 'luck',
            value
          );
        }
      }
    }

    // Apply combat bonuses
    if (data.combatBonuses) {
      for (const [stat, value] of Object.entries(data.combatBonuses)) {
        if (value) {
          carrier.addCombatStatModifier(
            stat as 'toHit' | 'toCritical' | 'toBlock' | 'toDodge' | 'attackSpeed' | 'damageBonus' | 'armorBonus',
            value
          );
        }
      }
    }

    // Apply on-equip abilities (baubles apply these when carried)
    const abilities = data.abilities || [];
    for (const ability of abilities) {
      if (ability.trigger === 'on_equip') {
        this.applyOnEquipAbility(ability, carrier);
      }
    }

    this._bonusesApplied = true;
    this._bonusCarrier = carrier;
  }

  /**
   * Remove passive bonuses from carrier.
   */
  private removeBonuses(carrier: Living): void {
    if (!this._bonusesApplied) return;

    const data = this._generatedItemData;

    // Remove stat bonuses
    if (data.statBonuses) {
      for (const [stat, value] of Object.entries(data.statBonuses)) {
        if (value) {
          carrier.addStatModifier(
            stat as 'strength' | 'dexterity' | 'intelligence' | 'wisdom' | 'constitution' | 'charisma' | 'luck',
            -value
          );
        }
      }
    }

    // Remove combat bonuses
    if (data.combatBonuses) {
      for (const [stat, value] of Object.entries(data.combatBonuses)) {
        if (value) {
          carrier.addCombatStatModifier(
            stat as 'toHit' | 'toCritical' | 'toBlock' | 'toDodge' | 'attackSpeed' | 'damageBonus' | 'armorBonus',
            -value
          );
        }
      }
    }

    // Remove on-equip abilities
    const abilities = data.abilities || [];
    for (const ability of abilities) {
      if (ability.trigger === 'on_equip') {
        this.removeOnEquipAbility(ability, carrier);
      }
    }

    this._bonusesApplied = false;
    this._bonusCarrier = null;
  }

  /**
   * Apply a single on-equip ability.
   */
  private applyOnEquipAbility(ability: GeneratedAbility, carrier: Living): void {
    switch (ability.effectType) {
      case 'luck':
        carrier.addStatModifier('luck', ability.magnitude);
        break;

      case 'wisdom':
        carrier.addStatModifier('wisdom', ability.magnitude);
        break;

      case 'intelligence':
        carrier.addStatModifier('intelligence', ability.magnitude);
        break;

      case 'manaregen':
        // Store mana regen amount for custom handling
        carrier.setProperty(`_manaRegen_bauble_${this._generatedItemData.seed}`, ability.magnitude);
        break;

      case 'critical':
        carrier.addCombatStatModifier('toCritical', ability.magnitude);
        break;
    }
  }

  /**
   * Remove a single on-equip ability.
   */
  private removeOnEquipAbility(ability: GeneratedAbility, carrier: Living): void {
    switch (ability.effectType) {
      case 'luck':
        carrier.addStatModifier('luck', -ability.magnitude);
        break;

      case 'wisdom':
        carrier.addStatModifier('wisdom', -ability.magnitude);
        break;

      case 'intelligence':
        carrier.addStatModifier('intelligence', -ability.magnitude);
        break;

      case 'manaregen':
        carrier.deleteProperty(`_manaRegen_bauble_${this._generatedItemData.seed}`);
        break;

      case 'critical':
        carrier.addCombatStatModifier('toCritical', -ability.magnitude);
        break;
    }
  }

  /**
   * Get a formatted description of the bauble's bonuses for display.
   */
  getBonusDescription(): string {
    const lines: string[] = [];
    const data = this._generatedItemData;

    if (data.statBonuses) {
      for (const [stat, value] of Object.entries(data.statBonuses)) {
        if (value) {
          const sign = value > 0 ? '+' : '';
          lines.push(`${sign}${value} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`);
        }
      }
    }

    if (data.combatBonuses) {
      const combatStatNames: Record<string, string> = {
        toHit: 'Accuracy',
        toCritical: 'Critical',
        toBlock: 'Block',
        toDodge: 'Dodge',
        attackSpeed: 'Attack Speed',
        damageBonus: 'Damage',
        armorBonus: 'Armor',
      };
      for (const [stat, value] of Object.entries(data.combatBonuses)) {
        if (value) {
          const sign = value > 0 ? '+' : '';
          const displayName = combatStatNames[stat] || stat;
          lines.push(`${sign}${value} ${displayName}`);
        }
      }
    }

    if (data.abilities) {
      for (const ability of data.abilities) {
        lines.push(`{cyan}${ability.name}{/}: ${ability.description}`);
      }
    }

    return lines.join('\n');
  }
}

export default GeneratedBauble;
