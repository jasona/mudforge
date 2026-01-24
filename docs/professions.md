# Profession System

A comprehensive use-based profession system for MudForge featuring crafting, gathering, and movement skills. Players can learn and master all professions, with master crafters able to create legendary-quality items.

## Table of Contents

1. [Overview](#overview)
2. [Profession Categories](#profession-categories)
3. [Skill Progression](#skill-progression)
4. [Gathering System](#gathering-system)
5. [Crafting System](#crafting-system)
6. [Movement Skills](#movement-skills)
7. [Commands](#commands)
8. [Builder Guide](#builder-guide)
9. [API Reference](#api-reference)

---

## Overview

### Design Philosophy

- **Unlimited Professions**: Players can learn and master all professions
- **Use-Based Improvement**: Skills improve through practice, not purchased training
- **Quality Matters**: Crafted items can match or exceed loot quality at high skill levels
- **Accessible Movement**: Everyone can swim/climb basics (level 1); training unlocks harder terrain

### Key Features

- 14 total professions across 3 categories
- Experience-based leveling (1-100)
- Quality tiers from Poor to Legendary
- Tool durability and tier bonuses
- Crafting station requirements and bonuses
- Skill-gated movement through terrain
- Resource node depletion and respawn

---

## Profession Categories

### Crafting Professions

| Profession | Creates | Station Required | Primary Stat |
|------------|---------|------------------|--------------|
| **Alchemy** | Potions, elixirs, poisons | Alchemy Table | Intelligence |
| **Blacksmithing** | Weapons, metal armor, ingots | Forge | Strength |
| **Woodworking** | Bows, staves, shields, planks | Workbench | Dexterity |
| **Leatherworking** | Leather armor, bags | Tanning Rack | Dexterity |
| **Cooking** | Buff food, drinks | Cooking Fire | Wisdom |
| **Jeweling** | Rings, amulets, cut gems | Jeweler's Bench | Intelligence |

### Gathering Professions

| Profession | Gathers | Tool Required | Primary Stat |
|------------|---------|---------------|--------------|
| **Mining** | Ore, gems, stone, coal | Pickaxe | Strength |
| **Herbalism** | Herbs, reagents | Herbalism Kit | Wisdom |
| **Logging** | Wood, bark | Logging Axe | Strength |
| **Fishing** | Fish, shells, salvage | Fishing Rod | Dexterity |
| **Skinning** | Leather, hides, fur | Skinning Knife | Dexterity |

### Movement Skills

| Skill | Gates Access To | Primary Stat |
|-------|-----------------|--------------|
| **Swimming** | Rivers, lakes, ocean depths | Constitution |
| **Climbing** | Mountains, cliffs, walls | Strength |
| **Flying** | Aerial areas (requires mount/magic) | Intelligence |

---

## Skill Progression

### XP Formula

Experience required for each level:

```
XP Required = level × 100 + level² × 10
```

| Level | XP to Next | Cumulative XP |
|-------|------------|---------------|
| 1→2 | 110 | 110 |
| 10→11 | 2,000 | 10,450 |
| 25→26 | 8,750 | 68,875 |
| 50→51 | 30,000 | 467,500 |
| 75→76 | 64,250 | 1,619,375 |
| 99→100 | 108,010 | 3,433,350 |

### XP Gain Modifiers

| Action | Base XP | Modifiers |
|--------|---------|-----------|
| Gather (at level) | 15 | +50% if node level > skill |
| Gather (trivial) | 15 | -67% if node 10+ levels below |
| Craft (at level) | 25 | +50% for first craft of recipe |
| Craft (trivial) | 25 | -67% if recipe 10+ levels below |
| Movement skill use | 5 | Per room traversed |
| Critical gather | - | +50% bonus |
| Discover hidden node | - | +200% bonus (one-time) |

### Skill Ranks

| Level Range | Rank |
|-------------|------|
| 0 | Untrained |
| 1-19 | Novice |
| 20-39 | Apprentice |
| 40-59 | Journeyman |
| 60-79 | Expert |
| 80-99 | Master |
| 100 | Grandmaster |

---

## Gathering System

### Resource Nodes

Resource nodes are objects placed in rooms that players can gather from. Each node has:

- **Profession Requirement**: Which gathering skill is needed
- **Level Requirement**: Minimum skill level to gather
- **Capacity**: Number of gathers before depletion
- **Respawn Time**: Seconds per capacity point to regenerate
- **Material Drops**: What materials can be gathered
- **Bonus Drops**: Rare materials at higher skill levels
- **Hidden**: Whether node requires discovery

### Node States

| State | Capacity | Description |
|-------|----------|-------------|
| Abundant | 75-100% | Full resources |
| Normal | 50-74% | Standard |
| Depleted | 25-49% | Running low |
| Nearly Exhausted | 1-24% | Almost empty |
| Exhausted | 0% | Must wait for respawn |

### Gathering Success

```
Success Chance = 50% + (skillLevel - nodeLevel) × 2%
```

Maximum success rate is capped at 95%.

### Tool Tiers

| Tier | Name | Gather Bonus | Durability |
|------|------|--------------|------------|
| 1 | Crude | +0% | 50 uses |
| 2 | Iron | +10% | 100 uses |
| 3 | Steel | +20% | 200 uses |
| 4 | Mithril | +30% | 500 uses |

### Available Materials

#### Ores (Mining)
- Copper Ore (Level 1)
- Tin Ore (Level 1)
- Coal (Level 1)
- Iron Ore (Level 20)
- Silver Ore (Level 35)
- Gold Ore (Level 50)
- Mithril Ore (Level 70)

#### Gems (Mining Bonus)
- Rough Quartz (Level 1)
- Rough Amethyst (Level 20)
- Rough Ruby (Level 40)
- Rough Sapphire (Level 40)
- Rough Diamond (Level 70)

#### Herbs (Herbalism)
- Silverleaf (Level 1)
- Peacebloom (Level 1)
- Earthroot (Level 10)
- Mageroyal (Level 25)
- Kingsblood (Level 35)
- Fadeleaf (Level 50, Hidden)
- Goldthorn (Level 60, Hidden)

#### Wood (Logging)
- Oak Log (Level 1)
- Ash Log (Level 25)
- Ironwood Log (Level 50)

#### Leather (Skinning)
- Ruined Leather (Level 1, Poor quality)
- Light Leather (Level 1)
- Medium Leather (Level 25)
- Heavy Leather (Level 40)
- Thick Leather (Level 55)

#### Fish (Fishing)
- Small Fish (Level 1)
- River Trout (Level 10)
- Salmon (Level 25)
- Lobster (Level 45)

---

## Crafting System

### Crafting Flow

1. Player issues `craft <recipe>` command
2. System checks:
   - Player knows recipe (skill level or learned)
   - Required station nearby
   - Required tool in inventory
   - All materials present
3. Materials consumed
4. Output quality calculated
5. Item created in inventory
6. XP awarded

### Quality Calculation

```
finalQuality = inputQuality + skillBonus + statBonus + toolBonus + stationBonus
```

Where:
- `inputQuality`: Average quality of input materials (1-6)
- `skillBonus`: (skillLevel - recipeLevel) / 20 × 0.5
- `statBonus`: (primaryStat - 10) × 0.02
- `toolBonus`: toolTier × 0.1 (0-0.3)
- `stationBonus`: stationTier × 0.1 (0-0.3)

### Quality Tiers

| Quality | Value | Comparable To | Stat Multiplier |
|---------|-------|---------------|-----------------|
| Poor | 1 | Vendor trash | 0.75× |
| Common | 2 | Common loot | 1.0× |
| Fine | 3 | Uncommon loot | 1.15× |
| Superior | 4 | Rare loot | 1.30× |
| Exceptional | 5 | Epic loot | 1.50× |
| Legendary | 6 | Legendary loot | 2.0× |

### Station Tiers

| Tier | Name | Quality Bonus |
|------|------|---------------|
| 1 | Basic | +0% |
| 2 | Quality | +10% |
| 3 | Superior | +20% |
| 4 | Master | +30% |

### Recipe Categories

#### Blacksmithing Recipes

**Smelting:**
- Smelt Copper Ingot (Level 1)
- Smelt Bronze Ingot (Level 10)
- Smelt Iron Ingot (Level 20)
- Forge Steel Ingot (Level 35)
- Smelt Silver Ingot (Level 35)
- Smelt Gold Ingot (Level 50)
- Smelt Mithril Ingot (Level 70)

**Weapons:**
- Copper Dagger (Level 1)
- Bronze Sword (Level 15)
- Iron Sword (Level 25)
- Steel Sword (Level 40)
- Mithril Sword (Level 75)

**Armor:**
- Iron Chainmail (Level 30)
- Steel Breastplate (Level 50)

#### Woodworking Recipes
- Saw Oak Plank (Level 1)
- Quarterstaff (Level 5)
- Wooden Shield (Level 10)
- Hunting Bow (Level 20)
- Saw Ash Plank (Level 25)

#### Leatherworking Recipes
- Leather Vest (Level 10)
- Leather Boots (Level 15)
- Heavy Leather Armor (Level 45)

#### Alchemy Recipes
- Minor Healing Potion (Level 1)
- Mana Potion (Level 20)
- Healing Potion (Level 25)
- Elixir of Strength (Level 40)

#### Cooking Recipes
- Grilled Fish (Level 1)
- Trout Dinner (Level 15)
- Salmon Feast (Level 30)

#### Jeweling Recipes
- Cut Quartz (Level 1)
- Silver Ring (Level 35)
- Gold Amulet (Level 55)

---

## Movement Skills

All players start with movement skills at level 1, allowing basic movement. Higher levels unlock more challenging terrain.

### Swimming

| Level | Terrain | Stamina Cost | Failure |
|-------|---------|--------------|---------|
| 1 | Shallow water, wading | 5/room | - |
| 20 | Rivers, streams | 10/room | 5 damage |
| 50 | Deep lakes, underwater | 15/room | 15 damage |
| 80 | Ocean, strong currents | 20/room | 25 damage |

### Climbing

| Level | Terrain | Stamina Cost | Fall Damage |
|-------|---------|--------------|-------------|
| 1 | Hills, ladders, easy slopes | 5/room | - |
| 30 | Rocky mountains, rough walls | 10/room | 10 damage |
| 50 | Cliffs, castle walls | 15/room | 20 damage |
| 80 | Sheer walls, overhangs | 20/room | 30 damage |

### Flying

| Level | Terrain | Mana Cost | Fall Damage |
|-------|---------|-----------|-------------|
| 1 | Hover (stationary) | 5/tick | - |
| 30 | Glide (downward only) | 10/room | 15 damage |
| 60 | Free flight | 15/room | 25 damage |
| 90 | High altitude, storm clouds | 20/room | 35 damage |

**Note:** Flying requires an active flight spell or flying mount.

---

## Commands

### `professions` / `profs` / `skills`

View your profession skills and progress.

```
professions                  - Show all professions overview
professions crafting         - Show crafting professions only
professions gathering        - Show gathering professions only
professions movement         - Show movement skills only
professions <name>           - Show detailed info for a profession
```

### `recipes`

View available crafting recipes.

```
recipes                      - Show recipe overview by profession
recipes <profession>         - Show all recipes for a profession
recipes <profession> <name>  - Show detailed recipe info
recipes <recipe name>        - Search for recipe by name
```

### `gather` / `mine` / `harvest` / `fish` / `chop` / `skin`

Gather resources from nodes in the current room.

```
gather                       - List available nodes
gather <node>                - Gather from a specific node
mine                         - Gather from mining nodes
mine <target>                - Gather from specific ore vein
harvest                      - Gather herbs
fish                         - Fish at fishing spots
chop                         - Chop trees for wood
skin <corpse>                - Skin a creature corpse
```

### `craft` / `make` / `build`

Create items from materials.

```
craft list                   - Show all available recipes
craft <recipe name>          - Craft an item
craft campfire               - Create a campfire (simple recipe)
craft iron sword             - Craft using profession system
```

---

## Builder Guide

### Adding Resource Nodes to Rooms

```typescript
import { ResourceNode } from '../../../std/profession/resource-node.js';

export class MyRoom extends Room {
  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Add a resource node
    const copperVein = new ResourceNode();
    copperVein.initFromDefinition('copper_vein');
    await copperVein.moveTo(this);
  }
}
```

Available node definitions are in `mudlib/std/profession/resource-nodes.ts`.

### Creating Crafting Stations

**Method 1: Mark the room itself as a station**

```typescript
import { markRoomAsStation } from '../../../std/profession/station.js';

export class BlacksmithShop extends Room {
  constructor() {
    super();
    // ... room setup ...

    // Mark room as a Tier 2 forge
    markRoomAsStation(this, 'forge', 2);
  }
}
```

**Method 2: Create a station object**

```typescript
import { CraftingStation } from '../../../std/profession/station.js';

export class AlchemyLab extends Room {
  override async onCreate(): Promise<void> {
    await super.onCreate();

    const table = new CraftingStation();
    table.initStation('alchemy_table', 2);
    await table.moveTo(this);
  }
}
```

Station types:
- `forge` - Blacksmithing
- `alchemy_table` - Alchemy
- `workbench` - Woodworking
- `tanning_rack` - Leatherworking
- `cooking_fire` - Cooking
- `jeweler_bench` - Jeweling

### Adding Skill-Gated Exits

```typescript
export class MountainPath extends Room {
  private setupRoom(): void {
    // Regular exit
    this.addExit('south', '/areas/valley/entrance');

    // Climbing-gated exit
    this.addSkillGatedExit('climb', '/areas/mountain/peak', {
      profession: 'climbing',
      level: 50,
      failMessage: 'The cliff face is too steep for your climbing ability.',
      cost: 15,           // Stamina cost
      failDamage: 20,     // Damage on failure
      description: 'A narrow path leads up the cliff.',
    });
  }
}
```

### Creating New Materials

Add to `mudlib/std/profession/materials.ts`:

```typescript
my_material: {
  id: 'my_material',
  name: 'My Material',
  type: 'ore',              // ore, ingot, gem, wood, herb, leather, fish, reagent
  quality: 'common',        // poor, common, fine, superior, exceptional, legendary
  tier: 2,                  // 1-10
  gatherProfession: 'mining',
  gatherLevelRequired: 30,
  stackable: true,
  maxStack: 50,
  weight: 2,
  value: 15,
  shortDesc: 'some my material',
  longDesc: 'A description of the material.',
},
```

### Creating New Recipes

Add to `mudlib/std/profession/recipes.ts`:

```typescript
craft_my_item: {
  id: 'craft_my_item',
  name: 'My Item',
  profession: 'blacksmithing',
  levelRequired: 40,
  ingredients: [
    { materialId: 'iron_ingot', quantity: 2 },
    { materialId: 'coal', quantity: 1 },
  ],
  stationRequired: 'forge',
  craftTime: 15,            // Seconds
  resultType: 'weapon',     // weapon, armor, consumable, material, tool, accessory
  resultConfig: {
    basePath: '/std/weapon',
    name: 'my weapon',
    shortDesc: 'a my weapon',
    longDesc: 'A crafted weapon.',
    minDamage: 10,
    maxDamage: 18,
    damageType: 'slashing',
    weight: 3,
    value: 100,
  },
  resultQuantity: 1,
  qualityAffected: true,
  xpReward: 50,
  description: 'A custom crafted weapon.',
  requiresLearning: false,
},
```

### Creating New Resource Nodes

Add to `mudlib/std/profession/resource-nodes.ts`:

```typescript
my_node: {
  id: 'my_node',
  name: 'My Node',
  nodeType: 'ore_vein',     // ore_vein, herb_patch, fishing_spot, tree, corpse
  gatherProfession: 'mining',
  levelRequired: 25,
  materials: [
    { materialId: 'iron_ore', weight: 80, minQuantity: 1, maxQuantity: 3 },
    { materialId: 'coal', weight: 20, minQuantity: 1, maxQuantity: 2 },
  ],
  bonusMaterials: [
    { materialId: 'rough_ruby', chance: 5, levelRequired: 35 },
  ],
  capacity: 4,
  respawnTime: 420,         // Seconds
  toolRequired: 'pickaxe',
  hidden: false,
  discoverLevel: 20,        // Only if hidden: true
  shortDesc: 'a my node',
  longDesc: 'Description of the node.',
},
```

---

## API Reference

### ProfessionDaemon

The main daemon managing all profession functionality.

```typescript
import { getProfessionDaemon } from '../daemons/profession.js';

const daemon = getProfessionDaemon();
```

#### Methods

**Player Data:**
- `getPlayerData(player)` - Get/create profession data
- `getPlayerSkill(player, professionId)` - Get skill for a profession
- `getAllPlayerSkills(player)` - Get all skills
- `hasSkillLevel(player, professionId, level)` - Check if player meets level

**XP and Leveling:**
- `awardXP(player, professionId, baseXP, options)` - Award XP with modifiers
- `getXPProgress(player, professionId)` - Get current/required XP

**Recipes:**
- `getRecipesForProfession(professionId)` - Get all recipes
- `getAvailableRecipes(player, professionId)` - Get craftable recipes
- `getRecipe(recipeId)` - Get recipe by ID
- `knowsRecipe(player, recipeId)` - Check if player knows recipe
- `learnRecipe(player, recipeId)` - Teach a recipe

**Materials:**
- `hasMaterials(player, recipe)` - Check if player has materials
- `consumeMaterials(player, recipe)` - Consume and return avg quality

**Tools/Stations:**
- `hasTool(player, toolType)` - Check for tool
- `hasStation(player, stationType)` - Check for nearby station
- `useTool(tool)` - Decrease tool durability

**Quality:**
- `calculateCraftQuality(player, recipe, inputQuality, toolTier, stationTier)` - Calculate output quality
- `formatQuality(quality)` - Format quality with color

**Movement:**
- `attemptSkillGatedMovement(player, exit)` - Process skill-gated exit

### GatheringDaemon

Manages resource node registration and gathering.

```typescript
import { getGatheringDaemon } from '../daemons/gathering.js';

const daemon = getGatheringDaemon();
```

#### Methods

- `registerNode(node, roomPath)` - Register a node
- `unregisterNode(nodeId)` - Unregister a node
- `getNodesInRoom(roomPath)` - Get nodes in a room
- `findNode(room, keyword)` - Find node by keyword
- `attemptGather(player, node)` - Perform gathering

### ResourceNode

Gatherable resource nodes.

```typescript
import { ResourceNode } from '../std/profession/resource-node.js';

const node = new ResourceNode();
node.initFromDefinition('copper_vein');
```

#### Properties

- `definition` - The node definition
- `currentCapacity` - Current gather capacity
- `maxCapacity` - Maximum capacity
- `isDepleted` - Whether node is exhausted
- `gatherProfession` - Required profession
- `levelRequired` - Required skill level
- `toolRequired` - Required tool type
- `isHidden` - Whether discovery is needed

#### Methods

- `initFromDefinition(definitionId)` - Initialize from definition
- `gather(playerLevel, toolTier, primaryStat)` - Attempt to gather
- `getStateDescription()` - Get state for display
- `processRespawn()` - Update respawn state

### Tool

Gathering tools with durability.

```typescript
import { Tool } from '../std/profession/tool.js';

const pickaxe = new Tool();
pickaxe.initTool('pickaxe', 2);  // Tier 2 iron pickaxe
```

#### Properties

- `toolType` - Type of tool
- `tier` - Tool tier (1-4)
- `durability` - Current durability
- `maxDurability` - Maximum durability
- `gatherBonus` - Bonus percentage
- `isBroken` - Whether tool is broken

#### Methods

- `initTool(toolType, tier)` - Initialize tool
- `use()` - Decrease durability, returns true if broken
- `repair(amount?)` - Repair durability
- `getDurabilityStatus()` - Get status string

### CraftingStation

Crafting station objects.

```typescript
import { CraftingStation, markRoomAsStation } from '../std/profession/station.js';

// As object
const forge = new CraftingStation();
forge.initStation('forge', 2);

// Or mark room directly
markRoomAsStation(room, 'forge', 2);
```

#### Properties

- `stationType` - Type of station
- `tier` - Station tier (1-4)
- `qualityBonus` - Bonus percentage

### MaterialItem

Stackable crafting materials.

```typescript
import { MaterialItem } from '../std/profession/material-item.js';

const item = new MaterialItem();
item.initFromMaterial('iron_ore', 5, 'fine');
```

#### Properties

- `materialId` - Material definition ID
- `quantity` - Stack quantity
- `quality` - Material quality
- `materialType` - Type (ore, ingot, etc.)
- `tier` - Material tier

#### Methods

- `initFromMaterial(materialId, quantity, quality)` - Initialize
- `canStackWith(other)` - Check if can stack
- `merge(other)` - Merge stacks
- `split(amount)` - Split stack

---

## File Structure

```
mudlib/
├── std/profession/
│   ├── types.ts           # Core interfaces and types
│   ├── definitions.ts     # Profession definitions
│   ├── materials.ts       # Material definitions
│   ├── recipes.ts         # Recipe definitions
│   ├── resource-nodes.ts  # Resource node definitions
│   ├── resource-node.ts   # ResourceNode class
│   ├── material-item.ts   # MaterialItem class
│   ├── tool.ts            # Tool class
│   ├── station.ts         # CraftingStation class
│   └── index.ts           # Module exports
├── daemons/
│   ├── profession.ts      # Main profession daemon
│   └── gathering.ts       # Gathering daemon
├── cmds/player/
│   ├── _professions.ts    # View skills command
│   ├── _recipes.ts        # View recipes command
│   ├── _gather.ts         # Gather command
│   └── _craft.ts          # Craft command (updated)
└── items/tools/
    └── basic-tools.ts     # Tool factory functions
```

---

## Version History

- **1.0.0** - Initial implementation
  - 14 professions (6 crafting, 5 gathering, 3 movement)
  - 40+ materials
  - 30+ recipes
  - Tool durability system
  - Crafting station system
  - Skill-gated movement
  - Resource node depletion/respawn
