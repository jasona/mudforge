/**
 * Combat Daemon - Manages all active combats in the game.
 *
 * Central manager for combat tracking, round scheduling, and combat resolution.
 * Uses variable timing based on attacker's weapon speed and dexterity.
 */

import { MudObject } from '../lib/std.js';
import type { Living, Weapon, DamageType, CombatEntry, RoundResult, AttackResult } from '../lib/std.js';
import type { ConfigDaemon } from './config.js';
import { getQuestDaemon } from './quest.js';

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

    // Check nohassle: Builder+ with nohassle on cannot initiate combat with NPCs
    if (this.hasNohassle(attacker) && this.isNPC(defender)) {
      attacker.receive("{yellow}You have nohassle enabled. Use 'nohassle off' to fight NPCs.{/}\n");
      return false;
    }

    // Start combat state on both sides
    attacker.startCombat(defender);

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
        this.executeRound(key);
      }, roundTime);
    }

    this._combats.set(key, entry);

    // Notify both parties
    attacker.receive(`{red}You attack ${defender.name}!{/}\n`);
    defender.receive(`{red}${attacker.name} attacks you!{/}\n`);

    // Notify room
    const room = attacker.environment;
    if (room && 'broadcast' in room) {
      (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`{red}${attacker.name} attacks ${defender.name}!{/}\n`, {
          exclude: [attacker, defender],
        });
    }

    return true;
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

    // Clear combat states
    if (living.combatTarget) {
      living.endCombat();
    }

    // Remove combats from tracking
    for (const key of toRemove) {
      const entry = this._combats.get(key);
      if (entry) {
        // Clear combat state on the other party
        if (entry.attacker === living && entry.defender.combatTarget === living) {
          entry.defender.endCombat();
        } else if (entry.defender === living && entry.attacker.combatTarget === living) {
          entry.attacker.endCombat();
        }
      }
      this._combats.delete(key);
    }
  }

  /**
   * Execute a combat round.
   */
  async executeRound(key: string): Promise<void> {
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

    // Check wimpy for defender (before checking death - give them a chance to flee)
    if (!result.defenderDied && defender.alive) {
      const defenderFled = await this.checkWimpy(defender, entry);
      if (defenderFled) {
        return; // Combat ended due to flee
      }
    }

    // Check wimpy for attacker (in case of thorns damage)
    if (!result.attackerDied && attacker.alive) {
      const attackerFled = await this.checkWimpy(attacker, entry);
      if (attackerFled) {
        return; // Combat ended due to flee
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
        this.executeRound(key);
      }, nextRoundTime);
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

    // Get weapon(s)
    const weapons = attacker.getWieldedWeapons();
    const mainWeapon = weapons.mainHand || null;
    const offWeapon = weapons.offHand || null;

    // Main hand attack
    const mainAttack = this.resolveAttack(attacker, defender, mainWeapon);
    attacks.push(mainAttack);
    totalDamage += mainAttack.finalDamage;

    // Off-hand attack (if dual-wielding with light weapon)
    if (offWeapon && offWeapon !== mainWeapon) {
      if ('handedness' in offWeapon && (offWeapon as Weapon).handedness === 'light') {
        const offAttack = this.resolveAttack(attacker, defender, offWeapon);
        attacks.push(offAttack);
        totalDamage += offAttack.finalDamage;
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

    // Initialize result
    const result: AttackResult = {
      attacker,
      defender,
      weapon,
      hit: false,
      miss: false,
      critical: false,
      blocked: false,
      dodged: false,
      baseDamage: 0,
      finalDamage: 0,
      damageType: weapon?.damageType || 'bludgeoning',
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
    }

    // Set messages
    this.setHitMessages(result);

    return result;
  }

  /**
   * Calculate hit chance.
   * Formula: 75 + toHit + (ATK_DEX - 10) * 2 + (ATK_LUCK / 10)
   *          - toDodge - (DEF_DEX - 10) * 2
   */
  calculateHitChance(attacker: Living, defender: Living): number {
    const toHit = attacker.getCombatStat('toHit');
    const toDodge = defender.getCombatStat('toDodge');
    const atkDex = attacker.getStat('dexterity');
    const defDex = defender.getStat('dexterity');
    const atkLuck = attacker.getStat('luck');

    const hitChance = 75
      + toHit
      + (atkDex - 10) * 2
      + (atkLuck / 10)
      - toDodge
      - (defDex - 10) * 2;

    // Clamp between 5% and 95%
    return Math.max(5, Math.min(95, hitChance));
  }

  /**
   * Calculate dodge chance.
   * Formula: toDodge + (DEX - 10) * 2
   */
  calculateDodgeChance(defender: Living): number {
    const toDodge = defender.getCombatStat('toDodge');
    const dex = defender.getStat('dexterity');

    const dodgeChance = toDodge + (dex - 10) * 2;
    return Math.max(0, Math.min(50, dodgeChance));
  }

  /**
   * Calculate block chance (requires shield).
   * Formula: toBlock + (STR / 10)
   */
  calculateBlockChance(defender: Living): number {
    // Check if defender has a shield equipped
    const offHand = defender.getEquipped('off_hand');
    const hasShield = offHand && 'slot' in offHand && (offHand as { slot: string }).slot === 'off_hand';

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
      // Unarmed damage (1d4 + STR bonus)
      baseDamage = Math.floor(Math.random() * 4) + 1;
      baseDamage += Math.floor((attacker.getStat('strength') - 10) / 2);
    }

    // Add combat stat damage bonus
    baseDamage += attacker.getCombatStat('damageBonus');

    return Math.max(1, baseDamage);
  }

  /**
   * Check if damage type is physical.
   */
  isPhysicalDamage(type: DamageType): boolean {
    return ['slashing', 'piercing', 'bludgeoning'].includes(type);
  }

  /**
   * Apply armor and resistances.
   */
  applyDefenses(defender: Living, damage: number, damageType: DamageType): number {
    // Get total armor from equipment
    let armor = defender.getCombatStat('armorBonus');
    const wornArmor = defender.getWornArmor();

    for (const piece of wornArmor) {
      armor += piece.armorClass;

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
    const weaponName = result.weapon?.shortDesc || 'fists';
    const attackerName = result.attacker.name;
    const defenderName = result.defender.name;

    let hitWord = 'hit';
    if (result.critical) {
      hitWord = '{bold}CRITICALLY hit{/}';
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

    result.attackerMessage = `{red}You ${hitWord} ${defenderName} with your ${weaponName}, ${damageDesc} them for {bold}${result.finalDamage}{/} damage${blockNote}!{/}\n`;
    result.defenderMessage = `{red}${attackerName} ${hitWord} you with their ${weaponName}, ${damageDesc} you for {bold}${result.finalDamage}{/} damage${blockNote}!{/}\n`;
    result.roomMessage = `{red}${attackerName} ${hitWord} ${defenderName} with their ${weaponName}${blockNote}!{/}\n`;
  }

  /**
   * Set messages for a miss.
   */
  setMissMessages(result: AttackResult): void {
    const weaponName = result.weapon?.shortDesc || 'fists';
    const attackerName = result.attacker.name;
    const defenderName = result.defender.name;

    if (result.dodged) {
      result.attackerMessage = `{yellow}You swing at ${defenderName} with your ${weaponName}, but they dodge out of the way!{/}\n`;
      result.defenderMessage = `{yellow}You dodge ${attackerName}'s attack with their ${weaponName}!{/}\n`;
      result.roomMessage = `{yellow}${defenderName} dodges ${attackerName}'s attack!{/}\n`;
    } else {
      result.attackerMessage = `{yellow}You swing at ${defenderName} with your ${weaponName}, but miss!{/}\n`;
      result.defenderMessage = `{yellow}${attackerName} swings at you with their ${weaponName}, but misses!{/}\n`;
      result.roomMessage = `{yellow}${attackerName} swings at ${defenderName} but misses!{/}\n`;
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

    // Clear combat states
    if (attacker.combatTarget === defender) {
      attacker.endCombat();
    }

    // Send appropriate message
    switch (reason) {
      case 'separated':
        attacker.receive(`{yellow}Combat with ${defender.name} ended - target left.{/}\n`);
        break;
      case 'fled':
        attacker.receive(`{yellow}Combat with ${defender.name} ended - you fled.{/}\n`);
        defender.receive(`{yellow}${attacker.name} fled from combat!{/}\n`);
        break;
    }
  }

  /**
   * Handle death of a combatant.
   * Override in subclasses or call external handlers for XP/loot.
   */
  handleDeath(victim: Living, killer: Living): void {
    // Notify both parties
    victim.receive(`{red}{bold}You have been slain by ${killer.name}!{/}\n`);
    killer.receive(`{green}You have slain ${victim.name}!{/}\n`);

    // Notify room
    const room = killer.environment;
    if (room && 'broadcast' in room) {
      (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`{red}${victim.name} has been slain by ${killer.name}!{/}\n`, {
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
        .broadcast(`{yellow}${living.name} panics and flees ${fleeDirection}!{/}\n`, {
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
        .broadcast(`{yellow}${attacker.name} flees ${fleeDirection}!{/}\n`, {
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
