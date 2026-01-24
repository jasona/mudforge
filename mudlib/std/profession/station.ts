/**
 * CraftingStation - Stations required for crafting professions
 *
 * Crafting stations are fixed objects in rooms that players must be
 * near to perform certain crafting activities. They provide tier-based
 * quality bonuses to crafted items.
 */

import { MudObject } from '../object.js';
import type { StationType, StationDefinition } from './types.js';

/**
 * Station tier information.
 */
export const STATION_TIERS: Record<number, { name: string; bonus: number }> = {
  1: { name: 'Basic', bonus: 0 },
  2: { name: 'Quality', bonus: 10 },
  3: { name: 'Superior', bonus: 20 },
  4: { name: 'Master', bonus: 30 },
};

/**
 * Station type display names.
 */
export const STATION_NAMES: Record<StationType, string> = {
  forge: 'Forge',
  alchemy_table: 'Alchemy Table',
  workbench: 'Workbench',
  tanning_rack: 'Tanning Rack',
  cooking_fire: 'Cooking Fire',
  jeweler_bench: "Jeweler's Bench",
};

/**
 * Station type descriptions.
 */
export const STATION_DESCRIPTIONS: Record<StationType, string> = {
  forge: 'A blazing forge with anvil for metalworking.',
  alchemy_table: 'A workstation with burners, vials, and alchemical equipment.',
  workbench: 'A sturdy wooden workbench for carpentry and woodworking.',
  tanning_rack: 'A frame and tools for processing leather and hides.',
  cooking_fire: 'A cooking fire suitable for preparing food.',
  jeweler_bench: 'A delicate workstation with tools for cutting gems and crafting jewelry.',
};

/**
 * CraftingStation class for profession crafting requirements.
 */
export class CraftingStation extends MudObject {
  constructor() {
    super();
    this.shortDesc = 'a crafting station';
    this.longDesc = 'This is a crafting station.';
  }

  /**
   * Get the station type.
   */
  get stationType(): StationType {
    return this.getProperty<StationType>('stationType') || 'workbench';
  }

  /**
   * Set the station type.
   */
  set stationType(value: StationType) {
    this.setProperty('stationType', value);
  }

  /**
   * Get the station tier (1-4).
   */
  get tier(): number {
    return this.getProperty<number>('stationTier') || 1;
  }

  /**
   * Set the station tier.
   */
  set tier(value: number) {
    this.setProperty('stationTier', Math.min(4, Math.max(1, value)));
  }

  /**
   * Get quality bonus percentage.
   */
  get qualityBonus(): number {
    const tierInfo = STATION_TIERS[this.tier];
    return tierInfo?.bonus || 0;
  }

  /**
   * Initialize station from type and tier.
   */
  initStation(stationType: StationType, tier: number = 1): void {
    this.stationType = stationType;
    this.tier = tier;

    const tierInfo = STATION_TIERS[tier] || STATION_TIERS[1];
    const typeName = STATION_NAMES[stationType];
    const typeDesc = STATION_DESCRIPTIONS[stationType];

    this.name = `${tierInfo.name.toLowerCase()} ${typeName.toLowerCase()}`;
    this.shortDesc = `a ${tierInfo.name.toLowerCase()} ${typeName.toLowerCase()}`;
    this.longDesc = `${typeDesc}\n\nThis is a ${tierInfo.name.toLowerCase()}-quality station${tier > 1 ? ` that provides a +${tierInfo.bonus}% quality bonus to crafted items` : ''}.`;

    // Add identifiers
    this.ids = [
      this.name,
      stationType,
      typeName.toLowerCase(),
      tierInfo.name.toLowerCase(),
      `${tierInfo.name.toLowerCase()} ${typeName.toLowerCase()}`,
    ];
  }

  /**
   * Override look to show station details.
   */
  override look(viewer: MudObject): void {
    const tierInfo = STATION_TIERS[this.tier];
    const typeName = STATION_NAMES[this.stationType];

    viewer.receive(`${this.longDesc}\n`);
    viewer.receive(`\n`);
    viewer.receive(`Type: {yellow}${typeName}{/}\n`);
    viewer.receive(`Quality: {cyan}${tierInfo?.name || 'Basic'}{/} (Tier ${this.tier})\n`);

    if (this.qualityBonus > 0) {
      viewer.receive(`Crafting Bonus: {green}+${this.qualityBonus}% quality{/}\n`);
    }
  }
}

/**
 * Helper to mark a room as having a crafting station.
 * This is an alternative to creating a CraftingStation object -
 * you can simply set properties on the room itself.
 */
export function markRoomAsStation(room: MudObject, stationType: StationType, tier: number = 1): void {
  room.setProperty('stationType', stationType);
  room.setProperty('stationTier', tier);
}

export default CraftingStation;
