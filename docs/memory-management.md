# Memory Management System

MudForge includes a comprehensive memory management system designed to prevent object accumulation and memory leaks in long-running servers. This document covers all aspects of the system including automatic cleanup, configurable decay, room resets, and monitoring tools.

## Table of Contents

1. [Overview](#overview)
2. [Scheduler Cleanup](#scheduler-cleanup)
3. [Corpse Decay System](#corpse-decay-system)
4. [Room Reset System](#room-reset-system)
5. [Memory Monitoring](#memory-monitoring)
6. [Configuration Reference](#configuration-reference)
7. [Admin Commands](#admin-commands)
8. [Best Practices](#best-practices)

---

## Overview

The memory management system addresses several challenges in long-running MUD servers:

- **Object Accumulation**: Items dropped by players, NPC corpses, and cloned objects can accumulate indefinitely
- **Memory Leaks**: Destroyed objects may leave references in scheduler data structures
- **Corpse Management**: Both player and NPC corpses need configurable decay timers
- **Room State**: Rooms need periodic resets to restore default items and clean up clutter

### Components

| Component | Purpose |
|-----------|---------|
| Scheduler Cleanup | Removes destroyed objects from heartbeat tracking |
| Corpse Decay | Configurable timers for player and NPC corpse cleanup |
| Reset Daemon | Periodic room resets with item cleanup |
| Memory Stats | Monitoring efuns and admin commands |

---

## Scheduler Cleanup

### The Problem

When objects are destroyed via `efuns.destruct()`, they could remain registered in the scheduler's heartbeat set. This causes:

- Memory leaks (references to dead objects)
- Potential errors when the scheduler tries to call heartbeat on destroyed objects
- Gradual memory growth over time

### The Solution

The scheduler now includes a `cleanupForObject()` method that is automatically called when any object is destroyed:

```typescript
// In scheduler.ts
cleanupForObject(object: MudObject): void {
  this.heartbeatObjects.delete(object);
}
```

The object registry calls this during destruction:

```typescript
// In object-registry.ts destroy()
const scheduler = getScheduler();
scheduler.cleanupForObject(object);
```

### Automatic Behavior

This cleanup is **automatic** - no configuration or action is required. Any object that:

1. Registered for heartbeat via `efuns.setHeartbeat(object, true)`
2. Is later destroyed via `efuns.destruct(object)`

Will have its heartbeat registration automatically cleaned up.

---

## Corpse Decay System

### Overview

When living entities (players or NPCs) die, a corpse object is created containing their inventory. The corpse decay system ensures these corpses don't accumulate indefinitely.

### NPC Corpse Decay

NPC corpses decay after a configurable timeout (default: 5 minutes).

**What happens when an NPC corpse decays:**
1. Room receives message: "The corpse of [name] crumbles to dust."
2. All items in the corpse are dropped to the room floor
3. Any gold scatters across the ground
4. The corpse object is destroyed

### Player Corpse Decay

Player corpses also decay after a configurable timeout (default: 60 minutes).

**What happens when a player corpse decays:**
1. The player's ghost (if online) receives a notification
2. Room receives the decay message
3. All items are dropped to the room floor
4. Gold scatters on the ground
5. The corpse is destroyed

**Ghost Notification:**
```
Your corpse has decayed! All items have been dropped where you died.
```

### Examining Corpses

When players examine a corpse, they see the decay timer:

```
This is the lifeless body of Goblin.
You see 15 gold coins.
The corpse has:
  a rusty dagger
  leather armor
The corpse will decay in about 3 minutes.
```

### Configuration

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `corpse.playerDecayMinutes` | 60 | 0-480 | Minutes until player corpses decay (0 = never) |
| `corpse.npcDecayMinutes` | 5 | 1-60 | Minutes until NPC corpses decay |

**Setting via config command:**
```
config corpse.playerDecayMinutes 120    # 2 hours for player corpses
config corpse.npcDecayMinutes 10        # 10 minutes for NPC corpses
```

### Programmatic Control

Corpses can have their decay time modified programmatically:

```typescript
// Get a corpse object
const corpse = efuns.findObject('corpse-id');

// Set custom decay time (in milliseconds)
corpse.setDecayTime(10 * 60 * 1000);  // 10 minutes

// Cancel decay entirely
corpse.cancelDecay();

// Check remaining time
const remaining = corpse.decayRemaining;  // milliseconds, -1 if no decay
```

---

## Room Reset System

### Overview

The Reset Daemon (`/daemons/reset`) provides periodic room resets to:

1. Clean up dropped items that don't belong to players
2. Re-clone default room items that are missing
3. Execute custom room reset logic

### How It Works

Every reset cycle (default: 15 minutes):

1. The daemon iterates through all loaded rooms
2. For each room:
   - Removes "orphaned" items (items without active owners)
   - Calls `room.onReset()` for custom behavior
   - Re-clones any missing default items

### Item Cleanup Rules

Items are cleaned up if they meet ALL of these criteria:

- Located directly in a room (not in a container or on a player)
- Have `takeable = true` (not a room fixture)
- Either have no owner, or their owner is no longer in the game

Items that are **NOT** cleaned up:

- Players and NPCs
- Items with `takeable = false` (room features, furniture)
- Items owned by a player currently in the game

### Room Default Items

Rooms can define default items that are re-cloned if missing:

```typescript
// In a room file
export class TavernRoom extends Room {
  async onCreate(): Promise<void> {
    this.shortDesc = 'The Foaming Flagon';
    this.longDesc = 'A cozy tavern with a roaring fireplace.';

    // Define items to clone on reset
    this.setItems([
      '/items/food/bread',
      '/items/drink/ale_mug',
    ]);

    // Optional: message shown when room resets (if players present)
    this.setResetMessage('{dim}A barmaid tidies up the tavern.{/}');
  }
}
```

### Custom Reset Behavior

Override `onReset()` for custom reset logic:

```typescript
export class GuardRoom extends Room {
  async onReset(): Promise<void> {
    // Call parent to handle default items
    await super.onReset();

    // Custom logic: respawn guard if not present
    const hasGuard = this.inventory.some(obj =>
      obj.objectId?.includes('/npcs/guard')
    );

    if (!hasGuard) {
      const guard = await efuns.cloneObject('/npcs/guard');
      if (guard) {
        await guard.moveTo(this);
      }
    }
  }
}
```

### Configuration

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `reset.intervalMinutes` | 15 | 5-120 | Minutes between room reset cycles |
| `reset.cleanupDroppedItems` | true | - | Whether to clean up orphaned items |

**Setting via config command:**
```
config reset.intervalMinutes 30          # Reset every 30 minutes
config reset.cleanupDroppedItems false   # Disable item cleanup
```

### Manual Reset

Admins can force an immediate reset:

```typescript
import { getResetDaemon } from '/daemons/reset';

// Force reset all rooms now
const daemon = getResetDaemon();
await daemon.forceReset();

// Reset a single room
const room = efuns.findObject('/areas/town/tavern');
await daemon.resetRoom(room);
```

---

## Memory Monitoring

### Available Efuns

#### `efuns.getMemoryStats()`

Returns current process memory usage:

```typescript
const stats = efuns.getMemoryStats();
// {
//   success: true,
//   heapUsed: 45678912,      // bytes
//   heapTotal: 67108864,     // bytes
//   external: 1234567,       // bytes
//   rss: 89012345,           // bytes (resident set size)
//   arrayBuffers: 123456,    // bytes
//   heapUsedMb: 43.56,       // megabytes
//   heapTotalMb: 64.00,      // megabytes
//   rssMb: 84.91             // megabytes
// }
```

#### `efuns.getObjectStats()`

Returns detailed object registry statistics:

```typescript
const stats = efuns.getObjectStats();
// {
//   success: true,
//   totalObjects: 156,
//   blueprints: 45,
//   clones: 111,
//   byType: {
//     Room: 23,
//     Player: 2,
//     NPC: 15,
//     Item: 67,
//     Container: 12,
//     ...
//   },
//   largestInventories: [
//     { objectId: '/areas/town/market', count: 45 },
//     { objectId: '/areas/dungeon/treasury', count: 32 },
//     ...
//   ],
//   blueprintCloneCounts: [
//     { path: '/std/gold-pile', clones: 34 },
//     { path: '/npcs/goblin', clones: 12 },
//     ...
//   ]
// }
```

#### `efuns.getDriverStats()`

Returns comprehensive driver statistics (requires senior builder+):

```typescript
const stats = efuns.getDriverStats();
// {
//   success: true,
//   memory: { heapUsed, heapTotal, rss, ... },
//   uptime: { seconds: 3600, formatted: '1h 0m 0s' },
//   objects: { total: 156, blueprints: 45, clones: 111 },
//   scheduler: { heartbeats: 23, callouts: 5, heartbeatInterval: 2000 },
//   commands: { total: 162 },
//   players: { active: 5, connected: 3 },
//   nodeVersion: 'v20.10.0',
//   platform: 'darwin'
// }
```

### Permission Requirements

| Efun | Required Level |
|------|----------------|
| `getMemoryStats()` | Builder (1) |
| `getObjectStats()` | Builder (1) |
| `getDriverStats()` | Senior Builder (2) |

---

## Admin Commands

### memstats

Display memory and object statistics.

**Usage:**
```
memstats              # Show all statistics
memstats memory       # Show memory usage only
memstats objects      # Show object counts only
memstats reset        # Show reset daemon statistics
```

**Example Output:**
```
=== MudForge Memory Statistics ===

Memory Usage:
  Heap Used:  43.56 MB
  Heap Total: 64.00 MB
  RSS:        84.91 MB
  Usage:      [██████████████░░░░░░] 68.1%

Object Statistics:
  Total Objects: 156
  Blueprints:    45
  Clones:        111

Objects by Type:
  Room                 23
  Item                 67
  NPC                  15
  Player               2
  Container            12

Largest Inventories:
  /areas/town/market                        45 items
  /areas/dungeon/treasury                   32 items

Blueprints with Most Clones:
  /std/gold-pile                            34 clones
  /npcs/goblin                              12 clones

Reset Daemon:
  Status:         Running
  Total Resets:   12
  Items Cleaned:  234
  Last Reset:     2:45:30 PM
  Next Reset:     in 8 minutes
```

### config

View and modify memory management settings:

```
config                           # List all settings
config corpse.playerDecayMinutes # View specific setting
config reset.intervalMinutes 30  # Change setting
config reset corpse.npcDecayMinutes  # Reset to default
```

---

## Configuration Reference

### All Memory Management Settings

| Key | Default | Type | Range | Description |
|-----|---------|------|-------|-------------|
| `corpse.playerDecayMinutes` | 60 | number | 0-480 | Player corpse decay time (0=never) |
| `corpse.npcDecayMinutes` | 5 | number | 1-60 | NPC corpse decay time |
| `reset.intervalMinutes` | 15 | number | 5-120 | Room reset interval |
| `reset.cleanupDroppedItems` | true | boolean | - | Clean orphaned items on reset |

### Recommended Configurations

**High Traffic Server:**
```
config reset.intervalMinutes 10
config corpse.npcDecayMinutes 3
config corpse.playerDecayMinutes 30
```

**Roleplay Server (longer persistence):**
```
config reset.intervalMinutes 60
config corpse.npcDecayMinutes 15
config corpse.playerDecayMinutes 120
```

**Development/Testing:**
```
config reset.intervalMinutes 5
config corpse.npcDecayMinutes 1
config corpse.playerDecayMinutes 5
```

---

## Best Practices

### For Builders

1. **Use `setItems()` for respawning items** - Don't manually clone items in `onCreate()` if you want them to respawn on reset.

2. **Mark room fixtures as non-takeable** - Items that shouldn't be cleaned up should have `takeable = false`.

3. **Override `onReset()` for NPCs** - Use the reset hook to respawn NPCs rather than relying on separate spawn timers.

### For Admins

1. **Monitor memory regularly** - Use `memstats` periodically to check for unusual growth.

2. **Watch clone counts** - High clone counts for specific blueprints may indicate a leak.

3. **Tune reset intervals** - Busier servers benefit from shorter reset intervals.

4. **Player corpse balance** - Longer decay times are more player-friendly but use more memory.

### For Developers

1. **Always call `efuns.destruct()`** - Never just remove references; always properly destroy objects.

2. **Clean up heartbeats** - If your object uses heartbeat, ensure it's destroyed properly (cleanup is automatic).

3. **Test reset behavior** - Verify your rooms reset correctly by using the reset daemon's `resetRoom()` method.

4. **Use `getObjectStats()` for debugging** - Track object counts during development to catch leaks early.

---

## Troubleshooting

### Memory Growing Despite Resets

Check for:
- Objects not being properly destroyed (use `getObjectStats()` to find accumulating types)
- Items marked as `takeable = false` that should be cleanable
- Custom code that clones objects without destroying them

### Corpses Not Decaying

Verify:
- Config settings are correct (`config corpse.npcDecayMinutes`)
- The corpse was created via `initFromDead()` which sets up the timer
- `efuns.callOut` is working (check scheduler stats)

### Reset Not Running

Check:
- Reset daemon is in preload list (`/daemons/reset` in master.ts)
- Daemon status via `memstats reset`
- Config setting `reset.intervalMinutes` is reasonable

### High Memory Usage

Actions to take:
1. Run `memstats` to identify the source
2. Check "Largest Inventories" for rooms with too many items
3. Check "Blueprints with Most Clones" for leak sources
4. Consider reducing reset interval
5. Review custom code for proper object destruction
