/**
 * Tool - Equipment used for gathering professions
 *
 * Tools have durability that decreases with use and provide
 * bonuses to gathering success and quality based on their tier.
 */

import { Item } from '../item.js';
import type { ToolType, ToolDefinition } from './types.js';

/**
 * Tool tier information.
 */
export const TOOL_TIERS: Record<number, { name: string; bonus: number; durability: number }> = {
  1: { name: 'Crude', bonus: 0, durability: 50 },
  2: { name: 'Iron', bonus: 10, durability: 100 },
  3: { name: 'Steel', bonus: 20, durability: 200 },
  4: { name: 'Mithril', bonus: 30, durability: 500 },
};

/**
 * Tool class for gathering equipment.
 */
export class Tool extends Item {
  constructor() {
    super();
    this.shortDesc = 'a tool';
    this.longDesc = 'This is a gathering tool.';
  }

  /**
   * Get the tool type.
   */
  get toolType(): ToolType {
    return this.getProperty<ToolType>('toolType') || 'pickaxe';
  }

  /**
   * Set the tool type.
   */
  set toolType(value: ToolType) {
    this.setProperty('toolType', value);
  }

  /**
   * Get the tool tier (1-4).
   */
  get tier(): number {
    return this.getProperty<number>('toolTier') || 1;
  }

  /**
   * Set the tool tier.
   */
  set tier(value: number) {
    this.setProperty('toolTier', Math.min(4, Math.max(1, value)));
  }

  /**
   * Get current durability.
   */
  get durability(): number {
    return this.getProperty<number>('durability') || this.maxDurability;
  }

  /**
   * Set current durability.
   */
  set durability(value: number) {
    this.setProperty('durability', Math.max(0, Math.min(value, this.maxDurability)));
  }

  /**
   * Get maximum durability.
   */
  get maxDurability(): number {
    const tierInfo = TOOL_TIERS[this.tier];
    return this.getProperty<number>('maxDurability') || tierInfo?.durability || 50;
  }

  /**
   * Get gathering bonus percentage.
   */
  get gatherBonus(): number {
    const tierInfo = TOOL_TIERS[this.tier];
    return tierInfo?.bonus || 0;
  }

  /**
   * Get durability percentage.
   */
  get durabilityPercent(): number {
    return Math.round((this.durability / this.maxDurability) * 100);
  }

  /**
   * Check if tool is broken.
   */
  get isBroken(): boolean {
    return this.durability <= 0;
  }

  /**
   * Use the tool (decrease durability).
   * Returns true if tool broke, false otherwise.
   */
  use(): boolean {
    if (this.isBroken) return true;

    this.durability--;

    if (this.durability <= 0) {
      return true;
    }

    return false;
  }

  /**
   * Repair the tool to full durability.
   * @param amount Amount to repair (or full if not specified)
   */
  repair(amount?: number): void {
    if (amount === undefined) {
      this.durability = this.maxDurability;
    } else {
      this.durability = Math.min(this.durability + amount, this.maxDurability);
    }
  }

  /**
   * Get durability status description.
   */
  getDurabilityStatus(): string {
    const percent = this.durabilityPercent;

    if (percent >= 75) return '{green}Good condition{/}';
    if (percent >= 50) return '{yellow}Worn{/}';
    if (percent >= 25) return '{YELLOW}Damaged{/}';
    if (percent > 0) return '{red}Nearly broken{/}';
    return '{RED}Broken{/}';
  }

  /**
   * Initialize tool from tier and type.
   */
  initTool(toolType: ToolType, tier: number = 1): void {
    this.toolType = toolType;
    this.tier = tier;

    const tierInfo = TOOL_TIERS[tier] || TOOL_TIERS[1];
    this.setProperty('maxDurability', tierInfo.durability);
    this.setProperty('durability', tierInfo.durability);

    // Set name and description based on type and tier
    const typeName = this.formatToolTypeName(toolType);
    this.name = `${tierInfo.name.toLowerCase()} ${typeName}`.toLowerCase();
    this.shortDesc = `a ${tierInfo.name.toLowerCase()} ${typeName}`;
    this.longDesc = `A ${tierInfo.name.toLowerCase()}-quality ${typeName} used for gathering.`;

    // Set weight based on type and tier
    const baseWeights: Record<ToolType, number> = {
      pickaxe: 4,
      herbalism_kit: 1,
      fishing_rod: 2,
      logging_axe: 5,
      skinning_knife: 1,
    };

    this.weight = (baseWeights[toolType] || 2) * (1 - (tier - 1) * 0.1);

    // Set value based on tier
    const tierValues = [10, 50, 200, 1000];
    this.setProperty('value', tierValues[tier - 1] || 10);

    // Add identifiers
    this.ids = [
      this.name,
      toolType,
      typeName.toLowerCase(),
      tierInfo.name.toLowerCase(),
      `${tierInfo.name.toLowerCase()} ${typeName}`.toLowerCase(),
    ];
  }

  /**
   * Format tool type name for display.
   */
  private formatToolTypeName(toolType: ToolType): string {
    return toolType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Override look to show tool details.
   */
  override look(viewer: MudObject): void {
    const tierInfo = TOOL_TIERS[this.tier];

    viewer.receive(`${this.longDesc}\n`);
    viewer.receive(`\n`);
    viewer.receive(`Tier: {yellow}${tierInfo?.name || 'Unknown'}{/} (Tier ${this.tier})\n`);
    viewer.receive(`Gathering Bonus: {green}+${this.gatherBonus}%{/}\n`);
    viewer.receive(`Durability: ${this.getDurabilityStatus()} (${this.durability}/${this.maxDurability})\n`);

    // Show durability bar
    const barWidth = 20;
    const filled = Math.round((this.durabilityPercent / 100) * barWidth);
    const empty = barWidth - filled;
    viewer.receive(`[${'█'.repeat(filled)}${'░'.repeat(empty)}]\n`);
  }
}

// Import MudObject type for look method
import type { MudObject } from '../object.js';

export default Tool;
