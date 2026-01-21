/**
 * race - View race information.
 *
 * Usage:
 *   race        - Show your race info
 *   race list   - List all playable races
 *   race info <name> - Detailed race info
 */

import type { MudObject } from '../../lib/std.js';
import { getRaceDaemon } from '../../daemons/race.js';
import { getLoreDaemon } from '../../daemons/lore.js';
import type { RaceId, RaceDefinition } from '../../std/race/types.js';

interface RacePlayer extends MudObject {
  name: string;
  race: RaceId;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['race', 'races'];
export const description = 'View race information';
export const usage = 'race [list | info <name>]';

export function execute(ctx: CommandContext): void {
  const player = ctx.player as RacePlayer;
  const args = ctx.args.trim().toLowerCase();
  const raceDaemon = getRaceDaemon();

  // No args - show player's race
  if (!args) {
    const raceInfo = raceDaemon.getRaceInfo(player.race);
    ctx.sendLine('');
    ctx.sendLine(raceInfo);
    ctx.sendLine('');
    ctx.sendLine('{dim}Use "race list" to see all races, "race info <name>" for details.{/}');
    return;
  }

  // Parse subcommand
  const [subcommand, ...rest] = args.split(/\s+/);
  const raceName = rest.join(' ');

  // List all playable races
  if (subcommand === 'list' || subcommand === 'l') {
    const races = raceDaemon.getAllPlayableRaces();

    ctx.sendLine('');
    ctx.sendLine('{bold}{cyan}══════════════════════════════════════════{/}');
    ctx.sendLine('              {bold}PLAYABLE RACES{/}');
    ctx.sendLine('{bold}{cyan}══════════════════════════════════════════{/}');
    ctx.sendLine('');

    for (const race of races) {
      const isYours = race.id === player.race;
      const marker = isYours ? ' {green}(your race){/}' : '';

      // Format stat bonuses
      const bonuses = Object.entries(race.statBonuses)
        .filter(([, v]) => v !== 0)
        .map(([stat, bonus]) => {
          const sign = bonus! > 0 ? '+' : '';
          const color = bonus! > 0 ? 'green' : 'red';
          const shortName = stat.substring(0, 3).toUpperCase();
          return `{${color}}${sign}${bonus}${shortName}{/}`;
        });

      const bonusStr = bonuses.length > 0 ? bonuses.join(' ') : '{dim}balanced{/}';

      ctx.sendLine(`{bold}{cyan}${race.name}{/}${marker}`);
      ctx.sendLine(`  ${race.shortDescription}`);
      ctx.sendLine(`  Stats: ${bonusStr}`);

      if (race.latentAbilities.length > 0) {
        const abilities = race.latentAbilities.map((a) => formatAbilityName(a));
        ctx.sendLine(`  Abilities: {yellow}${abilities.join(', ')}{/}`);
      }

      if (race.forbiddenGuilds && race.forbiddenGuilds.length > 0) {
        ctx.sendLine(`  {red}Cannot join: ${race.forbiddenGuilds.join(', ')}{/}`);
      }

      ctx.sendLine('');
    }

    ctx.sendLine('{dim}Use "race info <name>" for detailed information about a race.{/}');
    return;
  }

  // Detailed info for a specific race
  if (subcommand === 'info' || subcommand === 'i') {
    if (!raceName) {
      ctx.sendLine('{red}Usage: race info <race name>{/}');
      ctx.sendLine('Example: race info elf');
      return;
    }

    // Find race by name (case-insensitive partial match)
    const races = raceDaemon.getAllPlayableRaces();
    const matchingRace = races.find(
      (r) =>
        r.id === raceName ||
        r.name.toLowerCase() === raceName ||
        r.name.toLowerCase().startsWith(raceName)
    );

    if (!matchingRace) {
      ctx.sendLine(`{red}Unknown race: ${raceName}{/}`);
      ctx.sendLine('Use "race list" to see all available races.');
      return;
    }

    const details = buildRaceDetailsFromLore(matchingRace);
    ctx.sendLine('');
    ctx.sendLine(details);
    return;
  }

  // Try to interpret as race name
  const races = raceDaemon.getAllPlayableRaces();
  const matchingRace = races.find(
    (r) =>
      r.id === subcommand ||
      r.name.toLowerCase() === subcommand ||
      r.name.toLowerCase().startsWith(subcommand)
  );

  if (matchingRace) {
    const details = buildRaceDetailsFromLore(matchingRace);
    ctx.sendLine('');
    ctx.sendLine(details);
    return;
  }

  // Unknown command
  ctx.sendLine('{red}Unknown command. Usage:{/}');
  ctx.sendLine('  race        - Show your race info');
  ctx.sendLine('  race list   - List all playable races');
  ctx.sendLine('  race info <name> - Detailed race info');
  ctx.sendLine('  race <name> - Quick race lookup');
}

/**
 * Format a latent ability name for display.
 */
function formatAbilityName(ability: string): string {
  const names: Record<string, string> = {
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
 * Get ability description.
 */
function getAbilityDescription(ability: string): string {
  const descriptions: Record<string, string> = {
    nightVision: 'See in darkness as if it were dim light.',
    infravision: 'See heat signatures in complete darkness.',
    poisonResistance: 'Take 50% less damage from poison.',
    magicResistance: 'Take 25% less damage from magical attacks.',
    fireResistance: 'Take 50% less damage from fire.',
    coldResistance: 'Take 50% less damage from cold.',
    naturalArmor: '+2 armor from tough hide.',
    fastHealing: 'Regenerate health 25% faster.',
    naturalStealth: '+5 bonus to dodge.',
    keenSenses: '+10 bonus to perception checks.',
  };
  return descriptions[ability] || 'Unknown ability.';
}

/**
 * Build detailed race information from lore entry.
 */
function buildRaceDetailsFromLore(race: RaceDefinition): string {
  const loreDaemon = getLoreDaemon();
  const loreEntry = loreDaemon.getLore(race.loreEntryId);

  const lines: string[] = [];

  lines.push(`{bold}{cyan}══════════════════════════════════════════{/}`);
  lines.push(`{bold}                ${race.name.toUpperCase()}{/}`);
  lines.push(`{bold}{cyan}══════════════════════════════════════════{/}`);
  lines.push('');

  // Use lore entry content for the description
  if (loreEntry) {
    lines.push(loreEntry.content);
  } else {
    lines.push(race.shortDescription);
  }
  lines.push('');

  // Statistics section
  lines.push(`{bold}{yellow}── Statistics ──{/}`);
  lines.push('');

  const statNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'luck'];
  let hasStats = false;
  for (const stat of statNames) {
    const bonus = race.statBonuses[stat as keyof typeof race.statBonuses] || 0;
    if (bonus !== 0) {
      hasStats = true;
      const sign = bonus > 0 ? '+' : '';
      const color = bonus > 0 ? 'green' : 'red';
      const fullName = stat.charAt(0).toUpperCase() + stat.slice(1);
      lines.push(`  {${color}}${sign}${bonus}{/} ${fullName}`);
    }
  }

  if (!hasStats) {
    lines.push('  {dim}No stat modifiers (balanced){/}');
  }

  // Racial abilities from lore
  if (race.latentAbilities.length > 0) {
    lines.push('');
    lines.push(`{bold}{yellow}── Racial Abilities ──{/}`);
    lines.push('');
    for (const ability of race.latentAbilities) {
      lines.push(`  {cyan}${formatAbilityName(ability)}{/}`);
      lines.push(`    ${getAbilityDescription(ability)}`);
    }
  }

  // Appearance section
  lines.push('');
  lines.push(`{bold}{yellow}── Appearance ──{/}`);
  lines.push('');
  lines.push(`  Height: ${race.appearance.heightRange}`);
  lines.push(`  Build: ${race.appearance.buildDescription}`);
  if (race.appearance.distinctiveFeatures.length > 0) {
    lines.push(`  Features: ${race.appearance.distinctiveFeatures.join(', ')}`);
  }
  if (race.appearance.skinTones.length > 0) {
    lines.push(`  Skin tones: ${race.appearance.skinTones.slice(0, 4).join(', ')}`);
  }
  if (race.appearance.eyeColors.length > 0) {
    lines.push(`  Eye colors: ${race.appearance.eyeColors.slice(0, 4).join(', ')}`);
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

export default { name, description, usage, execute };
