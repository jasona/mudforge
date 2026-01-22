# Pet System

The pet system allows players to own pets/companions that follow them around and can carry items.

## Overview

Pets are special NPCs owned by players that:
- Follow their owner between rooms
- Can carry items for the owner
- Have owner-only inventory access (others can give items to pets, but only owners can take items)
- Can only be attacked when PK (Player Killing) is enabled
- Persist across login sessions

## Pet Types

The system includes several default pet templates:

| Type | Size | Max Items | Max Weight | Health | Description |
|------|------|-----------|------------|--------|-------------|
| dog | small | 5 | 30 | 50 | A loyal dog with limited carrying capacity |
| mule | large | 30 | 500 | 100 | A sturdy pack mule for heavy loads |
| horse | large | 15 | 200 | 80 | A swift horse with moderate storage |
| floating_chest | medium | 50 | 1000 | 30 | A magical floating chest with massive capacity but low health |

## Player Commands

### `pet` - View Pet Status

Shows all your pets, both active and sent-away.

```
> pet
Your Pets:

Active Pets:
  Shadowmere (horse) - HP: 100% - following - Carrying: 3 items

Sent Away:
  1. mule (mule) - Carrying: 10 items
```

### `pet name <name>` - Name Your Pet

Give your pet a custom name.

```
> pet name Shadowmere
You name your horse "Shadowmere".
```

### `pet follow` - Enable Following

Make your pet follow you when you move between rooms.

```
> pet follow
Shadowmere the horse will now follow you.
```

### `pet stay` - Disable Following

Make your pet stay in the current room.

```
> pet stay
Shadowmere the horse will now stay here.
```

### `pet inventory` / `pet inv` - View Pet Inventory

See what items your pet is carrying.

```
> pet inventory
Shadowmere the horse is carrying:
  a rusty sword
  a leather pack
  50 gold coins
(3/15 items, 45/200 weight)
```

### `pet send` - Send Pet Away

Temporarily send your pet to a safe "pocket dimension". The pet and its inventory are safely stored.

```
> pet send
Shadowmere the horse fades away, safely stored until you call them back.
```

### `pet recall` - Recall Sent-Away Pet

Bring back a sent-away pet to your current location.

```
> pet recall
Shadowmere the horse shimmers back into existence beside you!

> pet recall 2
(recalls the second sent-away pet by index)

> pet recall mule
(recalls a sent-away pet by name/type)
```

### `pet dismiss` - Dismiss Pet Permanently

Release your pet. This is permanent - the pet will be gone forever.

**Warning:** You cannot dismiss a pet that is carrying items. Use `get all from <pet>` first.

```
> pet dismiss
You release Shadowmere the horse. It wanders off into the distance.
```

## Inventory Access

### Giving Items to Pets

Anyone can give items to a pet (put items in):

```
> put sword in mule
You give a rusty sword to a sturdy mule.
```

### Taking Items from Pets

Only the owner can take items from their pet:

```
> get sword from mule
You take a rusty sword from Shadowmere the sturdy mule.
```

Non-owners will be refused:
```
> get sword from mule
Shadowmere the sturdy mule won't let you take that.
```

## Combat

### PK Disabled (Default)

When Player Killing is disabled, pets cannot be attacked:
```
> kill mule
The sturdy mule belongs to PlayerName. Player killing is disabled.
```

### PK Enabled

When Player Killing is enabled, pets can be attacked and killed. On death:
- A corpse is created containing all the pet's inventory
- The corpse can be looted by anyone
- The owner is notified of the pet's death
- The pet is permanently destroyed

## Following Behavior

Pets follow their owner automatically when moving between rooms:
```
You go north.
Shadowmere the horse follows PlayerName north.
```

Pets cannot follow if:
- They are set to "stay" mode
- They are in combat
- They are sent away

## Persistence

Pet data is saved with the player and restored on login:
- Pet health
- Pet name
- Pet inventory
- Sent-away status

## Creating Pets (For Builders)

### Pet Daemon API

```typescript
import { getPetDaemon } from '../daemons/pet.js';

// Create a new pet for a player
const petDaemon = getPetDaemon();
const pet = await petDaemon.createPet(player, 'horse');

// Get a player's active pets
const pets = petDaemon.getPlayerPets('PlayerName');

// Register a custom template
petDaemon.registerTemplate({
  type: 'dragon_whelp',
  shortDesc: 'a small dragon whelp',
  longDesc: 'A young dragon with iridescent scales...',
  size: 'medium',
  maxItems: 20,
  maxWeight: 300,
  health: 150,
  cost: 5000,
});
```

### Creating a Pet Vendor

Pet vendors can be created by adding shop functionality that calls `petDaemon.createPet()` when a player purchases a pet.

## Technical Details

### Files

- `mudlib/std/pet.ts` - Pet class (extends NPC)
- `mudlib/daemons/pet.ts` - Pet daemon for central management
- `mudlib/cmds/player/_pet.ts` - Player pet command

### Pet Class Hierarchy

```
MudObject
  └── Living
        └── NPC
              └── Pet
```

### Key Methods

- `pet.isOwner(who)` - Check if someone is the owner
- `pet.canAccessInventory(who)` - Check inventory access permission
- `pet.canBeAttacked(attacker)` - Check if attacking is allowed (PK check)
- `pet.followOwner(owner, from, to, direction)` - Handle following movement
- `pet.getDisplayShortDesc()` - Get display name (e.g., "Shadowmere the horse")
- `pet.getFullDescription()` - Get detailed description for look command
- `pet.serialize()` / `pet.restore()` - Persistence
