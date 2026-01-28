/**
 * Test command - Development/testing utilities for players.
 *
 * Usage:
 *   testcmd npc <name>     - Clone an NPC from the forest (boar, wolf, deer, rabbit)
 *   testcmd equip          - Clone a full set of iron equipment
 *   testcmd gold <amount>  - Add gold to yourself
 *   testcmd heal           - Fully heal yourself (HP and MP)
 *   testcmd exp <amount>   - Add experience points
 *
 * Examples:
 *   testcmd npc wolf
 *   testcmd equip
 *   testcmd gold 1000
 *   testcmd heal
 *   testcmd exp 500
 */

import type { MudObject, Living } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface PlayerWithMethods extends Living {
  addGold?(amount: number): void;
  gainExperience?(amount: number): void;
  mana?: number;
  maxMana?: number;
}

export const name = ['testcmd'];
export const description = 'Development testing utilities';
export const usage = 'testcmd <command> [argument]';

/** Available NPCs in the forest */
const FOREST_NPCS: Record<string, string> = {
  boar: '/areas/valdoria/forest/boar',
  wolf: '/areas/valdoria/forest/wolf',
  deer: '/areas/valdoria/forest/deer',
  rabbit: '/areas/valdoria/forest/rabbit',
};

/** Equipment set to clone */
const EQUIPMENT_SET = [
  { path: '/areas/valdoria/aldric/items/iron_sword', desc: 'an iron sword' },
  { path: '/areas/valdoria/aldric/items/chainmail', desc: 'a chainmail vest' },
  { path: '/areas/valdoria/aldric/items/iron_helm', desc: 'an iron helm' },
  { path: '/areas/valdoria/aldric/items/iron_shield', desc: 'an iron shield' },
];

function showHelp(ctx: CommandContext): void {
  ctx.sendLine('{cyan}Test Command - Development Utilities{/}');
  ctx.sendLine('');
  ctx.sendLine('Usage:');
  ctx.sendLine('  testcmd npc <name>     - Clone an NPC to your room');
  ctx.sendLine('  testcmd equip          - Get a full set of iron equipment');
  ctx.sendLine('  testcmd gold <amount>  - Add gold to yourself');
  ctx.sendLine('  testcmd heal           - Fully restore HP and MP');
  ctx.sendLine('  testcmd exp <amount>   - Add experience points');
  ctx.sendLine('');
  ctx.sendLine('Available NPCs: ' + Object.keys(FOREST_NPCS).join(', '));
  ctx.sendLine('');
  ctx.sendLine('Examples:');
  ctx.sendLine('  testcmd npc wolf');
  ctx.sendLine('  testcmd gold 1000');
  ctx.sendLine('  testcmd exp 500');
}

async function cloneNpc(ctx: CommandContext, npcName: string): Promise<void> {
  const { player } = ctx;

  if (!npcName) {
    ctx.sendLine('Which NPC? Available: ' + Object.keys(FOREST_NPCS).join(', '));
    return;
  }

  const npcPath = FOREST_NPCS[npcName.toLowerCase()];
  if (!npcPath) {
    ctx.sendLine(`Unknown NPC '${npcName}'. Available: ${Object.keys(FOREST_NPCS).join(', ')}`);
    return;
  }

  const room = player.environment;
  if (!room) {
    ctx.sendLine("You're not in a room!");
    return;
  }

  if (typeof efuns === 'undefined' || !efuns.cloneObject) {
    ctx.sendLine('{red}Error: efuns not available.{/}');
    return;
  }

  try {
    const npc = await efuns.cloneObject(npcPath);
    if (npc) {
      await npc.moveTo(room);
      const npcDesc = npc.shortDesc || npc.name || npcName;
      ctx.sendLine(`{green}You summon ${npcDesc} into the room!{/}`);
    } else {
      ctx.sendLine(`{red}Failed to clone ${npcName}.{/}`);
    }
  } catch (error) {
    ctx.sendLine(`{red}Error cloning NPC: ${error}{/}`);
  }
}

async function cloneEquipment(ctx: CommandContext): Promise<void> {
  const { player } = ctx;

  if (typeof efuns === 'undefined' || !efuns.cloneObject) {
    ctx.sendLine('{red}Error: efuns not available.{/}');
    return;
  }

  ctx.sendLine('{cyan}Conjuring equipment...{/}');

  let successCount = 0;
  for (const item of EQUIPMENT_SET) {
    try {
      const obj = await efuns.cloneObject(item.path);
      if (obj) {
        await obj.moveTo(player);
        ctx.sendLine(`{green}  + ${item.desc}{/}`);
        successCount++;
      }
    } catch (error) {
      ctx.sendLine(`{red}  - Failed to create ${item.desc}: ${error}{/}`);
    }
  }

  ctx.sendLine('');
  ctx.sendLine(`{yellow}Received ${successCount} item${successCount !== 1 ? 's' : ''}.{/}`);
}

function addGold(ctx: CommandContext, amountStr: string): void {
  const { player } = ctx;
  const amount = parseInt(amountStr, 10);

  if (!amountStr || isNaN(amount) || amount <= 0) {
    ctx.sendLine('Usage: testcmd gold <amount>');
    ctx.sendLine('Example: testcmd gold 1000');
    return;
  }

  const playerObj = player as PlayerWithMethods;

  if (playerObj.addGold) {
    playerObj.addGold(amount);
    ctx.sendLine(`{yellow}You receive ${amount} gold coin${amount !== 1 ? 's' : ''}!{/}`);
  } else {
    ctx.sendLine('{red}Unable to add gold - method not available.{/}');
  }
}

function healPlayer(ctx: CommandContext): void {
  const { player } = ctx;
  const living = player as PlayerWithMethods;

  if (!('health' in living) || !('maxHealth' in living)) {
    ctx.sendLine('{red}You cannot be healed.{/}');
    return;
  }

  // Heal HP
  const hpHealed = living.maxHealth - living.health;
  living.health = living.maxHealth;

  // Heal MP if available
  let mpHealed = 0;
  if (living.mana !== undefined && living.maxMana !== undefined) {
    mpHealed = living.maxMana - living.mana;
    living.mana = living.maxMana;
  }

  ctx.sendLine('{green}You feel completely restored!{/}');
  if (hpHealed > 0) {
    ctx.sendLine(`{green}  HP restored: +${hpHealed}{/}`);
  }
  if (mpHealed > 0) {
    ctx.sendLine(`{cyan}  MP restored: +${mpHealed}{/}`);
  }
  if (hpHealed === 0 && mpHealed === 0) {
    ctx.sendLine('{dim}  (You were already at full health){/}');
  }
}

function addExperience(ctx: CommandContext, amountStr: string): void {
  const { player } = ctx;
  const amount = parseInt(amountStr, 10);

  if (!amountStr || isNaN(amount) || amount <= 0) {
    ctx.sendLine('Usage: testcmd exp <amount>');
    ctx.sendLine('Example: testcmd exp 500');
    return;
  }

  const playerObj = player as PlayerWithMethods;

  if (playerObj.gainExperience) {
    playerObj.gainExperience(amount);
    // gainExperience already sends a message to the player
  } else {
    ctx.sendLine('{red}Unable to add experience - method not available.{/}');
  }
}

export async function execute(ctx: CommandContext): Promise<void> {
  const { args } = ctx;
  const parts = args.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase() || '';
  const argument = parts.slice(1).join(' ');

  switch (command) {
    case 'npc':
      await cloneNpc(ctx, argument);
      break;

    case 'equip':
    case 'equipment':
    case 'gear':
      await cloneEquipment(ctx);
      break;

    case 'gold':
    case 'money':
      addGold(ctx, argument);
      break;

    case 'heal':
    case 'restore':
      healPlayer(ctx);
      break;

    case 'exp':
    case 'xp':
    case 'experience':
      addExperience(ctx, argument);
      break;

    case 'help':
    case '':
      showHelp(ctx);
      break;

    default:
      ctx.sendLine(`Unknown test command: ${command}`);
      ctx.sendLine('Type "testcmd help" for usage.');
      break;
  }
}

export default { name, description, usage, execute };
