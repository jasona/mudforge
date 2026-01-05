# Efuns Reference

Efuns (External Functions) are driver-provided APIs available to mudlib code. They provide access to core driver functionality that mudlib code cannot implement itself.

## Object Management

### cloneObject(path)

Create a new clone of a blueprint.

```typescript
const sword = await efuns.cloneObject('/std/sword');
// Returns: MudObject with objectId like '/std/sword#47'
```

### destruct(object)

Destroy an object, removing it from the game.

```typescript
await efuns.destruct(sword);
```

### loadObject(path)

Load a blueprint object (does not clone).

```typescript
const blueprint = efuns.loadObject('/std/sword');
```

### findObject(pathOrId)

Find an object by path or clone ID.

```typescript
const obj = efuns.findObject('/std/sword#47');
```

## Object Hierarchy

### allInventory(object)

Get all objects inside an object's inventory.

```typescript
const contents = efuns.allInventory(player);
// Returns: MudObject[]
```

### environment(object)

Get an object's environment (container).

```typescript
const room = efuns.environment(player);
// Returns: MudObject | null
```

### move(object, destination)

Move an object to a new environment.

```typescript
await efuns.move(sword, player);
```

## Context

### thisObject()

Get the currently executing object.

```typescript
const self = efuns.thisObject();
```

### thisPlayer()

Get the player causing the current action.

```typescript
const player = efuns.thisPlayer();
```

### allPlayers()

Get all connected players.

```typescript
const players = efuns.allPlayers();
// Returns: MudObject[]
```

## Communication

### send(target, message)

Send a message to an object.

```typescript
efuns.send(player, 'You see a sword.');
```

## File Operations

File operations are sandboxed to the mudlib directory.

### readFile(path)

Read a file's contents.

```typescript
const content = await efuns.readFile('/areas/town/desc.txt');
// Returns: string
```

### writeFile(path, content)

Write content to a file. Requires write permission.

```typescript
await efuns.writeFile('/areas/myzone/room.ts', code);
```

### fileExists(path)

Check if a file exists.

```typescript
const exists = await efuns.fileExists('/std/sword.ts');
// Returns: boolean
```

### readDir(path)

List files in a directory.

```typescript
const files = await efuns.readDir('/areas/town/');
// Returns: string[]
```

### fileStat(path)

Get file information.

```typescript
const stat = await efuns.fileStat('/std/sword.ts');
// Returns: { isFile, isDirectory, size, mtime }
```

### makeDir(path, recursive?)

Create a directory. Requires write permission.

```typescript
await efuns.makeDir('/areas/newzone');
await efuns.makeDir('/areas/newzone/rooms/deep', true); // Create parents
```

### removeDir(path, recursive?)

Remove a directory. Requires write permission.

```typescript
await efuns.removeDir('/areas/oldzone'); // Must be empty
await efuns.removeDir('/areas/oldzone', true); // Remove contents too
```

### removeFile(path)

Remove a file. Requires write permission.

```typescript
await efuns.removeFile('/areas/zone/old.ts');
```

### moveFile(srcPath, destPath)

Move or rename a file/directory. Requires write permission on both paths.

```typescript
await efuns.moveFile('/areas/zone/old.ts', '/areas/zone/new.ts'); // Rename
await efuns.moveFile('/areas/zone/file.ts', '/backup/file.ts');   // Move
```

### copyFileTo(srcPath, destPath)

Copy a file. Requires read permission on source, write on destination.

```typescript
await efuns.copyFileTo('/std/room.ts', '/areas/myzone/room.ts');
```

## Utility Functions

### time()

Get current Unix timestamp (seconds).

```typescript
const now = efuns.time();
// Returns: number (seconds since epoch)
```

### timeMs()

Get current timestamp in milliseconds.

```typescript
const now = efuns.timeMs();
// Returns: number (milliseconds)
```

### random(max)

Generate a random integer from 0 to max-1.

```typescript
const roll = efuns.random(6) + 1; // 1-6
```

### capitalize(str)

Capitalize first character.

```typescript
efuns.capitalize('hello'); // 'Hello'
```

### explode(str, delimiter)

Split string into array.

```typescript
efuns.explode('a,b,c', ','); // ['a', 'b', 'c']
```

### implode(arr, delimiter)

Join array into string.

```typescript
efuns.implode(['a', 'b', 'c'], ','); // 'a,b,c'
```

### trim(str)

Remove whitespace from string ends.

```typescript
efuns.trim('  hello  '); // 'hello'
```

### lower(str)

Convert to lowercase.

```typescript
efuns.lower('HELLO'); // 'hello'
```

### upper(str)

Convert to uppercase.

```typescript
efuns.upper('hello'); // 'HELLO'
```

### toSeconds(timestamp)

Convert a timestamp to seconds. Handles both seconds and milliseconds formats automatically.

```typescript
efuns.toSeconds(1767588015729); // 1767588015 (was milliseconds)
efuns.toSeconds(1767632321);     // 1767632321 (already seconds)
```

### toMilliseconds(timestamp)

Convert a timestamp to milliseconds. Handles both seconds and milliseconds formats automatically.

```typescript
efuns.toMilliseconds(1767632321);     // 1767632321000 (was seconds)
efuns.toMilliseconds(1767588015729);  // 1767588015729 (already milliseconds)
```

### formatDuration(seconds)

Format a duration in seconds to a human-readable string.

```typescript
efuns.formatDuration(3661);   // '1 hour, 1 minute'
efuns.formatDuration(90061);  // '1 day, 1 hour, 1 minute'
efuns.formatDuration(45);     // 'less than a minute'
```

### formatDate(timestamp)

Format a timestamp to a human-readable date string. Automatically handles both seconds and milliseconds timestamps.

```typescript
efuns.formatDate(1767632321);      // 'Sun, Jan 5, 2026, 10:30 AM'
efuns.formatDate(1767588015729);   // 'Sun, Jan 5, 2026, 10:30 AM'
```

## Hot Reload

### reloadObject(objectPath)

Reload an object from disk, updating the blueprint in memory. This is true runtime hot-reload without server restart. **Requires builder permission or higher.**

```typescript
const result = await efuns.reloadObject('/areas/town/tavern');
// result: { success: true, existingClones: 3 }

const result2 = await efuns.reloadObject('/std/room');
// result2: { success: true, existingClones: 0 }

const result3 = await efuns.reloadObject('/nonexistent');
// result3: { success: false, error: 'File not found...', existingClones: 0 }
```

**Behavior:**
- The TypeScript file is recompiled from disk
- The blueprint's constructor is updated in the registry
- Existing clones keep their old behavior (traditional LPMud style)
- New clones created after the update use the new code

**Returns:**
- `success: boolean` - Whether the reload succeeded
- `error?: string` - Error message if failed
- `existingClones: number` - Number of existing clones (still using old code)

## Scheduler

### setHeartbeat(object, enable)

Enable or disable heartbeat for an object.

```typescript
efuns.setHeartbeat(this, true);
```

The object's `heartbeat()` method will be called regularly (default: every 2 seconds).

### callOut(callback, delayMs)

Schedule a delayed function call.

```typescript
const id = efuns.callOut(() => {
  console.log('5 seconds later');
}, 5000);
```

Returns a callOut ID that can be used to cancel.

### removeCallOut(id)

Cancel a scheduled call.

```typescript
efuns.removeCallOut(id);
// Returns: boolean (true if found and removed)
```

## Permission Checking

### checkReadPermission(path)

Check if current player can read a path.

```typescript
if (efuns.checkReadPermission('/areas/secret/')) {
  // Can read
}
```

### checkWritePermission(path)

Check if current player can write to a path.

```typescript
if (efuns.checkWritePermission('/areas/myzone/')) {
  // Can write
}
```

### isAdmin()

Check if current player is an administrator.

```typescript
if (efuns.isAdmin()) {
  // Admin-only code
}
```

### isBuilder()

Check if current player is a builder (or higher).

```typescript
if (efuns.isBuilder()) {
  // Builder-only code
}
```

### getPermissionLevel()

Get current player's permission level.

```typescript
const level = efuns.getPermissionLevel();
// 0=Player, 1=Builder, 2=SeniorBuilder, 3=Administrator
```

### getDomains()

Get current player's assigned domains.

```typescript
const domains = efuns.getDomains();
// Returns: string[] (e.g., ['/areas/castle/', '/areas/forest/'])
```
