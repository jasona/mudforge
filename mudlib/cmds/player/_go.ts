/**
 * Go command - Move in a direction.
 */

import type { MudObject } from '../../lib/std.js';
import { getTerrain, type TerrainType, type TerrainDefinition } from '../../lib/terrain.js';

interface CommandContext {
  player: MudObject;
  verb: string;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Exit {
  direction: string;
  destination: string | MudObject;
  description?: string;
  canPass?: (who: MudObject) => boolean | Promise<boolean>;
}

interface Room extends MudObject {
  getExit?(direction: string): Exit | undefined;
  resolveExit?(exit: Exit): MudObject | undefined;
  look?(viewer: MudObject): void;
  glance?(viewer: MudObject): void;
  getTerrain?(): TerrainType;
}

interface Player extends MudObject {
  getConfig?<T = unknown>(key: string): T;
  markExplored?(roomPath: string): boolean;
  sendMapUpdate?(fromRoom?: MudObject): Promise<void> | void;
  canSwim?(): boolean;
  canClimb?(): boolean;
  hasLight?(): boolean;
  hasBoat?(): boolean;
}

interface Living extends MudObject {
  exitMessage?: string;
  enterMessage?: string;
  composeMovementMessage?(template: string, direction: string): string;
  posture?: string;
}

interface BroadcastOptions {
  exclude?: MudObject[];
}

interface BroadcastableRoom extends Room {
  broadcast?(message: string, options?: BroadcastOptions): void;
}

// Default messages
const DEFAULT_EXIT_MESSAGE = '$N leaves $D.';
const DEFAULT_ENTER_MESSAGE = '$N arrives from $D.';

// Opposite directions for enter messages
const OPPOSITE_DIRECTIONS: Record<string, string> = {
  north: 'the south',
  south: 'the north',
  east: 'the west',
  west: 'the east',
  up: 'below',
  down: 'above',
  northeast: 'the southwest',
  northwest: 'the southeast',
  southeast: 'the northwest',
  southwest: 'the northeast',
  in: 'outside',
  out: 'inside',
  enter: 'outside',
  exit: 'inside',
};

function getOppositeDirection(direction: string): string {
  return OPPOSITE_DIRECTIONS[direction.toLowerCase()] || `the ${direction}`;
}

function composeMessage(template: string, name: string, direction: string): string {
  const capName = name.charAt(0).toUpperCase() + name.slice(1);
  return template
    .replace(/\$N/g, capName)
    .replace(/\$n/g, name.toLowerCase())
    .replace(/\$D/g, direction);
}

// Direction aliases
const DIRECTION_ALIASES: Record<string, string> = {
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west',
  u: 'up',
  d: 'down',
  ne: 'northeast',
  nw: 'northwest',
  se: 'southeast',
  sw: 'southwest',
};

// All valid direction names and aliases
export const name = [
  'go',
  'north', 'south', 'east', 'west', 'up', 'down',
  'n', 's', 'e', 'w', 'u', 'd',
  'northeast', 'northwest', 'southeast', 'southwest',
  'ne', 'nw', 'se', 'sw',
  'in', 'out', 'enter', 'exit',
];
export const description = 'Move in a direction';
export const usage = 'go <direction> or just <direction>';

export async function execute(ctx: CommandContext): Promise<boolean> {
  const { player, verb, args } = ctx;
  const room = player.environment as Room | null;

  if (!room) {
    ctx.sendLine("You can't go anywhere from here.");
    return false;
  }

  // Check if player is sitting - must stand first
  const living = player as Living;
  if (living.posture === 'sitting') {
    ctx.sendLine("You need to stand up first.");
    return false;
  }

  // Check if legs are disabled
  const livingWithLegs = living as Living & { hasLegsDisabled?: () => boolean };
  if (livingWithLegs.hasLegsDisabled && livingWithLegs.hasLegsDisabled()) {
    ctx.sendLine("{red}Your legs are disabled - you cannot move!{/}");
    return false;
  }

  // Determine direction
  let direction: string;
  if (verb === 'go') {
    if (!args) {
      ctx.sendLine('Go where?');
      return false;
    }
    direction = args.toLowerCase();
  } else {
    // The verb itself is the direction
    direction = verb.toLowerCase();
  }

  // Expand aliases
  direction = DIRECTION_ALIASES[direction] || direction;

  // Try to find the exit
  if (!room.getExit) {
    ctx.sendLine("There's nowhere to go.");
    return false;
  }

  const exit = room.getExit(direction);
  if (!exit) {
    ctx.sendLine(`You can't go ${direction}.`);
    return false;
  }

  // Check if exit has a condition
  if (exit.canPass) {
    const canPass = await exit.canPass(player);
    if (!canPass) {
      ctx.sendLine("Something prevents you from going that way.");
      return false;
    }
  }

  // Resolve the exit to get the actual destination room
  if (!room.resolveExit) {
    ctx.sendLine("There's nowhere to go.");
    return false;
  }

  const destination = await room.resolveExit(exit);
  if (!destination) {
    ctx.sendLine(`The way ${direction} seems blocked.`);
    return false;
  }

  // Check terrain requirements for the destination
  const destRoom = destination as Room;
  if (destRoom.getTerrain) {
    const terrainType = destRoom.getTerrain();
    const terrainDef = getTerrain(terrainType);

    const playerWithAbilities = player as Player;

    // Check swim requirement
    if (terrainDef.requiresSwim) {
      const canSwim = playerWithAbilities.canSwim?.() ?? false;
      const hasBoat = playerWithAbilities.hasBoat?.() ?? false;
      if (!canSwim && !hasBoat) {
        ctx.sendLine("{yellow}You can't enter that water - you need to know how to swim or have a boat.{/}");
        return false;
      }
    }

    // Check climb requirement
    if (terrainDef.requiresClimb) {
      const canClimb = playerWithAbilities.canClimb?.() ?? false;
      if (!canClimb) {
        ctx.sendLine("{yellow}The terrain is too steep - you need climbing equipment or skill.{/}");
        return false;
      }
    }

    // Check light requirement (warn but don't block)
    if (terrainDef.requiresLight) {
      const hasLight = playerWithAbilities.hasLight?.() ?? false;
      if (!hasLight) {
        ctx.sendLine("{dim}It's very dark ahead. You may want a light source.{/}");
      }
    }
  }

  // Get player's name for messages
  const livingWithName = player as Living & { name?: string };
  const playerName = livingWithName.name || 'someone';

  // Broadcast exit message to current room (sleeping players filtered automatically)
  const exitRoom = room as BroadcastableRoom;
  if (exitRoom.broadcast) {
    const exitTemplate = livingWithName.exitMessage || DEFAULT_EXIT_MESSAGE;
    const exitMsg = composeMessage(exitTemplate, playerName, direction);
    exitRoom.broadcast(exitMsg, { exclude: [player] });
  }

  // Move the player
  const moved = await player.moveTo(destination);
  if (!moved) {
    ctx.sendLine("Something prevents you from going that way.");
    return false;
  }

  // Send map update to client (fire and forget - don't block movement)
  // Note: markExplored is called by the map daemon, not here
  const playerWithMap = player as Player;
  if (playerWithMap.sendMapUpdate) {
    void playerWithMap.sendMapUpdate(room);
  }

  // Handle party follow - move following members
  import('../../daemons/party.js')
    .then(({ getPartyDaemon }) => {
      const partyDaemon = getPartyDaemon();
      type PartyPlayer = Parameters<typeof partyDaemon.handleLeaderMovement>[0];
      void partyDaemon.handleLeaderMovement(
        player as unknown as PartyPlayer,
        room,
        destination,
        direction
      );
    })
    .catch(() => {
      // Party daemon not available
    });

  // Handle pet follow - move following pets
  import('../../daemons/pet.js')
    .then(({ getPetDaemon }) => {
      const petDaemon = getPetDaemon();
      void petDaemon.handleOwnerMovement(player, room, destination, direction);
    })
    .catch(() => {
      // Pet daemon not available
    });

  // Handle mercenary follow - move following mercenaries
  import('../../daemons/mercenary.js')
    .then(({ getMercenaryDaemon }) => {
      const mercDaemon = getMercenaryDaemon();
      void mercDaemon.handleOwnerMovement(player, room, destination, direction);
    })
    .catch(() => {
      // Mercenary daemon not available
    });

  // Broadcast enter message to new room (sleeping players filtered automatically)
  const enterRoom = destination as BroadcastableRoom;
  if (enterRoom.broadcast) {
    const enterTemplate = livingWithName.enterMessage || DEFAULT_ENTER_MESSAGE;
    const oppositeDir = getOppositeDirection(direction);
    const enterMsg = composeMessage(enterTemplate, playerName, oppositeDir);
    enterRoom.broadcast(enterMsg, { exclude: [player] });
  }

  // Look at the new room (brief mode shows glance, normal shows full look)
  // Execute the look/glance command so that blind checks etc. are applied
  const playerWithConfig = player as Player;
  const briefMode = playerWithConfig.getConfig?.('brief') ?? false;

  if (typeof efuns !== 'undefined' && efuns.executeCommand) {
    const command = briefMode ? 'glance' : 'look';
    // Execute asynchronously but don't block movement
    efuns.executeCommand(player, command, 0).catch(() => {
      // Fallback if command execution fails
      const newRoom = destination as Room;
      if (newRoom.look) {
        newRoom.look(player);
      } else {
        ctx.sendLine(newRoom.shortDesc);
        ctx.sendLine(newRoom.longDesc);
      }
    });
  } else {
    // Fallback if efuns not available
    const newRoom = destination as Room;
    if (newRoom.look) {
      newRoom.look(player);
    } else {
      ctx.sendLine(newRoom.shortDesc);
      ctx.sendLine(newRoom.longDesc);
    }
  }

  // Quest integration: track room exploration for explore objectives
  const playerWithQuests = player as MudObject & { getProperty?: (key: string) => unknown };
  if (playerWithQuests.getProperty) {
    import('../../daemons/quest.js')
      .then(({ getQuestDaemon }) => {
        try {
          const questDaemon = getQuestDaemon();
          const roomPath = destination.objectPath || '';
          type QuestPlayer = Parameters<typeof questDaemon.updateExploreObjective>[0];
          questDaemon.updateExploreObjective(player as unknown as QuestPlayer, roomPath);
        } catch {
          // Quest daemon may not be initialized yet
        }
      })
      .catch(() => {
        // Ignore import errors
      });
  }

  return true;
}

export default { name, description, usage, execute };
