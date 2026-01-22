# Efuns Reference

Efuns (External Functions) are driver-provided APIs available to mudlib code. They provide access to core driver functionality that mudlib code cannot implement itself.

## Global Availability

Efuns are globally available in all mudlib code through the `efuns` object. You don't need to declare them - just use them:

```typescript
// No import or declaration needed - efuns is globally available
export class MyRoom extends Room {
  async onCreate(): Promise<void> {
    await super.onCreate();
    const sword = await efuns.cloneObject('/std/sword');
    const player = efuns.thisPlayer();
    efuns.send(player!, 'A sword appears!');
  }
}
```

Type declarations are provided in `/mudlib/efuns.d.ts` and are automatically included by the mudlib's TypeScript configuration.

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

## Sound

Play audio on the client. See [Sound System](sound-system.md) for full documentation.

### playSound(player, category, sound, options?)

Play a sound once.

```typescript
efuns.playSound(player, 'combat', 'hit');
efuns.playSound(player, 'spell', 'cast', { volume: 0.8 });
efuns.playSound(player, 'alert', 'bosses/dragon-roar.mp3');
```

**Categories:** `combat`, `spell`, `skill`, `potion`, `quest`, `celebration`, `discussion`, `alert`, `ambient`, `ui`

### loopSound(player, category, sound, id, options?)

Loop a sound continuously until stopped.

```typescript
efuns.loopSound(player, 'ambient', 'rain', 'room-weather', { volume: 0.3 });
```

### stopSound(player, category, id?)

Stop a looping sound. If no id provided, stops all sounds in the category.

```typescript
efuns.stopSound(player, 'ambient', 'room-weather');  // Stop specific
efuns.stopSound(player, 'ambient');                   // Stop all ambient
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

### reloadCommand(commandPath)

Reload a command module from disk. Commands are immediately updated for all usages. **Requires builder permission or higher.**

```typescript
const result = await efuns.reloadCommand('/cmds/player/_look');
// result: { success: true }

const result2 = await efuns.reloadCommand('/cmds/builder/_update');
// result2: { success: true }
```

**Behavior:**
- The command TypeScript file is recompiled from disk
- All future usages of the command use the new code immediately
- Unlike objects, there are no "clones" to worry about

**Returns:**
- `success: boolean` - Whether the reload succeeded
- `error?: string` - Error message if failed

## Player Persistence

### savePlayer(player)

Save a player's data to disk. Called automatically on quit, but can be triggered manually.

```typescript
await efuns.savePlayer(player);
```

## Output

### page(lines, options?)

Display content with pagination support for long output.

```typescript
efuns.page(['Line 1', 'Line 2', 'Line 3', ...], {
  title: 'File Contents',
  linesPerPage: 20,
});
```

When the player presses Enter/Space, the next page is shown. Supports search with `/pattern`.

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

## AI Integration

These efuns provide access to the Claude AI API for content generation and NPC dialogue. They require `CLAUDE_API_KEY` to be configured in the `.env` file.

### aiAvailable()

Check if AI features are available and configured.

```typescript
if (efuns.aiAvailable()) {
  // AI is ready to use
}
// Returns: boolean
```

### aiGenerate(prompt, context?, options?)

Generate text using the AI model. This is the low-level API for custom prompts.

```typescript
const result = await efuns.aiGenerate(
  'Describe a haunted forest in a fantasy setting.',
  'This is for a dark fantasy MUD game.',
  { maxTokens: 500 }
);

if (result.success) {
  console.log(result.text);
} else {
  console.log(result.error);
}
// Returns: { success: boolean, text?: string, error?: string }
```

**Options:**
- `maxTokens?: number` - Maximum tokens in response (default: 1024)

### aiDescribe(type, details)

Generate descriptions for game objects. Specialized wrapper around `aiGenerate`.

```typescript
const result = await efuns.aiDescribe('room', {
  name: 'Dusty Library',
  theme: 'abandoned, scholarly, mysterious',
});

if (result.success) {
  console.log(result.shortDesc); // "A dusty, abandoned library"
  console.log(result.longDesc);  // Full description paragraph
}
// Returns: { success: boolean, shortDesc?: string, longDesc?: string, error?: string }
```

**Types:** `room`, `item`, `npc`, `weapon`, `armor`

### aiNpcResponse(npcContext, playerMessage, history?)

Generate an AI-powered NPC response to a player message.

```typescript
const result = await efuns.aiNpcResponse(
  {
    name: 'Bartleby the Innkeeper',
    personality: 'Friendly and gossipy',
    background: 'Former adventurer who retired to run the inn.',
    knowledgeScope: {
      topics: ['local news', 'drinks', 'adventuring'],
      forbidden: ['his adventuring past'],
      localKnowledge: ['The inn has 6 rooms for rent'],
      worldLore: ['region:valdoria', 'economics:trade-routes'],
    },
    speakingStyle: {
      formality: 'casual',
      verbosity: 'verbose',
    },
  },
  'What do you know about the thieves guild?',
  [
    { role: 'player', content: 'Hello!' },
    { role: 'npc', content: 'Welcome to the Silver Tankard!' },
  ]
);

if (result.success && result.response) {
  npc.say(result.response);
} else if (result.fallback) {
  // AI unavailable, use static responses
}
// Returns: { success: boolean, response?: string, fallback?: boolean, error?: string }
```

**NPCAIContext fields:**
- `name: string` - NPC's full name for the AI
- `personality: string` - Personality description
- `background?: string` - Character background
- `currentMood?: string` - Current emotional state
- `knowledgeScope.topics?: string[]` - Topics they know about
- `knowledgeScope.forbidden?: string[]` - Topics they avoid
- `knowledgeScope.localKnowledge?: string[]` - Specific facts they know
- `knowledgeScope.worldLore?: string[]` - Lore IDs to include (fetched from lore daemon)
- `speakingStyle.formality?: 'casual' | 'formal' | 'archaic'`
- `speakingStyle.verbosity?: 'terse' | 'normal' | 'verbose'`
- `speakingStyle.accent?: string` - Speech pattern notes

**ConversationMessage:**
- `role: 'player' | 'npc'`
- `content: string`

The `worldLore` array references lore entry IDs. The system automatically fetches these from the lore daemon and includes them in the AI prompt.

## IDE Integration

### ideOpen(filePath, content, options?)

Open the web-based IDE for editing content.

```typescript
efuns.ideOpen('/areas/town/tavern.ts', sourceCode, {
  language: 'typescript',
  readOnly: false,
});
```

Used by the `ide` and `lore edit` commands to provide visual editing.

---

## Giphy Efuns

Functions for GIF sharing on channels. See [Giphy Integration](giphy-integration.md) for full documentation.

### giphyAvailable()

Check if Giphy GIF sharing is configured and available.

```typescript
if (efuns.giphyAvailable()) {
  // Giphy is ready to use
}
```

Returns `false` if `GIPHY_API_KEY` is not set or `giphy.enabled` config is `false`.

### giphySearch(query)

Search for a GIF on Giphy.

```typescript
const result = await efuns.giphySearch('funny cats');

if (result.success) {
  console.log(result.url);    // GIF URL
  console.log(result.title);  // GIF title
} else {
  console.log(result.error);  // Error message
}
```

**Parameters:**
- `query: string` - Search terms (max 100 characters)

**Returns:** `{ success: boolean; url?: string; title?: string; error?: string }`

### giphyGenerateId()

Generate a unique ID for caching a GIF.

```typescript
const gifId = efuns.giphyGenerateId();
// e.g., "gif_lxyz123_abc456"
```

### giphyCacheGif(id, data)

Cache a GIF for later retrieval via clickable links.

```typescript
efuns.giphyCacheGif('gif_abc123', {
  url: 'https://media.giphy.com/...',
  title: 'Funny Cat',
  senderName: 'PlayerName',
  channelName: 'OOC',
  query: 'funny cats',
});
```

Cache duration: 1 hour.

### giphyGetCachedGif(id)

Retrieve a cached GIF by ID.

```typescript
const gif = efuns.giphyGetCachedGif('gif_abc123');

if (gif) {
  console.log(gif.url);         // GIF URL
  console.log(gif.senderName);  // Who shared it
  console.log(gif.channelName); // Which channel
  console.log(gif.query);       // Search query
}
```

Returns `undefined` if ID doesn't exist or cache has expired.
