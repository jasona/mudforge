/**
 * Behavior Evaluator
 *
 * Scores and evaluates potential actions for NPCs based on their
 * combat role, behavior mode, and current situation.
 */

import type { Living } from '../living.js';
import type { NPC } from '../npc.js';
import type { Room } from '../room.js';
import type { SkillDefinition } from '../guild/types.js';
import {
  type BehaviorConfig,
  type CombatContext,
  type ActionCandidate,
  type SkillWithCooldown,
  FLEE_THRESHOLDS,
} from './types.js';
import { getGuildDaemon } from '../../daemons/guild.js';

/**
 * Build the combat context for an NPC.
 * Gathers all relevant information about the current situation.
 */
export function buildCombatContext(npc: NPC, config: BehaviorConfig): CombatContext {
  const room = npc.environment as Room | null;
  const selfHealthPercent = npc.healthPercent;
  const selfManaPercent = npc.manaPercent;

  // Get all livings in the room
  const livingsInRoom: Living[] = [];
  if (room) {
    for (const obj of room.inventory) {
      if ('isLiving' in obj && (obj as Living).isLiving && obj !== npc) {
        livingsInRoom.push(obj as Living);
      }
    }
  }

  // Categorize as enemies or allies
  // For now: enemies = anyone on NPC's threat table, allies = party members
  const enemies: Living[] = [];
  const allies: Living[] = [];

  const threatTable = npc.getThreatTable();

  for (const living of livingsInRoom) {
    if (!living.alive) continue;

    // Check if this living is on our threat table
    if (threatTable.has(living.objectId)) {
      enemies.push(living);
    } else {
      // Check if in same party (allies)
      const npcParty = npc.getProperty?.('partyId') as string | undefined;
      const livingParty = (living as Living & { getProperty?: (key: string) => unknown })
        .getProperty?.('partyId') as string | undefined;

      if (npcParty && livingParty && npcParty === livingParty) {
        allies.push(living);
      }
    }
  }

  // Find allies that need healing
  const alliesNeedHealing: Living[] = [];
  const criticalAllies: Living[] = [];

  for (const ally of allies) {
    const allyHealth = ally.healthPercent;
    if (allyHealth < config.criticalAllyThreshold) {
      criticalAllies.push(ally);
      alliesNeedHealing.push(ally);
    } else if (allyHealth < config.healAllyThreshold) {
      alliesNeedHealing.push(ally);
    }
  }

  // Check if any ally is being attacked
  let allyBeingAttacked = false;
  let attackedAlly: Living | null = null;
  let allyAttacker: Living | null = null;

  for (const ally of allies) {
    // Check if any enemy is targeting this ally
    for (const enemy of enemies) {
      if (enemy.combatTarget === ally) {
        // Check if the enemy is taunted by us
        const npcInstance = npc as NPC & { isTauntedBy?: (source: Living) => boolean };
        const enemyNpc = enemy as Living & { isTauntedBy?: (source: Living) => boolean };
        const isTauntedByUs = typeof enemyNpc.isTauntedBy === 'function'
          && enemyNpc.isTauntedBy(npc);

        if (!isTauntedByUs) {
          allyBeingAttacked = true;
          attackedAlly = ally;
          allyAttacker = enemy;
          break;
        }
      }
    }
    if (allyBeingAttacked) break;
  }

  // Get available skills
  const availableSkills = getAvailableSkills(npc, config);

  // Check for missing buffs (buffs we can cast that aren't active)
  const missingBuffs = getMissingBuffs(npc, availableSkills);

  return {
    self: npc,
    selfHealthPercent,
    selfManaPercent,
    currentTarget: npc.combatTarget,
    inCombat: npc.inCombat,
    enemies,
    allies,
    alliesNeedHealing,
    criticalAllies,
    availableSkills,
    missingBuffs,
    allyBeingAttacked,
    attackedAlly,
    allyAttacker,
  };
}

/**
 * Get skills available to the NPC (learned, not on cooldown, can afford).
 */
function getAvailableSkills(npc: NPC, config: BehaviorConfig): SkillWithCooldown[] {
  const guildDaemon = getGuildDaemon();
  const result: SkillWithCooldown[] = [];

  // Get NPC's guild data
  const guildData = npc.getProperty?.('guildData') as {
    skills?: Array<{ skillId: string; level: number }>;
  } | undefined;

  if (!guildData?.skills) {
    return result;
  }

  for (const playerSkill of guildData.skills) {
    const skillDef = guildDaemon.getSkill(playerSkill.skillId);
    if (!skillDef) continue;

    // Skip passive skills - they're always active
    if (skillDef.type === 'passive') continue;

    const isOnCooldown = guildDaemon.isOnCooldown(npc as never, playerSkill.skillId);
    const canAfford = npc.hasMana(skillDef.manaCost);

    result.push({
      skillId: playerSkill.skillId,
      definition: skillDef,
      isOnCooldown,
      canAfford,
      level: playerSkill.level,
    });
  }

  return result;
}

/**
 * Get buff skills that are not currently active on the NPC.
 */
function getMissingBuffs(npc: NPC, availableSkills: SkillWithCooldown[]): string[] {
  const missingBuffs: string[] = [];

  for (const skill of availableSkills) {
    if (skill.definition.type !== 'buff') continue;
    if (skill.definition.target !== 'self') continue;

    // Check if this buff is currently active
    const effectId = `skill_${skill.skillId}`;
    if (!npc.hasEffect(effectId)) {
      missingBuffs.push(skill.skillId);
    }
  }

  return missingBuffs;
}

/**
 * Get the best action candidate from a list.
 */
export function getBestAction(candidates: ActionCandidate[]): ActionCandidate | null {
  if (candidates.length === 0) return null;

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Return highest scored action
  return candidates[0];
}

/**
 * Evaluate all possible actions for an NPC based on their role.
 */
export function evaluateActions(
  context: CombatContext,
  config: BehaviorConfig
): ActionCandidate[] {
  const candidates: ActionCandidate[] = [];

  // Check flee first (always evaluated)
  const fleeCandidate = evaluateFlee(context, config);
  if (fleeCandidate) {
    candidates.push(fleeCandidate);
  }

  // Role-specific evaluation
  switch (config.role) {
    case 'healer':
      candidates.push(...evaluateHealerActions(context, config));
      break;
    case 'tank':
      candidates.push(...evaluateTankActions(context, config));
      break;
    case 'dps_ranged':
      candidates.push(...evaluateDPSRangedActions(context, config));
      break;
    case 'dps_melee':
      candidates.push(...evaluateDPSMeleeActions(context, config));
      break;
    case 'generic':
    default:
      candidates.push(...evaluateGenericActions(context, config));
      break;
  }

  // Always add basic attack as fallback
  if (context.currentTarget && context.inCombat) {
    candidates.push({
      type: 'attack',
      targetId: context.currentTarget.objectId,
      score: 10,
      reason: 'Basic attack fallback',
    });
  }

  return candidates;
}

/**
 * Evaluate flee action.
 */
function evaluateFlee(context: CombatContext, config: BehaviorConfig): ActionCandidate | null {
  const fleeThreshold = FLEE_THRESHOLDS[config.mode];

  // No flee in aggressive mode
  if (fleeThreshold <= 0) return null;

  // Check if health is below flee threshold
  if (context.selfHealthPercent <= fleeThreshold) {
    return {
      type: 'flee',
      score: 100, // Highest priority
      reason: `Health at ${context.selfHealthPercent}%, below ${fleeThreshold}% flee threshold`,
    };
  }

  return null;
}

/**
 * Evaluate actions for healer role (Cleric).
 * Priority: Self-heal > Critical ally > Heal > Group heal > Buff > Damage
 */
function evaluateHealerActions(
  context: CombatContext,
  config: BehaviorConfig
): ActionCandidate[] {
  const candidates: ActionCandidate[] = [];

  // Find healing skills
  const healSkill = findSkillByType(context.availableSkills, 'combat', true);
  const groupHealSkill = findSkillByIdPattern(context.availableSkills, 'group_heal');
  const blessSkill = findSkillByIdPattern(context.availableSkills, 'bless');
  const divineShieldSkill = findSkillByIdPattern(context.availableSkills, 'divine_shield');
  const damageSkill = findSkillByType(context.availableSkills, 'combat', false);

  // Self critical - highest priority
  if (context.selfHealthPercent < config.criticalSelfThreshold && healSkill) {
    if (!healSkill.isOnCooldown && healSkill.canAfford) {
      candidates.push({
        type: 'skill',
        skillId: healSkill.skillId,
        targetId: context.self.objectId,
        score: 95,
        reason: `Self critical at ${context.selfHealthPercent}%`,
      });
    }
  }

  // Critical ally - very high priority
  if (config.willHealAllies && context.criticalAllies.length > 0 && healSkill) {
    if (!healSkill.isOnCooldown && healSkill.canAfford) {
      const critAlly = context.criticalAllies[0];
      candidates.push({
        type: 'skill',
        skillId: healSkill.skillId,
        targetId: critAlly.objectId,
        score: 90,
        reason: `Critical ally ${critAlly.name} at ${critAlly.healthPercent}%`,
      });
    }
  }

  // Self low - high priority
  if (context.selfHealthPercent < config.healSelfThreshold && healSkill) {
    if (!healSkill.isOnCooldown && healSkill.canAfford) {
      candidates.push({
        type: 'skill',
        skillId: healSkill.skillId,
        targetId: context.self.objectId,
        score: 80,
        reason: `Self low at ${context.selfHealthPercent}%`,
      });
    }
  }

  // Ally low - medium-high priority
  if (config.willHealAllies && context.alliesNeedHealing.length > 0 && healSkill) {
    if (!healSkill.isOnCooldown && healSkill.canAfford) {
      const ally = context.alliesNeedHealing[0];
      candidates.push({
        type: 'skill',
        skillId: healSkill.skillId,
        targetId: ally.objectId,
        score: 70,
        reason: `Ally ${ally.name} needs healing at ${ally.healthPercent}%`,
      });
    }
  }

  // Group heal if multiple allies hurt
  if (config.willHealAllies && context.alliesNeedHealing.length >= 2 && groupHealSkill) {
    if (!groupHealSkill.isOnCooldown && groupHealSkill.canAfford) {
      candidates.push({
        type: 'skill',
        skillId: groupHealSkill.skillId,
        score: 65,
        reason: `${context.alliesNeedHealing.length} allies need healing`,
      });
    }
  }

  // Self buff (divine shield)
  if (context.missingBuffs.includes(divineShieldSkill?.skillId || '')) {
    if (divineShieldSkill && !divineShieldSkill.isOnCooldown && divineShieldSkill.canAfford) {
      candidates.push({
        type: 'skill',
        skillId: divineShieldSkill.skillId,
        targetId: context.self.objectId,
        score: 55,
        reason: 'Divine shield not active',
      });
    }
  }

  // Buff allies (bless)
  if (config.willBuffAllies && blessSkill && context.allies.length > 0) {
    if (!blessSkill.isOnCooldown && blessSkill.canAfford) {
      // Find an ally without the buff
      for (const ally of context.allies) {
        const effectId = `skill_${blessSkill.skillId}`;
        if (!ally.hasEffect(effectId)) {
          candidates.push({
            type: 'skill',
            skillId: blessSkill.skillId,
            targetId: ally.objectId,
            score: 50,
            reason: `Ally ${ally.name} needs blessing`,
          });
          break;
        }
      }
    }
  }

  // Damage skill if enemies present
  if (context.enemies.length > 0 && damageSkill) {
    if (!damageSkill.isOnCooldown && damageSkill.canAfford) {
      const target = context.currentTarget || context.enemies[0];
      candidates.push({
        type: 'skill',
        skillId: damageSkill.skillId,
        targetId: target.objectId,
        score: 40,
        reason: 'Offensive action',
      });
    }
  }

  return candidates;
}

/**
 * Evaluate actions for tank role (Fighter).
 * Priority: Taunt ally attacker > Defensive stance > Shield wall > Damage
 */
function evaluateTankActions(
  context: CombatContext,
  config: BehaviorConfig
): ActionCandidate[] {
  const candidates: ActionCandidate[] = [];

  // Find tank skills
  const tauntSkill = findSkillByIdPattern(context.availableSkills, 'taunt');
  const defensiveStanceSkill = findSkillByIdPattern(context.availableSkills, 'defensive_stance');
  const shieldWallSkill = findSkillByIdPattern(context.availableSkills, 'shield_wall');
  const powerAttackSkill = findSkillByIdPattern(context.availableSkills, 'power_attack');
  const cleaveSkill = findSkillByIdPattern(context.availableSkills, 'cleave');
  const bashSkill = findSkillByIdPattern(context.availableSkills, 'bash');

  // Taunt enemy attacking ally - highest priority
  if (config.willTaunt && context.allyBeingAttacked && context.allyAttacker && tauntSkill) {
    if (!tauntSkill.isOnCooldown && tauntSkill.canAfford) {
      candidates.push({
        type: 'skill',
        skillId: tauntSkill.skillId,
        targetId: context.allyAttacker.objectId,
        score: 95,
        reason: `Ally ${context.attackedAlly?.name} being attacked by ${context.allyAttacker.name}`,
      });
    }
  }

  // Defensive stance if not active
  if (context.missingBuffs.includes(defensiveStanceSkill?.skillId || '')) {
    if (defensiveStanceSkill && !defensiveStanceSkill.isOnCooldown && defensiveStanceSkill.canAfford) {
      candidates.push({
        type: 'skill',
        skillId: defensiveStanceSkill.skillId,
        score: 80,
        reason: 'Defensive stance not active',
      });
    }
  }

  // Shield wall when taking damage
  if (context.selfHealthPercent < 70 && shieldWallSkill) {
    if (!shieldWallSkill.isOnCooldown && shieldWallSkill.canAfford) {
      if (!context.self.hasEffect(`skill_${shieldWallSkill.skillId}`)) {
        candidates.push({
          type: 'skill',
          skillId: shieldWallSkill.skillId,
          score: 70,
          reason: `Health at ${context.selfHealthPercent}%, using shield wall`,
        });
      }
    }
  }

  // Cleave if multiple enemies
  if (context.enemies.length >= 2 && cleaveSkill) {
    if (!cleaveSkill.isOnCooldown && cleaveSkill.canAfford) {
      candidates.push({
        type: 'skill',
        skillId: cleaveSkill.skillId,
        score: 60,
        reason: `${context.enemies.length} enemies present`,
      });
    }
  }

  // Power attack or bash for single target
  const singleTargetSkill = powerAttackSkill || bashSkill;
  if (context.currentTarget && singleTargetSkill) {
    if (!singleTargetSkill.isOnCooldown && singleTargetSkill.canAfford) {
      candidates.push({
        type: 'skill',
        skillId: singleTargetSkill.skillId,
        targetId: context.currentTarget.objectId,
        score: 50,
        reason: 'Single target damage',
      });
    }
  }

  return candidates;
}

/**
 * Evaluate actions for ranged DPS role (Mage).
 * Priority: Buff self > AoE damage > Single target damage
 */
function evaluateDPSRangedActions(
  context: CombatContext,
  config: BehaviorConfig
): ActionCandidate[] {
  const candidates: ActionCandidate[] = [];

  // Find mage skills
  const frostArmorSkill = findSkillByIdPattern(context.availableSkills, 'frost_armor');
  const manaShieldSkill = findSkillByIdPattern(context.availableSkills, 'mana_shield');
  const fireballSkill = findSkillByIdPattern(context.availableSkills, 'fireball');
  const meteorStormSkill = findSkillByIdPattern(context.availableSkills, 'meteor_storm');
  const lightningSkill = findSkillByIdPattern(context.availableSkills, 'lightning');
  const fireBoltSkill = findSkillByIdPattern(context.availableSkills, 'fire_bolt');
  const magicMissileSkill = findSkillByIdPattern(context.availableSkills, 'magic_missile');

  // Self buffs first
  const selfBuffs = [frostArmorSkill, manaShieldSkill].filter(Boolean);
  for (const buff of selfBuffs) {
    if (buff && context.missingBuffs.includes(buff.skillId)) {
      if (!buff.isOnCooldown && buff.canAfford) {
        candidates.push({
          type: 'skill',
          skillId: buff.skillId,
          score: 85,
          reason: `${buff.definition.name} not active`,
        });
      }
    }
  }

  // AoE damage if multiple enemies
  if (context.enemies.length >= 2) {
    const aoeSkill = meteorStormSkill || fireballSkill;
    if (aoeSkill && !aoeSkill.isOnCooldown && aoeSkill.canAfford) {
      candidates.push({
        type: 'skill',
        skillId: aoeSkill.skillId,
        score: 75,
        reason: `${context.enemies.length} enemies, using AoE`,
      });
    }
  }

  // Single target damage
  const singleTargetSkills = [lightningSkill, fireBoltSkill, magicMissileSkill].filter(Boolean);
  for (const skill of singleTargetSkills) {
    if (skill && !skill.isOnCooldown && skill.canAfford && context.currentTarget) {
      candidates.push({
        type: 'skill',
        skillId: skill.skillId,
        targetId: context.currentTarget.objectId,
        score: 60 - singleTargetSkills.indexOf(skill) * 5, // Prioritize higher damage skills
        reason: `Single target damage with ${skill.definition.name}`,
      });
    }
  }

  return candidates;
}

/**
 * Evaluate actions for melee DPS role (Thief).
 * Priority: Stealth > Backstab > Debuff > Damage
 */
function evaluateDPSMeleeActions(
  context: CombatContext,
  config: BehaviorConfig
): ActionCandidate[] {
  const candidates: ActionCandidate[] = [];

  // Find thief skills
  const hideSkill = findSkillByIdPattern(context.availableSkills, 'hide');
  const backstabSkill = findSkillByIdPattern(context.availableSkills, 'backstab');
  const assassinateSkill = findSkillByIdPattern(context.availableSkills, 'assassinate');
  const poisonBladeSkill = findSkillByIdPattern(context.availableSkills, 'poison_blade');

  // Check if hidden
  const isHidden = context.self.hasEffect('skill_thief:hide') ||
                   context.self.hasEffect('skill_thief:sneak');

  // If hidden and have backstab/assassinate, use it
  if (isHidden && context.currentTarget) {
    const strikeSkill = assassinateSkill || backstabSkill;
    if (strikeSkill && !strikeSkill.isOnCooldown && strikeSkill.canAfford) {
      candidates.push({
        type: 'skill',
        skillId: strikeSkill.skillId,
        targetId: context.currentTarget.objectId,
        score: 90,
        reason: 'Strike from stealth',
      });
    }
  }

  // Try to hide if not in combat (or early in combat)
  if (!isHidden && hideSkill && !hideSkill.isOnCooldown && hideSkill.canAfford) {
    // Only hide if we have a stealth attack to follow up
    if (backstabSkill || assassinateSkill) {
      candidates.push({
        type: 'skill',
        skillId: hideSkill.skillId,
        score: 80,
        reason: 'Enter stealth for backstab',
      });
    }
  }

  // Apply poison blade if not active
  if (poisonBladeSkill && context.missingBuffs.includes(poisonBladeSkill.skillId)) {
    if (!poisonBladeSkill.isOnCooldown && poisonBladeSkill.canAfford) {
      candidates.push({
        type: 'skill',
        skillId: poisonBladeSkill.skillId,
        score: 70,
        reason: 'Poison blade not active',
      });
    }
  }

  // Basic backstab if not hidden
  if (!isHidden && backstabSkill && context.currentTarget) {
    if (!backstabSkill.isOnCooldown && backstabSkill.canAfford) {
      candidates.push({
        type: 'skill',
        skillId: backstabSkill.skillId,
        targetId: context.currentTarget.objectId,
        score: 50,
        reason: 'Backstab (not from stealth)',
      });
    }
  }

  return candidates;
}

/**
 * Evaluate actions for generic role (no guild).
 * Simple priority: Attack with any available skill or basic attack.
 */
function evaluateGenericActions(
  context: CombatContext,
  _config: BehaviorConfig
): ActionCandidate[] {
  const candidates: ActionCandidate[] = [];

  // Find any combat skill
  const combatSkill = context.availableSkills.find(
    s => s.definition.type === 'combat' && !s.isOnCooldown && s.canAfford
  );

  if (combatSkill && context.currentTarget) {
    candidates.push({
      type: 'skill',
      skillId: combatSkill.skillId,
      targetId: context.currentTarget.objectId,
      score: 50,
      reason: 'Generic combat skill',
    });
  }

  return candidates;
}

/**
 * Find a skill by type and optionally healing flag.
 */
function findSkillByType(
  skills: SkillWithCooldown[],
  type: string,
  healing?: boolean
): SkillWithCooldown | undefined {
  return skills.find(s => {
    if (s.definition.type !== type) return false;
    if (healing !== undefined && s.definition.effect.healing !== healing) return false;
    return true;
  });
}

/**
 * Find a skill by ID pattern (partial match).
 */
function findSkillByIdPattern(
  skills: SkillWithCooldown[],
  pattern: string
): SkillWithCooldown | undefined {
  return skills.find(s => s.skillId.includes(pattern));
}
