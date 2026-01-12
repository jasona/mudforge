# Quest System Documentation

The quest system provides a comprehensive MMO-style questing experience with multiple quest types, progress tracking, and rewards including experience, gold, quest points, and items.

## Table of Contents

- [Overview](#overview)
- [Quest Types](#quest-types)
- [Finding Quests](#finding-quests)
- [Quest Progress](#quest-progress)
- [Rewards](#rewards)
- [Player Commands](#player-commands)
- [Builder Guide: Creating Quests](#builder-guide-creating-quests)
- [Builder Guide: Quest Giver NPCs](#builder-guide-quest-giver-npcs)
- [Technical Reference](#technical-reference)

---

## Overview

The quest system features:

- **Multiple Quest Types**: Kill, fetch, deliver, escort, explore, talk, and custom objectives
- **Multi-Objective Quests**: Quests can have multiple objectives of different types
- **Progress Tracking**: Automatic tracking when killing NPCs, collecting items, or exploring areas
- **Quest Chains**: Quests can link together in sequential chains
- **Prerequisites**: Level requirements, previous quests, guild membership, and item requirements
- **Repeatable Quests**: Optional cooldown-based repeatable quests
- **Time Limits**: Optional time-limited quests
- **Quest Points**: A special currency earned by completing quests
- **Persistent Data**: Quest progress saves with the player

---

## Quest Types

### Kill Quests

Defeat a specified number of creatures.

```
Kill 5 Giant Rats in the bakery cellar.
Progress: 3/5 Giant Rats killed
```

Kill objectives are automatically tracked when you defeat NPCs that match the quest targets. The system matches on NPC blueprint path, object ID, or target identifiers.

### Fetch Quests

Collect a specified number of items.

```
Collect 3 Supply Crates from the bandit camp.
Progress: 2/3 Supply Crates collected
```

Fetch objectives are tracked when you pick up matching items. Items may be consumed when turning in the quest (configurable per quest).

### Deliver Quests

Bring a specific item to a target NPC.

```
Deliver the Sealed Letter to Master Vorn.
```

Deliver objectives complete when you give the required item to the target NPC while near them.

### Escort Quests

Guide or follow an NPC to a destination.

```
Escort the Merchant safely to the town gates.
```

Escort objectives track when the escorted NPC reaches the destination room.

### Explore Quests

Visit specified locations.

```
Map the underground depths by visiting all 5 areas.
Progress: 3/5 locations explored
```

Explore objectives are automatically tracked when you enter rooms matching the quest locations. Each location only counts once.

### Talk Quests

Speak with specific NPCs.

```
Meet the Guildmasters by talking to all 4 guild leaders.
Progress: 2/4 guildmasters met
```

Talk objectives complete when you interact with the target NPCs. Some may require saying a specific keyword.

### Custom Quests

Custom objectives can be defined with specialized handlers for unique quest mechanics not covered by the standard types.

---

## Finding Quests

### Quest Giver Indicators

NPCs that offer quests display visual indicators:

| Indicator | Meaning |
|-----------|---------|
| `{yellow}!{/}` | Has quests available for you |
| `{green}?{/}` | Can accept a completed quest turn-in |

### Quest Giver NPCs

Quest givers are NPCs configured to offer specific quests. When near a quest giver:

```
> quest accept
Available Quests:

Baker:
  ! The Rat Problem - Clear the rats from the bakery cellar.

> quest accept rat problem
```

### Quest Prerequisites

Quests may have prerequisites that must be met:

| Prerequisite | Description |
|--------------|-------------|
| Level | Minimum player level required |
| Quests | Previous quests that must be completed |
| Guilds | Guild membership at specific levels |
| Items | Items that must be in inventory |

When you don't meet prerequisites, the quest will show as unavailable with the reason:

```
Status: Unavailable - Requires level 5.
Status: Unavailable - Requires completing "The Rat Problem" first.
```

### Maximum Active Quests

Players can have up to **25 active quests** at once.

---

## Quest Progress

### Automatic Tracking

Quest progress is tracked automatically through game actions:

| Action | Tracked By |
|--------|------------|
| Killing NPCs | Combat system death handler |
| Picking up items | Item onTake handler |
| Entering rooms | Room onEnter handler |
| Talking to NPCs | NPC interaction handler |
| Giving items | Give command to NPCs |

### Progress Notifications

When you make progress on a quest, you'll see notifications:

```
{yellow}[The Rat Problem] Giant Rat: 4/5{/}
{yellow}[Map the Depths] Explored: 3/5 locations{/}
```

### Quest Completion

When all objectives are complete:

```
{bold}{green}[Quest Complete] The Rat Problem - Return to turn in your quest!{/}
```

The quest status changes from "active" to "completed", ready for turn-in.

### Turning In Quests

Return to the quest giver (or turn-in NPC if different) to claim rewards:

```
> quest turn-in rat problem

=== Quest Complete: The Rat Problem ===
Rewards:
  +100 XP
  +1 Quest Points
  +25 gold
```

---

## Rewards

### Experience Points

XP rewards are granted via `player.gainExperience()` and contribute to level progression.

### Quest Points

Quest points are a special currency earned exclusively through quests. They persist across sessions and can be used for special vendors, unlocks, or achievements.

```
> quest points
Quest Points: 15
```

### Gold

Gold rewards are added directly to the player's coin purse.

### Items

Item rewards are cloned and placed in the player's inventory automatically.

### Guild XP

Some quests may reward guild-specific experience for players in particular guilds.

---

## Player Commands

### Quest Command

```
quest                      Show your active quest log
quest log                  Show full quest log with detailed progress
quest info <name>          Show detailed information about a quest
quest accept               Show available quests from nearby NPCs
quest accept <name>        Accept a specific quest
quest abandon <name>       Abandon an active quest
quest turn-in              Show quests ready to turn in
quest turn-in <name>       Turn in a completed quest
quest history              Show completed quests
quest points               Show your quest point balance
quest help                 Show command help
```

### Command Aliases

| Command | Aliases |
|---------|---------|
| `quest` | `quests`, `journal` |
| `quest info` | `quest show` |
| `quest abandon` | `quest drop` |
| `quest turn-in` | `quest turnin`, `quest complete` |
| `quest history` | `quest completed` |
| `quest points` | `quest qp` |

### Example Usage

View your current quests:
```
> quest
=== Quest Log ===

The Rat Problem (In Progress)
  Clear the rats from the bakery cellar.
  [ ] Kill Giant Rat: 3/5

1 active quest | 0 quest points
```

Get detailed information:
```
> quest info rat problem
=== The Rat Problem ===
Area: aldric | Recommended Level: 1

The baker has been having terrible trouble with giant rats in his cellar.
They've been eating through his flour stores and scaring his apprentices.
He needs someone brave enough to go down there and deal with them once and for all.

"Please, adventurer! Those rats are ruining me. I'll pay you well if you can get rid of them."

Objectives:
  Kill 5 Giant Rat - 3/5

Rewards:
  100 XP
  1 Quest Points
  25 gold

Status: In Progress
```

---

## Builder Guide: Creating Quests

### Quest Definition Structure

Create quest definitions in `mudlib/std/quest/definitions/`:

```typescript
import type { QuestDefinition } from '../types.js';

export const MY_QUEST: QuestDefinition = {
  // Required fields
  id: 'myarea:quest_name',      // Unique ID (format: "area:name")
  name: 'Quest Display Name',    // Shown to players
  description: 'Brief summary.', // One-line description
  storyText: `Full story text shown when accepting the quest.
    Can be multiple lines with dialogue and lore.`,
  objectives: [/* ... */],       // One or more objectives
  rewards: {/* ... */},          // Rewards on completion
  giverNpc: '/path/to/npc',      // Quest giver NPC path
  area: 'myarea',                // Area identifier

  // Optional fields
  turnInNpc: '/path/to/npc',     // Different turn-in NPC (defaults to giverNpc)
  prerequisites: {/* ... */},     // Requirements to accept
  repeatable: false,              // Can quest be repeated?
  repeatCooldown: 3600000,        // Cooldown in ms (if repeatable)
  nextQuest: 'myarea:next_quest', // Chain to next quest
  previousQuest: 'myarea:prev',   // Previous quest in chain
  timeLimit: 600000,              // Time limit in ms (0 = none)
  recommendedLevel: 5,            // Displayed to players
  hidden: false,                  // Hide from NPC quest lists
};
```

### Objective Types

#### Kill Objective

```typescript
{
  type: 'kill',
  targets: ['/areas/myarea/rat', 'giant_rat', 'cellar rat'],  // Paths or IDs to match
  targetName: 'Giant Rat',      // Display name
  required: 5,                  // Number to kill
}
```

#### Fetch Objective

```typescript
{
  type: 'fetch',
  itemPaths: ['/items/quest/crate', 'supply_crate'],  // Item paths to match
  itemName: 'Supply Crate',     // Display name
  required: 3,                  // Number to collect
  consumeOnComplete: true,      // Remove items on turn-in
}
```

#### Deliver Objective

```typescript
{
  type: 'deliver',
  itemPath: '/items/quest/letter',  // Item to deliver
  itemName: 'Sealed Letter',        // Display name
  targetNpc: '/areas/myarea/npc',   // Delivery target
  targetName: 'Master Vorn',        // Target display name
}
```

#### Escort Objective

```typescript
{
  type: 'escort',
  npcPath: '/areas/myarea/merchant',  // NPC to escort
  npcName: 'Merchant',                // Display name
  destination: '/areas/myarea/gate', // Destination room
  destinationName: 'Town Gates',      // Display name
  npcFollows: true,                   // NPC follows player?
}
```

#### Explore Objective

```typescript
{
  type: 'explore',
  locations: [                        // Rooms to visit
    '/areas/myarea/room1',
    '/areas/myarea/room2',
    '/areas/myarea/room3',
  ],
  locationName: 'the underground',    // Display name
}
```

#### Talk Objective

```typescript
{
  type: 'talk',
  npcPath: '/areas/myarea/sage',  // NPC to talk to
  npcName: 'The Sage',            // Display name
  keyword: 'wisdom',              // Optional keyword to say
}
```

#### Custom Objective

```typescript
{
  type: 'custom',
  description: 'Solve the ancient puzzle',  // Shown to player
  handler: 'myPuzzleHandler',               // Custom handler name
  required: 1,                              // For progress display
}
```

### Rewards Configuration

```typescript
rewards: {
  experience: 200,              // XP reward
  questPoints: 3,               // Quest points
  gold: 100,                    // Gold coins
  items: [                      // Item rewards (cloned)
    '/items/weapons/iron_sword',
    '/items/potions/health_potion',
  ],
  guildXP: {                    // Guild-specific XP
    fighter: 50,
    thief: 25,
  },
  customHandler: 'myRewardHandler',  // Custom reward logic
}
```

### Prerequisites Configuration

```typescript
prerequisites: {
  level: 5,                     // Minimum player level
  quests: [                     // Required completed quests
    'aldric:rat_problem',
    'aldric:lost_supplies',
  ],
  guilds: {                     // Guild level requirements
    fighter: 3,                 // Fighter guild level 3+
  },
  items: [                      // Required inventory items
    '/items/keys/special_key',
  ],
  customHandler: 'myPrereqCheck',  // Custom prerequisite logic
}
```

### Registering Quests

Add your quests to the definitions index:

```typescript
// mudlib/std/quest/definitions/index.ts
import { ALDRIC_QUESTS } from './aldric_quests.js';
import { MY_AREA_QUESTS } from './myarea_quests.js';

export function getAllQuestDefinitions(): QuestDefinition[] {
  return [
    ...ALDRIC_QUESTS,
    ...MY_AREA_QUESTS,
  ];
}
```

### Complete Quest Example

```typescript
// mudlib/std/quest/definitions/forest_quests.ts
import type { QuestDefinition } from '../types.js';

export const WOLF_PELTS: QuestDefinition = {
  id: 'forest:wolf_pelts',
  name: 'Wolf Pelts',
  description: 'Hunt wolves and collect their pelts for the tanner.',
  storyText: `The local tanner is running low on wolf pelts and needs more for his leather work.
Wolves have been spotted in the forest east of town.

"I'll pay good coin for quality wolf pelts. Just be careful out there -
those wolves hunt in packs."`,
  objectives: [
    {
      type: 'kill',
      targets: ['/areas/forest/wolf', 'forest_wolf', 'wolf'],
      targetName: 'Forest Wolf',
      required: 8,
    },
    {
      type: 'fetch',
      itemPaths: ['/items/quest/wolf_pelt', 'wolf_pelt'],
      itemName: 'Wolf Pelt',
      required: 5,
      consumeOnComplete: true,
    },
  ],
  rewards: {
    experience: 250,
    gold: 75,
    questPoints: 3,
  },
  prerequisites: {
    level: 4,
  },
  giverNpc: '/areas/town/tanner',
  area: 'forest',
  recommendedLevel: 5,
};

export const FOREST_QUESTS: QuestDefinition[] = [
  WOLF_PELTS,
];
```

---

## Builder Guide: Quest Giver NPCs

### Setting Up Quest Givers

Configure NPCs to offer and accept quests:

```typescript
// In your NPC file
import { NPC } from '../../std/npc.js';

export class Baker extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'Baker Haskell',
      shortDesc: 'Baker Haskell, the town baker',
      longDesc: 'A portly man covered in flour...',
    });

    // Configure quests this NPC offers
    this.setQuestsOffered(['aldric:rat_problem', 'aldric:bread_delivery']);

    // Configure quests this NPC accepts turn-ins for
    this.setQuestsTurnedIn(['aldric:rat_problem', 'aldric:bread_delivery']);
  }
}
```

### Quest Giver Methods

| Method | Description |
|--------|-------------|
| `setQuestsOffered(questIds)` | Set quests this NPC can give |
| `setQuestsTurnedIn(questIds)` | Set quests this NPC accepts |
| `addQuestOffered(questId)` | Add a single quest to offer |
| `addQuestTurnedIn(questId)` | Add a single quest to accept |
| `isQuestGiver()` | Returns true if NPC offers any quests |
| `getAvailableQuests(player)` | Get quests available to player |
| `getCompletedQuests(player)` | Get player's completed quests this NPC accepts |
| `getQuestsForPlayer(player)` | Get both available and completed quests |
| `getQuestIndicator(player)` | Get `!` or `?` indicator for NPC name |

### Quest Indicators in Room Descriptions

NPCs with quest indicators show them in room descriptions:

```
You see Baker Haskell {yellow}!{/} here.
```

The indicator changes based on quest state:
- `{yellow}!{/}` - Has available quests
- `{green}?{/}` - Can accept quest turn-in
- No indicator - No quests available

### Dynamic Quest Assignment

Add quests dynamically based on game events:

```typescript
// When player completes a certain action
npc.addQuestOffered('special:hidden_quest');

// Or conditionally in NPC creation
if (worldState.getFlag('dragon_awakened')) {
  this.addQuestOffered('main:dragon_slayer');
}
```

---

## Technical Reference

### QuestDaemon API

```typescript
import { getQuestDaemon } from '../daemons/quest.js';
const questDaemon = getQuestDaemon();

// Quest Registry
questDaemon.registerQuest(questDef);           // Register a quest
questDaemon.getQuest('aldric:rat_problem');    // Get quest by ID
questDaemon.getAllQuests();                    // Get all quests
questDaemon.getQuestsByArea('aldric');         // Get quests in area

// Player Data
questDaemon.getPlayerQuestData(player);        // Get full quest data
questDaemon.getQuestPoints(player);            // Get quest points

// State Queries
questDaemon.hasCompletedQuest(player, questId);  // Check completion
questDaemon.isQuestActive(player, questId);      // Check if active
questDaemon.getActiveQuest(player, questId);     // Get active state
questDaemon.getActiveQuests(player);             // Get all active

// Quest Lifecycle
questDaemon.canAcceptQuest(player, questId);   // Check eligibility
questDaemon.acceptQuest(player, questId);      // Accept quest
questDaemon.abandonQuest(player, questId);     // Abandon quest
questDaemon.canTurnInQuest(player, questId);   // Check turn-in
questDaemon.turnInQuest(player, questId);      // Turn in quest

// Progress Updates (called by system hooks)
questDaemon.updateKillObjective(player, npcPath, npcId);
questDaemon.updateFetchObjective(player, itemPath);
questDaemon.updateExploreObjective(player, roomPath);
questDaemon.updateTalkObjective(player, npcPath, keyword);
questDaemon.updateDeliverObjective(player, itemPath, npcPath);
questDaemon.updateEscortObjective(player, npcPath, roomPath);

// Custom Handlers
questDaemon.registerCustomHandler('name', handlerFn);
questDaemon.getCustomHandler('name');

// Display Helpers
questDaemon.getQuestLogEntry(player, questId);  // Single quest
questDaemon.getFullQuestLog(player);            // Full log
```

### PlayerQuestData Structure

Stored in `player.getProperty('questData')`:

```typescript
interface PlayerQuestData {
  active: PlayerQuestState[];              // Current quests
  completed: Record<QuestId, number>;      // Completed (ID -> timestamp)
  questPoints: number;                     // Total quest points
  failed?: QuestId[];                      // Failed quests
  repeatableTimestamps?: Record<QuestId, number>;  // Repeat cooldowns
}

interface PlayerQuestState {
  questId: QuestId;
  status: 'available' | 'active' | 'completed' | 'turned_in' | 'failed';
  objectives: ObjectiveProgress[];
  acceptedAt: number;
  completedAt?: number;
  deadline?: number;
}

interface ObjectiveProgress {
  index: number;
  current: number;
  required: number;
  complete: boolean;
  data?: Record<string, unknown>;  // e.g., visited locations
}
```

### Integration Hooks

The quest system integrates with other systems:

| System | File | Hook Location |
|--------|------|---------------|
| Combat | `daemons/combat.ts` | `handleDeath()` |
| Items | `std/item.ts` | `onTake()` |
| Movement | `std/living.ts` | After room `onEnter()` |
| NPCs | `std/npc.ts` | Quest giver methods |

### File Structure

```
mudlib/
  daemons/
    quest.ts                      # QuestDaemon singleton
  std/
    quest/
      types.ts                    # Type definitions
      definitions/
        index.ts                  # Quest definition exports
        aldric_quests.ts          # Aldric area quests
  cmds/player/
    _quest.ts                     # quest command
```

### Constants

```typescript
const QUEST_CONSTANTS = {
  MAX_ACTIVE_QUESTS: 25,          // Maximum concurrent quests
  MAX_COMPLETED_HISTORY: 200,     // Completed quests to track
  PLAYER_DATA_KEY: 'questData',   // Player property key
};
```

---

## Examples

### Example: Checking Quest Progress

```typescript
// In an NPC or custom handler
const questDaemon = getQuestDaemon();

if (questDaemon.isQuestActive(player, 'aldric:rat_problem')) {
  const state = questDaemon.getActiveQuest(player, 'aldric:rat_problem');
  if (state && state.status === 'completed') {
    player.receive('Ah, you\'ve dealt with those rats! Let me reward you.');
  } else {
    player.receive('Still working on those rats? Keep at it!');
  }
}
```

### Example: Quest-Gated Content

```typescript
// Block access until quest is complete
this.addConditionalExit('depths', '/areas/aldric_depths/entrance', (who) => {
  const questDaemon = getQuestDaemon();
  if (!questDaemon.hasCompletedQuest(who as QuestPlayer, 'aldric:map_the_depths')) {
    const receiver = who as MudObject & { receive?: (msg: string) => void };
    receiver.receive?.('The guard stops you. "Complete the mapping mission first!"\n');
    return false;
  }
  return true;
});
```

### Example: Custom Objective Handler

```typescript
// Register a custom handler for puzzle quests
const questDaemon = getQuestDaemon();

questDaemon.registerCustomHandler('solvePuzzle', (player, data) => {
  // Custom logic to check if puzzle was solved
  const puzzleState = player.getProperty('puzzleSolved');
  return puzzleState === true;
});

// In quest definition
{
  type: 'custom',
  description: 'Solve the ancient puzzle',
  handler: 'solvePuzzle',
  required: 1,
}
```

### Example: Quest Chain

```typescript
// First quest in chain
export const CHAIN_PART_1: QuestDefinition = {
  id: 'story:part1',
  name: 'The Beginning',
  nextQuest: 'story:part2',  // Unlocks next quest
  // ...
};

// Second quest
export const CHAIN_PART_2: QuestDefinition = {
  id: 'story:part2',
  name: 'The Journey',
  previousQuest: 'story:part1',
  prerequisites: {
    quests: ['story:part1'],  // Requires first quest
  },
  nextQuest: 'story:part3',
  // ...
};
```

### Example: Repeatable Daily Quest

```typescript
export const DAILY_HUNT: QuestDefinition = {
  id: 'daily:hunt',
  name: 'Daily Hunt',
  description: 'Hunt creatures in the wild (repeatable daily).',
  repeatable: true,
  repeatCooldown: 86400000,  // 24 hours in ms
  objectives: [
    {
      type: 'kill',
      targets: ['wolf', 'bear', 'boar'],
      targetName: 'Wild Animal',
      required: 10,
    },
  ],
  rewards: {
    experience: 50,
    gold: 20,
    questPoints: 1,
  },
  giverNpc: '/areas/town/huntmaster',
  area: 'town',
};
```

---

## Starter Quests (Aldric)

The Aldric starting area includes six example quests:

| Quest | Type | Level | Description |
|-------|------|-------|-------------|
| The Rat Problem | Kill | 1 | Kill 5 giant rats in the bakery cellar |
| Lost Supplies | Fetch | 3 | Recover 3 supply crates |
| Map the Depths | Explore | 5 | Visit 5 underground locations |
| Urgent Message | Deliver | 1 | Deliver letter to Master Vorn |
| Meet the Guildmasters | Talk | 1 | Speak with 4 guild leaders |
| Wolf Pelts | Kill + Fetch | 4 | Kill 8 wolves, collect 5 pelts |

These quests demonstrate various quest types and can serve as templates for creating new content.
