/**
 * Guild System Types
 *
 * Core interfaces and types for the multi-guild system.
 */

import type { StatName } from '../living.js';
import type { DamageType } from '../weapon.js';
import type { RaceId } from '../race/types.js';

/**
 * Guild identifiers for the four starter guilds.
 */
export type GuildId = 'fighter' | 'mage' | 'thief' | 'cleric';

/**
 * Skill types that determine behavior and categorization.
 */
export type SkillType = 'combat' | 'passive' | 'utility' | 'crafting' | 'buff' | 'debuff';

/**
 * Skill targeting modes.
 */
export type SkillTarget = 'self' | 'single' | 'room' | 'object' | 'none';

/**
 * Effect configuration for skills.
 */
export interface SkillEffect {
  /** Base damage/heal amount at skill level 1 */
  baseMagnitude: number;
  /** Additional magnitude per skill level */
  magnitudePerLevel: number;
  /** Damage type for combat skills */
  damageType?: DamageType;
  /** Whether this is a healing effect */
  healing?: boolean;
  /** Duration in milliseconds for buff/debuff effects */
  duration?: number;
  /** Stat to modify for stat-modifying skills */
  statModifier?: StatName;
  /** Combat stat to modify (toHit, toDodge, etc.) */
  combatStatModifier?: string;
  /** Whether effect can stack */
  stacks?: boolean;
  /** Maximum stacks */
  maxStacks?: number;
  /** Tick interval for DoT/HoT effects */
  tickInterval?: number;
  /** Custom effect handler name */
  customHandler?: string;
  /** Effect type for visibility system (stealth, invisibility, see_invisible, detect_hidden) */
  effectType?: string;
}

/**
 * Skill definition for guild abilities.
 */
export interface SkillDefinition {
  /** Unique skill ID in format "guild:skillname" */
  id: string;
  /** Display name */
  name: string;
  /** Description shown in skill info */
  description: string;
  /** Skill type */
  type: SkillType;
  /** Targeting mode */
  target: SkillTarget;
  /** Guild this skill belongs to */
  guild: GuildId;
  /** Guild level required to learn */
  guildLevelRequired: number;
  /** Mana cost to use (0 for passives) */
  manaCost: number;
  /** Cooldown in milliseconds (0 for passives) */
  cooldown: number;
  /** Maximum skill level (1-100) */
  maxLevel: number;
  /** Gold cost to learn initially */
  learnCost: number;
  /** XP cost per level to advance */
  advanceCostPerLevel: number;
  /** Prerequisite skill IDs */
  prerequisites?: string[];
  /** Effect configuration */
  effect: SkillEffect;
  /** Verb for skill use messages (e.g., "cast", "perform", "execute") */
  useVerb?: string;
  /** Message shown when skill is used */
  useMessage?: string;
  /** Message shown to room when skill is used */
  roomMessage?: string;
}

/**
 * Guild definition.
 */
export interface GuildDefinition {
  /** Unique guild ID */
  id: GuildId;
  /** Display name */
  name: string;
  /** Full description */
  description: string;
  /** Primary stats for this guild */
  primaryStats: StatName[];
  /** Stat requirements to join (minimum values) */
  statRequirements?: Partial<Record<StatName, number>>;
  /** Guilds that cannot be joined alongside this one */
  opposingGuilds?: GuildId[];
  /** Skills unlocked at each guild level */
  skillTree: { guildLevel: number; skills: string[] }[];
  /** Color for guild channel messages */
  channelColor?: string;
  /** Short motto or tagline */
  motto?: string;
  /** Path to guild hall room */
  guildHallPath?: string;
  /** Races that are allowed to join (if specified, only these can join) */
  allowedRaces?: RaceId[];
  /** Races that are forbidden from joining */
  forbiddenRaces?: RaceId[];
}

/**
 * Player's membership in a single guild.
 */
export interface PlayerGuildMembership {
  /** Guild ID */
  guildId: GuildId;
  /** Current guild level (1-20) */
  guildLevel: number;
  /** XP towards next guild level */
  guildXP: number;
  /** Timestamp when joined */
  joinedAt: number;
}

/**
 * Player's learned skill.
 */
export interface PlayerSkill {
  /** Skill ID */
  skillId: string;
  /** Current skill level (1-100) */
  level: number;
  /** XP invested in this skill (from manual advancement) */
  xpInvested: number;
  /** XP gained from using this skill */
  usageXP: number;
}

/**
 * Active skill cooldown.
 */
export interface SkillCooldown {
  /** Skill ID */
  skillId: string;
  /** Timestamp when cooldown expires */
  expiresAt: number;
}

/**
 * Complete guild data stored on a player.
 */
export interface PlayerGuildData {
  /** All guild memberships */
  guilds: PlayerGuildMembership[];
  /** All learned skills */
  skills: PlayerSkill[];
  /** Active cooldowns */
  cooldowns: SkillCooldown[];
}

/**
 * Result of attempting to join a guild.
 */
export interface JoinGuildResult {
  success: boolean;
  message: string;
  /** New guild membership data if successful */
  membership?: PlayerGuildMembership;
}

/**
 * Result of attempting to leave a guild.
 */
export interface LeaveGuildResult {
  success: boolean;
  message: string;
  /** Skills that were removed */
  removedSkills?: string[];
}

/**
 * Result of attempting to learn a skill.
 */
export interface LearnSkillResult {
  success: boolean;
  message: string;
  /** Gold spent if successful */
  goldSpent?: number;
}

/**
 * Result of attempting to advance a skill.
 */
export interface AdvanceSkillResult {
  success: boolean;
  message: string;
  /** New skill level if successful */
  newLevel?: number;
  /** XP spent if successful */
  xpSpent?: number;
}

/**
 * Result of attempting to use a skill.
 */
export interface UseSkillResult {
  success: boolean;
  message: string;
  /** Damage dealt if combat skill */
  damage?: number;
  /** Healing done if healing skill */
  healing?: number;
  /** Effect applied if buff/debuff */
  effectApplied?: string;
  /** Mana spent */
  manaSpent?: number;
  /** Guild XP granted from successful skill use */
  guildXPAwarded?: number;
}

/**
 * Result of attempting to advance guild level.
 */
export interface AdvanceGuildResult {
  success: boolean;
  message: string;
  /** New guild level if successful */
  newLevel?: number;
  /** XP spent if successful */
  xpSpent?: number;
  /** Skills now available to learn */
  newSkillsAvailable?: string[];
}

/**
 * Constants for the guild system.
 */
export const GUILD_CONSTANTS = {
  /** Maximum number of guilds a player can join */
  MAX_GUILDS: 3,
  /** Maximum guild level */
  MAX_GUILD_LEVEL: 20,
  /** Maximum skill level */
  MAX_SKILL_LEVEL: 100,
  /** Base XP multiplier for guild level advancement */
  GUILD_XP_MULTIPLIER: 500,
} as const;

/**
 * Calculate XP required to advance to the next guild level.
 * Formula: (currentLevel + 1)^2 * 500
 */
export function getGuildXPRequired(currentLevel: number): number {
  return Math.pow(currentLevel + 1, 2) * GUILD_CONSTANTS.GUILD_XP_MULTIPLIER;
}

/**
 * Calculate XP required to advance a skill to the next level (manual advancement).
 * @param currentLevel Current skill level
 * @param costPerLevel Base cost per level from skill definition
 */
export function getSkillXPRequired(currentLevel: number, costPerLevel: number): number {
  return currentLevel * costPerLevel;
}

/**
 * Calculate usage XP required for a skill to auto-level through use.
 * Uses the same formula as manual advancement for consistency.
 * @param currentLevel Current skill level
 * @param costPerLevel Base cost per level from skill definition
 */
export function getSkillUsageXPRequired(currentLevel: number, costPerLevel: number): number {
  return currentLevel * costPerLevel;
}

/**
 * Calculate diminished usage XP based on skill level.
 * At level 1: 100%, at level 50: ~50%, at level 100: ~33%
 * @param baseXP Base XP amount before diminishing
 * @param skillLevel Current skill level
 */
export function calculateSkillUsageXP(baseXP: number, skillLevel: number): number {
  const levelPenalty = 1 / (1 + (skillLevel - 1) * 0.02);
  return Math.max(1, Math.ceil(baseXP * levelPenalty));
}

// Re-export for convenience
export type { StatName, DamageType };
