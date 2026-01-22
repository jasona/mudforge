/**
 * Pet command - Manage your pets.
 *
 * Usage:
 *   pet                           - Show your pets and their status
 *   pet name <newname>            - Name your first pet
 *   pet name <pet> <newname>      - Name a specific pet (by current name or type)
 *   pet follow [pet]              - Make pet(s) follow you
 *   pet stay [pet]                - Make pet(s) stay here
 *   pet inventory [pet]           - See what pet is carrying
 *   pet send [pet]                - Temporarily send pet away
 *   pet recall [pet]              - Recall a sent-away pet
 *   pet dismiss [pet]             - Release/dismiss pet permanently
 *
 * You can address pets by their custom name (e.g., "Shadowmere") or
 * by their type (e.g., "horse", "mule", "dog", "chest").
 */

import type { MudObject, Living } from '../../lib/std.js';
import { getPetDaemon } from '../../daemons/pet.js';
import { Pet } from '../../std/pet.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['pet', 'pets'];
export const description = 'Manage your pets';
export const usage = 'pet | pet name [pet] <newname> | pet follow [pet] | pet stay [pet] | pet inventory [pet] | pet send [pet] | pet recall [pet] | pet dismiss [pet]';

/**
 * Find a pet by name or type from active pets.
 * Searches custom name first, then template type.
 */
function findPetByNameOrType(pets: Pet[], identifier: string): Pet | undefined {
  const lower = identifier.toLowerCase();

  // Try exact custom name match first
  let found = pets.find(p => p.petName?.toLowerCase() === lower);
  if (found) return found;

  // Try template type match
  found = pets.find(p => p.templateType.toLowerCase() === lower);
  if (found) return found;

  // Try partial template type match (e.g., "chest" matches "floating_chest")
  found = pets.find(p => p.templateType.toLowerCase().includes(lower) || lower.includes(p.templateType.toLowerCase()));
  if (found) return found;

  // Try name property (e.g., "floating chest")
  found = pets.find(p => p.name.toLowerCase() === lower || p.name.toLowerCase().includes(lower));
  return found;
}

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const playerName = (player as Living & { name?: string }).name;

  if (!playerName) {
    ctx.sendLine('Error: Could not determine your name.');
    return;
  }

  const petDaemon = getPetDaemon();
  const trimmedArgs = args.trim().toLowerCase();

  // No args - show pet status
  if (!trimmedArgs) {
    showPetStatus(ctx, playerName);
    return;
  }

  // Parse subcommand
  const parts = trimmedArgs.split(/\s+/);
  const subcommand = parts[0];
  const subargs = parts.slice(1).join(' ');

  switch (subcommand) {
    case 'name':
      await handleName(ctx, playerName, args.trim().slice(4).trim()); // Get original case args
      break;
    case 'follow':
      handleFollow(ctx, playerName, subargs || undefined);
      break;
    case 'stay':
      handleStay(ctx, playerName, subargs || undefined);
      break;
    case 'inventory':
    case 'inv':
    case 'i':
      handleInventory(ctx, playerName, subargs);
      break;
    case 'send':
      await handleSend(ctx, playerName, subargs);
      break;
    case 'recall':
      await handleRecall(ctx, player, playerName, subargs);
      break;
    case 'dismiss':
      await handleDismiss(ctx, playerName, subargs);
      break;
    default:
      ctx.sendLine(`Unknown pet command: ${subcommand}`);
      ctx.sendLine('Usage: pet | pet name <name> | pet follow | pet stay | pet inventory | pet send | pet recall | pet dismiss');
      break;
  }
}

/**
 * Show pet status.
 */
function showPetStatus(ctx: CommandContext, ownerName: string): void {
  const petDaemon = getPetDaemon();
  const activePets = petDaemon.getPlayerPets(ownerName);
  const sentAwayPets = petDaemon.getSentAwayPets(ownerName);

  if (activePets.length === 0 && sentAwayPets.length === 0) {
    ctx.sendLine('You do not have any pets.');
    return;
  }

  ctx.sendLine('{bold}Your Pets:{/}');
  ctx.sendLine('');

  // Active pets
  if (activePets.length > 0) {
    ctx.sendLine('{cyan}Active Pets:{/}');
    for (const pet of activePets) {
      const name = pet.petName || pet.templateType;
      const healthPct = pet.healthPercent;
      const following = pet.following ? '{green}following{/}' : '{yellow}staying{/}';
      const items = pet.inventory.length;
      ctx.sendLine(`  ${name} (${pet.templateType}) - HP: ${healthPct}% - ${following} - Carrying: ${items} items`);
    }
    ctx.sendLine('');
  }

  // Sent away pets
  if (sentAwayPets.length > 0) {
    ctx.sendLine('{dim}Sent Away:{/}');
    for (let i = 0; i < sentAwayPets.length; i++) {
      const data = sentAwayPets[i];
      const name = data.petName || data.templateType;
      const items = data.inventory.length;
      ctx.sendLine(`  ${i + 1}. ${name} (${data.templateType}) - Carrying: ${items} items`);
    }
    ctx.sendLine('');
    ctx.sendLine('{dim}Use "pet recall" or "pet recall <name>" to recall a sent-away pet.{/}');
  }
}

/**
 * Handle naming a pet.
 * Syntax: pet name <newname> OR pet name <pet> <newname>
 */
async function handleName(ctx: CommandContext, ownerName: string, argsStr: string): Promise<void> {
  if (!argsStr) {
    ctx.sendLine('Usage: pet name <newname> OR pet name <pet> <newname>');
    ctx.sendLine('Example: pet name Shadowmere');
    ctx.sendLine('Example: pet name horse Shadowmere');
    return;
  }

  const petDaemon = getPetDaemon();
  const pets = petDaemon.getPlayerPets(ownerName);

  if (pets.length === 0) {
    ctx.sendLine('You do not have any active pets to name.');
    return;
  }

  // Parse args - could be "<newname>" or "<pet> <newname>"
  const parts = argsStr.split(/\s+/);
  let pet: Pet;
  let newName: string;

  if (parts.length === 1) {
    // Just a name - use first pet (or only pet)
    if (pets.length > 1) {
      ctx.sendLine('You have multiple pets. Please specify which one:');
      ctx.sendLine('Usage: pet name <pet> <newname>');
      ctx.sendLine('Example: pet name horse Shadowmere');
      return;
    }
    pet = pets[0];
    newName = parts[0];
  } else {
    // <pet> <newname> format
    const petIdentifier = parts[0];
    newName = parts.slice(1).join(' ');

    const found = findPetByNameOrType(pets, petIdentifier);
    if (!found) {
      ctx.sendLine(`You don't have a pet matching "${petIdentifier}".`);
      ctx.sendLine('Use "pet" to see your pets.');
      return;
    }
    pet = found;
  }

  // Validate name (letters only, reasonable length)
  if (!/^[a-zA-Z]+$/.test(newName) || newName.length < 2 || newName.length > 20) {
    ctx.sendLine('Pet names must be 2-20 letters only.');
    return;
  }

  const oldName = pet.petName;
  const capitalizedName = newName.charAt(0).toUpperCase() + newName.slice(1).toLowerCase();

  pet.petName = capitalizedName;

  if (oldName) {
    ctx.sendLine(`You rename ${oldName} to ${capitalizedName}.`);
  } else {
    ctx.sendLine(`You name your ${pet.templateType.replace(/_/g, ' ')} "${capitalizedName}".`);
  }
}

/**
 * Handle setting pet to follow.
 */
function handleFollow(ctx: CommandContext, ownerName: string, petIdentifier?: string): void {
  const petDaemon = getPetDaemon();
  const pets = petDaemon.getPlayerPets(ownerName);

  if (pets.length === 0) {
    ctx.sendLine('You do not have any active pets.');
    return;
  }

  if (petIdentifier) {
    // Specific pet
    const pet = findPetByNameOrType(pets, petIdentifier);
    if (!pet) {
      ctx.sendLine(`You don't have a pet matching "${petIdentifier}".`);
      return;
    }
    pet.following = true;
    ctx.sendLine(`${pet.getDisplayShortDesc()} will now follow you.`);
  } else {
    // All pets
    for (const pet of pets) {
      pet.following = true;
    }
    if (pets.length === 1) {
      ctx.sendLine(`${pets[0].getDisplayShortDesc()} will now follow you.`);
    } else {
      ctx.sendLine('Your pets will now follow you.');
    }
  }
}

/**
 * Handle setting pet to stay.
 */
function handleStay(ctx: CommandContext, ownerName: string, petIdentifier?: string): void {
  const petDaemon = getPetDaemon();
  const pets = petDaemon.getPlayerPets(ownerName);

  if (pets.length === 0) {
    ctx.sendLine('You do not have any active pets.');
    return;
  }

  if (petIdentifier) {
    // Specific pet
    const pet = findPetByNameOrType(pets, petIdentifier);
    if (!pet) {
      ctx.sendLine(`You don't have a pet matching "${petIdentifier}".`);
      return;
    }
    pet.following = false;
    ctx.sendLine(`${pet.getDisplayShortDesc()} will now stay here.`);
  } else {
    // All pets
    for (const pet of pets) {
      pet.following = false;
    }
    if (pets.length === 1) {
      ctx.sendLine(`${pets[0].getDisplayShortDesc()} will now stay here.`);
    } else {
      ctx.sendLine('Your pets will now stay here.');
    }
  }
}

/**
 * Handle showing pet inventory.
 */
function handleInventory(ctx: CommandContext, ownerName: string, petIdentifier: string): void {
  const petDaemon = getPetDaemon();
  const pets = petDaemon.getPlayerPets(ownerName);

  if (pets.length === 0) {
    ctx.sendLine('You do not have any active pets.');
    return;
  }

  // Find the specified pet or use the first one
  let pet: Pet;
  if (petIdentifier) {
    const found = findPetByNameOrType(pets, petIdentifier);
    if (!found) {
      ctx.sendLine(`You don't have a pet matching "${petIdentifier}".`);
      return;
    }
    pet = found;
  } else if (pets.length > 1) {
    ctx.sendLine('You have multiple pets. Please specify which one:');
    ctx.sendLine('Usage: pet inventory <pet>');
    return;
  } else {
    pet = pets[0];
  }

  const petDesc = pet.getDisplayShortDesc();

  if (pet.inventory.length === 0) {
    ctx.sendLine(`${petDesc} isn't carrying anything.`);
    return;
  }

  ctx.sendLine(`{bold}${petDesc} is carrying:{/}`);
  for (const item of pet.inventory) {
    ctx.sendLine(`  ${item.shortDesc}`);
  }
  ctx.sendLine(`{dim}(${pet.itemCount}/${pet.maxItems} items, ${pet.currentWeight}/${pet.maxWeight} weight){/}`);
}

/**
 * Handle sending pet away.
 */
async function handleSend(ctx: CommandContext, ownerName: string, petIdentifier: string): Promise<void> {
  const petDaemon = getPetDaemon();
  const pets = petDaemon.getPlayerPets(ownerName);

  if (pets.length === 0) {
    ctx.sendLine('You do not have any active pets to send away.');
    return;
  }

  // Find the specified pet or use the first one
  let pet: Pet;
  if (petIdentifier) {
    const found = findPetByNameOrType(pets, petIdentifier);
    if (!found) {
      ctx.sendLine(`You don't have a pet matching "${petIdentifier}".`);
      return;
    }
    pet = found;
  } else if (pets.length > 1) {
    ctx.sendLine('You have multiple pets. Please specify which one:');
    ctx.sendLine('Usage: pet send <pet>');
    return;
  } else {
    pet = pets[0];
  }

  const petDesc = pet.getDisplayShortDesc();

  // Can't send away if in combat
  if (pet.inCombat) {
    ctx.sendLine(`${petDesc} is in combat and cannot be sent away!`);
    return;
  }

  const success = petDaemon.sendAway(pet);
  if (success) {
    ctx.sendLine(`${petDesc} fades away, safely stored until you call them back.`);
  } else {
    ctx.sendLine(`Failed to send ${petDesc} away.`);
  }
}

/**
 * Handle recalling a sent-away pet.
 */
async function handleRecall(
  ctx: CommandContext,
  player: MudObject,
  ownerName: string,
  petNameOrIndex: string
): Promise<void> {
  const petDaemon = getPetDaemon();
  const sentAway = petDaemon.getSentAwayPets(ownerName);

  if (sentAway.length === 0) {
    ctx.sendLine('You do not have any sent-away pets to recall.');
    return;
  }

  // Determine which pet to recall
  let petIdOrIndex: string | number;
  if (petNameOrIndex) {
    // Try as number first
    const num = parseInt(petNameOrIndex, 10);
    if (!isNaN(num) && num >= 1 && num <= sentAway.length) {
      petIdOrIndex = num - 1; // Convert to 0-indexed
    } else {
      // Try as name
      const idx = sentAway.findIndex(data =>
        data.petName?.toLowerCase() === petNameOrIndex.toLowerCase() ||
        data.templateType.toLowerCase() === petNameOrIndex.toLowerCase()
      );
      if (idx >= 0) {
        petIdOrIndex = idx;
      } else {
        ctx.sendLine(`You don't have a sent-away pet matching "${petNameOrIndex}".`);
        return;
      }
    }
  } else {
    // Default to first sent-away pet
    petIdOrIndex = 0;
  }

  const pet = await petDaemon.recall(player, petIdOrIndex);
  if (pet) {
    ctx.sendLine(`${pet.getDisplayShortDesc()} shimmers back into existence beside you!`);
  } else {
    ctx.sendLine('Failed to recall your pet.');
  }
}

/**
 * Handle dismissing a pet permanently.
 */
async function handleDismiss(ctx: CommandContext, ownerName: string, petIdentifier: string): Promise<void> {
  const petDaemon = getPetDaemon();
  const pets = petDaemon.getPlayerPets(ownerName);

  if (pets.length === 0) {
    ctx.sendLine('You do not have any active pets to dismiss.');
    return;
  }

  // Find the specified pet or use the first one
  let pet: Pet;
  if (petIdentifier) {
    const found = findPetByNameOrType(pets, petIdentifier);
    if (!found) {
      ctx.sendLine(`You don't have a pet matching "${petIdentifier}".`);
      return;
    }
    pet = found;
  } else if (pets.length > 1) {
    ctx.sendLine('You have multiple pets. Please specify which one:');
    ctx.sendLine('Usage: pet dismiss <pet>');
    return;
  } else {
    pet = pets[0];
  }

  const petDesc = pet.getDisplayShortDesc();

  // Check if pet is carrying items
  if (pet.inventory.length > 0) {
    ctx.sendLine(`{yellow}Warning: ${petDesc} is carrying ${pet.inventory.length} item(s)!{/}`);
    ctx.sendLine('These items will be lost if you dismiss your pet.');
    ctx.sendLine('Use "get all from <pet>" first to retrieve your items.');
    ctx.sendLine('Then use "pet dismiss" again to confirm dismissal.');
    return;
  }

  const success = petDaemon.dismissPet(pet);
  if (success) {
    ctx.sendLine(`You release ${petDesc}. It wanders off into the distance.`);
  } else {
    ctx.sendLine(`Failed to dismiss ${petDesc}.`);
  }
}

export default { name, description, usage, execute };
