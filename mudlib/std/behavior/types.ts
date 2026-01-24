/**
 * Behavior System Types
 *
 * Core interfaces and types for the NPC behavior/AI system.
 * This system allows NPCs to make intelligent combat decisions
 * based on their assigned guild/class and behavior mode.
 */

import type { GuildId, SkillDefinition } from '../guild/types.js';
import type { Living } from '../living.js';
import type { NPC } from '../npc.js';

/**
 * Behavior modes that control risk tolerance and playstyle.
 */
export type BehaviorMode = 'aggressive' | 'defensive' | 'wimpy';

/**
 * Combat roles that determine AI priorities.
 */
export type CombatRole = 'tank' | 'healer' | 'dps_melee' | 'dps_ranged' | 'generic';

/**
 * Types of actions the AI can take.
 */
export type ActionType = 'attack' | 'skill' | 'flee' | 'idle';

/**
 * Guild to combat role mapping.
 */
export const GUILD_ROLE_MAP: Record<GuildId, CombatRole> = {
  fighter: 'tank',
  cleric: 'healer',
  mage: 'dps_ranged',
  thief: 'dps_melee',
};

/**
 * Default behavior configuration values.
 */
export const BEHAVIOR_DEFAULTS = {
  wimpyThreshold: 20,
  healSelfThreshold: 50,
  healAllyThreshold: 40,
  criticalAllyThreshold: 25,
  criticalSelfThreshold: 25,
  willTaunt: true,
  willHealAllies: true,
  willBuffAllies: true,
  willDebuffEnemies: true,
};

/**
 * Flee thresholds for each behavior mode.
 */
export const FLEE_THRESHOLDS: Record<BehaviorMode, number> = {
  aggressive: 0,    // Never flee
  defensive: 10,    // Flee at 10% HP
  wimpy: 20,        // Flee at 20% HP
};

/**
 * Configuration for NPC behavior.
 */
export interface BehaviorConfig {
  /** Behavior mode controlling risk tolerance */
  mode: BehaviorMode;
  /** Combat role determining AI priorities */
  role: CombatRole;
  /** Guild for skill access (optional, inferred from role if not set) */
  guild?: GuildId;

  // Thresholds (percentages)
  /** Health % to trigger flee in wimpy mode (default 20) */
  wimpyThreshold: number;
  /** Health % to trigger self-healing (default 50) */
  healSelfThreshold: number;
  /** Health % to trigger ally healing (default 40) */
  healAllyThreshold: number;
  /** Health % considered critical for ally (default 25) */
  criticalAllyThreshold: number;
  /** Health % considered critical for self (default 25) */
  criticalSelfThreshold: number;

  // Behavior flags
  /** Whether to use taunt abilities */
  willTaunt: boolean;
  /** Whether to heal allies */
  willHealAllies: boolean;
  /** Whether to buff allies */
  willBuffAllies: boolean;
  /** Whether to debuff enemies */
  willDebuffEnemies: boolean;
}

/**
 * Context for combat decision making.
 * Built fresh each combat round.
 */
export interface CombatContext {
  /** The NPC making decisions */
  self: NPC;
  /** Current health as percentage (0-100) */
  selfHealthPercent: number;
  /** Current mana as percentage (0-100) */
  selfManaPercent: number;
  /** Current combat target (may be null) */
  currentTarget: Living | null;
  /** Whether currently in combat */
  inCombat: boolean;
  /** All hostile entities in the room */
  enemies: Living[];
  /** All friendly entities in the room (party members) */
  allies: Living[];
  /** Allies that need healing (below threshold) */
  alliesNeedHealing: Living[];
  /** Allies in critical condition */
  criticalAllies: Living[];
  /** Skills available to use (not on cooldown, can afford) */
  availableSkills: SkillWithCooldown[];
  /** Buff skills that are not currently active */
  missingBuffs: string[];
  /** Whether any ally is being attacked by an enemy not taunted */
  allyBeingAttacked: boolean;
  /** The ally currently being attacked (if any) */
  attackedAlly: Living | null;
  /** The enemy attacking the ally (for taunt targeting) */
  allyAttacker: Living | null;
}

/**
 * Skill with cooldown and affordability info.
 */
export interface SkillWithCooldown {
  /** The skill ID */
  skillId: string;
  /** The skill definition */
  definition: SkillDefinition;
  /** Whether skill is currently on cooldown */
  isOnCooldown: boolean;
  /** Whether NPC has enough mana */
  canAfford: boolean;
  /** Current skill level */
  level: number;
}

/**
 * Candidate action to be scored.
 */
export interface ActionCandidate {
  /** Type of action */
  type: ActionType;
  /** Skill ID if using a skill */
  skillId?: string;
  /** Target object ID if targeting something */
  targetId?: string;
  /** Score from 0-100, higher = better choice */
  score: number;
  /** Reason for this action (for debugging) */
  reason: string;
}

/**
 * Result of behavior execution.
 */
export interface BehaviorResult {
  /** Whether an action was executed */
  executed: boolean;
  /** The action that was taken */
  action?: ActionCandidate;
  /** Message describing what happened */
  message?: string;
}
