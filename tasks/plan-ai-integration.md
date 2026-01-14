# Claude API Integration Plan

## Overview
Integrate Claude API into the MUD game for AI-powered content generation and NPC dialogue.

## Status: ✅ COMPLETE

All phases have been implemented:
- ✅ Phase 1: Core Infrastructure (AI efuns, Claude client)
- ✅ Phase 2: Builder Commands (aidescribe, airoom, ainpc)
- ✅ Phase 3: NPC AI Dialogue (AI context, conversation history)
- ✅ Phase 4: Lore System (lore daemon, lore command, world lore integration)

## Configuration
- API key via environment variable (`CLAUDE_API_KEY` in `.env`)
- Both efuns and builder commands
- Configurable context per-NPC

---

## Implementation Phases

### Phase 1: Core Infrastructure ✅

**1.1 Add config entries** - `src/driver/config.ts`
- `claudeApiKey`, `claudeModel`, `claudeMaxTokens`, `claudeRateLimitPerMinute`

**1.2 Create Claude client** - `src/driver/claude-client.ts` (new file)
```typescript
export class ClaudeClient {
  async complete(request: ClaudeRequest): Promise<ClaudeResponse>;
  async completeWithContext(context: string, message: string, history?: ClaudeMessage[]): Promise<ClaudeResponse>;
  checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number };
}
```
- Rate limiting: per-user/per-minute tracking
- Caching: 5-minute TTL for repeated requests
- Error handling: graceful failures with fallback signals

**1.3 Add AI efuns** - `src/driver/efun-bridge.ts`
```typescript
aiAvailable(): boolean;
aiGenerate(prompt: string, context?: string, options?: {...}): Promise<{success, text, error}>;
aiDescribe(type: 'room'|'item'|'npc', details: {...}): Promise<{success, shortDesc, longDesc}>;
aiNpcResponse(npcContext: NPCAIContext, playerMessage: string, history?: [...]): Promise<{success, response}>;
```

**1.4 Update type definitions** - `mudlib/efuns.d.ts`

---

### Phase 2: Builder Commands ✅

**2.1 `_aidescribe.ts`** - `mudlib/cmds/builder/_aidescribe.ts`
```
Usage: aidescribe <type> <name> [theme]
       aidescribe room "Dusty Library" fantasy
       aidescribe npc "Blacksmith" "gruff, experienced"
```
Generates short and long descriptions for rooms, items, NPCs.

**2.2 `_airoom.ts`** - `mudlib/cmds/builder/_airoom.ts`
```
Usage: airoom <theme> [exits]
       airoom "abandoned mine" "north,south,down"
```
Generates complete room with descriptions, suggested items, terrain.

**2.3 `_ainpc.ts`** - `mudlib/cmds/builder/_ainpc.ts`
```
Usage: ainpc <name> <role> [personality]
       ainpc "Old Fisherman" "quest giver" "grumpy, knows about sea monsters"
```
Generates NPC with descriptions, personality, chat messages, AI context config.

---

### Phase 3: NPC AI Dialogue ✅

**3.1 Create AI types** - `mudlib/lib/ai-types.ts` (new file)
```typescript
export interface NPCAIContext {
  name: string;
  personality: string;
  background: string;
  currentMood?: string;
  knowledgeScope: {
    worldLore?: string[];     // Lore IDs to include
    localKnowledge?: string[];
    topics?: string[];
    forbidden?: string[];
  };
  speakingStyle?: {
    formality?: 'casual' | 'formal' | 'archaic';
    verbosity?: 'terse' | 'normal' | 'verbose';
    accent?: string;
  };
}
```

**3.2 Extend NPC class** - `mudlib/std/npc.ts`
- Add `setAIContext(context: NPCAIContext)` method
- Add `isAIEnabled()` check
- Add conversation history tracking per player
- Override `hearSay()` to try AI first, fall back to static `addResponse()` patterns
- Graceful degradation when API unavailable

**Example usage:**
```typescript
export class Blacksmith extends NPC {
  constructor() {
    super();
    this.setNPC({ name: 'Grigor', ... });
    this.setAIContext({
      name: 'Grigor the Blacksmith',
      personality: 'Gruff but fair. Takes pride in work.',
      background: 'Former army smith. Lost family in war.',
      knowledgeScope: {
        topics: ['smithing', 'weapons', 'armor'],
        forbidden: ['his family'],
      },
      speakingStyle: { formality: 'casual', verbosity: 'terse' },
    });
  }
}
```

---

### Phase 4: Lore System ✅

**4.1 Create lore daemon** - `mudlib/daemons/lore.ts` (new file)
```typescript
export type LoreCategory =
  | 'world'      // General world facts, cosmology
  | 'region'     // Geographic areas, kingdoms
  | 'faction'    // Organizations, guilds, groups
  | 'history'    // Past eras, timelines
  | 'character'  // Notable NPCs, heroes, villains
  | 'event'      // Major historical events, wars, disasters
  | 'item'       // Artifacts, magical items, item types
  | 'creature'   // Monster types, beasts, supernatural beings
  | 'location'   // Specific notable places (buildings, dungeons)
  | 'economics'  // Trade, currency, commerce
  | 'mechanics'  // World mechanics (magic systems, etc.)
  | 'faith';     // Religions, gods, worship

export interface LoreEntry {
  id: string;                 // "category:slug" format
  category: LoreCategory;
  title: string;
  content: string;            // AI-ready lore text
  tags?: string[];
  relatedLore?: string[];
  priority?: number;          // Higher = included first when truncating
}

export class LoreDaemon extends MudObject {
  registerLore(entry: LoreEntry): void;
  getLore(id: string): LoreEntry | undefined;
  getLoreByCategory(category: LoreCategory): LoreEntry[];
  getLoreByTags(tags: string[]): LoreEntry[];
  buildContext(loreIds: string[], maxLength?: number): string;
  load(): Promise<void>;
  save(): Promise<void>;
}
```
- Persists to `/data/lore/entries.json`
- Follows singleton pattern like other daemons

**4.2 Builder command** - `mudlib/cmds/builder/_lore.ts`
```
Usage: lore list [category]           - List all lore entries
       lore show <id>                 - Show a specific entry
       lore add <category> <title>    - Add new lore (prompts for content)
       lore remove <id>               - Remove a lore entry
       lore generate <category> <title> [theme]  - AI-generate lore entry
```

**4.3 Integration** - Modify `src/driver/efun-bridge.ts`
- In `aiNpcResponse()`, fetch worldLore entries from LoreDaemon
- Inject lore content into system prompt under "WORLD LORE" section
- NPCs reference lore IDs in their `knowledgeScope.worldLore`

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/driver/config.ts` | Add Claude config fields |
| `src/driver/efun-bridge.ts` | Add 4 AI efuns (~150 lines); Phase 4: add worldLore injection (~20 lines) |
| `mudlib/efuns.d.ts` | Add AI efun type definitions |
| `mudlib/std/npc.ts` | Add AI context, conversation tracking (~100 lines) |
| `.env` | Add CLAUDE_API_KEY and related vars |

## New Files

| File | Purpose |
|------|---------|
| `src/driver/claude-client.ts` | Claude API client with rate limiting/caching |
| `mudlib/lib/ai-types.ts` | TypeScript interfaces for AI features |
| `mudlib/cmds/builder/_aidescribe.ts` | Builder command for descriptions |
| `mudlib/cmds/builder/_airoom.ts` | Builder command for room generation |
| `mudlib/cmds/builder/_ainpc.ts` | Builder command for NPC generation |
| `mudlib/daemons/lore.ts` | (Phase 4) World lore management daemon |
| `mudlib/cmds/builder/_lore.ts` | (Phase 4) Builder command for lore entries |
| `mudlib/data/lore/entries.json` | (Phase 4) Lore data persistence |

---

## Environment Variables

```env
CLAUDE_API_KEY=sk-ant-api03-...
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TOKENS=1024
CLAUDE_RATE_LIMIT=20
```

---

## Verification

1. **API connectivity**: Run `node -e "..."` test script to verify API key works
2. **Efuns work**: In-game `eval efuns.aiAvailable()` returns true
3. **Builder commands**: Test `aidescribe room "Test Room" fantasy`
4. **NPC dialogue**: Create test NPC with AI context, verify conversation works
5. **Fallback**: Disable API key, verify NPCs fall back to static responses
6. **Rate limiting**: Spam requests, verify rate limit kicks in
7. **Lore system**: Test `lore list`, `lore add faith "Test God"`, verify lore appears in NPC prompts
