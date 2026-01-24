/**
 * Gather Command
 *
 * Gather resources from resource nodes in the current room.
 * Supports mining, herbalism, fishing, logging, and skinning.
 */

import type { CommandContext } from '../../std/command-context.js';
import { getGatheringDaemon } from '../../daemons/gathering.js';
import { getProfessionDaemon } from '../../daemons/profession.js';
import { ResourceNode } from '../../std/profession/resource-node.js';
import { PROFESSION_DEFINITIONS } from '../../std/profession/definitions.js';

export const name = ['gather', 'mine', 'harvest', 'fish', 'chop', 'skin'];
export const description = 'Gather resources from nodes in the current room';
export const usage = 'gather <node name> | gather | mine | harvest | fish | chop | skin [target]';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args, verb, sendLine, send } = ctx;
  const gatheringDaemon = getGatheringDaemon();
  const professionDaemon = getProfessionDaemon();

  const room = player.environment;
  if (!room) {
    sendLine('{red}You are not in a valid location.{/}');
    return;
  }

  // Get the target argument
  const target = args.trim().toLowerCase();

  // Find nodes in the room
  const roomContents = room.getProperty<MudObject[]>('contents') || [];
  const nodes: ResourceNode[] = [];

  for (const item of roomContents) {
    if (item instanceof ResourceNode) {
      nodes.push(item);
    }
  }

  // Also check registered nodes
  const registeredNodes = gatheringDaemon.getNodesInRoom(room.objectPath);
  for (const node of registeredNodes) {
    if (!nodes.includes(node)) {
      nodes.push(node);
    }
  }

  // Filter out hidden nodes that player hasn't discovered
  const visibleNodes = nodes.filter((node) => {
    if (!node.isHidden) return true;
    const nodeDef = node.definition;
    if (!nodeDef) return false;
    return professionDaemon.hasDiscoveredNode(player, nodeDef.id);
  });

  // If no target specified, list available nodes
  if (!target && verb === 'gather') {
    if (visibleNodes.length === 0) {
      sendLine('There is nothing to gather here.');

      // Check for hidden nodes the player might be able to discover
      const hiddenNodes = nodes.filter((n) => n.isHidden);
      if (hiddenNodes.length > 0) {
        const highestSkill = getHighestGatheringSkill(player, hiddenNodes);
        if (highestSkill) {
          sendLine(`{dim}(You sense there might be hidden resources here. Train your ${highestSkill} skill to discover them.){/}`);
        }
      }

      return;
    }

    sendLine('{bold}Available resources:{/}');
    for (const node of visibleNodes) {
      const nodeDef = node.definition;
      if (!nodeDef) continue;

      const profession = PROFESSION_DEFINITIONS[nodeDef.gatherProfession];
      const skill = professionDaemon.getPlayerSkill(player, nodeDef.gatherProfession);
      const canGather = skill.level >= nodeDef.levelRequired;
      const levelColor = canGather ? 'green' : 'red';

      sendLine(`  ${node.shortDesc} ${node.getStateDescription()}`);
      sendLine(`    {dim}${profession.name} [${levelColor}${nodeDef.levelRequired}{/}]{/}`);
    }

    sendLine('');
    sendLine('{dim}Use "gather <name>" to gather from a specific resource.{/}');
    return;
  }

  // Determine which profession/node based on verb or target
  let targetNode: ResourceNode | null = null;

  // Map verbs to professions
  const verbProfessionMap: Record<string, string> = {
    mine: 'mining',
    harvest: 'herbalism',
    fish: 'fishing',
    chop: 'logging',
    skin: 'skinning',
  };

  if (verb !== 'gather' && verbProfessionMap[verb]) {
    // Find a node matching this profession
    const professionId = verbProfessionMap[verb];

    for (const node of visibleNodes) {
      const nodeDef = node.definition;
      if (nodeDef?.gatherProfession === professionId) {
        // If target specified, check if it matches
        if (target) {
          if (
            node.name.toLowerCase().includes(target) ||
            node.ids?.some((id) => id.toLowerCase().includes(target))
          ) {
            targetNode = node;
            break;
          }
        } else {
          // Use first matching node
          targetNode = node;
          break;
        }
      }
    }

    if (!targetNode) {
      const professionName = PROFESSION_DEFINITIONS[professionId as keyof typeof PROFESSION_DEFINITIONS]?.name || professionId;
      sendLine(`There is nothing here to ${verb} for ${professionName}.`);
      return;
    }
  } else if (target) {
    // Find node by target name
    targetNode = gatheringDaemon.findNode(room, target);

    if (!targetNode) {
      // Also search visible nodes
      for (const node of visibleNodes) {
        if (
          node.name.toLowerCase().includes(target) ||
          node.ids?.some((id) => id.toLowerCase().includes(target))
        ) {
          targetNode = node;
          break;
        }
      }
    }

    if (!targetNode) {
      sendLine(`You don't see any "${target}" here to gather.`);
      return;
    }
  } else {
    // No target and generic gather - pick first available
    if (visibleNodes.length === 0) {
      sendLine('There is nothing to gather here.');
      return;
    }

    targetNode = visibleNodes[0];
  }

  // Check if node is depleted
  if (targetNode.isDepleted) {
    sendLine(`The ${targetNode.shortDesc} is exhausted. Try again later.`);
    return;
  }

  // Show gathering message
  const nodeDef = targetNode.definition;
  if (nodeDef) {
    const profession = PROFESSION_DEFINITIONS[nodeDef.gatherProfession];
    send(`You begin ${getGatheringVerb(nodeDef.gatherProfession)} ${targetNode.shortDesc}...`);

    // Small delay for flavor (non-blocking)
    await new Promise((resolve) => setTimeout(resolve, 500));
    send('\n');
  }

  // Attempt the gather
  const result = await gatheringDaemon.attemptGather(player, targetNode);

  if (result.success) {
    sendLine(result.message);

    if (result.critical) {
      sendLine('{yellow}Critical success!{/}');
    }
  } else {
    sendLine(`{red}${result.message}{/}`);
  }
}

/**
 * Get the verb to use for a gathering profession.
 */
function getGatheringVerb(professionId: string): string {
  const verbs: Record<string, string> = {
    mining: 'mining',
    herbalism: 'harvesting',
    fishing: 'fishing',
    logging: 'chopping',
    skinning: 'skinning',
  };
  return verbs[professionId] || 'gathering from';
}

/**
 * Get the highest gathering skill among hidden nodes.
 */
function getHighestGatheringSkill(player: { getStat: (stat: string) => number }, hiddenNodes: ResourceNode[]): string | null {
  // Import here to avoid circular dependency issues
  const professionDaemon = getProfessionDaemon();

  let highestLevel = 0;
  let highestProfession: string | null = null;

  for (const node of hiddenNodes) {
    const nodeDef = node.definition;
    if (!nodeDef) continue;

    const skill = professionDaemon.getPlayerSkill(player as any, nodeDef.gatherProfession);
    const discoverLevel = nodeDef.discoverLevel || nodeDef.levelRequired;

    // Check if player is close to discovering
    if (skill.level >= discoverLevel - 10 && skill.level > highestLevel) {
      highestLevel = skill.level;
      highestProfession = PROFESSION_DEFINITIONS[nodeDef.gatherProfession].name;
    }
  }

  return highestProfession;
}

// Import MudObject type
import type { MudObject } from '../../std/object.js';

export default { name, description, usage, execute };
