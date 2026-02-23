# MudForge Documentation

Welcome to the MudForge docs! Whether you're a player exploring the game, a builder creating content, or an admin running a server, you'll find what you need here.

---

## Where Do I Start?

| I want to... | Start here |
|---|---|
| Set up MudForge for the first time | [Getting Started](getting-started.md) |
| Learn how the engine works | [Architecture](architecture.md) |
| Create rooms, items, and NPCs | [Mudlib Guide](mudlib-guide.md) |
| Look up a command | [Commands Reference](commands.md) |
| Deploy to production | [Deployment Guide](deployment.md) |

---

## Player Guide

Everything a player needs to know about playing the game.

| Topic | Description |
|---|---|
| [Character Creation and Login](character-creation-and-login.md) | Creating your character and logging in |
| [Commands Reference](commands.md) | Full list of player, builder, and admin commands |
| [Player Features](player-features.md) | Overview of player capabilities |
| [Progression and Leveling](progression-and-leveling.md) | XP, leveling, and stat advancement |
| [Races](races.md) | Playable races and racial abilities |
| [Guilds](guilds.md) | Multi-guild system with skills and levels |
| [Combat](combat.md) | Combat mechanics, weapons, and tactics |
| [Death and Resurrection](death-resurrection.md) | What happens when you die |
| [Quests](quests.md) | Quest system and objectives |
| [Party System](party-system.md) | Grouping up with other players |
| [Professions](professions.md) | Crafting, gathering, and movement skills |
| [Merchants](merchants.md) | Buying, selling, and shop interface |
| [Banking and Gold](banking-and-gold.md) | Economy and banking system |
| [Pets](pets.md) | Pet summoning and management |
| [Mercenaries](mercenaries.md) | Hiring NPC companions |
| [Vehicles](vehicles.md) | Transportation system |
| [Map and Navigation](map-navigation.md) | Minimap and world navigation |
| [Engage System](engage-system.md) | NPC dialogue overlays |
| [Tutorial System](tutorial-system.md) | New player tutorial |
| [Colors](colors.md) | Color codes for display names and chat |
| [Emoji Support](emoji-support.md) | Using emoji in-game |
| [Sound System](sound-system.md) | Ambient sounds and music |

---

## Builder Guide

For builders creating game content: rooms, areas, NPCs, items, and more.

### Getting Started Building

| Topic | Description |
|---|---|
| [Mudlib Guide](mudlib-guide.md) | Creating rooms, items, NPCs, merchants, and more |
| [Efuns Reference](efuns.md) | Complete API for all ~55 external functions |
| [Commands Reference](commands.md) | Builder commands (file system, AI tools, object manipulation) |
| [Permissions](permissions.md) | Permission levels and domain access |

### World Building

| Topic | Description |
|---|---|
| [Area Builder](area-builder.md) | Grid-based area builder GUI |
| [NPC Guide](npcs.md) | Creating NPCs with chat, responses, and AI |
| [Behavior System](behavior-system.md) | NPC behavior scripts and combat AI |
| [Terrain](terrain.md) | Terrain types and outdoor room properties |
| [Visibility](visibility.md) | Light levels and visibility mechanics |
| [Sky and Time](sky-and-time-display.md) | Day/night cycle and time system |

### Items and Equipment

| Topic | Description |
|---|---|
| [Random Loot](random-loot.md) | Loot tables, quality tiers, and enchantments |
| [Encumbrance](encumbrance.md) | Weight and carry limits |
| [Buffs and Debuffs](buffs-debuffs.md) | Temporary stat modifiers |
| [Campfires](campfires.md) | Campfire crafting and rest bonuses |

### Combat and Balance

| Topic | Description |
|---|---|
| [Combat](combat.md) | Combat rounds, hit resolution, threat |
| [Aggro and Threat](aggro-threat.md) | NPC grudge and threat memory |
| [Balance](balance.md) | Game balance framework and tuning |
| [Trainers](trainers.md) | Stat training NPCs |

### AI-Powered Content

| Topic | Description |
|---|---|
| [AI Integration](ai-integration.md) | AI setup, NPC dialogue, prompt templates, and game theme |
| [Lore System](lore-system.md) | World lore for AI consistency |
| [Portraits](portraits.md) | AI-generated character and item images |
| [Bots](bots.md) | AI-powered simulated players |

---

## Admin and Operations

For administrators running and maintaining a MudForge server.

### Setup and Deployment

| Topic | Description |
|---|---|
| [Getting Started](getting-started.md) | Installation and first run |
| [Setup Wizard](setup-wizard.md) | Initial server configuration wizard |
| [Deployment](deployment.md) | Docker, PM2, reverse proxy, environment variables |
| [Connection and Session Lifecycle](connection-and-session-lifecycle.md) | WebSocket connections, reconnection, and sessions |

### Data and Persistence

| Topic | Description |
|---|---|
| [Persistence and Save Data](persistence-and-save-data.md) | How player and world data is saved |
| [Persistence Adapter](persistence-adapter.md) | Pluggable storage backends (filesystem, Supabase) |
| [Memory Management](memory-management.md) | V8 isolate memory limits and monitoring |

### External Integrations

| Topic | Description |
|---|---|
| [Discord Integration](discord-integration.md) | Two-way Discord channel bridge |
| [Giphy Integration](giphy-integration.md) | GIF sharing on channels |
| [Intermud](intermud.md) | Cross-MUD communication (I3, I2, Grapevine) |
| [Announcements](announcements.md) | System-wide announcements |

### Release Management

| Topic | Description |
|---|---|
| [Release Checklist](release-checklist.md) | Pre-release checklist |
| [Release Freeze Policy](release-freeze-policy.md) | Code freeze guidelines |
| [Soft Launch Burn-In](soft-launch-burn-in.md) | Stability testing before launch |

---

## Engine Reference

Deep technical reference for the MudForge engine internals.

| Topic | Description |
|---|---|
| [Architecture](architecture.md) | Driver/mudlib separation, V8 isolates, object model |
| [Efuns Reference](efuns.md) | Complete external function API (~55 functions) |
| [Daemons](daemons.md) | All 33+ background services and their APIs |
| [Commands Reference](commands.md) | Full command reference with examples |
| [Shadows](shadows.md) | Object shadow/overlay system |
| [Client](client.md) | Web client architecture |
| [GUI Modals](gui-modals.md) | Client GUI modal system |
| [Protocol Messages](client-gui-protocol-messages.md) | Server-to-client protocol message reference |

---

## Runbooks

Step-by-step procedures for common operational tasks.

| Runbook | Description |
|---|---|
| [Graceful Shutdown](runbooks/graceful-shutdown.md) | How to safely stop the server |
| [Restore from Backup](runbooks/restore-from-backup.md) | Recovering data from backups |
| [Incident Response](runbooks/incident-response.md) | Handling production incidents |

---

## Audits

Codebase quality reports and baselines.

| Report | Description |
|---|---|
| [Architecture Conformance](audit/architecture-conformance.md) | Architecture rule compliance |
| [Type Safety](audit/type-safety.md) | TypeScript type safety analysis |
| [Codebase Survey](audit/codebase-survey.md) | Codebase metrics and overview |

---

## Legal

- [Privacy Policy](privacy-policy.md)
- [Terms of Service](terms-of-service.md)
