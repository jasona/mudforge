/**
 * Behavior Daemon
 *
 * Orchestrates NPC AI by evaluating situations and executing appropriate actions.
 * Called from NPC heartbeat when in combat with behavior configured.
 */

import { MudObject } from '../std/object.js';
import type { NPC } from '../std/npc.js';
import type { Living } from '../std/living.js';
import type { Room } from '../std/room.js';
import {
  type BehaviorConfig,
  type BehaviorResult,
  type ActionCandidate,
} from '../std/behavior/types.js';
import { buildCombatContext, evaluateActions, getBestAction } from '../std/behavior/evaluator.js';
import { getGuildDaemon } from './guild.js';
import { getCombatDaemon } from './combat.js';
import { capitalizeName } from '../lib/text-utils.js';

/**
 * Behavior Daemon class.
 */
export class BehaviorDaemon extends MudObject {
  constructor() {
    super();
    this.shortDesc = 'Behavior Daemon';
    this.longDesc = 'The behavior daemon manages NPC AI and decision making.';
  }

  /**
   * Execute the best action for an NPC based on their behavior configuration.
   * Called each combat round from NPC heartbeat.
   *
   * @param npc The NPC to act for
   * @returns Result of the action execution
   */
  async executeAction(npc: NPC): Promise<BehaviorResult> {
    // Get behavior config
    const config = npc.getBehaviorConfig();
    if (!config) {
      return { executed: false, message: 'No behavior config' };
    }

    // Build combat context
    const context = buildCombatContext(npc, config);

    // Evaluate all possible actions
    const candidates = evaluateActions(context, config);

    // Get the best action
    const bestAction = getBestAction(candidates);

    if (!bestAction) {
      return { executed: false, message: 'No valid actions' };
    }

    // Execute the action
    return this.performAction(npc, bestAction, context);
  }

  /**
   * Perform a specific action.
   */
  private async performAction(
    npc: NPC,
    action: ActionCandidate,
    context: { enemies: Living[]; currentTarget: Living | null }
  ): Promise<BehaviorResult> {
    switch (action.type) {
      case 'flee':
        return this.performFlee(npc);

      case 'skill':
        return this.performSkill(npc, action);

      case 'attack':
        return this.performAttack(npc, action, context);

      case 'idle':
      default:
        return { executed: false, message: 'Idle' };
    }
  }

  /**
   * Perform flee action.
   */
  private async performFlee(npc: NPC): Promise<BehaviorResult> {
    const combatDaemon = getCombatDaemon();

    // Try to flee in a random direction
    const result = combatDaemon.attemptFlee(npc);

    if (result) {
      return {
        executed: true,
        action: { type: 'flee', score: 100, reason: 'Fleeing combat' },
        message: 'Fled from combat',
      };
    }

    return {
      executed: false,
      message: 'Failed to flee',
    };
  }

  /**
   * Perform skill action.
   */
  private async performSkill(npc: NPC, action: ActionCandidate): Promise<BehaviorResult> {
    if (!action.skillId) {
      return { executed: false, message: 'No skill ID' };
    }

    const guildDaemon = getGuildDaemon();

    // Find the target
    let target: Living | undefined;
    if (action.targetId) {
      target = this.findLivingById(npc, action.targetId);
    }

    // Execute the skill
    const result = guildDaemon.useSkill(npc as never, action.skillId, target);

    if (result.success) {
      // Broadcast skill use to the room
      const room = npc.environment as Room | null;
      if (room && 'broadcast' in room) {
        const broadcast = (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void }).broadcast.bind(room);

        // Build a third-person message for the room (capitalize names)
        const npcName = capitalizeName(npc.shortDesc || npc.name);
        const targetName = target ? capitalizeName(target.name || target.shortDesc) : null;
        const skillDef = guildDaemon.getSkill(action.skillId);
        const skillName = skillDef?.name || action.skillId;

        // Create room message based on skill type (with newlines for visibility)
        let roomMessage: string;
        if (result.healing) {
          if (target && target !== npc) {
            roomMessage = `\n{cyan}${npcName} casts ${skillName} on ${targetName}, healing them!{/}\n`;
          } else {
            roomMessage = `\n{cyan}${npcName} casts ${skillName}, healing themselves!{/}\n`;
          }
        } else if (result.damage) {
          roomMessage = `\n{red}${npcName} casts ${skillName} on ${targetName}!{/}\n`;
        } else {
          // Buff or other skill
          if (target && target !== npc) {
            roomMessage = `\n{yellow}${npcName} casts ${skillName} on ${targetName}.{/}\n`;
          } else {
            roomMessage = `\n{yellow}${npcName} casts ${skillName}.{/}\n`;
          }
        }

        broadcast(roomMessage);

        // Also send a message to the target if it's a healing spell
        if (result.healing && target && target !== npc && 'receive' in target) {
          const targetWithReceive = target as Living & { receive: (msg: string) => void };
          // npcName is already capitalized above
          targetWithReceive.receive(`\n{green}${npcName} heals you for ${Math.round(result.healing)} HP!{/}\n`);
        }
      }

      return {
        executed: true,
        action,
        message: result.message,
      };
    }

    return {
      executed: false,
      message: result.message,
    };
  }

  /**
   * Perform basic attack action.
   */
  private async performAttack(
    npc: NPC,
    action: ActionCandidate,
    context: { enemies: Living[]; currentTarget: Living | null }
  ): Promise<BehaviorResult> {
    // Basic attacks are handled by the combat daemon's round execution
    // We just need to ensure we have a target

    if (!npc.combatTarget && action.targetId) {
      const target = this.findLivingById(npc, action.targetId);
      if (target) {
        const combatDaemon = getCombatDaemon();
        combatDaemon.initiateCombat(npc, target);
      }
    }

    // The actual attack will be executed by the combat round
    return {
      executed: true,
      action,
      message: 'Basic attack',
    };
  }

  /**
   * Find a living by objectId in the NPC's room.
   */
  private findLivingById(npc: NPC, objectId: string): Living | undefined {
    const room = npc.environment as Room | null;
    if (!room) return undefined;

    // Check if it's the NPC itself
    if (npc.objectId === objectId) {
      return npc as Living;
    }

    // Search room inventory
    for (const obj of room.inventory) {
      if ('isLiving' in obj && (obj as Living).isLiving) {
        if (obj.objectId === objectId) {
          return obj as Living;
        }
      }
    }

    return undefined;
  }
}

// Singleton instance
let behaviorDaemon: BehaviorDaemon | null = null;

/**
 * Get the BehaviorDaemon singleton.
 */
export function getBehaviorDaemon(): BehaviorDaemon {
  if (!behaviorDaemon) {
    behaviorDaemon = new BehaviorDaemon();
  }
  return behaviorDaemon;
}

/**
 * Reset the behavior daemon (for testing).
 */
export function resetBehaviorDaemon(): void {
  behaviorDaemon = null;
}

export default BehaviorDaemon;
