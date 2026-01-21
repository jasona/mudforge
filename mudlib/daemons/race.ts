/**
 * Race Daemon - Manages the race system.
 *
 * Provides race registration, stat bonuses, latent abilities,
 * guild restrictions, and portrait prompt generation.
 *
 * Usage:
 *   const daemon = getRaceDaemon();
 *   daemon.applyRaceBonuses(player, 'elf');
 *   daemon.canJoinGuild('orc', 'cleric');
 */

import { MudObject } from '../std/object.js';
import type { Living, StatName } from '../std/living.js';
import type {
  RaceId,
  RaceDefinition,
  LatentAbility,
} from '../std/race/types.js';
import {
  RACE_DEFINITIONS,
  getAllRaceDefinitions,
  getPlayableRaces,
  getRaceDefinition,
  isValidRaceId,
} from '../std/race/definitions.js';
import {
  applyLatentAbilities,
  removeLatentAbilities,
} from '../std/race/abilities.js';

/**
 * Player interface for race operations.
 */
interface RacePlayer extends Living {
  name: string;
  setProperty(key: string, value: unknown): void;
  getProperty(key: string): unknown;
  setBaseStat(stat: StatName, value: number): void;
  getBaseStat(stat: StatName): number;
  addCombatStatModifier(stat: string, value: number): void;
}

/**
 * Race Daemon class.
 */
export class RaceDaemon extends MudObject {
  private _races: Map<RaceId, RaceDefinition> = new Map();
  private _loaded: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Race Daemon';
    this.longDesc = 'The race daemon manages playable races and their abilities.';

    // Initialize races on construction
    this.initializeRaces();
  }

  /**
   * Initialize all race definitions.
   */
  private initializeRaces(): void {
    const races = getAllRaceDefinitions();
    for (const race of races) {
      this._races.set(race.id, race);
    }
    console.log(`[RaceDaemon] Initialized ${races.length} races`);
    this._loaded = true;

    // Write client data file for the server API
    this.writeClientDataFile();
  }

  /**
   * Write client-facing race data to JSON file.
   * This file is served by the API for the registration UI.
   * The race definitions in definitions.ts are the single source of truth.
   */
  private async writeClientDataFile(): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.writeFile) {
      console.log('[RaceDaemon] efuns not available, skipping client data file write');
      return;
    }

    try {
      const clientData = this.getRaceDataForClient();
      const jsonPath = '/data/races.json';

      // Ensure directory exists
      const dirPath = '/data';
      const dirExists = await efuns.fileExists(dirPath);
      if (!dirExists) {
        await efuns.makeDir(dirPath, true);
      }

      await efuns.writeFile(jsonPath, JSON.stringify(clientData, null, 2));
      console.log(`[RaceDaemon] Wrote client race data to ${jsonPath}`);
    } catch (error) {
      console.error('[RaceDaemon] Failed to write client data file:', error);
    }
  }

  // ==================== Race Registration ====================

  /**
   * Register a custom race definition.
   * Used for expansion content or modding.
   */
  registerRace(race: RaceDefinition): boolean {
    if (this._races.has(race.id)) {
      console.warn(`[RaceDaemon] Race already registered: ${race.id}`);
      return false;
    }

    this._races.set(race.id, race);
    console.log(`[RaceDaemon] Registered race: ${race.name}`);
    return true;
  }

  /**
   * Get a race by ID.
   */
  getRace(id: RaceId): RaceDefinition | undefined {
    return this._races.get(id);
  }

  /**
   * Get all registered races.
   */
  getAllRaces(): RaceDefinition[] {
    return Array.from(this._races.values());
  }

  /**
   * Get all playable races sorted by display order.
   */
  getAllPlayableRaces(): RaceDefinition[] {
    return this.getAllRaces()
      .filter((r) => r.playable)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Check if a race ID is valid.
   */
  isValidRace(id: string): id is RaceId {
    return isValidRaceId(id);
  }

  // ==================== Race Application ====================

  /**
   * Apply race stat bonuses to a player.
   * Should be called during character creation.
   */
  applyRaceBonuses(player: RacePlayer, raceId: RaceId): void {
    const race = this.getRace(raceId);
    if (!race) {
      console.warn(`[RaceDaemon] Unknown race: ${raceId}`);
      return;
    }

    // Apply stat bonuses
    for (const [stat, bonus] of Object.entries(race.statBonuses)) {
      if (bonus !== undefined && bonus !== 0) {
        const currentBase = player.getBaseStat(stat as StatName);
        player.setBaseStat(stat as StatName, currentBase + bonus);
      }
    }

    // Apply combat bonuses
    if (race.combatBonuses) {
      for (const [stat, bonus] of Object.entries(race.combatBonuses)) {
        if (bonus !== undefined && bonus !== 0) {
          player.addCombatStatModifier(stat, bonus);
        }
      }
    }

    console.log(`[RaceDaemon] Applied race bonuses for ${race.name} to ${player.name}`);
  }

  /**
   * Apply latent abilities to a player.
   * Should be called during character creation and on login.
   */
  applyLatentAbilities(player: RacePlayer, raceId: RaceId): void {
    const race = this.getRace(raceId);
    if (!race) {
      console.warn(`[RaceDaemon] Unknown race: ${raceId}`);
      return;
    }

    if (race.latentAbilities.length > 0) {
      applyLatentAbilities(player, race.latentAbilities);
      console.log(`[RaceDaemon] Applied ${race.latentAbilities.length} latent abilities for ${race.name} to ${player.name}`);
    }
  }

  /**
   * Remove latent abilities from a player.
   * Used when changing race (if that feature is ever added).
   */
  removeLatentAbilities(player: RacePlayer, raceId: RaceId): void {
    const race = this.getRace(raceId);
    if (!race) return;

    if (race.latentAbilities.length > 0) {
      removeLatentAbilities(player, race.latentAbilities);
    }
  }

  /**
   * Apply both race bonuses and latent abilities.
   * Convenience method for character creation.
   */
  applyRace(player: RacePlayer, raceId: RaceId): void {
    this.applyRaceBonuses(player, raceId);
    this.applyLatentAbilities(player, raceId);
  }

  // ==================== Guild Integration ====================

  /**
   * Check if a race can join a specific guild.
   */
  canJoinGuild(raceId: RaceId, guildId: string): { canJoin: boolean; reason?: string } {
    const race = this.getRace(raceId);
    if (!race) {
      return { canJoin: true }; // Unknown race, allow by default
    }

    if (race.forbiddenGuilds && race.forbiddenGuilds.includes(guildId)) {
      return {
        canJoin: false,
        reason: `The ${race.name} race cannot join the ${guildId} guild.`,
      };
    }

    return { canJoin: true };
  }

  // ==================== Portrait Integration ====================

  /**
   * Build a portrait prompt that includes race appearance details.
   */
  buildPortraitPrompt(raceId: RaceId, gender: string, description?: string): string {
    const race = this.getRace(raceId);
    if (!race) {
      return description || 'A fantasy adventurer.';
    }

    const appearance = race.appearance;
    const features = appearance.distinctiveFeatures.join(', ') || 'normal features';
    const skinTone = appearance.skinTones[0] || 'normal';
    const eyeColor = appearance.eyeColors[0] || 'brown';

    const parts: string[] = [];

    if (description) {
      parts.push(description);
    } else {
      parts.push(`A ${gender} ${race.name.toLowerCase()} adventurer.`);
    }

    parts.push('');
    parts.push(`Race: ${race.name}`);
    parts.push(`Distinctive features: ${features}`);
    parts.push(`Build: ${appearance.buildDescription}`);
    parts.push(`Skin tone: ${skinTone}`);
    parts.push(`Eye color: ${eyeColor}`);
    parts.push('');
    parts.push('Style hints:');
    parts.push(appearance.portraitStyleHints);

    return parts.join('\n');
  }

  /**
   * Build a race-aware portrait prompt for AI generation.
   * Used by the portrait command.
   */
  buildRaceAwarePrompt(description: string, raceId: RaceId, gender: string): string {
    const race = this.getRace(raceId);
    if (!race) {
      return description;
    }

    const appearance = race.appearance;
    const features = appearance.distinctiveFeatures.length > 0
      ? appearance.distinctiveFeatures.join(', ')
      : '';

    const parts: string[] = [
      `Create a portrait for a fantasy RPG character:`,
      '',
      description,
      '',
      `Race: ${race.name}`,
    ];

    if (features) {
      parts.push(`Distinctive features: ${features}`);
    }

    parts.push(`Build: ${appearance.buildDescription}`);
    parts.push(`Style hints: ${appearance.portraitStyleHints}`);
    parts.push('');
    parts.push('Style requirements:');
    parts.push('- Dark fantasy art style with rich, moody colors');
    parts.push('- Portrait/headshot composition');
    parts.push('- 64x64 pixel icon style');

    return parts.join('\n');
  }

  // ==================== Race Information ====================

  /**
   * Get formatted race information for display.
   */
  getRaceInfo(raceId: RaceId): string {
    const race = this.getRace(raceId);
    if (!race) {
      return 'Unknown race.';
    }

    const lines: string[] = [];

    lines.push(`{bold}{cyan}${race.name}{/}`);
    lines.push('');
    lines.push(race.shortDescription);
    lines.push('');

    // Stat bonuses
    const bonuses = Object.entries(race.statBonuses)
      .filter(([, v]) => v !== 0)
      .map(([stat, bonus]) => {
        const sign = bonus! > 0 ? '+' : '';
        const color = bonus! > 0 ? 'green' : 'red';
        const shortName = stat.substring(0, 3).toUpperCase();
        return `{${color}}${sign}${bonus} ${shortName}{/}`;
      });

    if (bonuses.length > 0) {
      lines.push(`{bold}Stat Bonuses:{/} ${bonuses.join(', ')}`);
    } else {
      lines.push(`{bold}Stat Bonuses:{/} {dim}None (balanced){/}`);
    }

    // Latent abilities
    if (race.latentAbilities.length > 0) {
      const abilities = race.latentAbilities.map((a) => this.formatAbilityName(a));
      lines.push(`{bold}Abilities:{/} ${abilities.join(', ')}`);
    }

    // Guild restrictions
    if (race.forbiddenGuilds && race.forbiddenGuilds.length > 0) {
      lines.push(`{bold}Cannot Join:{/} {red}${race.forbiddenGuilds.join(', ')}{/}`);
    }

    return lines.join('\n');
  }

  /**
   * Get detailed race information including lore.
   */
  getRaceDetails(raceId: RaceId): string {
    const race = this.getRace(raceId);
    if (!race) {
      return 'Unknown race.';
    }

    const lines: string[] = [];

    lines.push(`{bold}{cyan}══════════════════════════════════════════{/}`);
    lines.push(`{bold}                ${race.name.toUpperCase()}{/}`);
    lines.push(`{bold}{cyan}══════════════════════════════════════════{/}`);
    lines.push('');
    lines.push(race.longDescription);
    lines.push('');
    lines.push(`{bold}{yellow}── Statistics ──{/}`);
    lines.push('');

    // Stat bonuses
    const statNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'luck'];
    for (const stat of statNames) {
      const bonus = race.statBonuses[stat as keyof typeof race.statBonuses] || 0;
      if (bonus !== 0) {
        const sign = bonus > 0 ? '+' : '';
        const color = bonus > 0 ? 'green' : 'red';
        const fullName = stat.charAt(0).toUpperCase() + stat.slice(1);
        lines.push(`  {${color}}${sign}${bonus}{/} ${fullName}`);
      }
    }

    if (!Object.values(race.statBonuses).some((v) => v !== 0)) {
      lines.push('  {dim}No stat modifiers (balanced){/}');
    }

    // Latent abilities
    if (race.latentAbilities.length > 0) {
      lines.push('');
      lines.push(`{bold}{yellow}── Racial Abilities ──{/}`);
      lines.push('');
      for (const ability of race.latentAbilities) {
        lines.push(`  {cyan}${this.formatAbilityName(ability)}{/}`);
        lines.push(`    ${this.getAbilityDescription(ability)}`);
      }
    }

    // Appearance
    lines.push('');
    lines.push(`{bold}{yellow}── Appearance ──{/}`);
    lines.push('');
    lines.push(`  Height: ${race.appearance.heightRange}`);
    lines.push(`  Build: ${race.appearance.buildDescription}`);
    if (race.appearance.distinctiveFeatures.length > 0) {
      lines.push(`  Features: ${race.appearance.distinctiveFeatures.join(', ')}`);
    }

    // Guild restrictions
    if (race.forbiddenGuilds && race.forbiddenGuilds.length > 0) {
      lines.push('');
      lines.push(`{bold}{yellow}── Restrictions ──{/}`);
      lines.push('');
      lines.push(`  {red}Cannot join: ${race.forbiddenGuilds.join(', ')}{/}`);
    }

    return lines.join('\n');
  }

  /**
   * Format a latent ability name for display.
   */
  private formatAbilityName(ability: LatentAbility): string {
    const names: Record<LatentAbility, string> = {
      nightVision: 'Night Vision',
      infravision: 'Infravision',
      poisonResistance: 'Poison Resistance',
      magicResistance: 'Magic Resistance',
      fireResistance: 'Fire Resistance',
      coldResistance: 'Cold Resistance',
      naturalArmor: 'Natural Armor',
      fastHealing: 'Fast Healing',
      naturalStealth: 'Natural Stealth',
      keenSenses: 'Keen Senses',
    };
    return names[ability] || ability;
  }

  /**
   * Get a description for a latent ability.
   */
  private getAbilityDescription(ability: LatentAbility): string {
    const descriptions: Record<LatentAbility, string> = {
      nightVision: 'See in darkness as if it were dim light.',
      infravision: 'See heat signatures in complete darkness.',
      poisonResistance: 'Take 50% less damage from poison.',
      magicResistance: 'Take 25% less damage from magical attacks.',
      fireResistance: 'Take 50% less damage from fire.',
      coldResistance: 'Take 50% less damage from cold.',
      naturalArmor: '+2 armor from tough hide.',
      fastHealing: 'Regenerate health 25% faster.',
      naturalStealth: '+5 bonus to stealth checks.',
      keenSenses: '+10 bonus to perception checks.',
    };
    return descriptions[ability] || 'Unknown ability.';
  }

  // ==================== Serialization ====================

  /**
   * Get race data for client-side display (registration).
   * Returns a simplified version without internal implementation details.
   */
  getRaceDataForClient(): Array<{
    id: RaceId;
    name: string;
    shortDescription: string;
    statBonuses: Record<string, number>;
    abilities: string[];
    restrictions?: string[];
  }> {
    return this.getAllPlayableRaces().map((race) => ({
      id: race.id,
      name: race.name,
      shortDescription: race.shortDescription,
      statBonuses: race.statBonuses as Record<string, number>,
      abilities: race.latentAbilities.map((a) => this.formatAbilityName(a)),
      restrictions: race.forbiddenGuilds,
    }));
  }

  // ==================== Status ====================

  get isLoaded(): boolean {
    return this._loaded;
  }

  get raceCount(): number {
    return this._races.size;
  }
}

// Singleton instance
let raceDaemon: RaceDaemon | null = null;

/**
 * Get the RaceDaemon singleton.
 */
export function getRaceDaemon(): RaceDaemon {
  if (!raceDaemon) {
    raceDaemon = new RaceDaemon();
  }
  return raceDaemon;
}

/**
 * Reset the race daemon (for testing).
 */
export function resetRaceDaemon(): void {
  raceDaemon = null;
}

export default RaceDaemon;
