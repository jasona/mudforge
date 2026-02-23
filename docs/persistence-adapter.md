# Persistence Adapter

MudForge uses a pluggable persistence adapter pattern for all stateful data. The default adapter uses the local filesystem (JSON files); an optional Supabase adapter stores data in a PostgreSQL database with Supabase Storage for binary assets.

## Architecture

```
             ┌─────────────────────────┐
             │    EfunBridge / Loader   │
             │   Driver / Server APIs   │
             └───────────┬─────────────┘
                         │
              ┌──────────▼──────────┐
              │  PersistenceAdapter  │  ← interface
              └──────────┬──────────┘
                    ┌────┴────┐
            ┌───────▼──┐  ┌──▼────────┐
            │Filesystem│  │ Supabase  │
            │ Adapter   │  │ Adapter   │
            └──────────┘  └───────────┘
```

All persistence flows through a single `PersistenceAdapter` interface defined in `src/driver/persistence/adapter.ts`. The active adapter is managed as a singleton by the adapter factory in `src/driver/persistence/adapter-factory.ts`.

## Configuration

Set the adapter via environment variable:

```bash
# Filesystem (default)
PERSISTENCE_ADAPTER=filesystem

# Supabase
PERSISTENCE_ADAPTER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # service_role key (NOT the anon/publishable key)
```

These map to `DriverConfig` fields in `src/driver/config.ts`:

- `persistenceAdapter` — `'filesystem'` or `'supabase'`
- `supabaseUrl` — Supabase project API URL
- `supabaseServiceKey` — Supabase service role JWT

## PersistenceAdapter Interface

All methods are async to support both local and remote backends.

### Lifecycle

```typescript
initialize(): Promise<void>   // Create directories, connect to DB
shutdown(): Promise<void>      // Flush writes, close connections
```

### Player Persistence

```typescript
savePlayer(data: PlayerSaveData): Promise<void>
loadPlayer(name: string): Promise<PlayerSaveData | null>
playerExists(name: string): Promise<boolean>
listPlayers(): Promise<string[]>
deletePlayer(name: string): Promise<boolean>
```

Player names are normalized to lowercase by all implementations.

### World State

```typescript
saveWorldState(state: WorldState): Promise<void>
loadWorldState(): Promise<WorldState | null>
```

### Permissions

```typescript
savePermissions(data: PermissionsData): Promise<void>
loadPermissions(): Promise<PermissionsData | null>
```

### Generic Data Store

The generic data store replaces direct file I/O for daemon persistence. Data is organized by namespace and key.

```typescript
saveData(namespace: string, key: string, data: unknown): Promise<void>
loadData<T>(namespace: string, key: string): Promise<T | null>
dataExists(namespace: string, key: string): Promise<boolean>
deleteData(namespace: string, key: string): Promise<boolean>
listKeys(namespace: string): Promise<string[]>
```

## Adapter Factory

The factory (`src/driver/persistence/adapter-factory.ts`) manages a singleton adapter instance:

```typescript
import { getAdapter, createAdapter, setAdapter, resetAdapter } from './adapter-factory.js';

// Synchronous — filesystem only (throws for Supabase)
const adapter = getAdapter();

// Async — required for Supabase (dynamic import)
const adapter = await createAdapter();

// Direct assignment (used in tests)
setAdapter(myAdapter);

// Reset singleton (used in tests)
resetAdapter();
```

The driver calls `createAdapter()` during startup in `driver.ts`, followed by `adapter.initialize()`. On shutdown, `adapter.shutdown()` is called.

## FilesystemAdapter

`src/driver/persistence/filesystem-adapter.ts`

Preserves the original `FileStore` behavior with zero migration required — existing data files work as-is.

### Storage Layout

```
mudlib/data/
├── players/
│   ├── hero.json
│   ├── hero.json.bak
│   └── villain.json
├── world-state.json
├── world-state.json.bak
├── permissions.json
├── config/
│   └── settings.json
├── lore/
│   └── entries.json
├── combat/
│   └── grudges.json
├── bots/
│   ├── guard.json
│   └── merchant.json
└── portraits/
    └── abc123.json
```

### Features

- **Atomic writes** — Data is written to a temp file (`<filename>.tmp.<pid>.<timestamp>`) then renamed to the target path. Prevents corruption on crash.
- **Backup copies** — Player saves, world state, and permissions create `.bak` copies before overwriting.
- **Directory auto-creation** — Namespace directories are created automatically on first write.
- **Key sanitization** — Player names normalized to lowercase. Data keys stripped of path traversal characters (`..`, `/`, `\`).

### Configuration

```typescript
new FilesystemAdapter({
  dataPath: './mudlib/data',         // Base directory
  playersDir: 'players',            // Subdirectory for player saves
  worldStateFile: 'world-state.json',
  permissionsFile: 'permissions.json',
});
```

### Generic Data Mapping

Namespace/key pairs map directly to filesystem paths:

| Operation | Filesystem Path |
|-----------|----------------|
| `saveData('config', 'settings', data)` | `data/config/settings.json` |
| `loadData('bots', 'guard')` | `data/bots/guard.json` |
| `listKeys('portraits')` | Lists `.json` files in `data/portraits/` |

## SupabaseAdapter

`src/driver/persistence/supabase-adapter.ts`

Routes data to dedicated PostgreSQL tables via the Supabase client. Binary assets (portraits, object images) use Supabase Storage.

### Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_create_tables.sql` via the Supabase SQL Editor
3. Create a Storage bucket named `game-media` (set to private)
4. Copy your project API URL and **service_role** key from Settings > API
5. Set environment variables:

```bash
PERSISTENCE_ADAPTER=supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...  # service_role key
```

The service_role key starts with `eyJ` (it's a JWT). Do **not** use the `anon` or publishable key — those have Row Level Security restrictions that block server-side operations.

### Table Schema

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `players` | Player saves with indexed fields | `name` |
| `world_state` | World snapshot (single row) | `id = 1` |
| `permissions` | Permission data (single row) | `id = 1` |
| `lore_entries` | Normalized lore with categories | `id` |
| `announcements` | System announcements | `id` |
| `grudges` | NPC threat memory | `(npc_path, player_name)` |
| `bots` | Bot personality data | `bot_id` |
| `emotes` | Soul emote definitions | `verb` |
| `portraits` | Portrait metadata | `cache_key` |
| `object_images` | Object image metadata | `(object_type, cache_key)` |
| `game_state` | Generic config/state | `key` |

The `players` table stores core fields (`level`, `race`, `location`, `last_login`, `play_time`) as indexed columns for efficient queries, with the full `PlayerSaveData` in a JSONB `data` column.

### Namespace Routing

The Supabase adapter maps generic `saveData`/`loadData` namespaces to dedicated tables:

| Namespace | Table |
|-----------|-------|
| `portraits` | `portraits` + Storage bucket |
| `images-{type}` | `object_images` + Storage bucket |
| `bots` | `bots` |
| `emotes` | `emotes` |
| `lore` | `lore_entries` |
| `announcements` | `announcements` |
| `combat` | `grudges` |
| All others | `game_state` (fallback) |

### Storage Bucket

Portraits and object images store binary data in Supabase Storage under the `game-media` bucket. The adapter:

1. Extracts base64 image data from the daemon's save payload
2. Uploads the binary to Storage at a path like `portraits/{cacheKey}.png`
3. Stores the storage path in the metadata table
4. On load, fetches the binary from Storage and reconstructs the original JSON format

## Daemon Namespace Mapping

Each daemon uses a specific namespace/key pair for its data:

| Daemon | Namespace | Key(s) |
|--------|-----------|--------|
| `config.ts` | `config` | `settings` |
| `lore.ts` | `lore` | `entries` |
| `aggro.ts` | `combat` | `grudges` |
| `announcement.ts` | `announcements` | `announcements` |
| `soul.ts` | `emotes` | `emotes` |
| `grapevine.ts` | `grapevine` | `state` |
| `intermud.ts` | `intermud` | `state` |
| `login.ts` | `moderation` | `bans` |
| `bots.ts` | `bots` | `{botId}` (one key per bot) |
| `portrait.ts` | `portraits` / `images-{type}` | `{cacheKey}` |
| `area.ts` | `areas` | `drafts` |

## Writing a Custom Adapter

Implement the `PersistenceAdapter` interface:

```typescript
import type { PersistenceAdapter, PermissionsData } from './adapter.js';
import type { PlayerSaveData, WorldState } from './serializer.js';

export class MyAdapter implements PersistenceAdapter {
  async initialize(): Promise<void> { /* connect */ }
  async shutdown(): Promise<void> { /* disconnect */ }

  async savePlayer(data: PlayerSaveData): Promise<void> { /* ... */ }
  async loadPlayer(name: string): Promise<PlayerSaveData | null> { /* ... */ }
  async playerExists(name: string): Promise<boolean> { /* ... */ }
  async listPlayers(): Promise<string[]> { /* ... */ }
  async deletePlayer(name: string): Promise<boolean> { /* ... */ }

  async saveWorldState(state: WorldState): Promise<void> { /* ... */ }
  async loadWorldState(): Promise<WorldState | null> { /* ... */ }

  async savePermissions(data: PermissionsData): Promise<void> { /* ... */ }
  async loadPermissions(): Promise<PermissionsData | null> { /* ... */ }

  async saveData(namespace: string, key: string, data: unknown): Promise<void> { /* ... */ }
  async loadData<T>(namespace: string, key: string): Promise<T | null> { /* ... */ }
  async dataExists(namespace: string, key: string): Promise<boolean> { /* ... */ }
  async deleteData(namespace: string, key: string): Promise<boolean> { /* ... */ }
  async listKeys(namespace: string): Promise<string[]> { /* ... */ }
}
```

Register it in `adapter-factory.ts` by adding a new case in `createAdapter()`.

## Related Docs

- [Persistence and Save Data](persistence-and-save-data.md) — what gets saved and when
- [Efuns Reference](efuns.md) — data persistence efuns for mudlib code
- [Daemons](daemons.md) — daemon services that use data persistence
- [Architecture](architecture.md) — system design overview
