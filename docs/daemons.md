# Daemons

Daemons are background services that provide global functionality to the MUD. They run as singleton objects and handle cross-cutting concerns like login, channels, and help systems.

## Overview

```
mudlib/daemons/
├── login.ts      # Player authentication and session management
├── channels.ts   # Communication channels
├── help.ts       # Help system
├── admin.ts      # Administration functions
├── config.ts     # Mud-wide configuration settings
├── combat.ts     # Combat system management
├── quest.ts      # Quest system management
└── lore.ts       # World lore registry for AI integration
```

## Login Daemon

The login daemon handles player authentication, character creation, and session management.

### Location

`/mudlib/daemons/login.ts`

### Responsibilities

- Prompt for character name
- Authenticate returning players
- Guide new player creation
- Session reconnection after disconnect
- Player data persistence

### Flow

```
Connection
    │
    ▼
┌───────────────┐
│ Ask for name  │
└───────────────┘
    │
    ▼
┌───────────────┐     Yes     ┌─────────────────┐
│ Player exists?│────────────▶│ Verify password │
└───────────────┘             └─────────────────┘
    │ No                              │
    ▼                                 ▼
┌───────────────┐             ┌─────────────────┐
│ Create new    │             │ Check session   │
│ character     │             │ (reconnect?)    │
└───────────────┘             └─────────────────┘
    │                                 │
    ▼                                 ▼
┌───────────────┐             ┌─────────────────┐
│ Enter game    │◀────────────│ Resume/New      │
└───────────────┘             └─────────────────┘
```

### Session Reconnection & Link-Dead Handling

When a player disconnects unexpectedly (not via `quit`):

1. Room is notified with a fade message: "Player's form flickers and slowly fades from view..."
2. Player is moved to the void (`/areas/void/void`)
3. A disconnect timer starts (configurable via ConfigDaemon, default 15 minutes)
4. Player remains in active players list (can be seen in `who`)

When a player reconnects:

1. Login daemon checks for existing active player
2. If found, cancels any disconnect timer
3. Transfers the new connection to existing player object
4. Restores player to their previous location
5. Room is notified: "Player shimmers back into existence!"
6. No duplicate player is created

If the disconnect timer expires before reconnection:

1. Player is automatically saved
2. Player is removed from active players
3. Server broadcasts a notification of the disconnection

### Usage in Code

The login daemon is typically invoked by the master object:

```typescript
// Called by master when a new connection arrives
const loginDaemon = efuns.loadObject('/daemons/login');
loginDaemon.handleNewConnection(connection);
```

## Channels Daemon

The channels daemon manages global communication channels.

### Location

`/mudlib/daemons/channels.ts`

### Channels

| Channel | Access | Description |
|---------|--------|-------------|
| `ooc` | All players | Out-of-character chat |
| `shout` | All players | Server-wide announcements |
| `builder` | Builders+ | Builder discussion |
| `admin` | Admins | Admin communication |

### Special Syntax

| Prefix | Function | Example |
|--------|----------|---------|
| `:` | Channel emote | `ooc :laughs` |
| `;` | Share GIF | `ooc ;funny cats` |

The `;` prefix triggers a Giphy search and shares the result to all channel members. See [Giphy Integration](giphy-integration.md) for details.

### API

```typescript
import { getChannelDaemon } from '../daemons/channels.js';

const channelDaemon = getChannelDaemon();

// Send a message
channelDaemon.sendMessage('ooc', player, 'Hello everyone!');

// Subscribe to a channel
channelDaemon.subscribe('ooc', player);

// Unsubscribe from a channel
channelDaemon.unsubscribe('ooc', player);

// Check if subscribed
const isSubscribed = channelDaemon.isSubscribed('ooc', player);

// Get channel subscribers
const subscribers = channelDaemon.getSubscribers('ooc');

// List available channels
const channels = channelDaemon.getChannels();
```

### Message Format

Messages are formatted as:

```
[OOC] Hero: Hello everyone!
[Shout] Hero: The dragon is dead!
[Builder] Hero: How do I create a door?
[Admin] Hero: Server restart in 5 minutes
```

### Permission Checks

The daemon automatically checks permissions:

- Players can only access channels they're allowed to use
- Builder channel requires Builder+ permission
- Admin channel requires Administrator permission

## Help Daemon

The help daemon provides an in-game help system.

### Location

`/mudlib/daemons/help.ts`

### Help Structure

Help topics are organized in categories:

```
mudlib/help/
├── index.ts              # Help index and search
├── player/
│   └── basics.ts         # Basic gameplay help
├── builder/
│   └── building-basics.ts
├── admin/
│   └── admin-commands.ts
└── classes/
    ├── fighter/
    │   └── skills.ts
    └── thief/
        └── skills.ts
```

### API

```typescript
import { getHelpDaemon } from '../daemons/help.js';

const helpDaemon = getHelpDaemon();

// Get help index
const index = helpDaemon.getIndex();

// Get a specific topic
const topic = helpDaemon.getTopic('basics');

// Search topics
const results = helpDaemon.search('combat');

// List categories
const categories = helpDaemon.getCategories();

// Get topics in a category
const topics = helpDaemon.getTopicsInCategory('player');
```

### Help Topic Format

Help topics are TypeScript files that export content:

```typescript
// /mudlib/help/player/movement.ts
export const title = 'Movement';
export const category = 'player';
export const keywords = ['move', 'walk', 'go', 'directions'];

export const content = `
# Movement

Use direction commands to move around the world.

## Basic Directions

- north (n) - Go north
- south (s) - Go south
- east (e) - Go east
- west (w) - Go west

## Special Exits

Some rooms have named exits like "enter tavern" or "climb ladder".
`;
```

## Admin Daemon

The admin daemon provides administrative functions.

### Location

`/mudlib/daemons/admin.ts`

### Features

- Permission management
- Player administration
- System commands

### API

```typescript
import { getAdminDaemon } from '../daemons/admin.js';

const adminDaemon = getAdminDaemon();

// Grant permission level
adminDaemon.grantPermission(player, targetPlayer, 'builder');

// Revoke permissions
adminDaemon.revokePermission(player, targetPlayer);

// Add domain access
adminDaemon.addDomain(player, targetPlayer, '/areas/castle/');

// Remove domain access
adminDaemon.removeDomain(player, targetPlayer, '/areas/castle/');

// Get audit log
const log = adminDaemon.getAuditLog(20);
```

## Config Daemon

The config daemon manages mud-wide configuration settings that persist across server restarts.

### Location

`/mudlib/daemons/config.ts`

### Purpose

- Centralized configuration for game-wide settings
- Type-safe settings with validation (number, string, boolean)
- Constraints support (min/max for numbers)
- Automatic persistence to `/data/config/settings.json`
- Accessible via efuns from any mudlib code

### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `disconnect.timeoutMinutes` | number | 15 | Minutes before a disconnected player is force-quit |

### API

```typescript
// Via efuns (recommended for mudlib code)
const timeout = efuns.getMudConfig<number>('disconnect.timeoutMinutes');
efuns.setMudConfig('disconnect.timeoutMinutes', 30);

// Direct daemon access
const configDaemon = efuns.findObject('/daemons/config');

// Get a setting value
const value = configDaemon.get<number>('disconnect.timeoutMinutes');

// Set a setting value (validates type and constraints)
const result = configDaemon.set('disconnect.timeoutMinutes', 30);
if (!result.success) {
  console.log(result.error);
}

// Get all settings with metadata
const allSettings = configDaemon.getAll();

// Reset a setting to default
configDaemon.reset('disconnect.timeoutMinutes');

// Check if a setting exists
const exists = configDaemon.has('disconnect.timeoutMinutes');

// Get setting metadata (without value)
const info = configDaemon.getSettingInfo('disconnect.timeoutMinutes');
// { description, type, min?, max? }
```

### Adding New Settings

To add a new setting, update the `DEFAULT_SETTINGS` in `/mudlib/daemons/config.ts`:

```typescript
const DEFAULT_SETTINGS: Record<string, ConfigSetting> = {
  'disconnect.timeoutMinutes': {
    value: 15,
    description: 'Minutes before disconnected player is force-quit',
    type: 'number',
    min: 1,
    max: 60,
  },
  // Add new settings here
  'game.maxPlayersPerRoom': {
    value: 50,
    description: 'Maximum players allowed in a single room',
    type: 'number',
    min: 1,
    max: 1000,
  },
};
```

### Admin Commands

Administrators can manage settings in-game using the `config` command:

```
config                              # List all settings
config disconnect.timeoutMinutes    # View a setting
config disconnect.timeoutMinutes 30 # Change a setting
config reset disconnect.timeoutMinutes # Reset to default
```

## Lore Daemon

The lore daemon manages world lore entries that can be injected into AI prompts for consistent NPC dialogue and content generation.

### Location

`/mudlib/daemons/lore.ts`

### Purpose

- Central registry for world lore, history, factions, and other background information
- Provides consistent context for AI-powered NPCs and content generation
- Supports categorization, tagging, and priority-based retrieval
- Persists lore entries to `/data/lore/entries.json`

### Lore Categories

| Category | Description |
|----------|-------------|
| `world` | General world facts, cosmology, creation myths |
| `region` | Geographic areas, kingdoms, territories |
| `faction` | Organizations, guilds, groups |
| `history` | Past eras, timelines |
| `character` | Notable NPCs, heroes, villains |
| `event` | Major historical events, wars, disasters |
| `item` | Artifacts, magical items, item types |
| `creature` | Monster types, beasts, supernatural beings |
| `location` | Specific notable places (buildings, dungeons) |
| `economics` | Trade, currency, commerce |
| `mechanics` | World mechanics (magic systems, etc.) |
| `faith` | Religions, gods, worship |

### Lore Entry Structure

```typescript
interface LoreEntry {
  id: string;           // Format: "category:slug" (e.g., "faith:sun-god")
  category: LoreCategory;
  title: string;        // Display title
  content: string;      // AI-ready lore text
  tags?: string[];      // For filtering (e.g., ["magic", "elves"])
  relatedLore?: string[]; // IDs of related entries
  priority?: number;    // Higher = included first when truncating (default: 5)
}
```

### API

```typescript
import { getLoreDaemon } from '../daemons/lore.js';

const loreDaemon = getLoreDaemon();

// Register a new lore entry
loreDaemon.registerLore({
  id: 'faction:thieves-guild',
  category: 'faction',
  title: 'The Shadow Hand',
  content: 'The Shadow Hand is the largest thieves guild...',
  tags: ['criminal', 'underground'],
  priority: 5,
});

// Get a specific entry
const entry = loreDaemon.getLore('faction:thieves-guild');

// Get all entries in a category
const factions = loreDaemon.getLoreByCategory('faction');

// Get entries matching tags
const magicLore = loreDaemon.getLoreByTags(['magic']);

// Search entries by keyword
const results = loreDaemon.search('dragon');

// Get all lore entries
const allLore = loreDaemon.getAllLore();

// Build AI context from multiple entries (with max length)
const context = loreDaemon.buildContext(
  ['world:creation-myth', 'faction:thieves-guild'],
  2000  // max characters
);

// Remove an entry
loreDaemon.removeLore('faction:thieves-guild');

// Get all unique tags
const tags = loreDaemon.getAllTags();

// Persist changes
await loreDaemon.save();
```

### Usage with AI NPCs

NPCs reference lore via their `knowledgeScope.worldLore` array:

```typescript
export class Bartender extends NPC {
  constructor() {
    super();
    this.setAIContext({
      name: 'Mira the Bartender',
      personality: 'Friendly tavern owner who knows all the local gossip.',
      knowledgeScope: {
        topics: ['local news', 'drinks', 'rumors'],
        worldLore: [
          'region:valdoria',
          'faction:thieves-guild',
          'economics:trade-routes',
        ],
      },
    });
  }
}
```

When the NPC responds to players, the lore daemon automatically fetches these entries and includes them in the AI prompt.

### Builder Commands

Lore can be managed in-game using the `lore` command:

```
lore list [category]              # List all lore entries
lore show <id>                    # Show a specific entry
lore add <category> <title>       # Add new lore (opens IDE)
lore edit <id>                    # Edit existing lore (opens IDE)
lore remove <id>                  # Remove a lore entry
lore generate <category> <title> [theme]  # AI-generate lore
lore search <keyword>             # Search lore content
lore tags                         # List all tags
```

See [Commands Reference](commands.md#lore) for details.

---

## Creating a Custom Daemon

### Basic Structure

```typescript
// /mudlib/daemons/mydaemon.ts
import type { MudObject } from '../std/object.js';

let instance: MyDaemon | null = null;

export class MyDaemon {
  private data: Map<string, unknown> = new Map();

  constructor() {
    // Initialize daemon state
  }

  // Your daemon methods
  doSomething(player: MudObject): void {
    // Implementation
  }
}

// Singleton accessor
export function getMyDaemon(): MyDaemon {
  if (!instance) {
    instance = new MyDaemon();
  }
  return instance;
}
```

### Using Your Daemon

```typescript
// In a command or other mudlib code
import { getMyDaemon } from '../daemons/mydaemon.js';

const daemon = getMyDaemon();
daemon.doSomething(player);
```

### Best Practices

1. **Use Singleton Pattern** - Daemons should be single instances
2. **Initialize Lazily** - Create instance on first access
3. **Handle Persistence** - Save/load state if needed
4. **Check Permissions** - Verify caller has appropriate access
5. **Log Actions** - Audit important operations
6. **Handle Errors** - Don't crash on invalid input

## Daemon Lifecycle

Daemons are loaded on demand and persist for the lifetime of the driver:

```
Driver Start
    │
    ▼
┌─────────────────┐
│ Daemon not      │
│ loaded yet      │
└─────────────────┘
    │
    ▼ First access (getXxxDaemon())
┌─────────────────┐
│ Create daemon   │
│ instance        │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Daemon active   │◀──┐
│ (singleton)     │───┘ All subsequent calls
└─────────────────┘
    │
    ▼ Driver shutdown
┌─────────────────┐
│ Daemon cleanup  │
└─────────────────┘
```

## Common Patterns

### Event Broadcasting

```typescript
class EventDaemon {
  private listeners: Map<string, Set<MudObject>> = new Map();

  subscribe(event: string, listener: MudObject): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  unsubscribe(event: string, listener: MudObject): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, data: unknown): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        // Call listener's handler
        (listener as { onEvent?: (e: string, d: unknown) => void }).onEvent?.(event, data);
      }
    }
  }
}
```

### Timed Tasks

```typescript
class TimerDaemon {
  private timers: Map<string, NodeJS.Timeout> = new Map();

  schedule(id: string, callback: () => void, intervalMs: number): void {
    this.cancel(id); // Cancel existing
    this.timers.set(id, setInterval(callback, intervalMs));
  }

  cancel(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }
  }
}
```

### Data Persistence

```typescript
class PersistentDaemon {
  private data: Record<string, unknown> = {};
  private saveFile = '/data/daemon-state.json';

  async load(): Promise<void> {
    const content = await efuns.readFile(this.saveFile);
    this.data = JSON.parse(content);
  }

  async save(): Promise<void> {
    await efuns.writeFile(this.saveFile, JSON.stringify(this.data, null, 2));
  }
}
```
