/**
 * ResourceNode - Gatherable resource nodes in the world
 *
 * Resource nodes are stationary objects that players can gather
 * materials from using appropriate tools and profession skills.
 */

import { MudObject } from '../object.js';
import type {
  ResourceNodeDefinition,
  ProfessionId,
  MaterialQuality,
  GatherResult,
  NodeMaterialDrop,
  NodeBonusDrop,
  ToolType,
} from './types.js';
import { PROFESSION_CONSTANTS, QUALITY_VALUES } from './types.js';
import { PROFESSION_DEFINITIONS } from './definitions.js';
import { getMaterial, MATERIAL_DEFINITIONS } from './materials.js';
import { getResourceNode, RESOURCE_NODE_DEFINITIONS } from './resource-nodes.js';

/**
 * Node state for tracking depletion and respawning.
 */
export interface NodeState {
  currentCapacity: number;
  maxCapacity: number;
  lastGatherTime: number;
  respawnTime: number; // Time per capacity point to respawn
}

/**
 * ResourceNode class for gatherable world objects.
 */
export class ResourceNode extends MudObject {
  private _nodeDefinitionId: string = '';
  private _state: NodeState = {
    currentCapacity: 0,
    maxCapacity: 0,
    lastGatherTime: 0,
    respawnTime: 300,
  };

  constructor() {
    super();
    this.shortDesc = 'a resource node';
    this.longDesc = 'This is a gatherable resource.';
  }

  /**
   * Initialize the node from a definition.
   */
  initFromDefinition(definitionId: string): void {
    const def = getResourceNode(definitionId);
    if (!def) {
      throw new Error(`Unknown resource node definition: ${definitionId}`);
    }

    this._nodeDefinitionId = definitionId;
    this.name = def.name.toLowerCase();
    this.shortDesc = def.shortDesc;
    this.longDesc = def.longDesc;

    this._state = {
      currentCapacity: def.capacity,
      maxCapacity: def.capacity,
      lastGatherTime: 0,
      respawnTime: def.respawnTime,
    };

    // Store definition ID as property for persistence
    this.setProperty('nodeDefinitionId', definitionId);

    // Add keywords for matching
    this.ids = [this.name, ...def.name.toLowerCase().split(' ')];
  }

  /**
   * Get the node definition.
   */
  get definition(): ResourceNodeDefinition | undefined {
    return getResourceNode(this._nodeDefinitionId);
  }

  /**
   * Get current capacity.
   */
  get currentCapacity(): number {
    this.processRespawn();
    return this._state.currentCapacity;
  }

  /**
   * Get max capacity.
   */
  get maxCapacity(): number {
    return this._state.maxCapacity;
  }

  /**
   * Check if node is depleted.
   */
  get isDepleted(): boolean {
    this.processRespawn();
    return this._state.currentCapacity <= 0;
  }

  /**
   * Get the profession required to gather this node.
   */
  get gatherProfession(): ProfessionId | undefined {
    return this.definition?.gatherProfession;
  }

  /**
   * Get the level required to gather this node.
   */
  get levelRequired(): number {
    return this.definition?.levelRequired || 1;
  }

  /**
   * Get the tool type required.
   */
  get toolRequired(): ToolType | undefined {
    return this.definition?.toolRequired;
  }

  /**
   * Check if node is hidden (requires discovery).
   */
  get isHidden(): boolean {
    return this.definition?.hidden || false;
  }

  /**
   * Get level required to discover this node.
   */
  get discoverLevel(): number {
    return this.definition?.discoverLevel || this.levelRequired;
  }

  /**
   * Get node state description for display.
   */
  getStateDescription(): string {
    this.processRespawn();
    const percent = this._state.currentCapacity / this._state.maxCapacity;

    if (percent >= 0.75) return '{green}Abundant{/}';
    if (percent >= 0.50) return '{yellow}Normal{/}';
    if (percent >= 0.25) return '{YELLOW}Depleted{/}';
    if (percent > 0) return '{red}Nearly Exhausted{/}';
    return '{dim}Exhausted{/}';
  }

  /**
   * Process respawn over time.
   * Called before any state access to update capacity.
   */
  processRespawn(): void {
    if (this._state.currentCapacity >= this._state.maxCapacity) return;

    const now = Date.now();
    const timeSinceLastGather = (now - this._state.lastGatherTime) / 1000;
    const respawnedPoints = Math.floor(timeSinceLastGather / this._state.respawnTime);

    if (respawnedPoints > 0) {
      this._state.currentCapacity = Math.min(
        this._state.maxCapacity,
        this._state.currentCapacity + respawnedPoints
      );
      // Update last gather time to account for partial respawn
      this._state.lastGatherTime = now - ((timeSinceLastGather % this._state.respawnTime) * 1000);
    }
  }

  /**
   * Attempt to gather from this node.
   * @param playerLevel The player's skill level in the relevant profession
   * @param toolTier The tier of the tool being used (0-4)
   * @param primaryStat The player's primary stat value
   */
  gather(playerLevel: number, toolTier: number = 0, primaryStat: number = 10): GatherResult {
    const def = this.definition;
    if (!def) {
      return { success: false, message: 'This node cannot be gathered.' };
    }

    // Check if depleted
    this.processRespawn();
    if (this._state.currentCapacity <= 0) {
      return { success: false, message: `The ${def.name.toLowerCase()} is exhausted.` };
    }

    // Check level requirement
    if (playerLevel < def.levelRequired) {
      return {
        success: false,
        message: `You need ${PROFESSION_DEFINITIONS[def.gatherProfession].name} level ${def.levelRequired} to gather from this.`,
      };
    }

    // Calculate success chance
    const baseSuccess = PROFESSION_CONSTANTS.BASE_GATHER_SUCCESS_RATE;
    const levelBonus = (playerLevel - def.levelRequired) * PROFESSION_CONSTANTS.GATHER_SUCCESS_PER_LEVEL;
    const toolBonus = PROFESSION_CONSTANTS.TOOL_TIER_BONUS[toolTier] || 0;
    const successChance = Math.min(0.95, baseSuccess + levelBonus + toolBonus);

    // Roll for success
    if (Math.random() > successChance) {
      // Failed gather - still depletes node slightly
      this._state.currentCapacity = Math.max(0, this._state.currentCapacity - 0.5);
      this._state.lastGatherTime = Date.now();
      return { success: false, message: 'You fail to gather anything useful.' };
    }

    // Success - roll for materials
    const materials = this.rollMaterials(def.materials, playerLevel, def.levelRequired, primaryStat);

    // Check for bonus materials
    let bonusMaterial: { materialId: string; quantity: number } | undefined;
    if (def.bonusMaterials) {
      bonusMaterial = this.rollBonusMaterial(def.bonusMaterials, playerLevel);
    }

    // Check for critical gather (bonus XP)
    const critChance = 0.05 + (playerLevel - def.levelRequired) * 0.01;
    const critical = Math.random() < critChance;

    // Deplete node
    this._state.currentCapacity--;
    this._state.lastGatherTime = Date.now();

    // Calculate XP
    const profession = PROFESSION_DEFINITIONS[def.gatherProfession];
    let xpGained = profession.baseXPPerUse;

    // XP modifiers
    const levelDiff = def.levelRequired - playerLevel;
    if (levelDiff > 0) {
      // Challenging content
      xpGained = Math.floor(xpGained * (1 + PROFESSION_CONSTANTS.CHALLENGE_XP_BONUS));
    } else if (levelDiff < -PROFESSION_CONSTANTS.TRIVIAL_LEVEL_THRESHOLD) {
      // Trivial content
      xpGained = Math.floor(xpGained * (1 - PROFESSION_CONSTANTS.TRIVIAL_XP_PENALTY));
    }

    if (critical) {
      xpGained = Math.floor(xpGained * (1 + PROFESSION_CONSTANTS.CRITICAL_GATHER_XP_BONUS));
    }

    return {
      success: true,
      message: critical
        ? `You skillfully gather from the ${def.name.toLowerCase()}!`
        : `You gather from the ${def.name.toLowerCase()}.`,
      materials,
      bonusMaterial,
      xpGained,
      durabilityLost: 1,
      critical,
    };
  }

  /**
   * Roll for materials based on drop table.
   */
  private rollMaterials(
    drops: NodeMaterialDrop[],
    playerLevel: number,
    nodeLevel: number,
    primaryStat: number
  ): Array<{ materialId: string; quantity: number; quality: MaterialQuality }> {
    const results: Array<{ materialId: string; quantity: number; quality: MaterialQuality }> = [];

    // Calculate total weight
    const totalWeight = drops.reduce((sum, d) => sum + d.weight, 0);

    // Roll for which material
    const roll = Math.random() * totalWeight;
    let accumulated = 0;

    for (const drop of drops) {
      accumulated += drop.weight;
      if (roll < accumulated) {
        // Selected this drop
        const quantity = Math.floor(
          Math.random() * (drop.maxQuantity - drop.minQuantity + 1) + drop.minQuantity
        );

        // Calculate quality based on skill vs node level and stat
        const quality = this.calculateGatherQuality(playerLevel, nodeLevel, primaryStat);

        results.push({
          materialId: drop.materialId,
          quantity,
          quality,
        });
        break;
      }
    }

    return results;
  }

  /**
   * Roll for bonus materials.
   */
  private rollBonusMaterial(
    bonuses: NodeBonusDrop[],
    playerLevel: number
  ): { materialId: string; quantity: number } | undefined {
    for (const bonus of bonuses) {
      if (playerLevel >= bonus.levelRequired && Math.random() * 100 < bonus.chance) {
        return { materialId: bonus.materialId, quantity: 1 };
      }
    }
    return undefined;
  }

  /**
   * Calculate gather quality based on skill and stats.
   */
  private calculateGatherQuality(
    playerLevel: number,
    nodeLevel: number,
    primaryStat: number
  ): MaterialQuality {
    const qualityTiers: MaterialQuality[] = ['poor', 'common', 'fine', 'superior', 'exceptional', 'legendary'];

    // Base quality value (2 = common)
    let qualityValue = 2;

    // Skill bonus: +0.5 per 20 levels above node
    qualityValue += Math.max(0, (playerLevel - nodeLevel) / 20) * 0.5;

    // Stat bonus
    qualityValue += (primaryStat - 10) * 0.03;

    // Random variance
    qualityValue += (Math.random() - 0.5) * 0.5;

    // Clamp and convert to tier
    const index = Math.min(Math.max(0, Math.round(qualityValue) - 1), qualityTiers.length - 1);
    return qualityTiers[index];
  }

  /**
   * Override look to show node state.
   */
  override look(viewer: MudObject): void {
    const def = this.definition;
    if (!def) {
      viewer.receive(`${this.longDesc}\n`);
      return;
    }

    viewer.receive(`${this.longDesc}\n`);
    viewer.receive(`State: ${this.getStateDescription()}\n`);
    viewer.receive(`{dim}Requires: ${PROFESSION_DEFINITIONS[def.gatherProfession].name} level ${def.levelRequired}{/}\n`);
    if (def.toolRequired) {
      viewer.receive(`{dim}Tool: ${def.toolRequired.replace('_', ' ')}{/}\n`);
    }
  }
}

export default ResourceNode;
