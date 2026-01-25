/**
 * GeneratedWeapon - A dynamically generated weapon from the random loot system.
 *
 * Extends the base Weapon class with generated item data storage and
 * special ability implementations.
 */

import { Weapon } from '../weapon.js';
import type { Living } from '../living.js';
import type { GeneratedItemData, GeneratedAbility } from '../loot/types.js';
import type { Effect } from '../combat/types.js';
import { generateItemDescription, getPlaceholderDescription } from '../loot/description.js';
import { capitalizeName } from '../../lib/text-utils.js';

/**
 * A weapon created by the random loot generator.
 */
export class GeneratedWeapon extends Weapon {
  /** Stored generation data for persistence */
  private _generatedItemData: GeneratedItemData;

  /** Stat bonuses applied to wielder */
  private _appliedStatBonuses: boolean = false;

  constructor(data: GeneratedItemData) {
    super();

    this._generatedItemData = data;

    // Configure the weapon from generated data
    // Use placeholder description initially - AI will update it async
    this.setWeapon({
      shortDesc: data.fullName,
      longDesc: getPlaceholderDescription(data),
      minDamage: data.minDamage || 1,
      maxDamage: data.maxDamage || 3,
      damageType: data.damageType || 'bludgeoning',
      handedness: data.handedness || 'one_handed',
      toHit: data.toHit || 0,
      itemLevel: data.itemLevel,
      value: data.value,
    });

    // Generate AI description asynchronously (non-blocking)
    generateItemDescription(this, data).catch(() => {
      // Silently ignore errors - placeholder description will remain
    });

    // Set attack speed if specified
    if (data.attackSpeed !== undefined) {
      this.attackSpeed = data.attackSpeed;
    }

    // Set weight
    this.weight = data.weight;

    // Configure special attacks from abilities
    this.configureAbilities(data.abilities || []);

    // Mark as generated item (not savable by default path)
    this.setProperty('_generatedItemData', data);

    // Add IDs for matching (baseName is without color codes)
    // e.g., "Steel Sword of Might" -> adds "steel", "sword", "might", "steel sword of might"
    this.addId(data.baseName);
    const words = data.baseName.toLowerCase().split(/\s+/);
    for (const word of words) {
      // Skip common filler words
      if (word !== 'of' && word !== 'the' && word !== 'a' && word !== 'an') {
        this.addId(word);
      }
    }
    // Also add the weapon type if available
    if (data.weaponType) {
      this.addId(data.weaponType);
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
   * Configure special attack abilities from generated data.
   */
  private configureAbilities(abilities: GeneratedAbility[]): void {
    const onHitAbilities = abilities.filter((a) => a.trigger === 'on_hit');

    if (onHitAbilities.length === 0) {
      return;
    }

    // Set up special attack with combined chance
    // Calculate total chance (capped at 60% to prevent always-proc)
    const totalChance = Math.min(60, onHitAbilities.reduce((sum, a) => sum + (a.chance || 0), 0));

    this.setSpecialAttack(totalChance, (attacker: Living, defender: Living) => {
      // Roll for each ability independently
      for (const ability of onHitAbilities) {
        const roll = Math.random() * 100;
        if (roll < (ability.chance || 0)) {
          return this.triggerOnHitAbility(ability, attacker, defender);
        }
      }
      return null;
    });
  }

  /**
   * Trigger an on-hit ability.
   */
  private triggerOnHitAbility(
    ability: GeneratedAbility,
    attacker: Living,
    defender: Living
  ): { triggered: boolean; message?: string; damage?: number; effect?: Effect } | null {
    const result: {
      triggered: boolean;
      message?: string;
      damage?: number;
      effect?: Effect;
    } = { triggered: true };

    // Handle different effect types
    switch (ability.effectType) {
      case 'burn':
      case 'poison': {
        // DoT effects
        const effect: Effect = {
          id: `${ability.id}_${Date.now()}`,
          name: ability.name,
          type: 'damage_over_time',
          duration: ability.duration || 5000,
          tickInterval: 1000,
          nextTick: 1000,
          magnitude: Math.round(ability.magnitude / ((ability.duration || 5000) / 1000)),
          damageType: ability.damageType,
          category: 'debuff',
          description: ability.description,
          source: attacker,
        };
        result.effect = effect;
        result.message = `{red}${capitalizeName(attacker.name)}'s ${ability.name} ignites ${capitalizeName(defender.name)}!{/}`;
        break;
      }

      case 'slow': {
        // Slow effect
        const effect: Effect = {
          id: `${ability.id}_${Date.now()}`,
          name: ability.name,
          type: 'slow',
          duration: ability.duration || 4000,
          magnitude: ability.magnitude,
          category: 'debuff',
          description: ability.description,
          source: attacker,
        };
        result.effect = effect;
        result.message = `{cyan}${capitalizeName(attacker.name)}'s ${ability.name} slows ${capitalizeName(defender.name)}!{/}`;
        break;
      }

      case 'stun': {
        // Stun effect
        const effect: Effect = {
          id: `${ability.id}_${Date.now()}`,
          name: ability.name,
          type: 'stun',
          duration: ability.magnitude, // Magnitude is duration in ms for stuns
          magnitude: 1,
          category: 'debuff',
          description: ability.description,
          source: attacker,
        };
        result.effect = effect;
        result.message = `{yellow}${capitalizeName(attacker.name)}'s ${ability.name} stuns ${capitalizeName(defender.name)}!{/}`;
        break;
      }

      case 'lifesteal': {
        // Heal attacker based on damage percentage
        const healAmount = Math.round(ability.magnitude * 0.1); // magnitude is % of damage
        attacker.heal(healAmount);
        result.message = `{green}${capitalizeName(attacker.name)}'s ${ability.name} drains life from ${capitalizeName(defender.name)}! (+${healAmount} HP){/}`;
        break;
      }

      case 'manadrain': {
        // Restore mana to attacker
        attacker.restoreMana(ability.magnitude);
        result.message = `{blue}${capitalizeName(attacker.name)}'s ${ability.name} siphons mana! (+${ability.magnitude} MP){/}`;
        break;
      }

      default: {
        // Direct damage ability
        if (ability.damageType) {
          result.damage = ability.magnitude;
          result.message = `{red}${capitalizeName(attacker.name)}'s ${ability.name} strikes ${capitalizeName(defender.name)} for ${ability.magnitude} ${ability.damageType} damage!{/}`;
        }
        break;
      }
    }

    return result;
  }

  /**
   * Override onWield to apply stat bonuses.
   */
  override onWield(wielder: Living): void | Promise<void> {
    super.onWield(wielder);
    this.applyStatBonuses(wielder);
    this.applyOnEquipAbilities(wielder);
  }

  /**
   * Override onUnwield to remove stat bonuses.
   */
  override onUnwield(wielder: Living): void | Promise<void> {
    this.removeStatBonuses(wielder);
    this.removeOnEquipAbilities(wielder);
    super.onUnwield(wielder);
  }

  /**
   * Apply stat bonuses to wielder.
   */
  private applyStatBonuses(wielder: Living): void {
    if (this._appliedStatBonuses) return;

    const data = this._generatedItemData;

    // Apply stat bonuses
    if (data.statBonuses) {
      for (const [stat, value] of Object.entries(data.statBonuses)) {
        if (value) {
          wielder.addStatModifier(stat as 'strength' | 'dexterity' | 'intelligence' | 'wisdom' | 'constitution' | 'charisma' | 'luck', value);
        }
      }
    }

    // Apply combat bonuses
    if (data.combatBonuses) {
      for (const [stat, value] of Object.entries(data.combatBonuses)) {
        if (value) {
          wielder.addCombatStatModifier(stat as 'toHit' | 'toCritical' | 'toBlock' | 'toDodge' | 'attackSpeed' | 'damageBonus' | 'armorBonus', value);
        }
      }
    }

    this._appliedStatBonuses = true;
  }

  /**
   * Remove stat bonuses from wielder.
   */
  private removeStatBonuses(wielder: Living): void {
    if (!this._appliedStatBonuses) return;

    const data = this._generatedItemData;

    // Remove stat bonuses
    if (data.statBonuses) {
      for (const [stat, value] of Object.entries(data.statBonuses)) {
        if (value) {
          wielder.addStatModifier(stat as 'strength' | 'dexterity' | 'intelligence' | 'wisdom' | 'constitution' | 'charisma' | 'luck', -value);
        }
      }
    }

    // Remove combat bonuses
    if (data.combatBonuses) {
      for (const [stat, value] of Object.entries(data.combatBonuses)) {
        if (value) {
          wielder.addCombatStatModifier(stat as 'toHit' | 'toCritical' | 'toBlock' | 'toDodge' | 'attackSpeed' | 'damageBonus' | 'armorBonus', -value);
        }
      }
    }

    this._appliedStatBonuses = false;
  }

  /**
   * Apply on-equip abilities.
   */
  private applyOnEquipAbilities(wielder: Living): void {
    const abilities = this._generatedItemData.abilities || [];
    const onEquipAbilities = abilities.filter((a) => a.trigger === 'on_equip');

    for (const ability of onEquipAbilities) {
      this.applyOnEquipAbility(ability, wielder);
    }
  }

  /**
   * Remove on-equip abilities.
   */
  private removeOnEquipAbilities(wielder: Living): void {
    const abilities = this._generatedItemData.abilities || [];
    const onEquipAbilities = abilities.filter((a) => a.trigger === 'on_equip');

    for (const ability of onEquipAbilities) {
      this.removeOnEquipAbility(ability, wielder);
    }
  }

  /**
   * Apply a single on-equip ability.
   */
  private applyOnEquipAbility(ability: GeneratedAbility, wielder: Living): void {
    switch (ability.effectType) {
      case 'haste':
        wielder.addCombatStatModifier('attackSpeed', ability.magnitude / 100);
        break;
      case 'critical':
        wielder.addCombatStatModifier('toCritical', ability.magnitude);
        break;
      case 'accuracy':
        wielder.addCombatStatModifier('toHit', ability.magnitude);
        break;
      case 'luck':
        wielder.addStatModifier('luck', ability.magnitude);
        break;
      // Add more as needed
    }
  }

  /**
   * Remove a single on-equip ability.
   */
  private removeOnEquipAbility(ability: GeneratedAbility, wielder: Living): void {
    switch (ability.effectType) {
      case 'haste':
        wielder.addCombatStatModifier('attackSpeed', -ability.magnitude / 100);
        break;
      case 'critical':
        wielder.addCombatStatModifier('toCritical', -ability.magnitude);
        break;
      case 'accuracy':
        wielder.addCombatStatModifier('toHit', -ability.magnitude);
        break;
      case 'luck':
        wielder.addStatModifier('luck', -ability.magnitude);
        break;
    }
  }
}

export default GeneratedWeapon;
