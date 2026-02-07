/**
 * summon - Teleport a player to your location.
 *
 * Usage:
 *   summon <player>   - Summon a connected player to your room
 *
 * Requires builder permission (level 1) or higher.
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject & {
    name: string;
    environment: MudObject | null;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Player extends MudObject {
  name: string;
  environment: MudObject | null;
  receive(message: string): void;
  moveTo(destination: MudObject): Promise<boolean>;
}

interface Room extends MudObject {
  broadcast?(message: string, options?: { exclude?: MudObject[] }): void;
  look?(viewer: MudObject): void;
}

export const name = ['summon'];
export const description = 'Teleport a player to your location (builder+)';
export const usage = 'summon <player>';

// Fun summoning messages
const SUMMON_MESSAGES = [
  'The air crackles with eldritch energy as $T is yanked through space and time!',
  'A swirling portal of light opens and $T tumbles through!',
  'Reality bends and warps as $T materializes in a flash of arcane power!',
  'The ground trembles as $T is pulled through the fabric of existence!',
  'A thunderclap echoes as $T appears in a shower of mystical sparks!',
  'The shadows coalesce and deposit $T unceremoniously!',
  'A beam of golden light descends from above, depositing $T!',
  'With a loud *POP*, $T appears looking slightly disoriented!',
];

const TARGET_MESSAGES = [
  'You feel reality twist around you as an irresistible force pulls you elsewhere...',
  'The world spins and blurs as you are magically yanked across space!',
  'A powerful summons tugs at your very being, and you cannot resist!',
  'You feel yourself dissolving and reforming somewhere else entirely!',
  'An arcane tether wraps around you and pulls you through the void!',
];

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)]!;
}

export async function execute(ctx: CommandContext): Promise<void> {
  const targetName = ctx.args.trim().toLowerCase();

  if (!targetName) {
    ctx.sendLine('{yellow}Usage: summon <player>{/}');
    ctx.sendLine('{dim}Summons a connected player to your location.{/}');
    return;
  }

  // Can't summon yourself
  if (targetName === ctx.player.name.toLowerCase()) {
    ctx.sendLine("{yellow}You can't summon yourself!{/}");
    return;
  }

  // Make sure summoner is in a room
  const summonerRoom = ctx.player.environment as Room | null;
  if (!summonerRoom) {
    ctx.sendLine("{red}You aren't anywhere to summon someone to!{/}");
    return;
  }

  // Find the target player
  if (typeof efuns === 'undefined' || !efuns.findConnectedPlayer) {
    ctx.sendLine('{red}Error: Player lookup not available.{/}');
    return;
  }

  const target = efuns.findConnectedPlayer(targetName) as Player | undefined;
  if (!target) {
    // Try partial match with allPlayers
    const allPlayers = efuns.allPlayers ? efuns.allPlayers() : [];
    const found = allPlayers.find((p) => {
      const player = p as Player;
      return player.name?.toLowerCase().startsWith(targetName);
    }) as Player | undefined;

    if (!found) {
      ctx.sendLine(`{yellow}No player named "${targetName}" is currently online.{/}`);
      return;
    }

    // Use the found player
    await performSummon(ctx, found, summonerRoom);
    return;
  }

  await performSummon(ctx, target, summonerRoom);
}

async function performSummon(
  ctx: CommandContext,
  target: Player,
  summonerRoom: Room
): Promise<void> {
  const targetName = efuns.capitalize(target.name);
  const summonerName = efuns.capitalize(ctx.player.name);

  // Get the target's current room for departure message
  const targetRoom = target.environment as Room | null;

  // Send message to target
  const targetMsg = getRandomMessage(TARGET_MESSAGES);
  target.receive(`\n{magenta}${targetMsg}{/}\n`);
  target.receive(`{cyan}${summonerName} has summoned you!{/}\n\n`);

  // Broadcast departure message to target's old room
  if (targetRoom && targetRoom.broadcast && targetRoom !== summonerRoom) {
    targetRoom.broadcast(
      `{magenta}${targetName} vanishes in a flash of light!{/}`,
      { exclude: [target] }
    );
  }

  // Move the target
  const moved = await target.moveTo(summonerRoom);
  if (!moved) {
    ctx.sendLine(`{red}Failed to summon ${targetName}.{/}`);
    return;
  }

  // Broadcast arrival message to summoner's room
  const arrivalMsg = getRandomMessage(SUMMON_MESSAGES).replace(/\$T/g, targetName);
  if (summonerRoom.broadcast) {
    summonerRoom.broadcast(`{magenta}${arrivalMsg}{/}`, { exclude: [target] });
  }

  // Show the room to the target
  if (summonerRoom.look) {
    summonerRoom.look(target);
  }

  // Confirm to summoner
  ctx.sendLine(`{green}You have summoned ${targetName} to your location.{/}`);
}

export default { name, description, usage, execute };
