# src/driver/persistence/ - File-Based Save System

## Files

- `serializer.ts` - Serializes/deserializes MudObject state to JSON. Handles inventory, equipment, properties.
- `file-store.ts` - Atomic file writes (temp file + rename pattern to prevent corruption). Player data saved to `mudlib/data/players/`.
- `loader.ts` - Restores objects from saved JSON data. Rebuilds inventory and equipment references.
- `index.ts` - Barrel re-exports.

## Key Patterns

- Player data: JSON files at `mudlib/data/players/{name}.json`
- World state: `mudlib/data/world-state.json`
- Atomic writes prevent corruption on crash
- Auto-save interval configurable via `autoSaveIntervalMs`
