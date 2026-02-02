/**
 * Combat Daemon - Manages all active combats in the game.
 *
 * Central manager for combat tracking, round scheduling, and combat resolution.
 * Uses variable timing based on attacker's weapon speed and dexterity.
 */

import { MudObject } from '../std/object.js';
import type { Living, Weapon, DamageType, CombatEntry, RoundResult, AttackResult } from '../lib/std.js';
import type { NaturalAttack } from '../std/combat/types.js';
import type { ConfigDaemon } from './config.js';
import { getQuestDaemon } from './quest.js';
import { getAggroDaemon } from './aggro.js';
import { capitalizeName } from '../lib/text-utils.js';

// Pet type check helper (avoids circular dependency with pet.ts)
function isPet(obj: unknown): obj is { canBeAttacked: (attacker: MudObject) => { canAttack: boolean; reason: string } } {
  return obj !== null && typeof obj === 'object' && 'canBeAttacked' in obj && typeof (obj as Record<string, unknown>).canBeAttacked === 'function';
}

/**
 * Base round time in milliseconds.
 */
const BASE_ROUND_TIME = 3000;

/**
 * Minimum and maximum round times.
 */
const MIN_ROUND_TIME = 1000;
const MAX_ROUND_TIME = 5000;

/**
 * Combat Daemon class.
 */
export class CombatDaemon extends MudObject {
  /** Active combats tracked by "attacker#defender" key */
  private _combats: Map<string, CombatEntry> = new Map();

  constructor() {
    super();
    this.shortDesc = 'Combat Daemon';
    this.longDesc = 'The combat daemon manages all active combats.';
  }

  /**
   * Generate a unique key for a combat pair.
   */
  private combatKey(attacker: Living, defender: Living): string {
    return `${attacker.objectId}#${defender.objectId}`;
  }

  /**
   * Calculate round time based on attacker's stats and equipment.
   * Formula: BASE_ROUND_TIME / max(0.5, 1 + attackSpeed + weaponSpeed)
   *          - (DEX - 10) / 5 * 100ms
   *          + encumbrance penalty
   */
  calculateRoundTime(attacker: Living): number {
    // Get attack speed from combat stats
    const attackSpeed = attacker.getCombatStat('attackSpeed');

    // Get weapon speed (if wielding a weapon)
    let weaponSpeed = 0;
    const weapons = attacker.getWieldedWeapons();
    if (weapons.mainHand && 'attackSpeed' in weapons.mainHand) {
      weaponSpeed = (weapons.mainHand as Weapon & { attackSpeed?: number }).attackSpeed || 0;
    }

    // Calculate speed modifier
    const speedModifier = Math.max(0.5, 1 + attackSpeed + weaponSpeed);

    // Calculate base time
    let roundTime = BASE_ROUND_TIME / speedModifier;

    // Apply dexterity bonus (each point over 10 reduces time by 20ms)
    const dex = attacker.getStat('dexterity');
    roundTime -= ((dex - 10) / 5) * 100;

    // Apply encumbrance penalty (increases round time)
    if (typeof attacker.getEncumbrancePenalties === 'function') {
      const penalties = attacker.getEncumbrancePenalties();
      if (penalties.attackSpeedPenalty > 0) {
        // Increase round time by the penalty percentage
        roundTime *= (1 + penalties.attackSpeedPenalty);
      }
    }

    // Clamp to valid range
    return Math.max(MIN_ROUND_TIME, Math.min(MAX_ROUND_TIME, Math.round(roundTime)));
  }

  /**
   * Check if a living is a player (has permissionLevel property - only players have this).
   */
  private isPlayer(living: Living): boolean {
    const asPlayer = living as Living & { permissionLevel?: number; isConnected?: () => boolean };
    // Players have permissionLevel property (0=player, 1=builder, etc.)
    return typeof asPlayer.permissionLevel === 'number';
  }

  /**
   * Get a living's permission level (0 = player, 1+ = builder+).
   * Returns -1 for NPCs.
   */
  private getPermissionLevel(living: Living): number {
    const asPlayer = living as Living & { permissionLevel?: number };
    return asPlayer.permissionLevel ?? -1;
  }

  /**
   * Check if a living is builder+ (permission level >= 1).
   */
  private isBuilderPlus(living: Living): boolean {
    return this.getPermissionLevel(living) >= 1;
  }

  /**
   * Check if a living is an NPC (not a player).
   */
  private isNPC(living: Living): boolean {
    return !this.isPlayer(living);
  }

  /**
   * Check if a living has nohassle enabled.
   * Only applies to builder+ (returns false for regular players and NPCs).
   */
  private hasNohassle(living: Living): boolean {
    if (!this.isBuilderPlus(living)) {
      return false;
    }

    const livingWithProps = living as Living & { getProperty?: (key: string) => unknown };
    if (!livingWithProps.getProperty) {
      return true; // Default to nohassle on for builder+ if can't check
    }

    // Default to true (nohassle on) if not set
    const nohassle = livingWithProps.getProperty('nohassle');
    return nohassle !== false;
  }

  /**
   * Initiate combat between attacker and defender.
   */
  initiateCombat(attacker: Living, defender: Living): boolean {
    const key = this.combatKey(attacker, defender);

    // Check if already in combat with this target
    if (this._combats.has(key)) {
      return false;
    }

    // Check if attacker can fight
    if (!attacker.alive) {
      attacker.receive("You can't fight while dead!\n");
      return false;
    }

    // Check if defender can be fought
    if (!defender.alive) {
      attacker.receive(`${defender.name} is already dead!\n`);
      return false;
    }

    // Check if they're in the same room
    if (attacker.environment !== defender.environment) {
      attacker.receive(`${defender.name} is not here!\n`);
      return false;
    }

    // Check if player-killing is allowed
    if (this.isPlayer(attacker) && this.isPlayer(defender)) {
      const configDaemon = typeof efuns !== 'undefined'
        ? efuns.findObject('/daemons/config') as ConfigDaemon | undefined
        : undefined;
      const pkEnabled = configDaemon?.get<boolean>('combat.playerKilling') ?? false;

      if (!pkEnabled) {
        attacker.receive("{yellow}Player killing is not allowed on this mud.{/}\n");
        return false;
      }
    }

    // Regular players can never attack builder+ (regardless of PK setting)
    if (this.isPlayer(attacker) && this.isBuilderPlus(defender)) {
      const attackerLevel = this.getPermissionLevel(attacker);
      if (attackerLevel === 0) {
        attacker.receive("{yellow}You cannot attack staff members.{/}\n");
        return false;
      }
    }

    // Check nohassle: NPCs cannot initiate combat with builder+ who have nohassle on
    if (this.isNPC(attacker) && this.hasNohassle(defender)) {
      // Silently fail - NPCs don't get messages
      return false;
    }

    // Check if attacking a pet - requires PK to be enabled
    if (isPet(defender)) {
      const petCheck = defender.canBeAttacked(attacker);
      if (!petCheck.canAttack) {
        attacker.receive(`{yellow}${petCheck.reason}{/}\n`);
        return false;
      }
    }

    // Check nohassle: Builder+ with nohassle on cannot initiate combat with NPCs
    if (this.hasNohassle(attacker) && this.isNPC(defender)) {
      attacker.receive("{yellow}You have nohassle enabled. Use 'nohassle off' to fight NPCs.{/}\n");
      return false;
    }

    // Start combat state on both sides
    attacker.startCombat(defender);

    // NPC retaliation: if defender is an NPC and not already attacking back, they retaliate
    // This is done via callOut to avoid recursive initiateCombat during this call
    if (this.isNPC(defender) && !this._combats.has(this.combatKey(defender, attacker))) {
      if (typeof efuns !== 'undefined' && efuns.callOut) {
        efuns.callOut(() => {
          try {
            // Double-check they're still alive and in the same room
            if (defender.alive && attacker.alive && defender.environment === attacker.environment) {
              this.initiateCombat(defender, attacker);
            }
          } catch (error) {
            console.error('[CombatDaemon] Error in NPC retaliation:', error);
          }
        }, 100); // Small delay to avoid recursion issues
      }
    }

    // Create combat entry
    const now = Date.now();
    const roundTime = this.calculateRoundTime(attacker);

    const entry: CombatEntry = {
      attacker,
      defender,
      startTime: now,
      roundCount: 0,
      nextRoundTime: now + roundTime,
      callOutId: 0, // Will be set below
    };

    // Schedule first round
    if (typeof efuns !== 'undefined' && efuns.callOut) {
      entry.callOutId = efuns.callOut(() => {
        this.executeRound(key).catch((error) => {
          console.error('[CombatDaemon] Error executing first combat round:', error);
        });
      }, roundTime);
    }

    this._combats.set(key, entry);

    // Notify both parties
    attacker.receive(`{red}You attack ${capitalizeName(defender.name)}!{/}\n`);
    defender.receive(`{red}${capitalizeName(attacker.name)} attacks you!{/}\n`);

    // Notify room
    const room = attacker.environment;
    if (room && 'broadcast' in room) {
      (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`{red}${capitalizeName(attacker.name)} attacks ${capitalizeName(defender.name)}!{/}\n`, {
          exclude: [attacker, defender],
        });
    }

    // Send combat target update to the attacker's client
    this.sendCombatTargetUpdate(attacker, defender);

    // Start combat music for players entering combat
    this.startCombatMusic(attacker);
    this.startCombatMusic(defender);

    // Party auto-assist: trigger party members to attack the same target
    import('./party.js')
      .then(({ getPartyDaemon }) => {
        const partyDaemon = getPartyDaemon();
        partyDaemon.handleLeaderCombat(attacker as Parameters<typeof partyDaemon.handleLeaderCombat>[0], defender);
      })
      .catch((error) => {
        console.error('[CombatDaemon] Error loading party daemon:', error);
      });

    return true;
  }

  /**
   * Start combat music for a player if not already playing.
   * Uses the 'combat' category with 'combat-music' as the sound/ID.
   */
  private startCombatMusic(living: Living): void {
    if (!this.isPlayer(living)) return;

    // Only start if this is their first combat (not already in combat music)
    // Check if they already have combat music playing by checking if they're in any other combat
    let otherCombats = 0;
    for (const entry of this._combats.values()) {
      if (entry.attacker === living || entry.defender === living) {
        otherCombats++;
      }
    }
    // If they're only in this one combat (the one being initiated), start music
    if (otherCombats <= 1 && typeof efuns !== 'undefined' && efuns.loopSound) {
      efuns.loopSound(living, 'combat', 'combat-music', 'combat-music', { volume: 0.4 });
    }
  }

  /**
   * Stop combat music for a player.
   */
  private stopCombatMusic(living: Living): void {
    if (!this.isPlayer(living)) return;

    // Only stop if they have no more active combats
    let activeCombats = 0;
    for (const entry of this._combats.values()) {
      if (entry.attacker === living || entry.defender === living) {
        activeCombats++;
      }
    }
    // If no more combats, stop the music
    if (activeCombats === 0 && typeof efuns !== 'undefined' && efuns.stopSound) {
      efuns.stopSound(living, 'combat', 'combat-music');
    }
  }

  /**
   * End combat between attacker and defender.
   */
  endCombat(attacker: Living, defender: Living): boolean {
    const key = this.combatKey(attacker, defender);
    const entry = this._combats.get(key);

    if (!entry) {
      return false;
    }

    // Cancel scheduled round
    if (entry.callOutId && typeof efuns !== 'undefined' && efuns.removeCallOut) {
      efuns.removeCallOut(entry.callOutId);
    }

    // Clear combat state
    attacker.endCombat();

    // Remove from tracking
    this._combats.delete(key);

    return true;
  }

  /**
   * End all combats for a living (when they die or leave).
   */
  endAllCombats(living: Living): void {
    // Find all combats involving this living
    const toRemove: string[] = [];

    for (const [key, entry] of this._combats) {
      if (entry.attacker === living || entry.defender === living) {
        // Cancel scheduled round
        if (entry.callOutId && typeof efuns !== 'undefined' && efuns.removeCallOut) {
          efuns.removeCallOut(entry.callOutId);
        }
        toRemove.push(key);
      }
    }

    // Clear combat states and send panel clear messages
    if (living.combatTarget) {
      living.endCombat();
    }

    // Clear combat panel for the living if they are a player
    this.sendCombatTargetUpdate(living, null);

    // Remove combats from tracking
    for (const key of toRemove) {
      const entry = this._combats.get(key);
      if (entry) {
        // Clear combat state on the other party
        if (entry.attacker === living && entry.defender.combatTarget === living) {
          entry.defender.endCombat();
          // Clear combat panel for the defender (if they're a player attacking the dying living)
          this.sendCombatTargetUpdate(entry.defender, null);
        } else if (entry.defender === living && entry.attacker.combatTarget === living) {
          entry.attacker.endCombat();
          // Clear combat panel for the attacker
          this.sendCombatTargetUpdate(entry.attacker, null);
        }
      }
      this._combats.delete(key);

      // Stop combat music for the other party (after combat removed from tracking)
      if (entry) {
        if (entry.attacker === living) {
          this.stopCombatMusic(entry.defender);
        } else {
          this.stopCombatMusic(entry.attacker);
        }
      }
    }

    // Stop combat music for the living (after all their combats are removed)
    this.stopCombatMusic(living);
  }

  /**
   * Execute a combat round.
   */
  async executeRound(key: string): Promise<void> {
    try {
      const entry = this._combats.get(key);
      if (!entry) return;

      const { attacker, defender } = entry;

      // Check if combat should end
      if (!attacker.alive || !defender.alive) {
        this.handleCombatEnd(entry, !attacker.alive ? 'attacker_died' : 'defender_died');
        return;
      }

      // Check if they're still in the same room
      if (attacker.environment !== defender.environment) {
        this.handleCombatEnd(entry, 'separated');
        return;
      }

      // Execute the round
      entry.roundCount++;
      const result = this.resolveRound(attacker, defender);

      // Send messages
      this.sendRoundMessages(result);

      // Update combat target panel with new health values (only if defender still alive)
      // If defender died, the clear will be sent by handleCombatEnd below
      if (!result.defenderDied && defender.alive) {
        this.sendCombatTargetUpdate(attacker, defender);
      }

      // Check wimpy for defender (before checking death - give them a chance to flee)
      if (!result.defenderDied && defender.alive) {
        try {
          const defenderFled = await this.checkWimpy(defender, entry);
          if (defenderFled) {
            return; // Combat ended due to flee
          }
        } catch (error) {
          console.error('[CombatDaemon] Error in defender wimpy check:', error);
        }
      }

      // Check wimpy for attacker (in case of thorns damage)
      if (!result.attackerDied && attacker.alive) {
        try {
          const attackerFled = await this.checkWimpy(attacker, entry);
          if (attackerFled) {
            return; // Combat ended due to flee
          }
        } catch (error) {
          console.error('[CombatDaemon] Error in attacker wimpy check:', error);
        }
      }

      // Check for death
      if (result.defenderDied) {
        this.handleCombatEnd(entry, 'defender_died');
        this.handleDeath(defender, attacker);
        return;
      }

      if (result.attackerDied) {
        this.handleCombatEnd(entry, 'attacker_died');
        this.handleDeath(attacker, defender);
        return;
      }

      // Schedule next round
      const nextRoundTime = this.calculateRoundTime(attacker);
      entry.nextRoundTime = Date.now() + nextRoundTime;

      if (typeof efuns !== 'undefined' && efuns.callOut) {
        entry.callOutId = efuns.callOut(() => {
          this.executeRound(key).catch((error) => {
            console.error('[CombatDaemon] Error executing combat round:', error);
          });
        }, nextRoundTime);
      }
    } catch (error) {
      console.error('[CombatDaemon] Unhandled error in executeRound:', error);
    }
  }

  /**
   * Resolve a single combat round.
   */
  resolveRound(attacker: Living, defender: Living): RoundResult {
    const attacks: AttackResult[] = [];
    let totalDamage = 0;
    let attackerDied = false;

    // Check if attacker is stunned
    if (attacker.isStunned()) {
      attacker.receive('{yellow}You are stunned and cannot attack!{/}\n');
      return {
        attacker,
        defender,
        attacks: [],
        totalDamage: 0,
        defenderDied: false,
        attackerDied: false,
      };
    }

    // Check if both arms are disabled
    const attackerWithArms = attacker as Living & {
      areBothArmsDisabled?: () => boolean;
      hasArmDisabled?: (arm: 'left' | 'right' | 'any') => boolean;
    };
    if (attackerWithArms.areBothArmsDisabled && attackerWithArms.areBothArmsDisabled()) {
      attacker.receive('{yellow}Both of your arms are disabled - you cannot attack!{/}\n');
      return {
        attacker,
        defender,
        attacks: [],
        totalDamage: 0,
        defenderDied: false,
        attackerDied: false,
      };
    }

    // Get weapon(s)
    const weapons = attacker.getWieldedWeapons();
    const mainWeapon = weapons.mainHand || null;
    const offWeapon = weapons.offHand || null;

    // Check right arm for main hand attack
    const rightArmDisabled = attackerWithArms.hasArmDisabled && attackerWithArms.hasArmDisabled('right');

    // Main hand attack (requires right arm)
    if (!rightArmDisabled) {
      const mainAttack = this.resolveAttack(attacker, defender, mainWeapon);
      attacks.push(mainAttack);
      totalDamage += mainAttack.finalDamage;
    } else {
      attacker.receive('{yellow}Your right arm is disabled - you cannot attack with your main hand!{/}\n');
    }

    // Check left arm for off-hand attack
    const leftArmDisabled = attackerWithArms.hasArmDisabled && attackerWithArms.hasArmDisabled('left');

    // Off-hand attack (if dual-wielding with light weapon, requires left arm)
    if (offWeapon && offWeapon !== mainWeapon) {
      if ('handedness' in offWeapon && (offWeapon as Weapon).handedness === 'light') {
        if (!leftArmDisabled) {
          const offAttack = this.resolveAttack(attacker, defender, offWeapon);
          attacks.push(offAttack);
          totalDamage += offAttack.finalDamage;
        } else {
          attacker.receive('{yellow}Your left arm is disabled - you cannot attack with your off hand!{/}\n');
        }
      }
    }

    // Handle thorns damage
    let thornsDamage = defender.getThornsDamage();
    if (thornsDamage > 0 && totalDamage > 0) {
      // Builder+ cannot die to thorns - cap damage to leave at least 1 HP
      if (this.isBuilderPlus(attacker)) {
        const maxDamage = attacker.health - 1;
        if (thornsDamage >= maxDamage) {
          thornsDamage = Math.max(0, maxDamage);
          if (thornsDamage > 0) {
            attacker.damage(thornsDamage);
          }
          attacker.receive(`{magenta}You take ${thornsDamage} thorns damage!{/}\n`);
          attacker.receive("{magenta}Your staff powers protect you from death!{/}\n");
        } else {
          attacker.damage(thornsDamage);
          attacker.receive(`{magenta}You take ${thornsDamage} thorns damage!{/}\n`);
        }
      } else {
        attacker.damage(thornsDamage);
        attacker.receive(`{magenta}You take ${thornsDamage} thorns damage!{/}\n`);
        if (!attacker.alive) {
          attackerDied = true;
        }
      }
    }

    return {
      attacker,
      defender,
      attacks,
      totalDamage,
      defenderDied: !defender.alive,
      attackerDied,
    };
  }

  /**
   * Resolve a single attack.
   */
  resolveAttack(attacker: Living, defender: Living, weapon: Weapon | null): AttackResult {
    // Calculate hit chance
    const hitChance = this.calculateHitChance(attacker, defender);
    const hitRoll = Math.random() * 100;
    const hit = hitRoll < hitChance;

    // Get natural attack if weapon is null
    // Check any attacker (NPC or player with transformation) that has getNaturalAttack
    let naturalAttack: NaturalAttack | undefined;
    let damageType: DamageType = weapon?.damageType || 'bludgeoning';

    if (!weapon) {
      const attackerWithNatural = attacker as Living & { getNaturalAttack?: () => NaturalAttack | null };
      if (typeof attackerWithNatural.getNaturalAttack === 'function') {
        const natAtk = attackerWithNatural.getNaturalAttack();
        if (natAtk) {
          naturalAttack = natAtk;
          damageType = natAtk.damageType;
        }
      }
    }

    // Initialize result
    const result: AttackResult = {
      attacker,
      defender,
      weapon,
      naturalAttack,
      hit: false,
      miss: false,
      critical: false,
      blocked: false,
      dodged: false,
      baseDamage: 0,
      finalDamage: 0,
      damageType,
      attackerMessage: '',
      defenderMessage: '',
      roomMessage: '',
    };

    if (!hit) {
      // Check if dodged vs missed
      const dodgeChance = this.calculateDodgeChance(defender);
      const dodgeRoll = Math.random() * 100;

      if (dodgeRoll < dodgeChance) {
        result.dodged = true;
      } else {
        result.miss = true;
      }

      this.setMissMessages(result);
      return result;
    }

    // Attack hits - check for block
    const blockChance = this.calculateBlockChance(defender);
    const blockRoll = Math.random() * 100;
    const blocked = blockRoll < blockChance;

    // Check for critical
    const critChance = this.calculateCritChance(attacker);
    const critRoll = Math.random() * 100;
    const critical = critRoll < critChance;

    // Calculate damage
    let baseDamage = this.calculateBaseDamage(attacker, weapon);
    if (critical) {
      baseDamage *= 2;
      result.critical = true;
    }
    if (blocked) {
      baseDamage *= 0.5;
      result.blocked = true;
    }

    result.hit = true;
    result.baseDamage = baseDamage;

    // Apply armor and resistances
    let finalDamage = this.applyDefenses(defender, baseDamage, result.damageType);

    // Handle invulnerability
    if (defender.isInvulnerable()) {
      finalDamage = 0;
    }

    // Handle damage shields
    if (finalDamage > 0) {
      finalDamage = defender.absorbDamageShield(finalDamage);
    }

    result.finalDamage = Math.max(0, Math.round(finalDamage));

    // Apply damage
    if (result.finalDamage > 0) {
      // Builder+ cannot die in combat - cap damage to leave at least 1 HP
      if (this.isBuilderPlus(defender)) {
        const maxDamage = defender.health - 1;
        if (result.finalDamage >= maxDamage) {
          result.finalDamage = Math.max(0, maxDamage);
          if (result.finalDamage > 0) {
            defender.damage(result.finalDamage);
          }
          defender.receive("{magenta}Your staff powers protect you from death!{/}\n");
        } else {
          defender.damage(result.finalDamage);
        }
      } else {
        defender.damage(result.finalDamage);
      }

      // Generate threat on the NPC defender
      if (this.isNPC(defender)) {
        const npc = defender as Living & { addThreat?: (source: Living, amount: number) => void };
        if (typeof npc.addThreat === 'function') {
          const threat = this.calculateThreat(attacker, 'damage', result.finalDamage, result.damageType);
          npc.addThreat(attacker, threat);
        }
      }
    }

    // Set messages
    this.setHitMessages(result);

    return result;
  }

  /**
   * Calculate hit chance.
   * Formula: 75 + toHit + (ATK_DEX - 10) * 2 + (ATK_LUCK / 10)
   *          - toDodge - (DEF_DEX - 10) * 2 + levelBonus
   *
   * Level bonus: +1% per attacker level above defender, -1% per defender level above attacker
   * Capped at ±10%
   */
  calculateHitChance(attacker: Living, defender: Living): number {
    const toHit = attacker.getCombatStat('toHit');
    const toDodge = defender.getCombatStat('toDodge');
    const atkDex = attacker.getStat('dexterity');
    const defDex = defender.getStat('dexterity');
    const atkLuck = attacker.getStat('luck');

    // Level difference bonus/penalty (capped at ±10)
    const levelDiff = attacker.level - defender.level;
    const levelBonus = Math.max(-10, Math.min(10, levelDiff));

    const hitChance = 75
      + toHit
      + (atkDex - 10) * 2
      + (atkLuck / 10)
      - toDodge
      - (defDex - 10) * 2
      + levelBonus;

    // Clamp between 5% and 95%
    return Math.max(5, Math.min(95, hitChance));
  }

  /**
   * Calculate dodge chance.
   * Formula: toDodge + (DEX - 10) * 2 - encumbrance penalty
   */
  calculateDodgeChance(defender: Living): number {
    const toDodge = defender.getCombatStat('toDodge');
    const dex = defender.getStat('dexterity');

    let dodgeChance = toDodge + (dex - 10) * 2;

    // Apply encumbrance penalty (reduces dodge chance)
    if (typeof defender.getEncumbrancePenalties === 'function') {
      const penalties = defender.getEncumbrancePenalties();
      if (penalties.dodgePenalty > 0) {
        // Reduce dodge chance by the penalty percentage of the max (50)
        dodgeChance -= 50 * penalties.dodgePenalty;
      }
    }

    return Math.max(0, Math.min(50, dodgeChance));
  }

  /**
   * Calculate block chance (requires shield).
   * Formula: toBlock + (STR / 10)
   */
  calculateBlockChance(defender: Living): number {
    // Check if defender has a shield equipped (shields are in off_hand slot)
    const offHand = defender.getEquipped('off_hand');
    // Check if the equipped item is a shield (has isShield property or slot === 'shield')
    const hasShield = offHand && (
      ('isShield' in offHand && (offHand as { isShield: boolean }).isShield) ||
      ('slot' in offHand && (offHand as { slot: string }).slot === 'shield')
    );

    if (!hasShield) {
      return 0;
    }

    const toBlock = defender.getCombatStat('toBlock');
    const str = defender.getStat('strength');

    const blockChance = toBlock + (str / 10);
    return Math.max(0, Math.min(50, blockChance));
  }

  /**
   * Calculate critical hit chance.
   * Formula: 5 + toCritical + (LUCK / 5)
   */
  calculateCritChance(attacker: Living): number {
    const toCritical = attacker.getCombatStat('toCritical');
    const luck = attacker.getStat('luck');

    const critChance = 5 + toCritical + (luck / 5);
    return Math.max(0, Math.min(50, critChance));
  }

  /**
   * Calculate base damage.
   * Formula: weapon.roll(min, max) + statBonus + damageBonus
   */
  calculateBaseDamage(attacker: Living, weapon: Weapon | null): number {
    let baseDamage: number;

    if (weapon) {
      // Weapon damage
      baseDamage = weapon.rollDamage();

      // Stat bonus based on damage type
      const damageType = weapon.damageType;
      if (this.isPhysicalDamage(damageType)) {
        baseDamage += Math.floor((attacker.getStat('strength') - 10) / 2);
      } else {
        baseDamage += Math.floor((attacker.getStat('intelligence') - 10) / 2);
      }
    } else {
      // Check if NPC with level-based damage
      const npcAttacker = attacker as Living & { getBaseDamageRange?: () => { min: number; max: number } };
      if (typeof npcAttacker.getBaseDamageRange === 'function') {
        // NPC uses level-based damage range
        const range = npcAttacker.getBaseDamageRange();
        const min = range.min || 1;
        const max = range.max || 2;
        baseDamage = min + Math.floor(Math.random() * (max - min + 1));
        baseDamage += Math.floor((attacker.getStat('strength') - 10) / 2);
      } else {
        // Player unarmed damage (1d4 + STR bonus)
        baseDamage = Math.floor(Math.random() * 4) + 1;
        baseDamage += Math.floor((attacker.getStat('strength') - 10) / 2);
      }
    }

    // Add combat stat damage bonus
    baseDamage += attacker.getCombatStat('damageBonus');

    // Safeguard against NaN
    if (isNaN(baseDamage)) {
      baseDamage = 1;
    }

    return Math.max(1, baseDamage);
  }

  /**
   * Check if damage type is physical.
   */
  isPhysicalDamage(type: DamageType): boolean {
    return ['slashing', 'piercing', 'bludgeoning'].includes(type);
  }

  /**
   * Check if damage type is magical.
   */
  isMagicalDamage(type: DamageType): boolean {
    return ['fire', 'cold', 'lightning', 'arcane', 'holy', 'necrotic', 'poison'].includes(type);
  }

  /**
   * Calculate threat generated from an action.
   * @param source The attacker generating threat
   * @param actionType Type of action (damage, healing, etc.)
   * @param amount Base amount (damage dealt, healing done, etc.)
   * @param damageType Optional damage type for multiplier
   * @returns Calculated threat value
   */
  calculateThreat(source: Living, actionType: 'damage' | 'healing', amount: number, damageType?: DamageType): number {
    let threat = amount;

    // Magic damage generates 30% more threat (mages get targeted)
    if (actionType === 'damage' && damageType && this.isMagicalDamage(damageType)) {
      threat *= 1.3;
    }

    // Healing generates half threat (split among nearby NPCs)
    if (actionType === 'healing') {
      threat *= 0.5;
    }

    // Apply threat modifier effects (e.g., Defensive Stance)
    const effects = source.getActiveEffects?.() ?? [];
    for (const effect of effects) {
      if (effect.type === 'threat_modifier' || (effect as { effectType?: string }).effectType === 'threat_modifier') {
        // Magnitude is a percentage modifier (e.g., 30 = +30%)
        threat *= (1 + effect.magnitude / 100);
      }
    }

    // Stealth/invisibility reduces threat by 30%
    const stealthEffect = effects.find(e =>
      e.type === 'stealth' || e.type === 'invisibility' ||
      (e as { effectType?: string }).effectType === 'stealth' ||
      (e as { effectType?: string }).effectType === 'invisibility'
    );
    if (stealthEffect) {
      threat *= 0.7;
    }

    return Math.floor(threat);
  }

  /**
   * Apply armor and resistances.
   */
  applyDefenses(defender: Living, damage: number, damageType: DamageType): number {
    // Get total armor from equipment
    let armor = defender.getCombatStat('armorBonus');
    const wornArmor = defender.getWornArmor();

    for (const piece of wornArmor) {
      armor += piece.armor || 0;

      // Check resistances
      if (piece.resistances && piece.resistances[damageType]) {
        damage = piece.reduceDamage(damage, damageType);
      }
    }

    // Apply flat armor reduction
    damage -= armor;

    return Math.max(1, damage);
  }

  /**
   * Set messages for a hit.
   */
  setHitMessages(result: AttackResult): void {
    const attackerName = capitalizeName(result.attacker.name);
    const defenderName = capitalizeName(result.defender.name);

    // Determine weapon name and hit verb based on weapon or natural attack
    let weaponName: string;
    let hitVerb: string;

    if (result.weapon) {
      weaponName = result.weapon.shortDesc;
      hitVerb = result.critical ? '{bold}CRITICALLY hit{/}' : 'hit';
    } else if (result.naturalAttack) {
      weaponName = result.naturalAttack.name;
      hitVerb = result.critical
        ? `{bold}CRITICALLY ${result.naturalAttack.hitVerb}{/}`
        : result.naturalAttack.hitVerb;
    } else {
      weaponName = 'fists';
      hitVerb = result.critical ? '{bold}CRITICALLY hit{/}' : 'hit';
    }

    let damageDesc = '';
    if (result.finalDamage < 5) {
      damageDesc = 'barely scratching';
    } else if (result.finalDamage < 15) {
      damageDesc = 'hitting';
    } else if (result.finalDamage < 30) {
      damageDesc = 'striking hard';
    } else {
      damageDesc = 'devastating';
    }

    let blockNote = '';
    if (result.blocked) {
      blockNote = ' (partially blocked)';
    }

    result.attackerMessage = `{red}You ${hitVerb} ${defenderName} with your ${weaponName}, ${damageDesc} them for {bold}${result.finalDamage}{/} damage${blockNote}!{/}\n`;
    result.defenderMessage = `{red}${attackerName} ${hitVerb} you with their ${weaponName}, ${damageDesc} you for {bold}${result.finalDamage}{/} damage${blockNote}!{/}\n`;
    result.roomMessage = `{red}${attackerName} ${hitVerb} ${defenderName} with their ${weaponName}${blockNote}!{/}\n`;
  }

  /**
   * Set messages for a miss.
   */
  setMissMessages(result: AttackResult): void {
    const attackerName = capitalizeName(result.attacker.name);
    const defenderName = capitalizeName(result.defender.name);

    // Determine weapon name and miss verb based on weapon or natural attack
    let weaponName: string;
    let missVerb: string;

    if (result.weapon) {
      weaponName = result.weapon.shortDesc;
      missVerb = 'swing at';
    } else if (result.naturalAttack) {
      weaponName = result.naturalAttack.name;
      missVerb = result.naturalAttack.missVerb;
    } else {
      weaponName = 'fists';
      missVerb = 'swing at';
    }

    if (result.dodged) {
      result.attackerMessage = `{yellow}You ${missVerb} ${defenderName} with your ${weaponName}, but they dodge out of the way!{/}\n`;
      result.defenderMessage = `{yellow}You dodge ${attackerName}'s attack with their ${weaponName}!{/}\n`;
      result.roomMessage = `{yellow}${defenderName} dodges ${attackerName}'s attack!{/}\n`;
    } else {
      result.attackerMessage = `{yellow}You ${missVerb} ${defenderName} with your ${weaponName}, but miss!{/}\n`;
      result.defenderMessage = `{yellow}${attackerName} ${missVerb} you with their ${weaponName}, but misses!{/}\n`;
      result.roomMessage = `{yellow}${attackerName} ${missVerb} ${defenderName} but misses!{/}\n`;
    }
  }

  /**
   * Send round result messages.
   */
  sendRoundMessages(result: RoundResult): void {
    const room = result.attacker.environment;

    for (const attack of result.attacks) {
      result.attacker.receive(attack.attackerMessage);
      result.defender.receive(attack.defenderMessage);

      if (room && 'broadcast' in room) {
        (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
          .broadcast(attack.roomMessage, {
            exclude: [result.attacker, result.defender],
          });
      }
    }
  }

  /**
   * Handle combat ending.
   */
  handleCombatEnd(entry: CombatEntry, reason: 'attacker_died' | 'defender_died' | 'separated' | 'fled'): void {
    const { attacker, defender } = entry;

    // Cancel scheduled round
    if (entry.callOutId && typeof efuns !== 'undefined' && efuns.removeCallOut) {
      efuns.removeCallOut(entry.callOutId);
    }

    // Remove from tracking
    const key = this.combatKey(attacker, defender);
    this._combats.delete(key);

    // Stop combat music for both parties (after combat removed from tracking)
    this.stopCombatMusic(attacker);
    this.stopCombatMusic(defender);

    // Clear combat states
    if (attacker.combatTarget === defender) {
      attacker.endCombat();
    }

    // Clear combat target panel
    this.sendCombatTargetUpdate(attacker, null);

    // Record grudge when combat ends due to separation (player left or fled)
    // Check both directions: player attacked NPC, or NPC attacked player
    if (reason === 'fled' || reason === 'separated') {
      this.recordGrudge(attacker, defender, reason === 'fled');
      this.recordGrudge(defender, attacker, reason === 'fled');
    }

    // Send appropriate message
    switch (reason) {
      case 'separated':
        attacker.receive(`{yellow}You lose sight of ${capitalizeName(defender.name)} as the battle breaks off.{/}\n`);
        break;
      case 'fled':
        attacker.receive(`{yellow}You flee from combat with ${capitalizeName(defender.name)}!{/}\n`);
        defender.receive(`{yellow}${capitalizeName(attacker.name)} flees from combat!{/}\n`);
        break;
    }
  }

  /**
   * Record a grudge if the NPC has threat against the player.
   * @param npcCandidate Potential NPC
   * @param playerCandidate Potential player
   * @param fled Whether the player fled (vs just walked away)
   */
  private recordGrudge(npcCandidate: Living, playerCandidate: Living, fled: boolean): void {
    // Only record if npcCandidate is NPC and playerCandidate is player
    if (!this.isNPC(npcCandidate) || !this.isPlayer(playerCandidate)) {
      return;
    }

    const npc = npcCandidate as Living & {
      getThreat?: (source: Living) => number;
      objectPath?: string;
    };

    if (typeof npc.getThreat !== 'function' || !npc.objectPath) {
      return;
    }

    const threat = npc.getThreat(playerCandidate);
    if (threat <= 0) {
      return;
    }

    try {
      const aggroDaemon = getAggroDaemon();
      const intensity = aggroDaemon.calculateIntensity(threat, fled);
      aggroDaemon.addGrudge({
        npcPath: npc.objectPath,
        playerName: playerCandidate.name?.toLowerCase() || 'unknown',
        totalDamage: threat,
        fleeCount: fled ? 1 : 0,
        lastSeen: Date.now(),
        intensity,
      });
    } catch {
      // Aggro daemon may not be available
    }
  }

  /**
   * Handle death of a combatant.
   * Override in subclasses or call external handlers for XP/loot.
   */
  handleDeath(victim: Living, killer: Living): void {
    // Notify both parties
    victim.receive(`{red}{bold}You have been slain by ${capitalizeName(killer.name)}!{/}\n`);
    killer.receive(`{green}You have slain ${capitalizeName(victim.name)}!{/}\n`);

    // Notify room
    const room = killer.environment;
    if (room && 'broadcast' in room) {
      (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`{red}${capitalizeName(victim.name)} has been slain by ${capitalizeName(killer.name)}!{/}\n`, {
          exclude: [victim, killer],
        });
    }

    // Quest integration: track kills for quest objectives
    const questDaemon = getQuestDaemon();
    const victimPath = victim.objectPath || '';
    const victimId = victim.objectId || '';

    // Update kill objective for the killer
    if ('getProperty' in killer) {
      questDaemon.updateKillObjective(killer as Parameters<typeof questDaemon.updateKillObjective>[0], victimPath, victimId);
    }

    // Also update for all attackers who contributed to the kill
    if ('attackers' in victim) {
      const attackers = (victim as Living & { attackers?: Living[] }).attackers || [];
      for (const attacker of attackers) {
        if (attacker !== killer && 'getProperty' in attacker) {
          questDaemon.updateKillObjective(attacker as Parameters<typeof questDaemon.updateKillObjective>[0], victimPath, victimId);
        }
      }
    }

    // End all combats for the victim
    this.endAllCombats(victim);

    // Let the victim's onDeath handler take over (creates corpse, etc.)
    // This is already called by the Living.health setter when HP reaches 0
  }

  /**
   * Check if a living's wimpy threshold is triggered and handle flee/command.
   * @returns true if the living fled or executed their wimpycmd
   */
  async checkWimpy(living: Living, entry: CombatEntry): Promise<boolean> {
    // Get wimpy settings from player properties
    const livingWithProps = living as Living & {
      getProperty?: (key: string) => unknown;
      permissionLevel?: number;
    };

    if (!livingWithProps.getProperty) {
      return false;
    }

    const wimpyThreshold = (livingWithProps.getProperty('wimpy') as number) ?? 0;
    if (wimpyThreshold <= 0) {
      return false; // Wimpy disabled
    }

    // Check if health is below threshold
    const healthPercent = living.healthPercent;
    if (healthPercent >= wimpyThreshold) {
      return false; // Still above threshold
    }

    // Wimpy triggered!
    const wimpycmd = livingWithProps.getProperty('wimpycmd') as string | undefined;

    if (wimpycmd) {
      // Execute custom wimpycmd
      living.receive(`{yellow}[Wimpy] Your health is at ${healthPercent}%! Executing: ${wimpycmd}{/}\n`);

      if (typeof efuns !== 'undefined' && efuns.executeCommand) {
        try {
          const level = livingWithProps.permissionLevel ?? 0;
          await efuns.executeCommand(living, wimpycmd, level);
          // End combat after executing wimpycmd (they might have fled, healed, etc.)
          this.handleCombatEnd(entry, 'fled');
          return true;
        } catch (error) {
          console.error('[CombatDaemon] Error executing wimpycmd:', error);
          // Fall through to random flee
        }
      }
    }

    // No wimpycmd or it failed - try to flee in a random direction
    return this.wimpyFlee(living, entry);
  }

  /**
   * Attempt to flee in a random direction due to wimpy.
   * @returns true if successfully fled
   */
  private wimpyFlee(living: Living, entry: CombatEntry): boolean {
    // Check if legs are disabled
    const livingWithLegs = living as Living & { hasLegsDisabled?: () => boolean };
    if (livingWithLegs.hasLegsDisabled && livingWithLegs.hasLegsDisabled()) {
      living.receive('{red}[Wimpy] Panic! You try to run but your legs are disabled!{/}\n');
      return false;
    }

    const room = living.environment;
    if (!room || !('getExits' in room)) {
      living.receive('{red}[Wimpy] Panic! You look around frantically but there\'s nowhere to run!{/}\n');
      return false;
    }

    const exits = (room as MudObject & { getExits: () => Map<string, unknown> }).getExits();
    if (exits.size === 0) {
      living.receive('{red}[Wimpy] Panic! You desperately search for an escape but find no exits!{/}\n');
      return false;
    }

    // Pick a random direction
    const exitNames = Array.from(exits.keys());
    const fleeDirection = exitNames[Math.floor(Math.random() * exitNames.length)];

    living.receive(`{yellow}[Wimpy] Your health is critical! You flee ${fleeDirection}!{/}\n`);

    // Notify room
    if ('broadcast' in room) {
      (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`{yellow}${capitalizeName(living.name)} panics and flees ${fleeDirection}!{/}\n`, {
          exclude: [living],
        });
    }

    // End combat
    this.handleCombatEnd(entry, 'fled');

    // Move
    living.moveDirection(fleeDirection);

    return true;
  }

  /**
   * Attempt to flee from combat.
   * @returns true if flee was successful
   */
  attemptFlee(attacker: Living, direction?: string): boolean {
    if (!attacker.inCombat) {
      attacker.receive("You're not in combat!\n");
      return false;
    }

    // Check if legs are disabled
    const attackerWithLegs = attacker as Living & { hasLegsDisabled?: () => boolean };
    if (attackerWithLegs.hasLegsDisabled && attackerWithLegs.hasLegsDisabled()) {
      attacker.receive("{red}Your legs are disabled - you cannot flee!{/}\n");
      return false;
    }

    // DEX check to flee (difficulty 10)
    const fleeCheck = attacker.statCheck('dexterity', 10);

    if (!fleeCheck.success) {
      attacker.receive(`{yellow}You try to flee but can't get away! (rolled ${fleeCheck.roll}+${fleeCheck.bonus} vs 10){/}\n`);
      return false;
    }

    // Get available exits
    const room = attacker.environment;
    if (!room || !('getExits' in room)) {
      attacker.receive("There's nowhere to flee to!\n");
      return false;
    }

    const exits = (room as MudObject & { getExits: () => Map<string, unknown> }).getExits();
    if (exits.size === 0) {
      attacker.receive("There's nowhere to flee to!\n");
      return false;
    }

    // Pick a direction
    let fleeDirection = direction;
    if (!fleeDirection) {
      const exitNames = Array.from(exits.keys());
      fleeDirection = exitNames[Math.floor(Math.random() * exitNames.length)];
    } else if (!exits.has(fleeDirection)) {
      attacker.receive(`You can't flee ${fleeDirection}!\n`);
      return false;
    }

    // End all combats
    this.endAllCombats(attacker);

    // Move in the direction
    attacker.receive(`{yellow}You flee ${fleeDirection}!{/}\n`);

    // Notify room
    if ('broadcast' in room) {
      (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`{yellow}${capitalizeName(attacker.name)} flees ${fleeDirection}!{/}\n`, {
          exclude: [attacker],
        });
    }

    // Actually move
    attacker.moveDirection(fleeDirection);

    return true;
  }

  /**
   * Check if two livings are in combat with each other.
   */
  areInCombat(a: Living, b: Living): boolean {
    const key1 = this.combatKey(a, b);
    const key2 = this.combatKey(b, a);
    return this._combats.has(key1) || this._combats.has(key2);
  }

  /**
   * Get combat entry for an attacker.
   */
  getCombatEntry(attacker: Living): CombatEntry | undefined {
    for (const entry of this._combats.values()) {
      if (entry.attacker === attacker) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Get all active combats.
   */
  getAllCombats(): CombatEntry[] {
    return Array.from(this._combats.values());
  }

  /**
   * Get count of active combats.
   */
  get combatCount(): number {
    return this._combats.size;
  }

  /**
   * Send combat target update to a player's client.
   * @param attacker The player attacking
   * @param target The target (null to clear the panel)
   */
  private sendCombatTargetUpdate(attacker: Living, target: Living | null): void {
    // Only send updates for player attackers with sendCombatTarget method
    try {
      const asPlayer = attacker as Living & { sendCombatTarget?: (target: Living | null) => Promise<void>; name?: string };
      if (typeof asPlayer.sendCombatTarget === 'function') {
        asPlayer.sendCombatTarget(target).catch((error) => {
          console.error(`[CombatDaemon] Error sending combat target update for ${asPlayer.name || 'unknown'}:`, error);
        });
      }
    } catch (error) {
      console.error('[CombatDaemon] Sync error in sendCombatTargetUpdate:', error);
    }
  }
}

// Singleton instance
let combatDaemon: CombatDaemon | null = null;

/**
 * Get the global CombatDaemon instance.
 */
export function getCombatDaemon(): CombatDaemon {
  if (!combatDaemon) {
    combatDaemon = new CombatDaemon();
  }
  return combatDaemon;
}

/**
 * Reset the combat daemon (for testing).
 */
export function resetCombatDaemon(): void {
  if (combatDaemon) {
    // End all active combats
    for (const entry of combatDaemon.getAllCombats()) {
      if (entry.callOutId && typeof efuns !== 'undefined' && efuns.removeCallOut) {
        efuns.removeCallOut(entry.callOutId);
      }
    }
  }
  combatDaemon = null;
}

export default CombatDaemon;
