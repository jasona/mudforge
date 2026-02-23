# Daemons

Daemons are background services that provide global functionality to the MUD. They run as singleton objects and handle cross-cutting concerns like login, channels, and help systems.

## Overview

```
mudlib/daemons/
├── login.ts        # Player authentication and session management
├── channels.ts     # Communication channels
├── help.ts         # Help system
├── admin.ts        # Administration functions
├── config.ts       # Mud-wide configuration settings
├── combat.ts       # Combat system management
├── quest.ts        # Quest system management
├── guild.ts        # Multi-guild system with skills and levels
├── lore.ts         # World lore registry for AI integration
├── discord.ts      # Discord channel bridge
├── area.ts         # Draft area builder with grid layout
├── time.ts         # In-game day/night cycle
├── reset.ts        # Periodic room resets and NPC respawns
├── map.ts          # Map/minimap generation
├── loot.ts         # Random loot generation with quality tiers
├── race.ts         # Race definitions and latent abilities
├── profession.ts   # Profession/crafting skill tracking
├── gathering.ts    # Resource gathering nodes
├── party.ts        # Party grouping and auto-assist
├── pet.ts          # Pet summoning and management
├── mercenary.ts    # Mercenary hiring system
├── portrait.ts     # AI character portrait generation with caching
├── tutorial.ts     # New player tutorial progression
├── bots.ts         # Simulated player bots
├── behavior.ts     # NPC behavior script management
├── aggro.ts        # NPC grudge/threat memory
├── announcement.ts # System announcements
├── snoop.ts        # Admin snooping utility
├── prompts.ts      # AI prompt template management
├── soul.ts         # Emote/social action system
├── vehicle.ts      # Vehicle system
├── intermud.ts     # Intermud 3 protocol (TCP)
├── intermud2.ts    # Intermud 2 protocol (UDP)
└── grapevine.ts    # Grapevine cross-MUD network (WebSocket)
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
| `discord` | All players | Discord bridge (when enabled) |

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
| `combat.playerKilling` | boolean | false | Allow PvP combat |
| `corpse.playerDecayMinutes` | number | 60 | Minutes before player corpses decay (0 = never) |
| `corpse.npcDecayMinutes` | number | 5 | Minutes before NPC corpses decay |
| `reset.intervalMinutes` | number | 15 | Minutes between room resets |
| `reset.cleanupDroppedItems` | boolean | true | Clean up non-player items during room reset |
| `game.theme` | string | fantasy | Game theme/genre for AI-generated content |

Use `config` in-game with no arguments to see the full list of 35+ settings.

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

## Discord Daemon

The Discord daemon manages the two-way message bridge between Discord and in-game channels.

### Location

`/mudlib/daemons/discord.ts`

### Purpose

- Connect to Discord via bot token
- Bridge messages between Discord channel and in-game "discord" channel
- Handle configuration and connection state
- Route incoming Discord messages to channel daemon

### API

```typescript
import { getDiscordDaemon } from '../daemons/discord.js';

const daemon = getDiscordDaemon();

// Configure the connection
await daemon.configure('guildId', 'channelId');

// Enable and connect
const result = await daemon.enable();
if (result.success) {
  console.log('Connected to Discord!');
}

// Send a message to Discord
await daemon.sendToDiscord('PlayerName', 'Hello Discord!');

// Check status
const status = daemon.getStatus();
console.log(status.connected);  // true/false
console.log(status.state);      // connection state

// Disable and disconnect
await daemon.disable();
```

### Message Flow

**In-Game to Discord:**
```
Player: "discord Hello!"
  → ChannelDaemon.send('discord', ...)
  → DiscordDaemon.sendToDiscord('PlayerName', 'Hello!')
  → efuns.discordSend(...)
  → Discord shows: **PlayerName**: Hello!
```

**Discord to In-Game:**
```
Discord user sends message
  → DiscordClient receives message
  → DiscordDaemon.receiveFromDiscord('Username', 'message')
  → ChannelDaemon.receiveDiscordMessage(...)
  → Players see: [Discord] Username: message
```

### Admin Commands

```
discordadmin status                           # Show status
discordadmin configure <guildId> <channelId>  # Configure IDs
discordadmin enable                           # Connect
discordadmin disable                          # Disconnect
discordadmin test                             # Send test message
```

See [Discord Integration](discord-integration.md) for complete documentation.

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

## Guild Daemon

The guild daemon manages the multi-guild system with skills, levels, XP, and passive modifiers.

### Location

`/mudlib/daemons/guild.ts`

### Responsibilities

- Guild membership and level tracking
- Skill definitions and advancement
- XP awards and level-up requirements
- Passive stat modifiers applied on login
- Guild-specific commands and abilities

See [Guilds](guilds.md) for full documentation.

## Combat Daemon

The combat daemon orchestrates all combat in the game.

### Location

`/mudlib/daemons/combat.ts`

### Responsibilities

- Combat round scheduling (1-5s dynamic intervals)
- Hit/dodge/parry/riposte/block resolution
- Threat calculation and target selection
- Death handling and corpse creation

See [Combat](combat.md) for full documentation.

## Quest Daemon

The quest daemon tracks quest definitions, player progress, and reward distribution.

### Location

`/mudlib/daemons/quest.ts`

### Responsibilities

- Quest definitions with kill/fetch/explore/deliver/talk/escort/custom objectives
- Player quest state tracking
- Reward distribution (XP, quest points, gold, items, guild XP)
- Quest panel updates via protocol messages

See [Quests](quests.md) for full documentation.

## Time Daemon

The time daemon manages the in-game day/night cycle with four phases: dawn, day, dusk, and night.

### Location

`/mudlib/daemons/time.ts`

### Responsibilities

- Game clock with configurable cycle duration (default 60 real minutes = 24 game hours)
- Phase transitions with light modifiers for outdoor rooms
- GAMETIME protocol messages to update client sky/clock panels

See [Sky and Time Display](sky-and-time-display.md) for full documentation.

## Portrait Daemon

The portrait daemon generates and caches AI-created images for NPCs, players, and items.

### Location

`/mudlib/daemons/portrait.ts`

### Responsibilities

- AI image generation via Gemini
- Three-tier caching (memory, disk, HTTP)
- Fallback SVG silhouettes
- Object image support for weapons, armor, containers, items

See [Portraits](portraits.md) for full documentation.

## Profession Daemon

The profession daemon tracks player crafting, gathering, and movement skill progression.

### Location

`/mudlib/daemons/profession.ts`

### Responsibilities

- Profession level and XP tracking
- Skill rank calculations
- Recipe availability based on skill level
- Tool and station requirements

See [Professions](professions.md) for full documentation.

## Gathering Daemon

The gathering daemon manages resource nodes and the gathering skill check system.

### Location

`/mudlib/daemons/gathering.ts`

### Responsibilities

- Resource node definitions and placement
- Gather attempt resolution (skill checks, yields)
- XP awards for successful gathering

See [Professions](professions.md) for related documentation.

## Tutorial Daemon

The tutorial daemon manages new player tutorial progression and special engage content.

### Location

`/mudlib/daemons/tutorial.ts`

### Responsibilities

- Tutorial step tracking per player
- Special engage content for tutorial NPCs
- Progression gating and completion tracking

## Bot Daemon

The bot daemon manages simulated player bots that populate the game world.

### Location

`/mudlib/daemons/bots.ts`

### Responsibilities

- Bot creation with AI-generated personalities
- Bot login/logout and lifecycle management
- Bot behavior (roaming, chatting, NPC interaction)
- Configurable maximum bot count

Managed via the `botadmin` admin command. See [Commands](commands.md#botadmin) for details.

## Area Daemon

The area daemon provides a draft area builder with grid layout and publish-to-files system.

### Location

`/mudlib/daemons/area.ts`

### Responsibilities

- Grid-based area layout editing
- Room, NPC, and item template generation
- Publishing draft areas to the file system

## Reset Daemon

The reset daemon periodically resets rooms to their initial state.

### Location

`/mudlib/daemons/reset.ts`

### Responsibilities

- Periodic room resets (default 15 minute interval)
- Respawning missing items and NPCs
- Reset scheduling and tracking

## Map Daemon

The map daemon generates map and minimap data for client display.

### Location

`/mudlib/daemons/map.ts`

### Responsibilities

- Map data generation for explored areas
- Minimap rendering data

See [Map Navigation](map-navigation.md) for related documentation.

## Loot Daemon

The loot daemon generates random loot drops for NPCs with quality tiers and enchantments.

### Location

`/mudlib/daemons/loot.ts`

### Responsibilities

- Random loot table resolution
- Quality tier assignment (common through legendary)
- Affix and enchantment generation

See [Random Loot](random-loot.md) for full documentation.

## Race Daemon

The race daemon manages race definitions and racial abilities.

### Location

`/mudlib/daemons/race.ts`

### Responsibilities

- Race stat bonuses and penalties
- Latent racial abilities applied on login
- Race data for character creation

See [Races](races.md) for full documentation.

## Party Daemon

The party daemon manages player grouping and auto-assist combat.

### Location

`/mudlib/daemons/party.ts`

### Responsibilities

- Party creation, invitation, and membership
- Auto-assist in combat
- XP sharing between party members

See [Party System](party-system.md) for full documentation.

## Pet Daemon

The pet daemon manages pet summoning, behavior, and persistence.

### Location

`/mudlib/daemons/pet.ts`

### Responsibilities

- Pet template definitions
- Pet summoning and dismissal
- Pet behavior and following

See [Pets](pets.md) for full documentation.

## Mercenary Daemon

The mercenary daemon manages hireable mercenary NPCs.

### Location

`/mudlib/daemons/mercenary.ts`

### Responsibilities

- Mercenary hiring and dismissal
- Mercenary combat AI
- Contract duration and cost

See [Mercenaries](mercenaries.md) for full documentation.

## Behavior Daemon

The behavior daemon manages NPC behavior scripts and combat AI.

### Location

`/mudlib/daemons/behavior.ts`

### Responsibilities

- Behavior script loading and execution
- Combat skill selection AI
- NPC behavior state management

## Aggro Daemon

The aggro daemon maintains NPC grudge and threat memory.

### Location

`/mudlib/daemons/aggro.ts`

### Responsibilities

- Persistent threat memory (24-hour expiry)
- NPC grudge tracking across sessions
- Threat-based aggression triggers

See [Aggro & Threat](aggro-threat.md) for full documentation.

## Announcement Daemon

The announcement daemon manages system-wide announcements displayed on the login screen.

### Location

`/mudlib/daemons/announcement.ts`

### Responsibilities

- Announcement creation and storage
- Latest announcement display on launcher
- Announcement history

## Snoop Daemon

The snoop daemon provides admin snooping capability to monitor player activity.

### Location

`/mudlib/daemons/snoop.ts`

### Responsibilities

- Admin can monitor another player's input/output
- Snoop session management

## Prompts Daemon

The prompts daemon manages AI prompt templates used by all AI content generation features.

### Location

`/mudlib/daemons/prompts.ts`

### Responsibilities

- Wraps the driver's PromptManager for mudlib access
- Template rendering with `{{variable}}` substitution and `{{#if}}` conditionals
- Override management (custom templates replace defaults)
- Reload overrides from disk

### API

```typescript
import { getPromptsDaemon } from '../daemons/prompts.js';

const prompts = getPromptsDaemon();

// Render a template with variables
const text = prompts.render('describe.system', { styleGuide: 'brief' });

// Get a template by ID
const template = prompts.get('ainpc.system');

// Get all registered prompt IDs
const ids = prompts.getIds();

// Check if a prompt has a custom override
const overridden = prompts.hasOverride('describe.system');

// Set a custom override
await prompts.set('describe.system', 'New template: {{styleGuide}}');

// Reset to default
await prompts.reset('describe.system');

// Reload overrides from disk
await prompts.reload();
```

All AI commands (`aidescribe`, `airoom`, `ainpc`, `ailore`, etc.) use `prompts.render()` instead of hardcoded prompt strings. The `{{gameTheme}}` variable is automatically injected from the `game.theme` config setting.

Managed via the `prompts` admin command. See [Commands](commands.md#prompts) for details.

## Soul Daemon

The soul daemon provides the emote and social action system.

### Location

`/mudlib/daemons/soul.ts`

### Responsibilities

- Emote definitions (targeted and untargeted)
- Social action resolution
- Emote listing and discovery

## Vehicle Daemon

The vehicle daemon manages the vehicle system for player transportation.

### Location

`/mudlib/daemons/vehicle.ts`

### Responsibilities

- Vehicle definitions and behavior
- Boarding and disembarking
- Vehicle movement and routes

See [Vehicles](vehicles.md) for full documentation.

## Intermud Daemon

The intermud daemon connects to the Intermud 3 network via TCP for cross-MUD communication.

### Location

`/mudlib/daemons/intermud.ts`

### Responsibilities

- I3 protocol implementation (TCP)
- Cross-MUD channel messaging
- MUD directory and who lists

See [Intermud](intermud.md) for full documentation.

## Intermud 2 Daemon

The intermud2 daemon implements the older Intermud 2 protocol via UDP.

### Location

`/mudlib/daemons/intermud2.ts`

### Responsibilities

- I2 protocol implementation (UDP)
- Legacy cross-MUD communication

## Grapevine Daemon

The grapevine daemon connects to the Grapevine cross-MUD network via WebSocket.

### Location

`/mudlib/daemons/grapevine.ts`

### Responsibilities

- Grapevine protocol implementation (WebSocket)
- Cross-MUD channel messaging
- Player presence sharing

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

Daemons use the data persistence efuns which route through the active persistence adapter (filesystem or Supabase):

```typescript
class PersistentDaemon {
  private data: Record<string, unknown> = {};
  private namespace = 'mydaemon';
  private key = 'state';

  async load(): Promise<void> {
    if (await efuns.dataExists(this.namespace, this.key)) {
      const content = await efuns.loadData(this.namespace, this.key);
      this.data = JSON.parse(content);
    }
  }

  async save(): Promise<void> {
    await efuns.saveData(this.namespace, this.key, JSON.stringify(this.data, null, 2));
  }
}
```

See [Persistence Adapter](persistence-adapter.md) for the full adapter pattern and namespace mapping.
