/**
 * GeneratedArmor - A dynamically generated armor piece from the random loot system.
 *
 * Extends the base Armor class with generated item data storage and
 * special ability implementations.
 */

import { Armor } from '../armor.js';
import type { Living } from '../living.js';
import type { GeneratedItemData, GeneratedAbility } from '../loot/types.js';
import type { Effect } from '../combat/types.js';
import { generateItemDescription, getPlaceholderDescription } from '../loot/description.js';

/**
 * An armor piece created by the random loot generator.
 */
export class GeneratedArmor extends Armor {
  /** Stored generation data for persistence */
  private _generatedItemData: GeneratedItemData;

  /** Stat bonuses applied to wearer */
  private _appliedStatBonuses: boolean = false;

  /** Active effects from on-equip abilities */
  private _activeEffects: Map<string, Effect> = new Map();

  constructor(data: GeneratedItemData) {
    super();

    this._generatedItemData = data;

    // Configure the armor from generated data
    // Use placeholder description initially - AI will update it async
    this.setArmor({
      shortDesc: data.fullName,
      longDesc: getPlaceholderDescription(data),
      armor: data.armor || 1,
      slot: data.armorSlot || 'chest',
      itemLevel: data.itemLevel,
      value: data.value,
      toDodge: data.toDodge,
      toBlock: data.toBlock,
    });

    // Generate AI description asynchronously (non-blocking)
    generateItemDescription(this, data).catch(() => {
      // Silently ignore errors - placeholder description will remain
    });

    // Set weight
    this.weight = data.weight;

    // Determine size based on armor slot
    this.size = this.calculateSize(data.armorSlot);

    // Mark as generated item
    this.setProperty('_generatedItemData', data);

    // Add IDs for matching (baseName is without color codes)
    // e.g., "Steel Helm of Protection" -> adds "steel", "helm", "protection", "steel helm of protection"
    this.addId(data.baseName);
    const words = data.baseName.toLowerCase().split(/\s+/);
    for (const word of words) {
      // Skip common filler words
      if (word !== 'of' && word !== 'the' && word !== 'a' && word !== 'an') {
        this.addId(word);
      }
    }
    // Also add the armor type and slot if available
    if (data.armorType) {
      this.addId(data.armorType);
    }
    if (data.armorSlot) {
      this.addId(data.armorSlot);
    }
  }

  /**
   * Calculate item size based on armor slot.
   */
  private calculateSize(slot?: string): 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'immovable' {
    switch (slot) {
      case 'head':
      case 'hands':
      case 'feet':
        return 'small';
      case 'cloak':
        return 'medium';
      case 'chest':
      case 'legs':
        return 'large';
      case 'shield':
        return 'medium';
      default:
        return 'medium';
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
   * Override onWear to apply stat bonuses and abilities.
   */
  override onWear(wearer: Living): void | Promise<void> {
    super.onWear(wearer);
    this.applyStatBonuses(wearer);
    this.applyOnEquipAbilities(wearer);
  }

  /**
   * Override onRemove to remove stat bonuses and abilities.
   */
  override onRemove(wearer: Living): void | Promise<void> {
    this.removeStatBonuses(wearer);
    this.removeOnEquipAbilities(wearer);
    super.onRemove(wearer);
  }

  /**
   * Apply stat bonuses to wearer.
   */
  private applyStatBonuses(wearer: Living): void {
    if (this._appliedStatBonuses) return;

    const data = this._generatedItemData;

    // Apply stat bonuses
    if (data.statBonuses) {
      for (const [stat, value] of Object.entries(data.statBonuses)) {
        if (value) {
          wearer.addStatModifier(stat as 'strength' | 'dexterity' | 'intelligence' | 'wisdom' | 'constitution' | 'charisma' | 'luck', value);
        }
      }
    }

    // Apply combat bonuses
    if (data.combatBonuses) {
      for (const [stat, value] of Object.entries(data.combatBonuses)) {
        if (value) {
          wearer.addCombatStatModifier(stat as 'toHit' | 'toCritical' | 'toBlock' | 'toDodge' | 'attackSpeed' | 'damageBonus' | 'armorBonus', value);
        }
      }
    }

    this._appliedStatBonuses = true;
  }

  /**
   * Remove stat bonuses from wearer.
   */
  private removeStatBonuses(wearer: Living): void {
    if (!this._appliedStatBonuses) return;

    const data = this._generatedItemData;

    // Remove stat bonuses
    if (data.statBonuses) {
      for (const [stat, value] of Object.entries(data.statBonuses)) {
        if (value) {
          wearer.addStatModifier(stat as 'strength' | 'dexterity' | 'intelligence' | 'wisdom' | 'constitution' | 'charisma' | 'luck', -value);
        }
      }
    }

    // Remove combat bonuses
    if (data.combatBonuses) {
      for (const [stat, value] of Object.entries(data.combatBonuses)) {
        if (value) {
          wearer.addCombatStatModifier(stat as 'toHit' | 'toCritical' | 'toBlock' | 'toDodge' | 'attackSpeed' | 'damageBonus' | 'armorBonus', -value);
        }
      }
    }

    this._appliedStatBonuses = false;
  }

  /**
   * Apply on-equip abilities.
   */
  private applyOnEquipAbilities(wearer: Living): void {
    const abilities = this._generatedItemData.abilities || [];
    const onEquipAbilities = abilities.filter((a) => a.trigger === 'on_equip');

    for (const ability of onEquipAbilities) {
      this.applyOnEquipAbility(ability, wearer);
    }
  }

  /**
   * Remove on-equip abilities.
   */
  private removeOnEquipAbilities(wearer: Living): void {
    const abilities = this._generatedItemData.abilities || [];
    const onEquipAbilities = abilities.filter((a) => a.trigger === 'on_equip');

    for (const ability of onEquipAbilities) {
      this.removeOnEquipAbility(ability, wearer);
    }

    // Remove any active effects
    for (const [effectId] of this._activeEffects) {
      wearer.removeEffect(effectId);
    }
    this._activeEffects.clear();
  }

  /**
   * Apply a single on-equip ability.
   */
  private applyOnEquipAbility(ability: GeneratedAbility, wearer: Living): void {
    switch (ability.effectType) {
      case 'thorns': {
        // Add a thorns effect
        const effect: Effect = {
          id: `thorns_${this._generatedItemData.seed}`,
          name: ability.name,
          type: 'thorns',
          duration: Infinity,
          magnitude: ability.magnitude,
          category: 'buff',
          description: ability.description,
          hidden: true,
        };
        wearer.addEffect(effect);
        this._activeEffects.set(effect.id, effect);
        break;
      }

      case 'regen': {
        // Add a heal-over-time effect
        const effect: Effect = {
          id: `regen_${this._generatedItemData.seed}`,
          name: ability.name,
          type: 'heal_over_time',
          duration: Infinity,
          tickInterval: 5000,
          nextTick: 5000,
          magnitude: ability.magnitude,
          category: 'buff',
          description: ability.description,
          hidden: true,
        };
        wearer.addEffect(effect);
        this._activeEffects.set(effect.id, effect);
        break;
      }

      case 'manaregen': {
        // Store the amount for custom handling
        wearer.setProperty(`_manaRegen_${this._generatedItemData.seed}`, ability.magnitude);
        break;
      }

      case 'armor':
        wearer.addCombatStatModifier('armorBonus', ability.magnitude);
        break;

      case 'dodge':
        wearer.addCombatStatModifier('toDodge', ability.magnitude);
        break;

      case 'block':
        wearer.addCombatStatModifier('toBlock', ability.magnitude);
        break;

      case 'haste':
        wearer.addCombatStatModifier('attackSpeed', ability.magnitude / 100);
        break;

      case 'critical':
        wearer.addCombatStatModifier('toCritical', ability.magnitude);
        break;

      // Stat abilities
      case 'luck':
        wearer.addStatModifier('luck', ability.magnitude);
        break;

      case 'wisdom':
        wearer.addStatModifier('wisdom', ability.magnitude);
        break;

      case 'intelligence':
        wearer.addStatModifier('intelligence', ability.magnitude);
        break;
    }
  }

  /**
   * Remove a single on-equip ability.
   */
  private removeOnEquipAbility(ability: GeneratedAbility, wearer: Living): void {
    switch (ability.effectType) {
      case 'thorns': {
        const effectId = `thorns_${this._generatedItemData.seed}`;
        wearer.removeEffect(effectId);
        this._activeEffects.delete(effectId);
        break;
      }

      case 'regen': {
        const effectId = `regen_${this._generatedItemData.seed}`;
        wearer.removeEffect(effectId);
        this._activeEffects.delete(effectId);
        break;
      }

      case 'manaregen':
        wearer.deleteProperty(`_manaRegen_${this._generatedItemData.seed}`);
        break;

      case 'armor':
        wearer.addCombatStatModifier('armorBonus', -ability.magnitude);
        break;

      case 'dodge':
        wearer.addCombatStatModifier('toDodge', -ability.magnitude);
        break;

      case 'block':
        wearer.addCombatStatModifier('toBlock', -ability.magnitude);
        break;

      case 'haste':
        wearer.addCombatStatModifier('attackSpeed', -ability.magnitude / 100);
        break;

      case 'critical':
        wearer.addCombatStatModifier('toCritical', -ability.magnitude);
        break;

      case 'luck':
        wearer.addStatModifier('luck', -ability.magnitude);
        break;

      case 'wisdom':
        wearer.addStatModifier('wisdom', -ability.magnitude);
        break;

      case 'intelligence':
        wearer.addStatModifier('intelligence', -ability.magnitude);
        break;
    }
  }
}

export default GeneratedArmor;
