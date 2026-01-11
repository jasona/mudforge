/**
 * Guild Daemon - Manages the multi-guild system.
 *
 * Provides guild membership, skill learning, skill execution,
 * guild advancement, and guild channels integration.
 *
 * Usage:
 *   const daemon = getGuildDaemon();
 *   daemon.joinGuild(player, 'fighter');
 *   daemon.learnSkill(player, 'fighter:bash');
 *   daemon.useSkill(player, 'fighter:bash', target);
 */

import { MudObject } from '../lib/std.js';
import type { Living } from '../std/living.js';
import { getChannelDaemon } from './channels.js';
import {
  type GuildId,
  type GuildDefinition,
  type SkillDefinition,
  type PlayerGuildData,
  type PlayerGuildMembership,
  type PlayerSkill,
  type JoinGuildResult,
  type LeaveGuildResult,
  type LearnSkillResult,
  type AdvanceSkillResult,
  type AdvanceGuildResult,
  type UseSkillResult,
  GUILD_CONSTANTS,
  getGuildXPRequired,
  getSkillXPRequired,
} from '../std/guild/types.js';
import {
  getAllGuildDefinitions,
  getAllSkillDefinitions,
} from '../std/guild/definitions.js';

/**
 * Player interface for guild operations.
 */
interface GuildPlayer extends Living {
  name: string;
  gold?: number;
  experience?: number;
  receive(message: string): void;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
  useMana(amount: number): boolean;
  hasMana(amount: number): boolean;
  damage(amount: number): void;
  heal(amount: number): void;
  addEffect(effect: unknown): void;
}

/**
 * Guild Daemon class.
 */
export class GuildDaemon extends MudObject {
  private _guilds: Map<GuildId, GuildDefinition> = new Map();
  private _skills: Map<string, SkillDefinition> = new Map();
  private _dirty: boolean = false;
  private _loaded: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Guild Daemon';
    this.longDesc = 'The guild daemon manages the multi-guild system.';

    // Initialize guilds and skills on construction
    this.initializeGuilds();
  }

  /**
   * Initialize all guilds and skills.
   */
  private initializeGuilds(): void {
    // Register all guilds
    const guilds = getAllGuildDefinitions();
    for (const guild of guilds) {
      this.registerGuild(guild);
    }

    // Register all skills
    const skills = getAllSkillDefinitions();
    for (const skill of skills) {
      this.registerSkill(skill);
    }

    console.log(`[GuildDaemon] Initialized ${guilds.length} guilds and ${skills.length} skills`);
    this._loaded = true;
  }

  // ==================== Guild Registration ====================

  /**
   * Register a guild definition.
   */
  registerGuild(guild: GuildDefinition): boolean {
    if (this._guilds.has(guild.id)) {
      console.log(`[GuildDaemon] Guild already registered: ${guild.id}`);
      return false;
    }

    this._guilds.set(guild.id, guild);
    console.log(`[GuildDaemon] Registered guild: ${guild.name}`);

    // Create guild channel
    const channelDaemon = getChannelDaemon();
    channelDaemon.createGuildChannel(guild.id);

    return true;
  }

  /**
   * Get a guild by ID.
   */
  getGuild(id: GuildId): GuildDefinition | undefined {
    return this._guilds.get(id);
  }

  /**
   * Get all registered guilds.
   */
  getAllGuilds(): GuildDefinition[] {
    return Array.from(this._guilds.values());
  }

  // ==================== Skill Registration ====================

  /**
   * Register a skill definition.
   */
  registerSkill(skill: SkillDefinition): boolean {
    if (this._skills.has(skill.id)) {
      console.log(`[GuildDaemon] Skill already registered: ${skill.id}`);
      return false;
    }

    this._skills.set(skill.id, skill);
    return true;
  }

  /**
   * Get a skill by ID.
   */
  getSkill(id: string): SkillDefinition | undefined {
    return this._skills.get(id);
  }

  /**
   * Get all skills for a guild.
   */
  getGuildSkills(guildId: GuildId): SkillDefinition[] {
    return Array.from(this._skills.values()).filter(s => s.guild === guildId);
  }

  /**
   * Get skills available at a specific guild level.
   */
  getSkillsAtLevel(guildId: GuildId, guildLevel: number): SkillDefinition[] {
    return this.getGuildSkills(guildId).filter(s => s.guildLevelRequired <= guildLevel);
  }

  // ==================== Player Guild Data ====================

  /**
   * Get player's guild data, creating empty if not exists.
   */
  getPlayerGuildData(player: GuildPlayer): PlayerGuildData {
    let data = player.getProperty('guildData') as PlayerGuildData | undefined;
    if (!data) {
      data = {
        guilds: [],
        skills: [],
        cooldowns: [],
      };
      player.setProperty('guildData', data);
    }
    return data;
  }

  /**
   * Save player's guild data.
   */
  private savePlayerGuildData(player: GuildPlayer, data: PlayerGuildData): void {
    // Clean up expired cooldowns before saving
    const now = Date.now();
    data.cooldowns = data.cooldowns.filter(cd => cd.expiresAt > now);
    player.setProperty('guildData', data);
  }

  // ==================== Membership ====================

  /**
   * Check if a player is a member of a guild.
   */
  isMember(player: GuildPlayer, guildId: GuildId): boolean {
    const data = this.getPlayerGuildData(player);
    return data.guilds.some(g => g.guildId === guildId);
  }

  /**
   * Get a player's membership in a guild.
   */
  getMembership(player: GuildPlayer, guildId: GuildId): PlayerGuildMembership | undefined {
    const data = this.getPlayerGuildData(player);
    return data.guilds.find(g => g.guildId === guildId);
  }

  /**
   * Get a player's guild level.
   */
  getGuildLevel(player: GuildPlayer, guildId: GuildId): number {
    const membership = this.getMembership(player, guildId);
    return membership?.guildLevel ?? 0;
  }

  /**
   * Check if a player can join a guild.
   */
  canJoinGuild(player: GuildPlayer, guildId: GuildId): { canJoin: boolean; reason?: string } {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return { canJoin: false, reason: 'Guild does not exist.' };
    }

    const data = this.getPlayerGuildData(player);

    // Already a member?
    if (data.guilds.some(g => g.guildId === guildId)) {
      return { canJoin: false, reason: `You are already a member of the ${guild.name}.` };
    }

    // Guild limit check
    if (data.guilds.length >= GUILD_CONSTANTS.MAX_GUILDS) {
      return {
        canJoin: false,
        reason: `You cannot join more than ${GUILD_CONSTANTS.MAX_GUILDS} guilds. Leave a guild first.`,
      };
    }

    // Opposing guild check
    if (guild.opposingGuilds) {
      for (const opposingId of guild.opposingGuilds) {
        if (data.guilds.some(g => g.guildId === opposingId)) {
          const opposing = this.getGuild(opposingId);
          return {
            canJoin: false,
            reason: `The ${guild.name} opposes the ${opposing?.name ?? opposingId}. You cannot be a member of both.`,
          };
        }
      }
    }

    // Stat requirements check
    if (guild.statRequirements) {
      for (const [stat, required] of Object.entries(guild.statRequirements)) {
        const playerStat = player.getStat(stat as Parameters<typeof player.getStat>[0]);
        if (playerStat < required) {
          return {
            canJoin: false,
            reason: `You need at least ${required} ${stat} to join the ${guild.name}.`,
          };
        }
      }
    }

    return { canJoin: true };
  }

  /**
   * Join a guild.
   */
  joinGuild(player: GuildPlayer, guildId: GuildId): JoinGuildResult {
    const check = this.canJoinGuild(player, guildId);
    if (!check.canJoin) {
      return { success: false, message: check.reason! };
    }

    const guild = this.getGuild(guildId)!;
    const data = this.getPlayerGuildData(player);

    const membership: PlayerGuildMembership = {
      guildId,
      guildLevel: 1,
      guildXP: 0,
      joinedAt: Date.now(),
    };

    data.guilds.push(membership);

    // Set player's guild property for channel access
    player.setProperty('guild', guildId);

    this.savePlayerGuildData(player, data);

    return {
      success: true,
      message: `Welcome to the ${guild.name}! You are now a level 1 member.`,
      membership,
    };
  }

  /**
   * Leave a guild.
   */
  leaveGuild(player: GuildPlayer, guildId: GuildId): LeaveGuildResult {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return { success: false, message: 'Guild does not exist.' };
    }

    const data = this.getPlayerGuildData(player);
    const membershipIndex = data.guilds.findIndex(g => g.guildId === guildId);

    if (membershipIndex === -1) {
      return { success: false, message: `You are not a member of the ${guild.name}.` };
    }

    // Remove membership
    data.guilds.splice(membershipIndex, 1);

    // Remove all skills from this guild
    const removedSkills: string[] = [];
    data.skills = data.skills.filter(s => {
      const skill = this.getSkill(s.skillId);
      if (skill && skill.guild === guildId) {
        removedSkills.push(skill.name);
        return false;
      }
      return true;
    });

    // Remove cooldowns for removed skills
    data.cooldowns = data.cooldowns.filter(cd => {
      const skill = this.getSkill(cd.skillId);
      return !skill || skill.guild !== guildId;
    });

    // Update player's guild property if needed
    const currentGuild = player.getProperty('guild') as GuildId | undefined;
    if (currentGuild === guildId) {
      // Set to another guild if member of one, otherwise clear
      const nextGuild = data.guilds[0]?.guildId;
      player.setProperty('guild', nextGuild ?? null);
    }

    this.savePlayerGuildData(player, data);

    const skillsMsg = removedSkills.length > 0
      ? ` You have lost the following skills: ${removedSkills.join(', ')}.`
      : '';

    return {
      success: true,
      message: `You have left the ${guild.name}.${skillsMsg}`,
      removedSkills,
    };
  }

  // ==================== Guild Advancement ====================

  /**
   * Award guild XP to a player.
   */
  awardGuildXP(player: GuildPlayer, guildId: GuildId, amount: number): boolean {
    const membership = this.getMembership(player, guildId);
    if (!membership) return false;

    membership.guildXP += amount;

    const data = this.getPlayerGuildData(player);
    this.savePlayerGuildData(player, data);

    return true;
  }

  /**
   * Advance a player's guild level.
   */
  advanceGuildLevel(player: GuildPlayer, guildId: GuildId): AdvanceGuildResult {
    const guild = this.getGuild(guildId);
    if (!guild) {
      return { success: false, message: 'Guild does not exist.' };
    }

    const data = this.getPlayerGuildData(player);
    const membership = data.guilds.find(g => g.guildId === guildId);

    if (!membership) {
      return { success: false, message: `You are not a member of the ${guild.name}.` };
    }

    if (membership.guildLevel >= GUILD_CONSTANTS.MAX_GUILD_LEVEL) {
      return { success: false, message: `You have already reached the maximum level in the ${guild.name}.` };
    }

    const xpRequired = getGuildXPRequired(membership.guildLevel);
    if (membership.guildXP < xpRequired) {
      return {
        success: false,
        message: `You need ${xpRequired} guild XP to advance. You have ${membership.guildXP}.`,
      };
    }

    // Advance
    membership.guildXP -= xpRequired;
    membership.guildLevel += 1;

    this.savePlayerGuildData(player, data);

    // Find newly available skills
    const newSkillsAvailable = this.getGuildSkills(guildId)
      .filter(s => s.guildLevelRequired === membership.guildLevel)
      .map(s => s.name);

    const skillsMsg = newSkillsAvailable.length > 0
      ? ` New skills available: ${newSkillsAvailable.join(', ')}.`
      : '';

    return {
      success: true,
      message: `Congratulations! You are now level ${membership.guildLevel} in the ${guild.name}!${skillsMsg}`,
      newLevel: membership.guildLevel,
      xpSpent: xpRequired,
      newSkillsAvailable,
    };
  }

  // ==================== Skills ====================

  /**
   * Check if a player has learned a skill.
   */
  hasSkill(player: GuildPlayer, skillId: string): boolean {
    const data = this.getPlayerGuildData(player);
    return data.skills.some(s => s.skillId === skillId);
  }

  /**
   * Get a player's skill level.
   */
  getSkillLevel(player: GuildPlayer, skillId: string): number {
    const data = this.getPlayerGuildData(player);
    const skill = data.skills.find(s => s.skillId === skillId);
    return skill?.level ?? 0;
  }

  /**
   * Get a player's skill data.
   */
  getPlayerSkill(player: GuildPlayer, skillId: string): PlayerSkill | undefined {
    const data = this.getPlayerGuildData(player);
    return data.skills.find(s => s.skillId === skillId);
  }

  /**
   * Check if a player can learn a skill.
   */
  canLearnSkill(player: GuildPlayer, skillId: string): { canLearn: boolean; reason?: string } {
    const skill = this.getSkill(skillId);
    if (!skill) {
      return { canLearn: false, reason: 'Skill does not exist.' };
    }

    // Already learned?
    if (this.hasSkill(player, skillId)) {
      return { canLearn: false, reason: `You have already learned ${skill.name}.` };
    }

    // Guild membership check
    if (!this.isMember(player, skill.guild)) {
      const guild = this.getGuild(skill.guild);
      return { canLearn: false, reason: `You must be a member of the ${guild?.name ?? skill.guild} to learn ${skill.name}.` };
    }

    // Guild level check
    const guildLevel = this.getGuildLevel(player, skill.guild);
    if (guildLevel < skill.guildLevelRequired) {
      return {
        canLearn: false,
        reason: `You need guild level ${skill.guildLevelRequired} to learn ${skill.name}. You are level ${guildLevel}.`,
      };
    }

    // Prerequisites check
    if (skill.prerequisites) {
      for (const prereqId of skill.prerequisites) {
        if (!this.hasSkill(player, prereqId)) {
          const prereq = this.getSkill(prereqId);
          return {
            canLearn: false,
            reason: `You must learn ${prereq?.name ?? prereqId} before ${skill.name}.`,
          };
        }
      }
    }

    // Gold check
    const playerGold = player.gold ?? 0;
    if (playerGold < skill.learnCost) {
      return {
        canLearn: false,
        reason: `Learning ${skill.name} costs ${skill.learnCost} gold. You have ${playerGold}.`,
      };
    }

    return { canLearn: true };
  }

  /**
   * Learn a skill.
   */
  learnSkill(player: GuildPlayer, skillId: string): LearnSkillResult {
    const check = this.canLearnSkill(player, skillId);
    if (!check.canLearn) {
      return { success: false, message: check.reason! };
    }

    const skill = this.getSkill(skillId)!;
    const data = this.getPlayerGuildData(player);

    // Deduct gold
    if (player.gold !== undefined) {
      player.gold -= skill.learnCost;
    }

    // Add skill
    data.skills.push({
      skillId,
      level: 1,
      xpInvested: 0,
    });

    this.savePlayerGuildData(player, data);

    // Apply passive effects immediately
    if (skill.type === 'passive') {
      this.applyPassiveSkill(player, skill, 1);
    }

    return {
      success: true,
      message: `You have learned ${skill.name}! (Skill level 1)`,
      goldSpent: skill.learnCost,
    };
  }

  /**
   * Advance a skill level.
   */
  advanceSkill(player: GuildPlayer, skillId: string): AdvanceSkillResult {
    const skill = this.getSkill(skillId);
    if (!skill) {
      return { success: false, message: 'Skill does not exist.' };
    }

    const data = this.getPlayerGuildData(player);
    const playerSkill = data.skills.find(s => s.skillId === skillId);

    if (!playerSkill) {
      return { success: false, message: `You have not learned ${skill.name}.` };
    }

    if (playerSkill.level >= skill.maxLevel) {
      return { success: false, message: `${skill.name} is already at maximum level.` };
    }

    const xpRequired = getSkillXPRequired(playerSkill.level, skill.advanceCostPerLevel);
    const playerXP = player.experience ?? 0;

    if (playerXP < xpRequired) {
      return {
        success: false,
        message: `Advancing ${skill.name} costs ${xpRequired} XP. You have ${playerXP}.`,
      };
    }

    // Remove passive effect at old level if applicable
    if (skill.type === 'passive') {
      this.removePassiveSkill(player, skill, playerSkill.level);
    }

    // Advance
    if (player.experience !== undefined) {
      player.experience -= xpRequired;
    }
    playerSkill.level += 1;
    playerSkill.xpInvested += xpRequired;

    this.savePlayerGuildData(player, data);

    // Apply passive effect at new level
    if (skill.type === 'passive') {
      this.applyPassiveSkill(player, skill, playerSkill.level);
    }

    return {
      success: true,
      message: `${skill.name} advanced to level ${playerSkill.level}!`,
      newLevel: playerSkill.level,
      xpSpent: xpRequired,
    };
  }

  // ==================== Skill Execution ====================

  /**
   * Check if a skill is on cooldown.
   */
  isOnCooldown(player: GuildPlayer, skillId: string): boolean {
    const data = this.getPlayerGuildData(player);
    const now = Date.now();
    return data.cooldowns.some(cd => cd.skillId === skillId && cd.expiresAt > now);
  }

  /**
   * Get remaining cooldown time in seconds.
   */
  getCooldownRemaining(player: GuildPlayer, skillId: string): number {
    const data = this.getPlayerGuildData(player);
    const now = Date.now();
    const cooldown = data.cooldowns.find(cd => cd.skillId === skillId);
    if (!cooldown || cooldown.expiresAt <= now) return 0;
    return Math.ceil((cooldown.expiresAt - now) / 1000);
  }

  /**
   * Start a cooldown for a skill.
   */
  private startCooldown(player: GuildPlayer, skillId: string, durationMs: number): void {
    const data = this.getPlayerGuildData(player);

    // Remove existing cooldown if any
    data.cooldowns = data.cooldowns.filter(cd => cd.skillId !== skillId);

    // Add new cooldown
    data.cooldowns.push({
      skillId,
      expiresAt: Date.now() + durationMs,
    });

    this.savePlayerGuildData(player, data);
  }

  /**
   * Use a skill.
   */
  useSkill(player: GuildPlayer, skillId: string, target?: Living): UseSkillResult {
    const skill = this.getSkill(skillId);
    if (!skill) {
      return { success: false, message: 'Skill does not exist.' };
    }

    // Passive skills cannot be "used"
    if (skill.type === 'passive') {
      return { success: false, message: `${skill.name} is a passive skill and is always active.` };
    }

    // Has skill?
    const skillLevel = this.getSkillLevel(player, skillId);
    if (skillLevel === 0) {
      return { success: false, message: `You have not learned ${skill.name}.` };
    }

    // Cooldown check
    if (this.isOnCooldown(player, skillId)) {
      const remaining = this.getCooldownRemaining(player, skillId);
      return { success: false, message: `${skill.name} is on cooldown for ${remaining} more seconds.` };
    }

    // Mana check
    if (!player.hasMana(skill.manaCost)) {
      return { success: false, message: `You don't have enough mana. ${skill.name} costs ${skill.manaCost} MP.` };
    }

    // Target validation
    if (skill.target === 'single' && !target) {
      return { success: false, message: `${skill.name} requires a target.` };
    }

    // Execute skill based on type
    let result: UseSkillResult;

    switch (skill.type) {
      case 'combat':
        result = this.executeCombatSkill(player, skill, skillLevel, target);
        break;
      case 'buff':
        result = this.executeBuffSkill(player, skill, skillLevel, target);
        break;
      case 'debuff':
        result = this.executeDebuffSkill(player, skill, skillLevel, target);
        break;
      case 'utility':
        result = this.executeUtilitySkill(player, skill, skillLevel, target);
        break;
      case 'crafting':
        result = this.executeCraftingSkill(player, skill, skillLevel);
        break;
      default:
        result = { success: false, message: `Unknown skill type: ${skill.type}` };
    }

    if (result.success) {
      // Deduct mana
      player.useMana(skill.manaCost);
      result.manaSpent = skill.manaCost;

      // Start cooldown
      if (skill.cooldown > 0) {
        this.startCooldown(player, skillId, skill.cooldown);
      }
    }

    return result;
  }

  /**
   * Execute a combat skill (damage dealing).
   */
  private executeCombatSkill(
    player: GuildPlayer,
    skill: SkillDefinition,
    skillLevel: number,
    target?: Living
  ): UseSkillResult {
    const effect = skill.effect;

    // Calculate magnitude
    const magnitude = effect.baseMagnitude + (effect.magnitudePerLevel * (skillLevel - 1));

    if (effect.healing) {
      // Healing skill
      const healTarget = skill.target === 'self' ? player : (target ?? player);
      healTarget.heal(magnitude);

      const verb = skill.useVerb ?? 'cast';
      const targetMsg = healTarget === player ? 'yourself' : healTarget.name;
      return {
        success: true,
        message: `You ${verb} ${skill.name} on ${targetMsg}, healing for ${Math.round(magnitude)} HP!`,
        healing: magnitude,
      };
    } else {
      // Damage skill
      if (!target) {
        return { success: false, message: `${skill.name} requires a target.` };
      }

      // Room-wide damage
      if (skill.target === 'room') {
        // Get all enemies in room
        const room = player.environment;
        if (room) {
          const enemies = room.inventory.filter(
            obj => obj !== player && 'health' in obj && (obj as Living).alive
          ) as Living[];

          let totalDamage = 0;
          for (const enemy of enemies) {
            enemy.damage(magnitude);
            totalDamage += magnitude;
          }

          const verb = skill.useVerb ?? 'unleash';
          return {
            success: true,
            message: `You ${verb} ${skill.name}, hitting ${enemies.length} enemies for ${Math.round(magnitude)} damage each!`,
            damage: totalDamage,
          };
        }
      }

      // Single target damage
      target.damage(magnitude);

      const verb = skill.useVerb ?? 'use';
      return {
        success: true,
        message: `You ${verb} ${skill.name} on ${target.name}, dealing ${Math.round(magnitude)} damage!`,
        damage: magnitude,
      };
    }
  }

  /**
   * Execute a buff skill.
   */
  private executeBuffSkill(
    player: GuildPlayer,
    skill: SkillDefinition,
    skillLevel: number,
    target?: Living
  ): UseSkillResult {
    const effect = skill.effect;
    const magnitude = effect.baseMagnitude + (effect.magnitudePerLevel * (skillLevel - 1));
    const duration = effect.duration ?? 60000; // Default 1 minute

    const buffTarget = skill.target === 'self' ? player : (target ?? player);

    // Create effect
    const statName = effect.combatStatModifier || effect.statModifier || 'stat';
    const effectData = {
      id: `skill_${skill.id}`,
      name: skill.name,
      type: effect.statModifier ? 'stat_modifier' : 'combat_modifier',
      duration,
      magnitude,
      stat: effect.statModifier,
      combatStat: effect.combatStatModifier,
      source: player,
      category: 'buff' as const,
      description: `+${Math.round(magnitude)} ${statName}`,
    };

    buffTarget.addEffect(effectData);

    const verb = skill.useVerb ?? 'cast';
    const targetMsg = buffTarget === player ? 'yourself' : buffTarget.name;
    const durationSec = Math.round(duration / 1000);

    return {
      success: true,
      message: `You ${verb} ${skill.name} on ${targetMsg}! (+${Math.round(magnitude)} for ${durationSec}s)`,
      effectApplied: skill.name,
    };
  }

  /**
   * Execute a debuff skill.
   */
  private executeDebuffSkill(
    player: GuildPlayer,
    skill: SkillDefinition,
    skillLevel: number,
    target?: Living
  ): UseSkillResult {
    if (!target) {
      return { success: false, message: `${skill.name} requires a target.` };
    }

    const effect = skill.effect;
    const magnitude = effect.baseMagnitude + (effect.magnitudePerLevel * (skillLevel - 1));
    const duration = effect.duration ?? 30000; // Default 30 seconds

    // Create negative effect
    const effectMagnitude = effect.tickInterval ? magnitude : -magnitude; // Negative for stat reduction
    const statName = effect.combatStatModifier || effect.statModifier;
    const description = effect.tickInterval
      ? `${Math.round(magnitude)} dmg/tick`
      : statName
        ? `${Math.round(effectMagnitude)} ${statName}`
        : 'Slowed';
    const effectData = {
      id: `skill_${skill.id}`,
      name: skill.name,
      type: effect.tickInterval ? 'damage_over_time' : (effect.statModifier ? 'stat_modifier' : 'slow'),
      duration,
      magnitude: effectMagnitude,
      tickInterval: effect.tickInterval,
      nextTick: effect.tickInterval,
      stat: effect.statModifier,
      combatStat: effect.combatStatModifier,
      damageType: effect.damageType,
      source: player,
      category: 'debuff' as const,
      description,
    };

    target.addEffect(effectData);

    const verb = skill.useVerb ?? 'cast';
    const durationSec = Math.round(duration / 1000);

    return {
      success: true,
      message: `You ${verb} ${skill.name} on ${target.name}! (${durationSec}s)`,
      effectApplied: skill.name,
    };
  }

  /**
   * Execute a utility skill.
   */
  private executeUtilitySkill(
    player: GuildPlayer,
    skill: SkillDefinition,
    _skillLevel: number,
    _target?: Living
  ): UseSkillResult {
    // Utility skills have custom handlers
    if (skill.effect.customHandler) {
      // TODO: Implement custom handler system
      return {
        success: true,
        message: `You use ${skill.name}.`,
      };
    }

    return {
      success: true,
      message: `You use ${skill.name}.`,
    };
  }

  /**
   * Execute a crafting skill.
   */
  private executeCraftingSkill(
    player: GuildPlayer,
    skill: SkillDefinition,
    _skillLevel: number
  ): UseSkillResult {
    // TODO: Implement crafting system
    return {
      success: true,
      message: `You use ${skill.name} to craft.`,
    };
  }

  // ==================== Passive Skills ====================

  /**
   * Apply a passive skill effect.
   */
  private applyPassiveSkill(player: GuildPlayer, skill: SkillDefinition, skillLevel: number): void {
    const effect = skill.effect;
    const magnitude = effect.baseMagnitude + (effect.magnitudePerLevel * (skillLevel - 1));

    if (effect.statModifier) {
      player.addStatModifier(effect.statModifier, magnitude);
    }
    if (effect.combatStatModifier) {
      player.addCombatStatModifier(effect.combatStatModifier as Parameters<typeof player.addCombatStatModifier>[0], magnitude);
    }
  }

  /**
   * Remove a passive skill effect.
   */
  private removePassiveSkill(player: GuildPlayer, skill: SkillDefinition, skillLevel: number): void {
    const effect = skill.effect;
    const magnitude = effect.baseMagnitude + (effect.magnitudePerLevel * (skillLevel - 1));

    if (effect.statModifier) {
      player.addStatModifier(effect.statModifier, -magnitude);
    }
    if (effect.combatStatModifier) {
      player.addCombatStatModifier(effect.combatStatModifier as Parameters<typeof player.addCombatStatModifier>[0], -magnitude);
    }
  }

  /**
   * Apply all passive skills for a player.
   * Called when player logs in.
   */
  applyAllPassives(player: GuildPlayer): void {
    const data = this.getPlayerGuildData(player);

    for (const playerSkill of data.skills) {
      const skill = this.getSkill(playerSkill.skillId);
      if (skill && skill.type === 'passive') {
        this.applyPassiveSkill(player, skill, playerSkill.level);
      }
    }
  }

  /**
   * Remove all passive skills for a player.
   * Called when player logs out.
   */
  removeAllPassives(player: GuildPlayer): void {
    const data = this.getPlayerGuildData(player);

    for (const playerSkill of data.skills) {
      const skill = this.getSkill(playerSkill.skillId);
      if (skill && skill.type === 'passive') {
        this.removePassiveSkill(player, skill, playerSkill.level);
      }
    }
  }

  // ==================== Queries ====================

  /**
   * Get all skills a player has learned.
   */
  getPlayerSkills(player: GuildPlayer): Array<{ skill: SkillDefinition; level: number }> {
    const data = this.getPlayerGuildData(player);
    const result: Array<{ skill: SkillDefinition; level: number }> = [];

    for (const playerSkill of data.skills) {
      const skill = this.getSkill(playerSkill.skillId);
      if (skill) {
        result.push({ skill, level: playerSkill.level });
      }
    }

    return result;
  }

  /**
   * Get skills available for a player to learn.
   */
  getAvailableSkills(player: GuildPlayer): SkillDefinition[] {
    const data = this.getPlayerGuildData(player);
    const available: SkillDefinition[] = [];

    for (const membership of data.guilds) {
      const skills = this.getSkillsAtLevel(membership.guildId, membership.guildLevel);
      for (const skill of skills) {
        // Not already learned
        if (!data.skills.some(s => s.skillId === skill.id)) {
          // Prerequisites met
          const prereqsMet = !skill.prerequisites ||
            skill.prerequisites.every(prereq => data.skills.some(s => s.skillId === prereq));
          if (prereqsMet) {
            available.push(skill);
          }
        }
      }
    }

    return available;
  }

  // ==================== Persistence ====================

  /**
   * Load and register all guild definitions.
   */
  async load(): Promise<void> {
    // Register all guilds
    const guilds = getAllGuildDefinitions();
    for (const guild of guilds) {
      this.registerGuild(guild);
    }

    // Register all skills
    const skills = getAllSkillDefinitions();
    for (const skill of skills) {
      this.registerSkill(skill);
    }

    console.log(`[GuildDaemon] Loaded ${guilds.length} guilds and ${skills.length} skills`);
    this._loaded = true;
  }

  /**
   * Save any daemon state to disk.
   */
  async save(): Promise<void> {
    // Guild daemon state doesn't need saving
    // Player guild data is saved with player data
    this._dirty = false;
  }

  get isDirty(): boolean {
    return this._dirty;
  }

  get isLoaded(): boolean {
    return this._loaded;
  }
}

// Singleton instance
let guildDaemon: GuildDaemon | null = null;

/**
 * Get the GuildDaemon singleton.
 */
export function getGuildDaemon(): GuildDaemon {
  if (!guildDaemon) {
    guildDaemon = new GuildDaemon();
  }
  return guildDaemon;
}

/**
 * Reset the guild daemon (for testing).
 */
export function resetGuildDaemon(): void {
  guildDaemon = null;
}

export default GuildDaemon;
