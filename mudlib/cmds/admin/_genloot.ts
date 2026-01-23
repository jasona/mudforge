/**
 * Genloot command - Generate random loot items for testing (admin only).
 *
 * Usage:
 *   genloot weapon [level] [maxQuality]  - Generate a random weapon
 *   genloot armor [level] [maxQuality]   - Generate a random armor piece
 *   genloot bauble [level] [maxQuality]  - Generate a random bauble
 *   genloot random [level] [maxQuality]  - Generate a random item of any type
 *
 * Quality options: common, uncommon, rare, epic, legendary, unique
 */

import type { MudObject } from '../../lib/std.js';
import { getLootDaemon } from '../../daemons/loot.js';
import type { QualityTier, GeneratedItemType } from '../../std/loot/types.js';

interface CommandContext {
  player: MudObject & {
    inventory: MudObject[];
    receive(msg: string): void;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

const VALID_QUALITIES: QualityTier[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'unique'];
const VALID_TYPES: (GeneratedItemType | 'random')[] = ['weapon', 'armor', 'bauble', 'random'];

export const name = ['genloot', 'genitem'];
export const description = 'Generate random loot items for testing (admin only)';
export const usage = 'genloot <weapon|armor|bauble|random> [level] [maxQuality]';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim().split(/\s+/);

  if (args.length === 0 || !args[0]) {
    showHelp(ctx);
    return;
  }

  const itemType = args[0].toLowerCase() as GeneratedItemType | 'random';
  if (!VALID_TYPES.includes(itemType)) {
    ctx.sendLine(`{red}Invalid item type: ${args[0]}{/}`);
    ctx.sendLine(`{dim}Valid types: ${VALID_TYPES.join(', ')}{/}`);
    return;
  }

  // Parse level (default: 10)
  const level = args[1] ? parseInt(args[1], 10) : 10;
  if (isNaN(level) || level < 1 || level > 50) {
    ctx.sendLine('{red}Level must be a number between 1 and 50.{/}');
    return;
  }

  // Parse max quality (default: legendary)
  let maxQuality: QualityTier = 'legendary';
  if (args[2]) {
    const quality = args[2].toLowerCase() as QualityTier;
    if (!VALID_QUALITIES.includes(quality)) {
      ctx.sendLine(`{red}Invalid quality: ${args[2]}{/}`);
      ctx.sendLine(`{dim}Valid qualities: ${VALID_QUALITIES.join(', ')}{/}`);
      return;
    }
    maxQuality = quality;
  }

  // Generate the item
  const lootDaemon = getLootDaemon();

  try {
    let item: MudObject | null = null;

    // Force the exact quality specified (admin testing always forces quality)
    const forcedQuality = true;

    switch (itemType) {
      case 'weapon':
        item = await lootDaemon.generateWeapon(level, maxQuality, undefined, forcedQuality);
        break;
      case 'armor':
        item = await lootDaemon.generateArmor(level, maxQuality, undefined, forcedQuality);
        break;
      case 'bauble':
        item = await lootDaemon.generateBauble(level, maxQuality, forcedQuality);
        break;
      case 'random':
        item = await lootDaemon.generateRandomItem(level, maxQuality, undefined, forcedQuality);
        break;
    }

    if (!item) {
      ctx.sendLine('{red}Failed to generate item.{/}');
      return;
    }

    // Move item to player's inventory
    await item.moveTo(ctx.player);

    // Display success message with item details
    ctx.sendLine('{green}Generated item:{/}');
    ctx.sendLine(`  Name: ${item.shortDesc}`);
    ctx.sendLine(`  Level: {cyan}${level}{/}`);

    // Get and display item details
    const genData = (item as MudObject & { getGeneratedItemData?: () => unknown }).getGeneratedItemData?.();
    if (genData && typeof genData === 'object') {
      const data = genData as Record<string, unknown>;
      ctx.sendLine(`  Quality: {bold}${data.quality}{/}`);
      ctx.sendLine(`  Value: {yellow}${data.value} gold{/}`);
      ctx.sendLine(`  Weight: ${data.weight} lbs`);

      // Display type-specific info
      if (data.generatedType === 'weapon') {
        ctx.sendLine(`  Damage: {red}${data.minDamage}-${data.maxDamage}{/}`);
        ctx.sendLine(`  Type: ${data.weaponType}`);
      } else if (data.generatedType === 'armor') {
        ctx.sendLine(`  Armor: {blue}${data.armor}{/}`);
        ctx.sendLine(`  Slot: ${data.armorSlot}`);
      }

      // Display bonuses
      if (data.statBonuses && typeof data.statBonuses === 'object') {
        const bonuses = Object.entries(data.statBonuses as Record<string, number>)
          .filter(([, v]) => v !== 0)
          .map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`)
          .join(', ');
        if (bonuses) {
          ctx.sendLine(`  Stat Bonuses: {green}${bonuses}{/}`);
        }
      }

      if (data.abilities && Array.isArray(data.abilities) && data.abilities.length > 0) {
        ctx.sendLine('  Abilities:');
        for (const ability of data.abilities) {
          const ab = ability as { name: string; description: string };
          ctx.sendLine(`    {cyan}${ab.name}{/}: ${ab.description}`);
        }
      }
    }

    ctx.sendLine('');
    ctx.sendLine('{dim}Item added to your inventory.{/}');
  } catch (error) {
    ctx.sendLine(`{red}Error generating item: ${error}{/}`);
  }
}

function showHelp(ctx: CommandContext): void {
  ctx.sendLine('{cyan}=== Generate Random Loot ==={/}');
  ctx.sendLine('');
  ctx.sendLine('Usage: genloot <type> [level] [maxQuality]');
  ctx.sendLine('');
  ctx.sendLine('{yellow}Types:{/}');
  ctx.sendLine('  weapon  - Generate a random weapon');
  ctx.sendLine('  armor   - Generate a random armor piece');
  ctx.sendLine('  bauble  - Generate a random bauble (jewelry/trinket)');
  ctx.sendLine('  random  - Generate a random item of any type');
  ctx.sendLine('');
  ctx.sendLine('{yellow}Options:{/}');
  ctx.sendLine('  level      - Item level 1-50 (default: 10)');
  ctx.sendLine('  maxQuality - Maximum quality tier (default: legendary)');
  ctx.sendLine('');
  ctx.sendLine('{yellow}Quality Tiers:{/}');
  ctx.sendLine('  common    - {white}White{/} - Basic stats');
  ctx.sendLine('  uncommon  - {bold}{green}Green{/} - +10% stats, minor bonuses');
  ctx.sendLine('  rare      - {bold}{blue}Blue{/} - +20% stats, stat suffix, may have ability');
  ctx.sendLine('  epic      - {bold}{magenta}Purple{/} - +35% stats, 1-2 abilities');
  ctx.sendLine('  legendary - {bold}{yellow}Orange{/} - +50% stats, powerful abilities');
  ctx.sendLine('  unique    - {bold}{cyan}Gold{/} - Named items with unique powers');
  ctx.sendLine('');
  ctx.sendLine('{yellow}Examples:{/}');
  ctx.sendLine('  genloot weapon 20 rare');
  ctx.sendLine('  genloot armor 35 epic');
  ctx.sendLine('  genloot bauble 10');
  ctx.sendLine('  genloot random 50 legendary');
}

export default { name, description, usage, execute };
