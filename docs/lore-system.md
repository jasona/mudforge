# World Lore System Guide

The Lore System provides a central registry for world lore, history, and background information. This data is automatically injected into AI prompts to ensure consistent NPC dialogue and content generation.

## Overview

```
mudlib/
├── daemons/
│   └── lore.ts              # Lore daemon (singleton)
├── data/
│   └── lore/
│       └── entries.json     # Persisted lore entries
└── cmds/builder/
    ├── _lore.ts             # Lore management command
    └── _ailore.ts           # AI lore generation command
```

## Quick Start

### Adding Lore In-Game

```
lore add faction "The Shadow Hand"
```

This opens the IDE with a JSON template:

```json
{
  "id": "faction:the-shadow-hand",
  "category": "faction",
  "title": "The Shadow Hand",
  "content": "Enter your lore content here...",
  "tags": [],
  "relatedLore": [],
  "priority": 5
}
```

Edit the content, save (Ctrl+S), and close the IDE.

### AI-Generating Lore

Generate a single entry:
```
lore generate faction "The Shadow Hand" "thieves, underground, criminal"
```

### Bootstrapping a World with AI

Generate foundational lore for an entire game world at once:
```
ailore bootstrap "Shadowvale" "a dark gothic world of vampires and hunters"
```

This creates one lore entry per category (8 total). You can then expand specific categories:
```
ailore expand faction "warring clans and secret societies"
```

Or weave everything into a narrative:
```
ailore fullstory
```

See [AI Integration Guide](ai-integration.md#ailore) for full `ailore` documentation.

### Using Lore in NPCs

```typescript
this.setAIContext({
  knowledgeScope: {
    worldLore: ['faction:the-shadow-hand'],
  },
});
```

---

## Lore Categories

| Category | ID Prefix | Purpose | Examples |
|----------|-----------|---------|----------|
| `world` | `world:` | Cosmology, creation, general facts | Creation myth, world geography |
| `region` | `region:` | Geographic areas, kingdoms | Valdoria, the Northern Wastes |
| `faction` | `faction:` | Organizations, guilds | Thieves' Guild, Mage Academy |
| `history` | `history:` | Historical eras, timelines | The First Age, Era of Dragons |
| `character` | `character:` | Notable NPCs | King Aldric, the Archmage |
| `event` | `event:` | Significant happenings | The Sundering, the Great War |
| `item` | `item:` | Artifacts, item types | Sword of Kings, dragonbone |
| `creature` | `creature:` | Monsters, beasts | Dire wolves, forest spirits |
| `location` | `location:` | Specific places | Sunspire Castle, the Dark Tower |
| `economics` | `economics:` | Trade, currency | Trade routes, merchant guilds |
| `mechanics` | `mechanics:` | World rules | The Weave (magic system) |
| `faith` | `faith:` | Religion, gods | Solarius, Moon Goddess |

---

## Lore Entry Structure

```typescript
interface LoreEntry {
  id: string;           // Format: "category:slug"
  category: LoreCategory;
  title: string;        // Display title
  content: string;      // AI-ready lore text (main content)
  tags?: string[];      // For filtering and search
  relatedLore?: string[]; // Links to related entries
  priority?: number;    // 1-10, higher = included first (default: 5)
}
```

### ID Format

IDs follow the pattern `category:slug`:

```
world:creation-myth
faction:thieves-guild
faith:sun-god
region:valdoria
event:the-sundering
```

Use lowercase with hyphens for the slug portion.

### Content Guidelines

Write content that AI can naturally incorporate:

**Good:**
```
The Shadow Hand is the largest thieves' guild operating in the realm.
They control the black market, run protection rackets, and maintain
a network of informants throughout the major cities. Their leader,
known only as 'The Finger,' has never been seen by outsiders.
Members identify each other through a subtle hand gesture.
```

**Avoid:**
```
- The Shadow Hand: A thieves' guild
- Controls black market
- Has informants
```

Write in full sentences that read naturally when included in AI prompts.

### Priority System

Priority determines inclusion order when truncating for token limits:

| Priority | Use For |
|----------|---------|
| 8-10 | Core world facts every NPC should know |
| 5-7 | Important regional/faction information |
| 3-4 | Detailed background, minor lore |
| 1-2 | Obscure trivia, optional details |

---

## Builder Commands

### lore list

List all lore entries:

```
lore list                    # All entries
lore list faction            # Filter by category
lore list world              # Only world lore
```

Output shows ID, category, title, tags, and priority.

### lore show

View a specific entry:

```
lore show faith:sun-god
```

Displays full entry with all fields.

### lore add

Add a new entry (opens IDE):

```
lore add <category> <title>
lore add faith "Moon Goddess"
lore add faction "Merchant's Guild"
```

The IDE opens with a pre-filled template. Edit and save.

### lore edit

Edit an existing entry (opens IDE):

```
lore edit <id>
lore edit faith:sun-god
```

### lore remove

Remove an entry:

```
lore remove <id>
lore remove old:unused-entry
```

### lore generate

AI-generate a lore entry:

```
lore generate <category> <title> [theme/keywords]
lore generate event "The Great Fire" "destruction, city, tragedy"
lore generate creature "Forest Spirits" "magical, nature, fey"
```

Review the generated content and edit if needed.

### lore search

Search lore content:

```
lore search dragon           # Search for "dragon"
lore search "ancient magic"  # Search phrase
```

Searches title, content, and tags.

### lore tags

List all unique tags:

```
lore tags
```

Useful for understanding the tagging system in use.

### lore clear

Remove all lore entries:

```
lore clear
```

Prompts for confirmation before deleting. Useful when starting over with `ailore bootstrap`.

---

## Using Lore in Code

### Accessing the Daemon

```typescript
import { getLoreDaemon } from '../daemons/lore.js';

const loreDaemon = getLoreDaemon();
```

### Retrieving Entries

```typescript
// Single entry
const entry = loreDaemon.getLore('faction:thieves-guild');

// By category
const factions = loreDaemon.getLoreByCategory('faction');

// By tags
const magicLore = loreDaemon.getLoreByTags(['magic', 'spellcasting']);

// All entries
const allLore = loreDaemon.getAllLore();

// Search
const results = loreDaemon.search('dragon');
```

### Building AI Context

```typescript
// Build context string from multiple entries
const context = loreDaemon.buildContext(
  ['world:creation-myth', 'faction:thieves-guild', 'region:valdoria'],
  2000  // max characters
);
```

The `buildContext()` method:
1. Fetches each entry by ID
2. Sorts by priority (highest first)
3. Concatenates content with headers
4. Truncates to max length if needed
5. Skips missing entries gracefully

### In AI-Enabled NPCs

```typescript
this.setAIContext({
  name: 'Bartender',
  personality: 'Friendly and gossipy.',
  knowledgeScope: {
    topics: ['local gossip', 'drinks'],
    worldLore: [
      'region:valdoria',        // Regional knowledge
      'faction:thieves-guild',  // Criminal underworld
      'economics:trade-routes', // Commerce
    ],
  },
});
```

The `efuns.aiNpcResponse()` function automatically:
1. Extracts `worldLore` IDs from the NPC context
2. Calls `loreDaemon.buildContext()` with those IDs
3. Includes the result in the AI system prompt

---

## Data Storage

Lore is persisted to `/mudlib/data/lore/entries.json`:

```json
{
  "entries": [
    {
      "id": "world:creation-myth",
      "category": "world",
      "title": "The Creation Myth",
      "content": "In the beginning...",
      "tags": ["mythology", "gods", "origin"],
      "priority": 10,
      "relatedLore": []
    },
    {
      "id": "faction:thieves-guild",
      "category": "faction",
      "title": "The Shadow Hand",
      "content": "The Shadow Hand is...",
      "tags": ["criminal", "underground"],
      "priority": 5,
      "relatedLore": ["region:valdoria"]
    }
  ]
}
```

The daemon loads this file on startup and saves after modifications.

---

## Best Practices

### 1. Write AI-Friendly Content

Content should read naturally when included in prompts:

```
// Good
"Valdoria is a prosperous human kingdom known for its fertile farmlands
and strong military tradition. The capital city of Aldric sits at the
confluence of two rivers."

// Avoid bullet points or abbreviated notes
"- Human kingdom
- Fertile farmlands
- Military tradition"
```

### 2. Use Tags Consistently

Establish a tagging convention:

```
// Location-based
tags: ["valdoria", "aldric"]

// Theme-based
tags: ["magic", "ancient", "dangerous"]

// Creature types
tags: ["undead", "beast", "fey"]
```

### 3. Link Related Entries

Use `relatedLore` to create connections:

```json
{
  "id": "event:the-sundering",
  "relatedLore": [
    "character:archmage-velor",
    "location:blasted-lands",
    "mechanics:magic-system"
  ]
}
```

### 4. Set Appropriate Priorities

Higher priority = more likely to be included when truncating:

```typescript
// Core facts: priority 8-10
{ id: "world:creation-myth", priority: 10 }
{ id: "mechanics:magic-system", priority: 8 }

// Important background: priority 5-7
{ id: "region:valdoria", priority: 6 }
{ id: "faction:thieves-guild", priority: 5 }

// Minor details: priority 1-4
{ id: "item:common-herbs", priority: 2 }
```

### 5. Keep Entries Focused

One concept per entry:

```
// Good: Separate entries
world:creation-myth    - The origin story
world:cosmology        - The planes and their nature
world:calendar         - Months, seasons, holidays

// Avoid: One massive entry
world:everything       - 5000 words covering all world facts
```

### 6. Update Lore When World Changes

If game events change the world, update lore:

```
// After a major quest line
lore edit event:dragon-war
// Add: "The dragon war ended when heroes slew Scorrath..."
```

---

## Example: Building a Region's Lore

### Step 1: Core Region Entry

```
lore add region "The Northern Wastes"
```

```json
{
  "id": "region:northern-wastes",
  "category": "region",
  "title": "The Northern Wastes",
  "content": "The Northern Wastes are a frozen tundra stretching beyond the mountain passes. Few permanent settlements exist here, though hardy nomadic tribes and frost giants call it home. The auroras that dance across the night sky are said to be the spirits of ancient warriors.",
  "tags": ["cold", "wilderness", "dangerous", "giants"],
  "priority": 6
}
```

### Step 2: Related Faction

```
lore add faction "Frost Nomads"
```

```json
{
  "id": "faction:frost-nomads",
  "category": "faction",
  "title": "The Frost Nomads",
  "content": "The Frost Nomads are hardy tribes who survive in the Northern Wastes by following caribou herds and trading furs. They worship the aurora spirits and distrust outsiders, though they will trade with those who prove themselves worthy.",
  "tags": ["northern-wastes", "tribal", "trade"],
  "relatedLore": ["region:northern-wastes"],
  "priority": 4
}
```

### Step 3: Notable Creature

```
lore add creature "Frost Giants"
```

```json
{
  "id": "creature:frost-giants",
  "category": "creature",
  "title": "Frost Giants",
  "content": "Frost giants tower over humans at fifteen feet tall, with blue-tinged skin and icy beards. They dwell in ice fortresses in the deepest parts of the Northern Wastes. While territorial and dangerous, they have been known to respect strength and occasionally trade with the nomads.",
  "tags": ["giant", "northern-wastes", "dangerous"],
  "relatedLore": ["region:northern-wastes", "faction:frost-nomads"],
  "priority": 3
}
```

### Step 4: Use in NPCs

A nomad trader NPC:

```typescript
this.setAIContext({
  name: 'Yuri the Nomad',
  personality: 'Stoic and practical, respects strength.',
  knowledgeScope: {
    topics: ['trading', 'survival', 'the wastes'],
    worldLore: [
      'region:northern-wastes',
      'faction:frost-nomads',
      'creature:frost-giants',
    ],
  },
});
```

---

## Troubleshooting

### Entry Not Appearing in NPC Responses

1. Verify the ID exists: `lore show <id>`
2. Check the ID in NPC's `worldLore` array matches exactly
3. Ensure priority is high enough (if other lore is being included)

### IDE Not Opening for Edit

1. Ensure you're using the web client (IDE requires browser)
2. Check for JavaScript errors in browser console
3. Try `lore show <id>` first to verify entry exists

### Search Not Finding Content

1. Search is case-insensitive but must match partial words
2. Try simpler search terms
3. Check if entry exists: `lore list`

---

## Related Documentation

- [AI Integration Guide](ai-integration.md) - Complete AI system guide
- [Daemons > Lore Daemon](daemons.md#lore-daemon) - Daemon API reference
- [Commands > lore](commands.md#lore) - Command reference
- [Efuns > AI Integration](efuns.md#ai-integration) - AI efuns
