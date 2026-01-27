/**
 * stat - Display comprehensive player statistics in a GUI modal.
 *
 * Usage:
 *   stat <player>   - Show detailed stats for a connected player
 *
 * Displays a tabbed modal with:
 *   - Overview: Avatar, vitals, XP, gold
 *   - Stats: Core stats with racial/equipment bonuses
 *   - Equipment: Visual grid of equipped items
 *   - Inventory: Grouped list of carried items
 *   - Account: Connection info, playtime, effects
 *
 * Requires builder permission (level 1) or higher.
 */

import type { MudObject } from '../../lib/std.js';
import { openStatModal } from '../../lib/stat-modal.js';

interface CommandContext {
  player: MudObject & {
    name: string;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Player extends MudObject {
  name: string;
  title: string;
  gender: string;
  race: string;
  level: number;
  permissionLevel: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  experience: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  gold: number;
  bankedGold: number;
  playTime: number;
  idleTime: number;
  createdAt: number;
  lastLogin: number;
  alive: boolean;
  avatar: string;
  posture: string;
  inCombat: boolean;
  ipAddress: string;
  resolvedHostname: string | null;
  environment: MudObject | null;
  inventory: MudObject[];
  getProperty(key: string): unknown;
  getStats(): Record<string, number>;
  getBaseStats(): Record<string, number>;
  getStatBonus(stat: string): number;
  getAllEquipped(): Map<string, MudObject>;
  getCarriedWeight(): number;
  getMaxCarryWeight(): number;
  getEncumbranceLevel(): string;
  getEncumbrancePenalties(): { attackSpeedPenalty: number; dodgePenalty: number };
  getEncumbrancePercent(): number;
  getCombatStat(stat: string): number;
  getEffects(): unknown[];
  getExploredRooms(): string[];
  getDisplayAddress(): string;
  isConnected(): boolean;
}

export const name = ['stat'];
export const description = 'Show comprehensive player statistics (builder+)';
export const usage = 'stat <player>';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function execute(ctx: CommandContext): Promise<void> {
  const targetName = ctx.args.trim().toLowerCase();

  if (!targetName) {
    ctx.sendLine('{yellow}Usage: stat <player>{/}');
    ctx.sendLine('{dim}Displays comprehensive player statistics in a GUI modal.{/}');
    ctx.sendLine('');
    ctx.sendLine('{dim}Tabs:{/}');
    ctx.sendLine('  {cyan}Overview{/}   - Avatar, vitals, XP, gold');
    ctx.sendLine('  {cyan}Stats{/}      - Core stats with bonuses');
    ctx.sendLine('  {cyan}Equipment{/}  - Visual equipment grid');
    ctx.sendLine('  {cyan}Inventory{/}  - Grouped item list');
    ctx.sendLine('  {cyan}Account{/}    - Connection info, playtime, effects');
    return;
  }

  // Check efuns availability
  if (typeof efuns === 'undefined' || !efuns.allPlayers) {
    ctx.sendLine('{red}Error: Player lookup not available.{/}');
    return;
  }

  // Find the target player
  const allPlayers = efuns.allPlayers() as Player[];
  let target: Player | undefined;

  // Try exact match first
  target = allPlayers.find((p) => p.name?.toLowerCase() === targetName);

  // Try prefix match if no exact match
  if (!target) {
    target = allPlayers.find((p) => p.name?.toLowerCase().startsWith(targetName));
  }

  if (!target) {
    ctx.sendLine(`{yellow}No player named "${targetName}" is currently online.{/}`);
    ctx.sendLine('{dim}The player must be connected to view their stats.{/}');
    return;
  }

  // Open the stat modal
  try {
    await openStatModal(
      ctx.player as unknown as { name: string },
      target as unknown as Parameters<typeof openStatModal>[1]
    );
    ctx.sendLine(`{green}Opened statistics for ${capitalize(target.name)}.{/}`);
  } catch (error) {
    ctx.sendLine(`{red}Error opening stat modal: ${error}{/}`);
  }
}

export default { name, description, usage, execute };
