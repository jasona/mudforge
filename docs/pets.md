# Pet System

The pet system allows players to own companion creatures that follow them around and can carry items. Pets provide mobile storage, add flavor to gameplay, and create interesting PvP dynamics when player killing is enabled.

## Overview

The pet system consists of:

- **Pet class** (`/mudlib/std/pet.ts`) - Base class extending NPC with pet-specific behavior
- **PetMerchant class** (`/mudlib/std/pet-merchant.ts`) - NPC class for selling pets
- **Pet Daemon** (`/mudlib/daemons/pet.ts`) - Central management for all active pets
- **Pet Command** (`/mudlib/cmds/player/_pet.ts`) - Player command for managing pets

### Key Features

- **Following** - Pets automatically follow their owner between rooms
- **Storage** - Pets carry items with type-specific capacity limits
- **Owner Protection** - Only owners can take items from their pets
- **PK Integration** - Pets can only be attacked when Player Killing is enabled
- **Persistence** - Pet data saves with player data across sessions
- **Send/Recall** - Temporarily store pets in a "pocket dimension"

## Quick Start

### Buying a Pet

Visit a pet merchant (like Mira at Whiskers & Hooves Pet Emporium):

```
> go south
You enter the pet shop.

> say list
Mira says: "I have wonderful companions for sale!"

Available Companions:
------------------------------------------------------------
Dog - 100 gold
  A loyal companion that will follow you everywhere.
  Size: Small | Carry: 5 items, 30 lbs | Health: 50

Horse - 800 gold
  A noble steed and trusted companion.
  Size: Large | Carry: 15 items, 200 lbs | Health: 80

> say buy horse
Mira says: "Excellent choice! Here's your new horse."
You purchased a Horse for 800 gold!
```

### Basic Pet Management

```
> pet
Your Pets:

Active Pets:
  horse (horse) - HP: 100% - following - Carrying: 0 items

> pet name horse Shadowmere
You name your horse "Shadowmere".

> put sword in shadowmere
You give a rusty sword to Shadowmere the horse.

> pet inventory shadowmere
Shadowmere the horse is carrying:
  a rusty sword
(1/15 items, 5/200 weight)
```

## Pet Types

The system includes several default pet templates:

| Type | Size | Max Items | Max Weight | Health | Cost | Description |
|------|------|-----------|------------|--------|------|-------------|
| `dog` | small | 5 | 30 | 50 | 100g | A loyal dog with limited carrying capacity |
| `mule` | large | 30 | 500 | 100 | 500g | A sturdy pack mule for heavy loads |
| `horse` | large | 15 | 200 | 80 | 800g | A swift horse with moderate storage |
| `floating_chest` | medium | 50 | 1000 | 30 | 2000g | A magical floating chest with massive capacity but low health |

### Choosing the Right Pet

- **Dog** - Best for new players on a budget; limited storage but affordable
- **Mule** - Best for serious haulers; highest weight capacity for bulk items
- **Horse** - Balanced option; good capacity with decent survivability
- **Floating Chest** - Best raw capacity; ideal for dungeons but vulnerable in PvP

## Player Commands

### `pet` - View Pet Status

Shows all your pets, both active and sent-away.

```
> pet
Your Pets:

Active Pets:
  Shadowmere (horse) - HP: 100% - following - Carrying: 3 items
  Buddy (dog) - HP: 85% - staying - Carrying: 1 items

Sent Away:
  1. mule (mule) - Carrying: 10 items
```

### `pet name` - Name Your Pet

Give your pet a custom name (2-20 letters only).

**Single pet:**
```
> pet name Shadowmere
You name your horse "Shadowmere".
```

**Multiple pets (must specify which):**
```
> pet name horse Shadowmere
You name your horse "Shadowmere".

> pet name dog Buddy
You name your dog "Buddy".

> pet name Shadowmere Thunder
You rename Shadowmere to Thunder.
```

### `pet follow` - Enable Following

Make pets follow you when you move between rooms.

```
> pet follow
Your pets will now follow you.

> pet follow horse
Shadowmere the horse will now follow you.
```

### `pet stay` - Disable Following

Make pets stay in the current room.

```
> pet stay
Your pets will now stay here.

> pet stay Buddy
Buddy the dog will now stay here.
```

### `pet inventory` - View Pet Inventory

See what items your pet is carrying.

```
> pet inventory
Shadowmere the horse is carrying:
  a rusty sword
  a leather pack
  50 gold coins
(3/15 items, 45/200 weight)

> pet inv mule
(shows mule's inventory)
```

### `pet send` - Send Pet Away

Temporarily send your pet to a safe "pocket dimension". The pet and its inventory are safely stored until recalled.

```
> pet send
Shadowmere the horse fades away, safely stored until you call them back.

> pet send Buddy
Buddy the dog fades away, safely stored until you call them back.
```

**Use cases:**
- Entering tight spaces where pets are inconvenient
- Protecting pets before dangerous fights
- Keeping pets safe while AFK

### `pet recall` - Recall Sent-Away Pet

Bring back a sent-away pet to your current location.

```
> pet recall
Shadowmere the horse shimmers back into existence beside you!

> pet recall 2
(recalls the second sent-away pet by list number)

> pet recall mule
(recalls a sent-away pet by name or type)
```

### `pet dismiss` - Dismiss Pet Permanently

Release your pet. This is **permanent** - the pet will be gone forever.

```
> pet dismiss
You release Shadowmere the horse. It wanders off into the distance.

> pet dismiss Buddy
You release Buddy the dog. It wanders off into the distance.
```

**Warning:** You cannot dismiss a pet that is carrying items:
```
> pet dismiss
Warning: Shadowmere the horse is carrying 5 item(s)!
These items will be lost if you dismiss your pet.
Use "get all from <pet>" first to retrieve your items.
```

## Addressing Multiple Pets

When you have multiple pets, you can address them by:

1. **Custom name** - `pet stay Shadowmere`
2. **Template type** - `pet stay horse`, `pet stay mule`
3. **Partial match** - `pet stay chest` matches "floating_chest"

### Command Behavior with Multiple Pets

| Command | No specifier | With specifier |
|---------|-------------|----------------|
| `pet follow` | All pets follow | Specific pet follows |
| `pet stay` | All pets stay | Specific pet stays |
| `pet name <name>` | Error (must specify) | Names specific pet |
| `pet inventory` | Error (must specify) | Shows specific inventory |
| `pet send` | Error (must specify) | Sends specific pet |
| `pet dismiss` | Error (must specify) | Dismisses specific pet |

## Inventory System

### Giving Items to Pets

**Anyone** can give items to a pet (useful for trading):

```
> put sword in mule
You give a rusty sword to a sturdy mule.

> put all from backpack in horse
You give a health potion to Shadowmere the horse.
You give a mana potion to Shadowmere the horse.
You give 50 gold coins to Shadowmere the horse.
```

### Taking Items from Pets

**Only the owner** can take items from their pet:

```
> get sword from mule
You take a rusty sword from Shadowmere the sturdy mule.

> get all from horse
You take a health potion from Shadowmere the horse.
You take a mana potion from Shadowmere the horse.
```

Non-owners are refused:
```
> get sword from mule
Shadowmere the sturdy mule won't let you take that.
```

### Capacity Limits

Pets have two capacity limits:

1. **Max Items** - Maximum number of discrete items
2. **Max Weight** - Maximum total weight in pounds

```
> put boulder in dog
Buddy the dog cannot carry that much weight.

> put potion in chest
The floating chest is carrying too many items.
```

## Combat

### PK Disabled (Default)

When Player Killing is disabled, pets cannot be attacked:

```
> kill mule
The sturdy mule belongs to PlayerName. Player killing is disabled.
```

### PK Enabled

When Player Killing is enabled, pets can be attacked and killed:

```
> kill mule
You attack the sturdy mule!
```

**On pet death:**
1. A corpse is created containing all the pet's inventory
2. The corpse can be looted by **anyone**
3. The owner is notified: "Your pet Shadowmere the horse has been killed!"
4. The pet is permanently destroyed (no respawn)

**Strategic implications:**
- Protect valuable cargo by sending pets away before fights
- Target enemy pets to deny them storage and loot their items
- Floating chests have low health but high capacity - high risk, high reward

## Following Behavior

Pets follow their owner automatically when moving between rooms:

```
> north
You go north.
Shadowmere the horse follows PlayerName north.
Buddy the dog follows PlayerName north.
```

**Pets cannot follow if:**
- They are set to "stay" mode
- They are in combat
- They are sent away

**Combat interruption:**
```
> north
Shadowmere the horse is in combat and cannot follow you.
```

## Persistence

Pet data is automatically saved with the player and restored on login:

### Saved Data
- Pet ID (unique identifier)
- Template type (horse, mule, etc.)
- Custom name
- Current health
- Maximum health
- Inventory (item paths)
- Sent-away status
- Following status

### Restoration Process

1. Player logs in
2. Player save data is loaded (includes pet data)
3. Player enters starting room
4. Pets are restored to player's location
5. Pet inventories are restored from saved item paths

**Note:** If a pet's inventory item path is invalid (deleted item), that item is skipped during restoration.

## Creating Pet Merchants (For Builders)

### Basic Pet Merchant

```typescript
// /mudlib/areas/town/pet_shop.ts
import { PetMerchant } from '../../std/pet-merchant.js';
import { getPetDaemon } from '../../daemons/pet.js';

export class PetShopkeeper extends PetMerchant {
  constructor() {
    super();

    // Configure the merchant
    this.setPetMerchant({
      name: 'Mira',
      shopName: "Whiskers & Hooves Pet Emporium",
      shopDescription: 'Quality companions for adventurers!',
      shortDesc: 'Mira the pet keeper',
      longDesc: `A cheerful woman with bright green eyes...`,
    });

    // Add identifiers
    this.addId('mira');
    this.addId('keeper');
    this.addId('merchant');

    // Stock pets from daemon templates
    this.setupPetStock();
  }

  private setupPetStock(): void {
    const petDaemon = getPetDaemon();
    const templates = petDaemon.getAllTemplates();

    for (const template of templates) {
      // Custom description for shop display
      let description = template.longDesc;
      if (template.type === 'horse') {
        description = "A noble steed and trusted companion...";
      }

      this.addPetStock(template.type, template, template.cost, description);
    }
  }
}
```

### PetMerchant API

```typescript
interface PetMerchantConfig {
  name: string;              // NPC name
  shopName: string;          // Shop title in list
  shopDescription?: string;  // Shop description
  shortDesc?: string;        // NPC short description
  longDesc?: string;         // NPC long description
}

class PetMerchant extends NPC {
  // Configure the merchant
  setPetMerchant(config: PetMerchantConfig): void;

  // Add a pet type to stock
  addPetStock(
    type: string,              // Template type key
    template: PetTemplate,     // Template definition
    priceOverride?: number,    // Custom price (default: template.cost)
    description?: string       // Custom shop description
  ): void;

  // Get all stocked pets
  getPetStock(): Map<string, PetStockEntry>;

  // Show pet list to a player
  showPetList(player: MudObject): void;

  // Attempt to sell a pet
  async sellPet(player: MudObject, petType: string): Promise<boolean>;
}
```

### Interaction Commands

Pet merchants respond to speech:

- `"list"`, `"pets"`, `"show pets"` - Shows available pets
- `"buy <pet>"` - Purchases a pet (e.g., "buy horse")
- Keywords like "pet", "buy", "companion" - Prompts to use list/buy

```
> say list
Mira shows you her available companions...

> say buy horse
Mira says: "Excellent choice! Here's your new horse."
```

## Pet Daemon API (For Builders)

### Getting the Daemon

```typescript
import { getPetDaemon } from '../daemons/pet.js';

const petDaemon = getPetDaemon();
```

### Creating Pets

```typescript
// Create a pet for a player using a template
const pet = await petDaemon.createPet(player, 'horse');

// Create with custom template
const customPet = await petDaemon.createPet(player, 'dragon_whelp');
```

### Querying Pets

```typescript
// Get all active pets for a player
const activePets = petDaemon.getPlayerPets('PlayerName');

// Get sent-away pets (returns save data, not instances)
const sentAway = petDaemon.getSentAwayPets('PlayerName');

// Find a specific pet by custom name
const pet = petDaemon.getPetByName('PlayerName', 'Shadowmere');

// Get a pet by its unique ID
const pet = petDaemon.getPetById('pet_123456789_abc1234');
```

### Managing Pets

```typescript
// Send a pet away (stores in daemon, removes from world)
petDaemon.sendAway(pet);

// Recall a sent-away pet (recreates in world)
const pet = await petDaemon.recall(player, indexOrPetId);

// Dismiss a pet permanently
petDaemon.dismissPet(pet);

// Remove from registry (called on death)
petDaemon.removePet(petId);
```

### Movement Handling

```typescript
// Called by _go.ts when owner moves rooms
await petDaemon.handleOwnerMovement(owner, fromRoom, toRoom, direction);
```

### Custom Templates

```typescript
// Register a custom pet template
petDaemon.registerTemplate({
  type: 'dragon_whelp',
  shortDesc: 'a small dragon whelp',
  longDesc: 'A young dragon with iridescent scales that shimmer in the light.',
  size: 'medium',
  maxItems: 20,
  maxWeight: 300,
  health: 150,
  cost: 5000,
});

// Get all registered templates
const templates = petDaemon.getAllTemplates();

// Get a specific template
const horseTemplate = petDaemon.getTemplate('horse');
```

## Pet Class API (For Builders)

### Properties

```typescript
class Pet extends NPC {
  // Owner tracking
  ownerName: string | null;      // Owner's player name
  petName: string | null;        // Custom name (e.g., "Shadowmere")
  petId: string;                 // Unique identifier
  templateType: string;          // Template type (e.g., "horse")

  // Capacity
  maxItems: number;              // Max item count
  maxWeight: number;             // Max weight capacity
  itemCount: number;             // Current item count (readonly)
  currentWeight: number;         // Current weight (readonly)
  remainingItems: number;        // Remaining item slots (readonly)
  remainingWeight: number;       // Remaining weight capacity (readonly)

  // State
  following: boolean;            // Whether following owner
  sentAway: boolean;             // Whether in pocket dimension

  // Description
  shortDesc: string;             // Full desc with owner info
  baseShortDesc: string;         // Base desc without owner info
}
```

### Methods

```typescript
class Pet extends NPC {
  // Ownership
  isOwner(who: MudObject): boolean;
  canAccessInventory(who: MudObject): boolean;

  // Combat
  canBeAttacked(attacker: MudObject): { canAttack: boolean; reason: string };

  // Capacity
  canHold(item: MudObject): boolean;
  getCannotHoldReason(item: MudObject): string | null;

  // Movement
  async followOwner(owner, fromRoom, toRoom, direction): Promise<boolean>;

  // Display
  getDisplayShortDesc(): string;    // "Shadowmere the horse" or "a horse"
  getFullDescription(): string;     // Full look description

  // Persistence
  serialize(): PetSaveData;
  restore(data: PetSaveData): void;
  async restoreInventory(itemPaths: string[]): Promise<void>;

  // ID matching
  id(name: string): boolean;        // Matches name, petName, templateType

  // Setup
  setPetFromTemplate(template: PetTemplate, owner: string): void;
}
```

### PetSaveData Interface

```typescript
interface PetSaveData {
  petId: string;
  templateType: string;
  petName: string | null;
  ownerName: string;
  health: number;
  maxHealth: number;
  inventory: string[];    // Item blueprint paths
  sentAway: boolean;
}
```

## Integration Points

### Movement System (`_go.ts`)

After a successful move, the pet daemon is notified:

```typescript
// In _go.ts after player moves
const petDaemon = getPetDaemon();
await petDaemon.handleOwnerMovement(player, fromRoom, toRoom, direction);
```

### Get Command (`_get.ts`)

Before taking from a pet, ownership is checked:

```typescript
// Check if container is a pet with restricted access
if ('petId' in container && 'canAccessInventory' in container) {
  const pet = container as Pet;
  if (!pet.canAccessInventory(player)) {
    ctx.sendLine(`${pet.getDisplayShortDesc()} won't let you take that.`);
    return;
  }
}
```

### Combat System (`combat.ts`)

Before initiating combat with a pet, PK status is checked:

```typescript
// Check if defender is a pet
if ('petId' in defender && 'canBeAttacked' in defender) {
  const pet = defender as Pet;
  const result = pet.canBeAttacked(attacker);
  if (!result.canAttack) {
    attacker.receive(result.reason + '\n');
    return false;
  }
}
```

### Player Save/Load (`player.ts`)

Pet data is included in player save data:

```typescript
// In Player.save()
const petDaemon = getPetDaemon();
const activePets = petDaemon.getPlayerPets(this.name);
const sentAwayPets = petDaemon.getSentAwayPets(this.name);
// ... serialize pets ...

// In Player.restorePets() (called after entering room)
for (const petData of savedPets) {
  await petDaemon.restorePet(this, petData);
}
```

### Look Modal (`look-modal.ts`)

Pets get a custom modal layout showing owner and capacity:

```typescript
// detectObjectType returns 'pet' for objects with petId
if ('petId' in obj && 'templateType' in obj) {
  return 'pet';
}

// buildPetLayout shows:
// - Pet name and type
// - Owner information
// - Health status
// - Carrying capacity (items and weight)
// - Long description
```

### Portrait System (`portrait.ts`)

Pets generate unique AI images based on template type:

```typescript
// Cache key uses template type so all horses share an image
cacheIdentifier = `pet_${pet.templateType}`;

// Pet-specific prompt for image generation
case 'pet':
  return `Create a portrait for a fantasy RPG pet/companion:
    ${description}
    Style: Dark fantasy, friendly but noble appearance...`;
```

## Files Reference

| File | Purpose |
|------|---------|
| `mudlib/std/pet.ts` | Pet class (extends NPC) |
| `mudlib/std/pet-merchant.ts` | PetMerchant class for vendors |
| `mudlib/daemons/pet.ts` | Central pet management daemon |
| `mudlib/cmds/player/_pet.ts` | Player pet command |
| `mudlib/lib/look-modal.ts` | Pet display in look modal |
| `mudlib/daemons/portrait.ts` | Pet image generation |

## Best Practices

### For Players

1. **Name your pets** - Makes managing multiple pets easier
2. **Send away before danger** - Protect pets and their cargo
3. **Don't overload** - Leave some capacity for loot
4. **Use appropriate pets** - Floating chests for dungeons, mules for bulk transport

### For Builders

1. **Use templates** - Register new pet types through the daemon
2. **Balance capacity vs. cost** - Higher capacity should cost more
3. **Consider PvP implications** - High-capacity pets are high-value targets
4. **Add flavor** - Create themed pet merchants for different areas
5. **Test persistence** - Verify pets save/load correctly with inventory

### Economy Considerations

- Pet costs should be significant early-game investments
- Floating chests should be late-game luxury items
- Consider pet "upkeep" mechanics for advanced implementations
- Pet death creates item sink opportunities in PvP environments
