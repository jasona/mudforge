/**
 * Mercenary Daemon - Central management for all active mercenaries.
 *
 * Handles mercenary creation, tracking, follow behavior, and persistence.
 */

import { MudObject } from '../std/object.js';
import { Mercenary } from '../std/mercenary.js';
import type { Living } from '../std/living.js';
import type {
  MercenaryType,
  MercenaryTemplate,
  MercenarySaveData,
} from '../lib/mercenary-types.js';
import {
  MERCENARY_TEMPLATES,
  calculateMercenaryCost,
  getMaxMercenaries,
} from '../lib/mercenary-types.js';

/**
 * Mercenary Daemon class.
 */
export class MercenaryDaemon extends MudObject {
  /** Active mercenaries tracked by mercId */
  private _mercenaries: Map<string, Mercenary> = new Map();

  /** Owner name -> Set of mercIds */
  private _ownerMercenaries: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.shortDesc = 'Mercenary Daemon';
    this.longDesc = 'The mercenary daemon manages all active mercenaries.';
  }

  // ========== Template Management ==========

  /**
   * Get a mercenary template by type.
   */
  getTemplate(type: MercenaryType): MercenaryTemplate | undefined {
    return MERCENARY_TEMPLATES[type];
  }

  /**
   * Get all available mercenary types.
   */
  getMercenaryTypes(): MercenaryType[] {
    return Object.keys(MERCENARY_TEMPLATES) as MercenaryType[];
  }

  // ========== Cost Calculation ==========

  /**
   * Calculate the cost to hire a mercenary.
   */
  calculateCost(mercLevel: number, playerLevel: number): number {
    return calculateMercenaryCost(mercLevel, playerLevel);
  }

  /**
   * Get the maximum number of mercenaries a player can have.
   */
  getMaxMercenaries(playerLevel: number): number {
    return getMaxMercenaries(playerLevel);
  }

  // ========== Mercenary Creation ==========

  /**
   * Hire a new mercenary for a player.
   *
   * @param owner The player hiring the mercenary
   * @param type The type of mercenary to hire
   * @param level The level of the mercenary
   * @returns The hired mercenary, or null if hiring failed
   */
  async hireMercenary(
    owner: MudObject,
    type: MercenaryType,
    level: number
  ): Promise<Mercenary | null> {
    const template = this.getTemplate(type);
    if (!template) {
      return null;
    }

    const ownerLiving = owner as Living & { name?: string; gold?: number; removeGold?: (amount: number) => boolean };
    const ownerName = ownerLiving.name;
    if (!ownerName) {
      return null;
    }

    const playerLevel = ownerLiving.level || 1;

    // Check if player already has max mercenaries
    const currentMercs = this.getPlayerMercenaries(ownerName);
    const maxMercs = this.getMaxMercenaries(playerLevel);
    if (currentMercs.length >= maxMercs) {
      return null;
    }

    // Check if player can afford
    const cost = this.calculateCost(level, playerLevel);
    if (ownerLiving.gold !== undefined && ownerLiving.gold < cost) {
      return null;
    }

    // Deduct gold
    if (ownerLiving.removeGold) {
      if (!ownerLiving.removeGold(cost)) {
        return null;
      }
    }

    // Create the mercenary
    const merc = new Mercenary();

    // Set up identity
    if (typeof efuns !== 'undefined' && efuns.initCloneIdentity) {
      efuns.initCloneIdentity(merc, '/std/mercenary');
    }

    // Configure from template
    merc.setFromTemplate(template, level, ownerName);

    // Register in daemon
    this._mercenaries.set(merc.mercId, merc);

    // Track owner's mercenaries
    let ownerMercSet = this._ownerMercenaries.get(ownerName.toLowerCase());
    if (!ownerMercSet) {
      ownerMercSet = new Set();
      this._ownerMercenaries.set(ownerName.toLowerCase(), ownerMercSet);
    }
    ownerMercSet.add(merc.mercId);

    // Move to owner's location
    if (owner.environment) {
      await merc.moveTo(owner.environment);
    }

    return merc;
  }

  /**
   * Restore a mercenary from saved data (on player login).
   */
  async restoreMercenary(owner: MudObject, saveData: MercenarySaveData): Promise<Mercenary | null> {
    const ownerLiving = owner as Living & { name?: string };
    const ownerName = ownerLiving.name;
    if (!ownerName) {
      return null;
    }

    // Get template for the mercenary type
    const template = this.getTemplate(saveData.type);
    if (!template) {
      return null;
    }

    // Create the mercenary
    const merc = new Mercenary();

    // Set up identity
    if (typeof efuns !== 'undefined' && efuns.initCloneIdentity) {
      efuns.initCloneIdentity(merc, '/std/mercenary');
    }

    // Configure from template first (for base properties)
    merc.setFromTemplate(template, saveData.level, ownerName);

    // Restore saved state (overrides template defaults)
    merc.restore(saveData);

    // Register in daemon
    this._mercenaries.set(merc.mercId, merc);

    // Track owner's mercenaries
    let ownerMercSet = this._ownerMercenaries.get(ownerName.toLowerCase());
    if (!ownerMercSet) {
      ownerMercSet = new Set();
      this._ownerMercenaries.set(ownerName.toLowerCase(), ownerMercSet);
    }
    ownerMercSet.add(merc.mercId);

    // Move to owner's location
    if (owner.environment) {
      await merc.moveTo(owner.environment);
    }

    return merc;
  }

  // ========== Mercenary Lookup ==========

  /**
   * Get all active mercenaries for a player.
   */
  getPlayerMercenaries(ownerName: string): Mercenary[] {
    const mercIds = this._ownerMercenaries.get(ownerName.toLowerCase());
    if (!mercIds) {
      return [];
    }

    const mercs: Mercenary[] = [];
    for (const mercId of mercIds) {
      const merc = this._mercenaries.get(mercId);
      if (merc) {
        mercs.push(merc);
      }
    }
    return mercs;
  }

  /**
   * Get a mercenary by its custom name or type.
   */
  getMercenaryByName(ownerName: string, mercName: string): Mercenary | undefined {
    const mercs = this.getPlayerMercenaries(ownerName);
    const lowerName = mercName.toLowerCase();

    return mercs.find(merc =>
      merc.mercName?.toLowerCase() === lowerName ||
      merc.mercType.toLowerCase() === lowerName
    );
  }

  /**
   * Get a mercenary by its ID.
   */
  getMercenaryById(mercId: string): Mercenary | undefined {
    return this._mercenaries.get(mercId);
  }

  // ========== Follow System ==========

  /**
   * Handle owner movement - trigger mercenary follows.
   */
  async handleOwnerMovement(
    owner: MudObject,
    fromRoom: MudObject,
    toRoom: MudObject,
    direction: string
  ): Promise<void> {
    const ownerLiving = owner as Living & { name?: string };
    const ownerName = ownerLiving.name;
    if (!ownerName) {
      return;
    }

    const mercs = this.getPlayerMercenaries(ownerName);
    for (const merc of mercs) {
      if (merc.following && merc.environment === fromRoom) {
        await merc.followOwner(owner, fromRoom, toRoom, direction);
      }
    }
  }

  // ========== Mercenary Removal ==========

  /**
   * Remove a mercenary from the registry (on death).
   */
  removeMercenary(mercId: string): boolean {
    const merc = this._mercenaries.get(mercId);
    if (!merc) {
      return false;
    }

    const ownerName = merc.ownerName;

    // Remove from active registry
    this._mercenaries.delete(mercId);

    // Remove from owner's mercenary set
    if (ownerName) {
      const ownerMercSet = this._ownerMercenaries.get(ownerName.toLowerCase());
      if (ownerMercSet) {
        ownerMercSet.delete(mercId);
      }
    }

    return true;
  }

  /**
   * Dismiss a mercenary permanently.
   */
  dismissMercenary(merc: Mercenary): boolean {
    const mercId = merc.mercId;
    const ownerName = merc.ownerName;

    // Remove from registries
    this._mercenaries.delete(mercId);

    if (ownerName) {
      const ownerMercSet = this._ownerMercenaries.get(ownerName.toLowerCase());
      if (ownerMercSet) {
        ownerMercSet.delete(mercId);
      }
    }

    // Destroy the mercenary object
    if (typeof efuns !== 'undefined' && efuns.destruct) {
      efuns.destruct(merc);
    }

    return true;
  }

  // ========== Persistence Support ==========

  /**
   * Get all mercenary save data for a player (for saving with player data).
   */
  getPlayerMercenarySaveData(ownerName: string): MercenarySaveData[] {
    const mercs = this.getPlayerMercenaries(ownerName);
    return mercs.map(merc => merc.serialize());
  }

  /**
   * Clean up all mercenaries for a player (on logout).
   */
  cleanupPlayerMercenaries(ownerName: string): void {
    const mercIds = this._ownerMercenaries.get(ownerName.toLowerCase());
    if (mercIds) {
      for (const mercId of mercIds) {
        const merc = this._mercenaries.get(mercId);
        if (merc && typeof efuns !== 'undefined' && efuns.destruct) {
          efuns.destruct(merc);
        }
        this._mercenaries.delete(mercId);
      }
      this._ownerMercenaries.delete(ownerName.toLowerCase());
    }
  }

  // ========== Stats ==========

  /**
   * Get the total number of active mercenaries.
   */
  get activeMercenaryCount(): number {
    return this._mercenaries.size;
  }

  /**
   * Get stats about mercenary usage.
   */
  getStats(): { totalActive: number; byType: Record<MercenaryType, number> } {
    const byType: Record<MercenaryType, number> = {
      fighter: 0,
      mage: 0,
      thief: 0,
      cleric: 0,
    };

    for (const merc of this._mercenaries.values()) {
      byType[merc.mercType]++;
    }

    return {
      totalActive: this._mercenaries.size,
      byType,
    };
  }
}

// Singleton instance
let mercenaryDaemon: MercenaryDaemon | null = null;

/**
 * Get the global MercenaryDaemon instance.
 */
export function getMercenaryDaemon(): MercenaryDaemon {
  if (!mercenaryDaemon) {
    mercenaryDaemon = new MercenaryDaemon();
  }
  return mercenaryDaemon;
}

/**
 * Reset the mercenary daemon (for testing).
 */
export function resetMercenaryDaemon(): void {
  mercenaryDaemon = null;
}

export default MercenaryDaemon;
