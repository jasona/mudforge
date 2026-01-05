# Daemons

Daemons are background services that provide global functionality to the MUD. They run as singleton objects and handle cross-cutting concerns like login, channels, and help systems.

## Overview

```
mudlib/daemons/
├── login.ts      # Player authentication and session management
├── channels.ts   # Communication channels
├── help.ts       # Help system
└── admin.ts      # Administration functions
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

### Session Reconnection

When a player reconnects after a disconnect:

1. Login daemon checks for existing active player
2. If found, transfers the new connection to existing player object
3. Player resumes in their previous location
4. No duplicate player is created

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
