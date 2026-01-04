# Tasks: Modern MUD Driver (Node.js)

**Generated from:** `prd-modern-mud-driver-v3.md`
**Standards Applied:** PRINCIPLES v1.0.0, PHASE-TASKS v1.0.0
**Standards Manifest Version:** 1.0.0

---

## Relevant Files

### Driver Core
- `src/driver/index.ts` - Main driver entry point and bootstrap
- `src/driver/driver.ts` - Driver class orchestrating all subsystems
- `src/driver/config.ts` - Configuration loading from env/files
- `src/driver/object-registry.ts` - Object storage, lookup, and lifecycle management
- `src/driver/scheduler.ts` - Heartbeat and callOut scheduling
- `src/driver/efun-bridge.ts` - Efun API exposed to mudlib isolates
- `src/driver/efuns/` - Individual efun implementations (object, file, util, etc.)
- `src/driver/compiler.ts` - TypeScript compilation service (esbuild)
- `src/driver/hot-reload.ts` - Hot-reload logic for object updates
- `src/driver/permissions.ts` - Permission enforcement layer

### Script Isolation
- `src/isolation/isolate-pool.ts` - V8 isolate pool management
- `src/isolation/sandbox.ts` - Sandboxed execution context setup
- `src/isolation/script-runner.ts` - Script execution with timeout/memory limits

### Network Layer
- `src/network/server.ts` - Fastify HTTP server setup
- `src/network/websocket.ts` - WebSocket connection handler
- `src/network/connection.ts` - Connection abstraction class
- `src/network/connection-manager.ts` - Active connection tracking

### Web Client
- `src/client/index.html` - Web client HTML shell
- `src/client/terminal.ts` - Terminal emulator UI
- `src/client/websocket-client.ts` - WebSocket client connection
- `src/client/input-handler.ts` - Command input with history
- `src/client/editor.ts` - In-game code editor component
- `src/client/styles.css` - Client styling

### Mudlib (Standard Library)
- `mudlib/master.ts` - Master object implementation
- `mudlib/simul_efun.ts` - Simulated efuns
- `mudlib/std/object.ts` - MudObject base class
- `mudlib/std/room.ts` - Room base class
- `mudlib/std/item.ts` - Item base class
- `mudlib/std/container.ts` - Container base class
- `mudlib/std/living.ts` - Living base class
- `mudlib/std/player.ts` - Player object
- `mudlib/std/npc.ts` - NPC base class
- `mudlib/std/weapon.ts` - Weapon base class
- `mudlib/std/armor.ts` - Armor base class
- `mudlib/daemons/login.ts` - Login daemon
- `mudlib/areas/void/void.ts` - Starting room (the Void)

### Persistence
- `src/driver/persistence/file-store.ts` - File-based persistence
- `src/driver/persistence/serializer.ts` - Object state serialization
- `src/driver/persistence/loader.ts` - World loading on startup
- `mudlib/data/players/` - Player save data (JSON)
- `mudlib/data/world-state.json` - World state snapshot

### Configuration & Deployment
- `package.json` - Node.js package configuration
- `tsconfig.json` - TypeScript configuration
- `tsconfig.client.json` - Client-specific TypeScript config
- `.env.example` - Environment variable template
- `Dockerfile` - Docker container definition
- `docker-compose.yml` - Docker Compose for development
- `ecosystem.config.js` - PM2 configuration

### Tests
- `tests/driver/object-registry.test.ts` - Object registry tests
- `tests/driver/scheduler.test.ts` - Scheduler tests
- `tests/driver/compiler.test.ts` - Compiler tests
- `tests/driver/efuns.test.ts` - Efun bridge tests
- `tests/isolation/sandbox.test.ts` - Sandbox isolation tests
- `tests/network/websocket.test.ts` - WebSocket tests
- `tests/mudlib/object.test.ts` - MudObject tests
- `tests/mudlib/room.test.ts` - Room tests
- `tests/mudlib/living.test.ts` - Living tests
- `tests/integration/player-flow.test.ts` - End-to-end player connection tests

### Notes

- Unit tests are placed alongside source files or in `tests/` mirroring the source structure
- Use `npm test` to run all tests via Vitest
- Use `npm run test:watch` for watch mode during development
- Use `npm run build` to compile TypeScript
- Use `npm run dev` for development with hot-reload

---

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Initialize Node.js project` → `- [x] 1.1 Initialize Node.js project` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

---

## Tasks

### Phase 0: Feature Branch

- [x] **0.0 Create feature branch**
  - [x] 0.1 Create and checkout a new branch: `git checkout -b feature/mudforge-driver`

---

### Phase 1: Project Infrastructure (traces to: FR-20, FR-30)

- [x] **1.0 Set up project infrastructure and build system**
  - [x] 1.1 Initialize Node.js project with `npm init` and configure `package.json` with project metadata
  - [x] 1.2 Install core dependencies: `isolated-vm`, `ws`, `fastify`, `@fastify/static`, `@fastify/websocket`, `esbuild`, `pino`
  - [x] 1.3 Install dev dependencies: `typescript`, `vitest`, `@types/node`, `@types/ws`, `eslint`, `prettier`
  - [x] 1.4 Create `tsconfig.json` with strict mode, ES2022 target, NodeNext module resolution
  - [x] 1.5 Create `tsconfig.client.json` for browser-targeted client code
  - [x] 1.6 Create `.env.example` with configuration variables (PORT, MUDLIB_PATH, LOG_LEVEL, etc.)
  - [x] 1.7 Create `src/driver/config.ts` to load configuration from environment variables
  - [x] 1.8 Create project directory structure: `src/driver/`, `src/isolation/`, `src/network/`, `src/client/`, `mudlib/`, `tests/`
  - [x] 1.9 Configure ESLint and Prettier for consistent code style
  - [x] 1.10 Add npm scripts: `build`, `dev`, `start`, `test`, `test:watch`, `lint`
  - [x] 1.11 Verify build pipeline works with a minimal "hello world" entry point
  - [x] 1.12 Write tests for config loading
  - [x] 1.13 Commit: "feat: Initialize project infrastructure and build system"

---

### Phase 2: Core Object System (traces to: FR-1 through FR-10)

- [x] **2.0 Implement core object system and registry**
  - [x] 2.1 Define `MudObject` interface with identity properties: `objectPath`, `objectId`, `isClone`, `blueprint`
  - [x] 2.2 Define `MudObject` interface with lifecycle hooks: `onCreate`, `onDestroy`, `onClone`, `onReset`
  - [x] 2.3 Define `MudObject` interface with hierarchy: `environment`, `inventory`, `moveTo()`
  - [x] 2.4 Define `MudObject` interface with interaction: `id()`, `shortDesc`, `longDesc`
  - [x] 2.5 Define `MudObject` interface with actions: `addAction()`, `removeAction()`
  - [x] 2.6 Create `ObjectRegistry` class to store all object instances by path/ID
  - [x] 2.7 Implement `ObjectRegistry.register(object)` - add object to registry
  - [x] 2.8 Implement `ObjectRegistry.find(pathOrId)` - lookup object by path or ID
  - [x] 2.9 Implement `ObjectRegistry.clone(blueprintPath)` - create clone with unique ID (e.g., `/std/sword#47`)
  - [x] 2.10 Implement `ObjectRegistry.destroy(object)` - remove from registry, call `onDestroy()`
  - [x] 2.11 Implement clone counter per blueprint for generating unique clone IDs
  - [x] 2.12 Implement `moveTo()` logic: remove from old environment, add to new, update references
  - [x] 2.13 Write unit tests for `MudObject` interface compliance
  - [x] 2.14 Write unit tests for `ObjectRegistry` (register, find, clone, destroy)
  - [x] 2.15 Write unit tests for object movement between environments
  - [x] 2.16 Commit: "feat: Implement core object system and registry (FR-1 to FR-10)"

---

### Phase 3: Script Isolation (traces to: FR-26, FR-27, FR-28, FR-31)

- [x] **3.0 Implement script isolation with isolated-vm**
  - [x] 3.1 Create `IsolatePool` class to manage a pool of V8 isolates
  - [x] 3.2 Implement isolate creation with configurable memory limit (default 128MB)
  - [x] 3.3 Implement context creation within isolates for mudlib execution
  - [x] 3.4 Create `Sandbox` class to set up restricted execution environment
  - [x] 3.5 Implement `Sandbox.expose()` to safely expose driver APIs (efuns) to isolate
  - [x] 3.6 Implement `ScriptRunner.run(code, context, timeout)` with CPU timeout enforcement
  - [x] 3.7 Implement error capture: catch exceptions without crashing driver, log with context
  - [x] 3.8 Implement memory limit enforcement and graceful handling when exceeded
  - [x] 3.9 Create mechanism to pass object references between driver and isolate safely
  - [x] 3.10 Write unit tests for isolate creation and teardown
  - [x] 3.11 Write unit tests for timeout enforcement (script exceeds time limit)
  - [x] 3.12 Write unit tests for memory limit enforcement
  - [x] 3.13 Write unit tests for error isolation (bad script doesn't crash driver)
  - [x] 3.14 Commit: "feat: Implement script isolation with isolated-vm (FR-26 to FR-31)"

---

### Phase 4: TypeScript Compilation (traces to: FR-21, FR-25, FR-38)

- [x] **4.0 Build TypeScript compilation and hot-reload pipeline**
  - [x] 4.1 Create `Compiler` class wrapping esbuild for TypeScript-to-JavaScript transpilation
  - [x] 4.2 Implement `Compiler.compile(filePath)` - compile single `.ts` file to JS string
  - [x] 4.3 Implement `Compiler.compileBundle(entryPath)` - bundle with dependencies
  - [x] 4.4 Implement source map support for better error messages
  - [x] 4.5 Implement syntax error capture with line/column information
  - [x] 4.6 Create `HotReload` class to manage object definition updates
  - [x] 4.7 Implement file watcher for mudlib directory (optional, for dev mode)
  - [x] 4.8 Implement `HotReload.update(objectPath)` - recompile and update blueprint
  - [x] 4.9 Implement state preservation: existing clones get new methods but keep state
  - [x] 4.10 Implement dependency tracking: know which files import which
  - [x] 4.11 Write unit tests for single file compilation
  - [x] 4.12 Write unit tests for compilation error handling
  - [x] 4.13 Write unit tests for hot-reload with state preservation
  - [x] 4.14 Commit: "feat: Implement TypeScript compilation and hot-reload (FR-21, FR-25, FR-38)"

---

### Phase 5: Driver Core (traces to: FR-22 through FR-24, FR-29)

- [x] **5.0 Implement driver core (Master, efuns, scheduler)**
  - [x] 5.1 Create `Driver` class as main orchestrator of all subsystems
  - [x] 5.2 Implement driver startup sequence: load config, init isolates, load Master
  - [x] 5.3 Define `Master` interface with all required hooks (see PRD Section 6.4)
  - [x] 5.4 Implement driver calling `master.onDriverStart()` on boot
  - [x] 5.5 Implement driver calling `master.onPreload()` to get preload list
  - [x] 5.6 Create `EfunBridge` class to expose efuns to mudlib isolate
  - [x] 5.7 Implement object management efuns: `cloneObject`, `destruct`, `loadObject`, `findObject`
  - [x] 5.8 Implement hierarchy efuns: `allInventory`, `environment`, `move`
  - [x] 5.9 Implement player efuns: `thisPlayer`, `thisObject`, `allPlayers`, `send`, `input`
  - [x] 5.10 Implement file efuns: `readFile`, `writeFile`, `fileExists`, `readDir` (sandboxed paths)
  - [x] 5.11 Implement utility efuns: `time`, `random`, `capitalize`, `explode`, `implode`
  - [x] 5.12 Create `Scheduler` class for heartbeat and delayed calls
  - [x] 5.13 Implement `Scheduler.setHeartbeat(obj, enable)` - register/unregister for heartbeat
  - [x] 5.14 Implement `Scheduler.callOut(callback, delay)` - schedule delayed execution
  - [x] 5.15 Implement `Scheduler.removeCallOut(id)` - cancel scheduled call
  - [x] 5.16 Implement heartbeat loop (configurable interval, default 2 seconds)
  - [x] 5.17 Implement driver shutdown sequence: call `master.onShutdown()`, save state, cleanup
  - [x] 5.18 Write unit tests for efun bridge (each efun category)
  - [x] 5.19 Write unit tests for scheduler (heartbeat, callOut, removeCallOut)
  - [x] 5.20 Write integration test for driver startup with mock Master
  - [x] 5.21 Commit: "feat: Implement driver core with efuns and scheduler (FR-22 to FR-29)"

---

### Phase 6: Standard Mudlib Library (traces to: FR-5, FR-10, FR-32, FR-33)

- [x] **6.0 Create standard mudlib library**
  - [x] 6.1 Create `mudlib/std/object.ts` - base `MudObject` class implementation
  - [x] 6.2 Implement `MudObject` lifecycle methods with default (empty) implementations
  - [x] 6.3 Implement `MudObject.id(name)` with default matching against `shortDesc`
  - [x] 6.4 Implement `MudObject.addAction()` / `removeAction()` for command binding
  - [x] 6.5 Create `mudlib/std/room.ts` - `Room` class extending `MudObject`
  - [x] 6.6 Implement `Room.addExit(direction, destination)` and `Room.getExit(direction)`
  - [x] 6.7 Implement `Room.broadcast(message, options)` to send to all contents
  - [x] 6.8 Implement `Room.onEnter(obj)` / `Room.onLeave(obj)` hooks
  - [x] 6.9 Create `mudlib/std/item.ts` - `Item` class extending `MudObject`
  - [x] 6.10 Implement `Item.weight`, `Item.value` properties
  - [x] 6.11 Implement `Item.onTake(taker)` / `Item.onDrop(dropper)` hooks
  - [x] 6.12 Create `mudlib/std/container.ts` - `Container` class extending `Item`
  - [x] 6.13 Implement `Container.canHold(item)` capacity/weight checks
  - [x] 6.14 Create `mudlib/std/living.ts` - `Living` class extending `MudObject`
  - [x] 6.15 Implement `Living.command(input)` - parse and execute command
  - [x] 6.16 Implement `Living.receive(message)` - receive output
  - [x] 6.17 Implement `Living.say(message)` / `Living.emote(action)` communication
  - [x] 6.18 Implement `Living.moveTo(room)` with enter/leave hooks
  - [x] 6.19 Create `mudlib/std/player.ts` - `Player` class extending `Living`
  - [x] 6.20 Implement `Player` connection binding (link to WebSocket connection)
  - [x] 6.21 Implement `Player.save()` / `Player.restore()` for persistence
  - [x] 6.22 Create `mudlib/std/npc.ts` - `NPC` class extending `Living`
  - [x] 6.23 Create `mudlib/std/weapon.ts` - `Weapon` class extending `Item`
  - [x] 6.24 Implement `Weapon.damage`, `Weapon.damageType`, `Weapon.onWield()`, `Weapon.onUnwield()`
  - [x] 6.25 Create `mudlib/std/armor.ts` - `Armor` class extending `Item`
  - [x] 6.26 Create `mudlib/master.ts` - Master object with all required hooks
  - [x] 6.27 Implement `master.onPlayerConnect()` returning login daemon path
  - [x] 6.28 Implement `master.validRead()` / `master.validWrite()` permission hooks
  - [x] 6.29 Implement `master.onRuntimeError()` for error logging
  - [x] 6.30 Create `mudlib/simul_efun.ts` - mudlib-provided efun extensions
  - [x] 6.31 Create `mudlib/daemons/login.ts` - Login daemon for new connections
  - [x] 6.32 Create `mudlib/areas/void/void.ts` - Starting room (the Void)
  - [x] 6.33 Write unit tests for `MudObject` base class
  - [x] 6.34 Write unit tests for `Room` (exits, broadcast, enter/leave)
  - [x] 6.35 Write unit tests for `Living` (command parsing, movement)
  - [x] 6.36 Write unit tests for `Item` and `Container`
  - [x] 6.37 Commit: "feat: Create standard mudlib library (FR-5, FR-10, FR-32, FR-33)"

---

### Phase 7: Network Layer (traces to: FR-50 through FR-57)

- [ ] **7.0 Implement network layer (WebSocket server and web client)**
  - [ ] 7.1 Create `Server` class using Fastify for HTTP
  - [ ] 7.2 Configure Fastify with `@fastify/static` to serve web client files
  - [ ] 7.3 Configure Fastify with `@fastify/websocket` for WebSocket upgrade
  - [ ] 7.4 Create `Connection` class abstracting a single WebSocket connection
  - [ ] 7.5 Implement `Connection.send(message)` - send styled text to client
  - [ ] 7.6 Implement `Connection.receive()` - handle incoming commands
  - [ ] 7.7 Implement `Connection.close()` - graceful disconnect
  - [ ] 7.8 Create `ConnectionManager` class to track all active connections
  - [ ] 7.9 Implement connection lifecycle: connect → authenticate → bind to Player → play → disconnect
  - [ ] 7.10 Implement calling `master.onPlayerConnect()` when new WebSocket connects
  - [ ] 7.11 Implement calling `master.onPlayerDisconnect()` on disconnect
  - [ ] 7.12 Create `src/client/index.html` - minimal HTML shell loading client JS
  - [ ] 7.13 Create `src/client/terminal.ts` - terminal emulator rendering styled text (ANSI colors)
  - [ ] 7.14 Create `src/client/websocket-client.ts` - WebSocket connection to server
  - [ ] 7.15 Create `src/client/input-handler.ts` - command input with history (up/down arrows)
  - [ ] 7.16 Implement text styling: bold, colors, reset codes rendering
  - [ ] 7.17 Create `src/client/styles.css` - terminal styling (monospace font, dark theme)
  - [ ] 7.18 Configure esbuild to bundle client code for browser
  - [ ] 7.19 Write unit tests for `Connection` class
  - [ ] 7.20 Write unit tests for `ConnectionManager`
  - [ ] 7.21 Write integration test: client connects, sends command, receives response
  - [ ] 7.22 Commit: "feat: Implement WebSocket server and web client (FR-50 to FR-57)"

---

### Phase 8: Permission System (traces to: FR-40 through FR-47)

- [ ] **8.0 Implement permission system**
  - [ ] 8.1 Define `PermissionLevel` enum: `Player`, `Builder`, `SeniorBuilder`, `Administrator`
  - [ ] 8.2 Create `Permissions` class for permission checking
  - [ ] 8.3 Implement `Permissions.getLevel(player)` - retrieve player's permission level
  - [ ] 8.4 Implement `Permissions.canRead(player, path)` - check read permission
  - [ ] 8.5 Implement `Permissions.canWrite(player, path)` - check write permission (domain-based)
  - [ ] 8.6 Implement `Permissions.canExecute(player, objectPath)` - check execution permission
  - [ ] 8.7 Implement domain mapping: builders assigned to specific directory paths
  - [ ] 8.8 Implement `/std/` protection: only Administrators can modify
  - [ ] 8.9 Create `AuditLog` class for logging builder actions
  - [ ] 8.10 Implement `AuditLog.log(player, action, target, details)` - log to file
  - [ ] 8.11 Integrate permission checks into file efuns (`readFile`, `writeFile`)
  - [ ] 8.12 Integrate permission checks into object compilation (`compileObject`, `updateObject`)
  - [ ] 8.13 Create admin commands: `grant`, `revoke`, `domains`, `audit`
  - [ ] 8.14 Store permission data in `mudlib/data/permissions.json`
  - [ ] 8.15 Write unit tests for permission level checks
  - [ ] 8.16 Write unit tests for domain-based write restrictions
  - [ ] 8.17 Write unit tests for audit logging
  - [ ] 8.18 Commit: "feat: Implement tiered permission system (FR-40 to FR-47)"

---

### Phase 9: Persistence Layer (traces to: FR-60 through FR-66)

- [ ] **9.0 Implement persistence layer**
  - [ ] 9.1 Create `Serializer` class for object state serialization
  - [ ] 9.2 Implement `Serializer.serialize(object)` - extract saveable state to JSON
  - [ ] 9.3 Implement `Serializer.deserialize(json, blueprint)` - restore state to object
  - [ ] 9.4 Handle circular references in object graphs
  - [ ] 9.5 Create `FileStore` class for file-based persistence
  - [ ] 9.6 Implement `FileStore.savePlayer(player)` - save to `mudlib/data/players/{name}.json`
  - [ ] 9.7 Implement `FileStore.loadPlayer(name)` - restore player from file
  - [ ] 9.8 Implement `FileStore.saveWorldState()` - snapshot all persistent objects
  - [ ] 9.9 Implement `FileStore.loadWorldState()` - restore world on startup
  - [ ] 9.10 Create `Loader` class for world initialization
  - [ ] 9.11 Implement `Loader.preload(paths)` - load objects returned by `master.onPreload()`
  - [ ] 9.12 Implement auto-save timer (configurable interval, default 5 minutes)
  - [ ] 9.13 Implement admin command: `save` - manual world save
  - [ ] 9.14 Implement admin command: `shutdown` - save and graceful shutdown
  - [ ] 9.15 Write unit tests for serialization/deserialization
  - [ ] 9.16 Write unit tests for player save/load
  - [ ] 9.17 Write integration test: server restart preserves player state
  - [ ] 9.18 Commit: "feat: Implement file-based persistence (FR-60 to FR-66)"

---

### Phase 10: In-Game Code Editor (traces to: FR-34 through FR-37)

- [ ] **10.0 Build in-game code editor**
  - [ ] 10.1 Create `src/client/editor.ts` - code editor component
  - [ ] 10.2 Integrate CodeMirror or Monaco (lightweight) for syntax highlighting
  - [ ] 10.3 Configure editor for TypeScript syntax highlighting
  - [ ] 10.4 Implement editor open/close via builder command: `edit <object-path>`
  - [ ] 10.5 Implement file loading: fetch object source via WebSocket request
  - [ ] 10.6 Implement file saving: send updated source via WebSocket
  - [ ] 10.7 Implement server-side compile on save with error response
  - [ ] 10.8 Display TypeScript errors inline in editor (line numbers, messages)
  - [ ] 10.9 Implement hot-reload trigger after successful save
  - [ ] 10.10 Implement permission check before allowing edit (must be Builder+)
  - [ ] 10.11 Implement domain check: builders can only edit files in their domain
  - [ ] 10.12 Add basic autocomplete for common mudlib APIs (optional/stretch)
  - [ ] 10.13 Write unit tests for editor WebSocket commands (load, save)
  - [ ] 10.14 Write integration test: builder edits object, sees it update in game
  - [ ] 10.15 Commit: "feat: Implement in-game code editor (FR-34 to FR-37)"

---

### Phase 11: Deployment Configuration (traces to: FR-70 through FR-75)

- [ ] **11.0 Create deployment configuration**
  - [ ] 11.1 Create `Dockerfile` with Node.js LTS base image
  - [ ] 11.2 Configure Dockerfile to install dependencies and build
  - [ ] 11.3 Configure Dockerfile to copy mudlib and run driver
  - [ ] 11.4 Create `docker-compose.yml` for local development
  - [ ] 11.5 Create `docker-compose.prod.yml` with production settings
  - [ ] 11.6 Create `ecosystem.config.js` for PM2 process management
  - [ ] 11.7 Configure PM2 for cluster mode (optional), auto-restart, log rotation
  - [ ] 11.8 Add health check endpoint: `GET /health` returning `{ status: "ok", uptime, players }`
  - [ ] 11.9 Add readiness check endpoint: `GET /ready` (for Kubernetes)
  - [ ] 11.10 Document environment variables in `.env.example`
  - [ ] 11.11 Create `scripts/start.sh` for production startup
  - [ ] 11.12 Test Docker build and run
  - [ ] 11.13 Test PM2 deployment locally
  - [ ] 11.14 Commit: "feat: Add deployment configuration (FR-70 to FR-75)"

---

### Phase 12: Testing and Documentation (traces to: TASKS-4, CODE-6)

- [ ] **12.0 Write tests and documentation**
  - [ ] 12.1 Review and fill gaps in unit test coverage (target: 80%+ on driver code)
  - [ ] 12.2 Write integration test: full player flow (connect → login → move → quit)
  - [ ] 12.3 Write integration test: builder creates room via in-game editor
  - [ ] 12.4 Write integration test: hot-reload updates object behavior
  - [ ] 12.5 Write integration test: permission denial for unauthorized actions
  - [ ] 12.6 Create `README.md` with project overview, quick start, architecture
  - [ ] 12.7 Create `docs/architecture.md` explaining driver vs mudlib separation
  - [ ] 12.8 Create `docs/efuns.md` documenting all available efuns
  - [ ] 12.9 Create `docs/mudlib-guide.md` for builders (how to create rooms, items, NPCs)
  - [ ] 12.10 Create `docs/deployment.md` with Docker and PM2 instructions
  - [ ] 12.11 Create `docs/permissions.md` explaining the permission system
  - [ ] 12.12 Add JSDoc comments to all public APIs in driver code
  - [ ] 12.13 Run full test suite and fix any failures
  - [ ] 12.14 Run linter and fix any issues
  - [ ] 12.15 Commit: "docs: Add comprehensive documentation and tests"

---

### Phase 13: Final Review and Merge

- [ ] **13.0 Final review and merge preparation**
  - [ ] 13.1 Run complete test suite: `npm test`
  - [ ] 13.2 Run linter: `npm run lint`
  - [ ] 13.3 Build production bundle: `npm run build`
  - [ ] 13.4 Test Docker deployment end-to-end
  - [ ] 13.5 Review all code for security issues (SEC-1 through SEC-7)
  - [ ] 13.6 Update CHANGELOG.md with all features implemented
  - [ ] 13.7 Create pull request with comprehensive description
  - [ ] 13.8 Address code review feedback
  - [ ] 13.9 Merge feature branch to main
  - [ ] 13.10 Tag release: `v0.1.0`

---

## Task Checklist Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 0 | 1 | Feature branch |
| 1 | 13 | Project infrastructure |
| 2 | 16 | Core object system |
| 3 | 14 | Script isolation |
| 4 | 14 | TypeScript compilation |
| 5 | 21 | Driver core |
| 6 | 37 | Standard mudlib |
| 7 | 22 | Network layer |
| 8 | 18 | Permission system |
| 9 | 18 | Persistence |
| 10 | 15 | In-game editor |
| 11 | 14 | Deployment |
| 12 | 15 | Testing & docs |
| 13 | 10 | Final review |

**Total: ~208 sub-tasks**

---

## Dependencies

The following phases have dependencies:

- Phase 3 (Isolation) depends on Phase 1 (Infrastructure)
- Phase 4 (Compilation) depends on Phase 3 (Isolation)
- Phase 5 (Driver Core) depends on Phases 2, 3, 4
- Phase 6 (Mudlib) depends on Phase 5 (Driver Core)
- Phase 7 (Network) depends on Phases 5, 6
- Phase 8 (Permissions) depends on Phase 5
- Phase 9 (Persistence) depends on Phases 5, 6
- Phase 10 (Editor) depends on Phases 4, 7, 8
- Phase 11 (Deployment) can run in parallel with Phases 6-10
- Phase 12 (Testing/Docs) depends on all previous phases
- Phase 13 (Final) depends on Phase 12

Recommended parallel work:
- Phases 1-5: Sequential (core foundation)
- Phases 6, 7, 8, 9: Can partially overlap with different developers
- Phase 10: After 7 and 8
- Phase 11: Can start after Phase 5
