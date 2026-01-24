/**
 * Basic Tool Definitions
 *
 * Factory functions to create basic gathering tools for each profession.
 */

import { Tool, TOOL_TIERS } from '../../std/profession/tool.js';
import type { ToolType } from '../../std/profession/types.js';

/**
 * Create a pickaxe for mining.
 */
export function createPickaxe(tier: number = 1): Tool {
  const tool = new Tool();
  tool.initTool('pickaxe', tier);
  return tool;
}

/**
 * Create an herbalism kit for herbalism.
 */
export function createHerbalismKit(tier: number = 1): Tool {
  const tool = new Tool();
  tool.initTool('herbalism_kit', tier);

  // Override description for herbalism kit
  const tierInfo = TOOL_TIERS[tier];
  tool.longDesc = `A ${tierInfo.name.toLowerCase()}-quality herbalism kit containing pouches, scissors, and tools for safely harvesting herbs.`;

  return tool;
}

/**
 * Create a fishing rod for fishing.
 */
export function createFishingRod(tier: number = 1): Tool {
  const tool = new Tool();
  tool.initTool('fishing_rod', tier);

  const tierInfo = TOOL_TIERS[tier];
  tool.longDesc = `A ${tierInfo.name.toLowerCase()}-quality fishing rod with line and hooks for catching fish.`;

  return tool;
}

/**
 * Create a logging axe for woodcutting.
 */
export function createLoggingAxe(tier: number = 1): Tool {
  const tool = new Tool();
  tool.initTool('logging_axe', tier);

  const tierInfo = TOOL_TIERS[tier];
  tool.longDesc = `A ${tierInfo.name.toLowerCase()}-quality logging axe designed for felling trees efficiently.`;

  return tool;
}

/**
 * Create a skinning knife for skinning.
 */
export function createSkinningKnife(tier: number = 1): Tool {
  const tool = new Tool();
  tool.initTool('skinning_knife', tier);

  const tierInfo = TOOL_TIERS[tier];
  tool.longDesc = `A ${tierInfo.name.toLowerCase()}-quality skinning knife with a sharp, curved blade for processing hides.`;

  return tool;
}

/**
 * Create any tool by type and tier.
 */
export function createTool(toolType: ToolType, tier: number = 1): Tool {
  switch (toolType) {
    case 'pickaxe':
      return createPickaxe(tier);
    case 'herbalism_kit':
      return createHerbalismKit(tier);
    case 'fishing_rod':
      return createFishingRod(tier);
    case 'logging_axe':
      return createLoggingAxe(tier);
    case 'skinning_knife':
      return createSkinningKnife(tier);
    default:
      const tool = new Tool();
      tool.initTool(toolType, tier);
      return tool;
  }
}

/**
 * Get all available tool types.
 */
export function getAllToolTypes(): ToolType[] {
  return ['pickaxe', 'herbalism_kit', 'fishing_rod', 'logging_axe', 'skinning_knife'];
}

export default {
  createPickaxe,
  createHerbalismKit,
  createFishingRod,
  createLoggingAxe,
  createSkinningKnife,
  createTool,
  getAllToolTypes,
};
