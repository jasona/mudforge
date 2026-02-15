# mudlib/ - Game Content (Sandboxed)

All code here runs inside V8 sandboxes with memory/timeout limits. No Node.js built-ins available; only whitelisted efuns.

## Subdirectories

- `std/` - Base classes: MudObject, Room, Item, Living, Player, NPC, Weapon, Armor, Container, plus subsystems
- `daemons/` - Singleton background services (login, combat, guild, quest, channels, etc.)
- `cmds/` - Commands organized by permission level (player/, builder/, senior/, admin/) + guild commands
- `areas/` - Game world content (rooms, NPCs, items)
- `lib/` - Utility library (colors, modals, path utils, type definitions)
- `items/` - Standalone item definitions (quest items, tools)
- `config/` - Game configuration (game.json)
- `data/` - Persistent data storage (players, areas, images, config)
- `help/` - Help system topics by permission level
- `open/` - Shared NPC behavior templates
- `users/` - Per-player home directories

## Key Conventions

- Files importing base classes use `../../lib/std.js` or relative paths to `std/`
- Efuns accessed via global `efuns` object (no import needed in sandbox)
- All daemon singletons use lazy initialization: `getDaemon()` / `resetDaemon()`
- Color tags: `{red}`, `{green}`, `{bold}`, `{dim}`, `{/}` to reset
- Object hierarchy: MudObject → Room/Item/Living → Player/NPC/Weapon/Armor/Container

## Important Gotchas

- `moveTo()` does NOT trigger `onEnter()`/`onLeave()` - only `Living.moveDirection()` does
- NPC `name` vs `shortDesc`: setting shortDesc does NOT update name. Set `this.name` explicitly.
- `onTake()` gated by `instanceof Item` - use `moveTo` override for reliable pickup detection
- Never use silent `try {} catch {}` - always log caught errors
- Command files must be prefixed with `_` (e.g., `_look.ts`)
