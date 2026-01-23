/**
 * Loot Daemon - Manages random loot generation for NPCs.
 *
 * Central daemon for generating random weapons, armor, and baubles.
 * NPCs can register with this daemon to use random loot instead of
 * static loot tables.
 */

import { MudObject } from '../std/object.js';
import type { NPC } from '../std/npc.js';
import type {
  NPCRandomLootConfig,
  QualityTier,
  GeneratedItemData,
  GeneratedItemType,
  WeaponType,
} from '../std/loot/types.js';
import type { ArmorSlot } from '../std/armor.js';
import { LootGenerator } from '../std/loot/generator.js';
import { GeneratedWeapon } from '../std/generated/weapon.js';
import { GeneratedArmor } from '../std/generated/armor.js';
import { GeneratedBauble } from '../std/generated/bauble.js';

/**
 * Loot Daemon singleton instance.
 */
let instance: LootDaemon | null = null;

/**
 * Loot Daemon class.
 */
export class LootDaemon extends MudObject {
  /** NPC random loot configurations by NPC path */
  private _npcConfigs: Map<string, NPCRandomLootConfig> = new Map();

  constructor() {
    super();
    this.shortDesc = 'Loot Daemon';
    this.longDesc = 'The loot daemon manages random loot generation for NPCs.';
  }

  // ============================================================================
  // NPC Registration
  // ============================================================================

  /**
   * Register an NPC to use random loot.
   * @param npcPath The NPC's object path
   * @param config Random loot configuration
   */
  registerNPC(npcPath: string, config: NPCRandomLootConfig): void {
    this._npcConfigs.set(npcPath, config);
  }

  /**
   * Unregister an NPC from random loot.
   * @param npcPath The NPC's object path
   */
  unregisterNPC(npcPath: string): void {
    this._npcConfigs.delete(npcPath);
  }

  /**
   * Get the random loot config for an NPC.
   * @param npcPath The NPC's object path
   */
  getNPCConfig(npcPath: string): NPCRandomLootConfig | undefined {
    return this._npcConfigs.get(npcPath);
  }

  /**
   * Check if an NPC has random loot enabled.
   * @param npcPath The NPC's object path
   */
  hasRandomLoot(npcPath: string): boolean {
    const config = this._npcConfigs.get(npcPath);
    return config?.enabled ?? false;
  }

  // ============================================================================
  // Loot Generation
  // ============================================================================

  /**
   * Generate random loot for an NPC death.
   * @param npc The NPC that died
   * @param corpse Optional corpse to place items in
   * @returns Array of generated MudObjects
   */
  async generateNPCLoot(npc: NPC, corpse?: MudObject): Promise<MudObject[]> {
    const npcPath = npc.objectPath || '';
    const config = this._npcConfigs.get(npcPath);

    if (!config || !config.enabled) {
      return [];
    }

    const items: MudObject[] = [];

    // Check if any loot drops at all
    const dropRoll = Math.random() * 100;
    if (dropRoll >= config.dropChance) {
      return [];
    }

    // Determine number of items to drop (1 to maxDrops)
    const numDrops = Math.max(1, Math.floor(Math.random() * config.maxDrops) + 1);

    for (let i = 0; i < numDrops; i++) {
      // Generate item data
      const itemData = this.generateItemForConfig(config);
      if (!itemData) continue;

      // Create the actual item
      const item = await this.createItem(itemData);
      if (item) {
        // Move to corpse if provided
        if (corpse) {
          await item.moveTo(corpse);
        }
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Generate item data based on NPC config.
   */
  private generateItemForConfig(config: NPCRandomLootConfig): GeneratedItemData | null {
    const generator = new LootGenerator();
    const allowedTypes = config.allowedTypes || ['weapon', 'armor', 'bauble'];

    // Select random type
    const itemType = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];

    switch (itemType) {
      case 'weapon': {
        const weaponType = config.allowedWeaponTypes
          ? config.allowedWeaponTypes[Math.floor(Math.random() * config.allowedWeaponTypes.length)]
          : undefined;
        return generator.generateWeapon(config.itemLevel, config.maxQuality, weaponType);
      }

      case 'armor': {
        const armorSlot = config.allowedArmorSlots
          ? config.allowedArmorSlots[Math.floor(Math.random() * config.allowedArmorSlots.length)]
          : undefined;
        return generator.generateArmor(config.itemLevel, config.maxQuality, undefined, armorSlot);
      }

      case 'bauble':
        return generator.generateBauble(config.itemLevel, config.maxQuality);

      default:
        return null;
    }
  }

  // ============================================================================
  // Direct Generation (for admin/testing)
  // ============================================================================

  /**
   * Generate a random weapon.
   * @param level Item level
   * @param maxQuality Maximum quality tier (or exact quality if forcedQuality is true)
   * @param weaponType Optional specific weapon type
   * @param forcedQuality If true, maxQuality becomes the exact quality
   */
  async generateWeapon(
    level: number,
    maxQuality: QualityTier = 'legendary',
    weaponType?: WeaponType,
    forcedQuality: boolean = false
  ): Promise<GeneratedWeapon> {
    const generator = new LootGenerator();
    const data = generator.generateWeapon(level, maxQuality, weaponType, forcedQuality);
    return new GeneratedWeapon(data);
  }

  /**
   * Generate a random armor piece.
   * @param level Item level
   * @param maxQuality Maximum quality tier (or exact quality if forcedQuality is true)
   * @param slot Optional specific armor slot
   * @param forcedQuality If true, maxQuality becomes the exact quality
   */
  async generateArmor(
    level: number,
    maxQuality: QualityTier = 'legendary',
    slot?: ArmorSlot,
    forcedQuality: boolean = false
  ): Promise<GeneratedArmor> {
    const generator = new LootGenerator();
    const data = generator.generateArmor(level, maxQuality, undefined, slot, forcedQuality);
    return new GeneratedArmor(data);
  }

  /**
   * Generate a random bauble.
   * @param level Item level
   * @param maxQuality Maximum quality tier (or exact quality if forcedQuality is true)
   * @param forcedQuality If true, maxQuality becomes the exact quality
   */
  async generateBauble(
    level: number,
    maxQuality: QualityTier = 'legendary',
    forcedQuality: boolean = false
  ): Promise<GeneratedBauble> {
    const generator = new LootGenerator();
    const data = generator.generateBauble(level, maxQuality, undefined, forcedQuality);
    return new GeneratedBauble(data);
  }

  /**
   * Generate a random item of any type.
   * @param level Item level
   * @param maxQuality Maximum quality tier (or exact quality if forcedQuality is true)
   * @param allowedTypes Allowed item types
   * @param forcedQuality If true, maxQuality becomes the exact quality
   */
  async generateRandomItem(
    level: number,
    maxQuality: QualityTier = 'legendary',
    allowedTypes?: GeneratedItemType[],
    forcedQuality: boolean = false
  ): Promise<MudObject> {
    const generator = new LootGenerator();
    const data = generator.generateRandomItem(level, maxQuality, allowedTypes, forcedQuality);
    return this.createItem(data) as Promise<MudObject>;
  }

  // ============================================================================
  // Item Creation
  // ============================================================================

  /**
   * Create a MudObject from generated item data.
   * @param data The generated item data
   */
  async createItem(data: GeneratedItemData): Promise<MudObject | null> {
    switch (data.generatedType) {
      case 'weapon':
        return new GeneratedWeapon(data);

      case 'armor':
        return new GeneratedArmor(data);

      case 'bauble':
        return new GeneratedBauble(data);

      default:
        return null;
    }
  }

  /**
   * Recreate an item from saved data (for persistence).
   * @param data The saved generated item data
   */
  async recreateItem(data: GeneratedItemData): Promise<MudObject | null> {
    return this.createItem(data);
  }

  // ============================================================================
  // Utility
  // ============================================================================

  /**
   * Get all registered NPC paths.
   */
  getRegisteredNPCs(): string[] {
    return Array.from(this._npcConfigs.keys());
  }

  /**
   * Get statistics about registered NPCs.
   */
  getStats(): { totalNPCs: number; enabledNPCs: number } {
    let enabledCount = 0;
    for (const config of this._npcConfigs.values()) {
      if (config.enabled) enabledCount++;
    }
    return {
      totalNPCs: this._npcConfigs.size,
      enabledNPCs: enabledCount,
    };
  }
}

/**
 * Get the loot daemon singleton.
 */
export function getLootDaemon(): LootDaemon {
  if (!instance) {
    instance = new LootDaemon();
  }
  return instance;
}

/**
 * Initialize the loot daemon (called on startup).
 */
export function initLootDaemon(): LootDaemon {
  return getLootDaemon();
}

export default LootDaemon;
