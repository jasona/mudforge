# Type Safety Audit

**Date**: 2026-02-02
**Auditor**: Claude Code
**Scope**: TypeScript type safety issues across src/ and mudlib/

## Executive Summary

The codebase has moderate type safety with several recurring patterns that could lead to runtime bugs or maintenance burden. The most critical issues involve untyped event emitters, `as any` casts masking type mismatches, and inconsistent error handling patterns.

---

## 1. `any` Usage

### Critical: Lazy/Fixable `any`

| File | Line | Code | Category |
|------|------|------|----------|
| `src/client/ide-editor-loader.ts` | 16 | `private editorInstance: any = null` | (a) Lazy - should type as CodeMirror EditorView |
| `src/client/ide-editor-loader.ts` | 17 | `private loadPromise: Promise<any>` | (a) Lazy - should type Promise result |

### High: `as any` Masking Type Mismatches

| File | Line | Code | Issue |
|------|------|------|-------|
| `mudlib/std/room.ts` | 349 | `daemon.getPlayerSkill(who as any, options.profession as any)` | Casting Living to profession player interface |
| `mudlib/std/room.ts` | 394 | `daemon.awardXP(who as any, options.profession as any, ...)` | Same interface mismatch |
| `mudlib/areas/valdoria/forest/deep_pool.ts` | 56 | `daemon.awardXP(obj as any, 'swimming', 5)` | Missing profession player type |
| `mudlib/areas/valdoria/forest/cliff_ledge.ts` | 56 | `daemon.awardXP(obj as any, 'climbing', 10)` | Missing profession player type |
| `mudlib/cmds/player/_craft.ts` | 535 | `daemon.getPlayerSkill(player, profId as any)` | ProfessionId type mismatch |
| `mudlib/cmds/player/_gather.ts` | 225 | `professionDaemon.getPlayerSkill(player as any, ...)` | Player interface mismatch |

**Recommendation**: Create a `ProfessionPlayer` interface that extends `Living` with profession-related methods, then use proper type guards.

---

## 2. Type Assertions (`as`)

### Critical: Assertions Masking Real Mismatches

| File | Line | Pattern | Severity |
|------|------|---------|----------|
| `src/network/connection.ts` | 242, 253, 339, 348, 770, 789 | `(this._player as { name?: string }).name` | Critical - player type is `unknown` |
| `src/driver/mudlib-loader.ts` | 128-129 | `(instance as unknown as { _objectPath: string })._objectPath` | High - accessing private-ish properties |
| `src/driver/shadow-registry.ts` | 158-283 | Multiple `(target as unknown as Record<symbol, ...>)` | Medium - intentional for metaprogramming |

**Pattern Analysis**:

The `connection.ts` file stores `_player` as `unknown` (line 208) but frequently needs to access `.name`. This is a design issue where the Connection class should have a properly typed player interface.

```typescript
// Current (problematic)
private _player: unknown = null;
const playerName = (this._player as { name?: string }).name || 'unknown';

// Should be
interface ConnectionPlayer {
  name: string;
  objectId: string;
  // ... other required properties
}
private _player: ConnectionPlayer | null = null;
```

### Medium: Legitimate Narrowing (Acceptable)

| File | Line | Pattern | Notes |
|------|------|---------|-------|
| `src/network/connection.ts` | 398+ | `error as Error` | Catch block error typing |
| `src/driver/persistence/serializer.ts` | 272-286 | `typed as { __type?: string }` | JSON deserialization |
| `src/network/discord-client.ts` | 144 | `channel as TextChannel` | Discord.js API narrowing |
| `src/network/grapevine-client.ts` | 317 | `JSON.parse(rawData) as GrapevineEvent` | Network protocol |

### High: GUI Modal Assertions

The stat-modal.ts, mercenary-modal.ts, and look-modal.ts files have extensive `as DisplayElement` and `as InputElement` assertions:

| File | Count | Example |
|------|-------|---------|
| `mudlib/lib/stat-modal.ts` | 50+ | `} as DisplayElement` |
| `mudlib/lib/mercenary-modal.ts` | 30+ | `} as InputElement` |
| `mudlib/lib/look-modal.ts` | 20+ | `} as DisplayElement` |

**Recommendation**: These are building GUI element objects inline. Consider using builder functions that return properly typed elements:

```typescript
// Instead of:
{ type: 'text', id: 'foo', content: 'bar' } as DisplayElement

// Use:
createTextElement('foo', 'bar')  // Returns DisplayElement
```

---

## 3. Non-null Assertions (`!`)

### Critical: Hiding Potential Null Bugs

| File | Line | Code | Risk |
|------|------|------|------|
| `src/client/websocket-client.ts` | 682, 718, 741, 758, 775, 792, 899 | `this.socket!.send(...)` | Socket could be null during disconnect race |
| `src/client/ide-editor.ts` | 534-535 | `this.editorView!.state.doc.line(...)` | Editor not initialized |
| `mudlib/cmds/player/_quest.ts` | 417 | `questDef!.id` | Quest definition could be undefined |

**Recommendation**: Add proper null checks:

```typescript
// Instead of:
this.socket!.send(message);

// Use:
if (!this.socket) {
  throw new Error('Socket not connected');
}
this.socket.send(message);
```

---

## 4. Missing Return Types

### High: Public Methods Without Explicit Return Types

While TypeScript can infer return types, explicit annotations improve maintainability and catch accidental changes.

**Pattern in mudlib/std/:**
Most constructors are fine (void return), but several public methods lack return types:

| File | Method Pattern | Issue |
|------|---------------|-------|
| `mudlib/std/object.ts` | Many action handlers | Return `boolean \| void \| Promise<...>` implicitly |
| `mudlib/std/living.ts` | Combat methods | Implicit returns |
| `mudlib/std/npc.ts` | AI/behavior methods | Implicit returns |

**Note**: This is a medium-priority issue. The codebase generally has good type annotations on public APIs.

---

## 5. Inconsistent Error Handling

### High: Mixed Error Return Patterns

The codebase uses multiple patterns for error cases in similar contexts:

| Pattern | Files Using It | Example |
|---------|---------------|---------|
| `return false` | trainer.ts, item.ts, vehicle.ts, npc.ts, mercenary.ts | Action failed |
| `return null` | consumable.ts, bot.ts, npc.ts, mercenary.ts | Entity not found |
| `return undefined` | shadow.ts (getOriginal), visibility/index.ts | Property not found |
| `throw new Error` | (Rare in mudlib) | Critical failures only |

**Specific Examples**:

```typescript
// mudlib/std/npc.ts - Same file, different patterns
getHighestThreat(): Living | null { return null; }  // Line 881
isTauntedBy(living: Living): boolean { return false; }  // Line 980
findNearbyAlly(): Living | null { return null; }  // Line 989
```

**Recommendation**: Establish conventions:
- `return false` - Action attempted but failed (user can retry)
- `return null` - Entity not found (expected case)
- `throw Error` - Programmer error / invariant violation

---

## 6. String-Typed Enums

### Medium: String Literals Instead of Proper Enums

| Location | Current | Should Be |
|----------|---------|-----------|
| `mudlib/lib/area-importer.ts:38` | `'room' \| 'npc' \| 'weapon' \| 'armor' \| 'item' \| 'merchant' \| 'container' \| 'unknown'` | `EntityType` enum |
| `mudlib/daemons/portrait.ts:46` | `'player' \| 'npc' \| 'pet' \| 'weapon' \| 'armor' \| 'container' \| 'item' \| 'corpse' \| 'gold'` | `ObjectImageType` enum |
| `mudlib/std/loot/types.ts:129` | `effectType?: string // Combat effect type (burn, poison, slow, etc.)` | Should be union type or enum |
| Various | `'male' \| 'female' \| 'neutral'` | `Gender` enum exists but not always used |
| Various | Direction strings | `Direction` type exists but string literals used |

**Note**: Many of these ARE defined as union types, which is acceptable. The main issue is `effectType?: string` which is completely untyped.

---

## 7. Untyped Event Emitters

### Critical: EventEmitter Without Type Parameters

All network classes extend `EventEmitter` without type parameters:

| File | Class | Events Emitted |
|------|-------|---------------|
| `src/network/connection.ts:202` | `Connection extends EventEmitter` | 'close', 'error', 'message', 'backpressure' |
| `src/network/discord-client.ts:60` | `DiscordClient extends EventEmitter` | 'error', 'disconnect', 'message', 'stateChange' |
| `src/network/grapevine-client.ts:88` | `GrapevineClient extends EventEmitter` | 'error', 'disconnect', 'message', 'stateChange' |
| `src/network/i2-client.ts:133` | `I2Client extends EventEmitter` | 'error', 'mudlistUpdate', 'message' |
| `src/network/connection-manager.ts:21` | `ConnectionManager extends EventEmitter` | 'connect', 'disconnect' |
| `src/network/server.ts:60` | `Server extends EventEmitter` | 'message', 'disconnect', 'error' |
| `src/network/i3-client.ts:62` | `I3Client extends EventEmitter` | (various) |

**Recommendation**: Use typed EventEmitter pattern:

```typescript
interface ConnectionEvents {
  close: [code: number, reason: string];
  error: [error: Error];
  message: [message: string];
  backpressure: [bufferedAmount: number];
}

class Connection extends TypedEventEmitter<ConnectionEvents> {
  // Now emit() and on() are type-safe
}
```

### High: Untyped Callbacks

| File | Line | Code | Issue |
|------|------|------|-------|
| `mudlib/daemons/quest.ts` | 49 | `private _customHandlers: Map<string, Function>` | `Function` type loses all parameter info |
| `mudlib/daemons/quest.ts` | 136 | `registerCustomHandler(name: string, handler: Function)` | Should be typed callback |
| `mudlib/efuns.d.ts` | 893 | `i3OnPacket(callback: (packet: unknown[]) => void)` | `unknown[]` loses packet structure |

---

## 8. `Record<string, unknown>` Patterns

### Medium: Weak Dynamic Typing

The codebase uses `Record<string, unknown>` in ~40 places, often for:

1. **Form data** (acceptable for dynamic forms)
2. **JSON parsing** (acceptable, needs runtime validation)
3. **Property bags** (could often be stronger)

**Examples of improvable patterns**:

| File | Line | Current | Could Be |
|------|------|---------|----------|
| `mudlib/std/object.ts` | 311 | `setProperty(key: string, value: unknown)` | Generic or mapped type |
| `mudlib/lib/area-builder-gui.ts` | Multiple | `Record<string, unknown>` form data | Specific form interfaces |

---

## Summary by Severity

### Critical (Runtime Bugs Risk)

| Issue | Count | Primary Locations |
|-------|-------|-------------------|
| Untyped EventEmitters | 7 | src/network/*.ts |
| Non-null assertions on possibly-null values | 10 | websocket-client.ts, ide-editor.ts |
| `_player: unknown` with frequent casting | 6+ | connection.ts |

### High (Maintenance Burden)

| Issue | Count | Primary Locations |
|-------|-------|-------------------|
| `as any` masking interface mismatches | 8 | room.ts, _craft.ts, _gather.ts, area files |
| GUI element `as DisplayElement` spam | 100+ | stat-modal.ts, mercenary-modal.ts |
| Untyped `Function` callbacks | 3 | quest.ts |
| Inconsistent error return patterns | 60+ | std/*.ts |

### Medium (Code Quality)

| Issue | Count | Primary Locations |
|-------|-------|-------------------|
| String literals instead of enums | 5 | loot/types.ts, portrait.ts |
| `Record<string, unknown>` where stronger types possible | 40+ | Various |
| Missing explicit return types | Many | std/*.ts methods |

---

## Recommended Priorities

1. **Type the Connection.player field** - Add proper interface, eliminate 20+ casts
2. **Create TypedEventEmitter base class** - Fix all 7 network classes
3. **Add ProfessionPlayer interface** - Eliminate `as any` in profession code
4. **Create GUI element builder functions** - Reduce `as DisplayElement` noise
5. **Establish error handling conventions** - Document and enforce patterns
6. **Add effect type union** - Replace `effectType?: string` with proper type
