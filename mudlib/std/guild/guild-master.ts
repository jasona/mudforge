/**
 * GuildMaster - NPC that manages guild membership and skill training.
 *
 * GuildMasters can:
 * - Accept players into their guild
 * - Teach guild skills
 * - Advance guild levels
 */

import { NPC } from '../npc.js';
import type { MudObject } from '../object.js';
import { getGuildDaemon } from '../../daemons/guild.js';
import type { GuildId, GuildDefinition, SkillDefinition } from './types.js';
import { GUILD_CONSTANTS, getGuildXPRequired } from './types.js';

/**
 * Player interface for guild operations.
 */
interface GuildPlayer extends MudObject {
  name: string;
  gold?: number;
  experience?: number;
  receive(message: string): void;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
}

/**
 * GuildMaster NPC class.
 */
export class GuildMaster extends NPC {
  private _guildId: GuildId | null = null;
  private _greeting: string = 'Welcome, seeker. How may I assist you?';

  constructor() {
    super();
    this.shortDesc = 'a guildmaster';
    this.longDesc = 'This imposing figure is a master of their craft.';
  }

  /**
   * Configure the guildmaster's guild.
   */
  setGuild(guildId: GuildId): void {
    this._guildId = guildId;
    const guild = getGuildDaemon().getGuild(guildId);
    if (guild) {
      this.shortDesc = `the ${guild.name} Guildmaster`;
      this.longDesc = `This is the Guildmaster of the ${guild.name}. ${guild.motto || ''}`;
    }
  }

  /**
   * Set a custom greeting.
   */
  setGreeting(greeting: string): void {
    this._greeting = greeting;
  }

  /**
   * Get the guild this guildmaster serves.
   */
  getGuild(): GuildDefinition | undefined {
    if (!this._guildId) return undefined;
    return getGuildDaemon().getGuild(this._guildId);
  }

  /**
   * Get the guild ID.
   */
  get guildId(): GuildId | null {
    return this._guildId;
  }

  /**
   * Called when created - set up responses.
   */
  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Add response for greetings
    this.addResponse(/hello|hi|greetings/i, this._greeting, 'say');

    // Add response for join requests
    this.addResponse(/join|enroll|sign up/i, (speaker: MudObject) => {
      void this.handleJoinRequest(speaker as GuildPlayer);
      return undefined;
    });

    // Add response for skill requests with optional skill name
    this.addResponse(/(?:teach|learn|train)\s+(.+)/i, (speaker: MudObject, message: string) => {
      // Extract skill name from the message
      const match = message.match(/(?:teach|learn|train)\s+(.+)/i);
      if (match && match[1]) {
        void this.handleLearnSkill(speaker as GuildPlayer, match[1].trim());
      } else {
        void this.showSkillOptions(speaker as GuildPlayer);
      }
      return undefined;
    });

    // Add response for just "skills" or "learn" without a skill name
    this.addResponse(/^(?:skills?|learn|teach|train)$/i, (speaker: MudObject) => {
      void this.showSkillOptions(speaker as GuildPlayer);
      return undefined;
    });

    // Add response for status
    this.addResponse(/status|progress|level/i, (speaker: MudObject) => {
      void this.showProgress(speaker as GuildPlayer);
      return undefined;
    });

    // Add room actions
    this.addAction('join', async () => {
      const player = typeof efuns !== 'undefined' ? efuns.thisPlayer() as GuildPlayer | undefined : undefined;
      if (player) await this.handleJoinRequest(player);
      return true;
    });

    this.addAction('learn', async (args) => {
      const player = typeof efuns !== 'undefined' ? efuns.thisPlayer() as GuildPlayer | undefined : undefined;
      if (player) await this.handleLearnSkill(player, args ?? '');
      return true;
    });

    this.addAction('advance', async () => {
      const player = typeof efuns !== 'undefined' ? efuns.thisPlayer() as GuildPlayer | undefined : undefined;
      if (player) await this.handleAdvance(player);
      return true;
    });
  }

  /**
   * Show guildmaster options when looked at.
   */
  override onLook(looker: MudObject): void {
    super.onLook(looker);
    this.showOptions(looker as GuildPlayer);
  }

  /**
   * Show available options to a player.
   */
  showOptions(player: GuildPlayer): void {
    if (!this._guildId) {
      player.receive('{dim}This guildmaster seems lost.{/}\n');
      return;
    }

    const guildDaemon = getGuildDaemon();
    const guild = guildDaemon.getGuild(this._guildId);
    if (!guild) return;

    player.receive('\n{bold}{cyan}=== Guildmaster Services ==={/}\n\n');

    const isMember = guildDaemon.isMember(player, this._guildId);

    if (!isMember) {
      // Show join option
      const canJoin = guildDaemon.canJoinGuild(player, this._guildId);
      if (canJoin.canJoin) {
        player.receive(`  {bold}join{/} - Join the ${guild.name}\n`);
      } else {
        player.receive(`  {dim}join{/} - ${canJoin.reason}\n`);
      }
    } else {
      // Show member options
      const membership = guildDaemon.getMembership(player, this._guildId);
      const guildLevel = membership?.guildLevel ?? 1;

      player.receive(`{green}You are a level ${guildLevel} member of the ${guild.name}.{/}\n\n`);

      // Skills available to learn
      const availableSkills = guildDaemon.getAvailableSkills(player)
        .filter(s => s.guild === this._guildId);

      if (availableSkills.length > 0) {
        player.receive('{bold}Skills available to learn:{/}\n');
        for (const skill of availableSkills) {
          player.receive(`  {yellow}learn ${skill.name.toLowerCase()}{/} - ${skill.description.slice(0, 40)}... ({cyan}${skill.learnCost} gold{/})\n`);
        }
        player.receive('\n');
      }

      // Guild advancement
      if (guildLevel < GUILD_CONSTANTS.MAX_GUILD_LEVEL) {
        const xpNeeded = getGuildXPRequired(guildLevel);
        const currentXP = membership?.guildXP ?? 0;

        if (currentXP >= xpNeeded) {
          player.receive(`  {green}advance{/} - Advance to guild level ${guildLevel + 1}\n`);
        } else {
          player.receive(`  {dim}advance{/} - ${currentXP}/${xpNeeded} Guild XP needed\n`);
        }
      }
    }

    player.receive('\n{dim}Say "join", "learn <skill>", or "advance" to the guildmaster.{/}\n');
  }

  /**
   * Handle a join request.
   */
  async handleJoinRequest(player: GuildPlayer): Promise<void> {
    if (!this._guildId) {
      player.receive('{red}This guildmaster is not properly configured.{/}\n');
      return;
    }

    const guildDaemon = getGuildDaemon();
    const guild = guildDaemon.getGuild(this._guildId);
    if (!guild) {
      player.receive('{red}Guild not found.{/}\n');
      return;
    }

    // Check if already a member
    if (guildDaemon.isMember(player, this._guildId)) {
      this.sayTo(player, `You are already a member of the ${guild.name}.`);
      return;
    }

    // Try to join
    const result = guildDaemon.joinGuild(player, this._guildId);

    if (result.success) {
      this.sayTo(player, result.message);

      // Broadcast to room
      const room = this.environment;
      if (room && 'broadcast' in room) {
        (room as MudObject & { broadcast(msg: string, opts?: { exclude: MudObject[] }): void }).broadcast(
          `${player.name} has joined the ${guild.name}!`,
          { exclude: [player] }
        );
      }
    } else {
      this.sayTo(player, result.message);
    }
  }

  /**
   * Handle learning a skill.
   */
  async handleLearnSkill(player: GuildPlayer, skillName: string): Promise<void> {
    if (!this._guildId) {
      player.receive('{red}This guildmaster is not properly configured.{/}\n');
      return;
    }

    const guildDaemon = getGuildDaemon();
    const guild = guildDaemon.getGuild(this._guildId);
    if (!guild) return;

    // Must be a member
    if (!guildDaemon.isMember(player, this._guildId)) {
      this.sayTo(player, `You must be a member of the ${guild.name} to learn our skills.`);
      return;
    }

    if (!skillName) {
      this.showSkillOptions(player);
      return;
    }

    // Find the skill
    const availableSkills = guildDaemon.getAvailableSkills(player)
      .filter(s => s.guild === this._guildId);

    const skill = availableSkills.find(
      s => s.name.toLowerCase() === skillName.toLowerCase() ||
           s.name.toLowerCase().includes(skillName.toLowerCase())
    );

    if (!skill) {
      // Maybe they already know it?
      const knownSkills = guildDaemon.getPlayerSkills(player)
        .filter(ps => ps.skill.guild === this._guildId);

      const alreadyKnown = knownSkills.find(
        ps => ps.skill.name.toLowerCase().includes(skillName.toLowerCase())
      );

      if (alreadyKnown) {
        this.sayTo(player, `You have already learned ${alreadyKnown.skill.name}.`);
      } else {
        this.sayTo(player, `I don't know of a skill called "${skillName}" that you can learn.`);
      }
      return;
    }

    // Check gold
    const playerGold = player.gold ?? 0;
    if (playerGold < skill.learnCost) {
      this.sayTo(player, `Learning ${skill.name} costs ${skill.learnCost} gold. You only have ${playerGold}.`);
      return;
    }

    // Learn the skill
    const result = guildDaemon.learnSkill(player, skill.id);

    if (result.success) {
      this.sayTo(player, result.message);
      player.receive(`\n{bold}{yellow}You have learned ${skill.name}!{/}\n`);
      player.receive(`{dim}${skill.description}{/}\n\n`);
    } else {
      this.sayTo(player, result.message);
    }
  }

  /**
   * Show skill options to a player.
   */
  showSkillOptions(player: GuildPlayer): void {
    if (!this._guildId) {
      player.receive('{red}This guildmaster is not properly configured.{/}\n');
      return;
    }

    const guildDaemon = getGuildDaemon();
    const guild = guildDaemon.getGuild(this._guildId);
    if (!guild) {
      player.receive('{red}Guild not found.{/}\n');
      return;
    }

    if (!guildDaemon.isMember(player, this._guildId)) {
      this.sayTo(player, `You must join the ${guild.name} before you can learn our skills.`);
      return;
    }

    const availableSkills = guildDaemon.getAvailableSkills(player)
      .filter(s => s.guild === this._guildId);

    if (availableSkills.length === 0) {
      this.sayTo(player, 'You have learned all skills available at your current guild level. Advance to unlock more!');
      return;
    }

    player.receive('\n{bold}{cyan}=== Available Skills ==={/}\n\n');

    for (const skill of availableSkills) {
      const typeColor = getTypeColor(skill.type);
      player.receive(`{${typeColor}}${skill.name}{/} - {cyan}${skill.learnCost} gold{/}\n`);
      player.receive(`  {dim}${skill.description}{/}\n\n`);
    }

    player.receive('{dim}Say "learn <skill name>" to learn a skill.{/}\n');
  }

  /**
   * Show player's progress in this guild.
   */
  showProgress(player: GuildPlayer): void {
    if (!this._guildId) {
      player.receive('{red}This guildmaster is not properly configured.{/}\n');
      return;
    }

    const guildDaemon = getGuildDaemon();
    const guild = guildDaemon.getGuild(this._guildId);
    if (!guild) {
      player.receive('{red}Guild not found.{/}\n');
      return;
    }

    if (!guildDaemon.isMember(player, this._guildId)) {
      this.sayTo(player, `You are not a member of the ${guild.name}.`);
      return;
    }

    const membership = guildDaemon.getMembership(player, this._guildId);
    if (!membership) return;

    const data = guildDaemon.getPlayerGuildData(player);
    const guildSkills = data.skills.filter(s => {
      const skill = guildDaemon.getSkill(s.skillId);
      return skill && skill.guild === this._guildId;
    });

    player.receive(`\n{bold}{cyan}=== Your Progress in ${guild.name} ==={/}\n\n`);
    player.receive(`Guild Level: {bold}${membership.guildLevel}{/} / ${GUILD_CONSTANTS.MAX_GUILD_LEVEL}\n`);

    if (membership.guildLevel < GUILD_CONSTANTS.MAX_GUILD_LEVEL) {
      const xpNeeded = getGuildXPRequired(membership.guildLevel);
      const progress = Math.floor((membership.guildXP / xpNeeded) * 100);
      player.receive(`Guild XP: {cyan}${membership.guildXP}{/} / ${xpNeeded} (${progress}%)\n`);
    }

    player.receive(`Skills Learned: {cyan}${guildSkills.length}{/}\n\n`);

    if (guildSkills.length > 0) {
      player.receive('{bold}Your Skills:{/}\n');
      for (const ps of guildSkills) {
        const skill = guildDaemon.getSkill(ps.skillId);
        if (skill) {
          player.receive(`  ${skill.name} - Level ${ps.level}/${skill.maxLevel}\n`);
        }
      }
    }

    player.receive('\n');
  }

  /**
   * Handle guild advancement.
   */
  async handleAdvance(player: GuildPlayer): Promise<void> {
    if (!this._guildId) {
      player.receive('{red}This guildmaster is not properly configured.{/}\n');
      return;
    }

    const guildDaemon = getGuildDaemon();
    const result = guildDaemon.advanceGuildLevel(player, this._guildId);

    if (result.success) {
      this.sayTo(player, result.message);

      if (result.newSkillsAvailable && result.newSkillsAvailable.length > 0) {
        player.receive(`\n{yellow}New skills available: ${result.newSkillsAvailable.join(', ')}{/}\n`);
      }
    } else {
      this.sayTo(player, result.message);
    }
  }

  /**
   * Say something to a specific player.
   */
  private sayTo(player: GuildPlayer, message: string): void {
    player.receive(`{cyan}${this.name} says to you, "${message}"{/}\n`);
  }
}

/**
 * Get color for skill type.
 */
function getTypeColor(type: string): string {
  switch (type) {
    case 'combat':
      return 'red';
    case 'buff':
      return 'green';
    case 'debuff':
      return 'magenta';
    case 'passive':
      return 'cyan';
    case 'utility':
      return 'yellow';
    case 'crafting':
      return 'blue';
    default:
      return 'white';
  }
}

/**
 * Helper function to check if an object is a GuildMaster.
 */
export function isGuildMaster(obj: MudObject): obj is GuildMaster {
  return obj instanceof GuildMaster;
}

export default GuildMaster;
