# MudForge Codebase Survey

Generated: 2026-02-01

## 1. File and Line Counts by Directory

| Directory | Files | Lines |
|-----------|------:|------:|
| `src/driver/` | 25 | 13,372 |
| `src/network/` | 10 | 4,172 |
| `src/client/` | 32 | 12,333 |
| `mudlib/std/` | 75 | 29,529 |
| `mudlib/daemons/` | 31 | 21,124 |
| `mudlib/cmds/` | 150 | 27,876 |
| `mudlib/areas/` | 156 | 10,623 |
| `tests/` | 53 | 13,783 |

**Total: ~532 TypeScript files, ~132,812 lines**

---

## 2. Largest 20 Files by Line Count

These files are candidates for potential god-object or kitchen-sink anti-patterns:

| Lines | File | Notes |
|------:|------|-------|
| 6,290 | `mudlib/lib/area-builder-gui.ts` | GUI builder - monolithic UI |
| 4,485 | `src/driver/efun-bridge.ts` | Efun API surface - many responsibilities |
| 2,655 | `mudlib/std/player.ts` | Player class - high complexity |
| 2,326 | `mudlib/lib/area-importer.ts` | Area import logic |
| 1,888 | `mudlib/std/npc.ts` | NPC class |
| 1,886 | `src/driver/driver.ts` | Main driver orchestration |
| 1,884 | `mudlib/std/living.ts` | Living base class |
| 1,730 | `mudlib/daemons/area.ts` | Area management daemon |
| 1,560 | `mudlib/daemons/channels.ts` | Chat channels daemon |
| 1,531 | `mudlib/lib/look-modal.ts` | Look modal UI |
| 1,430 | `mudlib/daemons/combat.ts` | Combat system daemon |
| 1,305 | `mudlib/daemons/help.ts` | Help system daemon |
| 1,301 | `mudlib/daemons/quest.ts` | Quest system daemon |
| 1,236 | `mudlib/daemons/party.ts` | Party system daemon |
| 1,220 | `mudlib/lib/stat-modal.ts` | Stats modal UI |
| 1,202 | `mudlib/lib/shop-modal.ts` | Shop modal UI |
| 1,196 | `mudlib/daemons/guild.ts` | Guild system daemon |
| 1,141 | `mudlib/daemons/intermud.ts` | Intermud networking |
| 1,129 | `mudlib/lib/inventory-modal.ts` | Inventory modal UI |
| 1,095 | `mudlib/efuns.d.ts` | Type definitions |

### Observations

- **`area-builder-gui.ts` (6,290 lines)**: Extremely large UI file. Strong candidate for decomposition.
- **`efun-bridge.ts` (4,485 lines)**: Contains ~50+ efun implementations. Could be split by category.
- **`player.ts` (2,655 lines)**: Core game class with many mixed concerns.

---

## 3. Circular Dependency Map

### Driver (`src/`)

**1 circular dependency detected:**

```
driver/efun-bridge.ts → driver/mudlib-loader.ts → driver/efun-bridge.ts
```

### Mudlib (`mudlib/`)

**40 circular dependency cycles detected.** Key cycles:

| Cycle | Files Involved |
|-------|----------------|
| 1 | `daemons/combat.ts` ↔ `daemons/party.ts` |
| 2 | `std/living.ts` ↔ `daemons/portrait.ts` |
| 3 | `std/combat/types.ts` ↔ `std/weapon.ts` |
| 4 | `std/vehicle.ts` ↔ `daemons/vehicle.ts` |
| 5 | `daemons/pet.ts` ↔ `std/pet.ts` |
| 6 | `daemons/mercenary.ts` ↔ `std/mercenary.ts` |
| 7 | `daemons/bots.ts` ↔ `std/bot.ts` |
| 8 | `daemons/snoop.ts` ↔ `lib/snoop-modal.ts` |
| 9 | `std/npc.ts` → `daemons/behavior.ts` → `std/behavior/evaluator.ts` (back to npc) |
| 10 | `std/npc.ts` → `daemons/loot.ts` (back to npc) |

**Longest chains:**
- `std/living.ts` → `daemons/portrait.ts` → `std/loot/types.ts` → `std/armor.ts` → `std/item.ts` → `daemons/quest.ts` → `daemons/guild.ts` → `daemons/channels.ts` → `std/visibility/index.ts` → `std/room.ts` → `daemons/profession.ts` → `std/profession/definitions.ts` → `std/profession/types.ts`

### Root Causes

1. **Type/class co-location**: Classes importing their daemon, daemon importing class
2. **Barrel exports**: `std/index.ts` creates large import graphs
3. **Feature coupling**: Combat ↔ Party, Pet/Mercenary ↔ Player

---

## 4. `any` Type Usage

**Total occurrences: 4**

| Count | File |
|------:|------|
| 2 | `tests/integration/hot-reload.test.ts` |
| 2 | `src/client/ide-editor-loader.ts` |

**Assessment**: Very low `any` usage. The codebase has good type discipline.

---

## 5. `as` Type Assertions

**Total occurrences: 1,710**

| Directory | Count |
|-----------|------:|
| `mudlib/` | 1,414 |
| `src/` | 221 |
| `tests/` | 75 |

### Top Files by `as` Assertion Count

**mudlib/ (Top 15):**

| Count | File |
|------:|------|
| 244 | `lib/area-builder-gui.ts` |
| 63 | `lib/look-modal.ts` |
| 59 | `lib/stat-modal.ts` |
| 49 | `lib/shop-modal.ts` |
| 34 | `lib/inventory-modal.ts` |
| 29 | `std/room.ts` |
| 29 | `lib/mercenary-modal.ts` |
| 27 | `daemons/combat.ts` |
| 23 | `std/player.ts` |
| 22 | `lib/score-modal.ts` |
| 19 | `cmds/player/_give.ts` |
| 19 | `cmds/player/_get.ts` |
| 19 | `cmds/player/_drop.ts` |
| 18 | `std/npc.ts` |
| 17 | `std/visibility/index.ts` |

**src/ (Top 15):**

| Count | File |
|------:|------|
| 31 | `driver/driver.ts` |
| 22 | `driver/efun-bridge.ts` |
| 16 | `client/websocket-client.ts` |
| 15 | `network/connection.ts` |
| 15 | `client/launcher.ts` |
| 13 | `client/gui/gui-modal.ts` |
| 12 | `driver/shadow-registry.ts` |
| 12 | `driver/mudlib-loader.ts` |
| 8 | `client/gui/gui-renderer.ts` |
| 6 | `client/debug-panel.ts` |
| 5 | `driver/persistence/serializer.ts` |
| 5 | `client/ide-editor.ts` |
| 5 | `client/comm-panel.ts` |
| 4 | `driver/object-registry.ts` |
| 4 | `client/sound-panel.ts` |

### Common Patterns

1. **DOM element casting**: `document.querySelector(...) as HTMLElement`
2. **JSON.parse results**: `JSON.parse(str) as SomeType`
3. **MudObject property access**: `(obj as MudObject & { prop: T }).prop`
4. **Event targets**: `e.target as HTMLElement`

---

## 6. Non-null Assertions (`!`)

**Total occurrences: ~85**

| Count | File |
|------:|------|
| 19 | `tests/integration/hot-reload.test.ts` |
| 13 | `mudlib/daemons/login.ts` |
| 9 | `tests/driver/object-registry.test.ts` |
| 7 | `tests/driver/persistence/file-store.test.ts` |
| 7 | `src/client/websocket-client.ts` |
| 6 | `mudlib/daemons/combat.ts` |
| 4 | `tests/mudlib/room.test.ts` |
| 4 | `tests/driver/persistence/serializer.test.ts` |
| 3 | `tests/driver/scheduler.test.ts` |
| 3 | `tests/driver/persistence/loader.test.ts` |
| 3 | `mudlib/std/player.ts` |
| 2 | `tests/mudlib/object.test.ts` |
| 2 | `src/client/ide-editor.ts` |
| 2 | `mudlib/cmds/player/_do.ts` |
| 2 | `mudlib/areas/valdoria/aldric/pet_store.ts` |
| 2 | `mudlib/areas/valdoria/aldric/forge.ts` |

### Common Patterns

1. **Test assertions**: `clone!.property` after clone operations
2. **Optional method calls**: `connection.sendAuthResponse!(...)`
3. **WebSocket operations**: `this.socket!.send(...)`
4. **Editor view access**: `this.editorView!.state`

---

## 7. TODO/FIXME/HACK/XXX Comments

**Total: 3**

| Location | Comment |
|----------|---------|
| `src/client/debug-panel.ts:447` | `// TODO: Get from WebSocket client` |
| `mudlib/daemons/guild.ts:1002` | `// TODO: Implement custom handler system` |
| `mudlib/daemons/guild.ts:1023` | `// TODO: Implement crafting system` |

**Assessment**: Very few outstanding TODOs. Codebase appears well-maintained.

---

## Summary

### Strengths
- Very low `any` usage (4 total)
- Minimal TODO debt (3 comments)
- Strong typing discipline overall

### Areas of Concern
- **Circular dependencies**: 40+ cycles in mudlib, 1 in driver
- **Large files**: `area-builder-gui.ts` (6,290 lines), `efun-bridge.ts` (4,485 lines)
- **Heavy type assertion use**: 1,710 `as` casts, particularly in GUI code
- **Non-null assertions**: 85 occurrences, concentrated in websocket/login code

### Recommended Focus Areas
1. Break circular dependencies in mudlib (extract shared types)
2. Decompose `area-builder-gui.ts` into smaller components
3. Split `efun-bridge.ts` by functional category
4. Add proper null checks to replace `!` assertions in production code
