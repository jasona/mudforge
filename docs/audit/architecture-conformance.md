# Architecture Conformance Audit

**Date**: 2026-02-02
**Auditor**: Claude Code
**Scope**: Review of MudForge codebase against stated architecture in README.md and docs/architecture.md

## Executive Summary

The MudForge architecture generally follows the stated driver/mudlib separation, but several violations exist that should be addressed. The most significant issues involve mudlib code directly importing driver internals and Node.js modules that should only be available in the driver context.

---

## 1. Driver/Mudlib Boundary (src/ vs mudlib/)

### Stated Architecture
> "MudForge follows a classic MUD driver architecture, separating the **driver** (game engine) from the **mudlib** (game content)."
>
> "Mudlib code runs in isolated V8 contexts... No access to Node.js built-ins"

### Findings

**✅ CLEAN: Driver does not import from mudlib/**

The driver correctly loads mudlib through the `MudlibLoader` abstraction rather than direct imports:
- `src/driver/driver.ts` imports from `./mudlib-loader.js` (internal driver module)
- `src/driver/efun-bridge.ts` imports from `./mudlib-loader.js`

The driver treats mudlib as dynamically-loaded content, not compile-time dependencies.

---

## 2. Mudlib Interaction with Driver

### Stated Architecture
> "Efuns (external functions) are driver APIs exposed to mudlib code. They are globally available through the `efuns` object"

### Findings

**❌ VIOLATION: Direct import from driver internals**

| File | Line | Issue |
|------|------|-------|
| `mudlib/daemons/admin.ts` | 8 | `import { PermissionLevel } from '../../src/driver/permissions.js';` |

The `AdminDaemon` directly imports the `PermissionLevel` enum from the driver. This breaks the isolation model and creates a compile-time dependency on driver internals.

**Recommendation**: Define `PermissionLevel` in the mudlib (perhaps in `mudlib/lib/permissions.ts`) or expose it through efuns. The driver can use the same definition.

---

## 3. Node.js Module Usage in Mudlib

### Stated Architecture
> "Mudlib code runs in isolated V8 contexts... No access to Node.js built-ins"

### Findings

**❌ VIOLATION: Direct Node.js module imports**

| File | Line | Modules Imported |
|------|------|------------------|
| `mudlib/daemons/login.ts` | 19 | `scrypt, randomBytes, timingSafeEqual` from `crypto` |
| `mudlib/daemons/login.ts` | 20 | `promisify` from `util` |
| `mudlib/daemons/login.ts` | 21 | `dns` (entire module) |
| `mudlib/daemons/portrait.ts` | 20 | `createHash` from `crypto` |

These daemons directly import Node.js built-in modules, which contradicts the stated sandboxing model. If the mudlib runs in isolated V8 contexts, these imports should fail at runtime.

**Possible explanations**:
1. These daemons run in the driver context, not the sandbox (architectural exception)
2. The sandbox isn't as strict as documented
3. These are legacy violations that haven't been caught

**Recommendation**:
- If crypto operations are needed, expose them through efuns (e.g., `efuns.hashPassword()`, `efuns.verifyPassword()`, `efuns.generateHash()`)
- If DNS lookup is needed, expose `efuns.reverseDNS()` or similar
- Document any intentional exceptions clearly

---

## 4. Daemon Responsibilities

### Stated Architecture
Daemons listed in README.md:
- GuildDaemon - Guild and skill management
- QuestDaemon - Quest registration and tracking
- CombatDaemon - Combat resolution
- ChannelDaemon - Communication channels
- SoulDaemon - Emote management
- ResetDaemon - Periodic room resets
- ConfigDaemon - Game-wide configuration
- LoreDaemon - World lore registry for AI

### Findings

**⚠️ CONCERN: Some daemons have grown large**

| Daemon | Lines | Notes |
|--------|-------|-------|
| `area.ts` | 1,730 | Area builder, editor, publisher, code generator - potentially too many responsibilities |
| `channels.ts` | 1,560 | Handles local, intermud, intermud2, grapevine, discord channels |
| `combat.ts` | 1,434 | Complex but single responsibility |
| `help.ts` | 1,305 | Dynamic help generation across all systems |
| `quest.ts` | 1,301 | Quest tracking, objectives, rewards |
| `party.ts` | 1,236 | Party management |
| `guild.ts` | 1,196 | Guild management with skills |
| `intermud.ts` | 1,141 | I3 protocol implementation |
| `login.ts` | 1,082 | Login, character creation, password hashing, DNS lookup |

**Potential issues**:

1. **AreaDaemon** - Combines registry, CRUD operations, validation, TypeScript code generation, and file publishing. Consider splitting into:
   - `AreaRegistry` - CRUD and storage
   - `AreaValidator` - Validation logic
   - `AreaPublisher` - Code generation and file writing

2. **LoginDaemon** - Combines authentication, character creation, race selection, and network operations (DNS). The DNS resolution and crypto operations are also Node.js module violations.

3. **ChannelDaemon** - Handles many channel types but this may be intentional for unified channel management.

---

## 5. Object Hierarchy Conformance

### Stated Architecture
```
MudObject                          # Root of all objects
├── Room
├── Item (→ Weapon, Armor, Container)
├── Living (→ Player, NPC)
└── Daemon
```

### Findings

**❌ VIOLATION: AdminDaemon does not extend MudObject**

```typescript
// mudlib/daemons/admin.ts:33
export class AdminDaemon {  // Should be: extends MudObject
```

All other daemons correctly extend `MudObject`:
- `ChannelDaemon extends MudObject` ✅
- `CombatDaemon extends MudObject` ✅
- `LoginDaemon extends MudObject` ✅
- etc.

**✅ ACCEPTABLE: Utility classes without MudObject inheritance**

These classes intentionally don't extend MudObject as they are utilities, not game objects:

| Class | File | Purpose |
|-------|------|---------|
| `Shadow` | `mudlib/std/shadow.ts` | Object overlay mechanism for transformations |
| `LootGenerator` | `mudlib/std/loot/generator.ts` | Item generation algorithm |

---

## 6. Client Isolation

### Stated Architecture
The client is a separate browser application that communicates via WebSocket.

### Findings

**✅ CLEAN: No violations found**

- `src/client/` does not import from `src/driver/`
- `src/client/` does not import from `mudlib/`

The client is properly isolated and communicates only through WebSocket messages.

---

## Summary of Violations

| Severity | Count | Category |
|----------|-------|----------|
| High | 1 | Mudlib imports from driver (`admin.ts → permissions.js`) |
| High | 2 | Node.js modules in mudlib (`login.ts`, `portrait.ts`) |
| Medium | 1 | Daemon not extending MudObject (`AdminDaemon`) |
| Low | 3 | Large daemons with potentially multiple responsibilities |

## Recommended Actions

### Immediate (High Priority)
1. **Remove driver import in admin.ts**: Define `PermissionLevel` enum in mudlib or expose through efuns
2. **Audit crypto usage**: Decide if login/portrait daemons run in sandbox; if yes, expose crypto through efuns

### Short-term (Medium Priority)
3. **Fix AdminDaemon hierarchy**: Make it extend `MudObject` like other daemons
4. **Document architectural exceptions**: If some daemons intentionally run outside sandbox, document this

### Long-term (Low Priority)
5. **Consider splitting AreaDaemon**: Separate concerns into multiple modules
6. **Review large daemons**: Ensure they haven't accumulated unrelated responsibilities
