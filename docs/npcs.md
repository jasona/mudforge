# NPC Creation Guide

This guide covers how to build robust NPCs in MudForge, from simple ambient actors to combat AI units.

## Overview

`NPC` extends `Living` and adds:

- ambient chat and response triggers
- aggression/wandering/respawn
- loot and combat tuning
- threat and behavior AI integration
- optional quest-giver and AI dialogue support

Primary implementation: `mudlib/std/npc.ts`.

## Minimal NPC Example

```typescript
import { NPC } from '../std/npc.js';

export class TownGuard extends NPC {
  constructor() {
    super();
    this.setNPC({
      name: 'town guard',
      shortDesc: 'a vigilant town guard',
      longDesc: 'A disciplined guard watches the street for trouble.',
      level: 8,
    });
  }
}
```

## Core Configuration: `setNPC()`

Common options:

- identity: `name`, `shortDesc`, `longDesc`, `gender`
- baseline combat: `level`, `health`, `maxHealth`
- chat behavior: `chats`, `chatChance`
- movement: `wandering`, `wanderChance`, `wanderDirections`, `wanderAreaRestricted`
- lifecycle: `respawnTime`
- combat rewards: `baseXP`, `gold`, `goldDrop`, `lootTable`
- flavor: `lookSound`

## Ambient Chat and Reactions

### Random Ambient Chat

```typescript
this.addChat('Stay vigilant.', 'say', 100);
this.addChat('checks the perimeter.', 'emote', 50);
this.setChatChance(20);
```

### Triggered Responses

```typescript
this.addResponse(/help|danger/i, 'Stay behind me.', 'say');
```

## Combat Setup

### Fast Setup

Use level autobalance:

```typescript
this.setLevel(12, 'normal'); // normal | miniboss | elite | boss
```

This auto-derives:

- HP/MP
- baseline stats
- XP and gold scaling defaults
- natural armor/dodge scaling

### Explicit Combat Tuning

```typescript
this.setCombat({
  level: 12,
  baseXP: 120,
  goldDrop: { min: 20, max: 60 },
  lootTable: [{ itemPath: '/areas/items/potion', chance: 25 }],
});
```

## Loot Models

NPCs can drop:

- static loot table entries
- random generated loot (via loot daemon config)
- explicit carried gold or range-based gold drops

See `docs/random-loot.md` for generation details.

## Threat and Targeting

NPC threat table APIs include:

- `addThreat(source, amount)`
- `getHighestThreatTarget()`
- `applyTaunt(source, duration)`

This is used by combat and behavior systems for target selection.

See `docs/aggro-threat.md` for system-level details.

## Aggression and Wandering

### Aggression

```typescript
this.setAggressive((target) => target.level < this.level);
```

### Wandering

```typescript
this.enableWandering(['north', 'south'], true);
this.setWanderChance(10);
```

## Respawn

```typescript
this.setRespawn(300); // seconds
```

On death, NPC corpse/loot is resolved, then respawn cloning occurs if configured.

## Behavior AI Integration

For skill-driven combat AI, configure:

- `setBehavior(...)`
- `learnSkills(...)` or `learnDefaultGuildSkills()`

See full behavior details in `docs/behavior-system.md`.

## Quest Giver Integration

NPC quest helper APIs:

- `setQuestsOffered([...])`
- `setQuestsTurnedIn([...])`
- indicator checks for `!` and `?`

See `docs/quests.md` for quest definitions/workflows.

## Engage System Properties

NPCs support the engage dialogue system, which opens a WoW-style speech bubble overlay when a player uses `engage <npc>`. All NPCs are engageable by default; these properties customize the experience.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `engageGreeting` | `string \| null` | `null` | Custom greeting text shown in the speech bubble. When `null`, a contextual default is generated based on NPC kind and quest state. |
| `engageSound` | `string \| null` | `null` | Sound effect played when dialogue opens. Falls back to `lookSound` if not set. Uses the `discussion` sound category. |
| `engageAlignment` | `EngageAlignment` | `{vertical: 'bottom', horizontal: 'right'}` | Panel positioning on the client screen. Options: `{vertical: 'top'|'middle'|'bottom', horizontal: 'left'|'center'|'right'}` or `'centered'`. |
| `engageKind` | `'humanoid' \| 'creature'` | auto-inferred | Type of NPC for portrait generation and greeting style. Creatures get growl/snarl greetings; humanoids get spoken greetings. |

### Setting via `setNPC()`

```typescript
import { NPC } from '../std/npc.js';

export class ForestSpirit extends NPC {
  constructor() {
    super();
    this.setNPC({
      name: 'forest spirit',
      shortDesc: 'a shimmering forest spirit',
      longDesc: 'A translucent figure of leaves and light hovers among the trees.',
      level: 15,
      engageGreeting: 'The ancient woods speak through me, traveler...',
      engageSound: 'wind_chimes',
      engageAlignment: { vertical: 'middle', horizontal: 'center' },
      engageKind: 'creature',
    });
  }
}
```

### Setting via Individual Setters

```typescript
this.setEngageGreeting('Welcome to my shop!');
this.setEngageSound('bell_ring');
this.setEngageAlignment({ vertical: 'bottom', horizontal: 'left' });
this.setEngageKind('humanoid');
```

See [Engage System](engage-system.md) for full documentation including protocol messages, client panel details, and quest integration.

## Optional AI Dialogue

NPCs can use AI-backed conversational responses via AI context configuration and per-player conversation memory.

See `docs/ai-integration.md`.

## Builder Checklist

- set clear IDs/names for command targeting
- ensure combat level/rewards match area difficulty
- test respawn timing with room density
- verify threat behavior with party play
- verify loot outcomes across many kills

## Key Files

- `mudlib/std/npc.ts`
- `mudlib/daemons/combat.ts`
- `mudlib/daemons/behavior.ts`
- `mudlib/daemons/quest.ts`
- `mudlib/daemons/loot.ts`

## Related Docs

- [Engage System](engage-system.md) - NPC dialogue overlay
- [Portraits](portraits.md) - AI-generated portraits
- [Behavior System](behavior-system.md) - NPC combat AI
- [Combat](combat.md) - Combat system
- [Quests](quests.md) - Quest system
- [Random Loot](random-loot.md) - Loot generation
