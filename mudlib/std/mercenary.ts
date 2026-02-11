/**
 * Mercenary - A hired NPC companion that assists players in combat.
 *
 * Mercenaries are full participants in the behavior system. Each mercenary type
 * maps to a combat role (tank, healer, dps_melee, dps_ranged) and uses the
 * BehaviorDaemon for intelligent combat decisions.
 */

import { NPC } from './npc.js';
import { Living } from './living.js';
import { MudObject } from './object.js';
import { Room } from './room.js';
import { Corpse } from './corpse.js';
import { getCombatDaemon } from '../daemons/combat.js';
import type {
  MercenaryType,
  MercenaryTemplate,
  MercenarySaveData,
  MercenaryBehavior,
} from '../lib/mercenary-types.js';
import type { GuildId } from './guild/types.js';

/**
 * Mercenary class - extends NPC with owner/follow/serialize capabilities.
 */
export class Mercenary extends NPC {
  /** Owner's name (lowercase) */
  private _ownerName: string | null = null;

  /** Custom name given by owner */
  private _mercName: string | null = null;

  /** Unique mercenary ID */
  private _mercId: string;

  /** Mercenary type (fighter, mage, thief, cleric) */
  private _mercType: MercenaryType = 'fighter';

  /** Base short description (e.g., "a mercenary fighter") */
  private _baseShortDesc: string = 'a mercenary';

  /** Whether this mercenary is following the owner */
  private _following: boolean = true;

  /** When this mercenary was hired (Unix timestamp) */
  private _hiredAt: number = 0;

  constructor() {
    super();
    // Generate unique mercenary ID
    this._mercId = `merc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.longDesc = 'A hired mercenary companion.';

    // Register for heartbeats so behavior AI runs
    if (typeof efuns !== 'undefined' && efuns.setHeartbeat) {
      efuns.setHeartbeat(this, true);
    }
  }

  // ========== Short Description Override ==========

  /**
   * Get the short description.
   * Returns "<Name>, a mercenary <type> (hired by <Owner>)" if named,
   * or "a mercenary <type> (hired by <Owner>)" if not.
   */
  override get shortDesc(): string {
    if (this._mercName && this._ownerName) {
      return `${this._mercName}, ${this._baseShortDesc} (hired by ${this._ownerName})`;
    } else if (this._ownerName) {
      return `${this._baseShortDesc} (hired by ${this._ownerName})`;
    } else if (this._mercName) {
      return `${this._mercName}, ${this._baseShortDesc}`;
    }
    return this._baseShortDesc;
  }

  /**
   * Set the base short description.
   */
  override set shortDesc(value: string) {
    this._baseShortDesc = value;
  }

  /**
   * Get the base short description without owner/name info.
   */
  get baseShortDesc(): string {
    return this._baseShortDesc;
  }

  // ========== Owner Management ==========

  /**
   * Get the owner's name.
   */
  get ownerName(): string | null {
    return this._ownerName;
  }

  /**
   * Set the owner's name.
   */
  set ownerName(name: string | null) {
    this._ownerName = name;
  }

  /**
   * Get the mercenary's custom name.
   */
  get mercName(): string | null {
    return this._mercName;
  }

  /**
   * Set the mercenary's custom name.
   */
  set mercName(name: string | null) {
    this._mercName = name;
  }

  /**
   * Get the mercenary's unique ID.
   */
  get mercId(): string {
    return this._mercId;
  }

  /**
   * Get the mercenary type.
   */
  get mercType(): MercenaryType {
    return this._mercType;
  }

  /**
   * Get when this mercenary was hired.
   */
  get hiredAt(): number {
    return this._hiredAt;
  }

  /**
   * Check if someone is the owner of this mercenary.
   */
  isOwner(who: MudObject): boolean {
    if (!this._ownerName) return false;
    const whoName = (who as Living & { name?: string }).name;
    return whoName?.toLowerCase() === this._ownerName.toLowerCase();
  }

  // ========== Follow Behavior ==========

  /**
   * Check if this mercenary is following its owner.
   */
  get following(): boolean {
    return this._following;
  }

  /**
   * Set whether this mercenary should follow its owner.
   */
  set following(value: boolean) {
    this._following = value;
  }

  /**
   * Follow the owner when they move.
   * Called by the mercenary daemon when the owner moves rooms.
   */
  async followOwner(
    owner: MudObject,
    fromRoom: MudObject,
    toRoom: MudObject,
    direction: string
  ): Promise<boolean> {
    if (!this._following) {
      return false;
    }

    // Can't follow if in combat
    if (this.inCombat) {
      const ownerLiving = owner as Living;
      ownerLiving.receive?.(`{yellow}${this.getDisplayName()} is in combat and cannot follow you.{/}\n`);
      return false;
    }

    // Make sure we're in the same room as the owner was
    if (this.environment !== fromRoom) {
      return false;
    }

    // Move to the new room
    const moved = await this.moveTo(toRoom);
    if (!moved) {
      return false;
    }

    // Broadcast follow message to the new room
    const newRoom = toRoom as Room & { broadcast?: (msg: string, opts?: { exclude?: MudObject[] }) => void };
    if (newRoom.broadcast) {
      newRoom.broadcast(
        `{dim}${this.getDisplayName()} follows ${this._ownerName} ${direction}.{/}`,
        { exclude: [owner] }
      );
    }

    return true;
  }

  // ========== Display ==========

  /**
   * Get the display name for messages.
   * Returns "Grimjaw the fighter" if named, or "the mercenary fighter" if not.
   */
  getDisplayName(): string {
    if (this._mercName) {
      return `${this._mercName} the ${this._mercType}`;
    }
    return `the mercenary ${this._mercType}`;
  }

  /**
   * Get the full description for the look command.
   */
  getFullDescription(): string {
    const lines: string[] = [];

    // Long description
    lines.push(this.longDesc);
    lines.push('');

    // Mercenary info
    if (this._mercName) {
      lines.push(`This is ${this._mercName}, a mercenary ${this._mercType} hired by ${this._ownerName}.`);
    } else {
      lines.push(`This mercenary ${this._mercType} is hired by ${this._ownerName}.`);
    }

    // Level
    lines.push(`They appear to be around level ${this.level}.`);

    // Health status
    const healthPct = this.healthPercent;
    let healthDesc: string;
    if (healthPct >= 90) {
      healthDesc = 'in excellent condition';
    } else if (healthPct >= 70) {
      healthDesc = 'in good shape';
    } else if (healthPct >= 50) {
      healthDesc = 'somewhat injured';
    } else if (healthPct >= 30) {
      healthDesc = 'badly wounded';
    } else {
      healthDesc = 'near death';
    }
    lines.push(`They are ${healthDesc}.`);

    // Combat role
    const behavior = this.getBehaviorConfig();
    if (behavior) {
      const roleDesc: Record<string, string> = {
        tank: 'drawing enemy attention and protecting allies',
        healer: 'keeping allies alive with divine magic',
        dps_melee: 'dealing damage from the shadows',
        dps_ranged: 'raining destruction from afar',
      };
      lines.push(`Their role in combat is ${roleDesc[behavior.role] || 'supporting the party'}.`);
    }

    return lines.join('\n');
  }

  // ========== Template Configuration ==========

  /**
   * Configure this mercenary from a template.
   * Sets up level, behavior, skills, and appearance.
   *
   * @param template The mercenary template to use
   * @param level The level for this mercenary
   * @param owner The owner's name
   */
  setFromTemplate(template: MercenaryTemplate, level: number, owner: string): void {
    this._mercType = template.type;
    this._ownerName = owner.toLowerCase();
    this._hiredAt = Date.now();
    this._baseShortDesc = template.shortDesc;
    this.longDesc = template.longDesc;

    // Set name based on type (will be visible in room)
    this.name = `mercenary ${template.type}`;
    this.addId('mercenary');
    this.addId('merc');
    this.addId(template.type);

    // Set level and auto-scale stats
    this.setLevel(level);

    // Set mana based on template
    this.maxMana = template.baseMana + (level * 5);
    this.mana = this.maxMana;

    // BEHAVIOR SYSTEM INTEGRATION
    // This configures the mercenary to use the BehaviorDaemon for combat AI
    this.setBehavior({
      mode: template.behavior.mode,
      role: template.behavior.role,
      guild: template.behavior.guild,
    });

    // Learn role-appropriate skills at scaled level
    const skillLevel = Math.max(1, Math.floor(level / 2));
    this.learnSkills(template.skills, skillLevel);
  }

  // ========== Combat/Attack Control ==========

  /**
   * Check if this mercenary can be attacked.
   * Mercenaries can only be attacked if PK is enabled.
   */
  canBeAttacked(attacker: MudObject): { canAttack: boolean; reason: string } {
    // Get config daemon to check PK setting
    const configDaemon = typeof efuns !== 'undefined'
      ? efuns.findObject('/daemons/config') as { get: <T>(key: string) => T } | undefined
      : undefined;
    const pkEnabled = configDaemon?.get<boolean>('combat.playerKilling') ?? false;

    if (!pkEnabled) {
      return {
        canAttack: false,
        reason: `${this.getDisplayName()} belongs to ${this._ownerName}. Player killing is disabled.`,
      };
    }

    // PK enabled - allow attack
    return { canAttack: true, reason: '' };
  }

  // ========== Death Handling ==========

  /**
   * Called when the mercenary dies.
   * Creates a corpse, notifies owner, removes from registry.
   */
  override async onDeath(): Promise<void> {
    const deathRoom = this.environment;

    // End all combat
    const combatDaemon = getCombatDaemon();
    combatDaemon.endAllCombats(this);

    // Create corpse
    const corpse = new Corpse();
    corpse.ownerName = this._mercName || this.name;
    corpse.isPlayerCorpse = false;
    corpse.level = this.level;

    // Transfer inventory to corpse (if any)
    const items = [...this.inventory];
    for (const item of items) {
      await item.moveTo(corpse);
    }

    // Move corpse to death location
    if (deathRoom) {
      await corpse.moveTo(deathRoom);
    }

    // Start decay timer
    corpse.startDecay();

    // Notify room
    if (deathRoom && 'broadcast' in deathRoom) {
      const broadcast = (deathRoom as MudObject & { broadcast: (msg: string) => void }).broadcast.bind(deathRoom);
      broadcast(`{red}${this.getDisplayName()} has been slain!{/}\n`);
    }

    // Try to notify owner
    if (this._ownerName && typeof efuns !== 'undefined' && efuns.findActivePlayer) {
      const owner = efuns.findActivePlayer(this._ownerName);
      if (owner && 'receive' in owner) {
        (owner as MudObject & { receive: (msg: string) => void }).receive(
          `{red}Your mercenary ${this.getDisplayName()} has been killed!{/}\n`
        );
      }
    }

    // Remove from mercenary daemon registry
    import('../daemons/mercenary.js')
      .then(({ getMercenaryDaemon }) => {
        const mercDaemon = getMercenaryDaemon();
        mercDaemon.removeMercenary(this._mercId);
      })
      .catch(() => {
        // Mercenary daemon not available
      });

    // Destroy the mercenary
    if (typeof efuns !== 'undefined' && efuns.destruct) {
      efuns.callOut(() => {
        efuns.destruct(this);
      }, 1000);
    }
  }

  // ========== Serialization ==========

  /**
   * Serialize the mercenary for saving with player data.
   */
  serialize(): MercenarySaveData {
    // Get skill data from guildData property
    const guildData = this.getProperty('guildData') as {
      skills: Array<{ skillId: string; level: number }>;
    } | undefined;

    const skills: Array<{ id: string; level: number }> = [];
    if (guildData?.skills) {
      for (const skill of guildData.skills) {
        skills.push({ id: skill.skillId, level: skill.level });
      }
    }

    const behavior = this.getBehaviorConfig();

    return {
      mercId: this._mercId,
      type: this._mercType,
      mercName: this._mercName,
      ownerName: this._ownerName || '',
      level: this.level,
      health: this.health,
      maxHealth: this.maxHealth,
      mana: this.mana,
      maxMana: this.maxMana,
      hiredAt: this._hiredAt,
      behaviorConfig: {
        mode: behavior?.mode || 'aggressive',
        role: behavior?.role || 'generic',
        guild: (behavior?.guild || 'fighter') as GuildId,
      },
      skills,
    };
  }

  /**
   * Restore the mercenary from saved data.
   */
  restore(data: MercenarySaveData): void {
    this._mercId = data.mercId;
    this._mercType = data.type;
    this._mercName = data.mercName;
    this._ownerName = data.ownerName;
    this.health = data.health;
    this.maxHealth = data.maxHealth;
    this.mana = data.mana;
    this.maxMana = data.maxMana;
    this._hiredAt = data.hiredAt;

    // Restore behavior config
    this.setBehavior({
      mode: data.behaviorConfig.mode,
      role: data.behaviorConfig.role,
      guild: data.behaviorConfig.guild,
    });

    // Restore skills
    const skillIds = data.skills.map(s => s.id);
    const skillLevel = data.skills.length > 0 ? data.skills[0].level : 1;
    this.learnSkills(skillIds, skillLevel);
  }

  // ========== ID Matching ==========

  /**
   * Override id() to also match mercenary name and type.
   */
  override id(name: string): boolean {
    const lowerName = name.toLowerCase();

    // Check mercenary name
    if (this._mercName && this._mercName.toLowerCase() === lowerName) {
      return true;
    }

    // Check mercenary type
    if (this._mercType.toLowerCase() === lowerName) {
      return true;
    }

    // Fall back to parent implementation
    return super.id(name);
  }

  // ========== Heartbeat Override ==========

  /**
   * Override heartbeat to ensure mercenary combat AI runs.
   * Unlike regular NPCs, mercenaries should also act when their owner
   * is in combat or needs healing, even if the mercenary itself isn't in combat.
   */
  override async heartbeat(): Promise<void> {
    // Call Living's heartbeat for effect ticking (skip NPC behaviors)
    Living.prototype.heartbeat.call(this);

    if (!this.alive) return;

    // If following and owner is not in the room, try to rejoin them
    if (this._following && !this.inCombat) {
      await this.rejoinOwnerIfSeparated();
    }

    // Check if we should trigger behavior AI
    // Mercenaries should act if:
    // 1. They are in combat themselves, OR
    // 2. Their owner is in combat OR needs healing
    const behaviorConfig = super.getBehaviorConfig();
    const shouldTriggerBehavior = behaviorConfig && (
      this.inCombat || this.ownerNeedsBehaviorSupport()
    );

    if (shouldTriggerBehavior) {
      try {
        const { getBehaviorDaemon } = await import('../daemons/behavior.js');
        const behaviorDaemon = getBehaviorDaemon();
        await behaviorDaemon.executeAction(this);
      } catch {
        // Behavior execution failed silently
      }
    }

    // Don't call super.heartbeat() for all the NPC behaviors (wandering, chatting, aggro)
    // Mercenaries are controlled by the behavior system and their owner
  }

  /**
   * If separated from owner, attempt to rejoin them.
   * If owner is offline, dismiss self with a thematic message.
   */
  private async rejoinOwnerIfSeparated(): Promise<void> {
    if (!this._ownerName) return;

    // Check if owner is in the same room
    const ownerInRoom = this.getOwnerInRoom();
    if (ownerInRoom) return; // Owner is here, nothing to do

    // Owner not in room - try to find and rejoin them
    if (typeof efuns === 'undefined' || !efuns.findActivePlayer) return;

    const owner = efuns.findActivePlayer(this._ownerName);
    if (!owner) {
      // Owner is offline - dismiss self with thematic message
      await this.dismissSelfOwnerOffline();
      return;
    }

    const ownerRoom = owner.environment;
    if (!ownerRoom) return; // Owner has no location

    // Don't teleport if owner is in the same room (shouldn't happen, but safety check)
    if (ownerRoom === this.environment) return;

    // Announce departure from current room
    const currentRoom = this.environment as Room;
    if (currentRoom && 'broadcast' in currentRoom) {
      (currentRoom as MudObject & { broadcast: (msg: string) => void })
        .broadcast(`{dim}${this.getDisplayName()} hurries off to find ${this._ownerName}.{/}`);
    }

    // Move to owner's room
    const moved = await this.moveTo(ownerRoom);

    if (moved) {
      // Announce arrival
      if ('broadcast' in ownerRoom) {
        (ownerRoom as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
          .broadcast(`{dim}${this.getDisplayName()} catches up to ${this._ownerName}.{/}`, { exclude: [owner] });
      }

      // Notify the owner
      if ('receive' in owner) {
        (owner as MudObject & { receive: (msg: string) => void })
          .receive(`{cyan}${this.getDisplayName()} catches up to you.{/}\n`);
      }
    }
  }

  /**
   * Dismiss self when owner goes offline.
   * Displays a thematic departure message based on mercenary type.
   */
  private async dismissSelfOwnerOffline(): Promise<void> {
    const currentRoom = this.environment as Room;
    const displayName = this.getDisplayName();

    // Thematic departure messages based on mercenary type
    const departureMessages: Record<MercenaryType, string> = {
      fighter: `${displayName} sheathes their weapon and mutters, "Contract's over if the employer's gone." They stride away purposefully.`,
      mage: `${displayName} closes their spellbook with a sigh. "No patron, no pay." They vanish in a shimmer of arcane light.`,
      thief: `${displayName} glances around nervously. "Boss ain't paying anymore..." They slip into the shadows and disappear.`,
      cleric: `${displayName} offers a brief prayer. "My services are no longer required here." They depart with quiet dignity.`,
    };

    const message = departureMessages[this._mercType] ||
      `${displayName} realizes their employer has departed and takes their leave.`;

    // Broadcast departure to room
    if (currentRoom && 'broadcast' in currentRoom) {
      (currentRoom as MudObject & { broadcast: (msg: string) => void })
        .broadcast(`{yellow}${message}{/}`);
    }

    // Remove from mercenary daemon registry
    try {
      const { getMercenaryDaemon } = await import('../daemons/mercenary.js');
      const mercDaemon = getMercenaryDaemon();
      mercDaemon.removeMercenary(this._mercId);
    } catch {
      // Mercenary daemon not available
    }

    // Destroy the mercenary
    if (typeof efuns !== 'undefined' && efuns.destruct) {
      efuns.destruct(this);
    }
  }

  /**
   * Check if the owner needs behavior support (is in combat or low health).
   */
  private ownerNeedsBehaviorSupport(): boolean {
    if (!this._ownerName) return false;

    // Find owner in the room
    const room = this.environment;
    if (!room) return false;

    for (const obj of room.inventory) {
      const living = obj as Living & { name?: string };
      if (living.name?.toLowerCase() === this._ownerName.toLowerCase()) {
        // Owner found - check if they need support
        if (living.inCombat) return true;

        // Healers should also act if owner is injured
        const behavior = super.getBehaviorConfig();
        if (behavior?.role === 'healer') {
          const healthThreshold = behavior.healAllyThreshold || 70;
          if (living.healthPercent < healthThreshold) return true;
        }

        break;
      }
    }

    return false;
  }

  /**
   * Get the owner Living object if in the same room.
   */
  getOwnerInRoom(): Living | null {
    if (!this._ownerName) return null;

    const room = this.environment;
    if (!room) return null;

    for (const obj of room.inventory) {
      const living = obj as Living & { name?: string };
      if (living.name?.toLowerCase() === this._ownerName.toLowerCase()) {
        return living;
      }
    }

    return null;
  }

  // ========== Behavior Config Override ==========

  /**
   * Get behavior config - includes owner as ally for context building.
   */
  override getBehaviorConfig(): BehaviorConfig | null {
    const config = super.getBehaviorConfig();
    if (!config) return null;

    // Add mercenary-specific flags that the evaluator can check
    return {
      ...config,
      // Mark that this NPC has an owner that should be treated as an ally
      mercenaryOwner: this._ownerName || undefined,
    } as BehaviorConfig & { mercenaryOwner?: string };
  }
}

export default Mercenary;
