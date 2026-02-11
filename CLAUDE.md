# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MudForge is a modern MUD (Multi-User Dungeon) driver built with Node.js and TypeScript. It replaces traditional LPC scripting with TypeScript, uses V8 isolates for sandboxed script execution, and provides a browser-based web client via WebSocket.

## Common Commands

```bash
# Development
npm run dev              # Start with hot-reload (watches src/, not mudlib/)
npm run dev:no-watch     # Start without file watching

# Build
npm run build            # Compile TypeScript and build client
npm run build:client     # Build client bundle only (esbuild)

# Testing & Quality
npm test                 # Run all tests (vitest)
npm run test:watch       # Run tests in watch mode
npx vitest tests/driver/driver.test.ts           # Run a single test file
npx vitest -t "should initialize"                # Run tests matching pattern
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run typecheck        # TypeScript type checking only
npm run format           # Prettier format
npm run format:check     # Check formatting without modifying
```

## Architecture

### Two-Tier System

1. **Driver** (`src/`) - Node.js engine running outside sandbox
   - `src/driver/` - Core orchestration, object registry, scheduler, efun bridge, compiler
   - `src/network/` - Fastify HTTP server and WebSocket handling
   - `src/isolation/` - V8 isolate pool and sandbox execution
   - `src/client/` - Browser-based terminal client (built with esbuild)

2. **Mudlib** (`mudlib/`) - Game content running inside V8 sandboxes
   - `mudlib/std/` - Base classes (MudObject, Room, Item, Living, Player, NPC, Weapon, Armor, Container)
   - `mudlib/daemons/` - Background services (login, combat, guild, quest, channels, etc.)
   - `mudlib/cmds/` - Commands organized by permission level (player/, builder/, senior/, admin/)
   - `mudlib/areas/` - Game world content

### Key Patterns

**Object Hierarchy**: MudObject → Room/Item/Living → specialized classes (Player, NPC, Weapon, Armor, etc.)

**Sandbox Execution**: All mudlib code runs in isolated V8 contexts with memory/timeout limits. Only whitelisted efuns are available - no Node.js built-ins.

**Efun Bridge** (`src/driver/efun-bridge.ts`): ~50+ APIs exposed to mudlib including `cloneObject`, `loadObject`, `destruct`, `moveTo`, `send`, `readFile`, `writeFile`, etc.

**Hot-Reload**: Objects and commands can be reloaded at runtime via the `update /path` command or `efuns.reloadObject()`.

**Permission Levels**: Player (0) → Builder (1) → SeniorBuilder (2) → Administrator (3). Commands are loaded from directories matching these levels.

**File-Based Persistence**: Player data saved as JSON in `mudlib/data/players/`. World state in `mudlib/data/world-state.json`.

### Command Interface

```typescript
export interface Command {
  name: string | string[];
  description: string;
  usage?: string;
  execute(ctx: CommandContext): boolean | void | Promise<boolean | void>;
}
```

Command files in `mudlib/cmds/` are prefixed with `_` (e.g., `_look.ts`, `_get.ts`).

## Environment Variables

Key variables (see `.env.example`):
- `PORT` - Server port (default 3000)
- `MUDLIB_PATH` - Path to mudlib directory
- `ISOLATE_MEMORY_MB` - V8 isolate memory limit (default 128)
- `SCRIPT_TIMEOUT_MS` - Script execution timeout (default 5000)
- `CLAUDE_API_KEY` - For AI-powered NPC dialogue

## Documentation

Detailed docs in `/docs/`:
- `architecture.md` - System design deep-dive
- `mudlib-guide.md` - Creating game content
- `efuns.md` - Complete efuns API reference
- `commands.md` - All player/builder/admin commands
- `daemons.md` - Background services
