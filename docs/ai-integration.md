# AI Integration Guide

MudForge integrates with the Claude AI API to provide AI-powered content generation and dynamic NPC dialogue. This guide covers setup, usage, and best practices.

## Overview

The AI integration provides:

- **Content Generation**: Generate room descriptions, item descriptions, and NPC definitions
- **AI Worldbuilding**: Bootstrap entire game worlds with interconnected lore entries
- **Dynamic NPC Dialogue**: NPCs can engage in contextual conversations with players
- **Prompt Template System**: Customizable prompt templates for all AI features
- **Configurable Game Theme**: Set `game.theme` to rebrand all AI content at once
- **World Lore System**: Central lore registry for consistent AI context
- **Graceful Fallback**: Static responses when AI is unavailable

## Setup

### Environment Configuration

Add your Claude API key to `.env`:

```env
CLAUDE_API_KEY=sk-ant-api03-...
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TOKENS=1024
CLAUDE_RATE_LIMIT=20
```

### Verify Installation

In-game, test that AI is available:

```
eval efuns.aiAvailable()
```

This should return `true` if configured correctly.

---

## Builder Commands

### aidescribe

Generate descriptions for game objects:

```
aidescribe <type> <name> [theme/keywords]
```

**Types:** `room`, `item`, `npc`, `weapon`, `armor`

**Examples:**
```
aidescribe room "Dusty Library" "abandoned, scholarly"
aidescribe npc "Old Blacksmith" "gruff, experienced, former soldier"
aidescribe weapon "Elven Bow" "elegant, ancient, magical"
```

**Output:** Short description, long description, and copyable code snippet.

### airoom

Generate complete room definitions:

```
airoom <theme> [exits]
```

**Examples:**
```
airoom "abandoned mine" "north,south,down"
airoom "cozy tavern" "north,east,west"
airoom "forest clearing"
```

**Output:**
- Short and long descriptions
- Terrain type
- Suggested items to add
- Suggested NPCs
- Ambiance message
- Complete TypeScript code snippet

### ainpc

Generate complete NPC definitions with AI context:

```
ainpc <name> <role> [personality]
```

**Examples:**
```
ainpc "Old Fisherman" "quest giver" "grumpy, knows about sea monsters"
ainpc "Town Guard" "guard" "vigilant, by-the-book"
ainpc "Mysterious Stranger" "information broker"
```

**Output:**
- Short and long descriptions
- Personality and background
- Speaking style configuration
- Chat messages (idle behavior)
- Static response triggers
- Knowledge topics and forbidden subjects
- Local knowledge facts
- World lore IDs (from lore daemon)
- Complete TypeScript code snippet with AI context

### ailore

Generate interconnected world lore using AI:

```
ailore <bootstrap|expand|fullstory> [args...]
```

**Subcommands:**

- **bootstrap** `<name> [description]` - Generate foundational lore (one entry per category, 8 total):
  ```
  ailore bootstrap "Shadowvale" "a dark gothic world of vampires and hunters"
  ```

- **expand** `<category> [theme]` - Generate 2-4 entries in a category:
  ```
  ailore expand faction "warring clans and secret societies"
  ```

- **fullstory** - Weave all lore into a cohesive long-form narrative:
  ```
  ailore fullstory
  ```

The `bootstrap` subcommand generates entries sequentially with progress streaming, making it ideal for bootstrapping a new game world from scratch. All generated lore respects the current `game.theme` setting.

See [Lore System Guide](lore-system.md) for details on managing lore entries.

---

## Prompt Template System

All AI features use customizable prompt templates managed by the Prompts Daemon. Templates use `{{variable}}` syntax for substitution and `{{#if variable}}...{{/if}}` for conditional sections.

### Game Theme

The `game.theme` config setting (default: `"fantasy"`) is automatically injected as `{{gameTheme}}` into all 22+ prompt templates. Changing the theme rebrands all AI-generated content at once:

```
config game.theme cyberpunk
```

Now all `aidescribe`, `airoom`, `ainpc`, and `ailore` commands generate content in a cyberpunk style.

### Customizing Templates

Administrators can view and edit templates with the `prompts` command:

```
prompts                    # List all prompt IDs
prompts describe.system    # View a specific template
prompts edit describe.system  # Edit in IDE
prompts reset describe.system # Restore default
```

Templates are stored in the driver's PromptManager and accessed via the prompts daemon:

```typescript
import { getPromptsDaemon } from '../daemons/prompts.js';

const prompts = getPromptsDaemon();
const rendered = prompts.render('describe.system', { styleGuide: 'brief' });
```

See [Daemons > Prompts Daemon](daemons.md#prompts-daemon) for the full API.

---

## Creating AI-Enabled NPCs

### Basic Structure

```typescript
import { NPC } from '../../../lib/std.js';

export class Bartender extends NPC {
  constructor() {
    super();

    // Standard NPC setup
    this.setNPC({
      name: 'Mira',
      shortDesc: 'a cheerful bartender',
      longDesc: 'Mira wipes down the bar with practiced efficiency...',
      gender: 'female',
    });

    // Fallback chat messages (when AI unavailable)
    this.addChat('polishes a glass absently.', 'emote');
    this.addChat('What can I get for you?', 'say');

    // Fallback response triggers
    this.addResponse(/hello|hi|hey/i, 'Welcome to the Silver Tankard!', 'say');
    this.addResponse(/drink|ale|beer/i, 'We have fine ales and local wine.', 'say');

    // Enable AI dialogue
    this.setupAIContext();
  }

  private setupAIContext(): void {
    this.setAIContext({
      name: 'Mira the Bartender',
      personality: `Mira is a cheerful, gossipy bartender who loves hearing
        travelers' tales. She's quick with a joke and always has an ear
        for the latest rumors.`,
      background: `Mira inherited the Silver Tankard from her grandmother.
        She's lived in town her whole life and knows everyone.`,
      knowledgeScope: {
        topics: [
          'local gossip',
          'drinks and food',
          'local merchants',
          'travelers and their stories',
          'the inn and its history',
        ],
        forbidden: [
          'criminal activities',
          'castle secrets',
          'magic and spellcasting',
        ],
        localKnowledge: [
          'The Silver Tankard has been serving for three generations',
          'Rooms cost 5 gold per night',
          'The stew is made fresh daily with vegetables from the market',
        ],
        worldLore: [
          'region:valdoria',
          'economics:trade-routes',
        ],
      },
      speakingStyle: {
        formality: 'casual',
        verbosity: 'normal',
        accent: 'Speaks warmly with occasional local slang.',
      },
    });
  }
}
```

### NPCAIContext Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Full name for AI context |
| `personality` | `string` | Personality description |
| `background` | `string` | Character backstory |
| `currentMood` | `string?` | Current emotional state |
| `knowledgeScope.topics` | `string[]?` | What they know about |
| `knowledgeScope.forbidden` | `string[]?` | What they won't discuss |
| `knowledgeScope.localKnowledge` | `string[]?` | Specific facts |
| `knowledgeScope.worldLore` | `string[]?` | Lore entry IDs |
| `speakingStyle.formality` | `'casual' \| 'formal' \| 'archaic'` | Speech formality |
| `speakingStyle.verbosity` | `'terse' \| 'normal' \| 'verbose'` | Response length |
| `speakingStyle.accent` | `string?` | Speech pattern notes |

### How NPCs Respond

When a player uses `say` in a room with an AI-enabled NPC:

1. The `hearSay()` method is called on the NPC
2. If AI is enabled, the system builds a prompt with:
   - NPC personality, background, and speaking style
   - Knowledge scope (topics, forbidden, local knowledge)
   - World lore fetched from the lore daemon
   - Conversation history with this player
3. Claude generates a contextual response
4. If AI fails or is unavailable, falls back to static `addResponse()` patterns

### Conversation History

Each NPC maintains conversation history per player:

```typescript
// Get history with a player
const history = npc.getConversationHistory('heroname');

// Clear history (if needed)
npc.clearConversationHistory('heroname');  // One player
npc.clearConversationHistory();            // All players

// Set max history length (default: 10 exchanges)
npc.setMaxHistoryLength(15);
```

---

## World Lore System

The lore daemon provides consistent world knowledge to AI-enabled NPCs.

### Managing Lore

Use the `lore` command:

```
lore list                    # List all entries
lore list faction            # Filter by category
lore show faith:sun-god      # View specific entry
lore add faith "Moon Goddess" # Add new entry (opens IDE)
lore edit region:valdoria    # Edit existing entry
lore remove old:entry        # Remove entry
lore generate event "The Great War" "destruction, kingdom"
lore search dragon           # Search content
lore tags                    # List all tags
```

### Lore Entry Format

When adding or editing via IDE, use this JSON format:

```json
{
  "id": "faction:thieves-guild",
  "category": "faction",
  "title": "The Shadow Hand",
  "content": "The Shadow Hand is the largest thieves' guild operating in the realm. They control the black market, run protection rackets, and maintain a network of informants throughout the major cities.",
  "tags": ["criminal", "underground", "secrets"],
  "relatedLore": ["region:valdoria"],
  "priority": 5
}
```

### Categories

| Category | Use For |
|----------|---------|
| `world` | Creation myths, cosmology, general world facts |
| `region` | Kingdoms, territories, geographic areas |
| `faction` | Organizations, guilds, political groups |
| `history` | Historical eras, timelines |
| `character` | Notable NPCs, heroes, villains |
| `event` | Wars, disasters, significant happenings |
| `item` | Artifacts, magical items |
| `creature` | Monster types, beasts |
| `location` | Buildings, dungeons, landmarks |
| `economics` | Trade, currency, commerce |
| `mechanics` | Magic systems, world rules |
| `faith` | Religions, gods, worship |

### Using Lore in NPCs

Reference lore IDs in the NPC's `worldLore` array:

```typescript
this.setAIContext({
  // ...
  knowledgeScope: {
    worldLore: [
      'region:valdoria',
      'faction:thieves-guild',
      'faith:sun-god',
    ],
  },
});
```

The AI builder commands (`aidescribe`, `airoom`, `ainpc`) automatically search the lore daemon for relevant entries and include matching lore IDs in generated code.

---

## Efuns for Custom AI Usage

### aiAvailable()

Check if AI is configured:

```typescript
if (efuns.aiAvailable()) {
  // Use AI features
}
```

### aiGenerate(prompt, context?, options?)

Low-level text generation:

```typescript
const result = await efuns.aiGenerate(
  'Write a mysterious prophecy about a chosen hero.',
  'This is for a fantasy MUD game.',
  { maxTokens: 300 }
);

if (result.success) {
  console.log(result.text);
}
```

**Options:**
- `maxTokens?: number` - Maximum tokens in response
- `temperature?: number` - Creativity (0.0-1.0)
- `useContinuation?: boolean` - Auto-continue if truncated (for long-form content)
- `maxContinuations?: number` - Max continuation requests (default: 2)
- `timeout?: number` - API request timeout in milliseconds (default: 25000)

For long-form content that may exceed token limits:

```typescript
const result = await efuns.aiGenerate(
  'Write a detailed backstory for a fallen kingdom.',
  undefined,
  { maxTokens: 500, useContinuation: true, maxContinuations: 3 }
);
```

### aiNpcResponse(npcContext, message, history?)

Generate NPC dialogue programmatically:

```typescript
const result = await efuns.aiNpcResponse(
  npc.getAIContext(),
  playerMessage,
  npc.getConversationHistory(playerName)
);

if (result.success && result.response) {
  npc.say(result.response);
} else if (result.fallback) {
  // Handle fallback to static responses
}
```

---

## Best Practices

### 1. Always Provide Fallbacks

Static responses ensure NPCs work when AI is unavailable:

```typescript
// Always set up static responses
this.addResponse(/hello/i, 'Greetings, traveler.', 'say');
this.addResponse(/help/i, 'What do you need?', 'say');
this.addChat('looks around alertly.', 'emote');

// Then enable AI
this.setAIContext({ ... });
```

### 2. Keep Knowledge Focused

Don't give NPCs knowledge they shouldn't have:

```typescript
// Good: Specific, role-appropriate knowledge
knowledgeScope: {
  topics: ['smithing', 'weapons', 'armor', 'metal quality'],
  forbidden: ['magic', 'politics', 'distant lands'],
}

// Bad: Too broad
knowledgeScope: {
  topics: ['everything about the world'],
}
```

### 3. Use World Lore for Consistency

Reference shared lore instead of duplicating:

```typescript
// Good: Reference lore entries
worldLore: ['region:valdoria', 'faction:merchant-guild'],

// Avoid: Duplicating lore in localKnowledge
localKnowledge: ['Valdoria is a prosperous human kingdom...'],
```

### 4. Set Appropriate Speaking Styles

Match the NPC's character:

```typescript
// Scholarly wizard
speakingStyle: { formality: 'formal', verbosity: 'verbose' }

// Gruff soldier
speakingStyle: { formality: 'casual', verbosity: 'terse' }

// Ancient elf
speakingStyle: { formality: 'archaic', verbosity: 'normal' }
```

**Verbosity Word Limits:**
| Verbosity | Max Words | Sentences |
|-----------|-----------|-----------|
| `terse` | 25 | 1-2 |
| `normal` | 50 | 2-3 |
| `verbose` | 80 | 3-4 |

Even "verbose" NPCs are limited to 80 words to keep dialogue readable and game-appropriate. If a response is truncated due to token limits, the system gracefully ends it at a sentence boundary.

### 5. Test Fallback Behavior

Temporarily disable AI to verify static responses work:

```typescript
// In testing
npc.setAIEnabled(false);
// Talk to NPC - should use static responses
npc.setAIEnabled(true);
```

---

## Example: Town Crier NPC

Complete example of an AI-enabled NPC:

```typescript
import { NPC, MudObject } from '../../../lib/std.js';

export class TownCrier extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'town crier',
      shortDesc: 'the town crier',
      longDesc: `A stout man in a faded blue coat...`,
      gender: 'male',
      chatChance: 15,
    });

    this.addId('crier', 'man');

    // Periodic announcements
    this.addChat('rings his brass bell loudly.', 'emote', 100);
    this.addChat('Hear ye, hear ye! The castle seeks adventurers!', 'say');
    this.addChat('Beware the roads south - bandits spotted!', 'say');

    // Fallback responses
    this.addResponse(/hello|hi/i, (speaker) =>
      `Good day, ${speaker.name}!`, 'say');
    this.addResponse(/news/i,
      'The castle has posted new bounties!', 'say');

    // AI dialogue
    this.setAIContext({
      name: 'Bartleby the Town Crier',
      personality: 'Jovial and theatrical, loves gossip and news.',
      background: '20-year veteran, inherited position from father.',
      knowledgeScope: {
        topics: ['local news', 'town layout', 'merchants', 'gossip'],
        forbidden: ['castle secrets', 'criminal networks'],
        localKnowledge: [
          'Castle is north, tavern east, merchants west, gates south',
          'King Aldric III rules from Sunspire Castle',
        ],
        worldLore: ['region:valdoria', 'economics:trade-routes'],
      },
      speakingStyle: {
        formality: 'casual',
        verbosity: 'verbose',
        accent: 'Theatrical, often says "Hear ye!" and "Mark my words!"',
      },
    });
  }
}
```

---

## Troubleshooting

### AI Not Responding

1. Check `efuns.aiAvailable()` returns true
2. Verify `CLAUDE_API_KEY` is set in `.env`
3. Check server logs for API errors
4. Verify NPC has `setAIContext()` called

### NPC Using Wrong Knowledge

1. Check `worldLore` IDs exist in lore daemon
2. Verify `topics` and `forbidden` are appropriate
3. Check `localKnowledge` doesn't contradict lore

### Responses Too Long/Short

Adjust `verbosity` in speaking style:
- `'terse'` for short responses (max 25 words)
- `'normal'` for balanced (max 50 words)
- `'verbose'` for detailed responses (max 80 words)

You can also override the limit with `maxResponseLength` in NPCAIContext:

```typescript
this.setAIContext({
  // ...
  maxResponseLength: 100, // Override verbosity default
});
```

### Responses Being Cut Off

The system automatically handles truncation by:
1. Detecting when responses hit token limits
2. Ending gracefully at sentence boundaries
3. Adding "..." if no sentence boundary found

If responses are still cut off mid-sentence, increase `maxTokens` in the builder commands or use `useContinuation: true` for long-form content.

---

## Related Documentation

- [Commands Reference](commands.md) - AI builder commands (`aidescribe`, `airoom`, `ainpc`, `ailore`, `prompts`)
- [Efuns Reference](efuns.md) - AI efuns API
- [Daemons](daemons.md#lore-daemon) - Lore daemon API
- [Daemons](daemons.md#prompts-daemon) - Prompts daemon API
- [Lore System Guide](lore-system.md) - Detailed lore guide
