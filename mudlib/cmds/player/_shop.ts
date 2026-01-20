/**
 * Shop command - Interact with merchants to buy and sell items.
 *
 * Usage:
 *   shop                    - Open shop with the only merchant in room
 *   shop <merchant>         - Open shop with a specific merchant
 *   browse                  - Alias for shop
 *   trade                   - Alias for shop
 */

import type { MudObject } from '../../lib/std.js';
import { Merchant } from '../../std/merchant.js';

interface CommandContext {
  player: MudObject & {
    gold: number;
    addGold(amount: number): void;
    removeGold(amount: number): boolean;
    stats?: { charisma?: number };
    objectId: string;
    inventory: MudObject[];
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Room extends MudObject {
  inventory: MudObject[];
}

export const name = ['shop', 'browse', 'trade'];
export const description = 'Open a shop interface with a merchant';
export const usage = 'shop [merchant name]';

/**
 * Find a merchant by name in the room.
 */
function findMerchant(name: string, contents: MudObject[]): Merchant | undefined {
  const lowerName = name.toLowerCase();
  return contents.find((obj) => {
    if (!(obj instanceof Merchant)) return false;
    // Check against merchant name
    const merchantName = obj.name?.toLowerCase() || '';
    const shortDesc = obj.shortDesc?.toLowerCase() || '';
    return (
      merchantName.includes(lowerName) ||
      shortDesc.includes(lowerName) ||
      (obj.shopName?.toLowerCase().includes(lowerName))
    );
  }) as Merchant | undefined;
}

/**
 * Get all merchants in a room.
 */
function getMerchants(contents: MudObject[]): Merchant[] {
  return contents.filter((obj) => obj instanceof Merchant) as Merchant[];
}

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const room = player.environment as Room | null;

  if (!room) {
    ctx.sendLine('You are floating in a void with no merchants nearby.');
    return;
  }

  const merchants = getMerchants(room.inventory);

  if (merchants.length === 0) {
    ctx.sendLine('There are no merchants here to trade with.');
    return;
  }

  let merchant: Merchant | undefined;

  if (args) {
    // Find specific merchant by name
    merchant = findMerchant(args, room.inventory);
    if (!merchant) {
      ctx.sendLine(`You don't see a merchant named "${args}" here.`);
      if (merchants.length === 1) {
        ctx.sendLine(`Try: shop ${merchants[0].name.split(' ')[0].toLowerCase()}`);
      } else {
        const names = merchants.map((m) => m.name.split(' ')[0].toLowerCase()).join(', ');
        ctx.sendLine(`Available merchants: ${names}`);
      }
      return;
    }
  } else if (merchants.length === 1) {
    // Only one merchant in room
    merchant = merchants[0];
  } else {
    // Multiple merchants, need to specify
    ctx.sendLine('There are multiple merchants here. Please specify which one:');
    for (const m of merchants) {
      ctx.sendLine(`  - ${m.name} (${m.shopName})`);
    }
    ctx.sendLine(`\nUsage: shop <merchant name>`);
    return;
  }

  // Open the shop
  ctx.sendLine(`Opening ${merchant.shopName}...`);
  await merchant.openShop(player);
}

export default {
  name,
  description,
  usage,
  execute,
};
