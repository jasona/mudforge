# src/driver/ - Core MUD Engine

## Key Files

- `driver.ts` (~2000 lines) - Main orchestrator. Manages connections, players, command execution, session tokens. Constructor initializes all subsystems and sets up callbacks.
- `efun-bridge.ts` (~4800 lines) - 50+ APIs exposed to mudlib: cloneObject, loadObject, destruct, moveTo, send, readFile, writeFile, etc. Uses callback pattern for driver operations.
- `command-manager.ts` - Loads commands from `mudlib/cmds/` directories by permission level. Uses cache-busting query params (`?t=Date.now()`) for ESM imports. Later-loaded files override earlier ones by verb name.
- `object-registry.ts` - Tracks all loaded objects (blueprints + clones). Clone IDs: `<path>#<number>`.
- `compiler.ts` - TypeScript compilation for mudlib code.
- `scheduler.ts` - Heartbeat system (2s default) and callOut scheduling. Max 10 concurrent heartbeats.
- `mudlib-loader.ts` - ESM module loader for mudlib objects. Resolves `std` imports.
- `hot-reload.ts` - Runtime object updates via prototype replacement. State preserved in clones.
- `base-object.ts` - Default MudObject implementation.
- `shadow-registry.ts` - Shadow (overlay) system for object proxying.
- `permissions.ts` - Permission levels: Player(0), Builder(1), Senior(2), Admin(3).
- `config.ts` - DriverConfig interface loaded from environment variables.
- `types.ts` - MudObject interface definition.
- `version.ts`, `metrics.ts` - Version tracking and metrics.
- `claude-client.ts`, `gemini-client.ts`, `github-client.ts`, `giphy-client.ts` - External API integrations.

## Subdirectories

- `persistence/` - File-based save/load system
- `interfaces/` - ObjectLoader interface

## Important Patterns

- Driver uses callback registration pattern: efunBridge.setBindPlayerCallback(), setAllPlayersCallback(), etc.
- Command execution: resolves aliases, tries CommandManager, then falls back to room/object actions
- Active players tracked by lowercase name in Map; persist even when disconnected until quit
- Context management: efunBridge.setContext({thisPlayer, thisObject}) before command execution

## Gotchas

- Command name collisions: multiple files can register same verb; last loaded wins
- Commands use cache-busting `?t=Date.now()` while mudlib objects use MudlibLoader (both resolve to same std module via ESM cache)
- Protected paths: /std/, /daemons/ blocked for non-admins
- Forbidden files: .env, package.json, tsconfig.json never modifiable
