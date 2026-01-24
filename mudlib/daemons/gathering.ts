/**
 * Gathering Daemon
 *
 * Manages resource node registration, tracking, and respawn scheduling.
 */

import { MudObject } from '../std/object.js';
import { ResourceNode } from '../std/profession/resource-node.js';
import type { ProfessionId, GatherResult, MaterialQuality } from '../std/profession/types.js';
import { PROFESSION_DEFINITIONS } from '../std/profession/definitions.js';
import { getMaterial } from '../std/profession/materials.js';
import { getResourceNode } from '../std/profession/resource-nodes.js';
import { getProfessionDaemon, type ProfessionPlayer } from './profession.js';

// Singleton instance
let gatheringDaemonInstance: GatheringDaemon | null = null;

/**
 * Get the gathering daemon singleton.
 */
export function getGatheringDaemon(): GatheringDaemon {
  if (!gatheringDaemonInstance) {
    gatheringDaemonInstance = new GatheringDaemon();
  }
  return gatheringDaemonInstance;
}

/**
 * Registered node tracking.
 */
interface RegisteredNode {
  node: ResourceNode;
  roomPath: string;
}

/**
 * Gathering Daemon - manages all gathering-related functionality.
 */
export class GatheringDaemon extends MudObject {
  private registeredNodes: Map<string, RegisteredNode> = new Map();

  constructor() {
    super();
    this.name = 'GatheringDaemon';
    this.shortDesc = 'the gathering daemon';
  }

  /**
   * Register a resource node in the world.
   */
  registerNode(node: ResourceNode, roomPath: string): void {
    const nodeId = node.objectId || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.registeredNodes.set(nodeId, { node, roomPath });
  }

  /**
   * Unregister a resource node.
   */
  unregisterNode(nodeId: string): void {
    this.registeredNodes.delete(nodeId);
  }

  /**
   * Get all nodes in a room.
   */
  getNodesInRoom(roomPath: string): ResourceNode[] {
    const nodes: ResourceNode[] = [];
    for (const [, registered] of this.registeredNodes) {
      if (registered.roomPath === roomPath) {
        nodes.push(registered.node);
      }
    }
    return nodes;
  }

  /**
   * Find a node in a room by name/keyword.
   */
  findNode(room: MudObject, keyword: string): ResourceNode | null {
    const roomPath = room.objectPath;
    const nodes = this.getNodesInRoom(roomPath);

    // Also check room contents for ResourceNode instances
    const contents = room.getProperty<MudObject[]>('contents') || [];
    for (const item of contents) {
      if (item instanceof ResourceNode) {
        if (!nodes.includes(item)) {
          nodes.push(item);
        }
      }
    }

    // Match by keyword
    const lowerKeyword = keyword.toLowerCase();
    for (const node of nodes) {
      if (
        node.name.toLowerCase().includes(lowerKeyword) ||
        (node.ids && node.ids.some((id) => id.toLowerCase().includes(lowerKeyword)))
      ) {
        return node;
      }
    }

    return null;
  }

  /**
   * Attempt to gather from a node.
   * This is the main entry point for the gather command.
   */
  async attemptGather(
    player: ProfessionPlayer,
    node: ResourceNode
  ): Promise<GatherResult> {
    const professionDaemon = getProfessionDaemon();
    const nodeDef = node.definition;

    if (!nodeDef) {
      return { success: false, message: 'This cannot be gathered.' };
    }

    // Check if hidden and not discovered
    if (nodeDef.hidden) {
      if (!professionDaemon.hasDiscoveredNode(player, nodeDef.id)) {
        // Check if player can discover it
        const skill = professionDaemon.getPlayerSkill(player, nodeDef.gatherProfession);
        if (skill.level >= (nodeDef.discoverLevel || nodeDef.levelRequired)) {
          // Discover it!
          professionDaemon.discoverNode(player, nodeDef.id);
        } else {
          return { success: false, message: 'You don\'t notice anything gatherable here.' };
        }
      }
    }

    // Check profession and level
    const skill = professionDaemon.getPlayerSkill(player, nodeDef.gatherProfession);
    if (skill.level < nodeDef.levelRequired) {
      const profession = PROFESSION_DEFINITIONS[nodeDef.gatherProfession];
      return {
        success: false,
        message: `You need ${profession.name} level ${nodeDef.levelRequired} to gather this. You are level ${skill.level}.`,
      };
    }

    // Check tool requirement
    let toolTier = 0;
    let tool: MudObject | null = null;

    if (nodeDef.toolRequired) {
      const toolCheck = professionDaemon.hasTool(player, nodeDef.toolRequired);
      if (!toolCheck.has) {
        return {
          success: false,
          message: `You need a ${nodeDef.toolRequired.replace('_', ' ')} to gather this.`,
        };
      }
      tool = toolCheck.tool;
      toolTier = toolCheck.tier;
    }

    // Get primary stat
    const profession = PROFESSION_DEFINITIONS[nodeDef.gatherProfession];
    const primaryStat = player.getStat(profession.primaryStat);

    // Attempt the gather
    const result = node.gather(skill.level, toolTier, primaryStat);

    if (!result.success) {
      return result;
    }

    // Use tool durability
    if (tool && result.durabilityLost) {
      const toolResult = professionDaemon.useTool(tool);
      if (toolResult.broken) {
        player.receive(`{red}Your ${tool.shortDesc} breaks!{/}\n`);
        if (typeof efuns !== 'undefined' && efuns.destruct) {
          efuns.destruct(tool);
        }
      } else if (toolResult.remaining <= 10) {
        player.receive(`{yellow}Your ${tool.shortDesc} is getting worn (${toolResult.remaining} uses left).{/}\n`);
      }
    }

    // Create material items in player inventory
    if (result.materials) {
      for (const mat of result.materials) {
        await this.createMaterialItem(player, mat.materialId, mat.quantity, mat.quality);
      }
    }

    // Create bonus material if any
    if (result.bonusMaterial) {
      const bonusMat = getMaterial(result.bonusMaterial.materialId);
      if (bonusMat) {
        player.receive(`{yellow}Bonus find: ${bonusMat.name}!{/}\n`);
        await this.createMaterialItem(
          player,
          result.bonusMaterial.materialId,
          result.bonusMaterial.quantity,
          bonusMat.quality
        );
      }
    }

    // Award XP
    if (result.xpGained) {
      professionDaemon.awardXP(player, nodeDef.gatherProfession, result.xpGained, {
        isCritical: result.critical,
        isChallenge: nodeDef.levelRequired > skill.level,
        isTrivial: nodeDef.levelRequired < skill.level - 10,
      });
    }

    return result;
  }

  /**
   * Create a material item in player's inventory.
   */
  private async createMaterialItem(
    player: ProfessionPlayer,
    materialId: string,
    quantity: number,
    quality: MaterialQuality
  ): Promise<void> {
    const matDef = getMaterial(materialId);
    if (!matDef) return;

    // Check if player already has a stack of this material with same quality
    if (matDef.stackable) {
      for (const item of player.inventory) {
        const itemMaterialId = item.getProperty<string>('materialId');
        const itemQuality = item.getProperty<MaterialQuality>('quality');

        if (itemMaterialId === materialId && itemQuality === quality) {
          const currentQty = item.getProperty<number>('quantity') || 1;
          const newQty = Math.min(currentQty + quantity, matDef.maxStack);
          const added = newQty - currentQty;

          if (added > 0) {
            item.setProperty('quantity', newQty);
            player.receive(`{green}+${added} ${matDef.name}{/}\n`);
            quantity -= added;
            if (quantity <= 0) return;
          }
        }
      }
    }

    // Create new stack(s) if needed
    while (quantity > 0) {
      const stackSize = Math.min(quantity, matDef.stackable ? matDef.maxStack : 1);

      // Clone the base material item
      if (typeof efuns !== 'undefined' && efuns.cloneObject) {
        try {
          const item = await efuns.cloneObject('/std/profession/material-item');
          if (item) {
            // Configure the material item
            item.setProperty('materialId', materialId);
            item.setProperty('quantity', stackSize);
            item.setProperty('quality', quality);
            item.name = matDef.name.toLowerCase();
            item.shortDesc = this.formatMaterialDesc(matDef.name, stackSize, quality);
            item.longDesc = matDef.longDesc;
            item.setProperty('weight', matDef.weight * stackSize);
            item.setProperty('value', matDef.value * stackSize);
            item.ids = [materialId, matDef.name.toLowerCase(), ...matDef.name.toLowerCase().split(' ')];

            // Move to player inventory
            await item.moveTo(player as unknown as MudObject);
            player.receive(`{green}+${stackSize} ${matDef.name}{/}\n`);
          }
        } catch {
          // Fallback: just report the gain
          player.receive(`{green}You gathered ${stackSize} ${matDef.name}.{/}\n`);
        }
      } else {
        player.receive(`{green}You gathered ${stackSize} ${matDef.name}.{/}\n`);
      }

      quantity -= stackSize;
    }
  }

  /**
   * Format material description with quantity and quality.
   */
  private formatMaterialDesc(name: string, quantity: number, quality: MaterialQuality): string {
    const qualityPrefix = quality !== 'common' ? `${quality} ` : '';
    if (quantity > 1) {
      return `${quantity} ${qualityPrefix}${name}`;
    }
    const article = /^[aeiou]/i.test(qualityPrefix || name) ? 'an' : 'a';
    return `${article} ${qualityPrefix}${name}`;
  }

  /**
   * Get gathering profession for a node type keyword.
   */
  getProfessionForKeyword(keyword: string): ProfessionId | null {
    const lowerKeyword = keyword.toLowerCase();

    const keywordMap: Record<string, ProfessionId> = {
      ore: 'mining',
      vein: 'mining',
      deposit: 'mining',
      mine: 'mining',
      rock: 'mining',
      coal: 'mining',
      herb: 'herbalism',
      plant: 'herbalism',
      flower: 'herbalism',
      harvest: 'herbalism',
      tree: 'logging',
      log: 'logging',
      wood: 'logging',
      chop: 'logging',
      fish: 'fishing',
      fishing: 'fishing',
      pool: 'fishing',
      skin: 'skinning',
      corpse: 'skinning',
      hide: 'skinning',
    };

    for (const [key, profession] of Object.entries(keywordMap)) {
      if (lowerKeyword.includes(key)) {
        return profession;
      }
    }

    return null;
  }
}

export default GatheringDaemon;
