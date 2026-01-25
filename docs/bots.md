# Bot System - Simulated Players

The bot system creates AI-powered simulated players that behave like real players. Bots log in and out naturally, move through the world, chat on channels, and respond when mentioned. They are indistinguishable from real players in the `who` list and room descriptions.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Admin Commands](#admin-commands)
- [Configuration](#configuration)
- [Bot Behavior](#bot-behavior)
- [AI Integration](#ai-integration)
- [Persistence](#persistence)
- [Technical Reference](#technical-reference)

---

## Overview

Bots are simulated players with AI-generated personalities. Key features:

- **Indistinguishable from players** - Appear in `who` list, room descriptions, and channels like real players
- **AI-generated personalities** - Unique names, races, guilds, descriptions, and chat styles
- **AI-generated portraits** - Each bot has a unique portrait visible when examined
- **Natural behavior** - Login/logout at varying times, move through the world, pause at interesting locations
- **Channel participation** - Send occasional messages and respond when mentioned
- **Persistent** - Bot personalities and portraits are saved to disk and survive server restarts

---

## Architecture

### Files

| File | Description |
|------|-------------|
| `mudlib/std/bot.ts` | Bot class extending Player with bot-specific behavior |
| `mudlib/daemons/bots.ts` | Bot daemon managing lifecycle, scheduling, and persistence |
| `mudlib/cmds/admin/_botadmin.ts` | Admin command for bot management |
| `mudlib/data/bots/*.json` | Persisted bot personality files |

### Class Hierarchy

```
MudObject
  └── Living
        └── Player
              └── Bot
```

The `Bot` class extends `Player` and inherits all player functionality (stats, inventory, movement, etc.) while adding bot-specific behavior (automated actions, AI responses).

### Daemon Pattern

The `BotDaemon` follows the singleton daemon pattern used throughout the mudlib:

```typescript
import { getBotDaemon } from '../daemons/bots.js';

const daemon = getBotDaemon();
await daemon.enable();
```

---

## Admin Commands

All bot management is done through the `botadmin` command (requires admin permission level).

### Status

```
botadmin status
```

Shows system status including:
- Enabled/disabled state
- Online bot count vs maximum
- Total registered bots
- Configuration settings

### Enable/Disable

```
botadmin enable    # Start the bot system
botadmin disable   # Stop and log out all bots
```

When enabled, bots begin logging in over a staggered period (5-15 minutes) to appear natural. The enabled state persists across server restarts.

### List Bots

```
botadmin list
```

Shows all registered bots with:
- Online/offline status
- Name, level, race, guild
- Current location (if online)

### Create Bot

```
botadmin create
```

Creates a new bot with:
1. AI-generated personality (name, race, guild, stats, description, interests)
2. AI-generated portrait
3. Saved to `mudlib/data/bots/`

If AI is unavailable, uses fallback random generation.

### Delete Bot

```
botadmin delete <botId or name>
```

Permanently removes a bot:
- Logs out if online
- Removes from memory
- Deletes personality file from disk

### Force Login/Logout

```
botadmin login <botId or name>   # Force immediate login
botadmin logout <botId or name>  # Force immediate logout
```

Useful for testing or manual control.

### Bot Info

```
botadmin info <botId or name>
```

Shows detailed information:
- ID, name, online status, location
- Race, guild, level, stats
- Personality type, demeanor, chat style
- Interests
- Physical description
- Creation timestamp

### Regenerate Personality

```
botadmin regenerate <botId or name>
```

Creates a completely new identity for a bot:
- Logs out if online
- Generates new personality and portrait
- Assigns new ID

---

## Configuration

Bot settings are managed through the config daemon and persist to `mudlib/data/config/settings.json`.

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `bots.enabled` | `false` | Whether the bot system is active |
| `bots.maxBots` | `5` | Maximum concurrent online bots |
| `bots.minOnlineMinutes` | `15` | Minimum session duration |
| `bots.maxOnlineMinutes` | `120` | Maximum session duration |
| `bots.minOfflineMinutes` | `30` | Minimum offline time between sessions |
| `bots.maxOfflineMinutes` | `240` | Maximum offline time between sessions |
| `bots.chatFrequencyMinutes` | `10` | Average time between unprompted chat messages |

### Configuring via Command

```
botadmin configure <maxBots>
```

For other settings, use the config command:
```
config set bots.minOnlineMinutes 30
config set bots.chatFrequencyMinutes 5
```

---

## Bot Behavior

### Login/Logout Schedule

1. **Initial login**: When enabled, bots stagger logins over 5-15 minutes
2. **Session duration**: Each bot stays online for a random duration between `minOnlineMinutes` and `maxOnlineMinutes`
3. **Offline period**: After logout, bot schedules next login after a random period between `minOfflineMinutes` and `maxOfflineMinutes`
4. **Natural variation**: All timings include randomization for realistic appearance

### Movement Behavior

Bots operate on a state machine with actions every 10-60 seconds:

| State | Probability | Behavior |
|-------|-------------|----------|
| Idle | 50% | Stay in current room, occasionally look around |
| Moving | 35% | Move to a random adjacent room via exits |
| Exploring | 15% | Move through 2-4 rooms in succession |

Bots:
- Only use visible exits (no teleporting)
- Announce arrivals and departures naturally
- Prefer interesting locations (town center, tavern, guild halls)

### Channel Chat

Bots participate in public channels (`ooc`, `newbie`):

**Unprompted messages**: Every ~10 minutes (configurable), bots may send a contextual message based on their personality and interests.

**Responding to mentions**: When a bot's name is mentioned on a public channel:

1. Bot detects the mention
2. Waits 1-4 seconds (natural delay)
3. Analyzes message complexity
4. Generates response (AI or canned)
5. Sends response on same channel

### Message Complexity Detection

Messages are classified as "simple" or "complex":

**Simple messages** (use canned responses):
- Pure greetings: "hi", "hello", "hey"
- Basic questions: "how are you", "what's up"
- Thanks/farewells: "thanks", "bye", "later"
- Very short messages (≤3 words after removing bot name)

**Complex messages** (use AI):
- Questions about game mechanics
- Requests for opinions
- Multi-part questions
- Anything longer than 3 words

---

## AI Integration

The bot system uses Claude AI for several features:

### Personality Generation

When creating a bot with `botadmin create`:

```typescript
const prompt = `Generate a fantasy MUD character personality as JSON. Include:
- name: A fantasy-appropriate first name only
- race: One of "human", "elf", "dwarf", "halfling", "orc"
- guild: One of "fighter", "mage", "cleric", "rogue", "ranger"
- level: A number between 5 and 25
- stats: An object with str, dex, con, int, wis, cha
- longDesc: A 2-3 sentence physical description
- personality: A brief description of their demeanor
- playerType: One of "explorer", "socializer", "achiever", "casual"
- chatStyle: How they write messages
- interests: An array of 3-5 topics they discuss`;
```

### Portrait Generation

Uses Gemini AI (if configured) to generate character portraits:

```typescript
const prompt = `Create a portrait for a fantasy RPG character.

CHARACTER DESCRIPTION:
${personality.longDesc}

Race: ${personality.race}
Class/Guild: ${personality.guild}
Demeanor: ${personality.personality}

Style: Fantasy portrait, 64x64 icon style...`;
```

### Chat Response Generation

For complex mentions:

```typescript
const prompt = `You are roleplaying as ${name}, a ${race} ${guild}.

Your personality: ${personality}
Your chat style: ${chatStyle}
Your interests: ${interests}

Someone named ${sender} mentioned you with: "${message}"

Generate a short, in-character response (10-30 words max).`;
```

### Fallback Behavior

If AI is unavailable:
- **Personalities**: Generated from predefined name/trait pools
- **Portraits**: Uses fallback silhouette SVG
- **Chat responses**: Uses canned response library

---

## Persistence

### Bot Personality Files

Stored in `mudlib/data/bots/<botId>.json`:

```json
{
  "id": "bot_m1abc2def",
  "name": "Theron",
  "race": "elf",
  "guild": "mage",
  "level": 12,
  "stats": {
    "str": 10,
    "dex": 14,
    "con": 11,
    "int": 16,
    "wis": 13,
    "cha": 12
  },
  "longDesc": "A slender elf with silver-streaked auburn hair...",
  "personality": "Curious and bookish, often lost in thought.",
  "playerType": "explorer",
  "chatStyle": "Uses formal language with occasional archaic terms.",
  "interests": ["ancient history", "spell components", "rare books"],
  "profilePortrait": "data:image/png;base64,...",
  "createdAt": 1706123456789
}
```

### Server Restart Behavior

1. On startup, driver checks `bots.enabled` in settings
2. If enabled, loads bot daemon
3. Daemon loads all personalities from `data/bots/`
4. Schedules logins for registered bots
5. Bots begin logging in over staggered period

---

## Technical Reference

### BotPersonality Interface

```typescript
interface BotPersonality {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  race: string;                  // human, elf, dwarf, halfling, orc
  guild: string;                 // fighter, mage, cleric, rogue, ranger
  level: number;                 // 5-25
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  longDesc: string;              // Physical description
  personality: string;           // Demeanor and quirks
  playerType: 'explorer' | 'socializer' | 'achiever' | 'casual';
  chatStyle: string;             // How they write messages
  interests: string[];           // Topics they discuss
  createdAt: number;             // Unix timestamp
  profilePortrait?: string;      // AI-generated portrait data URI
}
```

### Bot Class Methods

```typescript
class Bot extends Player {
  // Properties
  get isBot(): boolean;
  get personality(): BotPersonality | null;

  // Initialization
  initializeWithPersonality(personality: BotPersonality): void;

  // Lifecycle
  async onBotLogin(sessionDurationMinutes: number): Promise<void>;
  async onBotLogout(): Promise<void>;
  async forceLogout(): Promise<void>;

  // Mention handling
  async handleMention(senderName: string, channelName: string, message: string): Promise<void>;
}
```

### BotDaemon Methods

```typescript
class BotDaemon extends MudObject {
  // System control
  async initialize(): Promise<void>;
  async enable(): Promise<{ success: boolean; error?: string }>;
  async disable(): Promise<void>;

  // Bot management
  async createBot(): Promise<{ success: boolean; bot?: BotPersonality; error?: string }>;
  async deleteBot(botId: string): Promise<{ success: boolean; error?: string }>;
  async loginBot(botId: string): Promise<{ success: boolean; error?: string }>;
  async logoutBot(botId: string): Promise<{ success: boolean; error?: string }>;
  async regeneratePersonality(botId: string): Promise<{ success: boolean; bot?: BotPersonality; error?: string }>;

  // Configuration
  async configure(settings: BotConfigSettings): Promise<{ success: boolean; error?: string }>;

  // Status
  getStatus(): BotSystemStatus;
  listBots(): BotStatus[];
  getBotInfo(botId: string): BotPersonality | null;
  getActiveBots(): Bot[];

  // Persistence
  async loadPersonalities(): Promise<void>;
}
```

### Integration Points

**Driver (`src/driver/driver.ts`)**:
- `checkBotsPersistedConfig()` - Auto-starts bots on server boot if previously enabled
- `getAllPlayers()` - Includes active bots in player list for `who` command

**Channel Daemon (`mudlib/daemons/channels.ts`)**:
- `checkBotMentions()` - Detects bot mentions after public channel messages

**Portrait Daemon (`mudlib/daemons/portrait.ts`)**:
- Returns bot's `profilePortrait` property when examining bots

---

## Examples

### Creating and Managing Bots

```
> botadmin create
Creating new bot...
Bot created successfully!
  Name:        Theron
  Race:        elf
  Guild:       mage
  Level:       12
  Type:        explorer
  ID:          bot_m1abc2def

> botadmin enable
Enabling bot system...
Bot system enabled!
Bots will begin logging in over the next few minutes.

> botadmin list
Bot List
----------------------------------------------------------------------
  Status   Name            Level   Race        Guild     Location
----------------------------------------------------------------------
  Online   Theron          12      elf         mage      Town Square
  Offline  Brynn           8       human       fighter   -
----------------------------------------------------------------------

> botadmin info Theron
Bot Information
==================================================
  ID:            bot_m1abc2def
  Name:          Theron
  Status:        Online
  Location:      Town Square

Character:
  Race:          elf
  Guild:         mage
  Level:         12
  Stats:         STR 10, DEX 14, CON 11
                 INT 16, WIS 13, CHA 12

Personality:
  Type:          explorer
  Demeanor:      Curious and bookish, often lost in thought.
  Chat Style:    Uses formal language with occasional archaic terms.
  Interests:     ancient history, spell components, rare books
==================================================
```

### Channel Interaction

```
[OOC] Player: Hey Theron, how are you?
[OOC] Theron: Doing well, thanks for asking!

[OOC] Player: Theron, what do you think about the new spell system?
[OOC] Theron: I find the new incantation mechanics quite fascinating,
              though I do miss the simplicity of the old ways.
```

---

## Troubleshooting

### Bots not appearing in who list

- Verify bots are enabled: `botadmin status`
- Check if bots are online: `botadmin list`
- Ensure `getAllPlayers()` in driver includes bots (check for registry lookup of `/daemons/bots`)

### AI responses not working

Check server logs for:
- `[Bot Name] Simple message detected` - Message classified as simple
- `[Bot Name] AI not available` - Claude not configured
- `[Bot Name] AI returned empty/invalid result` - API error

Verify Claude is configured:
- `CLAUDE_API_KEY` environment variable set
- Check `aiAvailable()` returns true

### Bots not persisting across restarts

- Verify `bots.enabled` is `true` in `mudlib/data/config/settings.json`
- Check bot files exist in `mudlib/data/bots/`
- Look for errors in driver startup logs

### Portrait not showing

- Check `profilePortrait` exists in bot's personality file
- Verify Gemini AI is configured for image generation
- Portrait daemon should return `profilePortrait` property for bots
