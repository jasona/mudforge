# Scalable Object Preloading System

## Problem
`master.ts` has a static list of ~54 object paths in `onPreload()`. This won't scale when the game has thousands of rooms and objects.

## Solution
Replace the static list with directory-based auto-discovery:
- **Daemons**: Scan `/daemons/` and load all `.ts` files
- **Areas**: Recursively scan `/areas/` and load all `.ts` files
- **Std objects**: Keep explicit (small, stable set of ~9 files)

---

## Files to Modify

### 1. `mudlib/master.ts`

Replace static `onPreload()` with dynamic discovery:

```typescript
/**
 * Called to get the list of objects to preload.
 * Auto-discovers daemons and areas instead of static list.
 */
async onPreload(): Promise<string[]> {
  const preloadList: string[] = [];

  // 1. Standard library objects (explicit - small stable set)
  const stdObjects = [
    '/std/object',
    '/std/room',
    '/std/item',
    '/std/container',
    '/std/living',
    '/std/player',
    '/std/npc',
    '/std/weapon',
    '/std/armor',
  ];
  preloadList.push(...stdObjects);

  // 2. Auto-discover daemons
  const daemons = await this.discoverFiles('/daemons');
  preloadList.push(...daemons);

  // 3. Auto-discover areas (rooms, NPCs, items)
  const areas = await this.discoverFiles('/areas');
  preloadList.push(...areas);

  console.log(`[Master] Preloading ${preloadList.length} objects (${daemons.length} daemons, ${areas.length} area objects)`);
  return preloadList;
}

/**
 * Recursively discover all .ts files in a directory.
 * @param basePath The base path to scan (e.g., '/daemons')
 * @returns Array of object paths without extensions
 */
private async discoverFiles(basePath: string): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await efuns.readDir(basePath);

    for (const entry of entries) {
      const fullPath = `${basePath}/${entry}`;
      const stat = await efuns.fileStat(fullPath);

      if (stat.isDirectory) {
        // Recurse into subdirectories
        const subFiles = await this.discoverFiles(fullPath);
        results.push(...subFiles);
      } else if (entry.endsWith('.ts') && !entry.startsWith('_index')) {
        // Add .ts files (strip extension for object path)
        results.push(fullPath.replace(/\.ts$/, ''));
      }
    }
  } catch (error) {
    console.warn(`[Master] Failed to scan ${basePath}:`, error);
  }

  return results;
}
```

**Key changes:**
- `onPreload()` becomes `async` (returns `Promise<string[]>`)
- Add `discoverFiles()` helper method for recursive directory scanning
- Keep `/std/` objects as explicit list (stable, ~9 items)
- Log discovery statistics for debugging

---

### 2. `src/driver/driver.ts`

Update to handle async `onPreload()`:

**Current code (lines ~235-239):**
```typescript
if (this.master?.onPreload) {
  const preloadList = await this.master.onPreload();
  await this.preloadObjects(preloadList);
}
```

This already uses `await`, so if `onPreload()` returns a Promise, it will work. However, verify the master interface type allows async return.

**Check/update the MasterObject interface** if it explicitly types `onPreload()`:
```typescript
interface MasterObject {
  onPreload?(): string[] | Promise<string[]>;
  // ...
}
```

---

## Optional Enhancement: Exclusion Config

Add `/data/preload-config.json` for fine-grained control:

```json
{
  "exclude": [
    "/areas/test/",
    "/daemons/deprecated/"
  ],
  "additionalPaths": [
    "/users/shared/common_room"
  ]
}
```

This allows excluding WIP areas or adding non-standard paths without code changes.

---

## Implementation Order

1. **Update `master.ts`**
   - Add `discoverFiles()` method
   - Modify `onPreload()` to use auto-discovery
   - Keep std objects explicit

2. **Verify `driver.ts`** handles async return (likely no changes needed)

3. **Test startup** with existing areas/daemons

4. **(Optional)** Add preload-config.json support

---

## Verification

1. **Start the driver** and check console output:
   ```
   [Master] Preloading 65 objects (6 daemons, 50 area objects)
   ```

2. **Add a new room file** to `/areas/` - it should auto-load on next restart without editing master.ts

3. **Add a new daemon** to `/daemons/` - it should auto-load on next restart

4. **Verify existing functionality** works:
   - Login flow
   - Moving between rooms
   - NPC interactions
   - All daemons functioning

---

## Files Summary

| File | Change |
|------|--------|
| `mudlib/master.ts` | Add `discoverFiles()`, update `onPreload()` to async |
| `src/driver/driver.ts` | Verify async handling (likely no change) |
| `mudlib/data/preload-config.json` | Optional exclusion/addition config |
