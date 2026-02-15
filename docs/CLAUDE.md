# docs/ - Project Documentation (75+ files)

## Architecture & Design

- `architecture.md` - System design, driver/mudlib separation, V8 isolates
- `efuns.md` (19K) - Complete API reference for ~50+ external functions
- `mudlib-guide.md` - Game content creation guide
- `commands.md` (29K) - Player/builder/admin command reference

## Game Systems

Combat: `aggro-threat.md`, `combat.md`, `balance.md`
Content: `quests.md`, `guilds.md`, `party-system.md`, `mercenaries.md`, `trainers.md`
Character: `professions.md`, `progression-and-leveling.md`, `races.md`, `death-resurrection.md`
World: `visibility.md`, `shadows.md`, `daemons.md`, `terrain.md`
Features: `pets.md`, `vehicles.md`, `lore-system.md`, `random-loot.md`, `buffs-debuffs.md`, `encumbrance.md`

## Client & UI

`client.md`, `client-gui-protocol-messages.md`, `colors.md`, `emoji-support.md`, `gui-modals.md` (22K), `map-navigation.md`, `sound-system.md` (19K)

## External Integrations

`discord-integration.md` (18K), `ai-integration.md` (14K), `giphy-integration.md` (15K), `intermud.md`

## Operations

`deployment.md`, `getting-started.md`, `connection-and-session-lifecycle.md`, `persistence-and-save-data.md`

## Subdirectories

- `audit/` - Architecture conformance, type safety, codebase survey reports
- `audit/baseline/` - JSON baselines for CI quality gates (circular-deps.json, code-metrics.json)
- `runbooks/` - Incident response, graceful shutdown, restore from backup
