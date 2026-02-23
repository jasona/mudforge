# src/driver/persistence/ - Pluggable Persistence System

## Files

- `adapter.ts` - PersistenceAdapter interface and PermissionsData type. All adapters implement this.
- `adapter-factory.ts` - Singleton factory: getAdapter(), createAdapter(), setAdapter(), resetAdapter().
- `filesystem-adapter.ts` - File-based adapter. Atomic writes (temp + rename), .bak backups, directory auto-creation.
- `supabase-adapter.ts` - Supabase adapter. Routes namespaces to dedicated tables, images to Storage bucket.
- `serializer.ts` - Serializes/deserializes MudObject state to JSON. Handles inventory, equipment, properties.
- `loader.ts` - Restores objects from saved JSON data. Uses adapter for reads.
- `file-store.ts` - Legacy file store (deprecated, kept for reference).
- `index.ts` - Barrel re-exports.

## Key Patterns

- Adapter selected via `PERSISTENCE_ADAPTER` env var (default: `filesystem`)
- Driver calls `createAdapter()` + `adapter.initialize()` at startup, `adapter.shutdown()` at stop
- EfunBridge serializes players via `getSerializer().serializePlayer()` before passing to adapter
- Generic data store: `saveData(namespace, key, data)` — filesystem maps to `{dataPath}/{namespace}/{key}.json`
- Supabase adapter routes namespaces to dedicated tables (portraits, bots, lore, etc.) with game_state fallback
- Atomic writes on filesystem prevent corruption on crash
- Player names normalized to lowercase by all adapters
