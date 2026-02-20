# Engage System

The engage system provides a WoW-style NPC dialogue overlay where players can interact with NPCs through a visual speech-bubble panel. It integrates with the quest, portrait, tutorial, and merchant systems.

## Overview

When a player uses the `engage <npc>` command, the client opens a dialogue panel showing:

- The NPC's AI-generated portrait
- A speech bubble with contextual greeting text
- Action buttons (Trade, quest accept/turn-in, tutorial actions)
- A quest log sidebar listing all quests associated with the NPC
- Detailed quest views with objectives and progress

## Player Command

```
engage <npc>
```

Aliases: none

The target must be an NPC in the current room. The command supports indexed targeting when multiple NPCs share a name (e.g., `engage guard 2`).

Source: `mudlib/cmds/player/_engage.ts`

## NPC Configuration

NPCs support four engage-specific properties, set via `setNPC()` or individual setters:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `engageGreeting` | `string \| null` | `null` | Custom greeting text shown in the speech bubble |
| `engageSound` | `string \| null` | `null` | Sound effect played when dialogue opens (falls back to `lookSound`) |
| `engageAlignment` | `EngageAlignment` | `{vertical: 'bottom', horizontal: 'right'}` | Panel positioning on screen |
| `engageKind` | `'humanoid' \| 'creature'` | auto-inferred | Affects portrait style and default greeting |

### Example NPC Configuration

```typescript
import { NPC } from '../std/npc.js';

export class Blacksmith extends NPC {
  constructor() {
    super();
    this.setNPC({
      name: 'grond',
      shortDesc: 'Grond the Blacksmith',
      longDesc: 'A burly dwarf with soot-covered arms and a warm smile.',
      level: 10,
      engageGreeting: 'Well met, traveler! Need something forged?',
      engageSound: 'anvil_ring',
      engageAlignment: { vertical: 'bottom', horizontal: 'left' },
      engageKind: 'humanoid',
    });
  }
}
```

### Alignment Options

The `engageAlignment` property controls where the dialogue panel appears:

- **Vertical**: `'top'`, `'middle'`, `'bottom'`
- **Horizontal**: `'left'`, `'center'`, `'right'`
- **Centered**: the string `'centered'` for fullscreen centering

The client auto-adjusts panel position based on screen quadrant to keep content visible.

## Default Greetings

When no custom `engageGreeting` is set, the system generates contextual greetings based on NPC state (`mudlib/lib/engage-defaults.ts`):

| Condition | Example Greetings |
|-----------|-------------------|
| Has quest turn-ins ready | Context-aware turn-in prompts |
| Has quests to offer | Context-aware quest offer prompts |
| Hostile creature | *growls menacingly*, *snarls*, *bares teeth* |
| Neutral creature | *regards you warily*, *sniffs the air* |
| Hostile humanoid | "What do you want?", "State your business." |
| Default friendly | "Greetings, traveler.", "Well met." |

## Client Panel

The engage panel (`src/client/engage-panel.ts`) displays:

### Portrait Area
- Shows AI-generated portrait or fallback SVG silhouette
- Supports data URIs, HTTP URLs (`/api/images/portrait/<hash>`), and avatar IDs
- Portrait size capped at 2,400,000 characters (`MAX_ENGAGE_PORTRAIT_CHARS`)

### Speech Bubble
- Renders the greeting text with color code support
- Styled as a speech bubble with a directional tail indicator

### Action Buttons
Action buttons appear based on NPC capabilities:

| Button | Condition | Command Sent |
|--------|-----------|-------------|
| Trade | NPC has `openShop` method | `shop <npc>` |
| Accept (per quest) | Quest available to accept | `quest accept <name>` |
| Turn In (per quest) | Quest ready to turn in | `quest turnin <name>` |

### Quest Log Sidebar
Lists all quests associated with the NPC with status indicators:

| Status | Tone | Meaning |
|--------|------|---------|
| Available | positive | Can be accepted |
| In progress | neutral | Currently active |
| Ready to turn in | positive | All objectives complete |
| Completed | neutral | Already finished |
| Unavailable | negative | Prerequisites not met (shows reason) |

### Quest Detail View
Clicking a quest in the log shows:
- Quest name and description
- Story text (if any)
- Objective list with progress (`current/required`)
- Accept or Turn In action button (when applicable)
- Reward preview (XP, Gold, Quest Points, Items, Guild XP)

### Loading Overlay
While portraits are being fetched, a loading overlay displays with rotating humorous messages updated every 2 seconds.

### Keyboard
- **Escape** closes the engage panel

## Protocol Message

The engage system uses the `\x00[ENGAGE]` protocol prefix with three message subtypes:

### `open`

Opens the dialogue panel with full NPC data.

```typescript
{
  type: 'open',
  npcName: string,
  npcPath: string,
  portrait: string,          // data URI or avatar ID
  portraitUrl?: string,      // HTTP URL for lazy loading
  alignment?: EngageAlignment,
  text?: string,             // greeting text (with color codes rendered)
  actions: EngageOption[],
  questLog: EngageOption[],
  questDetails: EngageQuestDetails[],
  questOffers: EngageOption[],
  questTurnIns: EngageOption[],
}
```

### `close`

Closes the dialogue panel.

```typescript
{
  type: 'close'
}
```

### `loading`

Shows or hides the loading overlay.

```typescript
{
  type: 'loading',
  active: boolean,
  message?: string,
  progress?: number,
}
```

### EngageOption Shape

```typescript
{
  id: string,
  label: string,
  command: string,       // command sent when clicked
  rewardText?: string,   // shown as secondary text
  tone?: 'positive' | 'negative' | 'neutral',
}
```

## Integration Points

### Quest System
The engage command queries the quest daemon to populate quest offers, turn-ins, and the quest log. It uses `npc.getAvailableQuests()`, `npc.getCompletedQuests()`, and `questDaemon.canAcceptQuest()`.

### Portrait System
Portraits are fetched via the portrait daemon. The command tries `getPortrait()` first for inline data, then `getPortraitUrl()` for HTTP-served images. See [Portraits](portraits.md).

### Merchant System
If an NPC implements `openShop`, a Trade button is added to the actions list.

### Tutorial System
In the tutorial area, the General Ironheart NPC gets special tutorial content injected via `getTutorialDaemon().getEngageContentForGeneral()`.

### Sound System
The intro sound plays via `efuns.playSound()` using the `discussion` category. Falls back from `engageSound` to `lookSound`.

## Builder Guide

To make an NPC engageable:

1. The NPC must extend `NPC` (it works by default - all NPCs can be engaged)
2. Optionally configure engage properties for a better experience:
   - Set `engageGreeting` for a custom welcome message
   - Set `engageSound` for an intro sound effect
   - Set `engageKind` to `'creature'` for non-humanoid NPCs (affects portrait and greetings)
3. Add quests via `setQuestsOffered()` and `setQuestsTurnedIn()` for quest interaction
4. Add a `shopName` and `openShop()` for trade functionality

## Key Source Files

- `mudlib/cmds/player/_engage.ts` - Command implementation
- `src/client/engage-panel.ts` - Client UI panel
- `mudlib/lib/engage-defaults.ts` - Default greeting logic
- `mudlib/std/npc.ts` - NPC engage properties
- `src/shared/protocol-types.ts` - `EngageMessage` type definitions

## Related Docs

- [Portraits](portraits.md) - AI-generated portrait system
- [NPC Creation Guide](npcs.md) - NPC configuration
- [Quests](quests.md) - Quest system
- [Merchants](merchants.md) - Shop system
- [Sound System](sound-system.md) - Audio playback
- [Protocol Messages](client-gui-protocol-messages.md) - Full protocol reference
