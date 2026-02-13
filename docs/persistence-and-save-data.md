# Persistence and Save Data

This guide explains what MudForge saves, where it saves it, and when persistence occurs.

## Overview

MudForge uses JSON file persistence for player and world state.

Driver persistence components:

- `src/driver/persistence/file-store.ts`
- `src/driver/persistence/serializer.ts`
- `src/driver/persistence/loader.ts`

## Storage Layout

Default data root:

- `mudlib/data/`

Important files/directories:

- `mudlib/data/players/<name>.json` - per-player save files
- `mudlib/data/world-state.json` - world snapshot state
- `mudlib/data/permissions.json` - permission/domain state

## Player Save Contents

Player saves include core and extended data such as:

- identity and profile info
- location
- stats, level, XP, HP/MP
- inventory and equipment mapping
- currencies (carried and banked)
- custom properties/config values
- exploration/map discovery data
- guild data and relevant progression state
- pets/mercenaries/effects where applicable

Player serialization logic is primarily in `mudlib/std/player.ts` (`save()` / `restore()`).

## World Save Contents

World snapshots serialize object state and references:

- object path/clone identity
- serializable public properties
- environment/inventory references
- timestamp and format versioning metadata

World restoration uses a two-pass pattern:

1. instantiate/deserialize objects
2. restore references/placement

## Save Triggers

Common save moments:

- explicit player save calls (e.g., quit/disconnect flows)
- disconnect timeout handling
- world auto-save interval (if enabled by file-store scheduling)
- permission updates and explicit persistence calls

## Quit vs Disconnect

### Proper Quit (`quit`)

- player is saved
- active player registration is cleaned up
- connection closes cleanly

### Unexpected Disconnect

- player moved to void for link-dead handling
- disconnect timer starts
- player save occurs during disconnect handling
- reconnection can resume within timeout window

## Special Save Behaviors

- Void location is not persisted as final gameplay location; previous valid location is preserved when possible.
- Unsavable items are filtered/dropped according to player save logic.
- Generated loot items use dedicated generated-item metadata paths for restoration.

## Builder/Admin Operational Notes

- Back up `mudlib/data/` before major migrations or mechanics overhauls.
- Validate schema compatibility when changing player object fields.
- Keep transient/runtime-only properties prefixed/internal so they are not serialized unintentionally.
- Test restore for inventory-heavy and long-playtime characters before deployment.

## Troubleshooting

If persistence appears broken:

1. Confirm writable `mudlib/data/` path.
2. Verify player file exists and contains valid JSON.
3. Check driver logs around `savePlayer`/load failures.
4. Confirm restore path targets valid object locations.
5. Validate item blueprint paths for restored inventory.

## Related Docs

- `docs/architecture.md`
- `docs/player-features.md`
- `docs/connection-and-session-lifecycle.md`
