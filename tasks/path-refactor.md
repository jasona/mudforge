# Plan: Refactor Command Path Access System

## Overview

Refactor the command access system from a simple permission-level check to a per-player command path system. This allows admins to grant or revoke access to specific command directories on a per-player basis, while maintaining backwards compatibility.

## Current Behavior

- Commands loaded from 4 fixed directories: `player/`, `builder/`, `senior/`, `admin/`
- Each directory maps to a permission level (0-3)
- At execution time: `if (playerLevel < loaded.level) return false` (line 328 of command-manager.ts)
- ALL players at a given level can access ALL commands at that level

## New Behavior

- Each player has a list of command directory paths they can access
- Default paths are derived from permission level (backwards compatible)
- Admins can add/remove custom paths per-player
- Command execution checks if command's directory is in player's allowed paths
- Paths persist in `permissions.json`

---

## Implementation Steps

### Step 1: Add commandPaths storage to Permissions class

**File:** `src/driver/permissions.ts`

Add new private member alongside `domains`:
```typescript
private commandPaths: Map<string, string[]> = new Map();
```

Add methods:
- `getCommandPaths(playerName: string): string[] | undefined` - get custom paths (undefined = use defaults)
- `setCommandPaths(playerName: string, paths: string[]): void` - set custom paths
- `addCommandPath(playerName: string, path: string): void` - add one path
- `removeCommandPath(playerName: string, path: string): void` - remove one path
- `clearCommandPaths(playerName: string): void` - revert to level-derived defaults
- `getEffectiveCommandPaths(playerName: string): string[]` - get paths (custom or level-derived)

Add helper for level-derived defaults:
```typescript
private getDefaultCommandPathsForLevel(level: PermissionLevel): string[] {
  const paths = ['player'];
  if (level >= PermissionLevel.Builder) paths.push('builder');
  if (level >= PermissionLevel.SeniorBuilder) paths.push('senior');
  if (level >= PermissionLevel.Administrator) paths.push('admin');
  return paths;
}
```

Update `export()` to include `commandPaths` in returned object.
Update `import()` to restore `commandPaths` from saved data.

### Step 2: Modify CommandManager.execute() to check paths

**File:** `src/driver/command-manager.ts`

Add import:
```typescript
import { getPermissions } from './permissions.js';
```

Add helper method:
```typescript
private getCommandDirectory(filePath: string): string {
  // Extract "builder" from "...cmds/builder/_goto.ts"
  const parts = filePath.split(/[/\\]/);
  const cmdsIndex = parts.findIndex(p => p === 'cmds');
  return cmdsIndex >= 0 && parts[cmdsIndex + 1] ? parts[cmdsIndex + 1] : 'player';
}
```

Modify `execute()` method (around line 327-331):

**Before:**
```typescript
if (playerLevel < loaded.level) {
  return false;
}
```

**After:**
```typescript
const playerName = (player as { name?: string }).name;
if (playerName) {
  const permissions = getPermissions();
  const allowedPaths = permissions.getEffectiveCommandPaths(playerName);
  const cmdDir = this.getCommandDirectory(loaded.filePath);
  if (!allowedPaths.includes(cmdDir)) {
    return false;
  }
} else {
  // Fallback for objects without names (NPCs, etc) - use level check
  if (playerLevel < loaded.level) {
    return false;
  }
}
```

Update `getAvailableCommands()` similarly to use path-based filtering when possible.

### Step 3: Add efuns for path management

**File:** `src/driver/efun-bridge.ts`

Add new efun methods (following existing patterns for `addDomain`/`removeDomain`):

```typescript
getCommandPaths(playerName?: string): string[]
setCommandPaths(playerName: string, paths: string[]): { success: boolean; error?: string }
addCommandPath(playerName: string, path: string): { success: boolean; error?: string }
removeCommandPath(playerName: string, path: string): { success: boolean; error?: string }
clearCommandPaths(playerName: string): { success: boolean; error?: string }
```

Each setter validates:
- Caller is admin
- Path is valid directory name (`player`, `builder`, `senior`, `admin`)

### Step 4: Extend _permissions.ts with path management

**File:** `mudlib/cmds/admin/_permissions.ts`

Add `paths` subcommand:
```
permissions paths <player>                    - Show player's command paths
permissions paths add <player> <path>         - Add a command path
permissions paths remove <player> <path>      - Remove a command path
permissions paths reset <player>              - Reset to level defaults
permissions paths set <player> <path1,path2>  - Set explicit paths
```

Example output:
```
=== Command Paths: Bob ===
Level: Builder (1)
Default paths: player, builder
Custom paths: player, builder, senior
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/driver/permissions.ts` | Add `commandPaths` map, getter/setter/helper methods, update export/import |
| `src/driver/command-manager.ts` | Change `execute()` to check paths, add `getCommandDirectory()` helper |
| `src/driver/efun-bridge.ts` | Add 5 new efuns for path management |
| `mudlib/cmds/admin/_permissions.ts` | Add `paths` subcommand |

---

## Backwards Compatibility

- **No player save format changes** - paths stored in central permissions.json
- **Default behavior unchanged** - no custom paths = level-derived paths
- **Existing permissions.json** - works as-is; new field is optional
- **Existing promote/demote** - work unchanged (level-derived paths auto-update)

---

## Verification

1. **Start server, log in as admin** - verify existing commands work
2. **Check default paths**: `permissions paths acer` should show level-derived paths
3. **Add custom path**: `permissions paths add testplayer senior` - builder gets senior commands
4. **Verify command access**: testplayer can use senior commands
5. **Remove path**: `permissions paths remove testplayer builder` - loses builder commands
6. **Reset paths**: `permissions paths reset testplayer` - back to level defaults
7. **Restart server** - verify paths persist across reboot
8. **Run tests**: `npm test` to ensure no regressions
