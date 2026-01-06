/**
 * Trainer - NPC that can train players in levels and stats.
 *
 * Trainers allow players to:
 * - Level up (when they have enough experience)
 * - Train individual stats (spending experience)
 *
 * Stat training costs scale exponentially as stats get higher.
 * Stats cannot exceed the player's current level (unless builder+).
 */

import { NPC } from './npc.js';
import type { MudObject } from './object.js';
import type { StatName } from './living.js';

/**
 * Configuration for what a trainer can train.
 */
export interface TrainerConfig {
  /** Can this trainer train levels? Default: true */
  canTrainLevel?: boolean;
  /** Which stats can this trainer train? Default: all stats */
  trainableStats?: StatName[];
  /** Cost multiplier for this trainer. Default: 1.0 */
  costMultiplier?: number;
  /** Custom greeting message */
  greeting?: string;
}

/**
 * All available stats that can be trained.
 */
export const ALL_STATS: StatName[] = [
  'strength',
  'intelligence',
  'wisdom',
  'charisma',
  'dexterity',
  'constitution',
  'luck',
];

/**
 * Short names for stats.
 */
export const STAT_SHORT_NAMES: Record<StatName, string> = {
  strength: 'STR',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
  dexterity: 'DEX',
  constitution: 'CON',
  luck: 'LUK',
};

/**
 * Maximum stat value.
 */
const MAX_STAT = 100;

/**
 * Trainer NPC class.
 */
export class Trainer extends NPC {
  private _canTrainLevel: boolean = true;
  private _trainableStats: StatName[] = [...ALL_STATS];
  private _costMultiplier: number = 1.0;
  private _greeting: string = 'Greetings, adventurer! I can help you grow stronger.';

  constructor() {
    super();
    this.shortDesc = 'a trainer';
    this.longDesc = 'This trainer looks like they could teach you a thing or two.';
  }

  /**
   * Configure the trainer's capabilities.
   */
  setTrainerConfig(config: TrainerConfig): void {
    if (config.canTrainLevel !== undefined) {
      this._canTrainLevel = config.canTrainLevel;
    }
    if (config.trainableStats) {
      this._trainableStats = config.trainableStats;
    }
    if (config.costMultiplier !== undefined) {
      this._costMultiplier = Math.max(0.1, config.costMultiplier);
    }
    if (config.greeting) {
      this._greeting = config.greeting;
    }
  }

  /**
   * Check if this trainer can train levels.
   */
  get canTrainLevel(): boolean {
    return this._canTrainLevel;
  }

  /**
   * Get the list of stats this trainer can train.
   */
  get trainableStats(): StatName[] {
    return [...this._trainableStats];
  }

  /**
   * Get the cost multiplier for this trainer.
   */
  get costMultiplier(): number {
    return this._costMultiplier;
  }

  /**
   * Get the trainer's greeting.
   */
  get greeting(): string {
    return this._greeting;
  }

  /**
   * Check if this trainer can train a specific stat.
   */
  canTrainStat(stat: StatName): boolean {
    return this._trainableStats.includes(stat);
  }

  /**
   * Calculate the XP cost to raise a stat by 1 point.
   * Cost scales exponentially as the stat approaches max.
   *
   * Formula: currentStat * 50 * (1.02 ^ currentStat) * costMultiplier
   *
   * Example costs (with multiplier 1.0):
   *   Stat 10: ~610 XP
   *   Stat 30: ~2,730 XP
   *   Stat 50: ~6,725 XP
   *   Stat 70: ~16,565 XP
   *   Stat 90: ~40,805 XP
   */
  calculateStatCost(currentStat: number): number {
    const baseCost = currentStat * 50;
    const scalingFactor = Math.pow(1.02, currentStat);
    return Math.floor(baseCost * scalingFactor * this._costMultiplier);
  }

  /**
   * Calculate the XP cost to level up.
   * Uses the standard formula: nextLevel^2 * 100
   */
  calculateLevelCost(currentLevel: number): number {
    const nextLevel = currentLevel + 1;
    return Math.floor(nextLevel * nextLevel * 100 * this._costMultiplier);
  }

  /**
   * Get the maximum stat value a player can train to.
   * For regular players, this is their current level.
   * For builder+, this is MAX_STAT (100).
   */
  getMaxTrainableStat(player: MudObject): number {
    const playerWithLevel = player as MudObject & {
      level?: number;
      permissionLevel?: number;
    };

    // Builder+ can train to max
    if ((playerWithLevel.permissionLevel ?? 0) >= 1) {
      return MAX_STAT;
    }

    // Regular players are capped at their level
    return Math.min(playerWithLevel.level ?? 1, MAX_STAT);
  }

  /**
   * Check if a player can train a stat (based on level cap).
   */
  canPlayerTrainStat(player: MudObject, stat: StatName): { canTrain: boolean; reason?: string } {
    const playerWithStats = player as MudObject & {
      getBaseStat?: (stat: StatName) => number;
      level?: number;
      permissionLevel?: number;
    };

    if (!playerWithStats.getBaseStat) {
      return { canTrain: false, reason: 'You cannot train stats.' };
    }

    const currentValue = playerWithStats.getBaseStat(stat);
    const maxTrainable = this.getMaxTrainableStat(player);

    if (currentValue >= MAX_STAT) {
      return { canTrain: false, reason: `Your ${stat} is already at maximum (${MAX_STAT}).` };
    }

    if (currentValue >= maxTrainable) {
      return {
        canTrain: false,
        reason: `Your ${stat} (${currentValue}) cannot exceed your level (${playerWithStats.level ?? 1}). Level up first!`,
      };
    }

    return { canTrain: true };
  }

  /**
   * Display training options to a player.
   */
  showTrainingOptions(player: MudObject): void {
    const playerObj = player as MudObject & {
      experience?: number;
      level?: number;
      getBaseStat?: (stat: StatName) => number;
      receive?: (msg: string) => void;
    };

    if (!playerObj.receive) return;

    const exp = playerObj.experience ?? 0;
    const level = playerObj.level ?? 1;

    playerObj.receive(`\n{cyan}${this._greeting}{/}\n\n`);
    playerObj.receive(`{bold}Your Experience:{/} {yellow}${exp} XP{/}\n`);
    playerObj.receive(`{bold}Your Level:{/} {green}${level}{/}\n\n`);

    // Level training
    if (this._canTrainLevel) {
      const levelCost = this.calculateLevelCost(level);
      const canAffordLevel = exp >= levelCost;
      const levelColor = canAffordLevel ? 'green' : 'dim';
      playerObj.receive(`{bold}Level Training:{/}\n`);
      playerObj.receive(`  {${levelColor}}train level{/} - Level up to ${level + 1} ({yellow}${levelCost} XP{/})\n\n`);
    }

    // Stat training
    if (this._trainableStats.length > 0) {
      playerObj.receive(`{bold}Stat Training:{/}\n`);
      const maxTrainable = this.getMaxTrainableStat(player);

      for (const stat of this._trainableStats) {
        const currentValue = playerObj.getBaseStat?.(stat) ?? 1;
        const cost = this.calculateStatCost(currentValue);
        const canAfford = exp >= cost;
        const atMax = currentValue >= MAX_STAT;
        const atLevelCap = currentValue >= maxTrainable;

        let status = '';
        let color = canAfford ? 'green' : 'dim';

        if (atMax) {
          status = ' {magenta}(MAX){/}';
          color = 'dim';
        } else if (atLevelCap) {
          status = ' {yellow}(level up first){/}';
          color = 'dim';
        }

        const shortName = STAT_SHORT_NAMES[stat];
        playerObj.receive(
          `  {${color}}train ${stat}{/} - ${shortName} ${currentValue} → ${currentValue + 1} ({yellow}${cost} XP{/})${status}\n`
        );
      }
    }

    playerObj.receive(`\n{dim}Use "train <option>" to train.{/}\n`);
  }

  /**
   * Attempt to train a player's level.
   * @returns true if training succeeded
   */
  trainLevel(player: MudObject): boolean {
    if (!this._canTrainLevel) {
      this.sayTo(player, "I don't train levels.");
      return false;
    }

    const playerObj = player as MudObject & {
      experience?: number;
      level?: number;
      maxHealth?: number;
      health?: number;
      maxMana?: number;
      mana?: number;
      receive?: (msg: string) => void;
    };

    if (playerObj.experience === undefined || playerObj.level === undefined) {
      this.sayTo(player, "You don't seem to be able to train.");
      return false;
    }

    const cost = this.calculateLevelCost(playerObj.level);
    if (playerObj.experience < cost) {
      this.sayTo(
        player,
        `You need ${cost} XP to reach level ${playerObj.level + 1}. You only have ${playerObj.experience} XP.`
      );
      return false;
    }

    // Deduct XP and level up
    (playerObj as { experience: number }).experience -= cost;
    (playerObj as { level: number }).level++;

    // Apply level up bonuses
    if (playerObj.maxHealth !== undefined) {
      (playerObj as { maxHealth: number }).maxHealth += 10;
      (playerObj as { health: number }).health = (playerObj.health ?? 0) + 10;
    }
    if (playerObj.maxMana !== undefined) {
      (playerObj as { maxMana: number }).maxMana += 5;
      (playerObj as { mana: number }).mana = (playerObj.mana ?? 0) + 5;
    }

    playerObj.receive?.(
      `\n{bold}{yellow}Congratulations! You have reached level ${playerObj.level}!{/}\n`
    );
    playerObj.receive?.(`{green}+10 Max HP, +5 Max Mana{/}\n`);

    this.sayTo(player, `Well done! You are now level ${playerObj.level}.`);
    return true;
  }

  /**
   * Attempt to train a player's stat.
   * @returns true if training succeeded
   */
  trainStat(player: MudObject, stat: StatName): boolean {
    if (!this.canTrainStat(stat)) {
      this.sayTo(player, `I don't train ${stat}.`);
      return false;
    }

    const playerObj = player as MudObject & {
      experience?: number;
      level?: number;
      permissionLevel?: number;
      getBaseStat?: (stat: StatName) => number;
      setBaseStat?: (stat: StatName, value: number) => void;
      receive?: (msg: string) => void;
    };

    if (!playerObj.getBaseStat || !playerObj.setBaseStat) {
      this.sayTo(player, "You don't seem to be able to train.");
      return false;
    }

    // Check level cap
    const capCheck = this.canPlayerTrainStat(player, stat);
    if (!capCheck.canTrain) {
      this.sayTo(player, capCheck.reason ?? "You can't train that right now.");
      return false;
    }

    const currentValue = playerObj.getBaseStat(stat);
    const cost = this.calculateStatCost(currentValue);

    if ((playerObj.experience ?? 0) < cost) {
      this.sayTo(
        player,
        `You need ${cost} XP to raise your ${stat}. You only have ${playerObj.experience ?? 0} XP.`
      );
      return false;
    }

    // Deduct XP and raise stat
    (playerObj as { experience: number }).experience -= cost;
    playerObj.setBaseStat(stat, currentValue + 1);

    const shortName = STAT_SHORT_NAMES[stat];
    playerObj.receive?.(
      `\n{green}Your ${stat} increases to ${currentValue + 1}!{/} {dim}(${shortName} ${currentValue} → ${currentValue + 1}, cost: ${cost} XP){/}\n`
    );

    this.sayTo(player, `Excellent! Your ${stat} is now ${currentValue + 1}.`);
    return true;
  }

  /**
   * Say something to a specific player.
   */
  private sayTo(player: MudObject, message: string): void {
    const playerObj = player as MudObject & { receive?: (msg: string) => void };
    playerObj.receive?.(`{cyan}${this.name} says to you, "${message}"{/}\n`);
  }
}

/**
 * Helper function to check if an object is a Trainer.
 */
export function isTrainer(obj: MudObject): obj is Trainer {
  return obj instanceof Trainer;
}

export default Trainer;
