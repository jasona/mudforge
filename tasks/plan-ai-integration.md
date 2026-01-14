# Claude API Integration Plan

## Overview
Integrate Claude API into the MUD game for AI-powered content generation and NPC dialogue.

## Configuration
- API key via environment variable (`CLAUDE_API_KEY` in `.env`)
- Both efuns and builder commands
- Configurable context per-NPC

---

## Implementation Phases

### Phase 1: Core Infrastructure

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

### Phase 2: Builder Commands

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

### Phase 3: NPC AI Dialogue

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

### Phase 4: Lore System (Optional Enhancement)

**4.1 Create lore daemon** - `mudlib/daemons/lore.ts` (new file)
- Central registry for world lore entries
- Categories: world, region, faction, history, character
- Tags for filtering
- `buildContext()` method to generate AI-ready lore strings

**4.2 Integration**
- NPCs reference lore IDs in their `knowledgeScope.worldLore`
- Lore daemon injects relevant content into AI prompts

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/driver/config.ts` | Add Claude config fields |
| `src/driver/efun-bridge.ts` | Add 4 AI efuns (~150 lines) |
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
| `mudlib/daemons/lore.ts` | (Phase 4) World lore management |

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
