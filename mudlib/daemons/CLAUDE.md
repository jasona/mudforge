# mudlib/daemons/ - Singleton Background Services (33 daemons)

## Singleton Pattern

All daemons use lazy initialization:
```typescript
let daemon: DaemonClass | null = null;
export function getDaemon(): DaemonClass {
  if (!daemon) daemon = new DaemonClass();
  return daemon;
}
export function resetDaemon(): void { daemon = null; }
```

## Core Daemons

- `login.ts` (~1150 lines) - Authentication, character creation, reconnection. Rate limiting (8 attempts/5 min). State machine: name→password→confirm→email→gender.
- `combat.ts` (~1794 lines) - Combat orchestration, round scheduling (1-5s dynamic), hit/dodge/parry/riposte/block resolution, threat calculation, death handling.
- `channels.ts` (~1561 lines) - Multi-network communication (local, I3, I2, Grapevine, Discord). Channel types: public, permission, membership, intermud.
- `guild.ts` (~1337 lines) - Multi-guild system with skills, levels, XP. Passive modifiers applied on login.
- `quest.ts` (~1309 lines) - Quest tracking with kill/fetch/explore/deliver/talk/escort/custom objectives. Rewards: XP, quest points, gold, items, guild XP.
- `config.ts` - Centralized mud-wide configuration with 35+ settings. Persistent to `/data/config/settings.json`.

## World Daemons

- `area.ts` (~1731 lines) - Draft area builder with grid layout and publish-to-files system.
- `time.ts` - In-game day/night cycle. Phases: dawn(5-7), day(7-18), dusk(18-20), night(20-5).
- `reset.ts` - Periodic room resets (default 15 min). Respawns missing items/NPCs.
- `map.ts` - Map/minimap generation.
- `loot.ts` - Random loot generation for NPCs. Quality tiers, affixes, enchants.

## Character Daemons

- `race.ts` - Race definitions and latent abilities. Applied on login.
- `profession.ts` - Profession/crafting skill tracking.
- `gathering.ts` - Resource gathering nodes.
- `party.ts` (~1248 lines) - Party grouping and auto-assist.
- `pet.ts` - Pet summoning and management.
- `mercenary.ts` - Mercenary hiring system.
- `portrait.ts` - AI character portrait generation with caching.

## Utility Daemons

- `help.ts` (~1306 lines) - Help topics with permission-level access control.
- `soul.ts` - Emote/social action system.
- `behavior.ts` - NPC behavior script management.
- `aggro.ts` - NPC grudge/threat memory (24h expiry, persistent).
- `announcement.ts` - System announcements.
- `admin.ts` - Admin utilities.
- `snoop.ts` - Admin snooping utility.
- `tutorial.ts` - New player tutorial progression.
- `lore.ts` - World lore management.
- `vehicle.ts` - Vehicle system.
- `bots.ts` - Simulated player bots.

## External Integration Daemons

- `discord.ts` - Discord bridge.
- `intermud.ts` (~1142 lines) - Intermud 3 protocol (TCP).
- `intermud2.ts` - Intermud 2 protocol (UDP).
- `grapevine.ts` - Grapevine cross-MUD network (WebSocket).

## Key Patterns

- All file I/O via `efuns.readFile()`, `efuns.writeFile()`, `efuns.fileExists()`
- Scheduling via `efuns.callOut()`, `efuns.removeCallOut()`
- Dirty flag pattern: track changes, only save when `_dirty` is true
- Type-safe player interfaces (QuestPlayer, GuildPlayer, etc.) for duck-typing
- Dynamic imports to avoid circular dependencies (quest daemon → guild daemon)
